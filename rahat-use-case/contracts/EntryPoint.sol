// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IAccount.sol";
import "./core/UserOperation.sol";
import "./core/IPaymaster.sol";

// Proper ERC-4337 EntryPoint Implementation
contract EntryPoint {
    struct UserOpInfo {
        uint256 preOpGas;
        uint256 prefund;
        bool paymasterValidated;
        uint256 paymasterValidationData;
        uint256 accountValidationData;
    }

    // Two-dimensional nonce system as per ERC-4337
    mapping(address => mapping(uint192 => uint256)) public nonceSequenceNumber;

    // Deposit system for gas payments
    mapping(address => uint256) public balanceOf;

    uint256 public constant SIG_VALIDATION_FAILED = 1;

    event UserOperationEvent(
        bytes32 indexed userOpHash,
        address indexed sender,
        address indexed paymaster,
        uint256 nonce,
        bool success,
        uint256 actualGasCost,
        uint256 actualGasUsed
    );

    event AccountDeployed(
        bytes32 indexed userOpHash,
        address indexed sender,
        address factory,
        address paymaster
    );

    event Deposited(address indexed account, uint256 totalDeposit);
    event Withdrawn(
        address indexed account,
        address withdrawAddress,
        uint256 amount
    );

    error FailedOp(uint256 opIndex, string reason);

    function handleOps(
        UserOperation[] calldata ops,
        address payable beneficiary
    ) external {
        uint256 opslen = ops.length;
        UserOpInfo[] memory opInfos = new UserOpInfo[](opslen);

        // Phase 1: Validation
        for (uint256 i = 0; i < opslen; i++) {
            UserOpInfo memory opInfo = opInfos[i];
            _validatePrepayment(i, ops[i], opInfo);
        }

        uint256 collected = 0;

        // Phase 2: Execution
        for (uint256 i = 0; i < opslen; i++) {
            collected += _executeUserOp(i, ops[i], opInfos[i]);
        }

        // Compensate beneficiary
        if (collected > 0) {
            (bool success, ) = beneficiary.call{value: collected}("");
            require(success, "Failed to transfer to beneficiary");
        }
    }

    function _validatePrepayment(
        uint256 opIndex,
        UserOperation calldata userOp,
        UserOpInfo memory opInfo
    ) internal {
        uint256 preGas = gasleft();

        // Validate and update nonce
        uint192 key = uint192(userOp.nonce >> 64);
        uint64 seq = uint64(userOp.nonce);
        require(
            nonceSequenceNumber[userOp.sender][key]++ == seq,
            "Invalid nonce"
        );

        // Create sender if needed
        _createSenderIfNeeded(opIndex, userOp);

        // Calculate required prefund
        uint256 requiredPrefund = _getRequiredPrefund(userOp);
        opInfo.prefund = requiredPrefund;

        // Validate account
        uint256 missingAccountFunds = 0;
        address paymaster = _getPaymaster(userOp.paymasterAndData);

        if (paymaster == address(0)) {
            // Account pays for itself
            uint256 bal = balanceOf[userOp.sender];
            missingAccountFunds = bal > requiredPrefund
                ? 0
                : requiredPrefund - bal;
        }

        try
            IAccount(userOp.sender).validateUserOp{
                gas: userOp.verificationGasLimit
            }(userOp, getUserOpHash(userOp), missingAccountFunds)
        returns (uint256 validationData) {
            opInfo.accountValidationData = validationData;
        } catch {
            revert FailedOp(opIndex, "AA23 reverted (or OOG)");
        }

        // Validate paymaster if present
        if (paymaster != address(0)) {
            require(
                balanceOf[paymaster] >= requiredPrefund,
                "AA31 paymaster deposit too low"
            );

            try
                IPaymaster(paymaster).validatePaymasterUserOp{
                    gas: userOp.verificationGasLimit
                }(userOp, getUserOpHash(userOp), requiredPrefund)
            returns (bytes memory context, uint256 validationData) {
                opInfo.paymasterValidated = true;
                opInfo.paymasterValidationData = validationData;
            } catch {
                revert FailedOp(opIndex, "AA33 reverted (or OOG)");
            }

            // Charge paymaster
            balanceOf[paymaster] -= requiredPrefund;
        } else {
            // Charge account
            require(
                balanceOf[userOp.sender] >= requiredPrefund,
                "AA21 didn't pay prefund"
            );
            balanceOf[userOp.sender] -= requiredPrefund;
        }

        opInfo.preOpGas = preGas - gasleft() + userOp.preVerificationGas;
    }

    function _executeUserOp(
        uint256 opIndex,
        UserOperation calldata userOp,
        UserOpInfo memory opInfo
    ) internal returns (uint256 actualGasCost) {
        uint256 preGas = gasleft();

        bool success = true;

        if (userOp.callData.length > 0) {
            (success, ) = userOp.sender.call{gas: userOp.callGasLimit}(
                userOp.callData
            );
        }

        uint256 actualGas = preGas - gasleft() + opInfo.preOpGas;
        actualGasCost = actualGas * _getGasPrice(userOp);

        // Handle paymaster postOp
        address paymaster = _getPaymaster(userOp.paymasterAndData);
        if (paymaster != address(0) && opInfo.paymasterValidated) {
            try
                IPaymaster(paymaster).postOp{gas: userOp.verificationGasLimit}(
                    success
                        ? IPaymaster.PostOpMode.opSucceeded
                        : IPaymaster.PostOpMode.opReverted,
                    "",
                    actualGasCost
                )
            {} catch {
                // PostOp failure is not critical
            }
        }

        // Refund excess
        uint256 refund = 0;
        if (opInfo.prefund > actualGasCost) {
            refund = opInfo.prefund - actualGasCost;
            address refundAddress = paymaster != address(0)
                ? paymaster
                : userOp.sender;
            balanceOf[refundAddress] += refund;
        }

        emit UserOperationEvent(
            getUserOpHash(userOp),
            userOp.sender,
            paymaster,
            userOp.nonce,
            success,
            actualGasCost,
            actualGas
        );

        return actualGasCost;
    }

    function _createSenderIfNeeded(
        uint256 opIndex,
        UserOperation calldata userOp
    ) internal {
        if (userOp.initCode.length != 0) {
            address sender = userOp.sender;
            require(sender.code.length == 0, "AA10 sender already constructed");

            address factory = address(bytes20(userOp.initCode[0:20]));
            bytes memory initCallData = userOp.initCode[20:];

            (bool success, bytes memory result) = factory.call(initCallData);
            require(success, "AA13 initCode failed");

            address createdSender;
            assembly {
                createdSender := mload(add(result, 0x20))
            }

            require(
                createdSender == sender,
                "AA14 initCode must return sender"
            );
            require(
                createdSender.code.length > 0,
                "AA15 initCode must create sender"
            );

            emit AccountDeployed(
                getUserOpHash(userOp),
                sender,
                factory,
                _getPaymaster(userOp.paymasterAndData)
            );
        }
    }

    function _getRequiredPrefund(
        UserOperation calldata userOp
    ) internal pure returns (uint256) {
        uint256 mul = userOp.paymasterAndData.length > 0 ? 3 : 1;
        uint256 requiredGas = userOp.callGasLimit +
            userOp.verificationGasLimit *
            mul +
            userOp.preVerificationGas;
        return requiredGas * userOp.maxFeePerGas;
    }

    function _getPaymaster(
        bytes calldata paymasterAndData
    ) internal pure returns (address) {
        if (paymasterAndData.length >= 20) {
            return address(bytes20(paymasterAndData[0:20]));
        }
        return address(0);
    }

    function _getGasPrice(
        UserOperation calldata userOp
    ) internal view returns (uint256) {
        if (userOp.maxFeePerGas == userOp.maxPriorityFeePerGas) {
            return userOp.maxFeePerGas;
        }
        return
            min(
                userOp.maxFeePerGas,
                userOp.maxPriorityFeePerGas + block.basefee
            );
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function getUserOpHash(
        UserOperation calldata userOp
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        abi.encode(
                            userOp.sender,
                            userOp.nonce,
                            keccak256(userOp.initCode),
                            keccak256(userOp.callData),
                            userOp.callGasLimit,
                            userOp.verificationGasLimit,
                            userOp.preVerificationGas,
                            userOp.maxFeePerGas,
                            userOp.maxPriorityFeePerGas,
                            keccak256(userOp.paymasterAndData)
                        )
                    ),
                    address(this),
                    block.chainid
                )
            );
    }

    function getNonce(
        address sender,
        uint192 key
    ) external view returns (uint256) {
        return nonceSequenceNumber[sender][key] | (uint256(key) << 64);
    }

    // Deposit functions
    function depositTo(address account) external payable {
        balanceOf[account] += msg.value;
        emit Deposited(account, balanceOf[account]);
    }

    function withdrawTo(
        address payable withdrawAddress,
        uint256 amount
    ) external {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        (bool success, ) = withdrawAddress.call{value: amount}("");
        require(success, "Failed to withdraw");
        emit Withdrawn(msg.sender, withdrawAddress, amount);
    }

    receive() external payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposited(msg.sender, balanceOf[msg.sender]);
    }
}

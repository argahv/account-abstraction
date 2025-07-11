// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title UserOperation
 * @dev User operation struct for ERC-4337 Account Abstraction
 */
struct UserOperation {
    address sender; // The account making the operation
    uint256 nonce; // Anti-replay parameter
    bytes initCode; // Account initialization code (for first-time account creation)
    bytes callData; // The data to pass to the sender during the main execution call
    uint256 callGasLimit; // Gas limit for the main execution call
    uint256 verificationGasLimit; // Gas limit for the verification step
    uint256 preVerificationGas; // Gas to pay the bundler for this operation
    uint256 maxFeePerGas; // Maximum fee per gas
    uint256 maxPriorityFeePerGas; // Maximum priority fee per gas
    bytes paymasterAndData; // Paymaster address and data (empty for self-sponsored transactions)
    bytes signature; // Sender's signature over the operation
}

/**
 * @title UserOperationLib
 * @dev Library for UserOperation utilities
 */
library UserOperationLib {
    /**
     * @dev Get the sender address from a UserOperation
     */
    function getSender(
        UserOperation calldata userOp
    ) internal pure returns (address) {
        return userOp.sender;
    }

    /**
     * @dev Get gas price from a UserOperation
     */
    function gasPrice(
        UserOperation calldata userOp
    ) internal view returns (uint256) {
        unchecked {
            uint256 maxFeePerGas = userOp.maxFeePerGas;
            uint256 maxPriorityFeePerGas = userOp.maxPriorityFeePerGas;
            if (maxFeePerGas == maxPriorityFeePerGas) {
                // Legacy transaction
                return maxFeePerGas;
            }
            return min(maxFeePerGas, maxPriorityFeePerGas + block.basefee);
        }
    }

    /**
     * @dev Pack user operation data (without signature) for hashing
     */
    function pack(
        UserOperation calldata userOp
    ) internal pure returns (bytes memory ret) {
        return
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
            );
    }

    /**
     * @dev Hash a user operation
     */
    function hash(
        UserOperation calldata userOp
    ) internal pure returns (bytes32) {
        return keccak256(pack(userOp));
    }

    /**
     * @dev Minimum of two values
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IAccount.sol";

/**
 * @title SimpleAdvancedAccount
 * @dev Simplified ERC-4337 Account with basic features to avoid stack too deep errors
 */
contract SimpleAdvancedAccount is IAccount {
    using ECDSA for bytes32;

    address public owner;
    address public entryPoint;
    uint256 public constant SIG_VALIDATION_FAILED = 1;

    // Delegation support
    mapping(address => bool) public delegates;
    event DelegateAdded(address indexed delegate);
    event DelegateRemoved(address indexed delegate);

    event AccountInitialized(address indexed entryPoint, address indexed owner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOwnerOrEntryPoint() {
        require(
            msg.sender == owner || msg.sender == entryPoint,
            "Not authorized"
        );
        _;
    }

    modifier onlyAuthorizedCaller() {
        // Allow owner, entryPoint, or calls from SimpleVerifyingPaymaster
        require(
            msg.sender == owner ||
                msg.sender == entryPoint ||
                isAuthorizedPaymaster(msg.sender),
            "Not authorized"
        );
        _;
    }

    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    function initialize(address _owner) external {
        require(owner == address(0), "Already initialized");
        owner = _owner;
        emit AccountInitialized(entryPoint, _owner);
    }

    /**
     * @dev Validate signature for ERC-4337 UserOperation
     * Must implement IAccount interface
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        require(msg.sender == entryPoint, "Account: not from EntryPoint");

        // Transfer missing funds to EntryPoint if needed
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{
                value: missingAccountFunds,
                gas: type(uint256).max
            }("");
            require(success, "Account: failed to prefund EntryPoint");
        }

        // Validate signature: allow owner or delegate
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address recovered = hash.recover(userOp.signature);
        if (recovered == owner || delegates[recovered]) {
            return 0; // Valid signature
        }
        return SIG_VALIDATION_FAILED; // Invalid signature
    }

    /**
     * @dev Execute a transaction from this account
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external onlyOwnerOrEntryPoint {
        _call(dest, value, func);
    }

    /**
     * @dev Execute a batch of transactions
     */
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external onlyOwnerOrEntryPoint {
        require(dest.length == func.length, "Wrong array lengths");
        require(dest.length == value.length, "Wrong array lengths");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }

    /**
     * @dev Internal call function
     */
    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * @dev Check if the caller is an authorized paymaster
     * For simplicity, this allows any paymaster - in production you'd want more restrictive logic
     */
    function isAuthorizedPaymaster(address caller) public view returns (bool) {
        // For demo purposes, we'll allow any address that's not the zero address
        // In production, you'd want to maintain a whitelist of authorized paymasters
        return caller != address(0);
    }

    /**
     * @dev Add delegate to the account
     */
    function addDelegate(address delegate) external onlyOwner {
        delegates[delegate] = true;
        emit DelegateAdded(delegate);
    }

    /**
     * @dev Remove delegate from the account
     */
    function removeDelegate(address delegate) external onlyOwner {
        delegates[delegate] = false;
        emit DelegateRemoved(delegate);
    }

    /**
     * @dev Receive function
     */
    receive() external payable {}

    /**
     * @dev Check deposit balance on EntryPoint
     */
    function getDeposit() public view returns (uint256) {
        return payable(entryPoint).balance;
    }

    /**
     * @dev Add deposit to EntryPoint
     */
    function addDeposit() public payable {
        (bool success, ) = entryPoint.call{value: msg.value}("");
        require(success, "Deposit failed");
    }

    /**
     * @dev Withdraw deposit from EntryPoint
     */
    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) public onlyOwner {
        (bool success, ) = entryPoint.call(
            abi.encodeWithSignature(
                "withdrawTo(address,uint256)",
                withdrawAddress,
                amount
            )
        );
        require(success, "Withdraw failed");
    }
}

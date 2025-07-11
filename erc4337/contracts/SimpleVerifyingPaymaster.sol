// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPaymaster.sol";

/**
 * @title SimpleVerifyingPaymaster
 * @dev A simplified paymaster that sponsors gas without complex signature verification
 */
contract SimpleVerifyingPaymaster is IPaymaster, Ownable {
    address public immutable entryPoint;
    address public verifyingSigner;
    mapping(address => bool) public sponsoredAccounts;

    event VerifyingSignerChanged(
        address indexed previousSigner,
        address indexed newSigner
    );
    event AccountSponsored(address indexed account);
    event AccountUnsponsored(address indexed account);

    constructor(address _entryPoint, address _verifyingSigner) {
        entryPoint = _entryPoint;
        verifyingSigner = _verifyingSigner;
        _transferOwnership(msg.sender);
    }

    /**
     * @dev Ensure the function is called by the EntryPoint
     */
    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "Sender not EntryPoint");
        _;
    }

    /**
     * @dev Set a new verifying signer
     */
    function setVerifyingSigner(address _newSigner) external onlyOwner {
        address oldSigner = verifyingSigner;
        verifyingSigner = _newSigner;
        emit VerifyingSignerChanged(oldSigner, _newSigner);
    }

    /**
     * @dev Add an account to sponsorship list
     */
    function sponsorAccount(address account) external onlyOwner {
        sponsoredAccounts[account] = true;
        emit AccountSponsored(account);
    }

    /**
     * @dev Remove an account from sponsorship list
     */
    function unsponsorAccount(address account) external onlyOwner {
        sponsoredAccounts[account] = false;
        emit AccountUnsponsored(account);
    }

    /**
     * @dev Validate paymaster operation - implements IPaymaster
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 /*userOpHash*/,
        uint256 /*maxCost*/
    )
        external
        override
        onlyEntryPoint
        returns (bytes memory context, uint256 validationData)
    {
        // Simple validation - check if sender is sponsored
        address sender = userOp.sender;

        if (sponsoredAccounts[sender]) {
            // Account is sponsored - approve the operation
            validationData = 0; // Success
            context = ""; // No context needed
        } else {
            // Account not sponsored - reject
            validationData = 1; // Failure
            context = "";
        }

        return (context, validationData);
    }

    /**
     * @dev Post-operation handler - implements IPaymaster
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external override onlyEntryPoint {
        // Simple implementation - just emit an event for debugging
        // In a more complex paymaster, you might refund users, update balances, etc.
        // For our demo, we don't need to do anything here
        // The EntryPoint already handled the gas payment from our deposit
    }

    /**
     * @dev Allow owner to deposit ETH for sponsoring gas
     */
    function deposit() external payable onlyOwner {
        (bool success, ) = entryPoint.call{value: msg.value}(
            abi.encodeWithSignature("depositTo(address)", address(this))
        );
        require(success, "Deposit failed");
    }

    /**
     * @dev Allow owner to withdraw ETH
     */
    function withdrawTo(
        address payable withdrawAddress,
        uint256 amount
    ) external onlyOwner {
        (bool success, ) = entryPoint.call(
            abi.encodeWithSignature(
                "withdrawTo(address,uint256)",
                withdrawAddress,
                amount
            )
        );
        require(success, "Withdraw failed");
    }

    /**
     * @dev Get the paymaster's balance on the EntryPoint
     */
    function getBalance() external view returns (uint256) {
        (bool success, bytes memory data) = entryPoint.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        require(success, "Balance check failed");
        return abi.decode(data, (uint256));
    }

    /**
     * @dev Receive function to accept direct deposits
     */
    receive() external payable {
        // Forward to EntryPoint deposit
        (bool success, ) = entryPoint.call{value: msg.value}(
            abi.encodeWithSignature("depositTo(address)", address(this))
        );
        require(success, "Deposit failed");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./UserOperation.sol";

/**
 * @title IEntryPoint
 * @dev Interface for the ERC-4337 EntryPoint contract
 */
interface IEntryPoint {
    /**
     * @dev Execute a batch of UserOperations
     * @param ops Array of UserOperations to execute
     * @param beneficiary Address to receive the fees
     */
    function handleOps(
        UserOperation[] calldata ops,
        address payable beneficiary
    ) external;

    /**
     * @dev Simulate a UserOperation validation
     * @param userOp The UserOperation to simulate
     */
    function simulateValidation(UserOperation calldata userOp) external;

    /**
     * @dev Deposit ETH for a specific account
     * @param account The account to deposit for
     */
    function depositTo(address account) external payable;

    /**
     * @dev Withdraw ETH from an account's deposit
     * @param withdrawAddress Address to receive the withdrawal
     * @param withdrawAmount Amount to withdraw
     */
    function withdrawTo(
        address payable withdrawAddress,
        uint256 withdrawAmount
    ) external;

    /**
     * @dev Add stake for the sender
     * @param unstakeDelaySec Delay in seconds before unstaking is allowed
     */
    function addStake(uint32 unstakeDelaySec) external payable;

    /**
     * @dev Unlock stake (must wait for unstake delay)
     */
    function unlockStake() external;

    /**
     * @dev Withdraw stake
     * @param withdrawAddress Address to receive the stake
     */
    function withdrawStake(address payable withdrawAddress) external;

    /**
     * @dev Get the deposit balance for an account
     * @param account The account to check
     * @return The deposit balance
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Get the stake info for an account
     * @param addr The account to check
     * @return info Stake information
     */
    function getDepositInfo(
        address addr
    ) external view returns (DepositInfo memory info);

    /**
     * @dev Get the nonce for a specific account and key
     * @param sender The account address
     * @param key The nonce key
     * @return The nonce value
     */
    function getNonce(
        address sender,
        uint192 key
    ) external view returns (uint256);

    /**
     * @dev Get the hash of a UserOperation
     * @param userOp The UserOperation
     * @return The hash
     */
    function getUserOpHash(
        UserOperation calldata userOp
    ) external view returns (bytes32);
}

/**
 * @title DepositInfo
 * @dev Deposit and stake information for an account
 */
struct DepositInfo {
    uint112 deposit; // Deposited ETH balance
    bool staked; // Whether the account is staked
    uint112 stake; // Staked ETH amount
    uint32 unstakeDelaySec; // Unstake delay in seconds
    uint48 withdrawTime; // When withdrawal is allowed
}

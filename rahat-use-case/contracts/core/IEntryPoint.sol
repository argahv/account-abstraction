// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./UserOperation.sol";

interface IEntryPoint {
    /**
     * An event emitted after each successful request
     * @param userOpHash - unique identifier for the request (hash its entire content, except signature).
     * @param sender - the account that generates this request.
     * @param paymaster - if non-null, the paymaster that pays for this request.
     * @param nonce - the nonce value from the request.
     * @param actualGasCost - the total cost (in gas) of this request.
     * @param actualGasUsed - the actual gas used by this request.
     * @param success - true if the sender transaction succeeded, false if reverted.
     */
    event UserOperationEvent(
        bytes32 indexed userOpHash,
        address indexed sender,
        address indexed paymaster,
        uint256 nonce,
        uint256 actualGasCost,
        uint256 actualGasUsed,
        bool success
    );

    /**
     * Execute a UserOperation.
     * @param userOp the operation to execute
     * @param beneficiary the address to receive the fees
     */
    function handleOps(
        UserOperation[] calldata userOp,
        address payable beneficiary
    ) external;

    /**
     * Execute a UserOperation with a paymaster.
     * @param userOp the operation to execute
     * @param paymasterAndData the paymaster and data to use for this operation
     * @param beneficiary the address to receive the fees
     */
    function handleOpsWithPaymaster(
        UserOperation[] calldata userOp,
        bytes calldata paymasterAndData,
        address payable beneficiary
    ) external;

    /**
     * Get the nonce of a user operation.
     * @param sender the sender of the user operation
     * @param key the key of the user operation
     * @return the nonce of the user operation
     */
    function getNonce(
        address sender,
        uint192 key
    ) external view returns (uint256);

    /**
     * Get the user operation hash.
     * @param userOp the user operation
     * @return the hash of the user operation
     */
    function getUserOpHash(
        UserOperation calldata userOp
    ) external view returns (bytes32);
}

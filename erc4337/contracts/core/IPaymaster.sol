// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./UserOperation.sol";

/**
 * @title IPaymaster
 * @dev Interface for ERC-4337 paymaster contracts
 */
interface IPaymaster {
    enum PostOpMode {
        opSucceeded,
        opReverted,
        postOpReverted
    }

    /**
     * @dev Validate a user operation and return validation data
     * @param userOp The user operation to validate
     * @param userOpHash Hash of the user operation
     * @param maxCost Maximum cost the paymaster might pay
     * @return context Paymaster context data
     * @return validationData Validation result and time limits
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData);

    /**
     * @dev Post-operation handler
     * @param mode Success/failure mode
     * @param context Context data from validation
     * @param actualGasCost Actual gas cost of the operation
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external;
}

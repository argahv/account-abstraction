// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IPaymaster.sol";
import "./IEntryPoint.sol";
import "./UserOperation.sol";

/**
 * @title BasePaymaster
 * @dev Base implementation for ERC-4337 paymaster contracts
 */
abstract contract BasePaymaster is IPaymaster, Ownable {
    IEntryPoint public immutable entryPoint;

    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
        _transferOwnership(msg.sender);
    }

    /**
     * @dev Validate a user operation and return validation data
     * This is called by the EntryPoint contract
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external override returns (bytes memory context, uint256 validationData) {
        _requireFromEntryPoint();
        return _validatePaymasterUserOp(userOp, userOpHash, maxCost);
    }

    /**
     * @dev Post-operation handler
     * This is called by the EntryPoint contract after the operation
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external override {
        _requireFromEntryPoint();
        _postOp(mode, context, actualGasCost);
    }

    /**
     * @dev Internal validation function to be implemented by derived contracts
     */
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal virtual returns (bytes memory context, uint256 validationData);

    /**
     * @dev Internal post-operation function (optional implementation)
     */
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal virtual {
        // Default implementation does nothing
    }

    /**
     * @dev Ensure the function is called by the EntryPoint
     */
    function _requireFromEntryPoint() internal view {
        require(msg.sender == address(entryPoint), "Sender not EntryPoint");
    }

    /**
     * @dev Deposit ETH to the EntryPoint for this paymaster
     */
    function deposit() external payable virtual {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    /**
     * @dev Withdraw ETH from the EntryPoint
     */
    function withdrawTo(
        address payable withdrawAddress,
        uint256 amount
    ) external virtual onlyOwner {
        entryPoint.withdrawTo(withdrawAddress, amount);
    }

    /**
     * @dev Add stake for this paymaster
     */
    function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
        entryPoint.addStake{value: msg.value}(unstakeDelaySec);
    }

    /**
     * @dev Get the deposit of this paymaster on the EntryPoint
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    /**
     * @dev Unlock stake (must wait for unstake delay)
     */
    function unlockStake() external onlyOwner {
        entryPoint.unlockStake();
    }

    /**
     * @dev Withdraw stake
     */
    function withdrawStake(address payable withdrawAddress) external onlyOwner {
        entryPoint.withdrawStake(withdrawAddress);
    }
}

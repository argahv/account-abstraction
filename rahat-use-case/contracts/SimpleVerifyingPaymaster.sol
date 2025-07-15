// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./core/IPaymaster.sol";
import "./core/UserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SimpleVerifyingPaymaster is IPaymaster {
    using ECDSA for bytes32;

    address public immutable entryPoint;
    address public verifyingSigner;
    mapping(address => uint256) public balances;
    mapping(address => bool) public sponsoredAccounts;
    address public owner;

    constructor(address _entryPoint, address _verifyingSigner) {
        entryPoint = _entryPoint;
        verifyingSigner = _verifyingSigner;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @dev Add an account to sponsorship list
     */
    function sponsorAccount(address account) external onlyOwner {
        sponsoredAccounts[account] = true;
    }

    /**
     * @dev Remove an account from sponsorship list
     */
    function unsponsorAccount(address account) external onlyOwner {
        sponsoredAccounts[account] = false;
    }

    function addDeposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        withdrawAddress.transfer(amount);
    }

    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external override returns (bytes memory context, uint256 validationData) {
        // Check if sender is sponsored
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

    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external override {
        // Handle post-operation logic if needed
    }

    receive() external payable {
        addDeposit();
    }
}

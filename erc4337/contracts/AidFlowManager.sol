// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RahatToken.sol";
import "./CashToken.sol";

contract AidFlowManager {
    RahatToken public rahatToken;
    CashToken public cashToken;

    // Roles
    address public owner;
    mapping(address => bool) public fieldOffices;
    mapping(address => bool) public beneficiaries;

    event Assigned(
        address indexed fieldOffice,
        address indexed beneficiary,
        uint256 amount
    );
    event CashedOut(address indexed beneficiary, uint256 amount);
    event DelegateAdded(address indexed account, address indexed delegate);
    event DelegateRemoved(address indexed account, address indexed delegate);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyFieldOffice() {
        require(fieldOffices[msg.sender], "Not field office");
        _;
    }

    modifier onlyBeneficiary() {
        require(beneficiaries[msg.sender], "Not beneficiary");
        _;
    }

    constructor(address _rahatToken, address _cashToken) {
        rahatToken = RahatToken(_rahatToken);
        cashToken = CashToken(_cashToken);
        owner = msg.sender;
    }

    // Owner can set roles
    function setFieldOffice(
        address account,
        bool isFieldOffice
    ) external onlyOwner {
        fieldOffices[account] = isFieldOffice;
    }
    function setBeneficiary(
        address account,
        bool isBeneficiary
    ) external onlyOwner {
        beneficiaries[account] = isBeneficiary;
    }

    // Field office assigns tokens to beneficiary
    function assignToBeneficiary(
        address beneficiary,
        uint256 amount
    ) external onlyFieldOffice {
        require(beneficiaries[beneficiary], "Not a beneficiary");
        require(
            rahatToken.balanceOf(msg.sender) >= amount,
            "Not enough RahatToken"
        );
        require(
            rahatToken.allowance(msg.sender, address(this)) >= amount,
            "Approve tokens first"
        );
        rahatToken.transferFrom(msg.sender, beneficiary, amount);
        emit Assigned(msg.sender, beneficiary, amount);
    }

    // Beneficiary cashes out RahatToken for CashToken
    function cashOut(uint256 amount) external onlyBeneficiary {
        require(
            rahatToken.balanceOf(msg.sender) >= amount,
            "Not enough RahatToken"
        );
        require(
            rahatToken.allowance(msg.sender, address(this)) >= amount,
            "Approve tokens first"
        );
        rahatToken.transferFrom(msg.sender, address(this), amount);
        cashToken.mint(msg.sender, amount);
        emit CashedOut(msg.sender, amount);
    }

    // Add delegate to a smart account (must be called via that account)
    function addDelegate(address smartAccount, address delegate) external {
        // Only the smart account itself can add a delegate
        require(
            msg.sender == smartAccount,
            "Only smart account can add delegate"
        );
        (bool success, ) = smartAccount.call(
            abi.encodeWithSignature("addDelegate(address)", delegate)
        );
        require(success, "Delegate add failed");
        emit DelegateAdded(smartAccount, delegate);
    }

    // Remove delegate from a smart account (must be called via that account)
    function removeDelegate(address smartAccount, address delegate) external {
        require(
            msg.sender == smartAccount,
            "Only smart account can remove delegate"
        );
        (bool success, ) = smartAccount.call(
            abi.encodeWithSignature("removeDelegate(address)", delegate)
        );
        require(success, "Delegate remove failed");
        emit DelegateRemoved(smartAccount, delegate);
    }
}

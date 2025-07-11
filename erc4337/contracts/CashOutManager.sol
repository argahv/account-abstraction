// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RahatToken.sol";
import "./CashToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CashOutManager is Ownable {
    RahatToken public rahatToken;
    CashToken public cashToken;

    event Assigned(
        address indexed fieldOffice,
        address indexed beneficiary,
        uint256 amount
    );
    event CashedOut(address indexed beneficiary, uint256 amount);

    constructor(address _rahatToken, address _cashToken) {
        rahatToken = RahatToken(_rahatToken);
        cashToken = CashToken(_cashToken);
    }

    // Field Office assigns tokens to beneficiary
    function assignToBeneficiary(address beneficiary, uint256 amount) external {
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
    function cashOut(uint256 amount) external {
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
}

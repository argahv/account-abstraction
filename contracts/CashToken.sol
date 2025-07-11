// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CashToken is ERC20, Ownable {
    constructor() ERC20("Cash Token", "CASH") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

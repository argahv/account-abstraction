// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Create2.sol";
import "./SimpleAdvancedAccount.sol";

/**
 * @title SimpleAdvancedAccountFactory
 * @dev Factory for creating SimpleAdvancedAccount instances using CREATE2
 */
contract SimpleAdvancedAccountFactory {
    address public immutable entryPoint;

    event AccountCreated(
        address indexed account,
        address indexed owner,
        uint256 salt
    );

    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    /**
     * @dev Create a new SimpleAdvancedAccount
     * @param owner The owner of the account
     * @param salt Salt for CREATE2
     * @return accountAddress The address of the created account
     */
    function createAccount(
        address owner,
        uint256 salt
    ) public returns (address accountAddress) {
        bytes memory bytecode = abi.encodePacked(
            type(SimpleAdvancedAccount).creationCode,
            abi.encode(entryPoint)
        );

        accountAddress = Create2.computeAddress(
            bytes32(salt),
            keccak256(bytecode)
        );

        // Check if account already exists
        if (accountAddress.code.length > 0) {
            return accountAddress;
        }

        // Create the account
        SimpleAdvancedAccount account = SimpleAdvancedAccount(
            payable(Create2.deploy(0, bytes32(salt), bytecode))
        );

        // Initialize the account
        account.initialize(owner);

        emit AccountCreated(address(account), owner, salt);

        return address(account);
    }

    /**
     * @dev Get the counterfactual address of an account
     */
    function getAddress(
        address owner,
        uint256 salt
    ) public view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(SimpleAdvancedAccount).creationCode,
            abi.encode(entryPoint)
        );

        return Create2.computeAddress(bytes32(salt), keccak256(bytecode));
    }
}

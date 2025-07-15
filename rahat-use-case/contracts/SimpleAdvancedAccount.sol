// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IAccount.sol";

contract SimpleAdvancedAccount is IAccount {
    using ECDSA for bytes32;

    address public owner;
    address public entryPoint;
    uint256 public constant SIG_VALIDATION_FAILED = 1;

    // Delegation support
    mapping(address => bool) public delegates;
    event DelegateAdded(address indexed delegate);
    event DelegateRemoved(address indexed delegate);
    event AccountInitialized(address indexed entryPoint, address indexed owner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOwnerOrEntryPoint() {
        require(
            msg.sender == owner || msg.sender == entryPoint,
            "Not authorized"
        );
        _;
    }

    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    function initialize(address _owner) external {
        require(owner == address(0), "Already initialized");
        owner = _owner;
        emit AccountInitialized(entryPoint, owner);
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        require(msg.sender == entryPoint, "Account: not from EntryPoint");

        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{
                value: missingAccountFunds,
                gas: type(uint256).max
            }("");
            require(success, "Account: failed to prefund EntryPoint");
        }

        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address recovered = hash.recover(userOp.signature);
        if (recovered == owner || delegates[recovered]) {
            return 0;
        }
        return SIG_VALIDATION_FAILED;
    }

    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external onlyOwnerOrEntryPoint {
        _call(dest, value, func);
    }

    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external onlyOwnerOrEntryPoint {
        require(
            dest.length == func.length && dest.length == value.length,
            "Wrong array lengths"
        );
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }

    function addDelegate(address delegate) external onlyOwner {
        delegates[delegate] = true;
        emit DelegateAdded(delegate);
    }

    function removeDelegate(address delegate) external onlyOwner {
        delegates[delegate] = false;
        emit DelegateRemoved(delegate);
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, ) = target.call{value: value}(data);
        require(success, "Call failed");
    }

    receive() external payable {}

    function addDeposit() public payable {
        (bool success, ) = entryPoint.call{value: msg.value}("");
        require(success, "Deposit failed");
    }

    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) public onlyOwner {
        (bool success, ) = entryPoint.call(
            abi.encodeWithSignature(
                "withdrawTo(address,uint256)",
                withdrawAddress,
                amount
            )
        );
        require(success, "Withdraw failed");
    }
}

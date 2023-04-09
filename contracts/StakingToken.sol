// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract StakingToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant SENDER_ROLE = keccak256("SENDER_ROLE");

    event SetMinter(address minterAddress);
    event SetBurner(address burnerAddress);
    event SetSender(address senderAddress);

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setMinter(address minterAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minterAddress);

        emit SetMinter(minterAddress);
    }

    function setBurner(address burnerAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(BURNER_ROLE, burnerAddress);

        emit SetBurner(burnerAddress);
    }

    function setSender(address senderAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(SENDER_ROLE, senderAddress);

        emit SetSender(senderAddress);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    function send() external onlyRole(SENDER_ROLE) {
        transfer(msg.sender, balanceOf(address(this)));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStay {
    function createListing(string calldata, string calldata, string calldata, uint128) external returns (uint256);
}

/// @dev Test helper: a "host" that cannot receive native tokens.
contract Rejector {
    function list(address stay) external returns (uint256) {
        return IStay(stay).createListing("Stubborn host", "Lagos", "", 1 ether);
    }
}

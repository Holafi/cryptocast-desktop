// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BatchAirdropContract
 * @dev This contract allows users to perform batch transfers of ERC20 tokens to multiple recipients in a single transaction.
 */
contract BatchAirdropContract is ReentrancyGuard {
    function batchTransfer(
        address token,
        address[] memory recipients,
        uint256[] memory amounts
    ) external nonReentrant {
        require(recipients.length == amounts.length, "len");
        for (uint256 i = 0; i < recipients.length; i++) {
            require(
                IERC20(token).transferFrom(
                    msg.sender,
                    recipients[i],
                    amounts[i]
                ),
                "out"
            );
        }
    }
}

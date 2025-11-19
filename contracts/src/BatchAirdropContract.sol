
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BatchAirdropContract
 * @dev 高效批量空投合约 - 支持大规模代币批量分发
 */
contract BatchAirdropContract is ReentrancyGuard {

    function batchTransfer(
        address token,
        address[] memory recipients,
        uint256[] memory amounts
    ) external nonReentrant {
        require(recipients.length == amounts.length, "len");

        uint256 totalAmount;
        unchecked {
            for (uint256 i = 0; i < amounts.length;) {
                totalAmount += amounts[i];
                ++i;
            }
        }

        require(IERC20(token).transferFrom(msg.sender, address(this), totalAmount), "in");

        unchecked {
            for (uint256 i = 0; i < recipients.length;) {
                if (recipients[i] != address(0) && amounts[i] > 0) {
                    require(IERC20(token).transfer(recipients[i], amounts[i]), "out");
                }
                ++i;
            }
        }
    }
}
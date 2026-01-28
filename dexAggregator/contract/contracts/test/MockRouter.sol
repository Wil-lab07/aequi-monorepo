// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockRouter {
    event Swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, address recipient);

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    ) external {
        // Transfer in
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Transfer out (assuming Router is funded)
        IERC20(tokenOut).transfer(recipient, amountOut);
        
        emit Swap(tokenIn, tokenOut, amountIn, amountOut, recipient);
    }
}

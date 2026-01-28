// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract MockUniswapV2Factory {
    mapping(address => mapping(address => address)) public getPair;

    function setPair(address tokenA, address tokenB, address pair) external {
        getPair[tokenA][tokenB] = pair;
        getPair[tokenB][tokenA] = pair;
    }
}

contract MockUniswapV3Factory {
    mapping(address => mapping(address => mapping(uint24 => address))) public getPool;

    function setPool(address tokenA, address tokenB, uint24 fee, address pool) external {
        getPool[tokenA][tokenB][fee] = pool;
        getPool[tokenB][tokenA][fee] = pool;
    }
}

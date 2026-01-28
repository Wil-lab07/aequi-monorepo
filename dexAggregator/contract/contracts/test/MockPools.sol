// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract MockUniswapV2Pair {
    uint112 private _reserve0;
    uint112 private _reserve1;
    address private _token0;
    address private _token1;

    constructor(address token0_, address token1_, uint112 reserve0_, uint112 reserve1_) {
        _token0 = token0_;
        _token1 = token1_;
        _reserve0 = reserve0_;
        _reserve1 = reserve1_;
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (_reserve0, _reserve1, uint32(block.timestamp));
    }
    
    function token0() external view returns (address) { return _token0; }
    function token1() external view returns (address) { return _token1; }
}

contract MockUniswapV3Pool {
    address private _token0;
    address private _token1;
    uint160 private _sqrtPriceX96;
    int24 private _tick;
    uint128 private _liquidity;
    uint24 private _fee;

    constructor(address token0_, address token1_, uint24 fee_, uint160 sqrtPriceX96_, int24 tick_, uint128 liquidity_) {
        _token0 = token0_;
        _token1 = token1_;
        _fee = fee_;
        _sqrtPriceX96 = sqrtPriceX96_;
        _tick = tick_;
        _liquidity = liquidity_;
    }

    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool) {
        return (_sqrtPriceX96, _tick, 0, 0, 0, 0, true);
    }
    
    function liquidity() external view returns (uint128) { return _liquidity; }
    function token0() external view returns (address) { return _token0; }
    function token1() external view returns (address) { return _token1; }
    function fee() external view returns (uint24) { return _fee; }
}

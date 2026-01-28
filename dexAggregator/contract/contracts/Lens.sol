// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./lib/Interfaces.sol";

contract Lens {
    struct V2PoolData {
        address pool;
        uint112 reserve0;
        uint112 reserve1;
        address token0;
        address token1;
        bool exists;
    }

    struct V3PoolData {
        address pool;
        uint160 sqrtPriceX96;
        int24 tick;
        uint128 liquidity;
        address token0;
        address token1;
        uint24 fee;
        bool exists;
    }

    struct TokenMetadata {
        address token;
        uint8 decimals;
        string symbol;
        string name;
        bool exists;
    }

    function batchGetV2PoolData(address[] calldata pools) external view returns (V2PoolData[] memory results) {
        results = new V2PoolData[](pools.length);
        for (uint256 i = 0; i < pools.length; i++) {
            results[i].pool = pools[i];
            
            if (pools[i].code.length == 0) {
                results[i].exists = false;
                continue;
            }

            try this.getV2PoolDataSingle(pools[i]) returns (V2PoolData memory data) {
                results[i] = data;
            } catch {
                results[i].exists = false;
            }
        }
    }

    function batchGetV3PoolData(address[] calldata pools) external view returns (V3PoolData[] memory results) {
        results = new V3PoolData[](pools.length);
        for (uint256 i = 0; i < pools.length; i++) {
            results[i].pool = pools[i];

            if (pools[i].code.length == 0) {
                results[i].exists = false;
                continue;
            }

            try this.getV3PoolDataSingle(pools[i]) returns (V3PoolData memory data) {
                results[i] = data;
            } catch {
                results[i].exists = false;
            }
        }
    }

    function batchGetTokenMetadata(address[] calldata tokens) external view returns (TokenMetadata[] memory results) {
        results = new TokenMetadata[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            results[i].token = tokens[i];

            if (tokens[i].code.length == 0) {
                results[i].exists = false;
                continue;
            }

            try this.getTokenMetadataSingle(tokens[i]) returns (TokenMetadata memory data) {
                results[i] = data;
            } catch {
                results[i].exists = false;
            }
        }
    }

    /**
     * @notice Batch check token balances for a single account
     * @param tokens Array of token addresses
     * @param account The account to check balances for
     * @return Array of balances
     */
    function batchCheckTokenBalances(
        address[] calldata tokens,
        address account
    ) external view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i].code.length == 0) {
                balances[i] = 0;
                continue;
            }

            try IERC20(tokens[i]).balanceOf(account) returns (uint256 balance) {
                balances[i] = balance;
            } catch {
                balances[i] = 0;
            }
        }
        
        return balances;
    }

    /**
     * @notice Batch check token allowances
     * @param tokens Array of token addresses
     * @param owner Token owner
     * @param spender Approved spender
     * @return Array of allowances
     */
    function batchCheckAllowances(
        address[] calldata tokens,
        address owner,
        address spender
    ) external view returns (uint256[] memory) {
        uint256[] memory allowances = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i].code.length == 0) {
                allowances[i] = 0;
                continue;
            }

            try IERC20(tokens[i]).allowance(owner, spender) returns (uint256 allowance) {
                allowances[i] = allowance;
            } catch {
                allowances[i] = 0;
            }
        }
        
        return allowances;
    }

    function getV2PoolDataSingle(address pool) external view returns (V2PoolData memory data) {
        data.pool = pool;
        (uint112 r0, uint112 r1, ) = IUniswapV2Pair(pool).getReserves();
        data.reserve0 = r0;
        data.reserve1 = r1;
        data.token0 = IUniswapV2Pair(pool).token0();
        data.token1 = IUniswapV2Pair(pool).token1();
        data.exists = true;
    }

    function getV3PoolDataSingle(address pool) external view returns (V3PoolData memory data) {
        data.pool = pool;
        (
            uint160 sqrtPriceX96,
            int24 tick,
            ,,,, 
        ) = IUniswapV3Pool(pool).slot0();

        data.sqrtPriceX96 = sqrtPriceX96;
        data.tick = tick;
        data.liquidity = IUniswapV3Pool(pool).liquidity();
        data.token0 = IUniswapV3Pool(pool).token0();
        data.token1 = IUniswapV3Pool(pool).token1();
        data.fee = IUniswapV3Pool(pool).fee();
        data.exists = true;
    }

    function getTokenMetadataSingle(address token) external view returns (TokenMetadata memory data) {
        data.token = token;
        data.decimals = IERC20Metadata(token).decimals();
        data.symbol = IERC20Metadata(token).symbol();
        data.name = IERC20Metadata(token).name();
        data.exists = true;
    }
}

export const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)"
];

export const UNISWAP_V2_ROUTER_ABI = [
    "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)"
];

export const UNISWAP_V3_QUOTER_ABI = [
    // QuoterV2 Signature: accepts a struct
    "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

export const UNISWAP_V3_ROUTER_ABI = [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)"
];

export const LENS_ABI = [
    "function batchGetV2Pools(address factory, tuple(address token0, address token1)[] memory requests) view returns (address[] memory results)",
    "function batchGetV3PoolsAllFees(address factory, tuple(address token0, address token1)[] memory requests) view returns (address[][] memory results)",
    "function batchGetV2PoolData(address[] calldata pools) view returns (tuple(address pool, uint112 reserve0, uint112 reserve1, address token0, address token1, bool exists)[] memory results)",
    "function batchGetV3PoolData(address[] calldata pools) view returns (tuple(address pool, uint160 sqrtPriceX96, int24 tick, uint128 liquidity, address token0, address token1, uint24 fee, bool exists)[] memory results)",
    "function batchCheckTokenBalances(address[] calldata tokens, address account) view returns (uint256[] memory)",
    "function batchCheckAllowances(address[] calldata tokens, address owner, address spender) view returns (uint256[] memory)",
    "function batchGetTokenMetadata(address[] calldata tokens) view returns (tuple(address token, uint8 decimals, string symbol, string name, bool exists)[] memory results)"
];

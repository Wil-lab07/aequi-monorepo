const { ethers } = require("ethers");

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/pP7VbCUTYSbsmXpkaQPcrDCWD-qMWXly";

// PANCAKESWAP V3 FACTORY & POOL DETAILS
const FACTORY_ADDRESS = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";
const TOKEN_A = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // WETH
const TOKEN_B = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC
const FEE_TIER = 500; // 0.05%

// ABIS
const FACTORY_ABI = ["function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"];
const POOL_ABI = [
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function liquidity() external view returns (uint128)"
];

async function main() {
    console.log("🚀 Checking Pool State...");

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    // 1. Get Pool
    const token0 = TOKEN_A.toLowerCase() < TOKEN_B.toLowerCase() ? TOKEN_A : TOKEN_B;
    const token1 = TOKEN_A.toLowerCase() < TOKEN_B.toLowerCase() ? TOKEN_B : TOKEN_A;
    const poolAddress = await factory.getPool(token0, token1, FEE_TIER);
    console.log(`📍 Pool Address: ${poolAddress}`);

    if (poolAddress === ethers.ZeroAddress) {
        console.error("❌ Pool does not exist.");
        return;
    }

    // 2. Read State
    const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
    const slot0 = await pool.slot0();
    const liquidity = await pool.liquidity();

    const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96);
    const tick = Number(slot0.tick);

    console.log(`\n📊 Pool Data:`);
    console.log(`   Tick: ${tick}`);
    console.log(`   Liquidity: ${liquidity.toString()}`);
    console.log(`   SqrtPriceX96: ${sqrtPriceX96.toString()}`);

    // 3. Calculate Price
    // Price = (sqrtPriceX96 / 2^96)^2
    // Decimals: Token0 (USDC, 6), Token1 (WETH, 18).
    // Price (USDC/WETH) = Price_Raw * 10^(Dec0 - Dec1)? No.
    // Standard Formula: P = 1.0001^tick.
    // This gives Price = Amount1 / Amount0.
    // If T0=USDC, T1=WETH. P = WETH / USDC. (e.g. 0.0004).
    // Inverse P (USDC/WETH) = 1 / P.

    // Let's use Tick for precision.
    const priceRatio = 1.0001 ** tick;

    // T0 = USDC (0x1c7...), T1 = WETH (0xfFf...)
    // PriceRatio represents WETH per USDC. (e.g., 0.0004 WETH for 1 USDC).
    // Adjust for decimals:
    // Real Price = PriceRatio * 10^(Dec0 - Dec1) ... ?
    // Let's trace units.
    // Amount1 = PriceRatio * Amount0.
    // WETH_Units = PriceRatio * USDC_Units.
    // WETH_Raw / 10^18 = PriceRatio * (USDC_Raw / 10^6).
    // WETH_Raw = PriceRatio * USDC_Raw * 10^12.
    // V3 Price `sqrtPriceX96` relates raw amounts.
    // (sqrtP / Q96)^2 = y / x = WETH_Raw / USDC_Raw.
    // y / x = PriceRatio * 10^12.

    // We want "USDC per WETH".
    // This is Amount0 / Amount1.
    // = 1 / (Amount1 / Amount0).
    // = 1 / (y/x).

    // Let's compute y/x from sqrtPrice.
    const numerator = sqrtPriceX96 * sqrtPriceX96;
    const denominator = 2n ** 192n;
    // Multiplication is tricky with BigInt division losing precision.
    // Let's use float for display approximation.
    const p_raw = Number(sqrtPriceX96) / (2 ** 96);
    const price_y_over_x = p_raw * p_raw; // WETH_Raw / USDC_Raw

    // Convert to Readable:
    // WETH_Readable / USDC_Readable = (WETH_Raw / 10^18) / (USDC_Raw / 10^6)
    // = (WETH_Raw / USDC_Raw) * 10^-12
    // = price_y_over_x * 1e-12.
    // This is "WETH per USDC". (e.g. 0.0004).

    const priceWethPerUsdc = price_y_over_x * 1e-12;
    const priceUsdcPerWeth = 1 / priceWethPerUsdc;

    console.log(`\n💰 Prices:`);
    console.log(`   1 USDC = ${priceWethPerUsdc.toFixed(6)} WETH`);
    console.log(`   1 WETH = ${priceUsdcPerWeth.toFixed(6)} USDC`); // Target ~2500

    console.log(`\n🎯 Status:`);
    if (priceUsdcPerWeth > 2000 && priceUsdcPerWeth < 3000) {
        console.log("   ✅ Price is HEALTHY (~2500 range).");
    } else if (priceUsdcPerWeth < 1) {
        console.log("   ⚠️  Price is NEAR ZERO (Uninitialized or crashed).");
    } else {
        console.log("   ℹ️  Price is valid but off-target.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

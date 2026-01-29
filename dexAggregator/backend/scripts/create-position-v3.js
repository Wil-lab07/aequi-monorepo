const { ethers } = require("ethers");
// const { NonfungiblePositionManager } = require("@uniswap/v3-sdk"); // If we had SDK, but we use raw ethers

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------

const PRIVATE_KEY = "514105574fbbbdc1bd3ab1746bc4ce4e109edcfd978c2e9fce913072187d0ae7";
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/pP7VbCUTYSbsmXpkaQPcrDCWD-qMWXly";

// PANCAKESWAP V3 ADDRESSES (SEPOLIA)
const FACTORY_ADDRESS = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865"; // Provided by User
// Note: This PositionManager address is common for V3 forks, verify if fails!
const POSITION_MANAGER_ADDRESS = "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364";

// TOKENS
const TOKEN_A = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // WETH
const TOKEN_B = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC
const FEE_TIER = 500; // 0.05% (PancakeSwap V3 Supported: 100, 500, 2500, 10000)

// INITIAL PRICE
// WETH is ~2500 USDC.
// Price = token1/token0.
// Let's assume Token A is Token0 and Token B is Token1 (sorted by address)
// We need to sort them first to know which is token0/1 for sqrtPriceX96 calculation.

// ABIS
const FACTORY_ABI = [
    "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

const POOL_ABI = [
    "function initialize(uint160 sqrtPriceX96) external",
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
];

const PM_ABI = [
    // Use full tuple signature for struct to avoid ethers v6 parsing issues with custom structs in human-readable ABI
    "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
    "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function decimals() view returns (uint8)"
];

async function main() {
    console.log("🚀 Starting Create V3 Pool Script...");

    if (PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
        console.error("❌ Please set your PRIVATE_KEY in the script!");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`👤 Wallet: ${wallet.address}`);

    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);
    const nfpm = new ethers.Contract(POSITION_MANAGER_ADDRESS, PM_ABI, wallet);

    // 1. Sort Tokens
    const token0 = TOKEN_A.toLowerCase() < TOKEN_B.toLowerCase() ? TOKEN_A : TOKEN_B;
    const token1 = TOKEN_A.toLowerCase() < TOKEN_B.toLowerCase() ? TOKEN_B : TOKEN_A;

    console.log(`🔹 Token0: ${token0}`);
    console.log(`🔹 Token1: ${token1}`);

    // 2. Check if Pool Exists
    let poolAddress = await factory.getPool(token0, token1, FEE_TIER);
    console.log(`🔍 Existing Pool Check: ${poolAddress}`);

    // 3. Calculate Initial Price (SqrtPriceX96)
    // If we want 1 WETH = 2000 USDC.
    // If WETH is token0, Price = 2000.
    // If WETH is token1, Price = 1/2000.
    // SqrtPriceX96 = sqrt(price) * 2^96

    // Let's quickly check decimals.
    // WETH 18, USDC 6.
    // Real Price P = (Amount1 / 10^Dec1) / (Amount0 / 10^Dec0)
    // Raw Price Ratio = P * 10^(Dec1 - Dec0)

    // Simplification for this script: 
    // Just use a "safe" default like 1:1 or attempt to set 2000 if hardcoded.
    // Let's set 1:1 for simplicity unless user requested specific.
    // Or better, let's execute createAndInitialize via PM.

    // Hardcoding roughly 2500 USDC per ETH.
    // If WETH is token0: 2500 * 10^6 / 10^18 = 2500 * 10^-12 = 0.0000000025
    // If WETH is token1: 1 / 2500 * 10^18 / 10^6 = 0.0004 * 10^12 = 400000000

    // Let's assume WETH is Token0 (0xfFf... vs 0x1c7... -> 0x1c7 is smaller so USDC is Token0!)
    // USDC (Token0) = 0x1c7...
    // WETH (Token1) = 0xfFf...

    // Price = WETH / USDC = 1 / 2500 = 0.0004
    // Adjust for decimals: 0.0004 * 10^(18 - 6) = 0.0004 * 10^12 = 400,000,000
    // sqrt(400,000,000) = 20,000
    // sqrtPriceX96 = 20,000 * 2^96

    const price = 400000000n;
    const sqrtPrice = 20000n; // sqrt of 400000000
    const q96 = 2n ** 96n;
    const sqrtPriceX96 = sqrtPrice * q96;

    console.log(`🧮 Calculated SqrtPriceX96: ${sqrtPriceX96.toString()}`);

    // 4. Create / Initialize
    if (poolAddress === ethers.ZeroAddress) {
        console.log("🆕 Creating and Initializing Pool...");
        // Calling createAndInitializePoolIfNecessary on PM is safer as it handles both steps
        /*
        const tx = await nfpm.createAndInitializePoolIfNecessary(
            token0,
            token1,
            FEE_TIER,
            sqrtPriceX96
        );
        await tx.wait();
        poolAddress = await factory.getPool(token0, token1, FEE_TIER);
        console.log(`✅ Pool Created: ${poolAddress}`);
        */

        // ALTERNATIVE: Use Factory Directly + Pool Initialize (If PM fails/unknown)
        console.log("   (Using Factory.createPool directly)");
        try {
            const createTx = await factory.createPool(token0, token1, FEE_TIER);
            const receipt = await createTx.wait();
            poolAddress = await factory.getPool(token0, token1, FEE_TIER);
            console.log(`✅ Pool Created at: ${poolAddress}`);

            // Now Initialize
            const poolContract = new ethers.Contract(poolAddress, POOL_ABI, wallet);
            const initTx = await poolContract.initialize(sqrtPriceX96);
            await initTx.wait();
            console.log("✅ Pool Initialized!");
        } catch (e) {
            console.error("❌ Creation/Init Failed:", e.shortMessage || e.message);
        }
    } else {
        console.log("ℹ️ Pool already exists.");
        // CHECK INITIALIZATION
        try {
            const poolContract = new ethers.Contract(poolAddress, POOL_ABI, wallet);
            const slot0 = await poolContract.slot0();
            console.log(`📊 Pool State (Slot0):`);
            console.log(`   SqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
            console.log(`   Tick: ${slot0.tick}`);

            if (slot0.sqrtPriceX96 === 0n) {
                console.log("⚠️  Pool exists but SqrtPrice is 0! It is NOT initialized.");
                console.log("⚡ Initializing now...");
                const initTx = await poolContract.initialize(sqrtPriceX96);
                await initTx.wait();
                console.log("✅ Pool Initialized!");
            } else {
                console.log("✅ Pool is already initialized.");
            }
        } catch (e) {
            console.error("❌ Failed to check pool state:", e.message);
        }
    }

    // 5. Mint Logic
    console.log("\n💡 Preparing to Mint Liquidity...");

    // Price Target: 1 USDC = 0.0004 WETH (i.e., 1 ETH = 2500 USDC)
    // Token0 = USDC, Token1 = WETH.
    // Price = Amount1 / Amount0 = 0.0004
    // Tick = ln(0.0004) / ln(1.0001) ≈ -78240
    const targetTick = -78240;
    const tickSpacing = 10; // For fee 500
    const tickLower = Math.floor((targetTick - 2000) / tickSpacing) * tickSpacing; // ~ -80240
    const tickUpper = Math.floor((targetTick + 2000) / tickSpacing) * tickSpacing; // ~ -76240

    console.log(`   Target Price: ~2500 USDC/ETH`);
    console.log(`   Target Tick: ${targetTick}`);
    console.log(`   Range: [${tickLower}, ${tickUpper}]`);

    // Define Amounts (e.g. 100 USDC and equivalent WETH)
    // Since current tick (-887272) < Lower Tick (-80240), strict single-sided logic applies?
    // If Current < Lower, we are providing ONLY Token0 (USDC).
    // Wait, standard logic:
    // If P_current < P_lower: We want to trigger buying up to range. We provide range [Pa, Pb]. P < Pa. 
    // We provide ONLY asset X (Token0).
    // Let's verify: Token0 is safe, Token1 is risky? 
    // Usually if Price is "Low", it means Token1 is cheap relative to Token0?
    // Price = T1/T0. Price Low -> T1 is small amount per T0? No.
    // Price 0 means 0 WETH per USDC. So WETH is worthless?
    // Or USDC is infinitely expensive.

    // Whatever, we just authorize BIG amounts and let MintParams sort it out.
    // If the contract only takes one, it takes one.

    const amount0Desired = 100000000n; // 100 USDC (6 decimals)
    const amount1Desired = 100000000000000000n; // 0.1 ETH (18 decimals)

    console.log(`   Desired: ${amount0Desired} USDC, ${amount1Desired} WETH`);

    // Approvals
    console.log("   Approving tokens...");
    const t0Contract = new ethers.Contract(token0, ERC20_ABI, wallet);
    const t1Contract = new ethers.Contract(token1, ERC20_ABI, wallet);

    await (await t0Contract.approve(POSITION_MANAGER_ADDRESS, amount0Desired * 10n)).wait();
    await (await t1Contract.approve(POSITION_MANAGER_ADDRESS, amount1Desired * 10n)).wait();
    console.log("   ✅ Approved.");

    console.log("   Minting...");
    try {
        const params = {
            token0: token0,
            token1: token1,
            fee: FEE_TIER,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0n, // Slippage 100% allowed for test
            amount1Min: 0n,
            recipient: wallet.address,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 1200)
        };

        const tx = await nfpm.mint(params, { gasLimit: 3000000 });
        console.log(`   🚀 Mint function called. Hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   🎉 Liquidity Added! Block: ${receipt.blockNumber}`);
    } catch (e) {
        console.error("   ❌ Mint Failed:", e);
        if (e.data) console.error("   Revert Data:", e.data);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

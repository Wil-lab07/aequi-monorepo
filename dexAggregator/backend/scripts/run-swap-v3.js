const { ethers } = require("ethers");

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------

const PRIVATE_KEY = "514105574fbbbdc1bd3ab1746bc4ce4e109edcfd978c2e9fce913072187d0ae7";
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/pP7VbCUTYSbsmXpkaQPcrDCWD-qMWXly";

// PANCAKESWAP V3 ROUTER (Sepolia)
// Verified Address: https://docs.pancakeswap.finance/developers/smart-contracts/testnet
const ROUTER_ADDRESS = "0x1b81D678ffb9C0263b24A97847620C99d213eB14";

// TOKENS
const TOKEN_A = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // WETH
const TOKEN_B = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC
const FEE_TIER = 500; // 0.05%

// ROUTER ABI (ExactInputSingle)
const ROUTER_ABI = [
    "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address owner) view returns (uint256)"
];

async function main() {
    console.log("🚀 Starting V3 Swap to FIX Price...");

    if (PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
        console.error("❌ Please set your PRIVATE_KEY in the script!");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`👤 Wallet: ${wallet.address}`);

    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

    // Tokens
    // We determined WETH/USDC:
    // T0 = USDC, T1 = WETH.
    // Current Price ~ 0 (Min Tick).
    // CORRECT LOGIC (My Apologies!):
    // Current Tick: -887272 (Price ~0)
    // Target Tick: -78240 (Price ~2500)
    // We need to INCREASE Tick (-887k -> -78k).
    // In Uniswap V3:
    // - zeroForOne (Sell T0): Tick goes DOWN.
    // - oneForZero (Sell T1): Tick goes UP.
    // 
    // We need Tick UP -> So we must SELL T1 (WETH).
    // Swap WETH -> USDC.

    const tokenIn = TOKEN_A; // WETH (Token1)
    const tokenOut = TOKEN_B; // USDC (Token0)

    // Amount: Sell a small amount of WETH to push price up.
    // 0.01 WETH
    const amountIn = 10000000000000000n; // 0.01 WETH

    console.log(`🔹 Swapping WETH -> USDC to raise tick.`);
    console.log(`   Amount In: ${amountIn.toString()} WETH`);

    // BALANCE CHECK
    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
    const balance = await tokenInContract.balanceOf(wallet.address);
    console.log(`   Your WETH Balance: ${balance.toString()}`);
    if (balance < amountIn) {
        console.error("❌ You do not have enough WETH!");
        process.exit(1);
    }

    // LIMIT FIX
    // For OneForZero (Selling Token1/WETH), Price INCREASES.
    // Limit must be > CurrentPrice.
    // If we pass 0, it reverts.
    // We must pass MAX_SQRT_RATIO - 1.
    const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;
    const limit = MAX_SQRT_RATIO - 1n;

    // Approve Router
    // tokenInContract is already defined above
    console.log("   Checking Allowance...");
    const allowance = await tokenInContract.allowance(wallet.address, ROUTER_ADDRESS);
    if (allowance < amountIn) {
        console.log("   Approving Router...");
        const tx = await tokenInContract.approve(ROUTER_ADDRESS, amountIn * 100n); // Approve extra
        await tx.wait();
        console.log("   ✅ Approved.");
    } else {
        console.log("   ✅ Already Approved.");
    }

    // Execute Swap
    console.log("   Executing Swap...");
    const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: FEE_TIER,
        recipient: wallet.address,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        amountIn: amountIn,
        amountOutMinimum: 0n, // Accept any output (fixing price is priority)
        sqrtPriceLimitX96: limit // Use Max Limit
    };

    try {
        // Let ethers estimate gas automatically (removed manual limit)
        const tx = await router.exactInputSingle(params);
        console.log(`   🚀 Swap Sent! Hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   🎉 Swap Confirmed! Price should now be fixed.`);
    } catch (e) {
        console.error("   ❌ Swap Failed:", e);
        if (e.data) console.error("   Revert Data:", e.data);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

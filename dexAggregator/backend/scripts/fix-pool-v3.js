const { ethers } = require("ethers");

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------

const PRIVATE_KEY = "514105574fbbbdc1bd3ab1746bc4ce4e109edcfd978c2e9fce913072187d0ae7";
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/pP7VbCUTYSbsmXpkaQPcrDCWD-qMWXly";

// PANCAKESWAP V3 ADDRESSES (SEPOLIA)
const ROUTER_ADDRESS = "0x1b81D678ffb9C0263b24A97847620C99d213eB14";
const TOKEN_A = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // WETH
const TOKEN_B = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC
const FEE_TIER = 500; // 0.05%

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address owner) view returns (uint256)"
];

const ROUTER_ABI = ["function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"];

async function main() {
    console.log("🚀 Starting FINAL Price Fix (Target Tick +198,000)...");

    if (PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
        console.error("❌ Please set your PRIVATE_KEY in the script!");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`👤 Wallet: ${wallet.address}`);

    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

    // We determined we need to INCREASE Tick from -80k to +198k.
    // Increase Tick = OneForZero (Sell WETH).
    const tokenIn = TOKEN_A; // WETH
    const tokenOut = TOKEN_B; // USDC

    // Check WETH Balance
    const tIn = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
    const balance = await tIn.balanceOf(wallet.address);
    console.log(`   Balance WETH: ${ethers.formatUnits(balance, 18)}`);

    // Use smaller amount to nudge it if liquidity is thin, OR large if we need to cross gap.
    // Try 0.01 WETH.
    const amountIn = 10000000000000000n; // 0.01 WETH

    if (balance < amountIn) {
        console.error("❌ Insufficient WETH to swap! You need to buy more WETH or use USDC to move price differently.");
        return;
    }

    console.log(`🔹 Swapping WETH -> USDC.`);
    console.log(`   Amount In: ${ethers.formatUnits(amountIn, 18)} WETH`);

    console.log("   Approving...");
    const allowance = await tIn.allowance(wallet.address, ROUTER_ADDRESS);
    if (allowance < amountIn) {
        await (await tIn.approve(ROUTER_ADDRESS, amountIn * 100n)).wait();
    }

    console.log("   Executing...");
    const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;
    const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: FEE_TIER,
        recipient: wallet.address,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        amountIn: amountIn,
        amountOutMinimum: 0n,
        // OneForZero (Price Up). Limit > Current.
        sqrtPriceLimitX96: MAX_SQRT_RATIO - 1n
    };

    try {
        const tx = await router.exactInputSingle(params, { gasLimit: 10000000 });
        console.log(`✅ Final Fix Sent! Hash: ${tx.hash}`);
        await tx.wait();
        console.log("🎉 Price Shifted!");
    } catch (e) {
        console.error("❌ Failed:", e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

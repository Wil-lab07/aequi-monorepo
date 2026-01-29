const { ethers } = require('ethers');

// Config
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const TOKEN_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'; // WETH
const USER_ADDRESS = '0xCC519ae1c21Bbb83c4B9d08FF066BC263E9C1A7e';
const EXECUTOR_ADDRESS = '0xCa9c2ce48cd0A89287762C30D76D6417888204d7';

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);

    console.log(`Checking state for user ${USER_ADDRESS}...`);

    // 1. Check Native Balance
    const nativeBal = await provider.getBalance(USER_ADDRESS);
    console.log(`Native ETH Balance: ${ethers.formatEther(nativeBal)} ETH`);

    // 2. Check Token Balance
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const tokenBal = await token.balanceOf(USER_ADDRESS);
    console.log(`${symbol} Balance: ${ethers.formatUnits(tokenBal, decimals)} ${symbol}`);

    // 3. Check Allowance
    const allowance = await token.allowance(USER_ADDRESS, EXECUTOR_ADDRESS);
    console.log(`Allowance to Executor (${EXECUTOR_ADDRESS}): ${ethers.formatUnits(allowance, decimals)} ${symbol}`);

    if (tokenBal === 0n) {
        console.error("ERROR: User has 0 WETH! They need to Wrap ETH first.");
    } else if (allowance === 0n) {
        console.error("ERROR: Zero Allowance! Detailed above.");
    } else {
        console.log("SUCCESS: Balance and Allowance look good.");
    }
}

main().catch(console.error);

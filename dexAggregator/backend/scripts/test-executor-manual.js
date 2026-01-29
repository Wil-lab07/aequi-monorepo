const { ethers } = require("ethers");

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------

// 1. PROVIDER & WALLET
// Replace with your private key in your .env or hardcode here for testing
const PRIVATE_KEY = "514105574fbbbdc1bd3ab1746bc4ce4e109edcfd978c2e9fce913072187d0ae7";
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/J5RK1MpNq6jxF4gu77yBXyhchyUDk2Mh"

// 2. CONTRACT ADDRESS
// Derived from the JSON "router" field, but safe to define here too
const EXECUTOR_ADDRESS = "0xCa9c2ce48cd0A89287762C30D76D6417888204d7";

// 3. THE MOCK DATA (Pasted directly from User Request)
const MOCK_DATA = {
    "quote": {
        "chain": "sepolia",
        "amountIn": "1000000000000000",
        "amountOut": "18523097",
        "priceQ18": "18523097000000000000000",
        "executionPriceQ18": "18523097000000000000000",
        "midPriceQ18": "20115710797639649789613",
        "priceImpactBps": 791,
        "liquidityScore": "41555939349",
        "path": [
            {
                "chainId": 11155111,
                "address": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                "symbol": "WETH",
                "name": "Wrapped Ether",
                "decimals": 18
            },
            {
                "symbol": "USDT",
                "name": "Tether USD",
                "address": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
                "decimals": 6
            },
            {
                "chainId": 11155111,
                "address": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
                "symbol": "USDC",
                "name": "USDC",
                "decimals": 6
            }
        ],
        "routeAddresses": [
            "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
            "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
            "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
        ],
        "hopVersions": [
            "v2",
            "v2"
        ],
        "sources": [
            {
                "dexId": "Uniswap",
                "poolAddress": "0xCBDB9cb0669906C8B12211824b4f069d183155Ff",
                "amountIn": "1000000000000000",
                "amountOut": "2412732958"
            },
            {
                "dexId": "Uniswap",
                "poolAddress": "0xcb61057c02779E9B95154c056e7dc8534477714f",
                "amountIn": "2412732958",
                "amountOut": "18523097"
            }
        ],
        "estimatedGasCostWei": "212430586620000",
        "gasPriceWei": "1011574222",
    },
    "amountOutMin": "18523097",
    "amountOutMinFormatted": "18.523097",
    "slippageBps": 50,
    "recipient": "0xCC519ae1c21Bbb83c4B9d08FF066BC263E9C1A7e",
    "deadline": 1769677156,
    "quoteTimestamp": 1769677037,
    "quoteExpiresAt": 1769677156,
    "quoteValidSeconds": 120,
    "quoteBlockNumber": "10147352",
    "quoteBlockTimestamp": 1769677032,
    "transaction": {
        "kind": "executor",
        "dexId": "multi",
        "router": "0xCa9c2ce48cd0A89287762C30D76D6417888204d7",
        "spender": "0xCa9c2ce48cd0A89287762C30D76D6417888204d7",
        "amountIn": "1000000000000000",
        "amountOut": "18523097",
        "amountOutMinimum": "18523097",
        "deadline": 1769677156,
        "estimatedGas": "379531",
        "calls": [
            {
                "target": "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
                "allowFailure": false,
                "callData": "0x38ed173900000000000000000000000000000000000000000000000000038d7ea4c68000000000000000000000000000000000000000000000000000000000008fcf621e00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000ca9c2ce48cd0a89287762c30d76d6417888204d700000000000000000000000000000000000000000000000000000000697b21640000000000000000000000000000000000000000000000000000000000000002000000000000000000000000fff9976782d46cc05630d1f6ebab18b2324d6b14000000000000000000000000aa8e23fb1079ea71e0a56f48a2aa51851d8433d0",
                "value": "0"
            },
            {
                "target": "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
                "allowFailure": false,
                "callData": "0x38ed1739000000000000000000000000000000000000000000000000000000008faa916200000000000000000000000000000000000000000000000000000000011aa3d900000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000cc519ae1c21bbb83c4b9d08ff066bc263e9c1a7e00000000000000000000000000000000000000000000000000000000697b21640000000000000000000000000000000000000000000000000000000000000002000000000000000000000000aa8e23fb1079ea71e0a56f48a2aa51851d8433d00000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238",
                "value": "0"
            }
        ],
        "call": {
            "to": "0xCa9c2ce48cd0A89287762C30D76D6417888204d7",
            "data": "0x83fcf4b7000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000005e00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000fff9976782d46cc05630d1f6ebab18b2324d6b1400000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000fff9976782d46cc05630d1f6ebab18b2324d6b14000000000000000000000000ee567fe1712faf6149d80da1e6934e354124cfe3ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000aa8e23fb1079ea71e0a56f48a2aa51851d8433d0000000000000000000000000ee567fe1712faf6149d80da1e6934e354124cfe3ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000220000000000000000000000000ee567fe1712faf6149d80da1e6934e354124cfe3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010438ed173900000000000000000000000000000000000000000000000000038d7ea4c68000000000000000000000000000000000000000000000000000000000008fcf621e00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000ca9c2ce48cd0a89287762c30d76d6417888204d700000000000000000000000000000000000000000000000000000000697b21640000000000000000000000000000000000000000000000000000000000000002000000000000000000000000fff9976782d46cc05630d1f6ebab18b2324d6b14000000000000000000000000aa8e23fb1079ea71e0a56f48a2aa51851d8433d000000000000000000000000000000000000000000000000000000000000000000000000000000000ee567fe1712faf6149d80da1e6934e354124cfe3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000aa8e23fb1079ea71e0a56f48a2aa51851d8433d00000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000010438ed1739000000000000000000000000000000000000000000000000000000008faa916200000000000000000000000000000000000000000000000000000000011aa3d900000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000cc519ae1c21bbb83c4b9d08ff066bc263e9c1a7e00000000000000000000000000000000000000000000000000000000697b21640000000000000000000000000000000000000000000000000000000000000002000000000000000000000000aa8e23fb1079ea71e0a56f48a2aa51851d8433d00000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000fff9976782d46cc05630d1f6ebab18b2324d6b14000000000000000000000000aa8e23fb1079ea71e0a56f48a2aa51851d8433d0",
            "value": "0"
        },
        "executor": {
            "pulls": [
                {
                    "token": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                    "amount": "1000000000000000"
                }
            ],
            "approvals": [
                {
                    "token": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                    "spender": "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
                    "amount": "115792089237316195423570985008687907853269984665640564039457584007913129639935"
                },
                {
                    "token": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
                    "spender": "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
                    "amount": "115792089237316195423570985008687907853269984665640564039457584007913129639935"
                }
            ],
            "calls": [
                {
                    "target": "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
                    "value": "0",
                    "data": "0x38ed173900000000000000000000000000000000000000000000000000038d7ea4c68000000000000000000000000000000000000000000000000000000000008fcf621e00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000ca9c2ce48cd0a89287762c30d76d6417888204d700000000000000000000000000000000000000000000000000000000697b21640000000000000000000000000000000000000000000000000000000000000002000000000000000000000000fff9976782d46cc05630d1f6ebab18b2324d6b14000000000000000000000000aa8e23fb1079ea71e0a56f48a2aa51851d8433d0",
                    "injectToken": "0x0000000000000000000000000000000000000000",
                    "injectOffset": "0"
                },
                {
                    "target": "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3",
                    "value": "0",
                    "data": "0x38ed1739000000000000000000000000000000000000000000000000000000008faa916200000000000000000000000000000000000000000000000000000000011aa3d900000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000cc519ae1c21bbb83c4b9d08ff066bc263e9c1a7e00000000000000000000000000000000000000000000000000000000697b21640000000000000000000000000000000000000000000000000000000000000002000000000000000000000000aa8e23fb1079ea71e0a56f48a2aa51851d8433d00000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238",
                    "injectToken": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
                    "injectOffset": "4"
                }
            ],
            "tokensToFlush": [
                "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
                "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0"
            ]
        }
    }
}

// 4. ABI
const EXECUTOR_ABI = [
    "function execute(tuple(address token, uint256 amount)[] pulls, tuple(address token, address spender, uint256 amount)[] approvals, tuple(address target, uint256 value, bytes data, address injectToken, uint256 injectOffset)[] calls, address[] tokensToFlush) external payable returns (bytes[] memory results)"
];

async function main() {
    console.log("🚀 Starting Manual Executor Test with MOCK DATA...");

    if (PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
        console.error("❌ Please set your PRIVATE_KEY in the script!");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`👤 Wallet: ${wallet.address}`);

    const executor = new ethers.Contract(EXECUTOR_ADDRESS, EXECUTOR_ABI, wallet);

    // EXTRACT EXECUTION DATA
    const execData = MOCK_DATA.transaction.executor;

    // PATCH: Update deadline in the calldata because the mock data is old (~1 hr ago)
    // The previous deadline was 1769673401 (expired). Current time is ~1769678000+
    const freshDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // Now + 1 hr
    const staleDeadlineHex = "697b12b9"; // 0x697b12b9 = 1769673401
    const freshDeadlineHex = freshDeadline.toString(16).padStart(64, '0'); // 32 bytes hex

    // We need to patch the deadline in the encoded calldata of the calls.
    // The deadline is the LAST parameter in swapExactTokensForTokens.
    // However, finding and replacing raw hex strings is risky if not precise.
    // BUT since we are hacking a test script for a specific mock:

    // Let's just re-encode the calls using the Interface since we have the data structure!
    // It's safer and cleaner than string replacement on bytecode.

    const v2Interface = new ethers.Interface([
        "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
    ]);

    // Re-encode Call 1
    // Original: WETH -> USDT
    const call1NewData = v2Interface.encodeFunctionData("swapExactTokensForTokens", [
        "1000000000000000", // amountIn
        "0", // amountOutMin (0 for intermediate)
        ["0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0"], // path
        EXECUTOR_ADDRESS, // to
        freshDeadline // fresh deadline
    ]);
    execData.calls[0].data = call1NewData;

    // Re-encode Call 2
    // Original: USDT -> USDC
    const call2NewData = v2Interface.encodeFunctionData("swapExactTokensForTokens", [
        "0", // amountIn (placeholder for injection)
        "18523097", // amountOutMin
        ["0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"], // path
        EXECUTOR_ADDRESS, // to
        freshDeadline // fresh deadline
    ]);
    execData.calls[1].data = call2NewData;

    console.log(`🕒 Patched Deadlines to: ${freshDeadline} (Test Mode)`);

    console.log("\n📦 Extracting Transaction Data...");
    console.log(`   Pulls: ${execData.pulls.length}`);
    console.log(`   Approvals: ${execData.approvals.length}`);
    console.log(`   Calls: ${execData.calls.length}`);

    // We pass the parsed JSON objects directly. Ethers.js v6 will handle big number strings :)

    console.log("\n⚡ Sending Transaction...");
    try {
        const tx = await executor.execute(
            execData.pulls,
            execData.approvals,
            execData.calls,
            execData.tokensToFlush,
            { gasLimit: MOCK_DATA.transaction.estimatedGas }
        );
        console.log(`✅ Transaction Sent!`);
        console.log(`🔗 Hash: ${tx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);

        const receipt = await tx.wait();
        console.log(`🎉 Transaction Confirmed in block ${receipt.blockNumber}`);
    } catch (error) {
        console.error("❌ Transaction Failed:");
        if (error.data) console.error(`   Revert Data: ${error.data}`);
        console.error(error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});


import { createPublicClient, http, parseAbi, formatUnits, getAddress } from 'viem'
import { sepolia } from 'viem/chains'

const QUOTER_ADDRESS = getAddress('0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3')
const WETH = getAddress('0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14')
const USDC = getAddress('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238')

const AMOUNT_IN = 1000000000000000000n // 1 ETH

const ABI = [
    {
        name: 'quoteExactInputSingle',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                name: 'params',
                type: 'tuple',
                components: [
                    { name: 'tokenIn', type: 'address' },
                    { name: 'tokenOut', type: 'address' },
                    { name: 'amountIn', type: 'uint256' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'sqrtPriceLimitX96', type: 'uint160' }
                ]
            }
        ],
        outputs: [
            { name: 'amountOut', type: 'uint256' },
            { name: 'sqrtPriceX96After', type: 'uint160' },
            { name: 'initializedTicksCrossed', type: 'uint32' },
            { name: 'gasEstimate', type: 'uint256' }
        ]
    }
] as const

async function main() {
    const client = createPublicClient({
        chain: sepolia,
        transport: http('https://sepolia.drpc.org')
    })

    console.log('Verifying ETH -> USDC quote on Sepolia (Direct Quoter Call)...')
    console.log(`Amount In: ${formatUnits(AMOUNT_IN, 18)} ETH`)

    const fees = [500, 3000, 10000] // 0.05%, 0.3%, 1%

    for (const fee of fees) {
        try {
            console.log(`\nChecking Fee Tier: ${fee / 10000}%`)
            const result = await client.simulateContract({
                address: QUOTER_ADDRESS,
                abi: ABI,
                functionName: 'quoteExactInputSingle',
                args: [{
                    tokenIn: WETH,
                    tokenOut: USDC,
                    amountIn: AMOUNT_IN,
                    fee: fee,
                    sqrtPriceLimitX96: 0n
                }]
            })

            const amountOut = result.result[0]
            console.log(`  ✅ Quote Success!`)
            console.log(`  Amount Out: ${formatUnits(amountOut, 6)} USDC`)
        } catch (e) {
            console.log(`  ❌ Quote Failed for fee ${fee}:`, (e as Error).message.split('\n')[0])
        }
    }
}

main()

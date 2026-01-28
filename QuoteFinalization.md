# Quote Finalization & Response

Once the **Best Quote** is selected, we perform two final steps before sending it to the Frontend:
1.  **Slippage Protection** (Calculating `amountOutMin`)
2.  **Response Formatting** (Building the API Payload)

---

## 1. Slippage Protection (`amountOutMin`)

### What is this?
This is a safety mechanism. In DeFi, prices change every second.
*   **Quote Price**: "You *should* get 1000 tokens."
*   **Reality**: By the time your transaction confirms (12 seconds later), the price might be 998.

To protect the user, we calculate a **Minimum Acceptable Amount** (`amountOutMin`). If the trade results in anything less than this number, the smart contract will **REVERT** (fail) the transaction instead of giving the user a bad price.

### The Logic

```typescript
// 1. Clamp Slippage: Ensure the user's input (e.g., 50 bps) is safe (0% - 50%)
const boundedSlippage = clampSlippage(slippageBps)

// 2. Calculate Max Loss: How many tokens are we willing to lose?
// Formula: (AmountOut * Slippage) / 10000
const slippageAmount = (quote.amountOut * BigInt(boundedSlippage)) / 10000n

// 3. Set The Floor: The absolute minimum tokens acceptable
const amountOutMin = quote.amountOut > slippageAmount 
    ? quote.amountOut - slippageAmount 
    : 0n
```

---

## 2. Response Formatting

### What is this?
The raw `quote` object contains BigInts and complex nested objects (e.g., `TokenMetadata`). The API needs to return a clean, serializable JSON object that the Frontend can use easily.

### The Transformation

We combine the raw **Best Quote**, the calculated **Safety Params**, and formatted strings into the final response logic.

```typescript
// The inputs from previous steps
const { quote, amountOutMin, tokenOut, slippageBps } = result

// 1. Format the core fields (Amounts, Path, Gas)
const baseResponse = formatPriceQuote(chain, quote, routePreference)

// 2. Format the human-readable string (e.g., "1000000..." -> "1.0")
const amountOutMinFormatted = formatAmountFromUnits(amountOutMin, tokenOut.decimals)

// 3. Return the Final Payload
return {
    ...baseResponse,            // The Quote Data (Path, Amounts, Gas)
    amountOutMin: amountOutMin.toString(), // For Smart Contract (BigInt as String)
    amountOutMinFormatted,      // For UI Display ("Min received: 0.99 USDC")
    slippageBps,                // The slippage used (e.g., 50)
}
```

### Final API Response Structure
The Frontend receives this complete JSON payload:

```json
{
  "chain": "sepolia",
  "source": "uniswap-v3@3000 > uniswap-v2",
  "path": ["WETH", "USDC", "USDT"],
  "tokens": [
    { "symbol": "WETH", "decimals": 18, "address": "0x..." },
    { "symbol": "USDC", "decimals": 6, "address": "0x..." },
    { "symbol": "USDT", "decimals": 6, "address": "0x..." }
  ],
  "amountIn": "1000000000000000000",
  "amountInFormatted": "1.0",
  "amountOut": "1005000",
  "amountOutFormatted": "1.005",
  "amountOutMin": "1000000",        // <--- Safety Floor
  "amountOutMinFormatted": "1.00", // <--- UI Display
  "slippageBps": 50,               // 0.5%
  "priceImpactBps": 10,
  "executionPriceQ18": "1005000000000000000",
  "estimatedGasUnits": "250000",
  "recipient": "0xUserWallet...",
  "deadline": 1735689000,
  "transaction": {
    "to": "0xExecutorContract...",
    "data": "0x...",               // <--- The Calldata for MetaMask
    "value": "0",
    "estimatedGas": "300000"       // Gas limit for wallet
  }
}
```

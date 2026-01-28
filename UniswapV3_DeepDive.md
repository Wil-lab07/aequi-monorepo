# Uniswap V3 Quote Deep Dive (Simulation & SDK)

This document explains `UniswapV3Adapter.computeV3Quote`.
Unlike V2 (Pure Math), V3 relies on **On-Chain Simulation** because the math is too hard for CPU.

## 1. The Core Strategy
*   **Step 1 (The Price)**: Ask the blockchain "If I sell 1 ETH, what do I get?".
*   **Step 2 (The Metrics)**: Use the SDK locally to calculate "Fair Price" and "Slippage".

---

## 2. Step-by-Step Code Execution

### Step A: The Quoter (The "Oracle")
We don't calculate `AmountOut` ourselves. We call a smart contract.

```typescript
const quoterResult = await client.readContract({
  address: dex.quoterAddress, // e.g. 0xB048... (Quoter V2)
  abi: V3_QUOTER_ABI,
  functionName: 'quoteExactInputSingle', // "I have exact input, give me output"
  args: [{
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn: amountIn, // 1000000000000000000n
      fee: fee,           // 500 (0.05%) or 3000 (0.3%)
      sqrtPriceLimitX96: 0n // 0 = "No Limit" (Execute even if price moves 99%)
  }]
})

const [amountOut] = quoterResult
```
**Why?**
V3 has "ticks". As you buy, you cross ticks. Each tick has different liquidity. Calculating this off-chain is incredibly complex and error-prone. The **Quoter Contract** does the exact math using the real blockchain state.

---

### Step B: The SDK Pool (For Metrics)
Now we have `AmountOut`, but we need `MidPrice` and `PriceImpact`.
We build a **Virtual Pool** leveraging the SDK.

```typescript
const pool = new Pool(
  tokenInInstance,
  tokenOutInstance,
  fee,
  sqrtPriceX96.toString(), // Current Price (Raw)
  liquidity.toString(),    // Current Liquidity
  tick                     // Current Tick Index
)
```
*   **V2 Pair**: Had `Reserve0` and `Reserve1`.
*   **V3 Pool**: Has `sqrtPriceX96` (The Price) and `Liquidity` (Depth). It doesn't track total reserves the same way.

---

### Step C: Calculate Metrics

**1. Mid Price (Spot Price)**
```typescript
const midPriceQ18 = computeMidPriceQ18FromPrice(
  this.protocol,
  tokenInInstance,
  tokenOut.decimals,
  pool.token0Price // The SDK calculates "1 Token0 = X Token1" for us
)
```
*   The SDK converts the scary `sqrtPriceX96` into a normal price object (`pool.token0Price`).

**2. Execution Price & Impact**
```typescript
const executionPriceQ18 = computeExecutionPriceQ18(amountIn, amountOut...)
const priceImpactBps = computePriceImpactBps(midPriceQ18, amountIn, amountOut...)
```
*   This uses the same logic as V2.
*   **Impact** = Difference between the "Current Tick Price" vs the "Final Price average" after you crossed 5 ticks.

---

## 3. Summary vs V2

| Feature | Uniswap V2 | Uniswap V3 |
| :--- | :--- | :--- |
| **AmountOut** | Calculated locally (`x*y=k`) | **Simulated on-chain** (Quoter Contract) |
| **Input Data** | Reserves (`100 ETH, 300000 USDC`) | `sqrtPriceX96` & `Liquidity` |
| **Speed** | Instant (Microseconds) | Slow (Network Request ~200ms) |
| **SDK Role** | Used for EVERYTHING | Used only for **Mid Price** calculation |

---

## 4. Key Takeaways
1.  **Don't try to math V3 manually.** The formula involves square roots and crossing ticks. You will fail.
2.  **Trust the Quoter.** The Quoter tells you exactly what the Router will do.
3.  **`sqrtPriceLimitX96: 0`** means "Let the trade happen regardless of slippage". In production, we assume the router handles slippage protection (Deadlines/MinOutput), but for quoting, we want the raw potential output.

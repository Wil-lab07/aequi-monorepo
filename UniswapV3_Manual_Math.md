# Uniswap V3 Manual Math (No SDK)

So you are on a testnet, the SDK is broken, but you still have:
1.  **The Quoter Contract** (for `AmountOut`).
2.  **The Pool Contract** (for `sqrtPriceX96`).

Here is how you calculate the metrics (Mid Price, Impact) manually.

## 1. The Raw Data

You need to read 2 things from the blockchain:

```javascript
// 1. Get Simulation Result
const amountOut = await quoter.callStatic.quoteExactInputSingle(tokenIn, tokenOut, amountIn, fee, 0);

// 2. Get Current State
const slot0 = await pool.slot0();
const sqrtPriceX96 = slot0.sqrtPriceX96;
```

---

## 2. Calculating Mid Price (The Hard Part)

The SDK hides this scary formula:
$$
Price = \frac{sqrtPriceX96^2}{2^{192}}
$$

**The Javascript Implementation:**

```javascript
function getV3MidPrice(sqrtPriceX96, inDecimals, outDecimals) {
    const Q96 = 2n ** 96n;
    const Q192 = 2n ** 192n;
    const Q18 = 1000000000000000000n; // Scaling factor for display

    // 1. Calculate PriceX96 (squared)
    // Formula: Price = (sqrtPrice / Q96) ^ 2
    // We do: (sqrtPrice * sqrtPrice * Q18) / Q192 to keep precision
    const priceX96 = (BigInt(sqrtPriceX96) * BigInt(sqrtPriceX96));
    
    // 2. Adjust for Decimals (The confusing part)
    // If Token0 is 6 decimals and Token1 is 18 decimals, the raw price is tiny.
    const inScale = 10n ** BigInt(inDecimals);
    const outScale = 10n ** BigInt(outDecimals);
    
    // We want price of TokenIn in terms of TokenOut.
    // Price = (priceX96 * inScale) / (outScale * Q192)
    // But we multiply by Q18 at the end for our "Q18" standard format.
    
    // Let's do it safely:
    const numerator = priceX96 * inScale * Q18;
    const denominator = Q192 * outScale;
    
    const midPriceQ18 = numerator / denominator;
    
    return midPriceQ18;
}
```

---

## 3. Calculating Execution Price & Impact (Same as V2)

Once you have `AmountOut` (from Quoter) and `MidPrice` (from step 2), the rest is identical to V2.

```javascript
function getV3Metrics(amountIn, amountOut, midPriceQ18) {
    const Q18 = 1000000000000000000n;
    
    // Execution Price
    const execPriceQ18 = (amountOut * Q18) / amountIn;
    
    // Price Impact
    const idealOut = (amountIn * midPriceQ18) / Q18;
    const shortfall = idealOut - amountOut;
    const impactBps = (shortfall * 10000n) / idealOut;
    
    return { execPriceQ18, impactBps };
}
```

---

## 4. Summary: The Workflow

1.  **Call Quoter**: Get `amountOut`. (No math needed, just trust the node).
2.  **Call Pool**: Get `sqrtPriceX96`.
3.  **Run Math**: Use the function above to convert `sqrtPriceX96` -> `MidPrice`.
4.  **Compare**: MidPrice vs (AmountOut / AmountIn) = Price Impact.

**Done.** No SDK required. Just raw BigInt math.

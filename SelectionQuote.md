# Quote Selection & Ranking

## How do we pick the winner?

After we fetch all possible **Direct Quotes** and **Multi-Hop Quotes**, we put them all into a single list of `candidates`.

```typescript
// Merge all options
const candidates = [...directQuotes, ...multiHopQuotes]
```

Then, we sort this list using a strict **Ranking System** (`compareQuotes`) to find the single best route.

---

## The Ranking Logic (Step-by-Step)

The sorting function evaluates two quotes (`Quote A` vs `Quote B`) based on **4 criteria**, in strict order of importance. As soon as a winner is found in a step, the comparison stops.

### 1. Primary Check: Highest `AmountOut`
**"Who gives me the most tokens?"**
This is the **most important factor**.
*   If **Quote A** gives `1000 USDC` and **Quote B** gives `999 USDC`, **Quote A wins immediately**.
*   We do *not* look at gas, liquidity, or slippage here. **Raw output is King.**

### 2. Secondary Check: Best "Net Output" (Tie-Breaker)
**"Who is cheaper after gas?"**
*   *Condition*: Only checked if `AmountOut` is **exactly identical** (e.g., same path, different gas estimate).
*   **Formula**: `Net = AmountOut - EstimatedGasCost`
*   The route with the higher *Net Value* wins.

### 3. Tertiary Check: Liquidity Score (Tie-Breaker)
**"Which pool is bigger?"**
*   *Condition*: Only checked if Amounts and Gas allow for a tie.
*   We prefer the route with **High Liquidity**.
*   *Why?* Deeper pools are more stable and less likely to fail transaction execution.

### 4. Final Check: Price Impact (Tie-Breaker)
**"Which one moves the market less?"**
*   *Condition*: Only checked if everything else is equal.
*   We pick the one with lower **Price Impact** (Slippage) to protect the user.

---

## Code Deep Dive (`compareQuotes`)

Here is exactly what the code does, line-by-line:

```typescript
export const compareQuotes = (a: PriceQuote, b: PriceQuote) => {
  // 1. PRIMARY: RAW AMOUNT
  // If Quote A gives 1000 and B gives 999, A wins.
  // We ignore gas here because raw value is the most important metric.
  if (a.amountOut !== b.amountOut) {
    return a.amountOut > b.amountOut ? -1 : 1
  }
  
  // 2. SECONDARY: NET OUTPUT (After Gas)
  // Logic: (AmountOut - EstGasCost). 
  // If A and B both give 1000 tokens, but A costs $1 gas and B costs $5 gas, A wins.
  const aNetOut = a.estimatedGasCostWei ? a.amountOut - a.estimatedGasCostWei : a.amountOut
  const bNetOut = b.estimatedGasCostWei ? b.amountOut - b.estimatedGasCostWei : b.amountOut
  if (aNetOut !== bNetOut) {
    return aNetOut > bNetOut ? -1 : 1
  }
  
  // 3. TERTIARY: LIQUIDITY
  // If amounts and gas are equal, pick the pool with deeper liquidity.
  // Deeper pool = Less chance of transaction failing.
  if (a.liquidityScore !== b.liquidityScore) {
    return a.liquidityScore > b.liquidityScore ? -1 : 1
  }
  
  // 4. FINAL: PRICE IMPACT
  // If everything else is mostly equal, pick the one with less slippage.
  return a.priceImpactBps <= b.priceImpactBps ? -1 : 1
}
```

---

## The Result (Winner & Losers)

Once sorted:
1.  **The Winner**: The top result (#1) becomes the detailed `best` quote returned to the user.
2.  **The Offers**: The remaining (losing) quotes are attached to the winner as `best.offers`.

**Why keep the losers?**
This allows the Frontend to display an **"Alternative Routes"** list (e.g., "Save Gas" vs "Max Return"), giving the user full transparency.

```typescript
// route-planner.ts
const remaining = candidates.filter((quote) => quote !== best).sort(compareQuotes)
if (remaining.length) {
  // Attach alternatives to the main quote
  best.offers = remaining 
}
```

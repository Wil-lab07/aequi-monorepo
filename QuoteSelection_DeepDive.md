# Quote Selection Deep Dive (The Battle Royale)

You asked: *"How do we pick the winner?"*
This is the logic inside `selectBestQuote` and `compareQuotes`.

## 1. The Arena (`compareQuotes`)

This function compares two quotes ("A" vs "B") and decides which one is better.
It uses a **Ranking Hierarchy**. It only moves to the next rule if there is a **TIE**.

### Rule #1: The Greedy King (Raw Amount Out)
```typescript
if (a.amountOut !== b.amountOut) {
  return a.amountOut > b.amountOut ? -1 : 1
}
```
*   **Logic**: Whoever gives MORE tokens wins immediately.
*   **The Trap**: This logic ignores gas costs!
    *   Quote A: Acc gives 100 USDC. Gas fees: $50. (Net: $50)
    *   Quote B: Acc gives 99 USDC. Gas fees: $1. (Net: $98)
    *   **Winner**: Quote A wins because `100 > 99`.
*   *Note: This is a "Naive" or "Greedy" Sort. Ideally, we should check Net Value first.*

### Rule #2: The Tie-Breaker (Gas Cost)
```typescript
const aNetOut = a.amountOut - a.estimatedGasCostWei
const bNetOut = b.amountOut - b.estimatedGasCostWei
if (aNetOut !== bNetOut) {
  return aNetOut > bNetOut ? -1 : 1
}
```
*   **Logic**: If (and ONLY if) both quotes give the *exact same* tokens (down to the wei), then we pick the cheaper transaction.
*   *Real World*: This rarely happens for different pools. It mostly happens if two routes are identical.

### Rule #3: Stability (Liquidity)
```typescript
if (a.liquidityScore !== b.liquidityScore) {
  return a.liquidityScore > b.liquidityScore ? -1 : 1
}
```
*   **Logic**: Deep pools are safer than shallow pools. If amounts are equal, pick the whale pool.

### Rule #4: Safety (Price Impact)
*   **Logic**: If everything else is equal, pick the one with less slippage risk.

---

## 2. Example Battle

**Contestants:**
1.  **Uniswap V3** (`a`):
    *   AmountOut: `1000`
    *   Gas: `50`
2.  **Pancake V2** (`b`):
    *   AmountOut: `990`
    *   Gas: `5`

**Execution:**
1.  **Check Rule #1 (AmountOut)**:
    *   `1000` vs `990`.
    *   `1000` is bigger.
    *   **Result**: Uniswap V3 Wins instantly. (Return `-1`).

**Contestants (The Tie Scenario):**
1.  **Uniswap V2** (`a`):
    *   AmountOut: `1000`
    *   Gas: `30`
2.  **SushiSwap V2** (`b`):
    *   AmountOut: `1000`
    *   Gas: `40`

**Execution:**
1.  **Check Rule #1**: `1000 === 1000`. It's a TIE. Go to next rule.
2.  **Check Rule #2 (Net Out)**:
    *   A: `1000 - 30 = 970`
    *   B: `1000 - 40 = 960`
    *   `970 > 960`.
    *   **Result**: Uniswap V2 Wins.

---

## 3. Summary
The current logic is **"Max Output First"**.
It effectively ignores gas costs unless two quotes are identical.

If you want to optimize for "Net Value" (getting the most money in your pocket), you should swap Rule #1 and Rule #2!

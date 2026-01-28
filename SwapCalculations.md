# The "Magic Math" Explained 🧮

You asked about two specific pieces of logic. Let's break them down with a scenario.

## Scenario: The "Shrinking" Trade 📉

**Quote says**: 1000 USDC -> 2000 USDT.
*   `quotedHopAmountIn` = 1000.
*   `hopExpectedOut` = 2000.

But... we applied a **Buffer** (Safety Margin).
So we are only going to *promise* the DEX **990 USDC**.
`hopAmountIn` = 990.

---

## 1. `scaledHopExpectedOut` (The Proportional Promise)

```typescript
const scaledHopExpectedOut = (hopExpectedOut * hopAmountIn) / quotedHopAmountIn
```

**The Logic**:
"If 1000 USDC gives me 2000 USDT...
Then 990 USDC should give me **X** USDT."

**The Math**:
`X = (2000 * 990) / 1000`
`X = 1980 USDT`.

**Why do we need this?**
Because this `1980` becomes the **Input Amount** for the *next* hop (e.g. USDT -> Bitcoin).
We cannot tell the next hop to expect 2000, because we effectively "reduced" the input of the current hop. We must propagate that reduction forward.

---

## 2. `tokensToFlush` (The Clean Up Crew) 🧹

```typescript
if (hopRecipient === executorAddress) {
  tokensToFlush.add(tokenOut.address)
}
```

**The Logic**:
The Executor Contract is a robot. It holds money temporarily.
1.  It receives 990 USDC.
2.  It swaps for USDT.
3.  It now holds **1985 USDT** (Maybe slightly better than 1980!).

If we do nothing, that 1985 USDT sits in the contract **forever**. The User loses it.

**The Solution**:
We add `USDT` to a list: `tokensToFlush`.
At the very end of the transaction, the Executor runs a loop:
> "Do I have any USDT? Yes, 1985. **Send ALL of it to the User.**"

This ensures:
1.  **Dust is returned**: User gets every 0.000001 wei back.
2.  **Profit is returned**: If the swap was better than expected, User gets the profit.
3.  **Safety**: No funds ever get stuck in the Executor.

---

## 3. `hopMinOut` (The Slippage Guard) 🛡️

You asked: *"Why isn't `scaledHopExpectedOut` enough? Why calculate `hopMinOut`?"*

**Because `scaledHopExpectedOut` is the BEST CASE scenario.**
It is the Target (3000 USDC).

**The Reality**:
If you check the price at 12:00:00, and execute at 12:00:15, the price *might* be 2999.
If you tell Uniswap: *"Give me exactly 3000 or revert"*... **IT WILL REVERT.** 💥

**So `hopMinOut` says:**
*"I am AIMING for 3000 (`scaledHopExpectedOut`), but I will ACCEPT 2990 (`hopMinOut`)."*

### How we calculate it (The Logic)
We distribute the **Total Slippage** (e.g. 1% total) across the hops.

**Example**:
*   Global Goal: 1 WETH -> 2999 USDT (with 1% slippage = Min 2970 USDT).
*   **Hop 1 (WETH -> USDC)**:
    *   Expected: 3000 USDC.
    *   **MinOut**: If this is just an intermediate step, maybe we enforce 0.5% here? Or calculate proportional min?
    *   Result: `2985 USDC`.

We send `2985` to Uniswap. So if we get `2992`, it SUCCEEDS.
If we sent `3000`, it would FAIL.

**HopMinOut = "Don't Fail if we miss by a tiny bit."**

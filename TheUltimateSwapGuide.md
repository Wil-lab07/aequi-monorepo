# The Unified Swap Builder Guide 📘

**Scenario**: Swap **1 WETH** -> **USDT**.
**Route**: `WETH -> USDC -> USDT`.
**Market Data**:
1.  `WETH -> USDC`: 1.0 -> 3000.0
2.  `USDC -> USDT`: 3000.0 -> 2999.0

---

## Part 1: Initialization (Lines 130-174)

### 1. `resolveExecutor`
*   **Code**: `const executor = ...`
*   **Data**: `0xExecutor` (Our Smart Contract).

### 2. `pulls` (The Funding)
*   **Code**: `pulls.push({ token: WETH, amount: 1.0 })`
*   **Reason**: The Executor needs money to work.
*   **Data**: `[{ token: 0xWETH, amount: 1.0 }]`.

### 3. `tokensToFlush` (The Safety Net) 🧹
*   **Code**: `tokensToFlush.add(WETH)`
*   **Reason**: **CRITICAL**. If the swap FAILS after pulling money, or if we don't spend it all, we must return the WETH to the user.
*   **Data**: `tokensToFlush = { WETH }`.

---

## Part 2: Loop Iteration 1 (WETH -> USDC)

### 1. `hopAmountIn` Calculation
*   **Code**: `hopAmountIn = quotedHopAmountIn`
*   **Data**: `1.0 WETH`.
*   **Reason**: Usually we buffer, but this is the **First Hop**. We have exactly 1.0 WETH from the user. We can't buffer it (we use it all).

### 2. `hopRecipient` & `scaledHopExpectedOut`
*   **Code**: `hopRecipient = (isLastHop) ? recipient : executorAddress`
*   **Data**: `0xExecutor`.
*   **Reason**: This is Hop 1 of 2. It is NOT the last hop. So the USDC must come back to the Executor for the next step.
*   **Code**: `scaledHopExpectedOut = ...`
*   **Data**: `3000 USDC`. (1.0 * 3000 / 1.0).
*   **Reason**: This updates our expected "wallet balance" for the next loop iteration.

### 3. `hopMinOut` (The Slippage Guard)
*   **Code**: `deriveHopMinOut(...)`
*   **The Math** (Proportional Distribution):
    *   Global Slippage is defined by `totalMinOut` (set at start).
    *   Formula: `(HopExpected * TotalMin) / TotalExpected`.
    *   Example: `(3000 * 2970) / 3000` = **2970**.
    *   **Result**: It effectively applies result of the **0.5% Global Slippage** to this specific hop.
*   **Data**: `2970 USDC` (assuming 1% global slippage for example).
*   **Reason**: If we tell Uniswap "Give me 3000", it fails if price moves to 2999. We say "Give me at least 2970".

### 4. `approvals` (Permission)
*   **Code**: `approvalAmount = isIntermediateHop ? MaxUint256 : hopAmountIn`
*   **Logic**: "Is this a later hop? No. So authorize EXACT amount."
*   **Data**: `approve(UniswapV3, 1.0 WETH)`.
*   **Reason**: For the first hop, we want strict security. Approve exactly what we use.

### 5. `swapCallData` (The Instruction)
*   **Code**: `encodeV3...`
*   **Data**: `0x... (Function: exactInputSingle, AmountIn: 1.0, MinOut: 2970)`

### 6. Injection Check (The Runtime Patch)
*   **Result**: FALSE.

---

## 📸 Snapshot: End of Loop 1 (WETH -> USDC)

After running the code for the first time, here is exactly what the data looks like:

**1. `executorCalls` (List of Instructions)**
```json
[
  {
    "target": "0xUniswapV3Router",
    "value": 0,
    "data": "0x...exactInputSingle(1.0, 2970...)",
    "injectToken": "0x0000...0000",
    "injectOffset": 0
  }
]
```

**2. `tokensToFlush` (Safety List)**
```json
{
  "0xWETH",  // Added at Init. (Loop 1 adds it again, but Sets ignore duplicates).
  "0xUSDC"   // Added in Loop 1 (because it is the OUTPUT).
}
```
*   **Why USDC?**: Because `hopRecipient == executorAddress`. The Executor receives the USDC, so it must remember to flush it later.
*   **Why not 3 WETHs?**: `tokensToFlush` is a **Set**. It only allows unique values.

**3. `availableAmount` (Rolling Balance)**
```typescript
availableAmount = 3000 USDC
```
*(This 3000 becomes the input for the Next Loop).*

---

## Part 3: Loop Iteration 2 (USDC -> USDT)

### 1. `hopAmountIn` (The Buffer) 🛡️
*   **Quote says**: Input should be `3000 USDC`.
*   **Code**: `buffer = 3000 * 0.003 (0.3%) = 9 USDC`.
*   **Calculation**: `3000 - 9 = 2991`.
*   **Data**: `2991 USDC`.
*   **Reason**: Hop 1 might only give us `2999.9`. If we ask to swap `3000`, we fail. We effectively "promise less" (`2991`) to stay safe.

### 2. `scaledHopExpectedOut` (The Ratio)
*   **Code**: `(Expected2999 * SafeInput2991) / QuoteInput3000`
*   **Data**: `2990 USDT`.
*   **Reason**: If we put in less (2991 vs 3000), we should expect proportionately less out.

### 3. `hopMinOut` (Floor) with Proportional Math
*   **Formula**: `(ScaledExpected * GlobalMin) / GlobalTotal`
*   **Math**: `2990 * (2970 / 3000)` = `2990 * 0.99` = **2960.1**.
*   **Data**: `2960 USDT`.
*   **Reason**: We expect 2990. We apply the same 1% slippage ratio as the global trade. So we accept 2960.

### 4. `swapCallData` (The Instruction)
*   **Code**: `encodeV2...`
*   **Data**: `0x... (Function: swap, AmountIn: 2991, MinOut: 2960)`
*   **NOTE**: This instruction says "Swap 2991". But wait...

### 5. Injection Logic (The Fix) 💉
*   **Is it Cheating?**: **NO**. It is Optimization.
*   **The Scenario**:
    1.  **Plan A (Safe)**: We tell the contract "Expect 2991". (This ensures we don't accidentally ask for more than we have).
    2.  **Reality**: The contract receives **2999.9**.
    3.  **The Choice**:
        *   Option A (No Injection): Swap 2991. The 8.9 leftovers sit unused.
        *   Option B (Injection): Swap **ALL 2999.9**.
    4.  **Result**: We choose Option B. We use the *Real Balance* to maximize the user's output.

**Why calculate 2991 at all then?**
To pass the safety checks (like `hopMinOut` derivation) and set approvals correctly. It is the "Conservative Baseline". Injection is the "Runtime Upgrade".

### 6. The Final Check: "Did we win?" 🏆
*   **The Floor**: We told the contract "Accept anything above **2960**".
*   **The Injection Effect**:
    *   Since we injected **2999** (instead of 2991), the actual output is higher.
    *   Output: **~2995 USDT**.
*   **The Logic Check**:
    *   Is `2995 > 2960`? **YES**.
*   **Result**: Transformation Complete. User gets **2995** (Rich!) instead of **2960**.

---

## Part 4: Cleanup (Line 283)

### `tokensToFlush`
*   **Code**: `tokensToFlush.add(USDT)`
*   **Reason**: After Hop 2, the Executor holds ~2990 USDT.
*   **Action**: "Send ALL of it to the User."

---

## Part 5: "Why vs Why" (The Confusion Clearer) 💡

You asked: *"MinOut prevents failure. How about Inject?"*

They solve **Two Different Problems**.

| Feature | Problem Solved | Example Scenario |
| :--- | :--- | :--- |
| **MinOut** (Output) | **Bad Price** 📉 | I expected 3000. Market crashed to 2500. **MinOut REVERTS** the trade to save me from losing value. |
| **Injection** (Input) | **Insufficient Funds** 💸 | Hop 1 output 2999. Hop 2 tried to spend 3000. **Injection FIXES** the input to 2999 so the trade *doesn't* revert. |

---

## Part 6: The "Prediction vs Reality" Gap Use Case 🔮

**You asked:** *"10 Token B is already slippage in priceQuote right??"*

**NO. It is just a Prediction.**
When the API gives you a Quote: "1 A -> 10 B", it is guessing the future based on **Current Time (T=0)**.

**15 Seconds Later... (T=15)**
The transaction executes on-chain.
*   Someone else traded before you.
*   The pool reserves changed.
*   **Result**: You actually get **9.999 B**.

**If you hardcoded "Swap 10 B":**
The Execution says: "You want to swap 10, but have 9.999." -> **REVERT 💥**.

**If you use INJECTION:**
The Execution says: "You want to swap [Dynamic]. I see you have 9.999. Okay, I'll swap 9.999." -> **SUCCESS ✅**.

**Injection turns a Guess into a Fact.**

1.  **User** sends 1.0 WETH.
2.  **Executor** swaps 1.0 WETH -> ~3000 USDC.
3.  **Executor** checks balance (finds 3000).
4.  **Executor** overwrites Hop 2 Call (changes `2991` -> `3000`).
5.  **Executor** swaps 3000 USDC -> ~2999 USDT.
6.  **Executor** flushes 2999 USDT to User.

This architecture handles **Unknowns** (Prices) safely using **Estimates** (Buffers) and **Runtime Patches** (Injection).

---

## Part 7: The Final Package 📦 (Realistic & Complete)

You asked: *"What is the final object? Make it real."*

Here is the **exact JSON** the Server returns for `WETH -> USDC -> USDT`.

```json
{
  "kind": "executor",
  "dexId": "multi",
  "router": "0xExecutorAddress.....................", 
  "spender": "0xExecutorAddress.....................",
  
  // 1. The Financials 💰
  "amountIn": "1000000000000000000",   // 1.0 WETH (18 decimals)
  "amountOut": "2999000000",           // 2999 USDT (6 decimals)
  "amountOutMinimum": "2960000000",    // 2960 USDT (Slippage Floor)
  "deadline": 1735689600,              // Future Timestamp

  // 2. The Payload (What MetaMask Signs) ✍️
  // This is the ONLY thing sent to the blockchain.
  "call": {
    "to": "0xExecutorAddress.....................",
    "value": "0",  // 0 ETH (Because we are swapping WETH)
    "data": "0x00...[HUGE_HEX_STRING]...00" // Contains ALL instructions below encoded
  },

  // 3. The Execution Logic (Decoded for You) 🧠
  // The Frontend uses this to explain the steps to the user.
  "executor": {
    // A. Pull Money
    "pulls": [
      { "token": "0xC02aa...WETH", "amount": "1000000000000000000" }
    ],
    
    // B. Approve Routers
    "approvals": [
      { 
        "token": "0xC02aa...WETH", 
        "spender": "0xE5924...UniswapV3Router", 
        "amount": "1000000000000000000" // Exact 1.0
      },
      { 
        "token": "0xA0b86...USDC", 
        "spender": "0x10ED4...PancakeRouter", 
        "amount": "115792089237316195423570985008687907853269984665640564039457584007913129639935" // MaxUint256
      }
    ],

    // C. The Swaps (Internal Script)
    "calls": [
      {
        "target": "0xE5924...UniswapV3Router",
        "data": "0x...exactInputSingle(1.0 WETH -> USDC)...",
        "injectToken": "0x0000000000000000000000000000000000000000", // No Injection
        "injectOffset": 0
      },
      {
        "target": "0x10ED4...PancakeRouter",
        "data": "0x...swapExactTokens(2991 USDC -> USDT)...", // Note: 2991 placeholder
        "injectToken": "0xA0b86...USDC", // <--- INJECTION!
        "injectOffset": 4
      }
    ],

    // D. The Flush (Safety)
    "tokensToFlush": [
      "0xC02aa...WETH",
      "0xA0b86...USDC",
      "0xdAC17...USDT"
    ]
  },

  // 4. Trace Info (For Simulation)
  "calls": [
    { "target": "0xE5924...UniswapV3Router", "allowFailure": false, "callData": "..." },
    { "target": "0x10ED4...PancakeRouter", "allowFailure": false, "callData": "..." }
  ]
}
```

**The Frontend Logic:**
1.  Receive this Object.
2.  Send `call` to Wallet: `wallet.sendTransaction(call)`.
3.  Done. 🚀

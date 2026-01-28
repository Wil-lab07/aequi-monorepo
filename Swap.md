# Swap Builder Walkthrough based on `packages/core/src/swap-builder.ts`

Don't panic! It looks scary, but it's just a **Recipe Maker**.
The `SwapBuilder` doesn't *execute* anything. It just writes a list of instructions for the Smart Contract (Executor) to follow.

---

## 1. The Entry Point: `build()`

```typescript
const transaction = swapBuilder.build(chain, { ...inputs })
```

**What it does:**
1.  **Calculates Deadlines**: "If this transaction takes longer than 3 minutes, fail." (Safety).
2.  **Calculates Minimum Output**: "If I don't get at least 99.5 USDC, revert." (Slippage protection).
3.  **Hands off to the real worker**: Calls `buildExecutorSwap`.

---

## 2. The Core Logic: `buildExecutorSwap()`

This function constructs the `SwapTransaction` object. Think of it as building a "Shopping List" for the Executor contract.

### Step A: Pulling Tokens (The "Funding" Step)
The Executor needs money to work with.

```typescript
// If we are swapping ERC20 (not ETH)...
if (!useNativeInput) {
  // Add instruction: "Pull 100 WETH from User to Me (Executor)"
  pulls.push({ token: inputToken.address, amount: quote.amountIn })
}
```

### Step B: The Loop (Hop-by-Hop)
We iterate through every step in the route (e.g., `WETH -> USDC` or `WETH -> DAI -> USDC`).

For each step (`index`), we do 3 things:

#### 1. Approvals
Before the Executor can ask Uniswap to swap, it must approve Uniswap.
```typescript
approvals.push({
  token: tokenIn.address,       // e.g., WETH
  spender: dex.routerAddress,   // e.g., Uniswap V3 Router
  amount: approvalAmount,       // e.g., 100 WETH
  revokeAfter: true,            // Safety: Remove approval after done
})
```

#### 2. Constructing the Call (The "Recipe")
We prepare the data for the specific DEX (V2 or V3).
```typescript
const swapCallData = hopVersion === 'v2'
  ? this.encodeV2SingleHopCall(...) // swapExactTokensForTokens(...)
  : this.encodeV3SingleHopCall(...) // exactInputSingle(...)
```

#### 3. Dynamic Injection (The "Hard" Part made Simple) 🧠
**Problem**: In a multi-hop swap (`A -> B -> C`), we don't know *exactly* how much `B` we will get from the first step until the transaction actually runs on-chain.
**Solution**: We tell the Executor: *"Before you run Step 2, check your balance of Token B, and write that number into the 'amountIn' field of the function call."*

```typescript
// Is this the 2nd or 3rd hop?
const isInjectionNeeded = index > 0 

// If yes, tell Executor to read balance of Token In
const injectToken = isInjectionNeeded ? tokenIn.address : address(0)

// Where in the hex data should we write the number?
// V2 uses offset 4 (after function signature). V3 is deeper (offset 132 or 164).
let injectOffset = ... 
```

### Step C: Flushing (The "Cash Out" Step)
After all swaps are done, the Executor might have the final token (e.g., `USDC`) sitting in its wallet. It needs to send it to the User.

```typescript
// If the money came back to Executor, add it to list of tokens to flush
if (hopRecipient === executorAddress) {
  tokensToFlush.add(tokenOut.address)
}
```

---

## 4. Deep Dive: The confusing headers explained 🤯

You asked about `deadline`, `slippage`, and `amountOutMin`. Here is the plain English explanation:

### A. Why `deadlineSeconds`? (The Ticking Time Bomb ⏰)
Imagine you send a transaction to buy ETH at $2000.
But gas is low, so your transaction gets stuck in the "Pending" pool for **3 days**.
By the time it runs, ETH is $1000. You don't want to buy it at $2000 anymore!

**The Deadline** protects you.
`deadline = Date.now() + 180 seconds`
"If this transaction doesn't confirm in 3 minutes, CANCEL IT."

### B. What is `boundedSlippage`? (The Safety Belt 🛡️)
Slippage is "Price Movement".
If you say "I accept 0.5% slippage", it means: "If I was promised 100 tokens, I am okay receiving 99.5".

**Clamping (`clampSlippage`)**:
Users make mistakes. If a user types `100%` slippage, the code says "No, that's dangerous. Max is 10%". It keeps the value effectively bounded so users don't get wrecked.

### C. Why calculate `amountOutMin` AGAIN? 🧮

You saw this code:
```typescript
const amountOutMinimum = params.amountOutMin > 0n
  ? params.amountOutMin
  : this.applySlippage(params.quote.amountOut, boundedSlippage)
```

**Why**:
1.  **Safety First**: The Backend calculates the *theoretical* `amountOut` (e.g., 1000).
2.  **The Law**: The Blockchain (`Executor`) needs a HARD number. It doesn't know percentages. It needs to know: "Revert if output < X".
3.  **The Math**:
    *   Quote: 1000
    *   Slippage: 1%
    *   **Result**: `1000 - (1% of 1000) = 990`.
    *   We send `990` to the blockchain. If the chain produces 989, it REVERTS.

We calculate it here because **this is the final moment** before we convert intention into immutable Blockchain Data.

---

## 5. The Final Package

The function wraps all these lists (`pulls`, `approvals`, `calls`, `tokensToFlush`) into one big encoded function call:

```typescript
const executorData = encodeFunctionData({
  abi: AEQUI_EXECUTOR_ABI,
  functionName: 'execute', // <--- Matches Executor.sol function
  args: [
    pulls,
    approvals,
    executorCalls,
    Array.from(tokensToFlush),
  ],
})
```

This `executorData` is exactly what the User signs in MetaMask.
User -> Calls `Executor.execute(...)` -> Executor runs the script -> User gets money.

---

## 6. The Frontend Lifecycle (Addressing "Inconsistency" Fear) 😰

You asked: *"Won't the price change between Quote and Swap? Is it inconsistent?"*

**Yes, it changes. And that is exactly how 1inch works.**

### The Standard Flow:
1.  **User Types**: `1 WETH -> USDC`.
2.  **Frontend**: Calls `/quote`.
    *   **Display**: "You will get **~2000 USDC**".
    *   This is just a *picture* of the market at `12:00:00`.
3.  **User Reviews & Clicks Swap**: (Time passed: 5 seconds. It is now `12:00:05`).
4.  **Frontend**: Calls `/swap` with settings (e.g., 0.5% Slippage).
5.  **Backend**:
    *   **Refetches**: Checks the market *right now*.
    *   **New Price**: It finds the price is actually **1999 USDC**.
    *   **The Check**: Is 1999 within 0.5% of the original? **YES**.
    *   **Action**: Builds the transaction for 1999 USDC, but sets `amountOutMin = 1989` (Safety Floor).
6.  **User Signs**: The transaction goes on chain.

### The "Price Shift" Scenario
If the price violently crashed to **1500 USDC** (outside your slippage range):
1.  The Backend (or Contract) sees the gap is > 0.5%.
2.  It **REVERTS** (`Error: Price updated/Slippage exceeded`).
3.  **UI**: Shows *"Price Updated. Please refresh quote."*

This system prevents the user from accidentally swapping at a terrible price. **Inconsistency is treated as an Error to protect the user.**

---

## 7. The "Price Guard" Check 🛡️ (How 1inch does it)

To make your aggregator safe, you must link `/quote` and `/swap`.

### The Vulnerable Flow (Current) ❌
1.  User sees Quote: **$2000**.
2.  Market Crashes -> Price is now **$1000**.
3.  User clicks Swap.
4.  Server `/swap`:
    *   Fetches fresh price: **$1000**.
    *   Calculates min output: **$990**.
    *   Builds transaction.
5.  **User signs and loses 50%.**

### The Safe Flow (1inch Style) ✅
1.  User sees Quote: **$2000**.
2.  Market Crashes -> Price is now **$1000**.
3.  User clicks Swap.
    *   **Frontend sends**: `{ token: "ETH", amount: "1", expectedOutput: "2000" }`
4.  Server `/swap`:
    *   Fetches fresh price: **$1000**.
    *   **THE CHECK**: `if (1000 < 2000 * 0.99) throw "Price Changed!"`
    *   **Server Reverts**.
5.  Frontend displays: **"Price updated. Please reload."**
6.  **User is SAFE.**

**Action Item**: Add `quotedAmountOut` to your `/swap` body schema to enable this check.
3.  **Calls**: Run the swaps (with Magic Injection for chain reactions).
4.  **Flush**: Send profit back to user.

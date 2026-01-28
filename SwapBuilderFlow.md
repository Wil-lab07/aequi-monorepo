# Swap Builder Master Trace 🧬

This document traces `buildExecutorSwap` line-by-line with a concrete example.

## The Scenario
*   **User Goal**: Swap **1 WETH** for **USDT**.
*   **Route**: `WETH -> USDC -> USDT` (Multi-hop).
*   **Quote**:
    *   Hop 1: `1 WETH -> 3000 USDC` (Uniswap V3)
    *   Hop 2: `3000 USDC -> 2999 USDT` (PancakeSwap V2)
*   **Configs**: `useNativeInput: false` (already WETH).

---

## Part 1: Setup & Pulls (Lines 130-147)

### Line 130: `resolveExecutor`
```typescript
const executorAddress = this.resolveExecutor(chain.key, chain.name)
```
*   **Result**: `0xExecutor123` (The address of our `Executor.sol` contract).

### Line 132-135: Validation
```typescript
const inputToken = quote.path[0]
if (!inputToken) throw Error(...)
```
*   **Data**: `inputToken` is WETH.

### Line 137-140: Create Pull Inputs
```typescript
const pulls: { token: Address; amount: bigint }[] = []
if (!useNativeInput) {
  pulls.push({ token: inputToken.address, amount: quote.amountIn })
}
```
*   **Logic**: "Does the contract need to take money from User?"
*   **Result**: `pulls = [{ token: WETH, amount: 10^18 }]`.

### Line 144-147: Flush List
```typescript
const tokensToFlush = new Set<Address>()
if (!useNativeInput) tokensToFlush.add(inputToken.address)
```
*   **Logic**: "If swap fails, give the WETH back."
*   **Result**: `tokensToFlush = { WETH }`.

---

## Part 2: The Loop (Hop 1: WETH -> USDC)

*   `index` = 0
*   `availableAmount` = 1 WETH.

### Line 176-193: Validation
Checks that metadata exists. Finds DEX (Uniswap V3).

### Line 195-202: Input Amount Logic
```typescript
const quotedHopAmountIn = source.amountIn // 1 WETH
if (quotedHopAmountIn <= availableAmount) ...
```
*   **Result**: `hopAmountIn = 1 WETH`. (No buffer applied because `index = 0`).

### Line 217-219: Recipient Logic
```typescript
const isLastHop = index === quote.sources.length - 1 // FALSE
const hopRecipient = (isLastHop) ? recipient : executorAddress
```
*   **Logic**: "Is this the end? No. So send output (USDC) to Me (Executor)."
*   **Result**: `hopRecipient = 0xExecutor123`.

### Line 226-231: Min Output Calculation
```typescript
const hopMinOut = this.deriveHopMinOut(...)
```
*   **Logic**: Calculates strict output for this hop based on global slippage.
*   **Result**: `hopMinOut = 2970 USDC` (Assuming 1% slippage).

### Line 234-243: Approvals
```typescript
const approvalAmount = isIntermediateHop ? MaxUint256 : hopAmountIn
approvals.push({ token: WETH, spender: 0xUniswapV3Router, amount: 1 WETH ... })
```
*   **Logic**: "Allow Uniswap V3 to spend my 1 WETH."

### Line 245-248: Encoder
```typescript
const swapCallData = this.encodeV3SingleHopCall(...)
```
*   **Result**: `0x1234...` (Hex data calling `exactInputSingle`).

### Line 252-269: Injection Logic (The Critical Part)
```typescript
const isInjectionNeeded = index > 0 // FALSE (0 > 0 is False)
```
*   **Result**: `injectToken = address(0)`. (No injection needed for first step).

### Line 271-292: Store Call
*   **Action**: Pushes call to list.
*   **Update**: `availableAmount = 3000 USDC` (Output of Hop 1).

---

## Part 3: The Loop (Hop 2: USDC -> USDT)

*   `index` = 1
*   `availableAmount` = 3000 USDC.

### Line 206-211: Buffer Logic 🛡️ (Deep Dive)
```typescript
if (index > 0 && buffer > 0) { ... }
```

**Why do we have this?**
Because in a multi-hop swap (`A->B->C`), Step 1 (`A->B`) happens *on-chain execution time*.
The Quote said Step 1 would give **3000 Tokens**.
But due to slight price movement (slippage), it might only give **2999.9 Tokens**.

If we tell Step 2 to swap **3000** (exact), but we only have **2999.9**, the transaction **FAILS**.

**The `buffer`**:
We calculate a safety margin (e.g. 30 bps = 0.3%).
`3000 * 0.003 = 9 Tokens`.

**The Subtraction**:
`hopAmountIn = 3000 - 9 = 2991`.

We tell Step 2: *"Please swap **2991** tokens."*
Since we definitely have at least 2991 (likely 2999.9), the transaction succeeds.
The "Leftover" (2999.9 - 2991 = 8.9) is swept back to you at the end.

**Example Calculation**:
*   `interhopBufferBps` = 30 (default config).
*   `hopAmountIn` = 3000.
*   `buffer` = (3000 * 30) / 10000 = **9**.
*   New `hopAmountIn` = **2991**.

---

### Line 217-219: Recipient Logic
```typescript
approvals.push({ token: USDC, spender: 0xPancakeV2Router, amount: MaxUint256 ... })
```
*   **Logic**: "Allow PancakeSwap to spend infinite USDC (easier for intermediate)."

### Line 252: Injection Logic (The Magic) 🪄
```typescript
const isInjectionNeeded = index > 0 // TRUE (1 > 0)
const injectToken = tokenIn.address // USDC Address
let injectOffset = ... // 4 (for V2 swap)
```
*   **Logic**: "Before running this, verify actual USDC balance."

---

## Part 4: Final Assembly (Lines 320-330)

```typescript
const executorData = encodeFunctionData({
  functionName: 'execute',
  args: [pulls, approvals, executorCalls, tokensToFlush]
})
```
*   **Result**: A massive Hex string containing ALL the instructions above.
*   **Return**: Returns the object for the Frontend to send to MetaMask.

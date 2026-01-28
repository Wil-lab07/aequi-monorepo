# The Handoff: Server ➡️ Client 🤝

You asked: *"What happen in here? Why so many calculations?"*

This is the **Final Packaging**. We take the raw data and make it safe, readable, and executable for the user.

---

## 1. Gas Estimation (The "Safety Check") ⛽

```typescript
// Code:
estimatedGas = await client.estimateGas({ to, data, value })
estimatedGas = (estimatedGas * 120n) / 100n
```

*   **Why calculate it again?**:
    The `SwapBuilder` created the *Logic* (The Hex Data). But it didn't check *if it actually runs*.
    `estimateGas` runs a **Simulation** on the real blockchain.
    *   If this fails -> The Transaction is invalid (Revert). We catch it here before sending to user.
    *   If it succeeds -> It tells us how much gas it needs (e.g. 150,000 units).
*   **Why `* 120 / 100`?**:
    The simulation is perfect *right now*. But in 10 seconds, the network might be busier.
    We add **20% Extra** to guarantee the transaction doesn't run out of gas.

---

## 2. Timestamps (The "Expiration Date") ⏱️

```typescript
// Code:
const quoteTimestamp = Math.floor(Date.now() / 1000)      // NOW (e.g. 12:00:00)
const quoteExpiresAt = quoteTimestamp + SWAP_QUOTE_TTL_SECONDS // NOW + 30s (12:00:30)
```

*   **Why?**:
    The Price Quote (1 WETH = 3000 USDC) relies on the **Current Market**.
    In 1 minute, the price might be 2900.
    We set an **Expiration Date**.
    *   Frontend Logic: "If User hasn't clicked Swap by 12:00:30, disable the button."

---

## 3. Formatting (The "Human Readability") 👓

```typescript
// Code:
const amountOutMinFormatted = formatAmountFromUnits(amountOutMin, tokenOut.decimals)
```

*   **Raw Data**: `2960000000` (BigInt, hard for humans).
*   **Formatted**: `"2960.0"` (String, easy to read).
*   **Why?**: The Frontend needs to show "Min Received: 2960.0 USDC", not the raw number.

---

## 4. The Response Object (The "Parcel") 🎁

This is the final JSON. Note the string conversion.

```typescript
return {
    ...baseResponse,            // Basic info (Token Names, Symbols)
    amountOutMin: "2960000000", // For Logic (BigInt as String)
    amountOutMinFormatted: "2960.0", // For Display
    
    // TIMING
    quoteTimestamp: 1735000000,
    quoteExpiresAt: 1735000030, // 30 seconds later
    
    // TRANSACTION (The Execution)
    transaction: {
        amountIn: "1000000000000000000", // Stringified
        estimatedGas: "180000",          // 150k * 1.2 = 180k
        
        // The Payload for Wallet
        call: {
            to: "0xExecutor...",
            data: "0x[HexData]...",
            value: "0"
        }
    }
}
```

**Scenario**:
1.  **Server** simulates transaction. "It costs 150k gas."
2.  **Server** buffers it to 180k.
3.  **Server** stamps it: "Valid until 12:00:30."
4.  **Server** formats it: "Min Output is 2960.0."
5.  **Server** packages it all into JSON strings.
6.  **Frontend** receives it and shows the UI.

### Step B: The Trigger (User Action)
User clicks **"Swap"**.

### Step C: The Handover to Wallet 🦊
The Frontend code does this:

```typescript
// Frontend Code (React/Wagmi)
sendTransaction({
  to: response.transaction.call.to,       // 0xExecutor
  data: response.transaction.call.data,   // The Giant Hex String
  value: response.transaction.call.value  // 0 (or ETH value)
})
```

### Step D: Blockchain Execution
1.  MetaMask pops up.
2.  User signs.
3.  Transaction goes to Mempool -> Block -> Execution.
4.  **Executor runs the logic** (Pulls -> Swaps -> Injections -> Flushes).

**MISSION ACCOMPLISHED.** 🎉

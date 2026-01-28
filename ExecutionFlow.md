# Execution Flow: The "Script Writer" vs The "Actor" 🎭

You asked: *"Why are we calling `encodeFunctionData` here? Is this calling Uniswap directly?"*

**NO.** This code does NOT call Uniswap.
This code **Writes a Script** for your Smart Contract (`Executor.sol`) to read later.

## Analogy: The Restaurant Order 📝 vs The Chef 👨‍🍳

*   **You (The User)**: Hungry.
*   **The Backend (`swap-builder.ts`)**: The Waiter taking your order.
*   **The Executor (`Executor.sol`)**: The Head Chef.
*   **Uniswap/Pancake**: The Sous Chefs.

### Step 1: The Backend Writes the Order (Your Code)
When you run `encodeV2SingleHopCall`, the Backend writes a note:
> *"Tell the Pancake Chef to grill 1 Steak (Swap 1 BNB -> USDT)."*

It writes this note in a language the Chef understands (Hex Code / Calldata).
**Crucial:** The Backend does NOT cook the steak. It just writes the note.

```typescript
// This just creates a string like "0x1234..."
const note = encodeFunctionData({ ... })
```

### Step 2: The User Signs
The User signs the "Order Ticket" in MetaMask.

### Step 3: The Executor Reads the Order (On-Chain)
The transaction hits the blockchain. Your `Executor.sol` wakes up.
It reads the note ("0x1234..."):

1.  It sees: "Call PancakeSwap".
2.  It sees: "Data: Swap 1 BNB -> USDT".
3.  **Action:** The Executor *actually calls* PancakeSwap using the data you wrote.

```solidity
// Executor.sol
(bool success, ) = target.call(data); // <--- This is the ACTUAL call to Uniswap
```

---

## Why do we do this?
Because `Executor.sol` is **Generic**.
It doesn't know what "Uniswap" is. It doesn't know what "Pancake" is.
It just knows: *"I received a list of addresses and data. I will call them one by one."*

This makes your contract **Future-Proof**.
If "SuperSwap V4" comes out tomorrow, you just update your Backend code (`swap-builder.ts`) to write new notes. You don't need to re-deploy your contract!

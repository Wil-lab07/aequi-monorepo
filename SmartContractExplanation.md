# Deep Dive: AequiExecutor.sol

```json
{
  "chain": "bsc",
  "source": "uniswap-v3@3000 > uniswap-v3@100",
  "path": [
    "WBNB",
    "BUSD",
    "USDT"
  ],
  "tokens": [
    {
      "address": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "symbol": "WBNB",
      "name": "Wrapped BNB",
      "decimals": 18
    },
    {
      "address": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      "symbol": "BUSD",
      "name": "Binance USD",
      "decimals": 18
    },
    {
      "address": "0x55d398326f99059fF775485246999027B3197955",
      "symbol": "USDT",
      "name": "Tether USD",
      "decimals": 18
    }
  ],
  "routeAddresses": [
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    "0x55d398326f99059fF775485246999027B3197955"
  ],
  "priceQ18": "888256393418813809570",
  "midPriceQ18": "0",
  "executionPriceQ18": "888256393418813809570",
  "priceImpactBps": 33,
  "amountIn": "100000000000000",
  "amountInFormatted": "0.0001",
  "amountOut": "88825639341881381",
  "amountOutFormatted": "0.088825639341881381",
  "liquidityScore": "7632360360177795937",
  "estimatedGasUnits": "290000",
  "estimatedGasCostWei": "14500000000000",
  "gasPriceWei": "50000000",
  "hopVersions": [
    "v3",
    "v3"
  ],
  "routePreference": "auto",
  "pools": [
    {
      "dexId": "uniswap-v3",
      "poolAddress": "0x32776Ed4D96ED069a2d812773F0AD8aD9Ef83CF8",
      "feeTier": 3000
    },
    {
      "dexId": "uniswap-v3",
      "poolAddress": "0xC98f01bf2141E1140EF8F8caD99D4b021d10718f",
      "feeTier": 100
    }
  ],
  "sources": [
    {
      "dexId": "uniswap-v3",
      "poolAddress": "0x32776Ed4D96ED069a2d812773F0AD8aD9Ef83CF8",
      "feeTier": 3000,
      "amountIn": "100000000000000",
      "amountOut": "88748158060637031",
      "reserves": {
        "liquidity": "7632360360177795937",
        "token0": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        "token1": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
      }
    },
    {
      "dexId": "uniswap-v3",
      "poolAddress": "0xC98f01bf2141E1140EF8F8caD99D4b021d10718f",
      "feeTier": 100,
      "amountIn": "88748158060637031",
      "amountOut": "88825639341881381",
      "reserves": {
        "liquidity": "273647099498471434037071599",
        "token0": "0x55d398326f99059fF775485246999027B3197955",
        "token1": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
      }
    }
  ],
  "amountOutMin": "88381511145171975",
  "amountOutMinFormatted": "0.088381511145171975",
  "slippageBps": 50,
  "recipient": "0xCC519ae1c21Bbb83c4B9d08FF066BC263E9C1A7e",
  "deadline": 1769536638,
  "quoteTimestamp": 1769536038,
  "quoteExpiresAt": 1769536053,
  "quoteValidSeconds": 15,
  "quoteBlockNumber": "77757112",
  "quoteBlockTimestamp": 1769536038,
  "transaction": {
    "kind": "executor",
    "dexId": "multi",
    "router": "0x03cbBc27784c64FC4A6f11eFe8D1C3b4Dee204EA",
    "spender": "0x03cbBc27784c64FC4A6f11eFe8D1C3b4Dee204EA",
    "amountIn": "100000000000000",
    "amountOut": "88825639341881381",
    "amountOutMinimum": "88381511145171975",
    "deadline": 1769536638,
    "calls": [
      {
        "target": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
        "allowFailure": false,
        "callData": "0x04e45aaf000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000e9e7cea3dedca5984780bafc599bd69add087d560000000000000000000000000000000000000000000000000000000000000bb800000000000000000000000003cbbc27784c64fc4a6f11efe8d1c3b4dee204ea00000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000000000000000000000000000000139b8664f7f01960000000000000000000000000000000000000000000000000000000000000000",
        "value": "0"
      },
      {
        "target": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
        "allowFailure": false,
        "callData": "0x04e45aaf000000000000000000000000e9e7cea3dedca5984780bafc599bd69add087d5600000000000000000000000055d398326f99059ff775485246999027b31979550000000000000000000000000000000000000000000000000000000000000064000000000000000000000000cc519ae1c21bbb83c4b9d08ff066bc263e9c1a7e000000000000000000000000000000000000000000000000013afb43793d230a0000000000000000000000000000000000000000000000000139fe8420852c070000000000000000000000000000000000000000000000000000000000000000",
        "value": "0"
      }
    ],
    "call": {
      "to": "0x03cbBc27784c64FC4A6f11eFe8D1C3b4Dee204EA",
      "data": "0x05825102000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000006a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000b971ef87ede563556b2ed4b1c0b0019111dd85d200000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000e9e7cea3dedca5984780bafc599bd69add087d56000000000000000000000000b971ef87ede563556b2ed4b1c0b0019111dd85d2ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000300000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000000000000000000000000000000005af3107a400000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004d0e30db000000000000000000000000000000000000000000000000000000000000000000000000000000000b971ef87ede563556b2ed4b1c0b0019111dd85d2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000e9e7cea3dedca5984780bafc599bd69add087d560000000000000000000000000000000000000000000000000000000000000bb800000000000000000000000003cbbc27784c64fc4a6f11efe8d1c3b4dee204ea00000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000000000000000000000000000000139b8664f7f0196000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b971ef87ede563556b2ed4b1c0b0019111dd85d2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000e9e7cea3dedca5984780bafc599bd69add087d56000000000000000000000000000000000000000000000000000000000000008400000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000e9e7cea3dedca5984780bafc599bd69add087d5600000000000000000000000055d398326f99059ff775485246999027b31979550000000000000000000000000000000000000000000000000000000000000064000000000000000000000000cc519ae1c21bbb83c4b9d08ff066bc263e9c1a7e000000000000000000000000000000000000000000000000013afb43793d230a0000000000000000000000000000000000000000000000000139fe8420852c070000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000e9e7cea3dedca5984780bafc599bd69add087d56",
      "value": "100000000000000"
    },
    "executor": {
      "pulls": [],
      "approvals": [
        {
          "token": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "spender": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
          "amount": "100000000000000",
          "revokeAfter": true
        },
        {
          "token": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
          "spender": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
          "amount": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
          "revokeAfter": true
        }
      ],
      "calls": [
        {
          "target": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "value": "100000000000000",
          "data": "0xd0e30db0"
        },
        {
          "target": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
          "value": "0",
          "data": "0x04e45aaf000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000e9e7cea3dedca5984780bafc599bd69add087d560000000000000000000000000000000000000000000000000000000000000bb800000000000000000000000003cbbc27784c64fc4a6f11efe8d1c3b4dee204ea00000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000000000000000000000000000000139b8664f7f01960000000000000000000000000000000000000000000000000000000000000000"
        },
        {
          "target": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
          "value": "0",
          "data": "0x04e45aaf000000000000000000000000e9e7cea3dedca5984780bafc599bd69add087d5600000000000000000000000055d398326f99059ff775485246999027b31979550000000000000000000000000000000000000000000000000000000000000064000000000000000000000000cc519ae1c21bbb83c4b9d08ff066bc263e9c1a7e000000000000000000000000000000000000000000000000013afb43793d230a0000000000000000000000000000000000000000000000000139fe8420852c070000000000000000000000000000000000000000000000000000000000000000"
        }
      ],
      "tokensToFlush": [
        "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
      ]
    },
    "estimatedGas": "397824"
  }
}
```

This document explains exactly how our `AequiExecutor.sol` smart contract works, line-by-line, and traces your specific transaction example.

---

## 1. The Code Explained (Line by Line)

### Core Function: `execute`
This is the heart of the contract. It takes a "Recipe" (the JSON you saw) and cooks it on-chain.

```solidity
64: function execute(
65:     TokenPull[] calldata pulls,      // [Step 1] Get money from User
66:     Approval[] calldata approvals,   // [Step 2] Approve Routers to spend Money
67:     Call[] calldata calls,           // [Step 3] Run the Swaps (Interaction)
68:     address[] calldata tokensToFlush // [Step 4] Return leftovers to User
69: ) ...
```

### [Step 0] Snapshot Balances (Safety First)
Before doing anything, we check "How much money do I (the contract) *historically* have?"

```solidity
65: uint256 ethBalanceBefore = address(this).balance - msg.value; 
66: uint256[] memory tokenBalancesBefore = _snapshotBalances(tokensToFlush);
```

> **Concrete Example: 1 BNB + 2 BNB**
>
> Let's simulate it exactly as you asked.
>
> 1.  **State 0 (Morning):** The contract is sitting there. It has **1 BNB** (from fees or leftovers).
> 2.  **State 1 (Transaction Arrives):** You call `execute()` and send **2 BNB** (`msg.value`).
>     *   The EVM *instantly* adds your money.
>     *   `address(this).balance` is now **3 BNB** (1 + 2).
>
> **The Code Runs:**
> ```solidity
> uint256 ethBalanceBefore = address(this).balance - msg.value;
> // Math: 3 BNB - 2 BNB = 1 BNB
> ```
> *   **Result:** We correctly identify that the "Baseline" was 1 BNB.
>
> **Why is this critical? (The "Stealing" Bug)**
> Imagine if we **didn't** subtract:
> *   `ethBalanceBefore` would be **3 BNB**.
> *   We do your swap (assume we spend 0 ETH).
> *   At the end, we check: "Do I have more than `ethBalanceBefore`?"
> *   `3 BNB > 3 BNB`? **No.**
> *   **Consequence:** The contract **KEEPS your 2 BNB** and refunds nothing!
>
> **With Subtraction:**
> *   At end: `3 BNB > 1 BNB`? **Yes.**
> *   Refund: `3 - 1 = 2 BNB`. **Success!** You get your unused money back.

---

## 3. Why Snapshots? (The Nightmare Scenarios)

You asked: *"What happens if we DON'T do this?"*
Here are two specific disasters that would happen.

### Disaster A: The "Black Hole" (ETH)
**Scenario:** You send **1 ETH** to swap. The swap only costs **0.8 ETH** (slippage saved you money). You *should* get **0.2 ETH** back.

#### ❌ The Wrong Way (No Subtraction)
1.  **Start:** Contract has **0 ETH**.
2.  **Tx Arrives:** You send **1 ETH**. `address(this).balance` becomes **1 ETH**.
3.  **Snapshot (Wrong):** We define `balanceBefore = 1 ETH` (We forget to subtract `msg.value`).
4.  **Swap:** We spend **0.8 ETH**. Remaining Balance = **0.2 ETH**.
5.  **Flush Logic:**
    *   Is `Current (0.2)` > `Before (1)`?
    *   **NO.**
    *   **Result:** The contract sends you **NOTHING**. It keeps your 0.2 ETH forever.

#### ✅ The Right Way (With Subtraction)
3.  **Snapshot (Correct):** `balanceBefore = 1 - 1 = 0 ETH`.
5.  **Flush Logic:**
    *   Is `Current (0.2)` > `Before (0)`?
    *   **YES.**
    *   **Result:** Refund `0.2 - 0 = 0.2 ETH`. You get your money back.

---

### Disaster B: The "Bank Robbery" (Tokens)
**Scenario:** The Executor contract has **$1,000,000 USDT** sitting in it (accumulated fees).
You do a swap: **WBNB -> USDT**. You expect to receive **+50 USDT**.

**The Goal:** The contract should send you the **+50 USDT** you just bought.

#### ❌ The Wrong Way (Assume Start = 0)
1.  **Start:** Contract holds **$1,000,000**.
2.  **Hypothesis:** Method assumes `balanceBefore = 0` (lazy).
3.  **Action:** Swap happens. Contract gains +50 USDT.
4.  **End State:** Contract holds **$1,000,050**.
5.  **The Flush Calculation:**
    *   `New Tokens = Current Balance - Starting Balance`
    *   `New Tokens = $1,000,050 - 0`
    *   `New Tokens = $1,000,050`
6.  **Result:** The contract sends **$1,000,050** to your wallet. You drained the treasury.

#### ✅ The Right Way (With Snapshot)
1.  **Start:** Contract holds **$1,000,000**.
2.  **Snapshot:** We record `balanceBefore = 1,000,000`.
3.  **Action:** Swap happens. Contract gains +50 USDT.
4.  **End State:** Contract holds **$1,000,050**.
5.  **The Flush Calculation:**
    *   `New Tokens = $1,000,050 - 1,000,000`
    *   `New Tokens = 50`
6.  **Result:** The contract sends **50 USDT** to your wallet. The $1M is safe.

### [Step 1] `_pullTokens` (The Funding)
The contract needs money to trade. It pulls tokens *from your wallet* into *itself*.

```solidity
83: function _pullTokens(TokenPull[] calldata pulls) private {
84:     for (uint256 i; i < pulls.length;) {
86:         IERC20(p.token).safeTransferFrom(msg.sender, address(this), p.amount);
            // ...
88:     }
89: }
```
> **Note:** In your WBNB example, this is empty because you sent **Native BNB** as `msg.value` (attached to the transaction), so no ERC20 pull was needed.

---

## 4. Approvals & Multiple Pulls (FAQ)

You asked 3 great questions about `_pullTokens`.

### Q1 & Q2: "Does the user need to approve? Does the code do it?"
**The Rule:** A Smart Contract **CANNOT** take your tokens unless you say "Yes" first.
*   **Safety:** Imagine if I could write a contract that just sucks tokens out of your wallet without permission! 😱
*   **The Flow:**
    1.  **Frontend (UI):** Checks allowance. If 0, asks you to click **"Approve AequiExecutor to spend USDT"**.
    2.  **Wallet:** You sign the transaction.
    3.  **Frontend (UI):** Waits for approval to mine.
    4.  **Frontend (UI):** *Then* asks you to click **"Swap"** (calls `execute`).
*   **The Code:** The `execute` function (`safeTransferFrom`) assumes you **already did step 1**. If you didn't, the transaction fails ("ERC20: transfer amount exceeds allowance").

### Q3: "But I only see 1 pull in the code??"
**You are absolutely correct!** 🦅
I checked `swap-builder.ts` (Line 137) and it currently only pushes **1 Token**:

```typescript
const pulls: { token: Address; amount: bigint }[] = []
if (!useNativeInput) {
  pulls.push({ token: inputToken.address, amount: quote.amountIn })
}
```

**Why makes it an Array `[]` then?**
*   **Future Proofing:** The Smart Contract is designed to be "Generic". Use cases like **Zapping** (Swap + Add Liquidity) require 2 tokens.
*   **Verdict:**
    *   **Current App:** Only uses index `0` (1 token).
    *   **Smart Contract:** Ready for complex multi-token features later without needing a new deployment!

---

## 5. Who is the Spender? (Approvals)

YES, the spender is the **DEX Router** (like Uniswap V2 Router, PancakeRouter).

### The Chain of Trust
1.  **User approves Executor** (so Executor can pull).
2.  **Executor pulls tokens.**
3.  **Executor approves Uniswap Router** (so Uniswap can take).
4.  **Executor calls Uniswap.swap.**

Why? Because Uniswap cannot take tokens from the Executor unless the Executor approves it first.

---

---

## 6. Optimization: Infinite Approvals (Smart Frontend) 🧠

You asked: *"Shouldn't WBNB be MaxUint too? And checks happen off-chain?"*
**YES.** You are absolutely correct.

### The Strategy: "Dumb Contract, Smart Frontend"
We moved the "Check Logic" **Off-Chain** to save gas.
*   **The Contract (`Executor.sol`)**: Just does what it is told.
    *   If you send `approvals[]`, it approves them for **MaxUint256**.
    *   It doesn't waste gas checking `if (allowance > amount)`.
*   **The Frontend (Off-Chain)**: Provides the intelligence using `Lens.sol`.

### The Flow
1.  **Frontend Check (Lens):**
    *   Call `Lens.batchCheckAllowances([Executor], [Router], [Token])`.
    *   *Result:* "0 Allowance".
2.  **Frontend Decision:**
    *   Since allowance is 0, add `{ token: Token, spender: Router, amount: 0 }` to the list.
    *   *(Note: The amount doesn't matter because the contract forces MaxUint).*
3.  **Contract Execution:**
    *   Executor receives the list.
    *   Executor calls `approve(Router, MaxUint)`.
4.  **Next Time:**
    *   Lens reports "Infinite Allowance".
    *   Frontend sends `[]` (Empty List).
    *   Executor does nothing. **(0 Gas Cost)**.

### Scenario Correction
You were right about the example trace.
> **Correct Scenario:**
> 1. Approve `WBNB` to Spender `0xB97...` for **MaxUint** (Infinity).
> 2. Approve `BUSD` to Spender `0xB97...` for **MaxUint** (Infinity).

---
---

### [Step 3] `_performCalls` (The Action)
This is where the magic happens. We loop through every instruction (Call).

```solidity
99: function _performCalls(Call[] calldata calls) private ... {
101:    for (uint256 i; i < calls.length;) {
            // ...
106:        if (c.injectToken != address(0)) {
                // [INJECTION LOGIC]
107:            uint256 injectedAmount = IERC20(c.injectToken).balanceOf(address(this));
                // ...
113:            assembly {
                    // Overwrite the "amountIn" in the data with the REAL balance
114:                mstore(add(add(data, 32), offset), injectedAmount)
115:            }
116:        }
            
            // [EXECUTION]
118:        (bool success, bytes memory ret) = c.target.call{value: c.value}(data);
            // ...
131:    }
132: }
```

**What is happening?**
1.  **Injection Check:** If `injectToken` is set, we check our *actual balance*.
2.  **Overwrite:** We use `assembly` to reach into the hex data and **replace** the `amountIn` number with our `realBalance`.
3.  **Call:** We execute the function (e.g. `swap()`).

---

### [Step 4] `_flushDeltas` (The Clean Up)
We check our balances again ("After" state). If we have *more* than we started with, we send the difference to you.

```solidity
145: function _flushDeltas(...) private {
153:        if (balanceAfter > balancesBefore[i]) {
154:            IERC20(tokens[i]).safeTransfer(recipient, balanceAfter - balancesBefore[i]);
155:        }
            // ... SAME FOR ETH ...
163: }
```
> This ensures **Leftover Dust** (e.g. 0.000001 BUSD) is returned to you, not stuck in the contract.

---

## 2. Your Scenario Trace (WBNB -> BUSD -> USDT)

**Input:** 0.0001 BNB (Native)
**Path:** BNB -> WBNB -> BUSD -> USDT
**JSON Source:** Your provided trace.

### Transaction Start
*   **Value Sent:** `100000000000000` (0.0001 BNB)
*   **Contract Balance:** 0.0001 BNB

### 1. Approvals Processing
*   The contract approves **WBNB** and **BUSD** to the Uniswap Router (`0xB97...`).

### 2. Calls Processing

#### Call #1: Wrap BNB -> WBNB
*   **Target:** `0xbb4...` (WBNB Address)
*   **Value:** `100000000000000` (0.0001 BNB)
*   **Data:** `0xd0e30db0` (`deposit()`)
*   **Action:** The contract sends 0.0001 BNB to the WBNB contract and receives **0.0001 WBNB**.
*   **Result:** Contract now holds 0.0001 WBNB.

#### Call #2: Swap WBNB -> BUSD
*   **Target:** `0xB97...` (Uniswap Router)
*   **Data:** `0x04e45...` (exactInputSingle)
*   **Injection:** None (Static amount: 0.0001 WBNB)
*   **Action:** Contract calls Uniswap V3. "Here is 0.0001 WBNB, give me BUSD".
*   **Result:** Contract now holds **~0.088 BUSD**. (WBNB is gone).

#### Call #3: Swap BUSD -> USDT
*   **Target:** `0xB97...` (Uniswap Router)
*   **Data:** `0x04e45...` (exactInputSingle)
*   **Injection:** `0xe9e...` (BUSD) at offset `64` (Standard V3 encoding).
*   **Logic:**
    1.  **Check:** "How much BUSD do I have?" -> Answer: `88748158060637031` (0.088 BUSD).
    2.  **Overwrite:** Modify the `data` to use *exactly* `88748158060637031`.
    3.  **Execute:** Contract calls Uniswap V3. "Here is 0.088 BUSD, give me USDT".
    4.  **Recipient:** The `recipient` in this calldata is **YOU** (`0xCC5...`).
*   **Result:** You (the User) receive **~0.088 USDT** directly.

### 3. Flush Processing
*   **Tokens to check:** WBNB, BUSD.
*   **WBNB:** 0 balance (All swapped).
*   **BUSD:** 0 balance (All swapped).
*   **USDT:** Not checked (Already sent to you).
*   **ETH:** 0 balance.

**---

## 7. Assembly Deep Dive (Yul)

You asked: *"What is `mstore`, `mload`, and why `add(32, ...)`?"*
This is **Yul (Inline Assembly)**. It lets us talk directly to the EVM memory to do things Solidity can't easily do (like "Patching" data).

### Concept: Memory is a Tape 🎞️
Imagine memory is a long tape of bytes. Pointers (like `data` or `ret`) just point to a spot on that tape.
*   **Struct of `bytes`:**
    *   `[Pointer]` -> `[Length (32 bytes)]` `[Content (Actual Data...)]`

### 1. The Injection (`mstore`)
```solidity
mstore(add(add(data, 32), offset), injectedAmount)
```
*   **Goal:** Overwrite a specific number inside the existing `data` (e.g., replacing `AmountIn` with `Balance`).
*   **The Math:**
    1.  `data`: Points to the start (Length).
    2.  `add(data, 32)`: Skips the length. Now we are at the **Content Start**.
    3.  `add(..., offset)`: Jumps `N` bytes forward to exactly where the number is.
*   **`mstore(pos, val)`**: Writes `val` (32 bytes) into that exact position `pos`.
    *   *Analogy:* It's like taking a sticker with a new number and pasting it over the old number on a form.

### 2. The Error Bubbling (`revert`)
```solidity
let returndata_size := mload(ret)
revert(add(32, ret), returndata_size)
```
*   **Goal:** If the swap fails, we want to show the **exact error** (like "Uniswap: K").
*   **`ret`**: The returned data from the failed call.
*   **`mload(ret)`**: Reads the first 32 bytes at pointer `ret`. For `bytes` types, the first 32 bytes is ALWAYS the **Length**.
    *   So `returndata_size` = How long the error message is.
*   **`revert(start, size)`**: Stops execution and returns data.
    *   `add(32, ret)`: We skip the length prefix and point to the **Actual Error Message**.
    *   We tell EVM: "Revert and send back `size` bytes starting from `content`."

**Why use Assembly?**
Because Solidity's `revert()` usually takes a string string. Here, we have raw bytes from another contract. Assembly lets us pass those raw bytes straight up the chain without decoding them.**

## 7. The "Human Readable" Assembly Guide (Yul) 👶

Okay, let's forget about "Memory Pointers" and "Hex Bytes". Let's use real-world analogies.

### 1. The Injection (`mstore`) = "The Whiteout Pen" 🖍️

Imagine you have a **Check** written out to Uniswap, but the "Amount" line is blank because you didn't know your balance yet.

*   **The Problem:** You sent the Check (Calldata) to the Executor, but it says "Pay 0 DOLLARS".
*   **The Fix (`mstore`):** The Executor checks its wallet, sees it has $100.
    1.  It takes out a **Whiteout Pen**.
    2.  It goes to the "Amount" line on the Check (`add(data, offset)`).
    3.  It writes "100" over the "0" (`mstore`).
    4.  *Now* it sends the Check to Uniswap.

**Code Translation:**
*   `add(data, offset)` -> "Go to the Amount line."
*   `mstore(..., amount)` -> "Write the new amount here."

### 2. The Error (`revert`) = "The Sealed Envelope" ✉️

Imagine you hired a Courier (The Executor) to deliver a package to Uniswap.

*   **The Event:** Uniswap rejects the package! They hand the Courier a **Sealed Red Envelope** explaining why ("Incorrect Price").
*   **The Problem:** The Courier doesn't speak "Uniswap Language" (Solidity Error Types). He doesn't know how to open the envelope.
*   **The Fix (`revert`):**
    1.  The Courier measures the envelope size (`mload`).
    2.  He hands the **entire sealed envelope** back to YOU (`revert`).
    3.  "I don't know what this says, but here is exactly what they gave me."

**Code Translation:**
*   `mload(ret)` -> "How big is this envelope?"
*   `revert(..., size)` -> "Return this envelope to the user exactly as it is."

**Why do we need this?**
If the Courier tried to open the envelope (decode the error) and failed, he might just say "Delivery Failed" and you would never know *why*. By handing you the sealed envelope, your Wallet (Metamask) can open it and tell you "Uniswap said: Price Too Low".**

---

## 8. Can Balance Decrease? (The Negative Delta) 📉

You asked: *"Is it possible if `balanceAfter < balanceBefore`?"*

**YES. This is completely normal.**

### Why? Because we SPENT it!
Think about the Input Token (e.g. USDT):
1.  **Start:** Executor has 0 USDT (Snapshot).
2.  **Pull:** Executor pulls **100 USDT** from you.
3.  **Swap:** Executor sends 100 USDT to Uniswap.
4.  **End:** Executor has **0 USDT**.

### What does the code do?
```solidity
154:    if (balanceAfter > balanceBefore) {
155:        transfer(balanceAfter - balanceBefore);
156:    }
```
*   **Check:** `if (0 > 0)` -> **FALSE**.
*   **Action:** Do nothing.

**What if we leave dust?**
1.  **Start:** 0 USDT.
2.  **Pull:** 100 USDT.
3.  **Spend:** 99 USDT.
4.  **End:** 1 USDT.
*   **Check:** `if (1 > 0)` -> **TRUE**.
*   **Action:** Refund **1 USDT** to you.

**Summary:**
The `if` condition automatically filters out tokens we **completely spent** (Input) and only flushes tokens we **gained** (Output) or **saved** (Refunds).
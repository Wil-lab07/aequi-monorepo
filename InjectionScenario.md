# The "Injection" Deep Dive 💉

You asked: *"What the fuck is this?"*
Answer: **It is a Runtime Patch.**

## The Problem: The Unknown Number ❓

Imagine a Multi-Hop Swap: **WETH -> USDC -> USDT**.

1.  **Step 1 (WETH -> USDC)**:
    *   Input: `1.0 WETH`.
    *   Output: **UNKNOWN**. (Maybe 3000? Maybe 2999?).

2.  **Step 2 (USDC -> USDT)**:
    *   Input: **???** (We don't know yet!)
    *   But we *must* write the function call NOW.

## The Solution: The "Blank Check" ✍️

We write the call for Step 2 with a **Placeholder Number** (e.g., `0`), and we tell the Executor:
> *"See byte #4? Overwrite it with my real USDC balance later."*

---

## 📏 What is an "Offset"? (The Analogy)

Think of the data as a row of mailboxes.

`[Box 0] [Box 1] [Box 2] [Box 3] [Box 4] [Box 5] ...`

*   **Offset 0**: The start of the row.
*   **Offset 4**: Skip the first 4 boxes.

### Example: "I AM A ROBOT"
If I tell you: *"Change the word at **Offset 7** to 'HUMAN'..."*
1.`I` 2.` ` 3.`A` 4.`M` 5.` ` 6.`A` 7.`R` <--- You start here!
It becomes: "I AM A **HUMAN**".

**In Solidity:**
*   **Offset 4**: "Skip the first 4 bytes (The Function ID) and write the number right there."
*   **Offset 164**: "Skip a huge chunk of data (Function ID + TokenA + TokenB + Fee...) to find the 'Amount' field."

---

## 🔬 Visualizing the Hex Data (The "Matrix" View)

Let's look at `swapExactTokensForTokens(amountIn, ...)` for Uniswap V2.

### 1. The Call Data (What we write in JS)

Function Selector (4 bytes) + AmountIn (32 bytes) + ...

```
[0x38ed1739]  <-- Function ID (swapExactTokensForTokens)
[00000000...00000000]  <-- AmountIn (Placeholder! We put 0 here)
[00000000...00000bb8]  <-- MinAmountOut
...
```

### 2. The Instruction to Executor

We tell the Executor:
*   `injectToken`: `0xUSDC_Address`
*   `injectOffset`: `4` (Pass the first 4 bytes).

### 3. What happens On-Chain (Runtime) ⚙️

1.  Executor runs Step 1 (Gets 2999 USDC).
2.  Executor prepares Step 2 Call.
3.  **The Injection**:
    *   Executor checks balance: "I have 2999 USDC".
    *   Executor goes to Byte `4` of the call data.
    *   **OVERWRITE**: It deletes `0000...00` and writes `0000...0bb7` (2999).

### 4. The Final Call executed on Uniswap

```
[0x38ed1739]
[00000000...00000bb7]  <-- LOOK! It now has the REAL amount (2999)
[...rest of data...]
```

---

## Why the Offset is `4`? (The Math) 🧮

**YES! It is exactly the Parameter Position.**

Let's dissect `swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline)`.

### The Byte Layout

| Position | Size | Content | What is it? |
| :--- | :--- | :--- | :--- |
| **0 - 3** | 4 Bytes | `0x38ed1739` | **Function ID** (The "Name") |
| **4 - 35** | 32 Bytes | `00...00000` | **Parameter 1: AmountIn** 👈 |
| **36 - 67** | 32 Bytes | `00...00bb8` | **Parameter 2: MinAmountOut** |
| ... | ... | ... | ... |

**Why `4`?**
*   The first 4 bytes are reserved for the Function ID.
*   The **Very First Parameter** (`amountIn`) starts immediately after.
*   So, `0 + 4 = 4`.

### Why `164` for Uniswap V3?

V3 uses a **Struct** (an Object).
`exactInputSingle(params)` where `params` is:
`{ tokenIn, tokenOut, fee, recipient, deadline, amountIn, ... }`

| Position | Content |
| :--- | :--- |
| 0 - 3 | Function ID |
| 4 - 35 | Parameter 1: `params` (It's a tuple, so this is just the start) |
| ... | ... (Inside the Tuple) ... |
| 4 + (0*32) | `tokenIn` |
| 4 + (1*32) | `tokenOut` |
| 4 + (2*32) | `fee` |
| 4 + (3*32) | `recipient` |
| 4 + (4*32) | `deadline` |
| **4 + (5*32)** | **`amountIn`** 👈 |

**Math:**
`4 (FuncID) + 5 * 32 (Previous params) = 4 + 160 = 164`.

It is literally just counting slots!

---

## 📏 The Golden Rule of Sizes

*   **Function Name (The Header)**: ALWAYS **4 Bytes**.
*   **A Parameter (The Data)**: ALWAYS **32 Bytes** (Standard EVM Word).

So, to find the start of Parameter #1:
`Skip Header (4) = 4`.

To find the start of Parameter #6:
`Skip Header (4) + Skip 5 Parms (5 * 32) = 164`.

**It is NOT "1 param = 4".**
It is "Header = 4, Param = 32".

---

## 🆚 Visual Comparison: The "Slot" Map

Here is exactly where `amountIn` lives in each function.

### Uniswap V2: `swapExactTokensForTokens`
arguments: `(amountIn, amountOutMin, ...)`

| Slot # | Parameter Name | Math (Start Pos) | Result |
| :--- | :--- | :--- | :--- |
| **1** | **`amountIn`** 👈 | `4 + (0 * 32)` | **4** |
| 2 | `amountOutMin` | `4 + (1 * 32)` | 36 |
| 3 | `path` | `4 + (2 * 32)` | 68 |

### Uniswap V3: `exactInputSingle`
arguments: `(params)`
The `params` struct has fields in this specific order (defined by Solidity ABI):

| Slot # | Field Name | Math (Start Pos) | Result |
| :--- | :--- | :--- | :--- |
| 1 | `tokenIn` | `4 + (0 * 32)` | 4 |
| 2 | `tokenOut` | `4 + (1 * 32)` | 36 |
| 3 | `fee` | `4 + (2 * 32)` | 68 |
| 4 | `recipient` | `4 + (3 * 32)` | 100 |
| 5 | `deadline` | `4 + (4 * 32)` | 132 |
| **6** | **`amountIn`** 👈 | `4 + (5 * 32)` | **164** |

**Summary**:
*   V2: It's the **1st** item.
*   V3: It's the **6th** item.
That is why the offset is different.

# Uniswap V2 Quote Deep Dive (Concrete Example)

This document explains exactly how `UniswapV2Adapter.computeV2Quote` works, using your specific numbers.

## 1. The Scenario

We are swapping **USDC** to **USDT** on BSC (PancakeSwap/Uniswap V2).

**Your Data (from Logs):**
chain.id: 56, 
chain.key: bsc, 
dex: uniswap-v2, 
tokenIn: USDC, 
tokenOut: USDT, 
amountIn: 925493737429532119,
poolAddress: 0x6ab0Ae46c4B450bc1B4ffCaA192b235134d584B2
reserve0: 78414963986681129863, 
reserve1: 78615798730996960812, 
token0: 0x55d398326f99059fF775485246999027B3197955
gasPriceWei: 50000000

---

## 2. Step-by-Step Code Execution

### Step A: Mapping Reserves (Who is who?)

The pool just has "Pile 0" and "Pile 1". We need to know which pile is the "Input" pile (USDC).

```typescript
// Is Token0 (USDT) == TokenIn (USDC)? -> NO.
const reserveIn = sameAddress(token0, tokenIn.address) ? reserve0 : reserve1
// Result: reserveIn = reserve1 (78615798730996960812) [USDC Pile]

const reserveOut = sameAddress(token0, tokenIn.address) ? reserve1 : reserve0
// Result: reserveOut = reserve0 (78414963986681129863) [USDT Pile]
```

**State Check:**
*   `reserveIn` (USDC): `78615798730996960812`
*   `reserveOut` (USDT): `78414963986681129863`

---

### Step B: Creating "Smart Objects" (The SDK Wrappers)

The Uniswap SDK creates typed objects to prevent math errors.

```typescript
// 1. Create Token Objects (Metadata)
const tokenInInstance = new Token(56, '0xUSDC...', 18, 'USDC', 'USD Coin')
const tokenOutInstance = new Token(56, '0xUSDT...', 18, 'USDT', 'Tether USD')

// 2. Wrap the Reserves (BigInt + Token Info)
const reserveInAmount = CurrencyAmount.fromRawAmount(tokenInInstance, '78615798730996960812')
const reserveOutAmount = CurrencyAmount.fromRawAmount(tokenOutInstance, '78414963986681129863')
```

**Why?**
These objects perform checks. If you try to compare `reserveInAmount` (USDC) with `reserveOutAmount` (USDT), the SDK throws an error. It forces safe math.

**Q: What does the `reserveInAmount` object look like internally?**
**Answer: It's complex!** It stores the value as a fraction to avoid precision loss.

```json
reserveInAmount
{
  "numerator": [
    648924716,
    202224047,
    68
  ],
  "denominator": [
    1
  ],
  "currency": {
    "chainId": 56,
    "decimals": 18,
    "symbol": "USDC",
    "name": "USD Coin",
    "isNative": false,
    "isToken": true,
    "address": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
  },
  "decimalScale": [
    660865024,
    931322574
  ]
}
```

```json
reserveOutAmount
{
  "numerator": [
    489515911,
    15182116,
    68
  ],
  "denominator": [
    1
  ],
  "currency": {
    "chainId": 56,
    "decimals": 18,
    "symbol": "USDT",
    "name": "Tether USD",
    "isNative": false,
    "isToken": true,
    "address": "0x55d398326f99059fF775485246999027B3197955"
  },
  "decimalScale": [
    660865024,
    931322574
  ]
}
```

**Q: Why is USDC 18 Decimals? Isn't it 6?**
**Answer: On Ethereum, YES (6). On BSC, NO (18).**

*   You are on **BNB Chain (BSC)**.
*   The official bridged USDC on BSC (`0x8ac...`) uses **18 Decimals**.
*   This is a common "gotcha"! Different chains wrap tokens differently.

**Q: What is Numerator and Denominator? (I am noob help)**
**Answer: It's "Fraction Math" to avoid decimals.**

Computers are bad at decimals (`0.1 + 0.2 = 0.300000004`).
So the SDK stores numbers as **Top / Bottom** fractions.

**Example: 0.5 USDC**
*   **Decimal Way**: `0.5` (Bad for code)
*   **Fraction Way**: `1 / 2` (Perfect precision!)
    *   **Numerator**: `1`
    *   **Denominator**: `2`

**Example: Your Log**
*   `numerator: [6489..]` -> This is the Big Value (e.g. 78000000000000000000).
*   `denominator: [1]` -> Since it's a whole number of "Wei" (Raw Units), we just divide by 1.

**Why array `[648, 202, 68]`?**
*   Javascript prints BigInts weirdly in JSON sometimes. Those are chunks of the massive number.
*   Internally, `JSBI` (BigInt library) handles it as one single massive integer.

---

### Step C: Creating the "Pair" Model

```typescript
// "Here is a pool with X amount of USDC and Y amount of USDT"
const pair = new Pair(reserveInAmount, reserveOutAmount)
```
```json
{
  "liquidityToken": {
    "chainId": 56,
    "decimals": 18,
    "symbol": "UNI-V2",
    "name": "Uniswap V2",
    "isNative": false,
    "isToken": true,
    "address": "0x6ab0Ae46c4B450bc1B4ffCaA192b235134d584B2"
  },
  "tokenAmounts": [
    {
      "numerator": [
        489515911,
        15182116,
        68
      ],
      "denominator": [
        1
      ],
      "currency": {
        "chainId": 56,
        "decimals": 18,
        "symbol": "USDT",
        "name": "Tether USD",
        "isNative": false,
        "isToken": true,
        "address": "0x55d398326f99059fF775485246999027B3197955"
      },
      "decimalScale": [
        660865024,
        931322574
      ]
    },
    {
      "numerator": [
        648924716,
        202224047,
        68
      ],
      "denominator": [
        1
      ],
      "currency": {
        "chainId": 56,
        "decimals": 18,
        "symbol": "USDC",
        "name": "USD Coin",
        "isNative": false,
        "isToken": true,
        "address": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
      },
      "decimalScale": [
        660865024,
        931322574
      ]
    }
  ]
}
```

The `Pair` object now knows:
1.  **Reserves**: It holds the `reserveIn` and `reserveOut` values.
2.  **Formula**: It knows specifically that `Output = (Input * 997 * ReserveOut) / (ReserveIn * 1000 + Input * 997)`.

---

### Step D: The Calcuation (`pair.getOutputAmount`)

This is the part you wanted to understand piece-by-piece.

```typescript
const inputAmount = CurrencyAmount.fromRawAmount(tokenInInstance, '925493737429532119')
const [amountOutCurrency] = pair.getOutputAmount(inputAmount)
```
```json
inputAmount
{
  "numerator": [
    578058862,
    861608608
  ],
  "denominator": [
    1
  ],
  "currency": {
    "chainId": 56,
    "decimals": 18,
    "symbol": "USDC",
    "name": "USD Coin",
    "isNative": false,
    "isToken": true,
    "address": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
  },
  "decimalScale": [
    660865024,
    931322574
  ]
}
```

amountOutCurrency:  
```json
{
  "numerator": [
    797727041,
    846893010
  ],
  "denominator": [
    1
  ],
  "currency": {
    "chainId": 56,
    "decimals": 18,
    "symbol": "USDT",
    "name": "Tether USD",
    "isNative": false,
    "isToken": true,
    "address": "0x55d398326f99059fF775485246999027B3197955"
  },
  "decimalScale": [
    660865024,
    931322574
  ]
}
```

**Q: What is `inputAmount` doing here?**
**Answer: It represents the "Money on the Table".**

*   **It doesn't "do" anything itself.** It's just a data container.
*   **It holds:** "I want to swap **0.92549... USDC**".
*   **Role**: It is the **Question** we ask the Pool.

The code:
```js
pair.getOutputAmount(inputAmount)
```
Literally translates to:
> "Hey Pool (Pair), if I put this `inputAmount` (0.925 USDC) into you, how much USDT will you give me back?"

**The JSON `numerator` [578058862, 861608608]**
*   This is just `925493737429532119` chopped into two pieces for storage.
*   `861608608` is the lower 30 bits. `578058862` is the upper 30 bits.
*   Together they equal your full amount: `925493737429532119`.

So: `inputAmount` = **The contents of your hand before the trade.**

1.  **Apply Fee (0.3%)**:
    *   `AmountInWithFee` = `AmountIn * 997`
    *   `925493737429532119 * 997` = `922,717,256,217,243,522,643`

2.  **Calculate Numerator**:
    *   `Numerator` = `AmountInWithFee * ReserveOut`
    *   `922,717... * 78414963...` = `72,354,845,984,834,705,739,786,952,058,908,984,509` (Huge number!)

3.  **Calculate Denominator**:
    *   `Denominator` = `(ReserveIn * 1000) + AmountInWithFee`
    *   `ReserveIn * 1000` = `78615798730996960812000`
    *   `Denisominator` = `78615798730996960812000 + 922717256217243522643`
    *   `Denominator` = `79,538,515,987,214,204,334,643`

4.  **Final Division (Output)**:
    *   `Output` = `Numerator / Denominator`
    *   `72,354... / 79,538...`
    *   **Result** = `909,683,169,457,757,851` (~0.909 USDT)

## 4. Deep Dive: The Math Functions (`quote-math.ts`)

**Q: "I want to cry, what is Q18? What is Mid Price?"**
**Answer: Breathe! It's just simple definitions.**

### Concept 1: What is `Q18`?
Computers can't handle decimals like `0.98` well (they lose precision).
So instead of saying `0.98`, we say `0.98 * 1,000,000,000,000,000,000`.
*   **Format**: `980,000,000,000,000,000` (BigInt).
*   **Usage**: We do all our math in this "Big Number" mode, then divide by 10^18 only at the very end to show the user.
*   **Q18** = `1000000000000000000n` (It's a constant).

---

### Concept 2: Mid Price vs Execution Price

1.  **Mid Price (The "Market Price")**:
    *   This is the price if you bought a **tiny dust amount**.
    *   Formula: `Reserve B / Reserve A`.
    *   *Analogy*: The price tag on the shelf ($1.00).

2.  **Execution Price (The "Real Price")**:
    *   This is the price you **actually got** after buying a huge amount.
    *   Formula: `Amount You Given / Amount You Got`.
    *   *Analogy*: You bought 1000 apples, so the store charged you $1.05 per apple because you depleted their stock.

3.  **Price Impact (The "Loss")**:
    *   How much worse was your `Execution Price` compared to the `Mid Price`?
    *   *Analogy*: "I paid 5% extra because I bought too much."

---

### Code Walkthrough (Line-by-Line)

#### Function A: `computeMidPriceQ18FromReserves`

```typescript
export const computeMidPriceQ18FromReserves = (...reserves...) => {
  // 1. Get Factors (To handle decimals, e.g. 6 decimals vs 18 decimals)
  const inFactor = pow10(inDecimals)   // USDC (18 decimals) -> 10^18
  const outFactor = pow10(outDecimals) // USDT (18 decimals) -> 10^18

  // 2. The Formula: (ReserveOut / ReserveIn)
  // We multiply by Q18 to keep it as a big integer.
  // We multiply by inFactor/outFactor to adjust for decimals.
  return (reserveOut * Q18 * inFactor) / (reserveIn * outFactor)
}
```

**Your Numbers:**
*   `reserveIn` (USDC): ~78.61
*   `reserveOut` (USDT): ~78.41
*   **Result**: `78.41 / 78.61` = **0.9974** (Scaled up to `997400000000000000`).

---

#### Function B: `computeExecutionPriceQ18`

```typescript
export const computeExecutionPriceQ18 = (...amounts...) => {
  // 1. The Formula: (AmountOut / AmountIn)
  // Simple: "I got 0.909 USDT for 0.925 USDC"
  return (amountOut * Q18 * inFactor) / (amountIn * outFactor)
}
```

**Your Numbers:**
*   `amountIn`: 0.925
*   `amountOut`: 0.909
*   **Result**: `0.909 / 0.925` = **0.9829** (Scaled up).

---

#### Function C: `computePriceImpactBps`

```typescript
export const computePriceImpactBps = (midPrice, amountIn, amountOut...) => {
   // 1. Calculate Theoretical Output (If there was NO slippage)
   // "If price was 0.9974, and I put in 0.925 USDC, I SHOULD have gotten 0.922 USDT."
   const idealQuote = (midPrice * amountIn) / Q18

   // 2. Compare with Real Output
   // "But I actually got 0.909 USDT."
   const shortfall = idealQuote - amountOut

   // 3. Calculate Percentage (Basis Points)
   // Shortfall / IdealQuote * 10000
   return (shortfall * 10000n) / idealQuote
}
```

**Your Result:**
*   Ideal: ~0.922
*   Real: ~0.909
*   Difference: ~0.013 is missing!
*   **Impact**: `0.013 / 0.922` = **1.45%** (roughly).

So `PriceImpactBps` tells the UI to show a **red warning**: "You are losing 1.45% value on this trade!".

---

### Step E: Metrics (Price Impact)

We traded **0.925 USDC** but got **0.909 USDT**.
*   Mid Price (Ideal): `78.41 / 78.61` ≈ `0.9974`
*   Execution Price (Real): `0.909 / 0.925` ≈ `0.9829`
*   **Price Impact**: We lost value!
    *   Because the pool is tiny (`~78 USD`), a `$0.92` trade moves the price significantly.
    *   The `computePriceImpactBps` function calculates this loss.

### Visual Summary

1.  **Inputs**: 0.925 USDC
2.  **Pool**: [78.61 USDC | 78.41 USDT]
3.  **Action**: Add 0.925 to standard USDC pile. Remove X from USDT pile to keep `K` constant.
4.  **Math**: `K = 78.61 * 78.41 = 6163.8...`
    *   New USDC Balance = `78.61 + 0.925 = 79.535`
    *   New USDT Balance Needs to be = `6163.8 / 79.535 = 77.50`
    *   USDT To Pay Out = `Old Balance (78.41) - New Balance (77.50) = 0.91` (Roughly).
5.  **Output**: ~0.91 USDT.

## 3. Terminology: What is a "Reserve"?

**Q: "Is it like how much supply USDC or USDT in that pool?"**
**Answer: YES.**

*   **Total Supply**: All the USDC in the world (Billions).
*   **Reserve**: The USDC **specifically inside THIS pool contract**.

Think of the Pool as a **Vending Machine**:
*   The machine has a bucket for Quarters (Reserve A).
*   The machine has a bucket for Soda Cans (Reserve B).
*   **Reserve** = "How many items are currently inside the machine waiting to be swapped."

It does NOT mean the total supply of the token worldwide. Just the pile of cash *locked* in this specific pair contract.

This is the quote object that we get from the quote service

(1 Hops) WBNB -> USDT 
AmountIn = 1000000000000000 (0.001 WBNB)
AmountOut = 892178401627220918 (0.892178401627220918 USDT)
AmountOutMin = 887717509619084814 (0.887717509619084814 USDT) // Slippage 0.5%
Deadline = 1735689000 (180 seconds from now)

```json
    "chain": "bsc",
    "source": "uniswap-v3@100 > uniswap-v3@100",
    "path": [
        "WBNB",
        "USDC",
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
            "address": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
            "symbol": "USDC",
            "name": "USD Coin",
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
        "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // 
        "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        "0x55d398326f99059fF775485246999027B3197955"
    ],
    "priceQ18": "892123466679174521887",
    "midPriceQ18": "0",
    "executionPriceQ18": "892123466679174521887",
    "priceImpactBps": 0,
    "amountIn": "1000000000000000", // 0.001 WBNB
    "amountInFormatted": "0.001",
    "amountOut": "892123466679174522", // 0.892123466679174522 USDT
    "amountOutFormatted": "0.892123466679174522",
    "liquidityScore": "39947830871331978937534",
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
            "poolAddress": "0x4141325bAc36aFFe9Db165e854982230a14e6d48",
            "feeTier": 100
        },
        {
            "dexId": "uniswap-v3",
            "poolAddress": "0x2C3c320D49019D4f9A92352e947c7e5AcFE47D68",
            "feeTier": 100
        }
    ],
    "sources": [
        {
            "dexId": "uniswap-v3",
            "poolAddress": "0x4141325bAc36aFFe9Db165e854982230a14e6d48",
            "feeTier": 100,
            "amountIn": "1000000000000000", // 0.001 WBNB
            "amountOut": "891087558145506007", // 0.891087558145506007 USDC
            "reserves": {
                "liquidity": "39947830871331978937534",
                "token0": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
                "token1": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
            }
        },
        {
            "dexId": "uniswap-v3",
            "poolAddress": "0x2C3c320D49019D4f9A92352e947c7e5AcFE47D68",
            "feeTier": 100,
            "amountIn": "891087558145506007", // 0.891087558145506007 USDC
            "amountOut": "892123466679174522", // 0.892123466679174522 USDT
            "reserves": {
                "liquidity": "3255002412465232583967512992",
                "token0": "0x55d398326f99059fF775485246999027B3197955",
                "token1": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
            }
        }
    ],
    "amountOutMin": "887662849345778650", // 0.88766284934577865 USDT
    "amountOutMinFormatted": "0.88766284934577865",
    "slippageBps": 50
    "offers": PriceQuote[] (Remaining)
```

```js
const deadlineSeconds = Number.isFinite(parsed.data.deadlineSeconds) ? parsed.data.deadlineSeconds! : 180
```

if deadlineSeconds is not a finite number (or empty) then, 180 seconds

After that let's go to the swap builder
```
    let transaction
    try {
        transaction = swapBuilder.build(chain, {
            quote,
            amountOutMin, // (slippage applied)
            recipient,
            slippageBps: boundedSlippage, 
            deadlineSeconds,
            useNativeInput,
            useNativeOutput,
        })
    } catch (error) {
        reply.status(400)
        return { error: 'calldata_error', message: (error as Error).message }
    }
```
```
    return this.buildExecutorSwap(
      chain,
      params.quote,
      params.recipient,
      amountOutMinimum,
      BigInt(deadline),
      params.useNativeInput,
      params.useNativeOutput,
    )
```

## Deep Dive of Swap Builder
```
const executorAddress = this.resolveExecutor(chain.key, chain.name)
```

**Scenario**: Swap 0.001 WBNB -> USDT
**Route**: `WBNB -> USDC -> USDT`

## Part 1: Initialization (Lines 130-174)

### 1. `resolveExecutor`
*   **Code**: `const executorAddress = this.resolveExecutor(chain.key, chain.name)`
*   **Data**: `0xExecutor` (Our Smart Contract).

### 2. `pulls` (The Funding)
*   **Code**: `pulls.push({ token: WBNB, amount: 0.001 })`
*   **Reason**: The Executor needs money to work.
*   **Data**: `[{ token: 0xWBNB, amount: 0.001 }]`.

### 3. `tokensToFlush` (The Safety Net) 🧹
*   **Code**: `tokensToFlush.add(WBNB)`
*   **Reason**: **CRITICAL**. If the swap FAILS after pulling money, or if we don't spend it all, we must return the WBNB to the user.
*   **Data**: `tokensToFlush = { WBNB }`.

## Part 2: Loop Iteration Part 1 (WBNB -> USDC)
Source
```json
    {
        "dexId": "uniswap-v3",
        "poolAddress": "0x4141325bAc36aFFe9Db165e854982230a14e6d48",
        "feeTier": 100,
        "amountIn": "1000000000000000",
        "amountOut": "891087558145506007",
        "reserves": {
            "liquidity": "39947830871331978937534",
            "token0": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
            "token1": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
        }
    },
```
```js
const availableAmount = 1000000000000000 // 0.001 WBNB
const quotedHopAmountIn = source.amountIn // 1000000000000000 = 0.001 WBNB

const hopAmountIn = quotedHopAmountIn <= availableAmount ? quotedHopAmountIn : availableAmount
// hopAmountIn = 1000000000000000 (0.001 WBNB)  

const const isLastHop = index === quote.sources.length - 1 // False
const hopRecipient = (isLastHop && !useNativeOutput) ? recipient : executorAddress // Executor Address

const hopExpectedOut = source.amountOut (891087558145506007 = 0.891087558145506007 USDC)
const scaledHopExpectedOut = (hopExpectedOut * hopAmountIn) / quotedHopAmountIn
// hopExpectedOut = 891087558145506007 (0.891087558145506007 USDC)
// hopAmountIn = 1000000000000000 (0.001 WBNB)
// quotedHopAmountIn = 1000000000000000 (0.001 WBNB)
// scaledHopExpectedOut = 891087558145506007 (0.891087558145506007 USDC) (No slippage applied)

const hopMinOut = this.deriveHopMinOut( // hopMinOut = 88663212035477847 (0.88663212035477847 USDC) (Slippage applied)
    scaledHopExpectedOut, // hopExpectedAmount (891087558145506007 = 0.891087558145506007 USDC) (No slippage applied)
    amountOutMin, // totalMintOut (0.88766284934577865 USDT) (Slippage applied)
    quote.amountOut, // TotalExpectedOut (0.892123466679174522 USDT) (No slippage applied)
    isLastHop, // False
)
```

> **Note: Why `scaledHopExpectedOut`? (The "Scaling" Logic)**
> Even if `hopAmountIn` equals `quotedHopAmountIn` (1:1 match), this logic exists for **Split Trades**.
> If we only routed 50% of the input through this pool, we would multiply the expected output by 0.5.
> Formula: `(Expected Output * Actual Input) / Quoted Input` = Proportional Output.
> *Result is still in USDC (Intermediate Token).*

> **Note: Why `hopMinOut`? (The "Slippage" Logic)**
> `scaledHopExpectedOut` is the **Ideal Amount**. `hopMinOut` is the **Safety Floor**.
> We calculate this to protect against MEV (Sandwich Attacks) on *this specific hop*.
> It applies the global slippage ratio (e.g. 99.5%) to this intermediate step.
> Formula: `USDC_Expected * (USDT_GlobalMin / USDT_GlobalExpected)`
> *Result is in USDC (Low limit for this hop).*
 

### DerivedHopMinOut
if isLastHop is true, then hopMinOut = amountOutMin (False)

(hopExpectedOut * totalMinOut) / totalExpectedOut
// hopExpectedOut = 891087558145506007 (0.891087558145506007 USDC) (No slippage applied)
// totalMinOut = 88766284934577865 (0.88766284934577865 USDT) (Slippage applied)
// totalExpectedOut = 892123466679174522 (0.892123466679174522 USDT) (No slippage applied)
// hopMinOut = (891087558145506007 * 88766284934577865) / 892123466679174522 = 88663212035477847 (0.88663212035477847 USDC) (Slippage applied)

## Continue
```js
const isIntermediateHop = index > 0 // False
const approvalAmount = isIntermediateHop
  ? BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') // max uint256
  : hopAmountIn // exact amount for first hop (0.001 WBNB)
``` 

```js
      approvals.push({
        token: tokenIn.address, // WBNB
        spender: dex.routerAddress, // Uniswap Router
        amount: approvalAmount, // 0.001 WBNB
        revokeAfter: true,
      })
```

```js
      const swapCallData = hopVersion === 'v2'
        ? this.encodeV2SingleHopCall(tokenIn.address, tokenOut.address, hopAmountIn, hopMinOut, hopRecipient, deadline)
        : this.encodeV3SingleHopCall(tokenIn.address, tokenOut.address, source.feeTier, hopAmountIn, hopMinOut, hopRecipient, deadline, dex.useRouter02)

    // swapCallData = this.encodeV3SingleHopCall(tokenIn.address, tokenOut.address, source.feeTier, hopAmountIn, hopMinOut, hopRecipient, deadline, dex.useRouter02)

    // (WBNB, USDC, 100, 1000000000000000, 88663212035477847, 0xExecutor, 180, false)
```

```js
    const isInjectionNeeded = index > 0 // No need to Inject
    const injectToken = isInjectionNeeded ? tokenIn.address : '0x0000000000000000000000000000000000000000' as Address
    // injectToken = '0x0000000000000000000000000000000000000000' (No need to Inject)
    let injectOffset = 0n // No need to Inject
```

```js 
    const plannedCall = {
      target: dex.routerAddress, // Uniswap Router (0x) 
      value: 0n, // No value
      data: swapCallData, // swapCallData (WBNB, USDC, 100, 1000000000000000, 88663212035477847, 0xExecutor, 180, false)
      injectToken, // injectToken (0x0000000000000000000000000000000000000000)
      injectOffset, // injectOffset (0n)
    }

    executorCalls.push(plannedCall) 
    tokensToFlush.add(tokenIn.address) // WBNB done its duplicated

    if (hopRecipient === executorAddress) { // True
        tokensToFlush.add(tokenOut.address) // USDC done its duplicated
    }
```

So tokensToFlush = { WBNB, USDC }

calls.push({
    target: plannedCall.target,
    allowFailure: false,
    callData: plannedCall.data,
    value: plannedCall.value,
})

So calls = [
    {
        target: "0x1234567890123456789012345678901234567890", // Uniswap Router (0x)
        allowFailure: false,
        callData: // swapCallData (WBNB, USDC, 100, 1000000000000000, 88663212035477847, 0xExecutor, 180, false)
        value: 0n, // No value
    }
]

availableAmount = scaledHopExpectedOut // 891087558145506007 (0.891087558145506007 USDC) (No slippage applied)

## Part 3: Loop Iteration Part 2 (USDC -> USDT)

Source (`index = 1`)
```json
    {
        "dexId": "uniswap-v3",
        "poolAddress": "0x2C3c320D49019D4f9A92352e947c7e5AcFE47D68",
        "feeTier": 100,
        "amountIn": "891087558145506007", // 0.891 USDC
        "amountOut": "892123466679174522", // 0.892 USDT
        "reserves": { ... }
    }
```

```js
const availableAmount = 891087558145506007 // (Output from previous hop)
const quotedHopAmountIn = source.amountIn // 891087558145506007
let hopAmountIn = availableAmount // 891087558145506007 (USDC)

// --- Interhop Buffer Logic ---
// interhopBufferBps = 10
if (index > 0 && interhopBufferBps > 0) {
   // buffer = (891087558145506007 * 10) / 10000 = 891087558145506
   const buffer = 891087558145506n 
   hopAmountIn -= buffer 
   // hopAmountIn = 891087558145506007 - 891087558145506 
   // NEW hopAmountIn = 890196470587360501
}
// -----------------------------

const isLastHop = index === quote.sources.length - 1 // True
const hopRecipient = (isLastHop && !useNativeOutput) ? recipient : executorAddress 
// hopRecipient = recipient (User's Wallet Address)

const hopExpectedOut = source.amountOut // 892123466679174522 (USDT)
const scaledHopExpectedOut = (hopExpectedOut * hopAmountIn) / quotedHopAmountIn
// scaledHopExpectedOut = (892123466679174522 * 890196470587360501) / 891087558145506007
// NEW scaledHopExpectedOut = 891231343212495347 (USDT)
```

**Slippage Calculation (Final Hop)**
```js
const hopMinOut = this.deriveHopMinOut(
    scaledHopExpectedOut, 
    amountOutMin, // 887662849345778650
    quote.amountOut, 
    isLastHop // True
)
// Since isLastHop is True, it returns amountOutMin directly!
// hopMinOut = 887662849345778650 (0.8876 USDT)
```

**Approvals & Call Data**
```js
const isIntermediateHop = index > 0 // True
const approvalAmount = maxUint256 // "0xfff..." 

approvals.push({
    token: USDC, 
    spender: UniswapRouter,
    amount: maxUint256, // We approve infinite because we don't know exact dynamic amount
    revokeAfter: true
})

const swapCallData = this.encodeV3SingleHopCall(..., hopMinOut, ...)
// (USDC, USDT, 100, 891087558145506007, 887662849345778650, Recipient, ...)
```

**Injection Logic (CRITICAL)**
```js
const isInjectionNeeded = index > 0 // True!
const injectToken = isInjectionNeeded ? tokenIn.address : '0x00...' 
// injectToken = USDC Address (0x8AC7...)

let injectOffset = 0n
// For Standard V3 exactInputSingle, amountIn is at offset 164
injectOffset = 164n 
```

> **Note: What is "Injection"? (The "Auto-Fill" Logic)**
>
> Think of this like "Auto-filling" a form with your current balance.
>
> 1.  **The Predicament:**
>     We calculated off-chain that we *should* get `...007` USDC.
>     But broadly speaking, prices shift every millisecond. When the transaction hits the blockchain, we might actually receive `...006` or `...008` USDC.
>
> 2.  **The Risk:**
>     If we hard-code "Swap `...007` USDC" but only receive `...006`, the transaction **FAILS** (insufficient funds).
>
> 3.  **The Solution (Injection):**
>     We send a precise instruction: *"Ignore the number I wrote. Check your **Token Balance** right now, and **Fill in the Blank** with that exact number."*
>
>     *   `injectToken`: "Check balance of this token (USDC)"
>     *   `injectOffset`: "Write the balance at this position in the data"


**Executor Call Push**
```js
const plannedCall = {
  target: dex.routerAddress, 
  value: 0n,
  data: swapCallData, // Note: The 'amountIn' inside here uses the QUOTED amount, but Executor will OVERWRITE it.
  injectToken: USDC, // 0x8AC7...
  injectOffset: 164n, // Overwrite the amountIn parameter at byte 164
}

executorCalls.push(plannedCall)

// tokensToFlush logic
tokensToFlush.add(USDC) // Input token
if (hopRecipient === executorAddress) { // False (goes to User)
    tokensToFlush.add(USDT) 
}
// So we do NOT flush USDT (it's already in User's wallet)
```

## Part 4: The "Magic" Inside the Smart Contract

You are 100% correct! The TypeScript code above just **plans** the transaction (creating the instructions).
The **Executor Smart Contract** (Solidity) is the one that actually **changes** the data on-chain.

Here is the Pseudocode of what happens inside `AEQUI_EXECUTOR.sol`:

```solidity
function execute(Call[] calls) {
    for (int i = 0; i < calls.length; i++) {
        Call memory currentCall = calls[i];

        // 1. Check if Injection is needed
        if (currentCall.injectToken != address(0)) {
            // 2. Get the ACTUAL balance of the token currently held by this contract
            // (e.g. Check USDC Balance -> returns 891087558145506009)
            uint256 realBalance = IERC20(currentCall.injectToken).balanceOf(address(this));

            // 3. OVERWRITE the callData with this real balance
            // "Go to byte #164 in the hex data and REPLACE the old number with realBalance"
            // This effectively changes "amountIn" for the Uniswap call
            overwrite(currentCall.data, currentCall.injectOffset, realBalance);
        }

        // 4. Execute the swap with the MODIFIED data
        (bool success, ) = currentCall.target.call(currentCall.data);
    }
}
```

**Summary:**
*   **Off-Chain (JS):** We send a "Template" with a placeholder number.
*   **On-Chain (Solidity):** The contract "Fills in the Blank" with the real money it holds.

## Final State (After All Loops)

Here is exactly what the arrays look like at the end of the process:

### 1. `executorCalls` (The detailed plan)
```javascript
[
  // Hop 1: WBNB -> USDC
  {
    target: "0x123...Router", 
    value: 0n,
    data: "0x...(exactInputSingle WBNB->USDC 0.001)...",
    injectToken: "0x0000000000000000000000000000000000000000", // No injection
    injectOffset: 0n
  },
  // Hop 2: USDC -> USDT
  {
    target: "0x123...Router",
    value: 0n,
    data: "0x...(exactInputSingle USDC->USDT 0.891)...", // Placeholder Amount
    injectToken: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC Address
    injectOffset: 164n // Instruction to overwrite
  }
]
```

### 2. `tokensToFlush` (Leftovers cleanup)
```javascript
[
  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB (Input)
  "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"  // USDC (Intermediate)
  // Note: USDT is NOT here because it was sent to the user!
]
```

### 3. `calls` (Simplified for execution)
```javascript
[
  {
    target: "0x123...Router",
    allowFailure: false,
    callData: "0x...(WBNB->USDC)...",
    value: 0n
  },
  {
    target: "0x123...Router",
    allowFailure: false,
    callData: "0x...(USDC->USDT)...",
    value: 0n
  }
]
```

## Part 5: Native Tokens (ETH/BNB) & The `0xEeee...` Convention

You asked about **"0xEeeeeEeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"**.

### 1. What is it?
The Ethereum Virtual Machine (EVM) only understands **ERC20 Tokens** for standard swaps (like Uniswap). It does *not* natively understand ETH in the same way.
*   **0xEeeee...** is a "Fake Address" (Sentinel) used universally by apps (like 1inch, Uniswap Frontend, and us) to say: **"This is NATIVE ETH/BNB"**.
*   It serves as a flag. If `tokenIn === 0xEeee...`, we know we must **WRAP** it first.

### 2. The Strategy: "Everything is WETH"
Our Swapper **only swamps ERC20s**.
*   **Input is ETH?** -> We convert it to WETH -> Swap WETH -> Target.
*   **Output is ETH?** -> We swap Input -> WETH -> Convert WETH to ETH.

### 3. How the Code Handles It
Based on `swap-builder.ts`:

**If Input is Native (`useNativeInput: true`):**
The Executor automatically prepends a call to **deposit** (Wrap).
```javascript
// From swap-builder.ts
const wrapCall = {
    target: "0xWETH_Address", // e.g. WBNB
    data: "deposit()",        // "Here is ETH, give me WETH"
    value: amountIn           // The actual ETH sent
}
executorCalls.push(wrapCall)  // Step 1: Wrap
```

**If Output is Native (`useNativeOutput: true`):**
The Executor automatically appends a call to **withdraw** (Unwrap).
```javascript
// From swap-builder.ts
const unwrapCall = {
    target: "0xWETH_Address", // e.g. WBNB
    data: "withdraw(0)",      // "Take all my WETH..."
    injectToken: "0xWETH",    
    injectOffset: 4n          // "...and give me back ETH"
}
executorCalls.push(unwrapCall) // Final Step: Unwrap
```

**Sepolia ETH?**
The logic is identical!
*   **Bsc:** Native = BNB, Wrapped = WBNB.
*   **Sepolia:** Native = SepoliaETH, Wrapped = WETH (Sepolia Version).
Using `0xEeee...` signals the code to look up the correct "Wrapped" address for that specific chain.

## Part 6: The Final Push
```javascript
const client = await chainClientProvider.getClient(chain)
// ...
if (transaction.call) {
    try {
        estimatedGas = await client.estimateGas({
            // ...
        })
        estimatedGas = (estimatedGas * 120n) / 100n
    } catch (gasError) { ... }
}
```

### 1. Why Estimate Gas "Again"??

*   **Quote Estimate (Previous):** That was just a **Rough Guess** based on "Typical Cost of a V3 Swap" (e.g. 130k gas). We used it to *rank* which route is cheaper.
*   **Final Estimate (This One):** This is a **Real Simulation**.
    *   We call `eth_estimateGas` on the RPC node.
    *   The node *actually attempts to run* your transaction on the current block.
    *   If the transaction would revert (e.g. Slippage too high, not enough funds), this line **THROWS AN ERROR**.
    *   **Purpose:** To prevent the user from signing a broken transaction.

### 2. The Formula: `(estimatedGas * 120n) / 100n`

This adds a **+20% Buffer**.

**Use Case:**
`eth_estimateGas` tells you the exact cost *Right Now* (Block #100).
But your transaction will be mined *In the Future* (Block #101 or #102).

**Why do we need a 20% Buffer? (For what?)**

The most common reason is **"Crossing a Tick"** in Uniswap V3.

1.  **Estimation Moment:** The price is \$1.000. The swap stays within the current "Tick". Gas cost = **150,000**.
2.  **Execution Moment (1 block later):** Someone buys before you. Price moves to \$1.001.
3.  **The Spike:** Your swap now pushes the price across a "Tick Boundary".
    *   Initializing a new tick costs **~+25,000 EXTRA gas** (SSTORE).
4.  **The Fail:** If you set the limit to exactly 150,000, and the real cost becomes 175,000, the transaction **REVERTS** ("Out of Gas").
5.  **The Fix:** We set the limit to 180,000 (buffer).
    *   If we cross the tick, it succeeds (uses 175k).
    *   If we don't, it succeeds (uses 150k) and **refunds** the difference.


**Source?**
This is an **Industry Standard Heuristic**.
*   **MetaMask:** Defaults to using the estimate, but complex DApps always pad it.
*   **Hardhat / Foundry:** Often pad estimates in tests.
*   **Reasoning:** "It is better to refund unused gas than to fail the transaction." (Unused gas is always refunded to the user).

## Part 7: Deadlines vs. Quote Expiry

You noticed we generate **two** time-related numbers. They are completely different!

### 1. `quoteExpiresAt` (UI Freshness - 15s)
This is for the **Frontend (User Interface)**.
*   **Concept:** "This price is only fresh for 15 seconds."
*   **Why?** Crypto prices move fast. If you stare at the screen for 1 minute, the price of BNB has changed. The UI uses this timestamp to show a "Refresh Price" button or auto-refresh.
*   **Effect:** **Off-Chain only.** It doesn't stop the transaction, it just warns the user.

### 2. `deadline` (On-Chain Security - e.g. 180s)
This goes into the **Smart Contract**.
*   **Concept:** "If this transaction takes longer than 3 minutes to mine, CANCEL IT."
*   **Why?**
    1.  You sign the transaction now.
    2.  It gets stuck in the "Mempool" for 10 minutes because gas is low.
    3.  In those 10 minutes, the price crashes.
    4.  If it finally mines, you would get a bad rate.
*   **Effect:** **On-Chain protection.** The contract REVERTS if `block.timestamp > deadline`.

**Summary:**
*   **Quote TTL (15s):** "Refresh your screen, the data is old."
*   **Deadline (180s):** "Don't execute this if it's too late."






























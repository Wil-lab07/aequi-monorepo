Alright let's say 

there is user that hit endpoint 

The Chain: BNB Smart Chain (Mainnet)

http://localhost:3000/quote?chain=bsc&tokenA=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c&tokenB=0x55d398326f99059fF775485246999027B3197955&amount=0.001&slippageBps=50&version=auto

in index.ts /quote

I had knew what the tokenA and tokenB be handled

tokenA gonna get as WBNB (0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c)
tokenB gonna get as USDT (0x55d398326f99059fF775485246999027B3197955)

so the parameter to get inside getQuote gonna be like this

So it gonna comes into 
```js
    result = await quoteService.getQuote(
        chain,
        effectiveTokenA,
        effectiveTokenB,
        parsed.data.amount,
        slippage,
        routePreference,
        forceMultiHop,
    )
```

```js

    chain {
    "key": "bsc",
    "id": 56,
    "name": "BNB Smart Chain",
    "nativeCurrencySymbol": "BNB",
    "wrappedNativeAddress": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    "rpcUrls": [
        "https://binance.llamarpc.com"
    ],
    "fallbackRpcUrls": [],
    "disablePublicRpcRegistry": true,
    "viemChain": {
        "id": 56,
        "name": "BNB Smart Chain",
        "blockTime": 750,
        "nativeCurrency": {
        "decimals": 18,
        "name": "BNB",
        "symbol": "BNB"
        },
        "rpcUrls": {
        "default": {
            "http": [
            "https://56.rpc.thirdweb.com"
            ]
        }
        },
        "blockExplorers": {
        "default": {
            "name": "BscScan",
            "url": "https://bscscan.com",
            "apiUrl": "https://api.bscscan.com/api"
        }
        },
        "contracts": {
        "multicall3": {
            "address": "0xca11bde05977b3631167028862be2a173976ca11",
            "blockCreated": 15921452
        }
        }
    },
    "dexes": [
        {
        "id": "pancake-v2",
        "label": "PancakeSwap V2",
        "protocol": "pancakeswap",
        "version": "v2",
        "factoryAddress": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
        "routerAddress": "0x10ED43C718714eb63d5aA57B78B54704E256024E"
        },
        {
        "id": "pancake-v3",
        "label": "PancakeSwap V3",
        "protocol": "pancakeswap",
        "version": "v3",
        "factoryAddress": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
        "routerAddress": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
        "quoterAddress": "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
        "feeTiers": [
            100,
            500,
            2500
        ],
        "useRouter02": false
        },
        {
        "id": "uniswap-v2",
        "label": "Uniswap V2",
        "protocol": "uniswap",
        "version": "v2",
        "factoryAddress": "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
        "routerAddress": "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"
        },
        {
        "id": "uniswap-v3",
        "label": "Uniswap V3",
        "protocol": "uniswap",
        "version": "v3",
        "factoryAddress": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
        "routerAddress": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
        "quoterAddress": "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
        "feeTiers": [
            100,
            500,
            3000
        ],
        "useRouter02": true
        }
    ]
    }
    effectiveTokenA 0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c
    effectiveTokenB 0x55d398326f99059ff775485246999027b3197955
    amount 0.001
    slippage 50
    routePreference auto
    forceMultiHop true
```

**Q: Why do we need `feeTiers` in V3?**
**Answer: Because V3 allows multiple pools for the same pair.**

*   **V2 (Simple):** There is only **ONE** pool for `WBNB <> USDT`.
    *   Factory checks: `getPair(A, B)`.
    *   Result: `0x123...`

*   **V3 (Complex):** There can be **MANY** pools for `WBNB <> USDT`, separated by how much fee they charge swappers.
    *   **0.01% (Fee 100)**: For stablecoins (USDC <> USDT).
    *   **0.05% (Fee 500)**: For normal pairs (WBNB <> USDT).
    *   **0.30% (Fee 3000)**: For less liquid pairs.
    *   **1.00% (Fee 10000)**: For exotic pairs.

So when we ask the Factory, we **MUST** specify which one we want:
*   `getPool(A, B, 100)` -> Address X
*   `getPool(A, B, 500)` -> Address Y
*   `getPool(A, B, 3000)` -> Address Z

We check *all of them* because we don't know which one involves the best liquidity or price!

and then inside getQuote it will goes to this line first (Pararrel)
```js
const [tokenIn, tokenOut] = await Promise.all([
    this.tokenService.getTokenMetadata(chain, tokenInAddress),
    this.tokenService.getTokenMetadata(chain, tokenOutAddress),
])
```

and then it will hit the getMetadata
```js
  async getTokenMetadata(chain: ChainConfig, address: Address): Promise<TokenMetadata> {
    if (address.toLowerCase() === NATIVE_ADDRESS.toLowerCase()) {
      // ... returns native metadata
    }

    const normalized = getAddress(address)
    const key = this.cacheKey(chain.id, normalized)
    // ... check cache

    // ... Multicall to get symbol, name, decimals, totalSupply
    
    // ... returns metadata
  }
```

so metadata of each token (TOken A and Token B)
```js
{
    "chainId": chain.id,
    "address": normalized,
    symbol,
    name,
    "decimals": Number(decimalsRaw),
    totalSupply
}
```

and then parsedAmounttoUnits
```js
    const amountIn = parseAmountToUnits(amount, tokenIn.decimals)
    if (amountIn <= 0n) {
        throw new Error('Amount must be greater than zero')
    }
```

after that we come into this
```js
    const quote = await this.priceService.getBestQuoteForTokens(chain, tokenIn, tokenOut, amountIn, preference, forceMultiHop)
    if (!quote) {
      console.log('[QuoteService] No quote returned from PriceService')
      return null
    }

    preference here is `auto`
```

### GET BEST QUOTE FOR TOKENS

This one is the hardest one

first it come to this
```js
const allowedVersions = resolveAllowedVersions(preference) // v2 and v3
```

forceMultiHop always true

so after we know that we gonna check for multiHop (V2 and V3)
```js
const [directQuotes, multiHopQuotes] = await Promise.all([
  forceMultiHop ? Promise.resolve([]) : this.poolDiscovery.fetchDirectQuotes(chain, tokenIn, tokenOut, amountIn, gasPriceWei, client, allowedVersions),
  this.poolDiscovery.fetchMultiHopQuotes(chain, tokenIn, tokenOut, amountIn, gasPriceWei, client, allowedVersions),
])
```

Here is where the magic happens. We split into two parallel tasks:

1.  **Direct Quotes** (`fetchDirectQuotes`):
    *   This looks for a **direct pool** between Token A and Token B.
    *   Examples: `WBNB/USDT V2 Pair` or `WBNB/USDT V3 Pool`.
    *   If `forceMultiHop` is true (as in your case), we SKIP this and return an empty array `[]` immediately to save time, because you explicitly asked for multi-hop-only logic (or maybe debugging/testing multi-hop).

2.  **Multi-Hop Quotes** (`fetchMultiHopQuotes`):
    *   This tries to find a path like: **Token A -> Intermediate -> Token B**.
    *   It uses a list of "Base Assets" or "Intermediate Tokens" configured for the chain (e.g., WBNB, USDT, USDC, ETH, DAI).
    *   **Step 1**: It fetches "Leg A" (Token A -> Intermediate) for *all* intermediate tokens.
        *   Example: `WBNB -> USDC` and `WBNB -> V3_Token`.
    *   **Step 2**: It fetches "Leg B" (Intermediate -> Token B) using the output amount from Leg A.
        *   Example: `USDC -> USDT`.
    *   **Step 3**: It combines them.
        *   Result: `WBNB -> USDC -> USDT`.
    *   It calculates the final price, gas cost, and liquidity score for the combined path.

### Detail that Happened in fetchDirectQuotes

#### 1. Initialize

Let's say WBNB -> USDT (so just directly WBNB -> USDT accross all dexs pool)
```js
    const factoryCalls: any[] = []
    const dexMap: { 
      type: 'v2' | 'v3'; 
      dex: DexConfig; 
      fee?: number; 
      index: number 
    }[] = []
```
then it will loop through all the dexs  
```
    "dexes": [
        {
        "id": "pancake-v2",
        "label": "PancakeSwap V2",
        "protocol": "pancakeswap",
        "version": "v2",
        "factoryAddress": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
        "routerAddress": "0x10ED43C718714eb63d5aA57B78B54704E256024E"
        },
        {
        "id": "pancake-v3",
        "label": "PancakeSwap V3",
        "protocol": "pancakeswap",
        "version": "v3",
        "factoryAddress": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
        "routerAddress": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
        "quoterAddress": "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
        "feeTiers": [
            100,
            500,
            2500
        ],
        "useRouter02": false
        },
        {
        "id": "uniswap-v2",
        "label": "Uniswap V2",
        "protocol": "uniswap",
        "version": "v2",
        "factoryAddress": "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
        "routerAddress": "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"
        },
        {
        "id": "uniswap-v3",
        "label": "Uniswap V3",
        "protocol": "uniswap",
        "version": "v3",
        "factoryAddress": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
        "routerAddress": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
        "quoterAddress": "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
        "feeTiers": [
            100,
            500,
            3000
        ],
        "useRouter02": true
        }
    ]
```

```
    chain.dexes.forEach((dex) => {
      if (!allowedVersions.includes(dex.version)) return

      if (dex.version === 'v2') {
        factoryCalls.push({
          address: dex.factoryAddress,
          abi: V2_FACTORY_ABI,
          functionName: 'getPair',
          args: [tokenIn.address, tokenOut.address],
        })
        dexMap.push({ type: 'v2', dex, index: factoryCalls.length - 1 })
      } else {
        (dex.feeTiers ?? []).forEach((fee) => {
          factoryCalls.push({
            address: dex.factoryAddress,
            abi: V3_FACTORY_ABI,
            functionName: 'getPool',
            args: [tokenIn.address, tokenOut.address, fee],
          })
          dexMap.push({ type: 'v3', dex, fee, index: factoryCalls.length - 1 })
        })
      }
    })
```
if Dex.Version === 'v2' then it will call getPair push into factoryCalls and dexMap

if Dex.Version === 'v3' then it will call getPool push into factoryCalls and dexMap

**Q: Why `index: factoryCalls.length - 1`?**

We are building two arrays in parallel:
1.  `factoryCalls`: The raw instructions for the blockchain (Ethereum/Multicall) to execute. "Go check this address".
2.  `dexMap`: Our internal notes about *who* asked for that check. "This check is for PancakeSwap V2".

**The Problem:**
When the blockchain replies, it just gives us a big list of answers: `[result1, result2, result3]`. Ideally they match 1-to-1.

**The Solution:**
*   We add a request to `factoryCalls` (Array length becomes 1).
*   We immediately save `dexMap` saying: "The item at **index 0** (length - 1) belongs to PancakeSwap."
*   Later, when we get `results[0]`, we look at `dexMap` to know: "Ah, this result is for PancakeSwap!"

It links the **request** to the **metadata**.

**Visual Walkthrough (Example):**

Imagine checking WBNB -> USDT.

**Step 1: Check PancakeSwap V2**
*   `factoryCalls.push(getPair...)`. **Length is now 1**.
*   `dexMap.push({ dex: 'PancakeV2', index: 1 - 1 = 0 })`.

**State:**
*   `factoryCalls`: `[ Check_PancakeV2 ]`
*   `dexMap`: `[ { dex: 'PancakeV2', index: 0 } ]`

**Step 2: Check PancakeSwap V3 (Fee 100)**
*   `factoryCalls.push(getPool 100...)`. **Length is now 2**.
*   `dexMap.push({ dex: 'PancakeV3_100', index: 2 - 1 = 1 })`.

**State:**
*   `factoryCalls`: `[ Check_PancakeV2, Check_PancakeV3_100 ]`
*   `dexMap`: `[ { dex: 'PancakeV2', index: 0 }, { dex: 'PancakeV3_100', index: 1 } ]`

**Step 3: Check PancakeSwap V3 (Fee 500)**
*   `factoryCalls.push(getPool 500...)`. **Length is now 3**.
*   `dexMap.push({ dex: 'PancakeV3_500', index: 3 - 1 = 2 })`.

**Later, when Multicall Results come back:**
`results = [ Result_A, Result_B, Result_C ]`

*   We look at `dexMap[0]`. Index is 0. -> `Result_A` is for PancakeV2.
*   We look at `dexMap[1]`. Index is 1. -> `Result_B` is for PancakeV3 (100).
*   We look at `dexMap[2]`. Index is 2. -> `Result_C` is for PancakeV3 (500).

[PoolDiscovery] Fetching direct quotes for WBNB -> USDT (Amount: 1000000000000000)

Dex map
```json
[
  {
    "type": "v2",
    "dex": {
      "id": "pancake-v2",
      "label": "PancakeSwap V2",
      "protocol": "pancakeswap",
      "version": "v2",
      "factoryAddress": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
      "routerAddress": "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    },
    "index": 0
  },
  {
    "type": "v3",
    "dex": {
      "id": "pancake-v3",
      "label": "PancakeSwap V3",
      "protocol": "pancakeswap",
      "version": "v3",
      "factoryAddress": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
      "routerAddress": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
      "quoterAddress": "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      "feeTiers": [
        100,
        500,
        2500
      ],
      "useRouter02": false
    },
    "fee": 100,
    "index": 1
  },
  {
    "type": "v3",
    "dex": {
      "id": "pancake-v3",
      "label": "PancakeSwap V3",
      "protocol": "pancakeswap",
      "version": "v3",
      "factoryAddress": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
      "routerAddress": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
      "quoterAddress": "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      "feeTiers": [
        100,
        500,
        2500
      ],
      "useRouter02": false
    },
    "fee": 500,
    "index": 2
  },
  {
    "type": "v3",
    "dex": {
      "id": "pancake-v3",
      "label": "PancakeSwap V3",
      "protocol": "pancakeswap",
      "version": "v3",
      "factoryAddress": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
      "routerAddress": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
      "quoterAddress": "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      "feeTiers": [
        100,
        500,
        2500
      ],
      "useRouter02": false
    },
    "fee": 2500,
    "index": 3
  },
  {
    "type": "v2",
    "dex": {
      "id": "uniswap-v2",
      "label": "Uniswap V2",
      "protocol": "uniswap",
      "version": "v2",
      "factoryAddress": "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
      "routerAddress": "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"
    },
    "index": 4
  },
  {
    "type": "v3",
    "dex": {
      "id": "uniswap-v3",
      "label": "Uniswap V3",
      "protocol": "uniswap",
      "version": "v3",
      "factoryAddress": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
      "routerAddress": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
      "quoterAddress": "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
      "feeTiers": [
        100,
        500,
        3000
      ],
      "useRouter02": true
    },
    "fee": 100,
    "index": 5
  },
  {
    "type": "v3",
    "dex": {
      "id": "uniswap-v3",
      "label": "Uniswap V3",
      "protocol": "uniswap",
      "version": "v3",
      "factoryAddress": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
      "routerAddress": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
      "quoterAddress": "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
      "feeTiers": [
        100,
        500,
        3000
      ],
      "useRouter02": true
    },
    "fee": 500,
    "index": 6
  },
  {
    "type": "v3",
    "dex": {
      "id": "uniswap-v3",
      "label": "Uniswap V3",
      "protocol": "uniswap",
      "version": "v3",
      "factoryAddress": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
      "routerAddress": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
      "quoterAddress": "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
      "feeTiers": [
        100,
        500,
        3000
      ],
      "useRouter02": true
    },
    "fee": 3000,
    "index": 7
  }
]

Factory calls 
```json
[
  {
    "address": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
    "abi": [
      {
        "type": "function",
        "name": "getPair",
        "stateMutability": "view",
        "inputs": [
          {
            "name": "tokenA",
            "type": "address"
          },
          {
            "name": "tokenB",
            "type": "address"
          }
        ],
        "outputs": [
          {
            "name": "pair",
            "type": "address"
          }
        ]
      }
    ],
    "functionName": "getPair",
    "args": [
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "0x55d398326f99059fF775485246999027B3197955"
    ]
  },
  {
    "address": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    "abi": [
      {
        "type": "function",
        "name": "getPool",
        "stateMutability": "view",
        "inputs": [
          {
            "name": "tokenA",
            "type": "address"
          },
          {
            "name": "tokenB",
            "type": "address"
          },
          {
            "name": "fee",
            "type": "uint24"
          }
        ],
        "outputs": [
          {
            "name": "pool",
            "type": "address"
          }
        ]
      }
    ],
    "functionName": "getPool",
    "args": [
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "0x55d398326f99059fF775485246999027B3197955",
      100
    ]
  },
  {
    "address": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    "abi": [
      {
        "type": "function",
        "name": "getPool",
        "stateMutability": "view",
        "inputs": [
          {
            "name": "tokenA",
            "type": "address"
          },
          {
            "name": "tokenB",
            "type": "address"
          },
          {
            "name": "fee",
            "type": "uint24"
          }
        ],
        "outputs": [
          {
            "name": "pool",
            "type": "address"
          }
        ]
      }
    ],
    "functionName": "getPool",
    "args": [
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "0x55d398326f99059fF775485246999027B3197955",
      500
    ]
  },
  {
    "address": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    "abi": [
      {
        "type": "function",
        "name": "getPool",
        "stateMutability": "view",
        "inputs": [
          {
            "name": "tokenA",
            "type": "address"
          },
          {
            "name": "tokenB",
            "type": "address"
          },
          {
            "name": "fee",
            "type": "uint24"
          }
        ],
        "outputs": [
          {
            "name": "pool",
            "type": "address"
          }
        ]
      }
    ],
    "functionName": "getPool",
    "args": [
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "0x55d398326f99059fF775485246999027B3197955",
      2500
    ]
  },
  {
    "address": "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
    "abi": [
      {
        "type": "function",
        "name": "getPair",
        "stateMutability": "view",
        "inputs": [
          {
            "name": "tokenA",
            "type": "address"
          },
          {
            "name": "tokenB",
            "type": "address"
          }
        ],
        "outputs": [
          {
            "name": "pair",
            "type": "address"
          }
        ]
      }
    ],
    "functionName": "getPair",
    "args": [
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "0x55d398326f99059fF775485246999027B3197955"
    ]
  },
  {
    "address": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
    "abi": [
      {
        "type": "function",
        "name": "getPool",
        "stateMutability": "view",
        "inputs": [
          {
            "name": "tokenA",
            "type": "address"
          },
          {
            "name": "tokenB",
            "type": "address"
          },
          {
            "name": "fee",
            "type": "uint24"
          }
        ],
        "outputs": [
          {
            "name": "pool",
            "type": "address"
          }
        ]
      }
    ],
    "functionName": "getPool",
    "args": [
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "0x55d398326f99059fF775485246999027B3197955",
      100
    ]
  },
  {
    "address": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
    "abi": [
      {
        "type": "function",
        "name": "getPool",
        "stateMutability": "view",
        "inputs": [
          {
            "name": "tokenA",
            "type": "address"
          },
          {
            "name": "tokenB",
            "type": "address"
          },
          {
            "name": "fee",
            "type": "uint24"
          }
        ],
        "outputs": [
          {
            "name": "pool",
            "type": "address"
          }
        ]
      }
    ],
    "functionName": "getPool",
    "args": [
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "0x55d398326f99059fF775485246999027B3197955",
      500
    ]
  },
  {
    "address": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7", // Pancake V3 Factory
    "abi": [
      {
        "type": "function",
        "name": "getPool",
        "stateMutability": "view",
        "inputs": [
          {
            "name": "tokenA",
            "type": "address"
          },
          {
            "name": "tokenB",
            "type": "address"
          },
          {
            "name": "fee",
            "type": "uint24"
          }
        ],
        "outputs": [
          {
            "name": "pool",
            "type": "address"
          }
        ]
      }
    ],
    "functionName": "getPool",
    "args": [
      "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      "0x55d398326f99059fF775485246999027B3197955",
      3000
    ]
  }
]
```

#### 2. Fetch Multicall Results
```js
    const factoryResults = await client.multicall({
      allowFailure: true,
      contracts: factoryCalls, // get pool addresses from each factory
    })
```

**Q: Is it from `viem`?**
**Answer: YES.**
*   `client` is a `PublicClient` from the **viem** library.
*   `multicall` is a built-in feature of viem.

**Q: What does it do?**
*   Instead of sending 8 separate requests to the blockchain (slow 🐢), it sends **1 big request** (fast 🐇).
*   It asks the blockchain: "Hey, run these 8 functions for me and give me all the answers at once."
*   `allowFailure: true`: This means if one check fails (e.g. error in Pancake V3), it won't crash the whole batch. It will just return `success: false` for that one item.

#### Factory results (`factoryResults`)

```json
[{"result":"0xEc6557348085Aa57C72514D67070dC863C0a5A8c","status":"success"},{"result":"0x92b7807bF19b7DDdf89b706143896d05228f3121","status":"success"},{"result":"0x4f31Fa980a675570939B737Ebdde0471a4Be40Eb","status":"success"},{"result":"0x5F69c87e3Ed60d6b6B544C16F0072Cd4A72Ad13C","status":"success"},{"result":"0x6ab0Ae46c4B450bc1B4ffCaA192b235134d584B2","status":"success"},{"result":"0x2C3c320D49019D4f9A92352e947c7e5AcFE47D68","status":"success"},{"result":"0xcCDFcd1aaC447D5B29980f64b831c532a6a33726","status":"success"},{"result":"0x18fC1E95aDb68B556212ebBAD777F3FBb644db98","status":"success"}]
```

**Q: If it failed, will the result be `""` or empty?**
**Answer: No, the structure changes!**

**Q: If a DEX doesn't have the pool, is it `status: "failure"`?**
**Answer: NO! This is a common confusion.**

If you ask Uniswap Factory: *"Do you have WBNB-UnknownCoin?"*
*   It does **NOT** crash (Revert).
*   It answers politely: *"I have no record of that."* (Returns `0x00000000...`).

So the result looks like this:
```json
{
  "status": "success", 
  "result": "0x0000000000000000000000000000000000000000"
}
```
**This is why we check `result !== ZERO_ADDRESS`!**

**When do we get `status: "failure"`?**
Only if something is **broken**.
*   Example 1: The Factory address is wrong (calling a wallet instead of a contract).
*   Example 2: The Node/RPC is having issues.

```json
{
  "status": "failure",
  "error": "Execution reverted",
  "result": undefined 
}
```

So:
1.  **Missing Pool** = `success` + `0x000...`
2.  **Broken Call** = `failure` + `error`

#### 3. Process Results
After get the results, we push into v2Pools or v3Pools 

```js
    const poolsByType: {
      v2Pools: { poolAddress: Address; dex: DexConfig }[]
      v3Pools: { poolAddress: Address; dex: DexConfig; fee: number }[]
    } = { v2Pools: [], v3Pools: [] }

    dexMap.forEach((item) => {
      const result = factoryResults[item.index]
      if (!result || result.status !== 'success' || !result.result || result.result === ZERO_ADDRESS) return

      const poolAddress = result.result as Address

      if (item.type === 'v2') {
        poolsByType.v2Pools.push({ poolAddress, dex: item.dex })
      } else {
        poolsByType.v3Pools.push({ poolAddress, dex: item.dex, fee: item.fee! })
      }
    })
```

```json
V2Pool disini
[
  {
    "poolAddress": "0x7EFaEf62fDdCCa950418312c6C91Aef321375A00",
    "dex": {
      "id": "pancake-v2",
      "label": "PancakeSwap V2",
      "protocol": "pancakeswap",
      "version": "v2",
      "factoryAddress": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
      "routerAddress": "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    }
  },
  {
    "poolAddress": "0xe25C17d6988E9dAE3057be5977CE1bC614DD21C2",
    "dex": {
      "id": "uniswap-v2",
      "label": "Uniswap V2",
      "protocol": "uniswap",
      "version": "v2",
      "factoryAddress": "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
      "routerAddress": "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"
    }
  }
]

v3Pool disini
[
  {
    "poolAddress": "0x4f3126d5DE26413AbDCF6948943FB9D0847d9818",
    "dex": {
      "id": "pancake-v3",
      "label": "PancakeSwap V3",
      "protocol": "pancakeswap",
      "version": "v3",
      "factoryAddress": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
      "routerAddress": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
      "quoterAddress": "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      "feeTiers": [
        100,
        500,
        2500
      ],
      "useRouter02": false
    },
    "fee": 100
  },
  {
    "poolAddress": "0x1625F94b9185c028733e3Eb41c8203b6b8A11729",
    "dex": {
      "id": "pancake-v3",
      "label": "PancakeSwap V3",
      "protocol": "pancakeswap",
      "version": "v3",
      "factoryAddress": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
      "routerAddress": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
      "quoterAddress": "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      "feeTiers": [
        100,
        500,
        2500
      ],
      "useRouter02": false
    },
    "fee": 500
  },
  {
    "poolAddress": "0xB2d25F062a88dB40861007B07E10549772272B0B",
    "dex": {
      "id": "pancake-v3",
      "label": "PancakeSwap V3",
      "protocol": "pancakeswap",
      "version": "v3",
      "factoryAddress": "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
      "routerAddress": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
      "quoterAddress": "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      "feeTiers": [
        100,
        500,
        2500
      ],
      "useRouter02": false
    },
    "fee": 2500
  },
  {
    "poolAddress": "0xC98f01bf2141E1140EF8F8caD99D4b021d10718f",
    "dex": {
      "id": "uniswap-v3",
      "label": "Uniswap V3",
      "protocol": "uniswap",
      "version": "v3",
      "factoryAddress": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
      "routerAddress": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
      "quoterAddress": "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
      "feeTiers": [
        100,
        500,
        3000
      ],
      "useRouter02": true
    },
    "fee": 100
  },
  {
    "poolAddress": "0x84E47c7f2fe86f6B5eFBe14feE46B8bb871B2E05",
    "dex": {
      "id": "uniswap-v3",
      "label": "Uniswap V3",
      "protocol": "uniswap",
      "version": "v3",
      "factoryAddress": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
      "routerAddress": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
      "quoterAddress": "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
      "feeTiers": [
        100,
        500,
        3000
      ],
      "useRouter02": true
    },
    "fee": 500
  },
  {
    "poolAddress": "0x872d049C981044D6939dE9E571F2175f823B65c4",
    "dex": {
      "id": "uniswap-v3",
      "label": "Uniswap V3",
      "protocol": "uniswap",
      "version": "v3",
      "factoryAddress": "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
      "routerAddress": "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
      "quoterAddress": "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
      "feeTiers": [
        100,
        500,
        3000
      ],
      "useRouter02": true
    },
    "fee": 3000
  }
]
```

#### 4. Fetch V2 Pools Data (Deep Dive)

```js
  const v2Addresses = poolsByType.v2Pools.map((p) => p.poolAddress)
  console.log(`[PoolDiscovery] Using AequiLens batch for ${v2Addresses.length} V2 pools`)
  const batchResult = await client.readContract({
    address: lensAddress,
    abi: AEQUI_LENS_ABI,
    functionName: 'batchGetV2PoolData',
    args: [v2Addresses],
  })
```

**Q: How does the contract read work?**
`client.readContract` is a standard way to call a **"View Function"** on a smart contract.
*   **View Function**: It reads data from the blockchain without changing anything (so it's free, no gas cost for the caller, just RPC limits).
*   **Lens Address**: This is a special custom contract deployed by Aequi.
    *   It is a **"Helper Contract"** or **"Lens Contract"**.
    *   Its only job is to go fetch data from *other* contracts and bundle it up.

**Q: What does `AEQUI_LENS` look like?**
It's a smart contract that basically loops through the addresses you give it.
a

**Q: What data do we get?**
According to the ABI (`batchGetV2PoolData`), for *each* pool we get a Struct/Tuple containing:
1.  `pairAddress` (address): Just to confirm which pool this is.
2.  `token0` (address): The first token in the pair (e.g. WBNB).
3.  `token1` (address): The second token in the pair (e.g. USDT).
4.  `reserve0` (uint112): **The Amount of Token0** currently sitting in the pool.
5.  `reserve1` (uint112): **The Amount of Token1** currently sitting in the pool.
6.  `blockTimestampLast` (uint32): When was the last trade? (Useful for oracles).
7.  `exists` (bool): Did we find the pool?

**Why is this Critical?**
To calculate the price in V2 (Constant Product `x * y = k`), we **NEED** `reserve0` and `reserve1`.
*   If Reserve0 = 10 WBNB
*   If Reserve1 = 3000 USDT
*   Price = 300 USDT per WBNB.

#### Fetch V2 Pools Data (Solidity Deep Dive)

```solidity
    function batchGetV2PoolData(address[] calldata pairs) external view returns (V2PoolData[] memory) {
        // ... (as shared above)
            try IPairV2(pair).getReserves() returns ( ... ) {
                try IPairV2(pair).token0() returns (address token0) {
                     // ...
                } catch { results[i].exists = false; }
            } catch { results[i].exists = false; }
        // ...
    }
```

**Q: I just know we can try catch in solidity, is it valid? how about gas?**
**Answer: YES, it is valid since Solidity 0.6.0!**
*   **Validity**: It works exactly for this purpose: checking external calls that might revert/fail.
*   **Gas**:
    *   `try/catch` **uses slightly more gas** than a direct call because the EVM has to set up a "checkpoint" to return to if things fail.
    *   **BUT**: Since this is a `view` function called **off-chain** (via `client.readContract`), **gas does not cost money**. It only uses the node's computation power. So it's free for you!

**Q: How it can have double try (nested)?**
**Answer: To be extra safe against partial failures.**
A pool needs 3 things to be valid: `Reserves` + `Token0` + `Token1`.

**Scenario Example: The "Traps"**

Imagine we send `[Pool_A, Pool_B]` to this function.

**1. Pool_A (The Golden Pool)**
*   `pool.code.length > 0`? **YES**.
*   **Try 1**: `getReserves()`? **Success** (Returns 100 BNB, 500 USDT). -> *Proceed inside*.
*   **Try 2**: `token0()`? **Success** (Returns WBNB address). -> *Proceed inside*.
*   **Try 3**: `token1()`? **Success** (Returns USDT address). -> *Proceed inside*.
*   **Final Result**: We save the full `V2PoolData` object. `exists = true`.

**2. Pool_B (The "Fake" Token Pool)**
*   Someone deployed a contract that *looks* like a pair but is broken.
*   `pool.code.length > 0`? **YES**.
*   **Try 1**: `getReserves()`? **Success** (It returns fake reserves). -> *Proceed inside*.
*   **Try 2**: `token0()`? **FAIL / REVERT!** (Maybe the contract doesn't have a `token0` function).
*   **Catch (Inner)**: The code jumps to `catch { results[i].exists = false; }`.
*   **Final Result**: `exists = false`.

**Why Nested?**
If we didn't nest them, a failure in `token0()` would crash the whole fetch for `token1()`. By failing specifically at each step, we ensure **atomic validation**: All 3 must succeed, or the pool is marked invalid.

#### 5. Fetch V3 Pools Data (Solidity Deep Dive)

```solidity
    function batchGetV3PoolData(address[] calldata pools) external view returns (V3PoolData[] memory) {
        V3PoolData[] memory results = new V3PoolData[](pools.length);
        
        for (uint256 i = 0; i < pools.length; i++) {
            address pool = pools[i];
            results[i].poolAddress = pool;
            
            if (pool.code.length == 0) {
                results[i].exists = false;
                continue;
            }

            // The "External Call" Trick
            try this.getV3PoolDataSingle(pool) returns (V3PoolData memory data) {
                results[i] = data;
            } catch {
                results[i].exists = false;
            }
        }
        return results;
    }
```

**Q: Why called `this.getV3PoolDataSingle`? Why not just call it directly?**
**Answer: Because `try-catch` ONLY works on EXTERNAL calls.**

*   In Solidity, you **cannot** do `try internalFunction()`.
*   So we cheat! The contract calls **ITSELF** (`this.something`).
*   This forces the EVM to treat it as a new external call, which allows us to wrap it in `try-catch`.

**Q: What happens inside `getV3PoolDataSingle`?**
It collects all the V3 specific data. If **ANY ONE** of these lines fail, the whole thing reverts (and is caught by the parent).

```solidity
    function getV3PoolDataSingle(address pool) external view returns (V3PoolData memory) {
        // ...
        // 1. Get Slot0 (Price + Tick + other bits packed together)
        (uint160 sqrtPriceX96, int24 tick,,,,,) = IPoolV3(pool).slot0();
        
        // 2. Get Liquidity (How deep is the pool)
        data.liquidity = IPoolV3(pool).liquidity();

        // 3. Get Metadata
        data.token0 = IPoolV3(pool).token0();
        data.token1 = IPoolV3(pool).token1();
        data.fee = IPoolV3(pool).fee();
        
        data.exists = true;
        return data;
    }
```

**What is `slot0`?**
*   Storage in Ethereum is expensive (Gas!!).
*   Uniswap V3 packs the most important variables (Price, Tick, Unlock Status, etc.) into **one single storage slot** called `slot0`.
**Q: Why does V2 use nested try-catch, but V3 looks simpler?**
**Answer: You are 100% Correct. It's a Design Choice to avoid "Callback Hell".**

**The V2 Problem (Nested)**
*   V2 needs 3 things: `Reserves`, `Token0`, `Token1`.
*   So we need 3 layers of nesting. It looks ugly (`try { try { try { ... } } }`), but it's manageable.

**The V3 Problem (Too Many Calls)**
*   V3 needs **5 things**: `slot0`, `liquidity`, `token0`, `token1`, `fee`.
*   If we used the V2 style, the code would look like a pyramid of doom:
    ```solidity
    try slot0() {
        try liquidity() {
            try token0() {
                 try token1() {
                      try fee() {
                          // Finally success!
                      } catch {}
                 } catch {}
            } catch {}
        } catch {}
    } catch {}
    ```
*   **That is unreadable!** 🤮

**The V3 Solution (Wrapper Pattern)**
*   Instead of checking every step individually, we bundle them into **one function** `getV3PoolDataSingle`.
*   If **ANY** of those 5 lines fails inside the wrapper, the *whole wrapper* fails.
*   The parent just catches that single failure.
### Fallback Logic (When Lens Fails)

**Q: "V2 only logs, but V3 has a huge fallback code?"**
**Answer: YES, YOU ARE CORRECT!**
*   **V2**: If the V2 Lens call fails, the `catch` block **only logs a warning**.
    *   Result: `v2PoolData` remains empty. We lose all V2 quotes for this round. (This looks like a potential improvement area for the code!).
*   **V3**: If the V3 Lens call fails, it explicitly **falls back to standard Multicall**.

---

#### Deep Dive: V3 Fallback Code

Since AequiLens failed, we have to do it the "Old School" way: **Querying 4 properties separately for every single pool.**

**Step 1: Prepare the Calls (`poolDataCalls`)**
We create a massive list of calls. For *each* V3 pool, we add 4 requests:
```js
poolDataCalls.push(
  { ... functionName: 'slot0' },     // Request #1
  { ... functionName: 'liquidity' }, // Request #2
  { ... functionName: 'token0' },    // Request #3
  { ... functionName: 'token1' },    // Request #4
)
```
If we have 10 pools, `multicall` will have **40 items**.

**Step 2: Map the Index (`poolMap`)**
Since the array is flat, we need to remember "Where does Pool #5 start?".
```js
poolMap.push({ 
  poolAddress: item.poolAddress, 
  dex: item.dex, 
  fee: item.fee, 
  startIndex: poolDataCalls.length - 4 // <--- CRITICAL
})
```
*   **Pool 1**: starts at index 0. (Items 0, 1, 2, 3)
*   **Pool 2**: starts at index 4. (Items 4, 5, 6, 7)
*   **Pool 3**: starts at index 8. (Items 8, 9, 10, 11)

**Step 3: Execute Multicall**
```js
const poolDataResults = await client.multicall({ ... })
```
We get back a flat array of 40 results.

**Step 4: Reassemble the Data**
We loop through our `poolMap` and grab the slices:
```js
poolMap.forEach((item) => {
  const slotRes = poolDataResults[item.startIndex]     // Index 0
  const liquidityRes = poolDataResults[item.startIndex + 1] // Index 1
  const token0Res = poolDataResults[item.startIndex + 2]    // Index 2
  const token1Res = poolDataResults[item.startIndex + 3]    // Index 3

  // Check if ALL 4 succeeded
  if (slotRes.success && liquidityRes.success && ...) {
     // Save the data!
     v3PoolData.set(...)
  }
})
```
**Q: Wait, isn't it all 1 Transaction? Why the confusing indexing?**
**Answer: Yes, it is 1 Transaction. That's exactly why!**

**Q: Can you give me a concrete example of the Reassembly?**

**Scenario:** We are checking 2 pools.
1.  **Pool A** (`0xAAAA...`) - Index 0
2.  **Pool B** (`0xBBBB...`) - Index 4

**The `poolDataResults` (Big Flat Array):**
```js
[
  // --- Pool A Data (Indices 0-3) ---
  /* 0 */ { status: 'success', result: [12345n, -100, ...] }, // slot0
  /* 1 */ { status: 'success', result: 500000n },         // liquidity
  /* 2 */ { status: 'success', result: '0xWBNB' },        // token0
  /* 3 */ { status: 'success', result: '0xUSDT' },        // token1

  // --- Pool B Data (Indices 4-7) ---
  /* 4 */ { status: 'success', result: [67890n, 20, ...] },   // slot0
  /* 5 */ { status: 'success', result: 1000n },           // liquidity
  /* 6 */ { status: 'success', result: '0xWBNB' },        // token0
  /* 7 */ { status: 'success', result: '0xETH' }          // token1
]
```

**The Loop Execution (`poolMap.forEach`):**

**Iteration 1: Pool A (`item.startIndex = 0`)**
1.  **Extract**: `slot0 = results[0]`, `liquidity = results[1]`, `token0 = results[2]`, `token1 = results[3]`.
2.  **Check Success**: Are all 4 `status: 'success'`? **YES**.
3.  **Process Data**:
    *   `slotData`: Takes `12345n` (Price) and `-100` (Tick).
    *   `liquidity`: `500000n`.
    *   `token0`: `0xWBNB`.
    *   `token1`: `0xUSDT`.
4.  **Save**: `v3PoolData.set('0xAAAA', { price: ..., liquidity: ... })`.

**Iteration 2: Pool B (`item.startIndex = 4`)**
1.  **Extract**: `slot0 = results[4]`, `liquidity = results[5]`, `token0 = results[6]`, `token1 = results[7]`.
2.  **Check Success**: Are all 4 `status: 'success'`? **YES**.
3.  **Process Data**: Similar to above.
4.  **Save**: `v3PoolData.set('0xBBBB', { ... })`.

This effectively "re-groups" the scattered data back into nice, clean objects for each pool.

#### Deep Dive: Price Quote

```js
const quotes: PriceQuote[] = []
const v3Candidates: { dex: DexConfig; snapshot: V3PoolSnapshot }[] = []

for (const item of poolsByType.v2Pools) {
  try {
    const poolData = v2PoolData.get(item.poolAddress)
    if (!poolData || !poolData.success) continue

    const reserveIn = sameAddress(poolData.token0, tokenIn.address)
      ? poolData.reserve0
      : poolData.reserve1
    const reserveOut = sameAddress(poolData.token0, tokenIn.address)
      ? poolData.reserve1
      : poolData.reserve0

    if (reserveIn < this.config.minV2ReserveThreshold || reserveOut < this.config.minV2ReserveThreshold) {
      continue
    }

    const adapter = dexRegistry.get(item.dex.protocol, 'v2')
    if (!adapter) {
      console.warn(`[PoolDiscovery] No adapter found for ${item.dex.protocol} V2`)
      continue
    }

    const quote = await adapter.computeV2Quote!({
      chainId: chain.id,
      chainKey: chain.key,
      dex: item.dex,
      tokenIn,
      tokenOut,
      amountIn,
      poolAddress: item.poolAddress,
      reserve0: poolData.reserve0,
      reserve1: poolData.reserve1,
      token0: poolData.token0,
      gasPriceWei,
      minReserveThreshold: this.config.minV2ReserveThreshold,
    })

    if (quote) {
      quotes.push(quote)
    }
  } catch (error) {
    console.warn(`[PoolDiscovery] Error processing V2 pool ${item.poolAddress}:`, (error as Error).message)
  }
}
```
#### 5. V3 Discovery: "Candidates" & Parallel Execution

**Q: Why `v3Candidates`? Why is the structure different from V2?**
**Answer: Because V3 quotes are "Expensive" (Network Calls), while V2 quotes are "Cheap" (Local Math).**

*   **V2 Process (Local)**:
    1.  Get Reserves.
    2.  Run `x * y = k` on your CPU (Microsecond).
    3.  Loop is fine because it's instant.

*   **V3 Process (Network)**:
    1.  Get Slot0/Liquidity.
    2.  **Filter**: We create a list of "Candidates" (Promising Pools). We discard empty pools immediately to save time.
    3.  **Simulation**: To get a V3 Quote, we must call the **Quoter Smart Contract** on the blockchain.
    4.  **Network Lag**: Each call is an RPC request (`client.readContract`).
    5.  **Parallelism**: If we did a loop, it would be: Request... Wait... Request... Wait... (Too slow!).
    6.  **`Promise.all`**: We fire ALL requests at once!

**The Code Pattern:**
1.  **Filter First**: `if (poolData.liquidity > threshold) v3Candidates.push()`
2.  **Map to Promises**: `v3Candidates.map(async ... call Quoter ...)`
3.  **Execute Parallel**: `await Promise.all(quotePromises)`

This architecture is optimized for speed. If we treated V3 like V2, the API would be 10x slower.

**The Problem:**
*   A Uniswap V2 Pair always stores tokens in a predictable order (usually by address: `0x0...` comes before `0x9...`).
*   Let's say `Token0` = WBNB, `Token1` = USDT.
*   The Pair has `Reserve0` (BNB pile) and `Reserve1` (USDT pile).

**The Swap:**
*   **Case A (Selling BNB):** You give BNB (`tokenIn`). So `ReserveIn` should be the BNB pile (`Reserve0`).
*   **Case B (Buying BNB):** You give USDT (`tokenIn`). So `ReserveIn` should be the USDT pile (`Reserve1`).

**The Logic:**
*   "Is `Token0` the token I am selling?" (`sameAddress(poolData.token0, tokenIn)`)
*   **Yes?** -> Then `Reserve0` is my Input Reserve.
*   **No?** -> Then `Reserve1` is my Input Reserve.

**2. Low Liquidity Check (The "Dust" Filter)**

```js
    if (reserveIn < this.config.minV2ReserveThreshold || ...) { continue }
```

**Q: What is this for?**
**Answer: To ignore empty or "Dead" pools.**
*   If a pool has only 0.000001 BNB inside, the price will be terrible (1000% slippage).
*   We skip calculation completely to save time.

**3. The Adapter Pattern (The "Calculator")**

```js
    const adapter = dexRegistry.get(item.dex.protocol, 'v2')
```

**Q: What is `dexRegistry`?**
**Answer: It's a library of "Math Formulas".**

*   Uniswap V2, PancakeSwap V2, SushiSwap V2... they all use **almost** the same formula (`x * y = k`).
*   BUT, some might have different fees (0.3% vs 0.25%).
*   Some might map fee-on-transfer tokens differently.

So `dexRegistry.get('pancakeswap', 'v2')` returns the specific calculator object for PancakeSwap.
Then `adapter.computeV2Quote(...)` runs the math:
1.  Apply Fee (e.g. 99.75% remains).
2.  Calculate Output: `(AmountInWithFee * ReserveOut) / (ReserveIn + AmountInWithFee)`.
3.  Return the Quote object.

**Q: Where is `this.config.minV2ReserveThreshold` set?**
**Answer: It is SUPPOSED to be in `index.ts`, but it is MISSING!**

**1. The Expectation**
In `apps/server/src/config/constants.ts`, we see:
```js
export const MIN_V2_RESERVE_THRESHOLD = 0n // 0 means allow everything
```

**2. The Reality (Initialization)**
In `apps/server/src/index.ts` (Lines 39-43):
```js
const poolDiscovery = new PoolDiscovery(..., {
    intermediateTokenAddresses: ...,
    minV3LiquidityThreshold: MIN_V3_LIQUIDITY_THRESHOLD,
    // MISSING: minV2ReserveThreshold is NOT passed here!
})
```

**3. The Result (Bug?)**
*   Inside `PoolDiscovery`: `this.config.minV2ReserveThreshold` will be `undefined`.
*   The check: `if (reserveIn < undefined)` -> **FALSE**.
*   **Consequence**: The filter **DOES NOT WORK**. It allows every pool, even empty ones.

#### Deep Dive: `UniswapV2Adapter.computeV2Quote`

```bash
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
```

**The Goal:** Calculate exactly how many tokens you get out using Uniswap's official math library.

**1. The "Type Wrapper" Step**
Uniswap SDK doesn't work with plain numbers (`100` or `0x123`). It needs "Smart Objects".

```js
const tokenInInstance = new Token(chainId, address, decimals, symbol, name)
const tokenOutInstance = new Token(...)
```
*   **Why?** The SDK needs to know `decimals` to do math correctly (e.g. `1 USDT` = 1,000,000 units, `1 WETH` = 1,000,000,000,000,000,000 units).

```js
const reserveInAmount = CurrencyAmount.fromRawAmount(tokenInInstance, reserveIn.toString())
const reserveOutAmount = CurrencyAmount.fromRawAmount(tokenOutInstance, reserveOut.toString())
```
*   **Why?** `CurrencyAmount` is a wrapper that prevents you from adding Apples to Oranges.
*   If you try `reserveInAmount.add(reserveOutAmount)`, the SDK throws an error ("Cannot add WETH to USDT"). Safety first!

**2. creating the "Pair" Model**
```js
const pair = new Pair(reserveInAmount, reserveOutAmount)
```
*   This object represents the Pool. It holds the reserves and knows the formula `x * y = k`.

**3. The Magic Calculation (Constant Product)**
```js
const [amountOutCurrency] = pair.getOutputAmount(inputAmount)
amountOutRaw = toRawAmount(amountOutCurrency)
```
*   **This single line does all the hard work.**
*   It applies the **0.3% Fee** (Uniswap V2 standard).
*   It solves the equation: `(AmountInWithFee * ReserveOut) / (ReserveIn + AmountInWithFee)`.
*   It returns a `CurrencyAmount` object, which we convert back to a plain `bigint` (`toRawAmount`).

**4. Metrics Calculation**
```js
const midPriceQ18 = computeMidPriceQ18FromReserves(...)
const executionPriceQ18 = computeExecutionPriceQ18(...)
const priceImpactBps = computePriceImpactBps(...)
```
*   **Mid Price**: The "Fair Price" if you traded $0.00001 (Microscopic trade). `ReserveOut / ReserveIn`.
*   **Execution Price**: The actual price you got. `AmountOut / AmountIn`.
*   **Price Impact**: The difference (Slippage). `(MidPrice - ExecutionPrice) / MidPrice`.
    *   If you trade huge size, Price Impact goes up (BAD).

**5. Return the Quote**
We bundle everything into a standardized `PriceQuote` object so the aggregator can compare it with V3 quotes later.
      ? poolData.reserve0
      : poolData.reserve1
```



























### Detail that happened in fetchMultiHopQuotes

Let's break down this specific block of code:

```typescript
const intermediateAddresses = this.config.intermediateTokenAddresses[chain.key] ?? []

// Filter out input/output tokens
const validCandidates = intermediateAddresses.filter(
  (candidate) => !sameAddress(candidate, tokenIn.address) && !sameAddress(candidate, tokenOut.address)
)
```

#### 1. Logic Breakdown
**`this.config.intermediateTokenAddresses[chain.key]`**
*   **What is it?** This is a predetermined list of "Base Assets" or "Popular Tokens" for the specific chain (e.g., BSC).
*   **Why do we have it?** When we can't find a direct pool (Token A -> Token B), we use these tokens as "connectors" or "bridges".
*   **Example for BSC**: The list likely contains:
    *   WBNB
    *   USDT
    *   USDC
    *   ETH
    *   DAI
    *   BUSD

**`?? []`**
*   This is a safety check. If we haven't configured any intermediate tokens for this chain, it defaults to an empty list `[]` so the code doesn't crash.

#### 2. The Filter (Why do we filter?)

**The Code:**
```typescript
const validCandidates = intermediateAddresses.filter(
  (candidate) => !sameAddress(candidate, tokenIn.address) && !sameAddress(candidate, tokenOut.address)
)
```

**The Goal:**
We want to find suitable **Connector Tokens** to build a route: `Token A -> Connector -> Token B`.

**The Problem:**
Our list of intermediates (WBNB, USDT, USDC...) is static.
*   What if `Token A` is **WBNB**?
*   What if `Token B` is **USDT**?

**Scenario without filter:**
If we didn't filter, and we are swapping **WBNB -> USDT**, the code would try:
1.  Candidate `WBNB`: Route `WBNB -> WBNB -> USDT` (Silly/Redundant)
2.  Candidate `USDT`: Route `WBNB -> USDT -> USDT` (Silly/Redundant)
3.  Candidate `USDC`: Route `WBNB -> USDC -> USDT` (**Valid Multi-hop**)

**The Fix (The Filter):**
We must remove the Source Token (`tokenIn`) and the Destination Token (`tokenOut`) from the list of candidates.

*   `!sameAddress(candidate, tokenIn.address)` checks: "Is this candidate the same as the token I'm selling?" -> If yes, **remove it**.
*   `!sameAddress(candidate, tokenOut.address)` checks: "Is this candidate the same as the token I'm buying?" -> If yes, **remove it**.

#### 3. Concrete Example

**User Request:**
*   **Token A (In)**: WBNB
*   **Token B (Out)**: USDT

**Configured Intermediates:** `[WBNB, USDT, USDC, ETH, DAI]`

**Filtering Process:**
1.  **Check WBNB**: Is it Token A? YES. -> **REJECT**
2.  **Check USDT**: Is it Token B? YES. -> **REJECT**
3.  **Check USDC**: Is it Token A or B? NO. -> **KEEP**
4.  **Check ETH**: Is it Token A or B? NO. -> **KEEP**
5.  **Check DAI**: Is it Token A or B? NO. -> **KEEP**

**Result (`validCandidates`):**
`[USDC, ETH, DAI]`

Now, the code will only try to find these valid multi-hop paths:
*   WBNB -> **USDC** -> USDT
*   WBNB -> **ETH** -> USDT
*   WBNB -> **DAI** -> USDT

This saves API calls and avoids creating nonsense routes.

#### 4. Batch Fetch Metadata 

```typescript
// Batch fetch all intermediate token metadata
const intermediateTokens = await this.tokenService.getBatchTokenMetadata(
  chain,
  validCandidates as Address[]
)
```
**Why?**
We have the **addresses** of the intermediate tokens (e.g. `0x8ac...` for USDC), but to calculate prices and amounts, we need their **decimals**.
*   We can't do math with just an address.
*   This step turns `['0x...', '0x...']` into full objects: `[{ symbol: 'USDC', decimals: 18 }, { symbol: 'ETH', decimals: 18 }]`.

#### 5. Fetch Leg A Quotes (Token In -> Intermediate)

```typescript
// Fetch all legA quotes in parallel
const legAQuotesArray = await Promise.all(
  intermediateTokens.map((intermediate) =>
    this.fetchDirectQuotes(chain, tokenIn, intermediate, amountIn, gasPriceWei, client, allowedVersions)
  )
)
```

**What is happening?**
We are asking: "Where can I trade **WBNB (Input)** for **USDC (Intermediate)**?"

**The Parallel Execution:**
It runs `fetchDirectQuotes` for every valid intermediate token at the same time.
*   `fetchDirectQuotes(WBNB, USDC)`
*   `fetchDirectQuotes(WBNB, ETH)`
*   `fetchDirectQuotes(WBNB, DAI)`

**The Result (`legAQuotesArray`):**
This is an **Array of Arrays** (`PriceQuote[][]`).
Why? Because for a single pair like `WBNB -> USDC`, there might be **multiple pools**:
1.  PancakeSwap V2 Pool
2.  PancakeSwap V3 Pool (0.05% fee)
3.  PancakeSwap V3 Pool (0.25% fee)

So `legAQuotesArray[0]` might contain 3 different quotes just for the WBNB->USDC leg.

> **Correction / Important Note on your question:**
> You asked: *"How about USDC and ETH? USDC and DAI?"*
>
> We **DO NOT** check those in this step.
>
> **Why?**
> The strategy here is strictly **2-Hops**: `Start -> Intermediate -> End`.
> *   **Leg A** MUST start with **WBNB (Token A)**.
> *   **Leg B** MUST end with **USDT (Token B)**.
>
> We are not looking for 3-hop paths like `WBNB -> USDC -> ETH -> USDT`. That would be too complex and expensive (gas + calculation time) for this specific function.
>
> So:
> *   `WBNB -> USDC` ? **YES** (Valid Leg A)
> *   `USDC -> ETH` ? **NO** (This would imply a 3rd hop)
> *   `ETH -> DAI` ? **NO**

#### 6. Calculating Leg B (Intermediate -> End)

**You asked: "how about intermideate -> END ???"**
This happens right here!

After we get all the results for Leg A (`WBNB -> USDC`, `WBNB -> ETH`), we loop through them to find the second half of the journey.

```typescript
// Process each intermediate token
for (let i = 0; i < intermediateTokens.length; i++) {
  const intermediate = intermediateTokens[i]!
  const legAQuotes = legAQuotesArray[i]! // e.g., All WBNB -> USDC quotes and WBNB -> ETH quotes

  // If there are no quotes for this intermediate token, skip it
  if (legAQuotes.length === 0) continue

  // Collect all unique amountOuts from legA for batch fetching legB
  const uniqueAmounts = new Set<bigint>()
  legAQuotes.forEach((legA) => {
    if (legA && legA.amountOut > 0n) {
      uniqueAmounts.add(legA.amountOut)
    }
  })
  
  // Fetch Leg B (Intermediate -> Token Out)
  const legBQuotesArray = await Promise.all(
    legAQuotes.map((legA) => {
       // KEY POINT: We use the OUTPUT of Leg A as the INPUT for Leg B
       return this.fetchDirectQuotes(
         chain, 
         intermediate, // From USDC
         tokenOut,     // To USDT
         legA.amountOut, // <--- CRITICAL! 
         // ...
       )
    })
  )
}
```

**1. `if (legAQuotes.length === 0) continue`**
*   **"Skip it to where?"**
    *   It skips to the **END of the loop block** for the *current* token, and immediately starts the **next iteration** of the `for` loop.
    *   **Visual Step**:
        1.  Using `WBNB` as intermediate? -> No quotes found. -> `continue`.
        2.  **JUMP!** (Ignore lines below for WBNB).
        3.  Start loop again for `USDC` (Next token).

**2. What happens if there ARE quotes?**
*   **"Collect all unique amountsOut...?"**
    *   Yes, the code *calculates* `uniqueAmounts` (lines 445-451), but interesting detail: **it doesn't actually use them!**
    *   Instead, in the very next block (lines 454-469), it maps continuously over the original `legAQuotes`:
    ```typescript
    const legBQuotesArray = await Promise.all(
      legAQuotes.map((legA) => { ... })
    )
    ```
    *   So effectively: **For every single valid Leg A execution we found, we go and find a matching Leg B.**

### Deep Dive: Why `PriceQuote[][]` (Double Array)?

You asked: **"Why priceQuote[][]? Double array?"**

Let's use your example:
*   **Token A**: WBNB
*   **Token B**: USDT
*   **Intermediates**: `[USDC, ETH, DAI]` (Indices 0, 1, 2)

**The Structure:**
1.  **Outer Array**: One slot for **each Intermediate Token**.
2.  **Inner Array**: The list of valid **Quotes/Pools** found for that specific pair.

**Visualizing `legAQuotesArray`:**

*   **Index 0 (USDC)**: We check `WBNB -> USDC`.
    *   Found: **Pancake V3 Pool (0.05%)** -> Quote #1
    *   Found: **Pancake V2 Pool** -> Quote #2
    *   *Result:* `[ Quote #1, Quote #2 ]`

*   **Index 1 (ETH)**: We check `WBNB -> ETH`.
    *   Found: **Uniswap V3 Pool** -> Quote #3
    *   *Result:* `[ Quote #3 ]`

*   **Index 2 (DAI)**: We check `WBNB -> DAI`.
    *   Found: Nothing (No liquidity).
    *   *Result:* `[]`

**The Final `legAQuotesArray` looks like this:**
```js
[
  [ Quote #1, Quote #2 ], // Index 0: WBNB -> USDC quotes
  [ Quote #3 ],           // Index 1: WBNB -> ETH quotes
  []                      // Index 2: WBNB -> DAI quotes
]
```

---

#### 6. Calculating Leg B (Intermediate -> End)

**Now, how do we process this?**

We have to loop through **EVERYTHING**.

1.  **Outer Loop (i)**: Goes through the Intermediates (USDC, then ETH, then DAI).
2.  **Inner Loop (map)**: Goes through the Quotes inside that intermediate using `legAQuotes.map(...)`.

**Execution Steps:**

1.  **i=0 (USDC)**: Access `legAQuotesArray[0]` -> `[Quote #1, Quote #2]`
    *   **Process Quote #1**: It gave us **300 USDC**.
        *   Find Leg B: `fetchDirectQuotes(USDC, USDT, 300)`.
    *   **Process Quote #2**: It gave us **299 USDC**.
        *   Find Leg B: `fetchDirectQuotes(USDC, USDT, 299)`.

2.  **i=1 (ETH)**: Access `legAQuotesArray[1]` -> `[Quote #3]`
    *   **Process Quote #3**: It gave us **0.5 ETH**.
        *   Find Leg B: `fetchDirectQuotes(ETH, USDT, 0.5)`.

3.  **i=2 (DAI)**: Access `legAQuotesArray[2]` -> `[]`
    *   Empty! Skip directly to keys. (This is where `continue` would happen if we check length).

This ensures we find **every possible path** across all intermediates and all pools.

#### 6. Calculating Leg B (Intermediate -> End)


#### 7. Combine Leg A and Leg B Quotes

**You asked:** *"Leg B how is it looks like? and then how to combined?"*

**A. Structure of Leg B (`legBQuotesArray`)**
Inside the loop for `USDC` (Index 0):
*   `legAQuotes` has 2 items: `[ Quote A1, Quote A2 ]`.
*   `legBQuotesArray` will therefore have 2 items as well, matching Leg A 1-to-1:
    *   `[ [Quote B1a, Quote B1b], [Quote B2a] ]`

    *   **Index 0**: `[Quote B1a, Quote B1b]` = These are the results for `USDC -> USDT` assuming we started with the amount from `Quote A1`.
    *   **Index 1**: `[Quote B2a]` = This is the result for `USDC -> USDT` assuming we started with the amount from `Quote A2`.

**B. The Combination Logic (Nested Loops)**

Now we run the nested loops to stitch them together:

```typescript
// Loop 1: Go through every Leg A quote
for (let j = 0; j < legAQuotes.length; j++) {
   const legA = legAQuotes[j]       // e.g. Quote A1
   const legBQuotes = legBQuotesArray[j]  // e.g. [Quote B1a, Quote B1b]

   // Loop 2: Go through every matching Leg B quote
   for (const legB of legBQuotes) {
      // COMBINE THEM!
      
      // 1. Calculate Prices: 
      //    Execution Price = Price A * Price B
      
      // 2. Add Fees/Gas:
      //    Total Gas = Gas A + Gas B
      
      // 3. Create the Path:
      //    Path = [WBNB -> USDC -> USDT]
      
      results.push(combinedQuote)
   }
}
```

**Step-by-Step Execution:**

1.  **j=0**: We take **Quote A1** (WBNB->USDC).
    *   We look at `legBQuotesArray[0]` -> `[Quote B1a, Quote B1b]`.
    *   **Combine**: `Quote A1 + Quote B1a` -> **Result 1**
    *   **Combine**: `Quote A1 + Quote B1b` -> **Result 2**

2.  **j=1**: We take **Quote A2** (WBNB->USDC).
    *   We look at `legBQuotesArray[1]` -> `[Quote B2a]`.
    *   **Combine**: `Quote A2 + Quote B2a` -> **Result 3**

**Result:**
We have created 3 complete multi-hop routes just for the USDC intermediate.
*   Route 1: WBNB -> USDC (Pool 1) -> USDT (Pool X)
*   Route 2: WBNB -> USDC (Pool 1) -> USDT (Pool Y)
*   Route 3: WBNB -> USDC (Pool 2) -> USDT (Pool Z)

### Global Fallback Logic: "What if there is NO Lens at all?"

```js
else if (!lensAddress && ...) {
   // ... Huge block of code ...
}
```

**Q: "Then this is should be fallback for v2 v3 then?"**
**Answer: ONLY IF the Lens Address is missing!**

**Crucial Distinction:**
1.  **Scenario A: Lens is Configured, but the Call Fails.**
    *   We are inside the `if (lensAddress)` block.
    *   **V3**: Has its own internal fallback (as we saw).
    *   **V2**: Has **NO** fallback (it just logs and empty).
    *   **It does NOT jump to this `else if` block.** The code finishes here.

2.  **Scenario B: Lens is NOT Configured (`lensAddress` is undefined).**
    *   The code skips the first block entirely.
    *   It enters this `else if` block.
    *   It runs the "Mixed Soup" manual batch for **both V2 and V3**.

**So technically:**
*   This is a **Configuration Fallback** (for new chains).
*   It is **NOT** a **Runtime Fallback** (for when the node glitches).

If we wanted true runtime fallback for V2, we should have copied this logic *inside* the V2 `catch` block above!

#### Step-by-Step Breakdown (The "Combined Batch")

Since there is no helper contract, we have to mix everything into one giant soup.

**Step 1: The Soup Pot (`poolDataCalls`)**
We put V2 requests AND V3 requests into the same list.

*   **V2 Pools**: Need 2 things (`getReserves`, `token0`). *Wait, why no token1? Maybe optimization?*
*   **V3 Pools**: Need 4 things (`slot0`, `liquidity`, `token0`, `token1`).

**Step 2: The Logic (`poolMap`)**
We have to remember which pool is which type!
```js
poolMap.push({ 
  type: 'v2', // Mark as V2
  dex: ..., 
  startIndex: poolDataCalls.length - 2 
})
```

**Concrete Example (Mixed Batch)**
Imagine 1 V2 Pool and 1 V3 Pool.

**The Request List (`poolDataCalls`):**
```js
[
  // --- V2 Pool (Indices 0-1) ---
  /* 0 */ { ... functionName: 'getReserves' }, 
  /* 1 */ { ... functionName: 'token0' },      

  // --- V3 Pool (Indices 2-5) ---
  /* 2 */ { ... functionName: 'slot0' },       
  /* 3 */ { ... functionName: 'liquidity' },   
  /* 4 */ { ... functionName: 'token0' },      
  /* 5 */ { ... functionName: 'token1' }       
]
```

**The Reassembly (`poolMap.forEach`):**

1.  **Item 1 (V2)**:
    *   `if (item.type === 'v2')` -> We enter V2 mode.
    *   We grab `results[0]` and `results[1]`.
    *   Success? -> Save to `v2PoolData`.

2.  **Item 2 (V3)**:
    *   `else` -> We enter V3 mode.
    *   We grab `results[2]`, `results[3]`, `results[4]`, `results[5]`.
    *   Success? -> Save to `v3PoolData`.

**Q: If we can do the Global Fallback (Multicall), why do we bother deploying a Contract (Lens)?**
**Answer: Speed, Money, and Sanity.**

**1. RPC Data Size (Bandwidth Cost)**
*   **Multicall (Heavy)**:
    *   To check **50 V3 Pools**: You send **200 separate requests** (Slot0, Liquidity, Token0, Token1 x 50).
    *   Each request needs the full function signature `0x1234abcd...`.
    *   The RPC node has to decode 200 items. huge JSON payload.
*   **Lens (Lightweight)**:
    *   You send **1 function call**: `batchGetV3PoolData`.
    *   You send **1 array of addresses**.
    *   The payload is tiny. The response is packed efficiently.

**2. Serialization Overhead**
*   **Multicall**: Returns 200 separate hex strings. Your Javascript has to loop 200 times to decode them.
*   **Lens**: Returns 50 `structs`. Everything is pre-packaged.

**3. "Atomic" Validation**
Q: Are you sure? Is Multicall still safe? What happens if bandwidth is too high?**
**Answer: Multicall is "Safe" but has "Ceilings".**

**1. The "Gas Limit" Ceiling (Computation)**
*   Even though it's a "View" call (free money), there is a limit on **Computation**.
*   A default node allows ~30 Million Gas per call (like a block).
*   If you multicall **500 pools**, and the total math exceeds 30M Gas, the **entire batch fails** with "Out of Gas" or "Execution Timeout".
*   **Lens helps here** slightly because it's compiled efficiently, but the computation math is similar.

**2. The "Payload Size" Ceiling (Bandwidth)**
*   **HTTP 413 Payload Too Large**:
    *   Most RPC Providers (Infura, Alchemy, QuickNode) limit the JSON body to **5MB**.
    *   **Multicall**: sending 200 checks might be 0.5MB. Safe. Sending 2000 checks might hit 5MB. **Crash.**
    *   **Lens**: sending 2000 checks is just 2000 addresses (0.05MB). **Safe.** 🚀

**3. Latency (Speed)**
*   Uploading 1MB takes longer than 10KB.
*   This adds **Network Lag** to your quote time. Users want quotes in < 200ms.

**Conclusion:**
For 10-20 pools? Multicall is fine.
**Q: Why don't we use Lens for the FIRST step (Getting Pool Addresses)? Why use Multicall there?**
**Answer: You are genius! That is a valid Optimization Idea! 💡**

Currently, we do:
1.  Multicall -> `Factory.getPair(A, B)` (8-12 calls).
2.  Lens -> `BatchGetV3PoolData(...)` (1 call).

**You are suggesting:**
1.  Lens -> `BatchGetAddressesAndData(A, B, Factories[])`.
2.  Result -> Get everything in **1 single call**.

**Why didn't we do it yet?**
*   **Complexity**: Factories have different interfaces (`getPair` vs `getPool`).
*   **Scale**: Getting an address is cheap (Hashing), whereas getting Reserves reads storage. The 8 calls for addresses are "lighter" than 50 calls for data.
*   **But yes**, adding a `batchGetPoolAddresses` to `AequiLens` would be even faster! Good catch!
*   **Multicall**: You get partial failures scattered everywhere. You (the frontend dev) have to write complex logic to check "Did the first 3 succeed but the 4th fail?".
*   **Lens**: The contract handles the `try-catch`. You get back a clean `success: true/false` flag computed on-chain.

**Q: But Multicall is also 1 RPC call! Why is it "Heavy"?**
**Answer: It's about the SIZE of the "Request" (What you upload).**

Think of sending a **Shopping List** to a personal shopper (The RPC Node).

**Scenario: You want 4 items (Apples, Bananas, Milk, Bread) from 50 different stores.**

**Style 1: Multicall (The "Micro-Manager")**
You send a list of **200 specific instructions**:
1.  "Go to Store 1, Aisle 3, Shelf 2, Pick Red Apple."
2.  "Go to Store 1, Aisle 4, Shelf 1, Pick Banana."
3.  "Go to Store 1, ... Pick Milk."
4.  "Go to Store 1, ... Pick Bread."
5.  "Go to Store 2, Aisle 3, Shelf 2, Pick Red Apple."
... and so on.

*   **Result**: You are uploading a **HUGE JSON file**. You are repeating "Aisle 3, Shelf 2" (function selectors) 50 times.
*   **Bandwidth**: heavy.

**Style 2: Lens Contract (The "Smart Instruction")**
You send **1 simple list of instructions**:
1.  "Here is a list of 50 Store Addresses."
2.  "Run the `getStandardGroceries` routine on all of them."

*   **The Contract knows** that "Standard Groceries" means (Apple+Banana+Milk+Bread). You don't have to tell it every time.
*   **Result**: You only upload the addresses. The "Instructions" are already on the blockchain!
*   **Bandwidth**: Tiny. 🚀

This is why Lens is lighter. We move the "Logic" from your JSON payload to the Smart Contract bytecode.

The `fetchMultiHopQuotes` function is an **Explorer**. Its job is to find *everything* that is possible.
*   It does **not** decide which one is the winner.
*   It does **not** filter out "bad prices" (unless they are zero).
*   It just results in a big list: `[Route 1, Route 2, Route 3 ... Route 50]`.

It returns this big list back to `price-service.ts`.





























### After the Promise.all resolves

Now we have two arrays: `directQuotes` (empty in this case) and `multiHopQuotes` (full of potential paths).

```js
const candidates = forceMultiHop ? multiHopQuotes : [...directQuotes, ...multiHopQuotes]
```
Here, we combine them into one big list of `candidates`. Since `forceMultiHop` is true, `candidates` is just `multiHopQuotes`.

### Q&A: What about Splitting?

**You asked:** *"where is splitting? no one???"*

**Answer:** **You are correct! There is NO splitting logic in this code.**

This codebase implements a **Linear Router** (or Serial Router).
*   It looks for the single best path: `100% WBNB -> USDC -> USDT`.
*   It does **not** split the trade like `50% via USDC` and `50% via ETH`.

**Why?**
*   Splitting (known as "Smart Order Routing" or SOR) is much more complex.
*   It requires trying different % splits (10%, 20%, 30%...) and solving a maximization problem.
*   This specific file (`pool-discovery.ts`) is designed to just find valid paths. Splitting would typically happen in a layer *above* this or require a much more advanced algorithm (like the one used by 1inch or Uniswap's Auto Router).

So in this code: **The Winner Takes It All.**

---

### Selecting the "Best" Quote


```js
const best = selectBestQuote(candidates)
```
This function `selectBestQuote` loops through all the candidate quotes and picks the winner.
*   **Main Criteria**: Which quote gives the **highest `amountOut`** (most money for the user).
*   *Note*: Sometimes it also considers gas costs (subtracting gas from the output value) to find the "true" best value, depending on implementation.

### Handling the Rest (Offers)

```js
const remaining = candidates.filter((quote) => quote !== best).sort(compareQuotes)
if (remaining.length) {
  best.offers = remaining
}
```
*   It takes all the *other* quotes that didn't win.
*   It sorts them (likely best to worst).
*   It attaches them to `best.offers`. This is useful for the UI to show "Alternative Routes" (e.g., "Route 2: 99.5% output via SushiSwap").

### Final Return

```js
return best
```
The function returns the single best quote object, which contains:
*   `amountOut`: The final calculated amount.
*   `path`: The route (e.g., `[WBNB, USDC, USDT]`).
*   `fees`: Gas estimates.
*   `offers`: The other routes we found.

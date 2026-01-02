import { CurrencyAmount as CakeCurrencyAmount, Token as CakeToken } from '@pancakeswap/swap-sdk-core'
import { Pair as CakePair } from '@pancakeswap/v2-sdk'
import { Pool as CakePool } from '@pancakeswap/v3-sdk'
import { CurrencyAmount as UniCurrencyAmount, Token as UniToken } from '@uniswap/sdk-core'
import { Pair as UniPair } from '@uniswap/v2-sdk'
import { Pool as UniPool } from '@uniswap/v3-sdk'
import type { Address, PublicClient } from 'viem'
import {
  INTERMEDIATE_TOKEN_ADDRESSES,
  MIN_V2_RESERVE_THRESHOLD,
  MIN_V3_LIQUIDITY_THRESHOLD,
  Q18,
} from '../../config/constants'
import type {
  ChainConfig,
  DexConfig,
  PriceQuote,
  RouteHopVersion,
  RoutePreference,
  TokenMetadata,
} from '../../types'
import { getPublicClient } from '../../utils/clients'
import {
  V2_FACTORY_ABI,
  V2_PAIR_ABI,
  V3_FACTORY_ABI,
  V3_POOL_ABI,
  ZERO_ADDRESS,
  normalizeAddress,
} from '../../utils/contracts'
import { minBigInt, multiplyQ18, scaleToQ18 } from '../../utils/math'
import { defaultAmountForDecimals } from '../../utils/units'
import { TokenService } from '../tokens/token-service'

interface V2ReserveSnapshot {
  pairAddress: Address
  reserveIn: bigint
  reserveOut: bigint
}

interface V3PoolSnapshot {
  poolAddress: Address
  sqrtPriceX96: bigint
  liquidity: bigint
  tick: number
  token0: Address
  token1: Address
  fee: number
}

const GAS_BASE = 50000n
const GAS_MULTI_HOP_OVERHEAD = 20000n
const GAS_COSTS: Record<RouteHopVersion, bigint> = {
  v2: 70000n,
  v3: 110000n,
}

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const pow10 = (value: number) => (value <= 0 ? 1n : 10n ** BigInt(value))

const buildCurrencyAmount = (
  protocol: DexConfig['protocol'],
  token: UniToken | CakeToken,
  rawAmount: bigint,
) => {
  const value = rawAmount.toString()
  return protocol === 'uniswap'
    ? UniCurrencyAmount.fromRawAmount(token as UniToken, value)
    : CakeCurrencyAmount.fromRawAmount(token as CakeToken, value)
}

const computeMidPriceQ18FromPrice = (
  protocol: DexConfig['protocol'],
  tokenInInstance: UniToken | CakeToken,
  tokenOutDecimals: number,
  price: { quote(input: unknown): unknown },
): bigint => {
  const unitIn = pow10(tokenInInstance.decimals)
  if (unitIn === 0n) {
    return 0n
  }

  try {
    const baseAmount = buildCurrencyAmount(protocol, tokenInInstance, unitIn)
    const quoted = price.quote(baseAmount as any)
    const quoteRaw = toRawAmount(quoted)
    if (quoteRaw === 0n) {
      return 0n
    }

    const outFactor = pow10(tokenOutDecimals)
    if (outFactor === 0n) {
      return 0n
    }

    return (quoteRaw * Q18) / outFactor
  } catch {
    return 0n
  }
}

const applyPriceQ18 = (
  priceQ18: bigint,
  amountIn: bigint,
  inDecimals: number,
  outDecimals: number,
): bigint => {
  if (priceQ18 === 0n || amountIn === 0n) {
    return 0n
  }

  const inFactor = pow10(inDecimals)
  const outFactor = pow10(outDecimals)
  const numerator = amountIn * priceQ18 * outFactor
  const denominator = Q18 * inFactor
  if (denominator === 0n) {
    return 0n
  }

  return numerator / denominator
}

const compareQuotes = (a: PriceQuote, b: PriceQuote) => {
  if (a.amountOut === b.amountOut) {
    if (a.liquidityScore === b.liquidityScore) {
      return a.priceImpactBps <= b.priceImpactBps ? -1 : 1
    }
    return a.liquidityScore > b.liquidityScore ? -1 : 1
  }
  return a.amountOut > b.amountOut ? -1 : 1
}

const toRawAmount = (amount: unknown): bigint =>
  BigInt((amount as { quotient: { toString(): string } }).quotient.toString())

const computeExecutionPriceQ18 = (
  amountIn: bigint,
  amountOut: bigint,
  inDecimals: number,
  outDecimals: number,
): bigint => {
  if (amountIn === 0n || amountOut === 0n) {
    return 0n
  }
  const inFactor = pow10(inDecimals)
  const outFactor = pow10(outDecimals)
  const denominator = amountIn * outFactor
  if (denominator === 0n) {
    return 0n
  }

  return (amountOut * Q18 * inFactor) / denominator
}

const computePriceImpactBps = (
  midPriceQ18: bigint,
  amountIn: bigint,
  amountOut: bigint,
  inDecimals: number,
  outDecimals: number,
): number => {
  if (midPriceQ18 === 0n || amountIn === 0n || amountOut === 0n) {
    return 0
  }

  const expectedOut = applyPriceQ18(midPriceQ18, amountIn, inDecimals, outDecimals)
  if (expectedOut === 0n) {
    return 0
  }

  const diff = expectedOut > amountOut ? expectedOut - amountOut : amountOut - expectedOut
  if (diff === 0n) {
    return 0
  }

  const impact = (diff * 10000n) / expectedOut
  const capped = impact > 10_000_000n ? 10_000_000n : impact
  return Number(capped)
}

const estimateGasForRoute = (hops: RouteHopVersion[]): bigint => {
  if (!hops.length) {
    return GAS_BASE
  }
  const base = hops.reduce((total, hop) => total + (GAS_COSTS[hop] ?? 90000n), GAS_BASE)
  if (hops.length === 1) {
    return base
  }
  return base + BigInt(hops.length - 1) * GAS_MULTI_HOP_OVERHEAD
}

const estimateAmountOutFromMidPrice = (
  midPriceQ18: bigint,
  amountIn: bigint,
  inDecimals: number,
  outDecimals: number,
  fee: number,
): bigint => {
  if (midPriceQ18 === 0n || amountIn === 0n) {
    return 0n
  }

  const feeDenominator = 1_000_000n
  const feeNumerator = feeDenominator - BigInt(fee)
  const grossOut = applyPriceQ18(midPriceQ18, amountIn, inDecimals, outDecimals)
  if (grossOut === 0n) {
    return 0n
  }

  const netOut = (grossOut * feeNumerator) / feeDenominator
  return netOut === 0n ? 0n : netOut
}

const resolveAllowedVersions = (preference: RoutePreference): RouteHopVersion[] => {
  if (preference === 'auto') {
    return ['v2', 'v3']
  }
  return [preference]
}

export class PriceService {
  constructor(private readonly tokenService: TokenService) { }

  async getBestPrice(
    chain: ChainConfig,
    tokenInAddress: Address,
    tokenOutAddress: Address,
    amountInOverride?: bigint,
    preference: RoutePreference = 'auto',
  ): Promise<PriceQuote | null> {
    if (tokenInAddress.toLowerCase() === tokenOutAddress.toLowerCase()) {
      return null
    }

    const [tokenIn, tokenOut] = await Promise.all([
      this.tokenService.getTokenMetadata(chain, tokenInAddress),
      this.tokenService.getTokenMetadata(chain, tokenOutAddress),
    ])

    const amountIn = amountInOverride && amountInOverride > 0n
      ? amountInOverride
      : defaultAmountForDecimals(tokenIn.decimals)

    return this.getBestQuoteForTokens(chain, tokenIn, tokenOut, amountIn, preference)
  }

  async getBestQuoteForTokens(
    chain: ChainConfig,
    tokenIn: TokenMetadata,
    tokenOut: TokenMetadata,
    amountIn: bigint,
    preference: RoutePreference = 'auto',
  ): Promise<PriceQuote | null> {
    if (amountIn <= 0n) {
      return null
    }

    const allowedVersions = resolveAllowedVersions(preference)
    const client = await getPublicClient(chain)

    let gasPriceWei: bigint | null = null
    try {
      gasPriceWei = await client.getGasPrice()
    } catch { }

    const directQuotes = await this.fetchDirectQuotes(
      chain,
      tokenIn,
      tokenOut,
      amountIn,
      gasPriceWei,
      client,
      allowedVersions,
    )
    const multiHopQuotes = await this.fetchMultiHopQuotes(
      chain,
      tokenIn,
      tokenOut,
      amountIn,
      gasPriceWei,
      client,
      allowedVersions,
    )

    const candidates = [...directQuotes, ...multiHopQuotes]

    console.debug('Fetched', candidates.length, 'valid quotes for', tokenIn.symbol, '->', tokenOut.symbol, 'on', chain.name)
    const best = this.selectBest(candidates)

    console.debug(`Best quote for ${tokenIn.symbol} -> ${tokenOut.symbol} on ${chain.name}:`, best)

    if (!best) {
      return null
    }

    if (!best.gasPriceWei && gasPriceWei) {
      best.gasPriceWei = gasPriceWei
      if (best.estimatedGasUnits) {
        best.estimatedGasCostWei = gasPriceWei * best.estimatedGasUnits
      }
    }

    // Attach all valid candidates as offers, sorted by score
    // Filter out the best one to avoid duplication in the list if desired, 
    // or keep it. The requirement says "remaining offers", so let's filter out the best one.
    const remaining = candidates
      .filter(c => c !== best)
      .sort(compareQuotes)

    // We need to attach gas info to remaining offers too
    remaining.forEach(offer => {
      if (!offer.gasPriceWei && gasPriceWei) {
        offer.gasPriceWei = gasPriceWei
        if (offer.estimatedGasUnits) {
          offer.estimatedGasCostWei = gasPriceWei * offer.estimatedGasUnits
        }
      }
    })

    best.offers = remaining

    return best
  }

  private async fetchDirectQuotes(
    chain: ChainConfig,
    tokenIn: TokenMetadata,
    tokenOut: TokenMetadata,
    amountIn: bigint,
    gasPriceWei: bigint | null,
    client: PublicClient,
    allowedVersions: RouteHopVersion[],
  ): Promise<PriceQuote[]> {
    const factoryCalls: any[] = []
    const dexMap: { type: 'v2' | 'v3'; dex: DexConfig; fee?: number; index: number }[] = []

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

    if (factoryCalls.length === 0) return []

    const factoryResults = await client.multicall({
      allowFailure: true,
      contracts: factoryCalls,
    })

    const poolDataCalls: any[] = []
    const poolMap: {
      type: 'v2' | 'v3'
      dex: DexConfig
      fee?: number
      poolAddress: Address
      startIndex: number
    }[] = []

    dexMap.forEach((item) => {
      const result = factoryResults[item.index]
      if (!result || result.status !== 'success' || !result.result || result.result === ZERO_ADDRESS) return

      const poolAddress = result.result as Address

      if (item.type === 'v2') {
        poolDataCalls.push(
          { address: poolAddress, abi: V2_PAIR_ABI, functionName: 'getReserves' },
          { address: poolAddress, abi: V2_PAIR_ABI, functionName: 'token0' },
        )
        poolMap.push({ ...item, poolAddress, startIndex: poolDataCalls.length - 2 })
      } else {
        poolDataCalls.push(
          { address: poolAddress, abi: V3_POOL_ABI, functionName: 'slot0' },
          { address: poolAddress, abi: V3_POOL_ABI, functionName: 'liquidity' },
          { address: poolAddress, abi: V3_POOL_ABI, functionName: 'token0' },
          { address: poolAddress, abi: V3_POOL_ABI, functionName: 'token1' },
        )
        poolMap.push({ ...item, poolAddress, startIndex: poolDataCalls.length - 4 })
      }
    })

    if (poolDataCalls.length === 0) return []

    const poolDataResults = await client.multicall({
      allowFailure: true,
      contracts: poolDataCalls,
    })

    const quotes: PriceQuote[] = []

    for (const item of poolMap) {
      if (item.type === 'v2') {
        const reservesRes = poolDataResults[item.startIndex]
        const token0Res = poolDataResults[item.startIndex + 1]

        if (reservesRes && token0Res && reservesRes.status === 'success' && token0Res.status === 'success') {
          const [reserve0, reserve1] = reservesRes.result as readonly [bigint, bigint, number]
          const token0Address = normalizeAddress(token0Res.result as Address)

          const reserveIn = sameAddress(token0Address, tokenIn.address)
            ? (reserve0 as bigint)
            : (reserve1 as bigint)
          const reserveOut = sameAddress(token0Address, tokenIn.address)
            ? (reserve1 as bigint)
            : (reserve0 as bigint)

          const snapshot: V2ReserveSnapshot = {
            pairAddress: item.poolAddress,
            reserveIn,
            reserveOut,
          }

          const quote = await this.computeV2Quote(
            chain,
            item.dex,
            tokenIn,
            tokenOut,
            amountIn,
            gasPriceWei,
            snapshot,
          )
          if (quote) quotes.push(quote)
        }
      } else {
        const slot0Res = poolDataResults[item.startIndex]
        const liquidityRes = poolDataResults[item.startIndex + 1]
        const token0Res = poolDataResults[item.startIndex + 2]
        const token1Res = poolDataResults[item.startIndex + 3]

        if (
          slot0Res && liquidityRes && token0Res && token1Res &&
          slot0Res.status === 'success' &&
          liquidityRes.status === 'success' &&
          token0Res.status === 'success' &&
          token1Res.status === 'success'
        ) {
          const slotData = slot0Res.result as readonly [
            bigint,
            number,
            number,
            number,
            number,
            number,
            boolean,
          ]
          const liquidityValue = liquidityRes.result as bigint
          const token0Address = normalizeAddress(token0Res.result as Address)
          const token1Address = normalizeAddress(token1Res.result as Address)

          const snapshot: V3PoolSnapshot = {
            poolAddress: item.poolAddress,
            sqrtPriceX96: slotData[0],
            tick: Number(slotData[1]),
            liquidity: liquidityValue,
            token0: token0Address,
            token1: token1Address,
            fee: item.fee!,
          }

          const quote = await this.computeV3Quote(
            chain,
            item.dex,
            tokenIn,
            tokenOut,
            amountIn,
            gasPriceWei,
            snapshot,
          )
          if (quote) quotes.push(quote)
        }
      }
    }

    return quotes
  }

  private async fetchMultiHopQuotes(
    chain: ChainConfig,
    tokenIn: TokenMetadata,
    tokenOut: TokenMetadata,
    amountIn: bigint,
    gasPriceWei: bigint | null,
    client: PublicClient,
    allowedVersions: RouteHopVersion[],
  ): Promise<PriceQuote[]> {
    const intermediateAddresses = INTERMEDIATE_TOKEN_ADDRESSES[chain.key] ?? []
    const cache = new Map<string, TokenMetadata>()
    const results: PriceQuote[] = []

    for (const candidate of intermediateAddresses) {
      if (sameAddress(candidate, tokenIn.address) || sameAddress(candidate, tokenOut.address)) {
        continue
      }

      const intermediate = await this.loadIntermediate(chain, candidate, cache)

      const legAQuotes = await this.fetchDirectQuotes(
        chain,
        tokenIn,
        intermediate,
        amountIn,
        gasPriceWei,
        client,
        allowedVersions,
      )

      console.debug('Leg A quotes for', tokenIn.symbol, '->', intermediate.symbol, ':', legAQuotes)
      const legA = this.selectBest(legAQuotes)

      if (!legA || legA.amountOut === 0n) {
        console.debug('Skipping intermediate', tokenIn.symbol, intermediate.symbol, 'due to no leg A quote', legA)
        continue
      }

      const legBQuotes = await this.fetchDirectQuotes(
        chain,
        intermediate,
        tokenOut,
        legA.amountOut,
        gasPriceWei,
        client,
        allowedVersions,
      )
      const legB = this.selectBest(legBQuotes)

      if (!legB || legB.amountOut === 0n) {
        console.debug('Skipping intermediate', tokenOut.symbol, intermediate.symbol, 'due to no leg B quote')
        continue
      }

      const midPriceQ18 = multiplyQ18(legA.midPriceQ18, legB.midPriceQ18)
      const executionPriceQ18 = multiplyQ18(legA.executionPriceQ18, legB.executionPriceQ18)
      const priceImpactBps = computePriceImpactBps(
        midPriceQ18,
        amountIn,
        legB.amountOut,
        tokenIn.decimals,
        tokenOut.decimals,
      )
      const hopVersions: RouteHopVersion[] = [...legA.hopVersions, ...legB.hopVersions]
      const estimatedGasUnits = estimateGasForRoute(hopVersions)
      const gasPrice = legA.gasPriceWei ?? legB.gasPriceWei ?? gasPriceWei
      const estimatedGasCostWei = gasPrice ? estimatedGasUnits * gasPrice : null

      results.push({
        chain: chain.key,
        amountIn,
        amountOut: legB.amountOut,
        priceQ18: executionPriceQ18,
        executionPriceQ18,
        midPriceQ18,
        priceImpactBps,
        path: [tokenIn, intermediate, tokenOut],
        routeAddresses: [tokenIn.address, intermediate.address, tokenOut.address],
        sources: [...legA.sources, ...legB.sources],
        liquidityScore: minBigInt(legA.liquidityScore, legB.liquidityScore),
        hopVersions,
        estimatedGasUnits,
        estimatedGasCostWei,
        gasPriceWei: gasPrice ?? null,
      })
    }

    return results
  }

  private selectBest(quotes: PriceQuote[]): PriceQuote | null {
    if (!quotes.length) {
      return null
    }
    const [best] = quotes.sort(compareQuotes)
    return best ?? null
  }

  private async loadIntermediate(
    chain: ChainConfig,
    address: string,
    cache: Map<string, TokenMetadata>,
  ) {
    const lower = address.toLowerCase()
    const cached = cache.get(lower)
    if (cached) {
      return cached
    }
    const metadata = await this.tokenService.getTokenMetadata(chain, lower as Address)
    cache.set(lower, metadata)
    return metadata
  }

  private async computeV2Quote(
    chain: ChainConfig,
    dex: DexConfig,
    tokenIn: TokenMetadata,
    tokenOut: TokenMetadata,
    amountIn: bigint,
    gasPriceWei: bigint | null,
    snapshot: V2ReserveSnapshot,
  ): Promise<PriceQuote | null> {
    if (snapshot.reserveIn < MIN_V2_RESERVE_THRESHOLD || snapshot.reserveOut < MIN_V2_RESERVE_THRESHOLD) {
      return null
    }

    const { tokenInInstance, tokenOutInstance } = this.buildV2Tokens(dex, tokenIn, tokenOut)

    const reserveInAmount =
      dex.protocol === 'uniswap'
        ? UniCurrencyAmount.fromRawAmount(tokenInInstance as UniToken, snapshot.reserveIn.toString())
        : CakeCurrencyAmount.fromRawAmount(tokenInInstance as CakeToken, snapshot.reserveIn.toString())

    const reserveOutAmount =
      dex.protocol === 'uniswap'
        ? UniCurrencyAmount.fromRawAmount(tokenOutInstance as UniToken, snapshot.reserveOut.toString())
        : CakeCurrencyAmount.fromRawAmount(tokenOutInstance as CakeToken, snapshot.reserveOut.toString())

    const pair =
      dex.protocol === 'uniswap'
        ? new UniPair(reserveInAmount as any, reserveOutAmount as any)
        : new CakePair(reserveInAmount as any, reserveOutAmount as any)

    const inputAmount =
      dex.protocol === 'uniswap'
        ? UniCurrencyAmount.fromRawAmount(tokenInInstance as UniToken, amountIn.toString())
        : CakeCurrencyAmount.fromRawAmount(tokenInInstance as CakeToken, amountIn.toString())

    let amountOutRaw: bigint
    try {
      const [amountOutCurrency] = pair.getOutputAmount(inputAmount as any)
      amountOutRaw = toRawAmount(amountOutCurrency)
    } catch {
      return null
    }

    if (amountOutRaw <= 0n) {
      return null
    }

    const price = pair.priceOf(tokenInInstance as any)
    const midPriceQ18 = computeMidPriceQ18FromPrice(
      dex.protocol,
      tokenInInstance as any,
      tokenOut.decimals,
      price,
    )
    const executionPriceQ18 = computeExecutionPriceQ18(amountIn, amountOutRaw, tokenIn.decimals, tokenOut.decimals)
    const priceImpactBps = computePriceImpactBps(
      midPriceQ18,
      amountIn,
      amountOutRaw,
      tokenIn.decimals,
      tokenOut.decimals,
    )

    const liquidityScore = minBigInt(
      scaleToQ18(snapshot.reserveIn, tokenIn.decimals),
      scaleToQ18(snapshot.reserveOut, tokenOut.decimals),
    )

    const hopVersions: RouteHopVersion[] = ['v2']
    const estimatedGasUnits = estimateGasForRoute(hopVersions)
    const estimatedGasCostWei = gasPriceWei ? gasPriceWei * estimatedGasUnits : null

    return {
      chain: chain.key,
      amountIn,
      amountOut: amountOutRaw,
      priceQ18: executionPriceQ18,
      executionPriceQ18,
      midPriceQ18,
      priceImpactBps,
      path: [tokenIn, tokenOut],
      routeAddresses: [tokenIn.address, tokenOut.address],
      sources: [
        {
          dexId: dex.id,
          poolAddress: snapshot.pairAddress,
          amountIn,
          amountOut: amountOutRaw,
        },
      ],
      liquidityScore,
      hopVersions,
      estimatedGasUnits,
      estimatedGasCostWei,
      gasPriceWei,
    }
  }

  private async computeV3Quote(
    chain: ChainConfig,
    dex: DexConfig,
    tokenIn: TokenMetadata,
    tokenOut: TokenMetadata,
    amountIn: bigint,
    gasPriceWei: bigint | null,
    snapshot: V3PoolSnapshot,
  ): Promise<PriceQuote | null> {
    if (snapshot.liquidity < MIN_V3_LIQUIDITY_THRESHOLD) {
      console.debug('Skipping V3 pool', snapshot.poolAddress, snapshot.tick, snapshot.liquidity, 'due to low liquidity')
      return null
    }

    const { tokenInInstance, tokenOutInstance, token0, token1 } = this.buildV3Tokens(
      dex,
      tokenIn,
      tokenOut,
      snapshot,
    )

    if (!tokenInInstance || !tokenOutInstance || !token0 || !token1) {
      console.debug('Skipping V3 pool', snapshot.poolAddress, 'due to token instance build failure')
      return null
    }

    const pool =
      dex.protocol === 'uniswap'
        ? new UniPool(
          token0 as UniToken,
          token1 as UniToken,
          snapshot.fee,
          snapshot.sqrtPriceX96.toString(),
          snapshot.liquidity.toString(),
          snapshot.tick,
        )
        : new CakePool(
          token0 as CakeToken,
          token1 as CakeToken,
          snapshot.fee,
          snapshot.sqrtPriceX96.toString(),
          snapshot.liquidity.toString(),
          snapshot.tick,
        )

    const inputAmount =
      dex.protocol === 'uniswap'
        ? UniCurrencyAmount.fromRawAmount(tokenInInstance as UniToken, amountIn.toString())
        : CakeCurrencyAmount.fromRawAmount(tokenInInstance as CakeToken, amountIn.toString())

    const price = pool.priceOf(tokenInInstance as any)
    let midPriceQ18 = computeMidPriceQ18FromPrice(
      dex.protocol,
      tokenInInstance as any,
      tokenOut.decimals,
      price,
    )

    let amountOutRaw: bigint | null = null
    let approximateOutput = false
    try {
      const [amountOutCurrency] = await pool.getOutputAmount(inputAmount as any)
      amountOutRaw = toRawAmount(amountOutCurrency)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const isTickDataMissing = message.includes('No tick data provider')
      if (!isTickDataMissing) {
        console.debug('Skipping V3 pool', snapshot.poolAddress, 'due to output error', message)
        return null
      }

      if (midPriceQ18 === 0n) {
        console.debug('Skipping V3 pool', snapshot.poolAddress, 'due to missing mid price in fallback')
        return null
      }

      amountOutRaw = estimateAmountOutFromMidPrice(
        midPriceQ18,
        amountIn,
        tokenIn.decimals,
        tokenOut.decimals,
        snapshot.fee,
      )

      if (!amountOutRaw || amountOutRaw <= 0n) {
        console.debug('Skipping V3 pool', snapshot.poolAddress, 'due to fallback zero output')
        return null
      }

      approximateOutput = true
    }

    if (!amountOutRaw || amountOutRaw <= 0n) {
      console.debug('Skipping V3 pool', snapshot.poolAddress, 'due to zero output')
      return null
    }

    if (midPriceQ18 === 0n) {
      console.debug('Skipping V3 pool', snapshot.poolAddress, 'due to missing mid price')
      return null
    }

    const executionPriceQ18 = computeExecutionPriceQ18(amountIn, amountOutRaw, tokenIn.decimals, tokenOut.decimals)
    const priceImpactBps = approximateOutput
      ? 0
      : computePriceImpactBps(midPriceQ18, amountIn, amountOutRaw, tokenIn.decimals, tokenOut.decimals)

    const hopVersions: RouteHopVersion[] = ['v3']
    const estimatedGasUnits = estimateGasForRoute(hopVersions)
    const estimatedGasCostWei = gasPriceWei ? gasPriceWei * estimatedGasUnits : null

    return {
      chain: chain.key,
      amountIn,
      amountOut: amountOutRaw,
      priceQ18: executionPriceQ18,
      executionPriceQ18,
      midPriceQ18,
      priceImpactBps,
      path: [tokenIn, tokenOut],
      routeAddresses: [tokenIn.address, tokenOut.address],
      sources: [
        {
          dexId: dex.id,
          poolAddress: snapshot.poolAddress,
          feeTier: snapshot.fee,
          approximate: approximateOutput,
          amountIn,
          amountOut: amountOutRaw,
        },
      ],
      liquidityScore: BigInt(snapshot.liquidity),
      hopVersions,
      estimatedGasUnits,
      estimatedGasCostWei,
      gasPriceWei,
    }
  }

  private buildV2Tokens(
    dex: DexConfig,
    tokenIn: TokenMetadata,
    tokenOut: TokenMetadata,
  ) {
    if (dex.protocol === 'uniswap') {
      return {
        tokenInInstance: new UniToken(
          tokenIn.chainId,
          tokenIn.address,
          tokenIn.decimals,
          tokenIn.symbol,
          tokenIn.name,
        ),
        tokenOutInstance: new UniToken(
          tokenOut.chainId,
          tokenOut.address,
          tokenOut.decimals,
          tokenOut.symbol,
          tokenOut.name,
        ),
      }
    }

    return {
      tokenInInstance: new CakeToken(
        tokenIn.chainId,
        tokenIn.address,
        tokenIn.decimals,
        tokenIn.symbol,
        tokenIn.name,
      ),
      tokenOutInstance: new CakeToken(
        tokenOut.chainId,
        tokenOut.address,
        tokenOut.decimals,
        tokenOut.symbol,
        tokenOut.name,
      ),
    }
  }

  private buildV3Tokens(
    dex: DexConfig,
    tokenIn: TokenMetadata,
    tokenOut: TokenMetadata,
    snapshot: V3PoolSnapshot,
  ) {
    const resolveMeta = (address: Address) => {
      if (sameAddress(address, tokenIn.address)) {
        return tokenIn
      }
      if (sameAddress(address, tokenOut.address)) {
        return tokenOut
      }
      return tokenIn
    }

    if (dex.protocol === 'uniswap') {
      const token0Meta = resolveMeta(snapshot.token0)
      const token1Meta = resolveMeta(snapshot.token1)
      const token0 = new UniToken(
        token0Meta.chainId,
        token0Meta.address,
        token0Meta.decimals,
        token0Meta.symbol,
        token0Meta.name,
      )
      const token1 = new UniToken(
        token1Meta.chainId,
        token1Meta.address,
        token1Meta.decimals,
        token1Meta.symbol,
        token1Meta.name,
      )
      const tokenInInstance = sameAddress(tokenIn.address, token0.address) ? token0 : token1
      const tokenOutInstance = sameAddress(tokenOut.address, token0.address) ? token0 : token1
      return { tokenInInstance, tokenOutInstance, token0, token1 }
    }

    const token0Meta = resolveMeta(snapshot.token0)
    const token1Meta = resolveMeta(snapshot.token1)
    const token0 = new CakeToken(
      token0Meta.chainId,
      token0Meta.address,
      token0Meta.decimals,
      token0Meta.symbol,
      token0Meta.name,
    )
    const token1 = new CakeToken(
      token1Meta.chainId,
      token1Meta.address,
      token1Meta.decimals,
      token1Meta.symbol,
      token1Meta.name,
    )
    const tokenInInstance = sameAddress(tokenIn.address, token0.address) ? token0 : token1
    const tokenOutInstance = sameAddress(tokenOut.address, token0.address) ? token0 : token1
    return { tokenInInstance, tokenOutInstance, token0, token1 }
  }
}

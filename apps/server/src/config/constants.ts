import { getAddress } from 'viem'
import type { Address } from 'viem'
import type { ChainKey, TokenMetadata } from '../types'

export const Q18 = 10n ** 18n

export const DEFAULT_TOKEN_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export const MIN_V2_RESERVE_THRESHOLD = 10n ** 12n // ~1e-6 scaled reserve threshold to filter dust pairs
export const MIN_V3_LIQUIDITY_THRESHOLD = 0n // Skip ultra-low liquidity pools

export const INTERMEDIATE_TOKENS: Record<ChainKey, Array<Omit<TokenMetadata, 'totalSupply'>>> = {
  ethereum: [
    {
      chainId: 1,
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
    },
    {
      chainId: 1,
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
    {
      chainId: 1,
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
    },
    {
      chainId: 1,
      address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
      symbol: 'BUSD',
      name: 'Binance USD',
      decimals: 18,
    },
  ],
  bsc: [
    {
      chainId: 56,
      address: '0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      symbol: 'WBNB',
      name: 'Wrapped BNB',
      decimals: 18,
    },
    {
      chainId: 56,
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 18,
    },
    {
      chainId: 56,
      address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 18,
    },
    {
      chainId: 56,
      address: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
      symbol: 'BUSD',
      name: 'Binance USD',
      decimals: 18,
    },
  ],
}

export const INTERMEDIATE_TOKEN_ADDRESSES: Record<ChainKey, Address[]> = Object.fromEntries(
  Object.entries(INTERMEDIATE_TOKENS).map(([chain, tokens]) => [
    chain,
    tokens.map((t) => getAddress(t.address)),
  ]),
) as Record<ChainKey, Address[]>

const envAddressOrNull = (name: string): Address | null => {
  const value = process.env[name]
  if (!value) {
    return null
  }
  try {
    return getAddress(value)
  } catch (error) {
    console.warn(`[executor] invalid address for ${name}:`, (error as Error).message)
    return null
  }
}

export const AEQUI_EXECUTOR_ADDRESS: Record<ChainKey, Address | null> = {
  ethereum: envAddressOrNull('AEQUI_EXECUTOR_ETH'),
  bsc: envAddressOrNull('AEQUI_EXECUTOR_BSC') ?? getAddress('0xb35176A22AC97c88155417DCe4Bd5d9c2E095A60'),
}

const DEFAULT_INTERHOP_BUFFER_BPS = 3
const parsedInterhopBuffer = Number.parseInt(process.env.EXECUTOR_INTERHOP_BUFFER_BPS ?? String(DEFAULT_INTERHOP_BUFFER_BPS), 10)
export const EXECUTOR_INTERHOP_BUFFER_BPS = Number.isFinite(parsedInterhopBuffer) && parsedInterhopBuffer >= 0
  ? parsedInterhopBuffer
  : DEFAULT_INTERHOP_BUFFER_BPS

const DEFAULT_SWAP_QUOTE_TTL_SECONDS = 15
const parsedQuoteTtl = Number.parseInt(process.env.SWAP_QUOTE_TTL_SECONDS ?? String(DEFAULT_SWAP_QUOTE_TTL_SECONDS), 10)
export const SWAP_QUOTE_TTL_SECONDS = Number.isFinite(parsedQuoteTtl) && parsedQuoteTtl > 0
  ? parsedQuoteTtl
  : DEFAULT_SWAP_QUOTE_TTL_SECONDS

import type { Address } from 'viem'
import type { ChainConfig, QuoteResult, RoutePreference } from '../../types'
import { parseAmountToUnits } from '../../utils/units'
import { PriceService } from '../price/price-service'
import { TokenService } from '../tokens/token-service'

const clampSlippage = (value: number) => {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0
  }
  if (value < 0) {
    return 0
  }
  if (value > 5000) {
    return 5000
  }
  return Math.floor(value)
}

export class QuoteService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly priceService: PriceService,
  ) {}

  async getQuote(
    chain: ChainConfig,
    tokenInAddress: Address,
    tokenOutAddress: Address,
    amount: string,
    slippageBps: number,
    preference: RoutePreference = 'auto',
  ): Promise<QuoteResult | null> {
    if (tokenInAddress.toLowerCase() === tokenOutAddress.toLowerCase()) {
      return null
    }

    const [tokenIn, tokenOut] = await Promise.all([
      this.tokenService.getTokenMetadata(chain, tokenInAddress),
      this.tokenService.getTokenMetadata(chain, tokenOutAddress),
    ])

    const amountIn = parseAmountToUnits(amount, tokenIn.decimals)
    if (amountIn <= 0n) {
      throw new Error('Amount must be greater than zero')
    }

  const quote = await this.priceService.getBestQuoteForTokens(chain, tokenIn, tokenOut, amountIn, preference)
    if (!quote) {
      return null
    }

    const boundedSlippage = clampSlippage(slippageBps)
    const slippageAmount = (quote.amountOut * BigInt(boundedSlippage)) / 10000n
    const amountOutMin = quote.amountOut > slippageAmount ? quote.amountOut - slippageAmount : 0n

    return {
      quote,
      amountOutMin,
      slippageBps: boundedSlippage,
      tokenIn,
      tokenOut,
    }
  }
}

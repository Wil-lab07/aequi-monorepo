import type { ChainConfig, DexConfig } from '../../types'

export class ExchangeService {
  listDexes(chain: ChainConfig): DexConfig[] {
    return chain.dexes
  }
}

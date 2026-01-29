// Adapted from packages/core/src/types.ts to avoid direct dependency
// Using string for Address/BigInt serialization in API responses

export type Address = string;
export type ChainKey = 'ethereum' | 'bsc' | 'sepolia';
export type RouteHopVersion = 'v2' | 'v3';

export interface TokenMetadata {
    chainId: number;
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    totalSupply?: string; // Serialized BigInt
}

export interface PriceSource {
    dexId: string;
    poolAddress: Address;
    feeTier?: number;
    amountIn: string; // Serialized BigInt
    amountOut: string; // Serialized BigInt
}

export interface PriceQuote {
    chain: ChainKey;
    amountIn: string;
    amountOut: string;
    priceQ18: string;
    executionPriceQ18: string;
    midPriceQ18: string;
    priceImpactBps: number;
    path: TokenMetadata[];
    routeAddresses: Address[];
    sources: PriceSource[];
    liquidityScore: string;
    hopVersions: RouteHopVersion[];
    estimatedGasUnits?: string;
    estimatedGasCostWei?: string;
    gasPriceWei?: string;
    offers?: PriceQuote[];
}

export interface QuoteResult {
    quote: PriceQuote;
    amountOutMin: string;
    slippageBps: number;
    tokenIn: TokenMetadata;
    tokenOut: TokenMetadata;
    estimatedGas?: string;
}

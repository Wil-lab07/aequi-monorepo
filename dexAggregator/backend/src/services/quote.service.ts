import { ethers } from 'ethers';
import { appConfig } from '../config/app-config';
import { LENS_ABI, UNISWAP_V3_QUOTER_ABI } from '../config/abis';
import { CHAIN_CONFIGS, ChainConfig, DexConfig } from '../config/chains';
import { ProviderService } from './provider.service';
import { QuoteResult, TokenMetadata, PriceSource as ApiPriceSource, RouteHopVersion, PriceQuote } from '../types/quote';
import { computeMidPriceQ18FromReserves, computeExecutionPriceQ18, computePriceImpactBps, compareQuotes, computeMidPriceQ18FromSqrtPriceX96, estimateGasForRoute } from '../utils/math';

interface DiscoveredPool {
    address: string;
    protocol: string;
    version: 'V2' | 'V3';
    quoter?: string;
}

// Internal structures using BigInt for precision during calculation
interface InternalQuoteCandidate {
    chain: string;
    amountIn: bigint;
    amountOut: bigint;
    priceQ18: bigint;
    executionPriceQ18: bigint;
    midPriceQ18: bigint;
    priceImpactBps: number;
    path: TokenMetadata[];
    routeAddresses: string[];
    sources: InternalPriceSource[];
    liquidityScore: bigint;
    hopVersions: ('v2' | 'v3')[];
    estimatedGasUnits: bigint | null;
    estimatedGasCostWei: bigint | null;
    gasPriceWei: bigint | null;
    offers?: InternalQuoteCandidate[];
}

export interface InternalPriceSource {
    dexId: string;
    poolAddress: string;
    feeTier?: number;
    approximate?: boolean;
    amountIn: bigint;
    amountOut: bigint;
    midPriceQ18?: bigint;       // Precise mid-price for this hop
    priceImpactBps?: number;    // Impact for this hop
    executionPriceQ18?: bigint; // Execution price for this hop
    reserves?: {
        reserve0?: bigint;
        reserve1?: bigint;
        liquidity?: bigint;
        token0?: string;
        token1?: string;
    }
}

export class QuoteService {
    private static instance: QuoteService;

    private constructor() { }

    public static getInstance(): QuoteService {
        if (!QuoteService.instance) {
            QuoteService.instance = new QuoteService();
        }
        return QuoteService.instance;
    }

    public async getQuote(
        chainId: number,
        tokenInAddress: string,
        tokenOutAddress: string,
        amountIn: string,
        slippageBps: number = 50
    ): Promise<QuoteResult> {
        // 1. Setup & Validation
        const { provider, lens, chainConfig } = this.initializeContext(chainId);
        const { tokenIn, tokenOut } = await this.resolveTokens(lens, chainId, tokenInAddress, tokenOutAddress);
        const amountInBigInt = ethers.parseUnits(amountIn, tokenIn.decimals);

        // Fetch Gas Price
        let gasPriceWei = 0n;
        try {
            const feeData = await provider.getFeeData();
            gasPriceWei = feeData.gasPrice ?? 0n;
        } catch (e) { console.warn('Failed to fetch gas price'); }

        console.log(`🔎 Quote requested for ${tokenIn.symbol} -> ${tokenOut.symbol} on Chain ${chainId}`);
        console.log(`   Amount: ${amountIn} -> ${amountInBigInt.toString()}`);
        console.log(`   Gas Price: ${ethers.formatUnits(gasPriceWei, 'gwei')} gwei`);

        // 2. Fetch DirectQuote & MultiHopsQuote in parallel
        // This matches PriceService's clean delegation flow
        const [directQuotes, multiHopQuotes] = await Promise.all([
            this.fetchDirectQuote(provider, lens, chainConfig, tokenIn, tokenOut, amountInBigInt, gasPriceWei),
            this.fetchMultiHopsQuote(provider, lens, chainConfig, tokenIn, tokenOut, amountInBigInt, gasPriceWei)
        ]);

        // Merge candidates
        const candidates = [...directQuotes, ...multiHopQuotes];

        if (candidates.length === 0) {
            throw new Error(`No route found for ${tokenIn.symbol}->${tokenOut.symbol}`);
        }

        // 4. Select Best Quote
        const bestQuote = this.selectBestQuote(candidates);

        // Format Impact for logging
        const impactFormatted = (bestQuote.priceImpactBps / 100).toFixed(2);
        console.log(`🏆 BEST QUOTE: ${ethers.formatUnits(bestQuote.amountOut, tokenOut.decimals)} ${tokenOut.symbol}`);
        console.log(`   Via: ${bestQuote.sources.map(s => s.dexId).join(' -> ')}`);
        console.log(`   Price Impact: ${impactFormatted}%`);
        console.log(`   Est Gas: ${bestQuote.estimatedGasCostWei?.toString() || '0'} wei`);

        // Map Internal to API Response
        const mapCandidateToApi = (c: InternalQuoteCandidate): PriceQuote => ({
            chain: c.chain === 'sepolia' ? 'sepolia' : 'bsc', // Simple mapping for now
            amountIn: c.amountIn.toString(),
            amountOut: c.amountOut.toString(),
            priceQ18: c.priceQ18.toString(),
            executionPriceQ18: c.executionPriceQ18.toString(),
            midPriceQ18: c.midPriceQ18.toString(),
            priceImpactBps: c.priceImpactBps,
            liquidityScore: c.liquidityScore.toString(),
            path: c.path,
            routeAddresses: c.routeAddresses,
            hopVersions: c.hopVersions as RouteHopVersion[],
            sources: c.sources.map(s => ({
                dexId: s.dexId,
                poolAddress: s.poolAddress,
                feeTier: s.feeTier,
                amountIn: s.amountIn.toString(),
                amountOut: s.amountOut.toString()
            })),
            estimatedGasCostWei: c.estimatedGasCostWei ? c.estimatedGasCostWei.toString() : '0',
            gasPriceWei: c.gasPriceWei ? c.gasPriceWei.toString() : '0'
        });

        // Populate offers (secondary options)
        const offers = candidates
            .filter((c) => c !== bestQuote)
            .sort(compareQuotes)
            .map(mapCandidateToApi);

        const bestQuoteApi: PriceQuote = {
            ...mapCandidateToApi(bestQuote),
            offers: offers.length > 0 ? offers : undefined
        };

        return {
            tokenIn,
            tokenOut,
            amountOutMin: bestQuote.amountOut.toString(), // TODO: Apply slippage
            slippageBps,
            quote: bestQuoteApi
        };
    }

    // ==========================================
    // Core Fetchers
    // ==========================================

    /**
     * Shared helper to discover pools and calculate quotes for a pair.
     * Used by both Direct (1 hop) and Multi (2 hops) flows.
     */
    private async getSources(
        provider: any,
        lens: ethers.Contract,
        chainConfig: ChainConfig,
        tokenIn: TokenMetadata,
        tokenOut: TokenMetadata,
        amountIn: bigint
    ): Promise<InternalPriceSource[]> {
        // 1. Discover Pools
        const pools = await this.discoverAllPools(lens, chainConfig, tokenIn.address, tokenOut.address);
        console.log(`Discovered ${pools.length} pools for ${tokenIn.symbol}->${tokenOut.symbol}`);

        // 2. Fetch Data & Calculate Metrics
        return this.processPoolsToSources(provider, lens, pools, tokenIn, tokenOut, amountIn);
    }

    private async fetchDirectQuote(
        provider: any,
        lens: ethers.Contract,
        chainConfig: ChainConfig,
        tokenIn: TokenMetadata,
        tokenOut: TokenMetadata,
        amountIn: bigint,
        gasPriceWei: bigint
    ): Promise<InternalQuoteCandidate[]> {
        // Reuse shared logic
        const sources = await this.getSources(provider, lens, chainConfig, tokenIn, tokenOut, amountIn);

        // Wrap each source into a Candidate (Route with 1 Hop)
        // [source] is passed because constructCandidate expects an Array of Hops
        return sources.map(source => this.constructCandidate(
            tokenIn,
            tokenOut,
            amountIn,
            source.amountOut,
            [source],
            [tokenIn, tokenOut],
            gasPriceWei
        ));
    }

    private async fetchMultiHopsQuote(
        provider: any,
        lens: ethers.Contract,
        chainConfig: ChainConfig,
        tokenIn: TokenMetadata,
        tokenOut: TokenMetadata,
        amountIn: bigint,
        gasPriceWei: bigint
    ): Promise<InternalQuoteCandidate[]> {
        const candidates: InternalQuoteCandidate[] = [];

        // Identify intermediate tokens (bases)
        const bases = chainConfig.tokens.filter(t =>
            t.address.toLowerCase() !== tokenIn.address.toLowerCase() &&
            t.address.toLowerCase() !== tokenOut.address.toLowerCase()
        );

        // Parallelize discovery for each base
        const basePromises = bases.map(async (baseToken) => {
            // Leg 1: In -> Base (Reuse shared logic)
            const sourcesLeg1 = await this.getSources(provider, lens, chainConfig, tokenIn, baseToken as unknown as TokenMetadata, amountIn);
            if (sourcesLeg1.length === 0) return;

            // No pruning per user request: verify ALL combinations
            // Parallelize Leg 2 fetching for all Leg 1 sources to minimize latency
            const leg2Promises = sourcesLeg1.map(async (source1) => {
                // Leg 2: Base -> Out (Reuse shared logic)
                const sourcesLeg2 = await this.getSources(provider, lens, chainConfig, baseToken as unknown as TokenMetadata, tokenOut, source1.amountOut);

                for (const source2 of sourcesLeg2) {
                    // Combine Leg 1 + Leg 2
                    candidates.push(this.constructCandidate(
                        tokenIn,
                        tokenOut,
                        amountIn,
                        source2.amountOut,
                        [source1, source2], // Route has 2 Hops
                        [tokenIn, baseToken as unknown as TokenMetadata, tokenOut],
                        gasPriceWei
                    ));
                }
            });

            await Promise.all(leg2Promises);
        });

        await Promise.all(basePromises);
        return candidates;
    }

    // ==========================================
    // Processing Helpers
    // ==========================================

    private async processPoolsToSources(
        provider: any,
        lens: ethers.Contract,
        pools: DiscoveredPool[],
        tokenIn: TokenMetadata,
        tokenOut: TokenMetadata,
        amountIn: bigint
    ): Promise<InternalPriceSource[]> {
        const sources: InternalPriceSource[] = [];
        const v2Pools = pools.filter(p => p.version === 'V2');
        const v3Pools = pools.filter(p => p.version === 'V3');

        // Parallel Data Fetching
        const [v2Data, v3DataRaw] = await Promise.all([
            v2Pools.length ? lens.batchGetV2PoolData(v2Pools.map(p => p.address)) : [],
            v3Pools.length ? lens.batchGetV3PoolData(v3Pools.map(p => p.address)) : []
        ]);

        // Process V2
        v2Data.forEach((data: any) => {
            if (data.exists) {
                const pool = v2Pools.find(p => p.address.toLowerCase() === data.pool.toLowerCase());
                if (!pool) return;

                const amountOut = this.calculateV2Quote(amountIn, data.reserve0, data.reserve1, data.token0, tokenIn.address);
                if (amountOut > 0n) {
                    const { reserveIn, reserveOut } = this.getReserves(data.reserve0, data.reserve1, data.token0, tokenIn.address);

                    const midPriceQ18 = computeMidPriceQ18FromReserves(reserveIn, reserveOut, tokenIn.decimals, tokenOut.decimals);
                    const executionPriceQ18 = computeExecutionPriceQ18(amountIn, amountOut, tokenIn.decimals, tokenOut.decimals);
                    const priceImpactBps = computePriceImpactBps(midPriceQ18, amountIn, amountOut, tokenIn.decimals, tokenOut.decimals);

                    console.log(`   [V2] ${pool.protocol}: ${ethers.formatUnits(amountOut, tokenOut.decimals)} ${tokenOut.symbol} (Impact: ${priceImpactBps / 100}%)`);

                    sources.push({
                        dexId: pool.protocol,
                        poolAddress: pool.address,
                        amountIn,
                        amountOut,
                        midPriceQ18,
                        priceImpactBps,
                        executionPriceQ18,
                        reserves: {
                            reserve0: data.reserve0,
                            reserve1: data.reserve1,
                            token0: data.token0,
                            token1: data.token1,
                            liquidity: reserveIn + reserveOut
                        }
                    });
                }
            }
        });

        // Process V3
        const validV3Pools = v3DataRaw
            .map((data: any) => ({
                pool: data.pool,
                sqrtPriceX96: data.sqrtPriceX96,
                tick: data.tick,
                liquidity: data.liquidity,
                token0: data.token0,
                token1: data.token1,
                fee: data.fee,
                exists: data.exists,
                dexName: pools.find(p => p.address === data.pool)?.protocol
            }))
            .filter((data: any) => data.exists && data.liquidity > 0n);

        console.log(v3DataRaw)
        console.log(validV3Pools)

        if (validV3Pools.length > 0) {
            await Promise.all(validV3Pools.map(async (data: any) => {
                const poolDef = v3Pools.find(p => p.address === data.pool);
                if (!poolDef || !poolDef.quoter) return;

                const quoter = new ethers.Contract(poolDef.quoter, UNISWAP_V3_QUOTER_ABI, provider);
                try {
                    // QuoterV2 uses a struct param and returns a tuple
                    // We must use staticCall because it's not a view function
                    const result = await quoter.quoteExactInputSingle.staticCall({
                        tokenIn: tokenIn.address,
                        tokenOut: tokenOut.address,
                        fee: data.fee,
                        amountIn: amountIn,
                        sqrtPriceLimitX96: 0
                    });

                    // Result is [amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate]
                    const amountOut = result[0];

                    if (amountOut > 0n) {
                        const isToken0 = tokenIn.address.toLowerCase() === data.token0.toLowerCase();
                        const midPriceQ18 = computeMidPriceQ18FromSqrtPriceX96(data.sqrtPriceX96, tokenIn.decimals, tokenOut.decimals, isToken0);
                        const executionPriceQ18 = computeExecutionPriceQ18(amountIn, amountOut, tokenIn.decimals, tokenOut.decimals);
                        const priceImpactBps = computePriceImpactBps(midPriceQ18, amountIn, amountOut, tokenIn.decimals, tokenOut.decimals);

                        console.log(`   [V3] ${poolDef.protocol}: ${ethers.formatUnits(amountOut, tokenOut.decimals)} ${tokenOut.symbol} (Impact: ${priceImpactBps / 100}%)`);

                        sources.push({
                            dexId: poolDef.protocol,
                            poolAddress: poolDef.address,
                            feeTier: Number(data.fee),
                            amountIn,
                            amountOut,
                            midPriceQ18,
                            priceImpactBps,
                            executionPriceQ18,
                            reserves: {
                                liquidity: data.liquidity
                            }
                        });
                    }
                } catch (e: any) {
                    console.warn(`   [V3 Quoter Fail] ${poolDef.protocol} ${poolDef.address} -> ${e.message}`);
                }
            }));
        } else {
            console.log(`   [V3 Processing] No valid V3 pools with liquidity found out of ${v3Pools.length} candidates`);
        }

        return sources;
    }

    private constructCandidate(
        tokenIn: TokenMetadata,
        tokenOut: TokenMetadata,
        amountIn: bigint,
        amountOut: bigint,
        sources: InternalPriceSource[],
        path: TokenMetadata[],
        gasPriceWei: bigint
    ): InternalQuoteCandidate {
        // Calculate aggregate metrics
        let executionPriceQ18: bigint;
        let midPriceQ18: bigint;
        let priceImpactBps: number;

        if (sources.length === 1) {
            // Direct Quote: Use precise pre-calculated metrics
            const s = sources[0];
            executionPriceQ18 = s.executionPriceQ18!;
            midPriceQ18 = s.midPriceQ18!;
            priceImpactBps = s.priceImpactBps!;
        } else {
            // Multi-hop: Aggregate
            executionPriceQ18 = computeExecutionPriceQ18(amountIn, amountOut, tokenIn.decimals, tokenOut.decimals);

            // Mid Price Chaining
            const allHopsHaveMidPrice = sources.every(s => s.midPriceQ18 !== undefined);
            if (allHopsHaveMidPrice && sources.length > 0) {
                midPriceQ18 = sources.reduce((acc, s) => (acc * (s.midPriceQ18!)) / ethers.parseUnits('1', 18), ethers.parseUnits('1', 18));
            } else {
                midPriceQ18 = executionPriceQ18;
            }

            priceImpactBps = computePriceImpactBps(midPriceQ18, amountIn, amountOut, tokenIn.decimals, tokenOut.decimals);
        }

        const liquidityScore = sources.reduce((min, s) => {
            const l = s.reserves?.liquidity || 0n;
            if (min === -1n) return l;
            return l < min ? l : min;
        }, -1n);

        const routeAddresses = path.map(t => t.address);

        const hopVersions = sources.map(s => {
            return s.feeTier !== undefined ? 'v3' : 'v2';
        }) as ('v2' | 'v3')[];

        // --- Gas Estimation Logic ---
        const estimatedGasUnits = estimateGasForRoute(hopVersions);
        const estimatedGasCostWei = gasPriceWei > 0n ? estimatedGasUnits * gasPriceWei : 0n;

        return {
            chain: tokenIn.chainId === 11155111 ? 'sepolia' : 'bsc',
            amountIn,
            amountOut,
            priceQ18: executionPriceQ18, // same as execution for now
            executionPriceQ18,
            midPriceQ18,
            priceImpactBps,
            path,
            routeAddresses,
            sources,
            liquidityScore: liquidityScore === -1n ? 0n : liquidityScore,
            hopVersions,
            estimatedGasUnits,
            estimatedGasCostWei,
            gasPriceWei
        };
    }

    private selectBestQuote(candidates: InternalQuoteCandidate[]): InternalQuoteCandidate {
        candidates.sort(compareQuotes);
        return candidates[0];
    }

    // ==========================================
    // Context Helpers
    // ==========================================
    private initializeContext(chainId: number) {
        try {
            const provider = ProviderService.getInstance().getProvider(chainId);
            const lensAddress = appConfig.lens[chainId === 11155111 ? 'sepolia' : 'bsc'];
            if (!lensAddress) throw new Error(`Lens not configured for chain ${chainId}`);

            const lens = new ethers.Contract(lensAddress, LENS_ABI, provider);
            const chainConfig = CHAIN_CONFIGS[chainId];
            if (!chainConfig) throw new Error(`No configuration for chain ${chainId}`);

            return { provider, lens, chainConfig };
        } catch (err: any) {
            throw new Error(`Initialization failed: ${err.message}`);
        }
    }

    private async resolveTokens(lens: ethers.Contract, chainId: number, addrIn: string, addrOut: string) {
        try {
            addrIn = ethers.getAddress(addrIn);
            addrOut = ethers.getAddress(addrOut);
        } catch (e) { throw new Error(`Invalid address format`); }

        try {
            const results = await lens.batchGetTokenMetadata([addrIn, addrOut]);
            const [metaIn, metaOut] = results;

            // Strict checking (Decimals 0 usually means not found or invalid)
            if (Number(metaIn.decimals) === 0 && metaIn.symbol === '') throw new Error(`TokenIn ${addrIn} not found on chain ${chainId}`);
            if (Number(metaOut.decimals) === 0 && metaOut.symbol === '') throw new Error(`TokenOut ${addrOut} not found on chain ${chainId}`);

            return {
                tokenIn: {
                    chainId,
                    address: addrIn,
                    symbol: metaIn.symbol,
                    name: metaIn.name,
                    decimals: Number(metaIn.decimals),
                    totalSupply: metaIn.totalSupply ? metaIn.totalSupply.toString() : undefined
                } as TokenMetadata,
                tokenOut: {
                    chainId,
                    address: addrOut,
                    symbol: metaOut.symbol,
                    name: metaOut.name,
                    decimals: Number(metaOut.decimals),
                    totalSupply: metaOut.totalSupply ? metaOut.totalSupply.toString() : undefined
                } as TokenMetadata
            };
        } catch (err: any) {
            throw new Error(`Token resolution failed: ${err.message}`);
        }
    }

    private async discoverAllPools(
        lens: ethers.Contract,
        config: ChainConfig,
        token0: string,
        token1: string
    ): Promise<DiscoveredPool[]> {
        const requests = [{ token0, token1 }];

        const promises = config.dexes.map(async (dex) => {
            if (dex.version === 'V2') return this.discoverV2(lens, dex, requests);
            if (dex.version === 'V3') return this.discoverV3(lens, dex, requests);
            return [];
        });

        const results = await Promise.all(promises);
        const pools = results.flat();

        return pools;
    }

    private async discoverV2(lens: ethers.Contract, dex: DexConfig, requests: any[]): Promise<DiscoveredPool[]> {
        try {
            const results = await lens.batchGetV2Pools(dex.contracts.factory, requests);
            const found = results[0];
            if (this.isValidPool(found)) {
                return [{ address: found, protocol: dex.name, version: 'V2' }];
            }
        } catch (e) { }
        return [];
    }

    private async discoverV3(lens: ethers.Contract, dex: DexConfig, requests: any[]): Promise<DiscoveredPool[]> {
        try {
            const results = await lens.batchGetV3PoolsAllFees(dex.contracts.factory, requests);
            const tiers = results[0] as string[];

            if (!tiers) {
                console.log(`   [V3 Discovery] No tiers returned for ${dex.name}`);
                return [];
            }

            const valid = tiers.filter(addr => this.isValidPool(addr));
            console.log(`   [V3 Discovery] ${dex.name}: Found ${valid.length} valid pools (Raw Tiers: ${tiers.length})`);

            return valid.map(addr => ({
                address: addr,
                protocol: dex.name,
                version: 'V3',
                quoter: dex.contracts.quoter
            }));
        } catch (e: any) { console.error(`   [V3 Discovery Error] ${e.message}`); }
        return [];
    }

    private isValidPool(addr: string): boolean {
        return !!addr && addr !== ethers.ZeroAddress && addr !== "0x0000000000000000000000000000000000000000";
    }

    private getReserves(r0: bigint, r1: bigint, t0: string, tIn: string) {
        return t0.toLowerCase() === tIn.toLowerCase()
            ? { reserveIn: r0, reserveOut: r1 }
            : { reserveIn: r1, reserveOut: r0 };
    }

    private calculateV2Quote(amountIn: bigint, reserve0: bigint, reserve1: bigint, token0: string, tokenInAddress: string): bigint {
        const { reserveIn, reserveOut } = this.getReserves(reserve0, reserve1, token0, tokenInAddress);
        if (reserveIn === 0n || reserveOut === 0n) return 0n;

        const amountInWithFee = amountIn * 997n;
        const numerator = amountInWithFee * reserveOut;
        const denominator = (reserveIn * 1000n) + amountInWithFee;

        return numerator / denominator;
    }
}

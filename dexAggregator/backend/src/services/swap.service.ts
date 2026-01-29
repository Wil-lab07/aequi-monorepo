import { ethers } from 'ethers';
import { appConfig } from '../config/app-config';
import { AEQUI_EXECUTOR_ABI, UNISWAP_V2_ROUTER_ABI, UNISWAP_V3_ROUTER_ABI, WETH_ABI, UNISWAP_V3_QUOTER_ABI, LENS_ABI } from '../config/abis';
import { ChainConfig } from '../config/chains';
import { TokenMetadata, PriceQuote } from '../types/quote';
import { SwapTransaction, SwapBuildParams, ExecutorCallPlan } from '../types/swap';

export class SwapService {
    private static instance: SwapService;
    private readonly interhopBufferBps: number;

    private constructor() {
        this.interhopBufferBps = appConfig.executor.interhopBufferBps;
    }

    public static getInstance(): SwapService {
        if (!SwapService.instance) {
            SwapService.instance = new SwapService();
        }
        return SwapService.instance;
    }

    public buildSwapTransaction(chain: ChainConfig, params: SwapBuildParams): SwapTransaction {
        if (!params.quote.sources.length) {
            throw new Error('Quote is missing source information');
        }

        const deadlineSeconds = params.deadlineSeconds > 0 ? params.deadlineSeconds : 180;
        const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;
        const boundedSlippage = this.clampSlippage(params.slippageBps);

        const amountOutMinimum = params.amountOutMin > 0n
            ? params.amountOutMin
            : this.applySlippage(BigInt(params.quote.amountOut), boundedSlippage);

        return this.buildExecutorSwap(
            chain,
            params.quote,
            params.recipient,
            amountOutMinimum,
            BigInt(deadline),
            params.useNativeInput,
            params.useNativeOutput,
            params.existingApprovals
        );
    }

    /**
     * Builds the actual execution plan (The "swapBuilderFlow").
     * 
     * Concept: Explained in Explanation.md #swapBuilderFlow
     * The Executor contract is a "dumb" agent. It needs explicit instructions:
     * 1. Pull tokens from user.
     * 2. Wrap/Unwrap ETH if needed.
     * 3. Loop through hops (SwapCalculation).
     * 4. Inject intermediate balances (InjectionScenario).
     */
    private buildExecutorSwap(
        chain: ChainConfig,
        quote: PriceQuote,
        recipient: string,
        amountOutMin: bigint,
        deadline: bigint,
        useNativeInput?: boolean,
        useNativeOutput?: boolean,
        existingApprovals?: Map<string, bigint>
    ): SwapTransaction {
        const executorAddress = this.resolveExecutor(chain.chainId);
        const inputToken = quote.path[0];
        const outputToken = quote.path[quote.path.length - 1];

        // 1. Pulls
        // Explanation.md #PullScenario
        // We only pull the input token from the user.
        const pulls: { token: string; amount: bigint }[] = [];
        if (!useNativeInput) {
            pulls.push({ token: inputToken.address, amount: BigInt(quote.amountIn) });
        }

        const approvals: { token: string; spender: string; amount: bigint }[] = [];
        const executorCalls: { target: string; value: bigint; data: string; injectToken: string; injectOffset: bigint }[] = [];
        const tokensToFlush = new Set<string>();

        if (!useNativeInput) {
            tokensToFlush.add(inputToken.address);
        }

        const calls: ExecutorCallPlan[] = [];
        let availableAmount = BigInt(quote.amountIn);

        // 2. Wrap Native (if needed)
        if (useNativeInput) {
            // Sepolia WETH (TODO: Use chain config wrapped address properly)
            // For now assuming WETH is first token in path if useNativeInput is true
            const wrappedAddress = inputToken.address; // Should verify against chain config

            const wethInterface = new ethers.Interface(WETH_ABI);
            const wrapCallData = wethInterface.encodeFunctionData('deposit');

            executorCalls.push({
                target: wrappedAddress,
                value: BigInt(quote.amountIn),
                data: wrapCallData,
                injectToken: ethers.ZeroAddress,
                injectOffset: 0n
            });
            tokensToFlush.add(wrappedAddress);
        }

        // 3. Build Hops
        // Explained in Explanation.md #SwapCalculation
        // We iterate through every hop in the quote.
        for (let i = 0; i < quote.sources.length; i++) {
            const source = quote.sources[i];
            const tokenIn = quote.path[i];
            const tokenNext = quote.path[i + 1];
            const hopVersion = quote.hopVersions[i];

            const dex = chain.dexes.find(d => d.name === source.dexId && d.version.toLowerCase() === hopVersion.toLowerCase());
            // Note: DexId in source is just "Uniswap", but finding correct router needs version matching
            // Using first matching DEX config for now. Real implementation needs robust DexID mapping.
            const routerAddress = dex ? dex.contracts.router : ethers.ZeroAddress;
            if (routerAddress === ethers.ZeroAddress) throw new Error(`Router not found for ${source.dexId} ${hopVersion}`);

            const quotedHopAmountIn = BigInt(source.amountIn);
            let hopAmountIn = quotedHopAmountIn <= availableAmount ? quotedHopAmountIn : availableAmount;

            // Apply buffer for intermediate hops
            if (i > 0 && this.interhopBufferBps > 0 && hopAmountIn > 0n) {
                const buffer = (hopAmountIn * BigInt(this.interhopBufferBps)) / 10000n;
                if (buffer > 0n && buffer < hopAmountIn) hopAmountIn -= buffer;
            }

            const isLastHop = i === quote.sources.length - 1;
            const hopRecipient = (isLastHop && !useNativeOutput) ? recipient : executorAddress;

            const hopExpectedOut = BigInt(source.amountOut);
            const scaledHopExpectedOut = (hopExpectedOut * hopAmountIn) / quotedHopAmountIn;

            const hopMinOut = this.deriveHopMinOut(
                scaledHopExpectedOut,
                amountOutMin,
                BigInt(quote.amountOut),
                isLastHop
            );

            // Approval
            // Strategy: Persistent Infinite Approval
            const approvalAmount = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

            // Check existing allowance
            // Logic: Optimization to skip gas cost if checks pass.
            // Reference: Explanation.md #ApprovalOptimization
            let requiresApproval = true;
            if (existingApprovals) {
                const key = `${tokenIn.address.toLowerCase()}-${routerAddress.toLowerCase()}`;
                const currentAllowance = existingApprovals.get(key) || 0n;
                // Optimization: Only approve if current allowance is insufficient for THIS swap
                if (currentAllowance >= hopAmountIn) {
                    requiresApproval = false;
                }
            }

            if (requiresApproval) {
                approvals.push({
                    token: tokenIn.address,
                    spender: routerAddress,
                    amount: approvalAmount
                });
            }

            // Swap Call Data
            let swapCallData: string;
            let injectOffset = 0n;

            // Explanation.md #SelectionCode
            // V2 uses swapExactTokensForTokens.
            // V3 uses exactInputSingle.
            if (hopVersion === 'v2') {
                swapCallData = this.encodeV2SingleHopCall(tokenIn.address, tokenNext.address, hopAmountIn, hopMinOut, hopRecipient, deadline);
                // V2: swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline)
                // amountIn is 1st arg (offset 4 bytes)
                injectOffset = 4n;
            } else {
                const fee = source.feeTier || 3000;
                swapCallData = this.encodeV3SingleHopCall(tokenIn.address, tokenNext.address, fee, hopAmountIn, hopMinOut, hopRecipient, deadline);
                // V3: exactInputSingle((tokenIn, tokenOut, fee, recipient, deadline, amountIn, min, limit))
                // amountIn is 6th struct member.
                // Core Builder says: 4 + (5 * 32) = 164 for Standard Router
                injectOffset = 164n;
            }

            // Explanation.md #InjectionScenario
            // For multi-hop, the output of Hop 1 is inside the Contract.
            // Hop 2 must use that *exact* balance, which we don't know yet (dynamic).
            // So we tell the Executor: "Inject the balance of tokenIn into this calldata at this offset."
            const isInjectionNeeded = i > 0;
            const injectToken = isInjectionNeeded ? tokenIn.address : ethers.ZeroAddress;
            const finalInjectOffset = isInjectionNeeded ? injectOffset : 0n;

            const plannedCall = {
                target: routerAddress,
                value: 0n,
                data: swapCallData,
                injectToken,
                injectOffset: finalInjectOffset
            };

            executorCalls.push(plannedCall);
            tokensToFlush.add(tokenIn.address);
            if (hopRecipient === executorAddress) {
                tokensToFlush.add(tokenNext.address);
            }

            // Client visualization call (not used for execution)
            calls.push({
                target: routerAddress,
                allowFailure: false,
                callData: swapCallData,
                value: 0n
            });

            availableAmount = scaledHopExpectedOut;
        }

        // 4. Unwrap Native (if needed)
        if (useNativeOutput) {
            const wrappedAddress = outputToken.address;
            const wethInterface = new ethers.Interface(WETH_ABI);
            const unwrapCallData = wethInterface.encodeFunctionData('withdraw', [0n]); // Amount injected

            executorCalls.push({
                target: wrappedAddress,
                value: 0n,
                data: unwrapCallData,
                injectToken: wrappedAddress,
                injectOffset: 4n // Arg 0
            });
            tokensToFlush.add(wrappedAddress);
        }

        // 5. Encode Main Execute Call
        const executorInterface = new ethers.Interface(AEQUI_EXECUTOR_ABI);
        const executorData = executorInterface.encodeFunctionData('execute', [
            pulls,
            approvals,
            executorCalls,
            Array.from(tokensToFlush)
        ]);

        return {
            kind: 'executor',
            dexId: quote.sources.length === 1 ? quote.sources[0].dexId : 'multi',
            router: executorAddress,
            spender: executorAddress,
            amountIn: BigInt(quote.amountIn),
            amountOut: BigInt(quote.amountOut),
            amountOutMinimum: amountOutMin,
            deadline: Number(deadline),
            calls,
            call: {
                to: executorAddress,
                data: executorData,
                value: useNativeInput ? BigInt(quote.amountIn) : 0n
            },
            executor: {
                pulls,
                approvals,
                calls: executorCalls,
                tokensToFlush: Array.from(tokensToFlush)
            }
        };
    }

    public async fetchExecutorAllowances(
        provider: ethers.Provider,
        chainConfig: ChainConfig,
        quote: PriceQuote
    ): Promise<Map<string, bigint>> {
        const executorAddress = this.resolveExecutor(chainConfig.chainId);
        const lensAddress = this.resolveLens(chainConfig.chainId);
        const tokensToCheck: string[] = [];  // Flat list for batch call
        const spenderMap: string[] = [];     // Track which spender corresponds to which index since Lens checks 1 spender

        // Lens.batchCheckAllowances checks MULTIPLE tokens for ONE spender.
        // But we might have multiple routers (multiple spenders).
        // So we need to group by Spender.

        const checksBySpender = new Map<string, string[]>(); // Spender -> Token[]

        for (let i = 0; i < quote.sources.length; i++) {
            const tokenIn = quote.path[i].address;
            const hopVersion = quote.hopVersions[i];
            const source = quote.sources[i];

            const dex = chainConfig.dexes.find(d => d.name === source.dexId && d.version.toLowerCase() === hopVersion.toLowerCase());
            const routerAddress = dex ? dex.contracts.router : ethers.ZeroAddress;

            if (routerAddress !== ethers.ZeroAddress) {
                const list = checksBySpender.get(routerAddress) || [];
                if (!list.includes(tokenIn)) {
                    list.push(tokenIn);
                }
                checksBySpender.set(routerAddress, list);
            }
        }

        const results = new Map<string, bigint>();
        if (!lensAddress) return results;

        const lensContract = new ethers.Contract(lensAddress, LENS_ABI, provider);

        // Execute batch checks per spender
        // Optimally we could improve Lens to take (token, spender) tuples but current Lens is (tokens[], owner, spender)
        await Promise.all(Array.from(checksBySpender.entries()).map(async ([spender, tokens]) => {
            try {
                const allowances: bigint[] = await lensContract.batchCheckAllowances(tokens, executorAddress, spender);
                // Map back to results
                for (let i = 0; i < tokens.length; i++) {
                    const key = `${tokens[i].toLowerCase()}-${spender.toLowerCase()}`;
                    results.set(key, allowances[i]);
                }
            } catch (e) {
                console.warn(`Failed to check allowances for spender ${spender}`, e);
            }
        }));

        return results;
    }

    private resolveExecutor(chainId: number): string {
        const addr = chainId === 11155111 ? appConfig.executor.sepolia : appConfig.executor.bsc;
        if (!addr) throw new Error(`Executor not configured for chain ${chainId}`);
        return addr;
    }

    private resolveLens(chainId: number): string {
        return chainId === 11155111 ? appConfig.lens.sepolia : appConfig.lens.bsc;
    }

    // Clamps slippage to 1000 bps (10%)
    private clampSlippage(value: number): number {
        if (!Number.isFinite(value) || Number.isNaN(value) || value < 0) return 0;
        return value > 1000 ? 1000 : Math.floor(value);
    }

    // Applies slippage to amount
    private applySlippage(amount: bigint, slippageBps: number): bigint {
        if (amount === 0n || slippageBps <= 0) return amount;
        const penalty = (amount * BigInt(slippageBps)) / 10000n;
        return amount > penalty ? amount - penalty : 0n;
    }

    // Derives minimum output for a hop based on total minimum and expected
    private deriveHopMinOut(hopExpected: bigint, totalMin: bigint, totalExpected: bigint, isLast: boolean): bigint {
        if (isLast) return totalMin;
        if (totalExpected === 0n || hopExpected === 0n) return 0n;
        return (hopExpected * totalMin) / totalExpected;
    }

    /**
     * Encodes a V2 Swap Call.
     * Explanation.md #UniswapV2_Manual_math
     */
    private encodeV2SingleHopCall(inToken: string, outToken: string, amountIn: bigint, minOut: bigint, to: string, deadline: bigint): string {
        const iface = new ethers.Interface(UNISWAP_V2_ROUTER_ABI);
        return iface.encodeFunctionData('swapExactTokensForTokens', [
            amountIn,
            minOut,
            [inToken, outToken],
            to,
            deadline
        ]);
    }

    /**
     * Encodes a V3 Swap Call.
     * Explanation.md #UniswapV3_manual_math
     */
    private encodeV3SingleHopCall(inToken: string, outToken: string, fee: number, amountIn: bigint, minOut: bigint, to: string, deadline: bigint): string {
        // Sepolia Router (Uniswap) uses Standard Router (exactInputSingle with params struct)
        const iface = new ethers.Interface(UNISWAP_V3_ROUTER_ABI);

        // ExactInputSingleParams struct
        const params = {
            tokenIn: inToken,
            tokenOut: outToken,
            fee: fee,
            recipient: to,
            deadline: deadline,
            amountIn: amountIn,
            amountOutMinimum: minOut,
            sqrtPriceLimitX96: 0n
        };

        return iface.encodeFunctionData('exactInputSingle', [params]);
    }
}

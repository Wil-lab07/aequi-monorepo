import { Request, Response } from 'express';
import { QuoteService } from '../services/quote.service';
import { SwapService } from '../services/swap.service';
import { ProviderService } from '../services/provider.service';
import { ethers } from 'ethers';
import { formatUnits } from 'ethers';
import { CHAIN_CONFIGS } from '../config/chains';

// Helper to normalize addresses
const normalize = (addr: string) => addr ? addr.toLowerCase() : '';
const NATIVE_ADDRESS = '0xEeeeeEeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const isNative = (addr: string) => normalize(addr) === normalize(NATIVE_ADDRESS);

const CHAIN_MAP: Record<string, number> = {
    bnb: 56,
    bsc: 56,
    sepolia: 11155111
};

export const swap = async (req: Request, res: Response) => {
    /**
     * Swap Controller
     * Orchestrates the swap process.
     * 
     * Flow:
     * 1. Validate Input
     * 2. Quote (QuoteService) -> Explanation.md #QuoteSelection_DeepDive
     * 3. Build Transaction (SwapService) -> Explanation.md #swapBuilderFlow
     * 4. Optimize Approvals (Lens) -> Explanation.md #ApprovalOptimization
     * 5. Estimate Gas
     * 6. Return Response
     */
    try {
        // 1. Validation & Parsing
        const {
            chain: chainIdParam,
            tokenA: tokenAAddress,
            tokenB: tokenBAddress,
            amount,
            slippageBps,
            recipient,
            deadlineSeconds
        } = req.query;

        if (!chainIdParam || !tokenAAddress || !tokenBAddress || !amount || !recipient) {
            return res.status(400).json({ error: 'invalid_request', message: 'Missing required parameters' });
        }

        const chainIdStr = String(chainIdParam);
        const tokenAStr = String(tokenAAddress);
        const tokenBStr = String(tokenBAddress);
        const amountStr = String(amount);
        const recipientStr = String(recipient);

        const chainId = CHAIN_MAP[chainIdStr.toLowerCase()];
        if (!chainId) {
            return res.status(400).json({ error: `Unsupported chain: ${chainIdParam}` });
        }
        const slippage = Number(slippageBps ?? 50);
        const deadlineDuration = Number(deadlineSeconds ?? 180);

        // Chain Config Resolution
        const chainConfig = CHAIN_CONFIGS[chainId];
        if (!chainConfig) {
            return res.status(400).json({ error: 'unsupported_chain', message: `Chain ${chainId} not supported` });
        }

        console.log(`[Swap] Request: ${tokenAStr} -> ${tokenBStr} (${amountStr}) on ${chainId}`);

        // 2. Token Resolution
        // Determine effective tokens (handle Native -> Wrapped for QuoteService)
        // Let's do that to be safe and match reference.

        // Find wrapped token from config
        const WrappedToken = chainConfig.tokens.find((t: any) => t.symbol === 'WETH' || t.symbol === 'WBNB');
        if (!WrappedToken) {
            return res.status(500).json({ error: 'config_error', message: 'Wrapped Native token not configured' });
        }

        // Map inputs to effective addresses for quoting (Wrapped if Native)
        const effectiveTokenA = isNative(tokenAStr) ? WrappedToken.address : tokenAStr;
        const effectiveTokenB = isNative(tokenBStr) ? WrappedToken.address : tokenBStr;

        if (normalize(effectiveTokenA) === normalize(effectiveTokenB)) {
            return res.status(400).json({ error: 'invalid_request', message: 'TokenIn and TokenOut must be different' });
        }

        // 3. Get Quote
        const quoteService = QuoteService.getInstance();
        const quoteResult = await quoteService.getQuote(
            chainId,
            effectiveTokenA,
            effectiveTokenB,
            amountStr,
            slippage
        );

        if (!quoteResult) {
            return res.status(404).json({ error: 'no_route', message: 'No on-chain route found' });
        }

        const { quote, amountOutMin, tokenOut } = quoteResult;

        // 4. Build Transaction
        const swapService = SwapService.getInstance();
        const provider = ProviderService.getInstance().getProvider(chainId);

        // Optimize: Check existing allowances
        let existingApprovals: Map<string, bigint> | undefined;
        try {
            existingApprovals = await swapService.fetchExecutorAllowances(provider, chainConfig, quoteResult.quote);
        } catch (e) {
            console.warn('[Swap] Failed to fetch existing allowances, defaulting to full approval:', e);
        }

        let transaction;
        try {
            transaction = swapService.buildSwapTransaction(
                chainConfig,
                {
                    quote,
                    amountOutMin: BigInt(amountOutMin),
                    recipient: recipientStr,
                    slippageBps: slippage,
                    deadlineSeconds: deadlineDuration,
                    useNativeInput: isNative(tokenAStr),
                    useNativeOutput: isNative(tokenBStr),
                    existingApprovals
                }
            );
        } catch (e: any) {
            console.error('Build Error:', e);
            return res.status(400).json({ error: 'calldata_error', message: e.message });
        }

        console.log(transaction);

        // 5. Fetch Block Metadata & Estimate Gas
        let latestBlockNumber = null;
        let latestBlockTimestamp = null;
        let estimatedGas = undefined;

        try {
            const provider = ProviderService.getInstance().getProvider(chainId);
            const block = await provider.getBlock('latest');
            if (block) {
                latestBlockNumber = block.number;
                latestBlockTimestamp = block.timestamp;
            }

            // Estimate Gas of the executor call
            if (transaction.call) {
                try {
                    const est = await provider.estimateGas({
                        from: recipientStr,
                        to: transaction.call.to,
                        data: transaction.call.data,
                        value: transaction.call.value
                    });
                    // Apply 20% buffer
                    estimatedGas = ((est * 120n) / 100n).toString();
                } catch (gasError) {
                    console.warn(`[Swap] Gas estimation failed:`, gasError);
                    // Don't fail request, just omit estimatedGas
                }
            }
        } catch (error) {
            console.warn('[Swap] Failed to load block metadata:', error);
        }

        // 6. Format Response
        const quoteTimestamp = Math.floor(Date.now() / 1000);
        const quoteExpiresAt = quoteTimestamp + (transaction.deadline - quoteTimestamp);

        // Helper to format quote for response (reusing logic if needed or just passing raw)
        // Reference implementation separates 'formatPriceQuote'
        // For tidiness, we construct the specific shape here.

        const amountOutMinFormatted = ethers.formatUnits(amountOutMin, tokenOut.decimals);

        return res.json({
            quote: quoteResult.quote, // Keep existing structure
            amountOutMin: amountOutMin.toString(),
            amountOutMinFormatted,
            slippageBps: slippage,
            recipient: recipientStr,
            deadline: transaction.deadline,
            quoteTimestamp,
            quoteExpiresAt,
            quoteValidSeconds: deadlineDuration, // or SWAP_QUOTE_TTL_SECONDS
            quoteBlockNumber: latestBlockNumber ? latestBlockNumber.toString() : null,
            quoteBlockTimestamp: latestBlockTimestamp ? Number(latestBlockTimestamp) : null,
            transaction: {
                kind: transaction.kind,
                dexId: transaction.dexId,
                router: transaction.router,
                spender: transaction.spender,
                amountIn: transaction.amountIn.toString(),
                amountOut: transaction.amountOut.toString(),
                amountOutMinimum: transaction.amountOutMinimum.toString(),
                deadline: transaction.deadline,
                estimatedGas,
                calls: transaction.calls.map(c => ({
                    target: c.target,
                    allowFailure: c.allowFailure,
                    callData: c.callData,
                    value: c.value ? c.value.toString() : '0'
                })),
                call: transaction.call ? {
                    to: transaction.call.to,
                    data: transaction.call.data,
                    value: transaction.call.value.toString()
                } : null,
                executor: transaction.executor ? {
                    pulls: transaction.executor.pulls.map(p => ({
                        token: p.token,
                        amount: p.amount.toString()
                    })),
                    approvals: transaction.executor.approvals.map(a => ({
                        token: a.token,
                        spender: a.spender,
                        amount: a.amount.toString()
                    })),
                    calls: transaction.executor.calls.map(c => ({
                        target: c.target,
                        value: c.value.toString(),
                        data: c.data,
                        injectToken: c.injectToken,
                        injectOffset: c.injectOffset.toString()
                    })),
                    tokensToFlush: transaction.executor.tokensToFlush
                } : null
            }
        });

    } catch (error: any) {
        console.error('Swap Controller Error:', error);
        res.status(500).json({ error: 'internal_server_error', message: error.message });
    }
};

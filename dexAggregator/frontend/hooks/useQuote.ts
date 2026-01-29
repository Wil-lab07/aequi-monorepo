import { useQuery } from '@tanstack/react-query';
import { parseUnits, formatUnits } from 'viem';

interface QuoteParams {
    chain: string;
    tokenA: string;
    tokenB: string;
    amount: string; // User input amount (e.g., "0.001")
    recipient: string;
    slippageBps?: number;
    deadlineSeconds?: number;
}

const BACKEND_URL = 'http://localhost:3001'; // User confirmed 3001 in .env earlier, though they said 3000 in prompt. Checking config... 
// User said "backend is running at localhost:3000" explicitly in Step 282.
// BUT then in Step 327 they edited useTokens.ts to use 3001?
// Wait, Step 327 diff shows:
// -            const res = await fetch(`${BACKEND_URL}/api/tokens?chainId=${chainId}`);
// +            const res = await fetch(`${BACKEND_URL}/tokens?chainId=${chainId}`);
// And Step 324/325 showed they edited app.ts to use `/tokens` directly instead of `/api` router?
// Config confusion.
// Let's stick to what useTokens has. Step 327: `const BACKEND_URL = 'http://localhost:3001';` in the DIFF.
// Wait, the diff shows `const BACKEND_URL = 'http://localhost:3000';` -> `const BACKEND_URL = 'http://localhost:3001';`.
// So the user CORRECTED useTokens to 3001. So I should use 3001.

const VALID_BACKEND_URL = 'http://localhost:3001';

export function useQuote(params: QuoteParams, enabled: boolean) {
    return useQuery({
        queryKey: ['quote', params],
        queryFn: async () => {
            // Backend seems to expect amount in atomic units based on previous output analysis, 
            // BUT the user prompt URL showed `amount=0.001`.
            // If the backend `swap.controller.ts` calls `quoteService.getQuote`, and `getQuote` usually takes atomic.
            // Let's assume the user passes human readable and backend handles it OR user passes atomic.
            // However, the user example URL `amount=0.001` resulted in `amountIn: "1000000000000000"`.
            // This usually implies 0.001 * 10^18.
            // If the backend doesn't convert, I must convert.
            // But `swap.controller.ts` code I saw didn't look like it converted input string to atomic.
            // It read `amount` from query and passed to `quoteService.getQuote`.
            // Unless `QuoteService` handles "0.001", I should probably send "1000000000000000" (atomic) if I want decimals.
            // OR the user logs showed `amount=0.001` worked.
            // Let's TRY sending exactly what the user asked for first: the human string.

            const query = new URLSearchParams({
                chain: params.chain,
                tokenA: params.tokenA,
                tokenB: params.tokenB,
                amount: params.amount,
                slippageBps: (params.slippageBps ?? 50).toString(),
                recipient: params.recipient,
                deadlineSeconds: (params.deadlineSeconds ?? 120).toString(),
            });

            const res = await fetch(`${VALID_BACKEND_URL}/swap?${query.toString()}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to fetch quote');
            }
            return res.json();
        },
        enabled: enabled && !!params.tokenA && !!params.tokenB && !!params.amount && parseFloat(params.amount) > 0,
        staleTime: 1000 * 10, // 10s
        retry: false,
    });
}

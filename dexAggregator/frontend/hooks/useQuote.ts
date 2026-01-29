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

const BACKEND_URL = 'http://localhost:3001'; 

const VALID_BACKEND_URL = 'http://localhost:3001';

export function useQuote(params: QuoteParams, enabled: boolean) {
    return useQuery({
        queryKey: ['quote', params],
        queryFn: async () => {
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
        staleTime: 1000 * 5, // 5s stale time
        retry: false,
        refetchInterval: (query) => {
            const data = query.state.data as any;
            if (!data?.quoteExpiresAt) return 15_000; // Default 15s if no data

            const now = Math.floor(Date.now() / 1000);
            const secondsRemaining = data.quoteExpiresAt - now;

            if (secondsRemaining <= 0) return 500; // Refetch immediately if expired
            return (secondsRemaining * 1000) - 1000; // Refetch 1s before expiration
        }
    });
}

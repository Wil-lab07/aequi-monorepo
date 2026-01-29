import { useQuery } from '@tanstack/react-query';

export interface Token {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
}

const BACKEND_URL = 'http://localhost:3001'; // User confirmed backend is on 3000

export function useTokens(chainId?: number) {
    return useQuery<Token[]>({
        queryKey: ['tokens', chainId],
        queryFn: async () => {
            if (!chainId) return [];
            const res = await fetch(`${BACKEND_URL}/tokens?chainId=${chainId}`);
            if (!res.ok) {
                throw new Error('Failed to fetch tokens');
            }
            return res.json();
        },
        enabled: !!chainId,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
}

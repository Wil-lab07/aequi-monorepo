import { useReadContracts, useBalance } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { Token } from './useTokens';

export function useTokenBalances(address: string | undefined, tokens: Token[] | undefined) {
    // 1. ERC20 Balances
    const erc20Tokens = tokens?.filter(t => t.address !== '0xEeeeeEeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') || [];

    const { data: erc20Balances } = useReadContracts({
        contracts: erc20Tokens.map(token => ({
            address: token.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
        })),
        query: {
            enabled: !!address && erc20Tokens.length > 0,
            refetchInterval: 10_000,
        }
    });

    // 2. Native Balance (ETH/BNB)
    const { data: nativeBalance } = useBalance({
        address: address as `0x${string}`,
        query: {
            enabled: !!address,
            refetchInterval: 10_000,
        }
    });

    // 3. Merge Results
    const balances: Record<string, string> = {}; // address -> formatted balance

    if (address && tokens) {
        // Map ERC20 results
        erc20Tokens.forEach((token, index) => {
            const result = erc20Balances?.[index];
            if (result?.status === 'success' && result.result !== undefined) {
                // Ensure decimals are handled safely
                try {
                    balances[token.address] = formatUnits(result.result as bigint, token.decimals);
                } catch (e) {
                    console.warn(`Failed to format balance for ${token.symbol}`, e);
                    balances[token.address] = '0';
                }
            }
        });

        // Map Native result
        const nativeToken = tokens.find(t => t.address === '0xEeeeeEeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
        if (nativeToken && nativeBalance) {
            balances[nativeToken.address] = formatUnits(nativeBalance.value, nativeBalance.decimals);
        }
    }

    return balances;
}

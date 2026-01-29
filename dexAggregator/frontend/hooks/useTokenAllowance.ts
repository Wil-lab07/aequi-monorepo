import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi } from 'viem';
import { useState, useEffect } from 'react';

const ERC20_ABI = parseAbi([
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)'
]);

export function useTokenAllowance(
    tokenAddress: string | undefined,
    ownerAddress: string | undefined,
    spenderAddress: string | undefined
) {
    const { data: allowance, refetch } = useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: ownerAddress && spenderAddress ? [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`] : undefined,
        query: {
            enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress,
            refetchInterval: 5000,
        }
    });

    const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const approve = async (amount: bigint = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")) => {
        if (!tokenAddress || !spenderAddress) return;
        writeContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [spenderAddress as `0x${string}`, amount],
        });
    };

    useEffect(() => {
        if (isConfirmed) {
            refetch();
        }
    }, [isConfirmed, refetch]);

    return {
        allowance: allowance as bigint | undefined,
        approve,
        isApproving: isWritePending || isConfirming,
        isApproved: isConfirmed,
        hash,
        error: writeError
    };
}

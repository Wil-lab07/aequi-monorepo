import { ethers } from 'ethers';

export const Q18 = 1000000000000000000n; // 10^18

const pow10 = (value: number) => {
    if (value < 0) return 1n;
    return 10n ** BigInt(value);
};

export const computeMidPriceQ18FromReserves = (
    reserveIn: bigint,
    reserveOut: bigint,
    inDecimals: number,
    outDecimals: number,
): bigint => {
    if (reserveIn === 0n || reserveOut === 0n) return 0n;

    const inFactor = pow10(inDecimals);
    const outFactor = pow10(outDecimals);
    if (inFactor === 0n || outFactor === 0n) return 0n;

    // Price = (ReserveOut / ReserveIn) * (10^InDecimals / 10^OutDecimals)
    // Scaled by Q18 for precision
    return (reserveOut * Q18 * inFactor) / (reserveIn * outFactor);
};

export const computeExecutionPriceQ18 = (
    amountIn: bigint,
    amountOut: bigint,
    inDecimals: number,
    outDecimals: number,
): bigint => {
    if (amountIn === 0n || amountOut === 0n) return 0n;

    const inFactor = pow10(inDecimals);
    const outFactor = pow10(outDecimals);
    const denominator = amountIn * outFactor;

    if (denominator === 0n) return 0n;

    return (amountOut * Q18 * inFactor) / denominator;
};

export const applyPriceQ18 = (
    priceQ18: bigint,
    amountIn: bigint,
    inDecimals: number,
    outDecimals: number,
): bigint => {
    if (priceQ18 === 0n || amountIn === 0n) return 0n;

    const inFactor = pow10(inDecimals);
    const outFactor = pow10(outDecimals);

    const numerator = amountIn * priceQ18 * outFactor;
    const denominator = Q18 * inFactor;

    return denominator === 0n ? 0n : numerator / denominator;
};

export const computePriceImpactBps = (
    midPriceQ18: bigint,
    amountIn: bigint,
    amountOut: bigint,
    inDecimals: number,
    outDecimals: number,
): number => {
    if (midPriceQ18 === 0n || amountIn === 0n || amountOut === 0n) return 0;

    const expectedOut = applyPriceQ18(midPriceQ18, amountIn, inDecimals, outDecimals);
    if (expectedOut === 0n) return 0;

    // impact = (expected - actual) / expected
    const diff = expectedOut > amountOut ? expectedOut - amountOut : amountOut - expectedOut;
    if (diff === 0n) return 0;

    const impact = (diff * 10000n) / expectedOut;
    // Cap at 1000% just in case
    const capped = impact > 10000000n ? 10000000n : impact;
    return Number(capped);
};

export const compareQuotes = (a: any, b: any) => {
    // Primary: Higher amountOut wins
    if (a.amountOut !== b.amountOut) {
        return a.amountOut > b.amountOut ? -1 : 1;
    }

    // Secondary: Better net output after gas cost wins
    const aNetOut = a.estimatedGasCostWei ? a.amountOut - a.estimatedGasCostWei : a.amountOut;
    const bNetOut = b.estimatedGasCostWei ? b.amountOut - b.estimatedGasCostWei : b.amountOut;
    if (aNetOut !== bNetOut) {
        return aNetOut > bNetOut ? -1 : 1;
    }

    // Tertiary: Higher liquidity wins (more stable)
    // Assuming liquidityScore is bigint or number
    if (a.liquidityScore !== b.liquidityScore) {
        return a.liquidityScore > b.liquidityScore ? -1 : 1;
    }

    // Final: Lower price impact wins
    return a.priceImpactBps <= b.priceImpactBps ? -1 : 1;
};

export const computeMidPriceQ18FromSqrtPriceX96 = (
    sqrtPriceX96: bigint,
    inDecimals: number,
    outDecimals: number,
    isToken0: boolean
): bigint => {
    const Q192 = 2n ** 192n;
    const priceX96 = (sqrtPriceX96 * sqrtPriceX96); // P = sqrtP^2

    const inScale = pow10(inDecimals);
    const outScale = pow10(outDecimals);

    if (isToken0) {
        // Token0 -> Token1
        // Price = (P * 10^In) / (10^Out)
        // Scaled by Q18
        // P is (Token1 / Token0) * 2^192
        const numerator = priceX96 * inScale * Q18;
        const denominator = Q192 * outScale;
        return denominator === 0n ? 0n : numerator / denominator;
    } else {
        // Token1 -> Token0
        // Price = (1/P * 10^In) / (10^Out)
        // Inverse of P: (2^192 * 2^192) / P ? No. 
        // 1 / (P / 2^192) = 2^192 / P
        // So Price = (2^192 / priceX96) * (2^192) ? No.

        // Simpler: Price(1->0) = 1 / Price(0->1, but swapping decimals)
        // Price(0->1)Raw = priceX96 / Q192
        // Price(1->0)Raw = Q192 / priceX96

        // Price(1->0)Adjusted = Price(1->0)Raw * (inScale / outScale) * Q18

        if (priceX96 === 0n) return 0n;

        const numerator = Q192 * inScale * Q18;
        const denominator = priceX96 * outScale;
        return denominator === 0n ? 0n : numerator / denominator;
    }
};

// ==========================================
// Gas Estimation Helpers
// ==========================================

export const estimateGasForRoute = (hops: ('v2' | 'v3')[]): bigint => {
    const GAS_BASE = 50000n;
    const GAS_V2_SWAP = 70000n;
    const GAS_V3_SWAP = 110000n;
    const GAS_MULTI_HOP_OVERHEAD = 20000n;

    if (!hops.length) {
        return GAS_BASE;
    }

    const base = hops.reduce((total, hop) => {
        return total + (hop === 'v2' ? GAS_V2_SWAP : GAS_V3_SWAP);
    }, GAS_BASE);

    if (hops.length === 1) {
        return base;
    }

    return base + BigInt(hops.length - 1) * GAS_MULTI_HOP_OVERHEAD;
};

import { PriceQuote } from './quote';

export interface ExecutorCallPlan {
    target: string;
    allowFailure: boolean;
    callData: string;
    value?: bigint;
}

export interface SwapBuildParams {
    quote: PriceQuote;
    amountOutMin: bigint;
    recipient: string;
    slippageBps: number;
    deadlineSeconds: number;
    useNativeInput?: boolean;
    useNativeOutput?: boolean;
    existingApprovals?: Map<string, bigint>; // Key: "token-spender", Value: Allowance
}

export interface SwapTransaction {
    kind: 'executor';
    dexId: string;
    router: string;
    spender: string;
    amountIn: bigint;
    amountOut: bigint;
    amountOutMinimum: bigint;
    deadline: number;
    calls: ExecutorCallPlan[];
    call: {
        to: string;
        data: string;
        value: bigint;
    };
    executor: {
        pulls: { token: string; amount: bigint }[];
        approvals: { token: string; spender: string; amount: bigint }[];
        calls: { target: string; value: bigint; data: string; injectToken: string; injectOffset: bigint }[];
        tokensToFlush: string[];
    };
}

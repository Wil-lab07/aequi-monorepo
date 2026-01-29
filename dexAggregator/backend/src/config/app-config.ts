import * as dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config();

const parseIntWithDefault = (value: string | undefined, fallback: number): number => {
    const parsed = parseInt(value ?? '', 10);
    return isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseStringWithDefault = (value: string | undefined, fallback: string): string => {
    return value || fallback;
};

export const appConfig = {
    env: parseStringWithDefault(process.env.NODE_ENV, 'development'),
    server: {
        port: parseIntWithDefault(process.env.PORT, 3000),
        host: parseStringWithDefault(process.env.HOST, '0.0.0.0'),
        rateLimitMax: parseIntWithDefault(process.env.RATE_LIMIT_MAX, 120),
        rateLimitWindow: parseStringWithDefault(process.env.RATE_LIMIT_WINDOW, '1 minute'),
    },
    rpc: {
        sepolia: parseStringWithDefault(process.env.RPC_URL_SEPOLIA, 'https://rpc.sepolia.org'),
        bsc: parseStringWithDefault(process.env.RPC_URL_BSC, 'https://binance.llamarpc.com'),
    },
    executor: {
        sepolia: process.env.EXECUTOR_ADDRESS_SEPOLIA || '',
        bsc: process.env.EXECUTOR_ADDRESS_BSC || '',
        interhopBufferBps: parseIntWithDefault(process.env.EXECUTOR_INTERHOP_BUFFER_BPS, 10),
    },
    lens: {
        sepolia: process.env.LENS_ADDRESS_SEPOLIA || '',
        bsc: process.env.LENS_ADDRESS_BSC || '',
    },
    swap: {
        quoteTtlSeconds: parseIntWithDefault(process.env.SWAP_QUOTE_TTL_SECONDS, 15),
    },
};

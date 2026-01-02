import { mainnet, bsc as bscChain } from 'viem/chains'
import type { Address } from 'viem'
import type { ChainConfig, ChainKey } from '../types'
import { FeeAmount as PancakeFeeAmount } from '@pancakeswap/v3-sdk'
import { FeeAmount } from '@uniswap/v3-sdk'

const ensureEnvList = (value: string | undefined) =>
    value?.split(',').map((url) => url.trim()).filter(Boolean) ?? []

const envAddress = (name: string, fallback: Address): Address => {
    const value = process.env[name]
    return (value ? (value as Address) : fallback)
}

export const CHAIN_CONFIGS: Record<ChainKey, ChainConfig> = {
    ethereum: {
        key: 'ethereum',
        id: mainnet.id,
        name: 'Ethereum',
        nativeCurrencySymbol: mainnet.nativeCurrency.symbol,
        rpcUrls: (() => {
            const urls = ensureEnvList(process.env.RPC_URL_ETH)
            return urls.length ? urls : Array.from(mainnet.rpcUrls.default.http)
        })(),
        fallbackRpcUrls: (() => {
            const urls = ensureEnvList(process.env.RPC_URL_ETH_FALLBACK)
            return urls.length ? urls : []
        })(),
        viemChain: mainnet,
        dexes: [
            {
                id: 'uniswap-v2',
                label: 'Uniswap V2',
                protocol: 'uniswap',
                version: 'v2',
                factoryAddress: envAddress('UNISWAP_V2_FACTORY', '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6'),
                routerAddress: envAddress('UNISWAP_V2_ROUTER', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'),
            },
            {
                id: 'uniswap-v3',
                label: 'Uniswap V3',
                protocol: 'uniswap',
                version: 'v3',
                factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                routerAddress: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
                feeTiers: [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM],
            },
        ],
    },
    bsc: {
        key: 'bsc',
        id: bscChain.id,
        name: 'BNB Smart Chain',
        nativeCurrencySymbol: bscChain.nativeCurrency.symbol,
        rpcUrls: (() => {
            const urls = ensureEnvList(process.env.RPC_URL_BSC)
            if (urls.length) {
                return urls
            }
            const defaults = bscChain.rpcUrls.default?.http ?? []
            return defaults.length ? Array.from(defaults) : ['https://bsc.drpc.org']
        })(),
        fallbackRpcUrls: (() => {
            const urls = ensureEnvList(process.env.RPC_URL_BSC_FALLBACK)
            return urls.length ? urls : []
        })(),
        viemChain: bscChain,
        dexes: [
            {
                id: 'pancake-v2',
                label: 'PancakeSwap V2',
                protocol: 'pancakeswap',
                version: 'v2',
                factoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
                routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
            },
            {
                id: 'pancake-v3',
                label: 'PancakeSwap V3',
                protocol: 'pancakeswap',
                version: 'v3',
                factoryAddress: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
                routerAddress: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
                feeTiers: [PancakeFeeAmount.LOWEST, PancakeFeeAmount.LOW, PancakeFeeAmount.MEDIUM],
            },
            {
                id: "uniswap-v2",
                label: "Uniswap V2",
                protocol: "uniswap",
                version: "v2",
                factoryAddress: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
                routerAddress: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
            },
            {
                id: "uniswap-v3",
                label: "Uniswap V3",
                protocol: "uniswap",
                version: "v3",
                factoryAddress: '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7',
                routerAddress: '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2',
                feeTiers: [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM],
            },
        ],
    },
}

export const SUPPORTED_CHAINS = Object.keys(CHAIN_CONFIGS) as ChainKey[]

export const getChainConfig = (chain: string): ChainConfig | null => {
    const key = chain.toLowerCase() as ChainKey
    return CHAIN_CONFIGS[key] ?? null
}

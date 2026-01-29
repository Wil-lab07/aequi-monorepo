export interface ContractAddresses {
    factory: string;
    router: string;
    quoter?: string; // For V3
}

export interface DexConfig {
    name: string;
    version: 'V2' | 'V3';
    contracts: ContractAddresses;
}

export interface TokenConfig {
    symbol: string;
    address: string;
    decimals: number;
    name: string;
}

export interface ChainConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
    dexes: DexConfig[];
    tokens: TokenConfig[];
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
    // Sepolia Testnet
    11155111: {
        chainId: 11155111,
        name: 'Sepolia',
        rpcUrl: 'https://rpc.sepolia.org', // Default, should likely use Env var
        dexes: [
            {
                name: 'Uniswap',
                version: 'V3',
                contracts: {
                    factory: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
                    router: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
                    quoter: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3'
                }
            },
            {
                name: 'Uniswap',
                version: 'V2',
                contracts: {
                    factory: '0xF62c03E08ada871A0bEb309762E260a7a6a880E6',
                    router: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3'
                }
            },
            {
                name: 'SushiSwap',
                version: 'V2',
                contracts: {
                    factory: '0x734583f62Bb6ACe3c9bA9bd5A53143CA2Ce8C55A',
                    router: '0xeaBcE3E74EF41FB40024a21Cc2ee2F5dDc615791'
                }
            },
            {
                name: 'PancakeSwap',
                version: 'V3',
                contracts: {
                    factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
                    router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
                    quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997'
                }
            }
        ],
        tokens: [
            { symbol: 'WETH', name: 'Wrapped Ether', address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', decimals: 18 },
            { symbol: 'UNI', name: 'Uniswap Token', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
            { symbol: 'USDC', name: 'USD Coin', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 },
            { symbol: 'USDT', name: 'Tether USD', address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', decimals: 6 },
            { symbol: 'DAI', name: 'DAI', address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', decimals: 18 },
            { symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', decimals: 18 }
        ]
    },
    // Binance Smart Chain (Mainnet) - Using standard public addresses
    56: {
        chainId: 56,
        name: 'BNB Smart Chain',
        rpcUrl: 'https://binance.llamarpc.com',
        dexes: [
            {
                name: 'PancakeSwap',
                version: 'V3',
                contracts: {
                    factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
                    router: '0x13f4EA83D88645a9Fa6b5aa29de12971a8849088', // Smart Router V3
                    quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997'
                }
            },
            {
                name: 'PancakeSwap',
                version: 'V2',
                contracts: {
                    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
                    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
                }
            },
            {
                name: 'Uniswap',
                version: 'V3',
                contracts: {
                    factory: '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7',
                    router: '0xB971eF87ede563556b2ED4b1C0b0019111D35C6e',
                    quoter: '0x78D78E420Da98ad378D7799bE8f4AF69033EB077'
                }
            },
            {
                name: 'SushiSwap',
                version: 'V2',
                contracts: {
                    factory: '0xc35dadb65012ec5796536bd9864ed8773abc74c4',
                    router: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506'
                }
            }
        ],
        tokens: [
            { symbol: 'WBNB', name: 'Wrapped BNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18 },
            { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
            { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
            { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
            { symbol: 'ETH', name: 'Ethereum Token', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18 },
            { symbol: 'BNB', name: 'Binance Coin', address: '0xEeeeeEeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', decimals: 18 }
        ]
    }
};

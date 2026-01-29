import { ethers } from 'ethers';
import { appConfig } from '../config/app-config';

export class ProviderService {
    private static instance: ProviderService;
    private providers: Map<number, ethers.JsonRpcProvider>;

    private constructor() {
        this.providers = new Map();
        this.initializeProviders();
    }

    public static getInstance(): ProviderService {
        if (!ProviderService.instance) {
            ProviderService.instance = new ProviderService();
        }
        return ProviderService.instance;
    }

    private initializeProviders() {
        // Sepolia (Chain ID: 11155111)
        if (appConfig.rpc.sepolia) {
            const sepoliaProvider = new ethers.JsonRpcProvider(appConfig.rpc.sepolia);
            this.providers.set(11155111, sepoliaProvider);
        }

        // BSC (Chain ID: 56)
        if (appConfig.rpc.bsc) {
            const bscProvider = new ethers.JsonRpcProvider(appConfig.rpc.bsc);
            this.providers.set(56, bscProvider);
        }
    }

    public getProvider(chainId: number): ethers.JsonRpcProvider {
        const provider = this.providers.get(chainId);
        if (!provider) {
            throw new Error(`No provider configured for Chain ID: ${chainId}`);
        }
        return provider;
    }

    public getAllProviders(): Map<number, ethers.JsonRpcProvider> {
        return this.providers;
    }
}

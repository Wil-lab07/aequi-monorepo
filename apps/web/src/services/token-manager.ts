export interface Token {
    address: string
    symbol: string
    name: string
    decimals: number
    chainId: number
    logoURI?: string
    isImported?: boolean
}

const IMPORTED_TOKENS_KEY = 'aequi_imported_tokens'

export class TokenManager {
    private static instance: TokenManager
    private importedTokens: Token[] = []

    private constructor() {
        this.loadImportedTokens()
    }

    public static getInstance(): TokenManager {
        if (!TokenManager.instance) {
            TokenManager.instance = new TokenManager()
        }
        return TokenManager.instance
    }

    private loadImportedTokens() {
        try {
            const stored = localStorage.getItem(IMPORTED_TOKENS_KEY)
            if (stored) {
                this.importedTokens = JSON.parse(stored)
            }
        } catch (e) {
            console.error('Failed to load imported tokens', e)
        }
    }

    private saveImportedTokens() {
        try {
            localStorage.setItem(IMPORTED_TOKENS_KEY, JSON.stringify(this.importedTokens))
        } catch (e) {
            console.error('Failed to save imported tokens', e)
        }
    }

    public getImportedTokens(): Token[] {
        return this.importedTokens
    }

    public addImportedToken(token: Token) {
        if (this.importedTokens.some(t => t.address.toLowerCase() === token.address.toLowerCase())) {
            return
        }
        this.importedTokens.push({ ...token, isImported: true })
        this.saveImportedTokens()
    }

    public removeImportedToken(address: string) {
        this.importedTokens = this.importedTokens.filter(t => t.address.toLowerCase() !== address.toLowerCase())
        this.saveImportedTokens()
    }
}

export const tokenManager = TokenManager.getInstance()

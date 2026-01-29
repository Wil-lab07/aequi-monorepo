import { Request, Response } from "express";
import { QuoteService } from "../services/quote.service";

const CHAIN_MAP: Record<string, number> = {
    bnb: 56,
    bsc: 56,
    sepolia: 11155111
};

export const getQuote = async (req: Request, res: Response) => {
    try {
        const { chain, tokenA, tokenB, amount, slippageBps } = req.query;

        if (!chain || !tokenA || !tokenB || !amount) {
            return res.status(400).json({ error: "Missing required parameters: chain, tokenA, tokenB, amount" });
        }

        const chainId = CHAIN_MAP[String(chain).toLowerCase()];
        if (!chainId) {
            return res.status(400).json({ error: `Unsupported chain: ${chain}` });
        }

        const result = await QuoteService.getInstance().getQuote(
            chainId,
            String(tokenA),
            String(tokenB),
            String(amount),
            slippageBps ? Number(slippageBps) : 50
        );

        res.json(result);
    } catch (error) {
        console.error("Error fetching quote:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

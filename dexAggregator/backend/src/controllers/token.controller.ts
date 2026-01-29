import { Request, Response } from 'express';
import { CHAIN_CONFIGS } from '../config/chains';

export const getTokens = (req: Request, res: Response) => {
    try {
        const chainId = parseInt(req.query.chainId as string);

        if (!chainId) {
            return res.status(400).json({ error: 'chainId query parameter is required' });
        }

        const chainConfig = CHAIN_CONFIGS[chainId];

        if (!chainConfig) {
            return res.status(404).json({ error: 'Chain not supported or found' });
        }

        console.log(chainConfig)

        return res.status(200).json(chainConfig.tokens);
    } catch (error) {
        console.error('Error fetching tokens:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

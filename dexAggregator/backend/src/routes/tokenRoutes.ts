import { Router } from 'express';
import { getTokens } from '../controllers/token.controller';

const router = Router();

router.get('/', getTokens);

export default router;

import { Router } from "express";

import tradeRoutes from "./tradeRoutes";
import quoteRoutes from "./quoteRoutes";
import tokenRoutes from "./tokenRoutes";

const router = Router();

router.use("/trades", tradeRoutes);
router.use("/quote", quoteRoutes);
router.use("/tokens", tokenRoutes);

export default router;

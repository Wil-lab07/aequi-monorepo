import { Router } from "express";

import tradeRoutes from "./tradeRoutes";
import quoteRoutes from "./quoteRoutes";

const router = Router();

router.use("/trades", tradeRoutes);
router.use("/quote", quoteRoutes);

export default router;

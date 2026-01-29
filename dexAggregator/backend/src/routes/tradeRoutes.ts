import { Router } from "express";

import tradeController from "../controllers/tradeController";

const router = Router();

router.get("/", tradeController.getAllTrades);
router.get("/:id", tradeController.getTradeById);
router.post("/", tradeController.createTrade);

export default router;

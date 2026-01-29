import { Request, Response } from "express";

import { TradeInput, TradeModel } from "../models/trade";

const getAllTrades = (_req: Request, res: Response) => {
  const trades = TradeModel.findAll();
  res.json(trades);
};

const getTradeById = (req: Request, res: Response) => {
  const trade = TradeModel.findById(req.params.id);

  if (!trade) {
    return res.status(404).json({ message: "Trade not found" });
  }

  return res.json(trade);
};

const createTrade = (req: Request, res: Response) => {
  const { baseToken, quoteToken, amount, provider, price } = req.body;

  if (
    !baseToken ||
    !quoteToken ||
    provider === undefined ||
    amount === undefined ||
    price === undefined
  ) {
    return res.status(400).json({
      message: "baseToken, quoteToken, provider, amount, and price are required",
    });
  }

  const payload: TradeInput = {
    baseToken,
    quoteToken,
    provider,
    amount: Number(amount),
    price: Number(price),
  };

  if (Number.isNaN(payload.amount) || Number.isNaN(payload.price)) {
    return res
      .status(400)
      .json({ message: "amount and price must be valid numbers" });
  }

  const trade = TradeModel.create(payload);
  return res.status(201).json(trade);
};

export default {
  getAllTrades,
  getTradeById,
  createTrade,
};

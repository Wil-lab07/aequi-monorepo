import cors from "cors";
import express, { Request, Response } from "express";

import routes from "./routes";
import { getQuote } from "./controllers/quote.controller";
import { swap } from "./controllers/swap.controller";
import { getTokens } from "./controllers/token.controller";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/tokens", getTokens);
app.get("/quote", getQuote);
app.get("/swap", swap);

export default app;

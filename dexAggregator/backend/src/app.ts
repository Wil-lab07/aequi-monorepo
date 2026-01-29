import cors from "cors";
import express, { Request, Response } from "express";

import routes from "./routes";
import { getQuote } from "./controllers/quote.controller";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/api", routes);
app.get("/quote", getQuote);

export default app;

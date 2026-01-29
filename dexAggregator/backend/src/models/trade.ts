export interface Trade {
  id: string;
  baseToken: string;
  quoteToken: string;
  amount: number;
  provider: string;
  price: number;
  createdAt: Date;
}

export type TradeInput = Omit<Trade, "id" | "createdAt">;

const trades: Trade[] = [
  {
    id: "1",
    baseToken: "ETH",
    quoteToken: "USDC",
    amount: 1.5,
    provider: "ExampleDex",
    price: 3200,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "2",
    baseToken: "MATIC",
    quoteToken: "DAI",
    amount: 100,
    provider: "ExampleAggregator",
    price: 0.95,
    createdAt: new Date("2024-02-15T00:00:00Z"),
  },
];

const nextId = () => (trades.length + 1).toString();

export const TradeModel = {
  findAll(): Trade[] {
    return trades;
  },
  findById(id: string): Trade | undefined {
    return trades.find((trade) => trade.id === id);
  },
  create(input: TradeInput): Trade {
    const trade: Trade = {
      id: nextId(),
      createdAt: new Date(),
      ...input,
    };

    trades.push(trade);
    return trade;
  },
};

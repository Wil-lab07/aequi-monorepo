# Aequi Server

> **⚠️ WORK IN PROGRESS**

The Aequi Server is the backend service for the Aequi protocol. It handles route aggregation, price quoting, and transaction construction for decentralized exchange swaps.

## Features

- **Route Aggregation**: Finds the best swap paths across multiple DEXs.
- **Price Service**: Real-time token pricing.
- **Quote Generation**: Provides executable quotes for swaps.
- **Transaction Building**: Constructs calldata for the `AequiExecutor` contract.

## Tech Stack

- **Runtime**: Node.js / Bun
- **Framework**: [Fastify](https://www.fastify.io/)
- **Blockchain Interaction**: [Viem](https://viem.sh/)
- **Language**: TypeScript

## Getting Started

### Prerequisites

Ensure you have the environment variables set up. Copy `.env.example` to `.env` and fill in the required values (RPC URLs, etc.).

```bash
cp .env.example .env
```

### Running Locally

```bash
# Install dependencies (from root)
bun install

# Start development server
bun run dev
```

The server will start on the configured port (default: 3000).

## API Endpoints

- `GET /quote`: Get a swap quote.
- `GET /tokens`: List supported tokens.
- `GET /price`: Get token price.

## License

MIT

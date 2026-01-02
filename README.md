# Aequi Monorepo

> **⚠️ WORK IN PROGRESS**
>
> This project is currently under active development. Features, APIs, and contracts are subject to change. Not audited for production use.

Aequi is a decentralized exchange aggregator and execution platform designed to provide optimal swap routes and efficient execution across multiple chains.

## Architecture

This monorepo is managed using [Turbo](https://turbo.build/) and contains the following packages:

### Applications

- **[apps/server](./apps/server)**: The backend API service responsible for:
  - Aggregating liquidity sources (DEXs).
  - Calculating optimal swap routes.
  - Pricing and quote generation.
  - Transaction building.
- **[apps/web](./apps/web)**: The frontend user interface built with React and Vite, allowing users to interact with the Aequi protocol.

### Packages

- **[packages/contracts](./packages/contracts)**: Solidity smart contracts, including the `AequiExecutor` for atomic multi-hop swaps and execution.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Bun](https://bun.sh/) or [pnpm](https://pnpm.io/) (recommended)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)

### Installation

Install dependencies from the root directory:

```bash
npm install
# or
bun install
```

### Development

To start the development environment for all applications:

```bash
npm run dev
# or
turbo dev
```

## License

This project is licensed under the [MIT License](./LICENSE).

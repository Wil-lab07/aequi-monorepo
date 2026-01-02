# Aequi Web Interface

> **⚠️ WORK IN PROGRESS**

The Aequi Web Interface is the user-facing frontend for the Aequi protocol, allowing users to perform swaps, view token prices, and manage their portfolio.

## Features

- **Swap Interface**: Intuitive UI for executing token swaps.
- **Wallet Connection**: Integration with popular wallets via Wagmi.
- **Real-time Updates**: Live price and quote updates.
- **Transaction Management**: Track and manage swap transactions.

## Tech Stack

- **Framework**: [React](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Web3 Hooks**: [Wagmi](https://wagmi.sh/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: TypeScript

## Getting Started

### Prerequisites

Ensure you have the environment variables set up. Copy `.env.example` to `.env` and fill in the required values.

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

The application will be available at `http://localhost:5173`.

## License

MIT

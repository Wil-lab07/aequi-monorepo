# Aequi Contracts

> **⚠️ WORK IN PROGRESS**

This package contains the smart contracts for the Aequi protocol, specifically the `AequiExecutor` which handles atomic multi-hop swaps and execution.

## Contracts

- **AequiExecutor.sol**: A lightweight, multicall-style executor that pulls funds from the caller, executes arbitrary calls (e.g., DEX swaps), and flushes remaining funds to a recipient.

## Tech Stack

- **Framework**: [Hardhat](https://hardhat.org/)
- **Language**: Solidity ^0.8.24

## Getting Started

### Installation

```bash
# Install dependencies (from root)
bun install
```

### Compilation

```bash
npx hardhat compile
```

### Testing

```bash
npx hardhat test
```

### Deployment

Deployment is managed via Hardhat Ignition.

```bash
npx hardhat ignition deploy ignition/modules/AequiExecutor.js --network <network_name>
```

## License

MIT

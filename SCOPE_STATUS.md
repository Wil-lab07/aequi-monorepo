# Scope Status (Locked)

- **Aggregation Multi Hops**:
    - Routing to the best path across multiple pools to maximize output.
- **Aggregation Swap Execution**:
    - Showcasing execution through smart contract interaction.
- **UX/UI**:
    - Simple, intuitive interface for non-technical users to visualize the "Better Price".

# DEXs (ETH SEPOLIA)

## Ethereum Sepolia — DEX Contract Reference

| DEX | Version | Contract | Address | Etherscan |
| --- | :---: | --- | :--- | :--- |
| **Uniswap** | V3 | Factory | `0x0227628f3F023bb0B980b67D528571c95c6DaC1c` | [View](https://sepolia.etherscan.io/address/0x0227628f3F023bb0B980b67D528571c95c6DaC1c) |
| | | Router | `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E` | [View](https://sepolia.etherscan.io/address/0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E) |
| | | Quoter | `0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3` | [View](https://sepolia.etherscan.io/address/0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3) |
| **Uniswap** | V2 | Factory | `0xF62c03E08ada871A0bEb309762E260a7a6a880E6` | [View](https://sepolia.etherscan.io/address/0xF62c03E08ada871A0bEb309762E260a7a6a880E6) |
| | | Router | `0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3` | [View](https://sepolia.etherscan.io/address/0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3) |
| **SushiSwap** | V2 | Factory | `0x734583f62Bb6ACe3c9bA9bd5A53143CA2Ce8C55A` | [View](https://sepolia.etherscan.io/address/0x734583f62bb6ace3c9ba9bd5a53143ca2ce8c55a) |
| | | Router | `0xeaBcE3E74EF41FB40024a21Cc2ee2F5dDc615791` | [View](https://sepolia.etherscan.io/address/0xeaBcE3E74EF41FB40024a21Cc2ee2F5dDc615791) |
| **PancakeSwap** | V3 | Factory | `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865` | [View](https://sepolia.etherscan.io/address/0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865) |
| | | Router | `0x1b81D678ffb9C0263b24A97847620C99d213eB14` | [View](https://sepolia.etherscan.io/address/0x1b81D678ffb9C0263b24A97847620C99d213eB14) |
| | | Quoter | `0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997` | [View](https://sepolia.etherscan.io/address/0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997) |

# ERC 20 Tokens (Sepolia)

| Token | Symbol | Address | Etherscan |
| --- | :---: | --- | :--- |
| **Wrapped Ether** | WETH | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` | [View](https://sepolia.etherscan.io/address/0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14) |
| **Uniswap Token** | UNI | `0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984` | [View](https://sepolia.etherscan.io/token/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984) |
| **USD Coin** | USDC | `0x1c7D4B19F23267E141703290b633A42F99b9C7238` | [View](https://sepolia.etherscan.io/token/0x1c7D4B19F23267E141703290b633A42F99b9C7238) |
| **Tether USD** | USDT | `0xfa8499996E7596c56149172B8B1fD97642646c24` | [View](https://sepolia.etherscan.io/token/0xfa8499996E7596c56149172B8B1fD97642646c24) |

# Architecture & Responsibilities

The system is composed of three main layers working together to provide the best swap experience.

## Backend Service
**Stack**: Node.js, Express.js (TypeScript)
- **Liquidity Discovery**: Continuously gathers pool reserves (Token 0 / Token 1) from decentralized exchanges.
- **Aggregation Logic**: Implementation of "Smart Routing"—calculating `amountOut` across single-hop and multi-hop paths to find the most profitable route.
- **Quote Comparison**: Compares returns from different DEXs to identify the "Better Price".

## Frontend Interface
**Stack**: React (Vite)
- **Visualization**: Clear UI demonstrating the "Better Price" path (e.g., *Uniswap V3 -> SushiSwap V2*).
- **Simplicity**: Intuitive design for non-technical users to input `Token In` / `Amount` and see the result.
- **Wallet Connection**: Integration with Wagmi/Viem for seamless wallet connectivity.

## Smart Contract Executors
**Stack**: Solidity
- **Executor Contract**: A dedicated smart contract that atomically executes the route determined by the backend.
- **Security**: Ensures funds are routed securely through the specified path without intermediate manipulation.

# Features

1.  **Connect Wallet**
    -   Secure integration with MetaMask and other EVM-compatible wallets.
    
2.  **Token Selection**
    -   Easy-to-use modal for selecting input (e.g., WETH) and output (e.g., USDC) tokens.

3.  **Smart Route Visualization**
    -   Visual display of the "Best Route" including intermediate steps (hops).
    -   Transparent breakdown of fees and estimated gas costs.

4.  **Optimal Swap Execution**
    -   One-click execution of the best price route.
    -   Automated handling of Token Approvals and Swap transactions.

5.  **Live Transaction Status**
    -   Real-time updates on transaction progress (Pending, Success, Failed) with direct links to Etherscan.

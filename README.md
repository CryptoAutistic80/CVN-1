# CVN-1: Cedra Vaulted NFT Standard

> A standard for NFTs with embedded on-chain treasuries on the Cedra Network

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Cedra](https://img.shields.io/badge/Cedra-Mainnet-blue.svg)](https://cedra.network)

## Overview

CVN-1 defines a standard for **vaulted NFTs** — NFTs that own their own fungible asset (FA) treasury. Each vaulted NFT can hold multiple FA types, creating intrinsic on-chain value that travels with the token.

### Key Features

- 🏦 **Native Vaulting** — Every NFT has a dedicated multi-asset vault
- 💰 **Open Deposits** — Anyone can top up a vault to increase intrinsic value
- 🔥 **Burn to Redeem** — Owners can destroy the NFT to claim vault contents
- 💎 **Composable Royalties** — Standard settlement hook for compliant marketplaces
- 📊 **Indexer-Friendly** — View functions and events for easy off-chain tracking

## Quick Start

### Prerequisites

- [Cedra CLI](https://docs.cedra.network/getting-started/cli) ≥ 1.0.4
- [Rust](https://rustup.rs/) (for Move development)

### Build

```bash
cd contracts/cvn1_vault
cedra move compile --named-addresses cvn1_vault=default
```

### Test

```bash
cedra move test --named-addresses cvn1_vault=default
```

### Deploy (Testnet)

```bash
cedra move publish --named-addresses cvn1_vault=default
```

## Contract API

### Entry Functions

| Function | Description |
|----------|-------------|
| `init_collection_config` | Create a vaulted NFT collection with royalty configuration |
| `mint_vaulted_nft` | Mint a new NFT with an attached vault |
| `deposit_to_vault` | Deposit fungible assets into an NFT's vault |
| `burn_and_redeem` | Burn NFT and claim all vault contents |
| `settle_sale_with_vault_royalty` | Marketplace settlement with creator + vault royalties |

### View Functions

| Function | Description |
|----------|-------------|
| `get_vault_config` | Get collection royalty configuration |
| `get_vault_balances` | Get all FA balances in an NFT's vault |
| `vault_exists` | Check if an NFT has a vault |
| `last_sale_used_vault_royalty` | Compliance tracking for marketplace sales |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NFT (Token Object)                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │                    VaultInfo                      │  │
│  │  • is_redeemable: bool                           │  │
│  │  • vault_stores: SmartTable<FA, Store>           │  │
│  │  • extend_ref / delete_ref                       │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│        ┌─────────────────┼─────────────────┐            │
│        ▼                 ▼                 ▼            │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐        │
│   │FA Store │      │FA Store │      │FA Store │        │
│   │ (CEDRA) │      │ (USDC)  │      │ (APT)   │        │
│   └─────────┘      └─────────┘      └─────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
CVN-1/
├── contracts/cvn1_vault/     # Move smart contract
│   ├── Move.toml
│   └── sources/
│       └── vaulted_collection.move
├── sdk/typescript/           # TypeScript SDK (coming soon)
├── demo/                     # Demo UI (coming soon)
├── indexer/                  # Indexer service (coming soon)
├── docs/                     # Documentation
├── CVN-1-spec.md            # Technical specification
└── DEVELOPMENT_PLAN.md      # Development roadmap
```

## Royalty Model

CVN-1 implements a dual-royalty system:

| Royalty Type | Recipient | Purpose |
|--------------|-----------|---------|
| **Creator Royalty** | Creator payout address | Standard creator compensation |
| **Vault Royalty** | NFT's vault | Automatic value accumulation |

Example: With 2.5% creator + 2.5% vault royalties on a 100 CEDRA sale:
- Creator receives: 2.5 CEDRA
- NFT vault receives: 2.5 CEDRA  
- Seller receives: 95 CEDRA

## Documentation

- [CVN-1 Specification](CVN-1-spec.md) — Full technical spec
- [Development Plan](DEVELOPMENT_PLAN.md) — Phased implementation roadmap
- [Cedra Docs](https://docs.cedra.network) — Cedra framework documentation

## Development Status

| Phase | Status |
|-------|--------|
| Phase 0: Environment Setup | ✅ Complete |
| Phase 1: Core Contract | ✅ Complete |
| Phase 2: Testing & Audit | 🔄 In Progress |
| Phase 3: TypeScript SDK | ⏳ Planned |
| Phase 4: Demo UI | ⏳ Planned |
| Phase 5: Indexer | ⏳ Planned |
| Phase 6: Mainnet Deploy | ⏳ Planned |

## License

Proprietary — © Singularity Shift Ltd. All rights reserved.

## Links

- [Cedra Network](https://cedra.network)
- [Cedra Documentation](https://docs.cedra.network)
- [Cedra Faucet](https://faucet.cedra.dev)

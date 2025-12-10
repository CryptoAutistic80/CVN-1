# CVN-1: Cedra Vaulted NFT Standard

> A standard for NFTs with embedded on-chain treasuries on the Cedra Network

[![Version](https://img.shields.io/badge/Version-5.0.0-green.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Network](https://img.shields.io/badge/Network-Testnet-yellow.svg)](https://docs.cedra.network)
[![Tests](https://img.shields.io/badge/Tests-34%20passing-brightgreen.svg)](#testing)

## Overview

CVN-1 defines a standard for **vaulted NFTs** — NFTs that own their own fungible asset (FA) treasuries. v5 adds **framework royalty integration** for automatic marketplace enforcement:

| Vault | Purpose | Redemption |
|-------|---------|------------|
| **Core Vault** | Long-term floor value, mint seed | Burn NFT only |
| **Rewards Vault** | Short-term, royalties, activity rewards | Claim anytime |

### Key Features

- 🔒 **Dual Vaults** — Core (locked) + Rewards (claimable) per NFT
- 🚀 **Mint-Time Value** — Seed % of mint fee to Core Vault
- 💰 **Open Deposits** — Anyone can deposit to either vault
- 🎁 **Claim Rewards** — Holders claim Rewards Vault without burning
- 🔥 **Burn to Redeem** — Destroy NFT to claim BOTH vaults
- 💎 **Framework Royalties** — Automatic marketplace royalty enforcement

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
# Contract tests (18 passing)
cedra move test --dev
```

### Deploy (Testnet)

```bash
cedra move publish --profile cvn1-v3 --named-addresses cvn1_vault=cvn1-v3
```

## Contract API

### Entry Functions

| Function | Description |
|----------|-------------|
| `init_collection_config` | Create collection with royalty & mint config |
| `public_mint` | Mint NFT with vault seeding to Core Vault |
| `deposit_to_core_vault` | Deposit FA to NFT's Core Vault |
| `deposit_to_rewards_vault` | Deposit FA to NFT's Rewards Vault |
| `claim_rewards` | Claim Rewards Vault without burning |
| `burn_and_redeem` | Burn NFT and claim both vaults |


### View Functions

| Function | Description |
|----------|-------------|
| `get_vault_config` | Get collection royalty configuration |
| `get_core_vault_balances` | Get Core Vault balances for an NFT |
| `get_rewards_vault_balances` | Get Rewards Vault balances for an NFT |
| `get_vault_balances` | Get combined balances (both vaults) |
| `vault_exists` | Check if an NFT has a vault |
| `is_vault_redeemable` | Check if Core Vault can be redeemed |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NFT (Token Object)                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │                    VaultInfo                      │  │
│  │  • is_core_redeemable: bool                      │  │
│  │  • core_stores: SmartTable<FA, Store>            │  │
│  │  • rewards_stores: SmartTable<FA, Store>         │  │
│  │  • extend_ref / delete_ref / burn_ref            │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│        ┌─────────────────┼─────────────────┐            │
│        ▼                 ▼                 ▼            │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐        │
│   │🔒 CORE  │      │🎁 REWARD│      │🎁 REWARD│        │
│   │ (CEDRA) │      │ (CEDRA) │      │ (USDC)  │        │
│   └─────────┘      └─────────┘      └─────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
CVN-1/
├── contracts/cvn1_vault/     # Move smart contract
│   ├── Move.toml
│   └── sources/
│       ├── vault_core.move       # Core data structures
│       ├── vault_events.move     # Event definitions
│       ├── collection.move       # Collection init
│       ├── minting.move          # Mint functions
│       ├── vault_ops.move        # Vault operations

│       ├── vault_views.move      # View functions
│       └── tests/                # Unit tests
├── sdk/typescript/           # TypeScript SDK
├── demo/                     # Demo UI
├── docs/                     # Documentation
│   ├── CVN1-SPEC.md              # Full specification
│   ├── TYPESCRIPT-INTEGRATION.md # SDK examples
│   ├── MARKETPLACE-GUIDE.md     # Marketplace integration
│   └── ...                       # Other docs
└── DEVELOPMENT_PLAN.md      # Development roadmap
```

## Royalty Model

CVN-1 v5 uses **Cedra Framework royalties** for automatic marketplace enforcement:

| Royalty Type | Recipient | Purpose |
|--------------|-----------|---------|
| **Creator Royalty** | Creator payout address | Standard creator compensation |

Royalties are now set on-chain using `cedra_token_objects::royalty`, allowing any Cedra marketplace to automatically discover and enforce royalty rates.

**Vaults receive value from:**
- Mint-time seeding (% of mint price)
- Direct deposits (staking, gaming, rewards)
- Smart contract integrations

## Documentation

- [CVN-1 Specification](docs/CVN1-SPEC.md) — Full technical spec
- [TypeScript Integration](docs/TYPESCRIPT-INTEGRATION.md) — SDK examples
- [Marketplace Guide](docs/MARKETPLACE-GUIDE.md) — Integration for marketplaces
- [Use Cases](docs/USE_CASES.md) — Deployment strategies & examples
- [Deployment](docs/DEPLOYMENT.md) — Testnet deployment info
- [Gas Benchmarks](docs/GAS_BENCHMARKS.md) — Transaction costs
- [Security](docs/SECURITY.md) — Security review & checklist
- [Development Plan](DEVELOPMENT_PLAN.md) — Phased implementation roadmap

## Development Status

| Phase | Status |
|-------|--------|
| Phase 0: Environment Setup | ✅ Complete |
| Phase 1: Core Contract | ✅ Complete |
| Phase 2: Testing & Audit | ✅ Complete |
| Phase 3: SDKs (TS + Rust) | ✅ Complete |
| Phase 4+5: Demo Platform | ✅ Complete |
| Phase 6: Mainnet Deploy | ⏳ Planned |

## License

Proprietary — © Singularity Shift Ltd. All rights reserved.

## Links

- [Cedra Network](https://cedra.network)
- [Cedra Documentation](https://docs.cedra.network)
- [Cedra Faucet](https://faucet.cedra.dev)

# CVN-1 v3 Demo

A demo app showcasing the CVN-1 v3 Dual Vault NFT Standard.

## Quick Start

```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

## Features

| Feature | Description |
|---------|-------------|
| 🔒 Core Vault | Long-term value, burn to redeem |
| 🎁 Rewards Vault | Short-term, claim anytime |
| ⚡ Mint | Seed goes to Core Vault |
| � Royalties | Sales grow Rewards Vault |
| 🔥 Burn & Redeem | Get both vaults at once |

## Pages

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Overview and nav |
| Create | `/create` | Deploy a collection |
| Mint | `/mint` | Mint NFTs |
| Explore | `/explore` | View vaults, claim, burn |

## Architecture

```
Frontend (Next.js 16) ──► Cedra Testnet
        │
        ▼
   Cedra Indexer
```

## Contract

```
0x64650d57ef213323ea49c8d9b0eefc6c9d6c108b24b747c8cc2e1317a5907855
```

---

*CVN-1 v3: Dual Vault Architecture*

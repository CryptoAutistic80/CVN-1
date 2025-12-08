# CVN-1 Demo Platform

A demo app showcasing the CVN-1 Vaulted NFT Standard with 3 mint strategies.

## Quick Start

### 1. Start Backend
```bash
cd demo/backend
cargo run
# Runs on http://127.0.0.1:8080
```

### 2. Start Frontend
```bash
cd demo/frontend
npm run dev
# Runs on http://localhost:3000
```

### 3. Open Browser
Visit [http://localhost:3000](http://localhost:3000)

## Demo Strategies

| # | Strategy | Mint Price | Vault % | Demo |
|---|----------|------------|---------|------|
| 🎨 | Premium Art | 100 CEDRA | 100% | Full mint → vault |
| 🚀 | PFP Collection | 50 CEDRA | 50% | Split: creator + vault |
| 🏦 | Piggy Bank | FREE | 0% | Empty mint + deposits |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/mint` | POST | Mint a vaulted NFT |
| `/api/vault/{nft}` | GET | Get vault balances |
| `/api/config/{creator}` | GET | Get collection config |

## Architecture

```
Frontend (Next.js)  ◄── REST ──►  Backend (Rust)
        │                              │
        │ GraphQL                      │ REST
        ▼                              ▼
   Cedra Indexer              Cedra Testnet
```

## Tech Stack

- **Frontend**: Next.js 16, React 18, Tailwind CSS
- **Backend**: Rust, Actix-web 4, reqwest
- **Blockchain**: Cedra Testnet

---

*Built for CVN-1: The Cedra Vaulted NFT Standard*

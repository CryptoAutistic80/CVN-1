# CVN-1 Development Plan

> Cedra Vaulted NFT Standard - Implementation Roadmap

This document outlines the phased development approach for implementing the CVN-1 standard from scratch. Each phase builds upon the previous, with clear milestones and deliverables.

---

## Overview

| Phase | Focus | Duration Est. | Dependencies |
|-------|-------|---------------|--------------|
| 0 | Environment Setup | 1-2 days | None |
| 1 | Core Move Contract | 1-2 weeks | Phase 0 |
| 2 | Testing & Audit | 1 week | Phase 1 |
| 3 | TypeScript SDK | 3-5 days | Phase 2 |
| 4 | Demo UI | 1 week | Phase 3 |
| 5 | Indexer Service | 1 week | Phase 2 |
| 6 | Deployment & Docs | 3-5 days | All |

---

## Phase 0: Environment Setup

**Goal:** Establish development infrastructure and tooling.

### Tasks

- [ ] **0.1** Initialize Move package structure
  ```
  CVN-1/
  ├── contracts/
  │   └── cvn1_vault/
  │       ├── Move.toml
  │       └── sources/
  │           └── vaulted_collection.move
  ├── sdk/
  │   └── typescript/
  ├── demo/
  ├── indexer/
  └── docs/
  ```

- [ ] **0.2** Configure `Move.toml` with Cedra dependencies
  ```toml
  [package]
  name = "cvn1_vault"
  version = "1.0.0"
  
  [addresses]
  cvn1_vault = "_"
  
  [dependencies]
  CedraFramework = { git = "https://github.com/cedra-labs/cedra-framework.git", subdir = "cedra-move/framework/cedra-framework", rev = "mainnet" }
  CedraTokenObjects = { git = "https://github.com/cedra-labs/cedra-framework.git", subdir = "cedra-move/framework/cedra-token-objects", rev = "mainnet" }
  CedraStdlib = { git = "https://github.com/cedra-labs/cedra-framework.git", subdir = "cedra-move/framework/cedra-stdlib", rev = "mainnet" }
  ```

- [ ] **0.3** Install Cedra CLI and verify version
  ```bash
  cedra --version  # Should be ≥1.0.4
  ```

- [ ] **0.4** Create testnet account and fund via faucet
  ```bash
  cedra init --network testnet
  cedra account fund --account default
  ```

- [ ] **0.5** Verify compilation of empty module skeleton

### Deliverables
- [ ] Compilable Move package skeleton
- [ ] Funded testnet account
- [ ] Git repository with branch strategy

---

## Phase 1: Core Move Contract

**Goal:** Implement all CVN-1 entry functions and data structures.

### 1A: Collection & Config (Days 1-2)

- [ ] **1A.1** Implement `VaultedCollectionConfig` struct
- [ ] **1A.2** Implement `init_collection_config` entry function
  - Create unlimited collection via `collection::create_unlimited_collection`
  - Store config under creator address
  - Validate royalty bps ≤ 10000
- [ ] **1A.3** Add `get_vault_config` view function
- [ ] **1A.4** Write unit test: collection creation and config retrieval

### 1B: Minting (Days 3-4)

- [ ] **1B.1** Implement `VaultInfo` struct with `SmartTable`, `ExtendRef`, `DeleteRef`
- [ ] **1B.2** Implement `mint_vaulted_nft` entry function
  - Verify caller is collection creator
  - Mint token via `token::create_named_token`
  - Create vault infrastructure object owned by NFT
  - Store `VaultInfo` under NFT address
  - Transfer to recipient
- [ ] **1B.3** Add `vault_exists` view function
- [ ] **1B.4** Write unit test: mint and verify vault existence

### 1C: Deposits (Days 5-6)

- [ ] **1C.1** Implement `deposit_to_vault` entry function
  - Validate amount > 0
  - Check asset allowlist (if non-empty)
  - Create `FungibleStore` on first deposit for each FA type
  - Track store in `vault_stores` SmartTable
  - Emit `VaultDeposited` event
- [ ] **1C.2** Add `get_vault_balances` view function
  - Iterate SmartTable and return (address, balance) pairs
- [ ] **1C.3** Write unit test: deposit single FA, deposit multiple FA types

### 1D: Burn & Redeem (Days 7-8)

- [ ] **1D.1** Implement `burn_and_redeem` entry function
  - Verify caller owns NFT
  - Check `is_redeemable` flag
  - Iterate `vault_stores` and withdraw all balances
  - Transfer withdrawn FAs to owner
  - Emit `VaultRedeemed` event
  - Clean up vault objects using `delete_ref`
  - Burn token via `token::burn`
  - Delete `VaultInfo`
- [ ] **1D.2** Write unit test: full lifecycle (mint → deposit → redeem)

### 1E: Royalty Settlement (Days 9-10)

- [ ] **1E.1** Implement `settle_sale_with_vault_royalty` entry function
  - Use `math64::mul_div` for safe royalty calculations
  - Transfer creator cut to `creator_payout_addr`
  - Deposit vault cut to NFT's vault
  - Transfer seller net to current owner
  - Transfer NFT to buyer
  - Emit `RoyaltySettled` event
- [ ] **1E.2** Add `last_sale_used_vault_royalty` view (with tracking)
- [ ] **1E.3** Write unit test: settlement flow with royalty verification

### Deliverables
- [ ] Complete `vaulted_collection.move` with all entry/view functions
- [ ] All unit tests passing via `cedra move test`
- [ ] Code documented with inline comments

---

## Phase 2: Testing & Audit Prep

**Goal:** Comprehensive testing and security review.

### Tasks

- [ ] **2.1** Edge case tests
  - Zero deposit amount (should abort)
  - Non-redeemable burn attempt (should abort)
  - Non-owner burn attempt (should abort)
  - Deposit of non-allowed FA type (should abort if allowlist active)
  - Empty vault redeem (should succeed with no transfers)

- [ ] **2.2** Integration tests (on testnet)
  ```bash
  cedra move publish --named-addresses cvn1_vault=default
  ```
  - Deploy to testnet
  - Execute full user flows via CLI

- [ ] **2.3** Gas benchmarking
  - Measure gas for: mint, deposit, redeem, settle
  - Document in `docs/GAS_BENCHMARKS.md`

- [ ] **2.4** Security checklist
  - [ ] No re-entrancy vectors
  - [ ] All arithmetic uses `math64::mul_div`
  - [ ] Proper capability patterns
  - [ ] Access control on all entry functions
  - [ ] No orphaned resources possible

- [ ] **2.5** Prepare for external audit (optional)
  - Clean code formatting
  - Generate coverage report
  - Document threat model

### Deliverables
- [ ] 100% test coverage on critical paths
- [ ] Testnet deployment verified
- [ ] Security self-audit complete

---

## Phase 3: TypeScript SDK

**Goal:** Developer-friendly client library for CVN-1 interactions.

### Tasks

- [ ] **3.1** Initialize SDK package
  ```bash
  cd sdk/typescript
  npm init -y
  npm install @cedra-labs/ts-sdk typescript
  ```

- [ ] **3.2** Implement core classes
  ```typescript
  // src/CVN1Client.ts
  export class CVN1Client {
    constructor(cedra: Cedra, moduleAddress: string);
    
    // Collection management
    async initCollection(signer, config): Promise<string>;
    
    // Minting
    async mintVaultedNFT(signer, params): Promise<{txHash, nftAddress}>;
    
    // Deposits
    async depositToVault(signer, nftAddress, faMetadata, amount): Promise<string>;
    
    // Redemption
    async burnAndRedeem(signer, nftAddress): Promise<string>;
    
    // Views (gas-free)
    async getVaultBalances(nftAddress): Promise<Array<{asset, balance}>>;
    async getVaultConfig(creatorAddress): Promise<VaultConfig>;
    async vaultExists(nftAddress): Promise<boolean>;
  }
  ```

- [ ] **3.3** Add TypeScript types
  ```typescript
  // src/types.ts
  export interface VaultConfig {
    collectionAddr: string;
    creatorRoyaltyBps: number;
    vaultRoyaltyBps: number;
    allowedAssets: string[];
    creatorPayoutAddr: string;
  }
  ```

- [ ] **3.4** Write SDK tests against testnet deployment

- [ ] **3.5** Build and publish
  ```bash
  npm run build
  npm publish  # or private registry
  ```

### Deliverables
- [ ] `@cvn1/sdk` npm package
- [ ] SDK documentation with examples
- [ ] Passing SDK tests

---

## Phase 4: Demo UI

**Goal:** Reference implementation showcasing CVN-1 capabilities.

### Tasks

- [ ] **4.1** Scaffold web app
  ```bash
  cd demo
  npx -y create-vite@latest . --template react-ts
  npm install @cedra-labs/ts-sdk @cvn1/sdk
  ```

- [ ] **4.2** Core pages
  - `/` - Landing with collection gallery
  - `/create` - Create vaulted collection (creator)
  - `/mint` - Mint new vaulted NFT (creator)
  - `/nft/:id` - NFT detail with vault balances
  - `/deposit/:id` - Deposit FA into vault
  - `/redeem/:id` - Burn & redeem flow

- [ ] **4.3** Wallet integration
  - Connect Zedra/Petra wallet
  - Display connected address
  - Sign transactions

- [ ] **4.4** UI components
  - `VaultBalanceCard` - Shows vault assets with USD values
  - `DepositModal` - FA type selector + amount input
  - `RedeemConfirmation` - Warning about NFT destruction

- [ ] **4.5** Real-time updates
  - Poll or websocket for vault balance changes
  - Toast notifications on successful tx

### Deliverables
- [ ] Deployed demo at `cvn1-demo.example.com`
- [ ] Mobile-responsive design
- [ ] Source code in `demo/`

---

## Phase 5: Indexer Service

**Goal:** Off-chain service to track vault states and provide fast queries.

### Tasks

- [ ] **5.1** Choose stack
  - Option A: Rust + PostgreSQL (recommended for production)
  - Option B: Node.js + Prisma (faster to prototype)

- [ ] **5.2** Event subscription
  - Subscribe to `VaultDeposited`, `VaultRedeemed`, `RoyaltySettled`
  - Track `VaultInfo` resource creation/deletion

- [ ] **5.3** Database schema
  ```sql
  CREATE TABLE vaulted_nfts (
    nft_address TEXT PRIMARY KEY,
    collection_address TEXT NOT NULL,
    creator_address TEXT NOT NULL,
    is_redeemable BOOLEAN NOT NULL,
    is_burned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL
  );
  
  CREATE TABLE vault_balances (
    nft_address TEXT NOT NULL,
    fa_metadata_address TEXT NOT NULL,
    balance BIGINT NOT NULL,
    last_updated TIMESTAMP NOT NULL,
    PRIMARY KEY (nft_address, fa_metadata_address)
  );
  
  CREATE TABLE vault_events (
    id SERIAL PRIMARY KEY,
    nft_address TEXT NOT NULL,
    event_type TEXT NOT NULL,
    data JSONB NOT NULL,
    tx_hash TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL
  );
  ```

- [ ] **5.4** REST API endpoints
  ```
  GET /api/v1/vaulted-nfts/:address
  GET /api/v1/vaulted-nfts/:address/balances
  GET /api/v1/vaulted-nfts/:address/history
  GET /api/v1/collections/:creator/nfts
  GET /api/v1/leaderboard?sort=total_value&limit=100
  ```

- [ ] **5.5** Deploy indexer
  - Docker container
  - Health checks
  - Monitoring/alerting

### Deliverables
- [ ] Running indexer service
- [ ] API documentation (OpenAPI spec)
- [ ] Docker compose for local dev

---

## Phase 6: Deployment & Documentation

**Goal:** Production-ready release with comprehensive docs.

### Tasks

- [ ] **6.1** Mainnet deployment
  ```bash
  cedra move publish --network mainnet --named-addresses cvn1_vault=<mainnet_addr>
  ```
  - Document deployed address
  - Verify on explorer

- [ ] **6.2** Documentation site
  - Integration guide
  - API reference
  - Code examples
  - FAQ

- [ ] **6.3** Create `docs/` structure
  ```
  docs/
  ├── README.md
  ├── INTEGRATION_GUIDE.md
  ├── API_REFERENCE.md
  ├── MARKETPLACE_GUIDE.md
  ├── SECURITY.md
  └── GAS_BENCHMARKS.md
  ```

- [ ] **6.4** Marketplace integration guide
  - How marketplaces call `settle_sale_with_vault_royalty`
  - Compliance badge requirements
  - Sample integration code

- [ ] **6.5** Submit CVN-1 as formal Cedra standard
  - Write CIP (Cedra Improvement Proposal) if applicable
  - Present to community/governance

### Deliverables
- [ ] Mainnet contract deployed
- [ ] Documentation site live
- [ ] Integration guide for marketplace partners

---

## Success Criteria

| Phase | Success Metric |
|-------|----------------|
| 0 | `cedra move compile` succeeds |
| 1 | All 15+ unit tests pass |
| 2 | Testnet E2E flows work |
| 3 | SDK npm package published |
| 4 | Demo UI deployed and functional |
| 5 | Indexer API responds correctly |
| 6 | Mainnet deployment verified |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Cedra framework API changes | Pin dependency versions; monitor releases |
| Gas costs too high | Benchmark early; optimize SmartTable usage |
| Security vulnerabilities | External audit before mainnet |
| Low marketplace adoption | Early partner outreach; provide integration support |
| Indexer sync lag | Implement websocket fallback; optimistic UI updates |

---

## Next Immediate Steps

1. **Create directory structure** (Phase 0.1)
2. **Configure Move.toml** (Phase 0.2)
3. **Implement skeleton module** with imports only
4. **Verify compilation** before writing logic

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12-08 | Initial development plan |

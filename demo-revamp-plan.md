# Demo Revamp Implementation Plan

**Goal:** Transform the current demo into a functional "CVN-1 v3 Playground" with dual vault support and no "strategies" abstraction.

## User Review Required

> [!IMPORTANT]
> **Backend Removal:** I will delete `demo/backend` entirely as it serves only valid-for-demo simulated data. The frontend will communicate directly with the Cedra Testnet.

## Proposed Changes

### 1. Cleanup
#### [x] [DELETE] `demo/backend/`
- Remove the Rust backend and its simulated endpoints.

### 2. Core Logic (`demo/frontend/src/lib/cvn1.ts`)
- Update `CVN1_ADDRESS` to v3 deployment.
- Add `DualVaultBalance` interface (core vs rewards).
- Add `getCoreVaultBalances` / `getRewardsVaultBalances` functions.
- Add `claimRewards` / `burnAndRedeem` helper methods (payload generators).

### 3. Components (`demo/frontend/src/components/`)
#### [NEW] `DualVaultDisplay.tsx`
- Visual component showing two distinct vault areas:
    - **Core Vault:** "Locked" icon, long-term value.
    - **Rewards Vault:** "Gift" icon, claimable value.

#### [NEW] `ActionButtons.tsx`
- **Claim Rewards:** Calls `claim_rewards`.
- **Deposit:** Dropdown to choose Core vs Rewards.
- **Burn:** Critical action with confirmation modal.

### 4. Pages (`demo/frontend/src/app/`)
#### [MODIFY] `create/page.tsx`
- **Refactor:** Remove "Choose Strategy" cards.
- **New UI:** Single clean form exposing all `init_collection_config` params:
    - Name, Description, URI
    - Royalty % (Creator + Rewards Vault)
    - Mint Price & Fee Splitting

#### [MODIFY] `mint/page.tsx`
- **Refactor:** Remove strategy selection.
- **New UI:** Simple "Mint from Collection" input.
- **Feature:** Show "Mint Seed -> Core Vault" flow visually.

#### [MODIFY] `explore/page.tsx` & `vault/[address]/page.tsx`
- Use `DualVaultDisplay`.
- Show live "Claimable Rewards" status.

## Verification Plan

### Manual Verification
Since this is a UI revamp, verification will be manual:
1.  **Build:** Run `npm run dev` in `demo/frontend`.
2.  **Create:** Deploy a new collection with 50/50 split.
3.  **Mint:** Mint an NFT and verify Core Vault has seed funds.
4.  **Deposit:** Manually deposit to Rewards Vault.
5.  **Claim:** Use "Claim Rewards" button and verify balance change without burning NFT.
6.  **Burn:** Use "Burn & Redeem" and verify NFT is burnt + all assets returned.

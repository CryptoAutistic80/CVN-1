# CVN-1 Version 3 Plan: Dual Vault Architecture

> Separating Core Value (long-term) from Rewards Value (short-term)

## Executive Summary

Version 3 introduces a **dual vault architecture** that distinguishes between:

| Vault Type | Purpose | Redemption |
|------------|---------|------------|
| **Core Vault** | Long-term value (mint seed, staking rewards, long-term participation) | Burn-to-redeem only |
| **Rewards Vault** | Short-term value (royalties, gaming wins, activity rewards) | Claim anytime |

This creates a clear separation between:
- **Floor value** — Permanent value tied to the NFT's existence (long-term incentives)
- **Liquid rewards** — Harvestable value accumulated through activities (short-term incentives)

---

## ✅ Design Decisions (Confirmed)

| Question | Decision |
|----------|----------|
| **Who can deposit to Core?** | Anyone (via smart contract or direct) |
| **Who can deposit to Rewards?** | Anyone (via smart contract or direct) |
| **Naming convention** | Core Vault / Rewards Vault |
| **Empty store cleanup** | Keep stores for reuse (can be topped up) |

### Use Case Examples

**Staking Program:**
- Long-term staker rewards → Core Vault (increases floor value)
- Bonus/promotion rewards → Rewards Vault (claimable)

**Gaming:**
- Long-term game participation → Core Vault (permanent growth)
- Gaming wins / activities → Rewards Vault (harvestable)

---

## Design Philosophy

### Current Design (v2)

```
┌────────────────────────────────────────────┐
│              NFT (Token Object)             │
│  ┌────────────────────────────────────────┐ │
│  │           Single VaultInfo              │ │
│  │  • Mint seed %                          │ │
│  │  • Manual top-ups                       │ │
│  │  • Royalties                            │ │
│  │  • Gaming rewards                       │ │
│  │  ─────────────────────                  │ │
│  │  REDEMPTION: Burn NFT to claim ALL      │ │
│  └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Proposed Design (v3)

```
┌─────────────────────────────────────────────────────────────┐
│                   NFT (Token Object)                         │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │     CORE VAULT       │  │       REWARDS VAULT          │ │
│  │   (Long-Term Value)  │  │    (Short-Term Value)        │ │
│  │                      │  │                              │ │
│  │  • Mint seed %       │  │  • Royalties                 │ │
│  │  • Staking rewards   │  │  • Gaming wins               │ │
│  │  • Long-term         │  │  • Activity rewards          │ │
│  │    participation     │  │  • Third-party deposits      │ │
│  │                      │  │                              │ │
│  │  ──────────────────  │  │  ────────────────────────    │ │
│  │  REDEEM: Burn NFT    │  │  CLAIM: Anytime              │ │
│  │  (Destroys NFT)      │  │  (Keeps NFT)                 │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Structure Changes

### Current VaultInfo (v2)

```move
struct VaultInfo has key {
    is_redeemable: bool,
    vault_stores: SmartTable<address, address>,
    store_delete_refs: SmartTable<address, DeleteRef>,
    extend_ref: ExtendRef,
    delete_ref: Option<DeleteRef>,
    burn_ref: BurnRef,
    creator_addr: address,
    last_sale_compliant: bool,
}
```

### Proposed VaultInfo (v3)

```move
struct VaultInfo has key {
    // Core Vault (burn-to-redeem) - Long-term value
    core_stores: SmartTable<address, address>,
    core_delete_refs: SmartTable<address, DeleteRef>,
    is_core_redeemable: bool,
    
    // Rewards Vault (claim anytime) - Short-term value
    rewards_stores: SmartTable<address, address>,
    rewards_delete_refs: SmartTable<address, DeleteRef>,
    
    // Object lifecycle refs
    extend_ref: ExtendRef,
    delete_ref: Option<DeleteRef>,
    burn_ref: BurnRef,
    
    // Metadata
    creator_addr: address,
    last_sale_compliant: bool,
}
```

---

## Entry Function Changes

### New Functions

| Function | Description | Access |
|----------|-------------|--------|
| `deposit_to_core_vault` | Deposit to core (long-term) vault | Anyone |
| `deposit_to_rewards_vault` | Deposit to rewards (short-term) vault | Anyone |
| `claim_rewards` | Owner claims rewards without burning | Owner only |
| `burn_and_redeem` | **Burn NFT to claim BOTH vaults** (core + rewards) | Owner only |

> **⚠️ Critical:** `burn_and_redeem` must withdraw from **both** core and rewards vaults to prevent lost funds.

### Modified Functions

| Function | Change |
|----------|--------|
| `creator_mint_vaulted_nft` | Mint seed → Core vault |
| `public_mint` | Mint seed → Core vault |
| `settle_sale_with_vault_royalty` | Vault royalty → **Rewards vault** |

### Deprecated/Removed

| Function | Status |
|----------|--------|
| `deposit_to_vault` | Split into `deposit_to_core_vault` + `deposit_to_rewards_vault` |
| (none) | `burn_and_redeem` now redeems both vaults |

---

## Routing Rules

| Source | Destination | Rationale |
|--------|-------------|-----------|
| Mint seed (% of mint price) | Core Vault | Initial floor value |
| Staking program rewards (long-term) | Core Vault | Permanent value growth |
| Gaming: Long-term participation | Core Vault | Loyalty reward |
| Secondary sale royalty | Rewards Vault | Short-term harvestable |
| Gaming: Wins/activities | Rewards Vault | Immediate claimable |
| Third-party promotional deposits | Either | Depositor chooses |

---

## Events

### New Events

```move
#[event]
struct CoreDeposited {
    nft_addr: address,
    fa_type: address,
    amount: u64,
    depositor: address,
}

#[event]
struct RewardsDeposited {
    nft_addr: address,
    fa_type: address,
    amount: u64,
    depositor: address,
}

#[event]
struct RewardsClaimed {
    nft_addr: address,
    claimer: address,
    claimed_assets: vector<address>,
}

#[event]
struct CoreRedeemed {
    nft_addr: address,
    redeemer: address,
    redeemed_assets: vector<address>,
}
```

---

## View Functions

### New Views

```move
#[view]
public fun get_core_vault_balances(nft_addr: address): vector<VaultBalance>

#[view]
public fun get_rewards_vault_balances(nft_addr: address): vector<VaultBalance>

#[view]
public fun get_dual_vault_summary(nft_addr: address): (
    u64,  // core_asset_count
    u64,  // rewards_asset_count  
    bool, // is_core_redeemable
    bool, // is_compliant
)
```

### Compatibility Views

```move
#[view]
public fun get_total_vault_balances(nft_addr: address): vector<VaultBalance>
// Returns combined core + rewards (for backwards compat)
```

---

## Implementation Phases

### Phase 1: Core Vault Restructure
- [ ] Rename `vault_stores` → `core_stores`
- [ ] Rename `store_delete_refs` → `core_delete_refs`
- [ ] Rename `is_redeemable` → `is_core_redeemable`
- [ ] Rename `burn_and_redeem` → `burn_and_redeem_core`
- [ ] Add `deposit_to_core_vault` (anyone can call)
- [ ] Update minting to use core vault

### Phase 2: Rewards Vault Addition
- [ ] Add `rewards_stores` SmartTable
- [ ] Add `rewards_delete_refs` SmartTable
- [ ] Add `deposit_to_rewards_vault` (anyone can call)
- [ ] Add `claim_rewards` entry function (owner only)
- [ ] Modify `settle_sale_with_vault_royalty` → route to rewards

### Phase 3: Events & Views
- [ ] Add `CoreDeposited`, `RewardsDeposited`, `RewardsClaimed`, `CoreRedeemed` events
- [ ] Add `get_core_vault_balances`, `get_rewards_vault_balances` views
- [ ] Add `get_dual_vault_summary` view
- [ ] Update existing events for clarity

### Phase 4: Testing
- [ ] `test_mint_seeds_core_vault`
- [ ] `test_royalty_goes_to_rewards`
- [ ] `test_claim_rewards_keeps_nft`
- [ ] `test_burn_and_redeem_core`
- [ ] `test_anyone_can_deposit_core`
- [ ] `test_anyone_can_deposit_rewards`
- [ ] `test_stores_persist_after_claim`

### Phase 5: Documentation
- [ ] Update CVN1-SPEC.md for v3
- [ ] Update TypeScript integration
- [ ] Update marketplace guide
- [ ] Create migration guide

---

## Verification Plan

### Automated Tests

```bash
cedra move test --dev
```

### Test Scenarios

1. **Mint seeds core:** Mint NFT with 50% mint_vault_bps → verify core vault has funds
2. **Royalty to rewards:** Call settle_sale → verify rewards vault receives royalty
3. **Claim preserves NFT:** Call claim_rewards → verify NFT still exists, owner has funds
4. **Burn claims core:** Call burn_and_redeem_core → verify NFT destroyed, owner has core funds
5. **Anyone deposits core:** Third-party deposits to core → succeeds
6. **Anyone deposits rewards:** Third-party deposits to rewards → succeeds
7. **Stores persist:** Claim all rewards → deposit again → verify works

---

## Summary

v3 introduces a clear separation of value incentives:

| Aspect | Core Vault | Rewards Vault |
|--------|------------|---------------|
| **Time Horizon** | Long-term | Short-term |
| **Purpose** | Floor/permanent value | Harvestable earnings |
| **Sources** | Mint seed, staking, loyalty | Royalties, wins, activities |
| **Claim** | N/A (only via burn) | `claim_rewards` (anytime) |
| **Burn** | ✅ Included in `burn_and_redeem` | ✅ Included in `burn_and_redeem` |
| **Deposit Access** | Anyone | Anyone |

This design enables:
- **Passive income** — Claim royalties without selling
- **Gaming rewards** — Harvest wins, keep playing
- **Staking incentives** — Build permanent floor value
- **Clear floor value** — Buyers know intrinsic long-term value
- **Composability** — Smart contracts can target either vault

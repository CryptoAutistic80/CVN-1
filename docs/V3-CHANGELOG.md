# CVN-1 v3 Changelog

## Overview

Version 3.0.0 introduces the **Dual Vault Architecture**, separating NFT value into two distinct vaults with different purposes and access patterns.

## New Features

### Dual Vault System

| Vault | Purpose | Access |
|-------|---------|--------|
| **Core Vault** | Long-term floor value | Burn NFT to redeem |
| **Rewards Vault** | Short-term income | Claim anytime |

### Routing Rules

| Source | Destination |
|--------|-------------|
| Mint fee | Core Vault |
| Royalties | Rewards Vault |
| Manual deposits | Either (caller chooses) |

### New Entry Functions

```move
// Deposit to specific vault
vault_ops::deposit_to_core_vault(nft, fa, amount)
vault_ops::deposit_to_rewards_vault(nft, fa, amount)

// Claim rewards without burning
vault_ops::claim_rewards(nft)

// Burn NFT and get BOTH vaults
vault_ops::burn_and_redeem(nft)
```

### New View Functions

```move
vault_views::get_core_vault_balances(nft)
vault_views::get_rewards_vault_balances(nft)
vault_views::get_vault_balances(nft)  // Combined (backward compat)
```

### New Events

- `RewardsClaimed` - Emitted when rewards are claimed without burning

## Breaking Changes

| v2 | v3 |
|----|-----|
| `deposit_to_vault` | Use `deposit_to_core_vault` or `deposit_to_rewards_vault` |
| Single `vault_stores` | Separate `core_stores` + `rewards_stores` |

## VaultInfo Structure

```move
struct VaultInfo {
    // Core Vault (long-term)
    is_core_redeemable: bool,
    core_stores: SmartTable<address, address>,
    core_delete_refs: SmartTable<address, DeleteRef>,
    
    // Rewards Vault (short-term)
    rewards_stores: SmartTable<address, address>,
    rewards_delete_refs: SmartTable<address, DeleteRef>,
    
    // Lifecycle
    extend_ref: ExtendRef,
    delete_ref: Option<DeleteRef>,
    burn_ref: BurnRef,
    creator_addr: address,
    last_sale_compliant: bool,
}
```

## Deployment

**Contract Address (Testnet):**
```
0x64650d57ef213323ea49c8d9b0eefc6c9d6c108b24b747c8cc2e1317a5907855
```

**Profile:** `cvn1-v3`

---

*Released: December 2024*

# CVN-1 v5.0.0 Changelog

**Release Date:** December 2025

---

## Overview

v5 simplifies the royalty model by integrating with Cedra's native framework royalties. This ensures automatic royalty enforcement on any Cedra marketplace.

---

## Breaking Changes

### Removed: `royalties.move` Module

The `settle_sale_with_vault_royalty` function and `mark_non_compliant_transfer` function have been **removed**. Secondary sale royalties are now handled by the Cedra framework.

### Changed: Vault Royalty Deprecated

The `vault_royalty_bps` parameter in `init_collection_config` is now **ignored**. Set to `0` for new collections.

---

## New Features

### Framework Royalty Integration

Collections now have on-chain royalty metadata that marketplaces can discover and enforce automatically.

```move
// In collection.move
use cedra_token_objects::royalty;

let royalty_opt = if (creator_royalty_bps > 0) {
    option::some(royalty::create(
        (creator_royalty_bps as u64),
        10000,  // basis points denominator
        creator_payout_addr
    ))
} else {
    option::none()
};
```

### Token Royalty Inheritance

Minted tokens now inherit royalty configuration from their collection:

```move
// In minting.move
royalty::get(collection_obj)  // Inherited from collection
```

---

## Migration Guide

### For Creators

1. When creating collections, set `vault_royalty_bps = 0`
2. `creator_royalty_bps` is now the only royalty that affects secondary sales
3. Vaults can still receive value via:
   - Mint-time seeding (`mint_vault_bps`)
   - Direct deposits
   - Smart contract integrations

### For Frontend Developers

Remove the "Vault Royalty" slider from collection creation UI. Only show:
- **Creator Royalty** — Goes to creator on secondary sales
- **Mint Vault %** — Seeds core vault at mint time

---

## File Changes

| File | Change |
|------|--------|
| `collection.move` | Added `cedra_token_objects::royalty` integration |
| `minting.move` | Tokens inherit royalty from collection |
| `royalties.move` | **DELETED** |
| `vault_core.move` | Removed `friend cvn1_vault::royalties` |

---

## Test Results

- **34/34 tests passing** (was 35, removed royalty settlement test)
- Frontend build: ✅ Successful

---

## Vault Value Sources

| Source | Vault Type | Description |
|--------|------------|-------------|
| Mint Seed | Core | % of mint price at creation |
| Direct Deposit | Either | Anyone can deposit anytime |
| Smart Contract | Either | Staking, gaming, rewards |
| ~~Secondary Sales~~ | ~~Rewards~~ | *Removed in v5* |

---

## Contract Address

**Profile:** `cvn1-v5`  
**Network:** Cedra Testnet  
**Address:** *Pending deployment*

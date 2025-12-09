# CVN-1 v4 Changelog

## Overview

Version 4.1.0 adds **Collection Size Limits** and fixes the **Public Mint Bug**.

## v4.1.0 Hotfix

Fixed `token::create_numbered_token` issue - it requires creator signer address to match `collection::creator()`. Solution: use `token::create` with manual numbering from `minted_count`.

**Changes:**
- `public_mint` now uses `token::create` instead of `create_numbered_token`
- Added `u64_to_string` helper for token numbering
- Token names format: "Name #1", "Name #2", etc. (contract handles numbering)
- Added 7 new minting tests (total: 35 tests)

## New Features

### Max Supply

| Feature | Description |
|---------|-------------|
| `max_supply` | Maximum tokens that can be minted (0 = unlimited) |
| `minted_count` | Tracks current mint count |
| Supply enforcement | Mints fail when limit reached |

### Collection Signer for Public Mint

Fixed `public_mint` to use collection's own signer (via ExtendRef) for token creation, enabling proper public minting from any wallet.

## New VaultedCollectionConfig Fields

```move
struct VaultedCollectionConfig {
    // ... existing fields ...
    collection_extend_ref: ExtendRef,  // For public mint
    max_supply: u64,                   // 0 = unlimited
    minted_count: u64,                 // Current count
}
```

## New/Updated Functions

### Entry Functions

| Function | Change |
|----------|--------|
| `init_collection_config` | Added `max_supply` parameter |
| `public_mint` | Uses collection signer, enforces supply, auto-numbers tokens |

### Helper Functions (vault_core)

```move
get_collection_signer(collection_addr): signer  // For public mint
can_mint(collection_addr): bool                  // Check supply
increment_minted_count(collection_addr)          // Track mints
get_supply(collection_addr): (u64, u64)          // (minted, max)
```

### View Functions (vault_views)

```move
get_collection_supply(collection_addr): (u64, u64)
can_mint(collection_addr): bool
```

## Breaking Changes

| v3 | v4 |
|----|-----|
| `init_collection_config` (11 params) | `init_collection_config` (12 params, added `max_supply`) |

## Deployment

**Contract Address (Testnet):** `0x0ce0283ba1806bb42a43f53679f9f668189ec6f1b6d13a7be706697a817c8646`

**Transaction:** [View on Cedrascan](https://cedrascan.com/txn/0x5cbf6dafaffce2945fdb0b1c26d0cd133a1263e861b14351035061f96b278933?network=testnet)

**Profile:** `cvn1-v4-fix`

**Deploy Command:**
```bash
cedra move publish --profile cvn1-v4-fix --named-addresses cvn1_vault=cvn1-v4-fix
```

---

*Deployed: December 2024*


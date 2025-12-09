# CVN-1 v4 Changelog

## Overview

Version 4.0.0 adds **Collection Size Limits** and fixes the **Public Mint Bug**.

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
| `public_mint` | Uses collection signer, enforces supply |

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

## Bug Fixes

### Public Mint EOBJECT_DOES_NOT_EXIST (Critical)

**Before (v3):** `public_mint` used buyer as token creator, failing when buyer ≠ collection creator.

**After (v4):** Uses `collection_extend_ref` to generate collection signer for token creation, then transfers to buyer.

## Deployment

**Contract Address (Testnet):** `0x52050c59f5f0d9ae741a11c5d91285cf9cd8a044be2214ba849141f2cb219632`

**Transaction:** [View on Cedrascan](https://cedrascan.com/txn/0xf5d91c87c98a3ba669b026e30b8f7cbcc77c32db1e45623a8382f1903a2973fd?network=testnet)

**Profile:** `cvn1-v4`

**Deploy Command:**
```bash
cedra move publish --profile cvn1-v4 --named-addresses cvn1_vault=cvn1-v4
```

---

*Planned: December 2024*

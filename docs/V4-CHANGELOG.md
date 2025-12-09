# CVN-1 v4 Changelog

## Overview

Version 4.2.0 adds **Collection Size Limits** and fixes the **Public Mint Bug** with owner-based minting.

## v4.2.0 - Owner-Based Minting Fix

Fixed root cause: `token::create()` validates `collection::creator() == signer_address`, but our collection_signer has the collection object's address, not the creator's.

**Solution:**
- Transfer collection ownership to itself during `init_collection_config` using `TransferRef`
- Use `token::create_token_as_collection_owner()` which validates `object::owner(collection) == signer_address`
- Since collection owns itself, collection_signer can now mint

**Changes:**
- `collection.move`: Added `generate_transfer_ref()` + `transfer_with_ref()` for self-ownership
- `minting.move`: Uses `token::create_token_as_collection_owner()` with `Object<Collection>`

## v4.1.0 Hotfix (Superseded)

Attempted fix using `token::create()` with manual numbering - still failed due to creator validation.


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

**Contract Address (Testnet):** `0xf1f6a0689865e51853978f8c4279a58c9b9c0da91da82d29a33735998b1682ff`

**Transaction:** [View on Cedrascan](https://cedrascan.com/txn/0x46c770f3f5d0b2f271cfab52a368b478a474fec48c5207266fae1f1776e9f0a0?network=testnet)

**Profile:** `cvn1-v42-deploy`

**Deploy Command:**
```bash
cedra move publish --profile cvn1-v42-deploy --named-addresses cvn1_vault=cvn1-v42-deploy
```

---

*Deployed: December 2024*


# CVN-1 v4 Upgrade Plan: Collection Size + Public Mint Fix

## Overview

v4 addresses two critical issues:
1. **Collection size limits** - Allow creators to set max supply
2. **Public mint bug fix** - Fix `EOBJECT_DOES_NOT_EXIST` error when non-creators mint

## Problems

### Problem 1: No Supply Limits
Currently, collections have **unlimited mints** - anyone can mint indefinitely. Creators cannot:
- Create limited edition collections
- Set scarcity for value
- Track remaining supply

### Problem 2: Public Mint Broken (Critical Bug)
The `public_mint` function fails with `EOBJECT_DOES_NOT_EXIST` when a user (not the creator) tries to mint.

**Root cause:** `token::create_numbered_token` is called with `buyer` as signer, but the collection belongs to the `creator`. Only the collection creator can mint tokens into their collection.

**Current broken code (minting.move:202):**
```move
let constructor_ref = token::create_numbered_token(
    buyer,  // ← BUG: buyer can't create tokens in creator's collection
    collection_name,
    ...
);
```

## Solutions

### Solution 1: Add Supply Tracking
Add `max_supply` and `minted_count` fields to `VaultedCollectionConfig`.

### Solution 2: Store Collection ExtendRef for Minting
Store an `ExtendRef` on the collection object so `public_mint` can generate a collection-level signer to create tokens.

---

## Changes Required

### 1. vault_core.move

#### Update `VaultedCollectionConfig` struct:

```diff
struct VaultedCollectionConfig has key {
    creator_royalty_bps: u16,
    vault_royalty_bps: u16,
    mint_vault_bps: u16,
    mint_price: u64,
    mint_price_fa: address,
    allowed_assets: vector<address>,
    creator_payout_addr: address,
+   /// ExtendRef for collection signer (enables public minting)
+   collection_extend_ref: ExtendRef,
+   /// Maximum tokens that can be minted (0 = unlimited)
+   max_supply: u64,
+   /// Current count of minted tokens
+   minted_count: u64,
}
```

#### Add error constant:
```move
const EMAX_SUPPLY_REACHED: u64 = 11;
public fun err_max_supply_reached(): u64 { EMAX_SUPPLY_REACHED }
```

#### Update `store_config()`:
Add `max_supply` parameter, initialize `minted_count: 0`.

#### Add helper functions:
```move
/// Generate collection signer for public minting
public(friend) fun get_collection_signer(collection_addr: address): signer 
    acquires VaultedCollectionConfig {
    let config = borrow_global<VaultedCollectionConfig>(collection_addr);
    object::generate_signer_for_extending(&config.collection_extend_ref)
}

public(friend) fun increment_minted_count(collection_addr: address) acquires VaultedCollectionConfig { ... }
public fun can_mint(collection_addr: address): bool acquires VaultedCollectionConfig { ... }
public fun get_remaining_supply(collection_addr: address): u64 acquires VaultedCollectionConfig { ... }
```

---

### 2. collection.move

Update `init_collection_config` entry function:

```diff
public entry fun init_collection_config(
    creator: &signer,
    name: String,
    description: String,
    uri: String,
    creator_royalty_bps: u16,
    vault_royalty_bps: u16,
    mint_vault_bps: u16,
    mint_price: u64,
    mint_price_fa_addr: address,
    allowed_assets: vector<address>,
    creator_payout_addr: address,
+   max_supply: u64,  // 0 = unlimited
) { ... }
```

---

### 3. minting.move

#### Fix `public_mint` to use collection signer:

```diff
public entry fun public_mint(
    buyer: &signer,
    collection_addr: address,
    name: String,
    description: String,
    uri: String,
    is_redeemable: bool
) {
    ...
    assert!(vault_core::config_exists(collection_addr), ...);
+   assert!(vault_core::can_mint(collection_addr), vault_core::err_max_supply_reached());
    
-   // BROKEN: buyer can't create tokens in creator's collection
-   let constructor_ref = token::create_numbered_token(
-       buyer,
-       collection_name,
-       ...
-   );

+   // FIXED: Get collection signer from ExtendRef stored in config
+   let collection_signer = vault_core::get_collection_signer(collection_addr);
+   
+   let constructor_ref = token::create_numbered_token(
+       &collection_signer,  // ← Use collection signer, not buyer
+       collection_name,
+       description,
+       name,
+       string::utf8(b""),
+       option::none(),
+       uri,
+   );
    
    // ... rest of mint logic ...
    
+   vault_core::increment_minted_count(collection_addr);
+   
+   // Transfer NFT to buyer (since collection signer created it)
+   let token_obj = object::object_from_constructor_ref<Token>(&constructor_ref);
+   object::transfer(&collection_signer, token_obj, buyer_addr);
    
    vault_events::emit_minted(...);
}
}
```

Also update `creator_mint_vaulted_nft` and `creator_self_mint` with same tracking.

---

### 4. vault_views.move

Add view function:

```move
#[view]
public fun get_collection_supply(collection_addr: address): (u64, u64) acquires VaultedCollectionConfig {
    // Returns (minted_count, max_supply)
    // If max_supply == 0, it means unlimited
}
```

---

### 5. Frontend Updates

#### lib/cvn1.ts
- Update `buildInitCollectionPayload` to include `maxSupply` parameter
- Add `getCollectionSupply(collectionAddr)` view function call

#### create/page.tsx
- Add "Max Supply" input field (0 = unlimited)

#### mint/page.tsx
- Display "X / Y minted" or "X minted (unlimited)"
- Disable mint button if sold out

---

### 6. Events (optional)

Consider adding to `vault_events.move`:
```move
struct SupplyUpdated has drop, store {
    collection_addr: address,
    minted_count: u64,
    max_supply: u64,
}
```

---

## Deployment

1. Bump version to `4.0.0` in `Move.toml`
2. Create new profile: `cedra init --profile cvn1-v4 --network testnet`
3. Deploy: `cedra move publish --profile cvn1-v4 --named-addresses cvn1_vault=cvn1-v4`
4. Update `CVN1_ADDRESS` in frontend

---

## Testing

- [ ] Create collection with max_supply = 5
- [ ] Mint 5 NFTs successfully
- [ ] Verify 6th mint fails with `EMAX_SUPPLY_REACHED`
- [ ] Test unlimited supply (max_supply = 0)
- [ ] Verify view function returns correct counts

---

## Migration Notes

- **Breaking change**: `init_collection_config` signature changes (new param)
- Existing v3 collections will NOT work with v4 contract
- Fresh deployment required on new address

---

**Version:** 4.0.0  
**Branch:** `upgrade/v4`  
**Status:** Planning

# CVN-1 Royalty Split Upgrade Plan

**Date:** December 2025  
**Status:** Research & Planning  
**Author:** AI Assistant

---

## Executive Summary

The Cedra framework's `royalty::create()` function only supports a **single payout address**. To split royalties between the collection creator and the core vault, we need an alternative approach. This document analyzes multiple solutions based on the Cedra documentation and blockchain flow patterns.

---

## Current State (v5)

From `V5-CHANGELOG.md` and `collection.move`:

```move
let royalty_opt = if (creator_royalty_bps > 0) {
    option::some(royalty::create(
        (creator_royalty_bps as u64),
        10000,  // basis points denominator
        creator_payout_addr  // ← Single address only
    ))
} else {
    option::none()
};
```

**Limitation:** Framework royalties are automatically enforced by marketplaces but can only go to one address.

---

## Solution Analysis

### Solution 1: Fee Splitter as Royalty Recipient (Recommended)

**Concept:** Deploy a Fee Splitter contract instance per collection. Set the Fee Splitter's address as the `creator_payout_addr` in the royalty configuration. When marketplaces pay royalties to this address, the creator (or anyone) can call `distribute_fees()` to split funds between themselves and the vault.

**Cedra Documentation Reference:** [Fee Splitter Guide](https://docs.cedra.network/guides/fee-splitter)

#### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        MARKETPLACE                                │
│    (Discovers royalty via cedra_token_objects::royalty)          │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Pays X% royalty
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FEE SPLITTER CONTRACT                          │
│                    (Per-Collection Instance)                      │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  Recipients:                                             │    │
│   │  - Creator Wallet: 70% (7000 bps)                       │    │
│   │  - Protocol Vault: 30% (3000 bps)                       │    │
│   └─────────────────────────────────────────────────────────┘    │
└───────────────┬──────────────────────────┬───────────────────────┘
                │ 70%                       │ 30%
                ▼                           ▼
         ┌──────────────┐           ┌──────────────────┐
         │   Creator    │           │   Core Vault     │
         │    Wallet    │           │   (Platform FA)  │
         └──────────────┘           └──────────────────┘
```

#### Implementation Steps

1. **Deploy FeeSplitter Module** (or use existing Cedra framework version)
   ```move
   module cvn1_vault::fee_splitter {
       // Based on Cedra's Fee Splitter Guide
       struct Recipient has copy, drop, store {
           addr: address,
           share: u64,  // parts of 10,000
       }
       
       struct FeeSplitter has key {
           recipients: vector<Recipient>,
           total_shares: u64,
           owner: address,
       }
       
       public entry fun create_splitter(
           creator: &signer,
           addresses: vector<address>,
           shares: vector<u64>,
       ) { /* ... */ }
       
       public entry fun distribute_fees(
           sender: &signer,
           splitter_owner: address,
           asset_metadata: Object<Metadata>,
           amount: u64,
       ) acquires FeeSplitter { /* ... */ }
   }
   ```

2. **Modify Collection Creation Flow**
   ```move
   // In collection.move or new fee_splitter.move
   public entry fun init_collection_with_split_royalty(
       creator: &signer,
       // ... existing params ...
       vault_share_bps: u16,  // e.g., 3000 = 30%
       protocol_vault_addr: address,
   ) {
       // 1. Create fee splitter with creator + vault as recipients
       let creator_share = 10000 - (vault_share_bps as u64);
       fee_splitter::create_splitter(
           creator,
           vector[creator_payout_addr, protocol_vault_addr],
           vector[creator_share, (vault_share_bps as u64)],
       );
       
       // 2. Use fee splitter address as royalty payout
       let splitter_addr = signer::address_of(creator);
       let royalty_opt = option::some(royalty::create(
           (creator_royalty_bps as u64),
           10000,
           splitter_addr,  // Fee splitter receives royalties
       ));
       
       // 3. Continue with collection creation...
   }
   ```

3. **Royalty Claim Workflow**
   - Royalties accumulate in fee splitter's primary store
   - Anyone calls `distribute_fees(splitter_addr, asset_metadata, amount)`
   - Funds split proportionally and sent to recipients
   - Can be automated via backend worker or frontend button

#### Pros
- ✅ Works with existing Cedra marketplace royalty enforcement
- ✅ Single on-chain call for distribution
- ✅ Immutable split ratios (audit-friendly)
- ✅ Token-agnostic (works with any FA)
- ✅ Transparent, verifiable on-chain

#### Cons
- ⚠️ Requires extra transaction to distribute accumulated royalties
- ⚠️ One fee splitter per collection (storage overhead)
- ⚠️ Split ratios immutable (need new splitter for changes)

---

### Solution 2: Escrow-Based Royalty Routing

**Concept:** Use an escrow pattern where royalties are locked and can be claimed/distributed according to vesting rules. This is more suitable for time-delayed or conditional distributions.

**Cedra Documentation Reference:** [Escrow Guide](https://docs.cedra.network/guides/escrow)

#### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        MARKETPLACE                                │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Pays royalty
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                 ROYALTY ESCROW CONTRACT                           │
│                 (Time-Locked or Conditional)                      │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  Rules:                                                  │    │
│   │  - 70% → Creator (immediate claim)                       │    │
│   │  - 30% → Vault (locked until epoch end)                 │    │
│   └─────────────────────────────────────────────────────────┘    │
└───────────────┬──────────────────────────┬───────────────────────┘
                │                           │
                ▼                           ▼
         [Immediate Claim]          [Time-Locked Claim]
                │                           │
         ┌──────────────┐           ┌──────────────────┐
         │   Creator    │           │   Core Vault     │
         │    Wallet    │           │  (After Unlock)  │
         └──────────────┘           └──────────────────┘
```

#### Implementation Concept

```move
module cvn1_vault::royalty_escrow {
    use cedra_framework::timestamp;
    
    struct RoyaltyLockup has key {
        creator: address,
        extend_ref: ExtendRef,
        escrows: SmartTable<EscrowKey, address>,
    }
    
    enum RoyaltyEscrow has key {
        CreatorShare {
            original_owner: address,  // marketplace
            delete_ref: DeleteRef,
        },
        VaultShare {
            unlock_secs: u64,
            target_vault: address,
            delete_ref: DeleteRef,
        },
    }
    
    public entry fun process_royalty(
        marketplace: &signer,
        collection_addr: address,
        fa_metadata: Object<Metadata>,
        total_amount: u64,
    ) {
        // 1. Calculate splits
        let vault_share = math64::mul_div(total_amount, vault_bps, 10000);
        let creator_share = total_amount - vault_share;
        
        // 2. Creator share: deposit to escrow (immediate claim)
        lock_to_escrow_simple(marketplace, creator_addr, fa_metadata, creator_share);
        
        // 3. Vault share: deposit to time-locked escrow
        let unlock_time = timestamp::now_seconds() + EPOCH_DURATION;
        lock_to_escrow_time_locked(marketplace, vault_addr, fa_metadata, vault_share, unlock_time);
    }
}
```

#### Pros
- ✅ Supports time-delayed distributions
- ✅ Can implement complex vesting schedules
- ✅ Supports refund mechanisms
- ✅ Good for compliance/regulatory requirements

#### Cons
- ⚠️ More complex than fee splitter
- ⚠️ Requires marketplace integration
- ⚠️ Higher gas cost for escrow operations
- ⚠️ Time locks may not be needed for royalty splitting

---

### Solution 3: Custom Splitter Contract as Payout Address

**Concept:** Deploy a minimal "RoyaltySplitter" contract per collection that auto-splits incoming funds on receipt (no separate claim needed).

#### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        MARKETPLACE                                │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Pays royalty to splitter address
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              CUSTOM ROYALTY SPLITTER OBJECT                       │
│                                                                   │
│   on_receive_hook():                                              │
│      - Calculate creator_share (70%)                              │
│      - Calculate vault_share (30%)                                │
│      - Transfer to creator immediately                            │
│      - Transfer to vault immediately                              │
│                                                                   │
└───────────────┬──────────────────────────┬───────────────────────┘
                │                           │
                ▼                           ▼
         ┌──────────────┐           ┌──────────────────┐
         │   Creator    │           │   Core Vault     │
         │    Wallet    │           │   (Immediate)    │
         └──────────────┘           └──────────────────┘
```

#### Implementation Concept

```move
module cvn1_vault::royalty_splitter {
    use cedra_framework::fungible_asset::{Self, FungibleStore};
    use cedra_framework::dispatchable_fungible_asset;
    
    struct RoyaltySplitter has key {
        creator_addr: address,
        vault_addr: address,
        vault_share_bps: u64,
        // Store for receiving royalties (uses dispatch hooks)
        store_ref: FungibleStore,
        extend_ref: ExtendRef,
    }
    
    /// Called automatically when FA is deposited to splitter's store
    /// NOTE: Requires dispatchable FA support
    public fun on_deposit(
        store: Object<FungibleStore>,
        fa: FungibleAsset,
    ) acquires RoyaltySplitter {
        let splitter_addr = object::object_address(&store);
        let splitter = borrow_global<RoyaltySplitter>(splitter_addr);
        
        let total = fungible_asset::amount(&fa);
        let vault_share = math64::mul_div(total, splitter.vault_share_bps, 10000);
        let creator_share = total - vault_share;
        
        // Auto-forward to recipients
        let vault_fa = fungible_asset::extract(&mut fa, vault_share);
        primary_fungible_store::deposit(splitter.vault_addr, vault_fa);
        primary_fungible_store::deposit(splitter.creator_addr, fa);
    }
}
```

#### Pros
- ✅ Automatic splitting (no claim needed)
- ✅ Truly transparent flow
- ✅ No accumulation of funds

#### Cons
- ⚠️ Requires dispatchable FA (advanced Cedra feature)
- ⚠️ Higher complexity
- ⚠️ May not work with all FA types
- ⚠️ Limited Cedra documentation on dispatch hooks

#### Dispatchable FA Findings (from `aptos_framework`)
- Creating a dispatchable asset is only possible at **mint metadata creation time**: call `dispatchable_fungible_asset::register_dispatch_functions(&constructor_ref, withdraw_fn_opt, deposit_fn_opt, derived_balance_fn_opt)` before the metadata object leaves creation scope. The helper rejects deletable objects and **blocks the native coin** (`@aptos_fungible_asset`), so existing standard coins cannot be upgraded.
- Deposit hook signature (must match `dispatchable_deposit`): `public fun on_deposit<T: key>(store: Object<T>, fa: FungibleAsset, transfer_ref: &TransferRef)`; withdraw hook: `public fun on_withdraw<T: key>(store: Object<T>, amount: u64, transfer_ref: &TransferRef): FungibleAsset`. Register them via `function_info::new_function_info(<module>, b"royalty_splitter", b"on_deposit")`.
- Once a hook is registered, **all transfers must use dispatchable functions** (`dispatchable_fungible_asset::*` or wrappers like `primary_fungible_store`). Calling vanilla `fungible_asset::deposit/withdraw` will abort (`EINVALID_DISPATCHABLE_OPERATIONS`), so marketplaces must already use dispatchable flows for that token.
- Gas: hooks run inline in the caller’s transaction. `function_info::load_module_from_function` is invoked before dispatch, so gas for loading + hook execution is charged to the payer (the marketplace transfer). Any abort/OOG in the hook reverts the sale.
- Reentrancy: MoveVM prevents re-entering dispatchable deposits (see `reentrant_token` test), but still design the hook with check-effects-interactions and avoid calling into other dispatchable hooks to prevent gas blow-ups.
- Critical blocker: Option 3 only works if the **payment token was minted with dispatchable hooks registered**. Native coins (and any FA created without `register_dispatch_functions` at birth) will never trigger `on_deposit`, so royalties paid in those tokens cannot auto-split.

---

### Solution 4: Marketplace-Level Integration (Off-Chain + On-Chain Hybrid)

**Concept:** If CVN-1 operates/partners with its own marketplace, integrate royalty splitting directly into the sale settlement logic.

#### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    CVN-1 MARKETPLACE                              │
│                                                                   │
│   settle_sale():                                                  │
│      1. Calculate total royalty from collection config            │
│      2. Read split ratio from VaultedCollectionConfig             │
│      3. Send creator_share to creator_payout_addr                │
│      4. Call vault_core::deposit_to_core_vault() for vault_share │
│                                                                   │
└───────────────┬──────────────────────────┬───────────────────────┘
                │                           │
                ▼                           ▼
         ┌──────────────┐           ┌──────────────────┐
         │   Creator    │           │   NFT's Core     │
         │    Wallet    │           │      Vault       │
         └──────────────┘           └──────────────────┘
```

#### Implementation Concept

```move
module cvn1_vault::marketplace {
    
    public entry fun settle_sale(
        buyer: &signer,
        nft: Object<Token>,
        sale_price: u64,
        payment_fa: Object<Metadata>,
    ) {
        let collection = token::collection(nft);
        let collection_addr = object::object_address(&collection);
        
        // Get royalty config (re-use vault_royalty_bps field!)
        let (creator_bps, vault_bps, _, _, _, _, creator_payout) = 
            vault_core::get_config_values(collection_addr);
        
        // Calculate royalties
        let total_royalty = math64::mul_div(sale_price, (creator_bps as u64), 10000);
        let vault_amount = math64::mul_div(total_royalty, (vault_bps as u64), 10000);
        let creator_amount = total_royalty - vault_amount;
        
        // Withdraw from buyer
        let payment = primary_fungible_store::withdraw(buyer, payment_fa, sale_price);
        
        // Split payments
        let vault_payment = fungible_asset::extract(&mut payment, vault_amount);
        let creator_payment = fungible_asset::extract(&mut payment, creator_amount);
        let seller_payment = payment; // Remainder to seller
        
        // Distribute
        vault_core::deposit_to_core_vault(
            object::object_address(&nft),
            payment_fa,
            vault_payment
        );
        primary_fungible_store::deposit(creator_payout, creator_payment);
        primary_fungible_store::deposit(token::owner(nft), seller_payment);
        
        // Transfer NFT
        object::transfer(buyer, nft, signer::address_of(buyer));
    }
}
```

#### Pros
- ✅ Full control over split logic
- ✅ Can deposit directly to per-NFT vaults
- ✅ No external dependencies
- ✅ Re-uses existing `vault_royalty_bps` field!

#### Cons
- ⚠️ Only works on CVN-1 marketplace
- ⚠️ Third-party marketplaces won't use this
- ⚠️ Requires building/maintaining a marketplace

---

## Recommendation

### Primary: Solution 1 (Fee Splitter)

**For broad marketplace compatibility**, the Fee Splitter approach is optimal:

1. Works with any Cedra marketplace that reads `royalty` metadata
2. Uses proven Cedra patterns from official documentation
3. Simple, auditable, immutable split ratios
4. Low storage overhead per collection

### Secondary: Solution 4 (Marketplace Integration)

**For maximum value accrual to individual NFT vaults**, combined with Solution 1:

1. On CVN-1/partner marketplaces: Use Solution 4 to deposit directly to NFT vaults
2. On third-party marketplaces: Use Solution 1 (Fee Splitter) with vault as recipient

### Hybrid Configuration

```move
struct VaultedCollectionConfig has key {
    // ... existing fields ...
    
    // v6: Royalty Split Configuration
    /// Address of deployed fee splitter (for third-party marketplace royalties)
    fee_splitter_addr: address,
    /// BPS going to protocol vault (10000 = 100%)
    vault_royalty_split_bps: u16,
    /// Whether to use per-NFT vaults or protocol vault
    use_nft_vaults: bool,
}
```

---

## Implementation Phases

### Phase 1: Fee Splitter Module
- [x] Add `fee_splitter.move` to CVN-1 contract
- [x] Add splitter creation to collection init flow (`init_collection_with_fee_splitter`)
- [x] Add view functions for splitter info (`vault_views::get_fee_splitter_addr`)
- [ ] Deploy and test on testnet

### Phase 2: Collection Config Update
- [x] Add `fee_splitter_addr` to `VaultedCollectionConfig`
- [ ] Add `vault_royalty_split_bps` parameter
- [ ] Update `init_collection_config` entry function
- [ ] Migrate existing collections (or create v6 init)

### Phase 3: Distribution Automation
- [ ] Backend worker to monitor splitter balances
- [ ] Auto-trigger `distribute_fees` when threshold reached
- [ ] Frontend UI for manual distribution trigger
- [ ] Dashboard showing pending/distributed royalties

### Phase 4: (Optional) Marketplace Integration
- [ ] Implement CVN-1 marketplace module
- [ ] Direct vault deposits for controlled listings
- [ ] Hybrid royalty handling

---

## Open Questions

1. **Should vault share go to:**
   - A) Single protocol-wide vault address?
   - B) Per-collection vault address?
   - C) Per-NFT core vaults (requires knowing which NFT was sold)?

2. **Adjustable split ratios:**
   - Current Fee Splitter is immutable. Do we need updatable splits?
   - If yes, need custom implementation with owner controls.

3. **Who pays for distribution gas?**
   - Creator calls distribute (incentivized to get their share)?
   - Protocol worker auto-distributes?
   - Bundle with other user actions?

4. **Threshold-based distribution:**
   - Accumulate until X amount before distributing (save gas)?
   - What's the optimal threshold?

---

## References

- [Cedra Fee Splitter Guide](https://docs.cedra.network/guides/fee-splitter)
- [Cedra Escrow Guide](https://docs.cedra.network/guides/escrow)
- [Cedra NFT Guide](https://docs.cedra.network/guides/first-nft)
- [CVN-1 V5 Changelog](docs/V5-CHANGELOG.md)
- [CVN-1 Collection Module](contracts/cvn1_vault/sources/collection.move)
- [CVN-1 Vault Core](contracts/cvn1_vault/sources/vault_core.move)
- [aptos_framework::dispatchable_fungible_asset](https://raw.githubusercontent.com/aptos-labs/aptos-core/main/aptos-move/framework/aptos-framework/sources/dispatchable_fungible_asset.move)
- [aptos_framework::fungible_asset dispatch hooks](https://raw.githubusercontent.com/aptos-labs/aptos-core/main/aptos-move/framework/aptos-framework/sources/fungible_asset.move)
- [Dispatchable hook example (`simple_dispatchable_token`)](https://raw.githubusercontent.com/aptos-labs/aptos-core/main/aptos-move/framework/aptos-framework/tests/simple_dispatchable_token.move)
- [Reentrancy guard example (`reentrant_token`)](https://raw.githubusercontent.com/aptos-labs/aptos-core/main/aptos-move/framework/aptos-framework/tests/reentrant_token.move)

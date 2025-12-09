/// CVN-1: Core Data Structures and Constants
/// 
/// This module contains the foundational types, error codes, and constants
/// used across all CVN-1 modules.
/// 
/// NOTE: Due to Move's reference rules, we cannot return references from
/// borrow_global. Each module must do its own borrowing. This module
/// provides constructors, move operations, and helper functions.
module cvn1_vault::vault_core {
    use std::option::Option;
    use std::vector;
    use cedra_framework::object::{Self, ExtendRef, DeleteRef, Object};
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore, FungibleAsset};
    use cedra_token_objects::token::BurnRef;
    use cedra_std::smart_table::{Self, SmartTable};

    // ============================================
    // Friend Declarations
    // ============================================
    
    friend cvn1_vault::collection;
    friend cvn1_vault::minting;
    friend cvn1_vault::vault_ops;
    friend cvn1_vault::royalties;
    friend cvn1_vault::vault_views;

    // ============================================
    // Error Codes
    // ============================================
    
    /// Caller is not the collection creator
    const ENOT_CREATOR: u64 = 1;
    /// Caller is not the current NFT owner
    const ENOT_OWNER: u64 = 2;
    /// NFT vault is not redeemable
    const ENOT_REDEEMABLE: u64 = 3;
    /// Amount must be greater than zero
    const EINVALID_AMOUNT: u64 = 4;
    /// Asset type not in allowlist
    const EASSET_NOT_ALLOWED: u64 = 5;
    /// Insufficient balance in vault
    const EINSUFFICIENT_BALANCE: u64 = 6;
    /// Collection already exists for this creator
    const ECOLLECTION_ALREADY_EXISTS: u64 = 7;
    /// Vault not found for NFT
    const EVAULT_NOT_FOUND: u64 = 8;
    /// Invalid royalty basis points (exceeds 10000)
    const EINVALID_ROYALTY_BPS: u64 = 9;
    /// Config not found for collection
    const ECONFIG_NOT_FOUND: u64 = 10;
    
    /// Maximum basis points (100%)
    const MAX_BPS: u64 = 10000;

    // ============================================
    // Public Getters for Constants/Errors
    // ============================================

    public fun max_bps(): u64 { MAX_BPS }
    public fun err_not_creator(): u64 { ENOT_CREATOR }
    public fun err_not_owner(): u64 { ENOT_OWNER }
    public fun err_not_redeemable(): u64 { ENOT_REDEEMABLE }
    public fun err_invalid_amount(): u64 { EINVALID_AMOUNT }
    public fun err_asset_not_allowed(): u64 { EASSET_NOT_ALLOWED }
    public fun err_insufficient_balance(): u64 { EINSUFFICIENT_BALANCE }
    public fun err_collection_already_exists(): u64 { ECOLLECTION_ALREADY_EXISTS }
    public fun err_vault_not_found(): u64 { EVAULT_NOT_FOUND }
    public fun err_invalid_royalty_bps(): u64 { EINVALID_ROYALTY_BPS }
    public fun err_config_not_found(): u64 { ECONFIG_NOT_FOUND }

    // ============================================
    // Data Structures
    // ============================================

    /// Configuration for a vaulted NFT collection
    /// Stored under the collection object's address
    struct VaultedCollectionConfig has key {
        /// Creator royalty in basis points (10000 = 100%)
        creator_royalty_bps: u16,
        /// Vault top-up royalty in basis points (from secondary sales)
        vault_royalty_bps: u16,
        /// Percentage of mint fee to seed into vault (0-10000 = 0-100%)
        mint_vault_bps: u16,
        /// Mint price in smallest units (0 = free mint)
        mint_price: u64,
        /// FA metadata address for mint payments (only needed if mint_price > 0)
        mint_price_fa: address,
        /// Allowed FA types for deposits (empty = any FA allowed)
        allowed_assets: vector<address>,
        /// Address to receive creator payments
        creator_payout_addr: address,
    }

    /// Per-NFT vault information
    /// Stored under the NFT's object address
    struct VaultInfo has key {
        /// Whether the vault can be burned and redeemed
        is_redeemable: bool,
        /// Maps FA metadata address -> store object address
        vault_stores: SmartTable<address, address>,
        /// Maps FA metadata address -> store DeleteRef for cleanup
        store_delete_refs: SmartTable<address, DeleteRef>,
        /// Reference for extending vault object capabilities
        extend_ref: ExtendRef,
        /// Reference for cleanup on burn+redeem (optional - named tokens may not support deletion)
        delete_ref: Option<DeleteRef>,
        /// Reference for burning the token
        burn_ref: BurnRef,
        /// Address of the collection creator (for config lookup)
        creator_addr: address,
        /// Track if last sale used vault royalty
        last_sale_compliant: bool,
    }

    /// Struct for returning vault balance info in views
    struct VaultBalance has copy, drop {
        fa_metadata_addr: address,
        balance: u64,
    }

    // ============================================
    // Existence Checks
    // ============================================

    /// Check if config exists at address
    public fun config_exists(addr: address): bool {
        exists<VaultedCollectionConfig>(addr)
    }

    /// Check if vault exists at address
    public fun vault_exists(addr: address): bool {
        exists<VaultInfo>(addr)
    }

    // ============================================
    // Config Read Functions (return copied values)
    // ============================================

    /// Get all config values at once (avoids multiple borrows)
    public fun get_config_values(addr: address): (u16, u16, u16, u64, address, vector<address>, address) 
    acquires VaultedCollectionConfig {
        let config = borrow_global<VaultedCollectionConfig>(addr);
        (
            config.creator_royalty_bps,
            config.vault_royalty_bps,
            config.mint_vault_bps,
            config.mint_price,
            config.mint_price_fa,
            config.allowed_assets,
            config.creator_payout_addr,
        )
    }

    /// Get config for views (subset of fields)
    public fun get_config_for_view(addr: address): (u16, u16, vector<address>, address)
    acquires VaultedCollectionConfig {
        let config = borrow_global<VaultedCollectionConfig>(addr);
        (
            config.creator_royalty_bps,
            config.vault_royalty_bps,
            config.allowed_assets,
            config.creator_payout_addr,
        )
    }

    // ============================================
    // Vault Read Functions (return copied values)
    // ============================================

    /// Get vault info for views
    public fun get_vault_info_for_view(addr: address): (bool, address, bool)
    acquires VaultInfo {
        let vault = borrow_global<VaultInfo>(addr);
        (vault.is_redeemable, vault.creator_addr, vault.last_sale_compliant)
    }

    /// Check if vault is redeemable
    public fun is_vault_redeemable(addr: address): bool acquires VaultInfo {
        let vault = borrow_global<VaultInfo>(addr);
        vault.is_redeemable
    }

    /// Get vault compliance status
    public fun get_vault_compliance(addr: address): bool acquires VaultInfo {
        let vault = borrow_global<VaultInfo>(addr);
        vault.last_sale_compliant
    }

    /// Get vault balances for views
    public fun get_vault_balances(nft_addr: address): vector<VaultBalance> acquires VaultInfo {
        let balances = vector::empty<VaultBalance>();
        
        if (!exists<VaultInfo>(nft_addr)) {
            return balances
        };
        
        let vault_info = borrow_global<VaultInfo>(nft_addr);
        let keys = smart_table::keys(&vault_info.vault_stores);
        let i = 0;
        let len = vector::length(&keys);
        
        while (i < len) {
            let fa_addr = *vector::borrow(&keys, i);
            let store_addr = *smart_table::borrow(&vault_info.vault_stores, fa_addr);
            let store = object::address_to_object<FungibleStore>(store_addr);
            let balance = fungible_asset::balance(store);
            
            vector::push_back(&mut balances, VaultBalance {
                fa_metadata_addr: fa_addr,
                balance,
            });
            i = i + 1;
        };
        
        balances
    }

    // ============================================
    // VaultBalance Accessors
    // ============================================

    public fun new_vault_balance(fa_metadata_addr: address, balance: u64): VaultBalance {
        VaultBalance { fa_metadata_addr, balance }
    }

    public fun balance_fa_addr(balance: &VaultBalance): address {
        balance.fa_metadata_addr
    }

    public fun balance_amount(balance: &VaultBalance): u64 {
        balance.balance
    }

    // ============================================
    // Constructor Functions (friend-only)
    // ============================================

    /// Create and store a new VaultedCollectionConfig
    public(friend) fun create_and_store_config(
        signer: &signer,
        creator_royalty_bps: u16,
        vault_royalty_bps: u16,
        mint_vault_bps: u16,
        mint_price: u64,
        mint_price_fa: address,
        allowed_assets: vector<address>,
        creator_payout_addr: address,
    ) {
        move_to(signer, VaultedCollectionConfig {
            creator_royalty_bps,
            vault_royalty_bps,
            mint_vault_bps,
            mint_price,
            mint_price_fa,
            allowed_assets,
            creator_payout_addr,
        });
    }

    /// Create and store a new VaultInfo
    public(friend) fun create_and_store_vault(
        signer: &signer,
        is_redeemable: bool,
        extend_ref: ExtendRef,
        delete_ref: Option<DeleteRef>,
        burn_ref: BurnRef,
        creator_addr: address,
    ) {
        move_to(signer, VaultInfo {
            is_redeemable,
            vault_stores: smart_table::new(),
            store_delete_refs: smart_table::new(),
            extend_ref,
            delete_ref,
            burn_ref,
            creator_addr,
            last_sale_compliant: false,
        });
    }

    // ============================================
    // Vault Mutation Functions (friend-only)
    // ============================================

    /// Deposit FA into vault (creates store if needed)
    public(friend) fun deposit_to_vault(
        nft_addr: address,
        fa_metadata: Object<Metadata>,
        fa: FungibleAsset
    ) acquires VaultInfo {
        let fa_addr = object::object_address(&fa_metadata);
        let vault_info = borrow_global_mut<VaultInfo>(nft_addr);
        
        // Create store if needed
        if (!smart_table::contains(&vault_info.vault_stores, fa_addr)) {
            let vault_signer = object::generate_signer_for_extending(&vault_info.extend_ref);
            let store_constructor = object::create_object_from_account(&vault_signer);
            
            // Generate DeleteRef before creating the store
            let store_delete_ref = object::generate_delete_ref(&store_constructor);
            
            let store = fungible_asset::create_store(&store_constructor, fa_metadata);
            let store_addr = object::object_address(&store);
            
            smart_table::add(&mut vault_info.vault_stores, fa_addr, store_addr);
            smart_table::add(&mut vault_info.store_delete_refs, fa_addr, store_delete_ref);
        };
        
        // Deposit
        let store_addr = *smart_table::borrow(&vault_info.vault_stores, fa_addr);
        let store = object::address_to_object<FungibleStore>(store_addr);
        fungible_asset::deposit(store, fa);
    }

    /// Check allowlist for a deposit
    public fun check_allowlist(collection_addr: address, fa_addr: address): bool 
    acquires VaultedCollectionConfig {
        if (!exists<VaultedCollectionConfig>(collection_addr)) {
            return true // No config means no restrictions
        };
        let config = borrow_global<VaultedCollectionConfig>(collection_addr);
        if (vector::is_empty(&config.allowed_assets)) {
            return true // Empty allowlist means all allowed
        };
        vector::contains(&config.allowed_assets, &fa_addr)
    }

    /// Set vault compliance status
    public(friend) fun set_vault_compliance(nft_addr: address, compliant: bool) acquires VaultInfo {
        let vault = borrow_global_mut<VaultInfo>(nft_addr);
        vault.last_sale_compliant = compliant;
    }

    /// Move vault out for burn_and_redeem (destructive)
    /// Returns: (extend_ref, burn_ref, delete_ref, vault_stores, store_delete_refs)
    /// delete_ref may be None for named tokens that don't support deletion
    public(friend) fun extract_vault_for_redeem(nft_addr: address): (
        ExtendRef, 
        BurnRef, 
        Option<DeleteRef>, 
        SmartTable<address, address>,
        SmartTable<address, DeleteRef>
    ) acquires VaultInfo {
        let VaultInfo {
            is_redeemable: _,
            vault_stores,
            store_delete_refs,
            extend_ref,
            delete_ref,
            burn_ref,
            creator_addr: _,
            last_sale_compliant: _,
        } = move_from<VaultInfo>(nft_addr);
        
        (extend_ref, burn_ref, delete_ref, vault_stores, store_delete_refs)
    }
}

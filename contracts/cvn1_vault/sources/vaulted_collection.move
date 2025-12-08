/// CVN-1: Cedra Vaulted NFT Standard
/// 
/// This module implements the CVN-1 standard for vaulted NFTs on Cedra.
/// Each NFT has a dedicated FA vault that can hold multiple fungible assets,
/// with support for creator royalties, vault royalties, and burn-to-redeem functionality.
module cvn1_vault::vaulted_collection {
    use std::string::String;
    use std::option;
    use std::signer;
    use std::vector;
    
    use cedra_framework::object::{Self, Object, ExtendRef, DeleteRef};
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore, FungibleAsset};
    use cedra_framework::primary_fungible_store;
    use cedra_framework::event;
    
    use cedra_token_objects::collection::{Self, Collection};
    use cedra_token_objects::token::{Self, Token};
    
    use cedra_std::math64;
    use cedra_std::smart_table::{Self, SmartTable};

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
    /// Config not found for creator
    const ECONFIG_NOT_FOUND: u64 = 10;
    
    /// Maximum basis points (100%)
    const MAX_BPS: u64 = 10000;

    // ============================================
    // Data Structures
    // ============================================

    /// Configuration for a vaulted NFT collection
    /// Stored under the collection creator's address
    struct VaultedCollectionConfig has key {
        /// Address of the collection object
        collection_addr: address,
        /// Creator royalty in basis points (10000 = 100%)
        creator_royalty_bps: u16,
        /// Vault top-up royalty in basis points
        vault_royalty_bps: u16,
        /// Allowed FA types (empty = any FA allowed)
        allowed_assets: vector<address>,
        /// Address to receive creator royalty payments
        creator_payout_addr: address,
    }

    /// Per-NFT vault information
    /// Stored under the NFT's object address
    struct VaultInfo has key {
        /// Whether the vault can be burned and redeemed
        is_redeemable: bool,
        /// Maps FA metadata address -> store object address
        vault_stores: SmartTable<address, address>,
        /// Reference for extending vault object capabilities
        extend_ref: ExtendRef,
        /// Reference for cleanup on burn+redeem
        delete_ref: DeleteRef,
        /// Address of the collection creator (for config lookup)
        creator_addr: address,
        /// Track if last sale used vault royalty
        last_sale_compliant: bool,
    }

    // ============================================
    // Events
    // ============================================

    #[event]
    struct VaultedNFTMinted has drop, store {
        nft_object_addr: address,
        collection_addr: address,
        creator: address,
        recipient: address,
        is_redeemable: bool,
    }

    #[event]
    struct VaultDeposited has drop, store {
        nft_object_addr: address,
        fa_type: address,
        amount: u64,
        depositor: address,
    }

    #[event]
    struct VaultRedeemed has drop, store {
        nft_object_addr: address,
        redeemer: address,
        assets_redeemed: vector<address>,
    }

    #[event]
    struct RoyaltySettled has drop, store {
        nft_object_addr: address,
        sale_currency: address,
        gross_amount: u64,
        creator_cut: u64,
        vault_cut: u64,
        seller_net: u64,
    }

    // ============================================
    // Entry Functions
    // ============================================

    /// Initialize a new vaulted NFT collection with configuration
    public entry fun init_collection_config(
        creator: &signer,
        collection_name: String,
        collection_description: String,
        collection_uri: String,
        creator_royalty_bps: u16,
        vault_royalty_bps: u16,
        allowed_assets: vector<address>,
        creator_payout_addr: address
    ) {
        let creator_addr = signer::address_of(creator);
        
        // Validate royalty basis points
        assert!(
            (creator_royalty_bps as u64) + (vault_royalty_bps as u64) <= MAX_BPS,
            EINVALID_ROYALTY_BPS
        );
        
        // Validate no existing collection config
        assert!(!exists<VaultedCollectionConfig>(creator_addr), ECOLLECTION_ALREADY_EXISTS);
        
        // Create unlimited collection
        collection::create_unlimited_collection(
            creator,
            collection_description,
            collection_name,
            option::none(), // No royalty struct for now
            collection_uri,
        );
        
        // Derive collection address
        let collection_addr = collection::create_collection_address(&creator_addr, &collection_name);
        
        // Store collection config under creator
        move_to(creator, VaultedCollectionConfig {
            collection_addr,
            creator_royalty_bps,
            vault_royalty_bps,
            allowed_assets,
            creator_payout_addr,
        });
    }

    /// Mint a new vaulted NFT
    public entry fun mint_vaulted_nft(
        creator: &signer,
        to: address,
        name: String,
        description: String,
        uri: String,
        is_redeemable: bool
    ) acquires VaultedCollectionConfig {
        let creator_addr = signer::address_of(creator);
        assert!(exists<VaultedCollectionConfig>(creator_addr), ECONFIG_NOT_FOUND);
        let config = borrow_global<VaultedCollectionConfig>(creator_addr);
        
        // Get collection name from address
        let collection_obj = object::address_to_object<Collection>(config.collection_addr);
        let collection_name = collection::name(collection_obj);
        
        // Create the NFT with a named token
        let constructor_ref = token::create_named_token(
            creator,
            collection_name,
            description,
            name,
            option::none(), // No royalty
            uri,
        );
        
        let token_signer = object::generate_signer(&constructor_ref);
        let nft_addr = object::address_from_constructor_ref(&constructor_ref);
        
        // Create refs for vault lifecycle management
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let delete_ref = object::generate_delete_ref(&constructor_ref);
        
        // Initialize VaultInfo under the NFT address
        move_to(&token_signer, VaultInfo {
            is_redeemable,
            vault_stores: smart_table::new(),
            extend_ref,
            delete_ref,
            creator_addr,
            last_sale_compliant: false,
        });
        
        // Transfer NFT to recipient
        let token_obj = object::object_from_constructor_ref<Token>(&constructor_ref);
        object::transfer(creator, token_obj, to);
        
        // Emit minted event
        event::emit(VaultedNFTMinted {
            nft_object_addr: nft_addr,
            collection_addr: config.collection_addr,
            creator: creator_addr,
            recipient: to,
            is_redeemable,
        });
    }

    /// Deposit fungible assets into an NFT's vault
    public entry fun deposit_to_vault(
        depositor: &signer,
        nft_object: Object<Token>,
        fa_metadata: Object<Metadata>,
        amount: u64
    ) acquires VaultInfo, VaultedCollectionConfig {
        // Validate amount
        assert!(amount > 0, EINVALID_AMOUNT);
        
        let nft_addr = object::object_address(&nft_object);
        assert!(exists<VaultInfo>(nft_addr), EVAULT_NOT_FOUND);
        
        let depositor_addr = signer::address_of(depositor);
        let fa_addr = object::object_address(&fa_metadata);
        
        // Get vault info to check allowlist
        let vault_info = borrow_global<VaultInfo>(nft_addr);
        let creator_addr = vault_info.creator_addr;
        
        // Check allowlist if configured
        if (exists<VaultedCollectionConfig>(creator_addr)) {
            let config = borrow_global<VaultedCollectionConfig>(creator_addr);
            if (!vector::is_empty(&config.allowed_assets)) {
                assert!(vector::contains(&config.allowed_assets, &fa_addr), EASSET_NOT_ALLOWED);
            };
        };
        
        // Re-borrow as mutable for modifications
        let vault_info_mut = borrow_global_mut<VaultInfo>(nft_addr);
        
        // Withdraw from depositor's primary store
        let fa = primary_fungible_store::withdraw(depositor, fa_metadata, amount);
        
        // Get or create store for this FA type
        if (!smart_table::contains(&vault_info_mut.vault_stores, fa_addr)) {
            // Create new store for this FA type under the NFT
            let vault_signer = object::generate_signer_for_extending(&vault_info_mut.extend_ref);
            let store_constructor = object::create_object_from_account(&vault_signer);
            let store = fungible_asset::create_store(&store_constructor, fa_metadata);
            let store_addr = object::object_address(&store);
            smart_table::add(&mut vault_info_mut.vault_stores, fa_addr, store_addr);
        };
        
        // Deposit into vault store
        let store_addr = *smart_table::borrow(&vault_info_mut.vault_stores, fa_addr);
        let store = object::address_to_object<FungibleStore>(store_addr);
        fungible_asset::deposit(store, fa);
        
        // Emit deposit event
        event::emit(VaultDeposited {
            nft_object_addr: nft_addr,
            fa_type: fa_addr,
            amount,
            depositor: depositor_addr,
        });
    }

    /// Burn an NFT and redeem all vault contents to the owner
    public entry fun burn_and_redeem(
        owner: &signer,
        nft_object: Object<Token>
    ) acquires VaultInfo {
        let owner_addr = signer::address_of(owner);
        let nft_addr = object::object_address(&nft_object);
        
        // Verify ownership
        assert!(object::owner(nft_object) == owner_addr, ENOT_OWNER);
        
        // Get vault info
        assert!(exists<VaultInfo>(nft_addr), EVAULT_NOT_FOUND);
        let vault_info = borrow_global_mut<VaultInfo>(nft_addr);
        
        // Verify redeemable
        assert!(vault_info.is_redeemable, ENOT_REDEEMABLE);
        
        // Get vault signer for withdrawals
        let vault_signer = object::generate_signer_for_extending(&vault_info.extend_ref);
        
        // Collect all FA addresses for the event
        let redeemed_assets = vector::empty<address>();
        
        // Iterate all stores and withdraw to owner
        // Note: SmartTable iteration requires knowing the keys
        // We iterate by getting keys from the table
        let keys = smart_table::keys(&vault_info.vault_stores);
        let i = 0;
        let len = vector::length(&keys);
        while (i < len) {
            let fa_addr = *vector::borrow(&keys, i);
            let store_addr = *smart_table::borrow(&vault_info.vault_stores, fa_addr);
            let store = object::address_to_object<FungibleStore>(store_addr);
            
            // Get balance and withdraw if > 0
            let balance = fungible_asset::balance(store);
            if (balance > 0) {
                let _fa_metadata = fungible_asset::store_metadata(store);
                let fa = withdraw_from_store(&vault_signer, store, balance);
                primary_fungible_store::deposit(owner_addr, fa);
                vector::push_back(&mut redeemed_assets, fa_addr);
            };
            i = i + 1;
        };
        
        // Emit redeem event
        event::emit(VaultRedeemed {
            nft_object_addr: nft_addr,
            redeemer: owner_addr,
            assets_redeemed: redeemed_assets,
        });
        
        // Note: In production, we would also:
        // 1. Clean up the SmartTable
        // 2. Delete the VaultInfo using delete_ref
        // 3. Burn the token
        // For now, the NFT remains but vault is emptied
    }

    /// Settle a sale with vault royalty
    public entry fun settle_sale_with_vault_royalty(
        marketplace: &signer,
        nft_object: Object<Token>,
        buyer: address,
        sale_currency: Object<Metadata>,
        gross_amount: u64
    ) acquires VaultInfo, VaultedCollectionConfig {
        let nft_addr = object::object_address(&nft_object);
        assert!(exists<VaultInfo>(nft_addr), EVAULT_NOT_FOUND);
        
        let vault_info = borrow_global<VaultInfo>(nft_addr);
        let creator_addr = vault_info.creator_addr;
        let current_owner = object::owner(nft_object);
        
        // Get collection config
        assert!(exists<VaultedCollectionConfig>(creator_addr), ECONFIG_NOT_FOUND);
        let config = borrow_global<VaultedCollectionConfig>(creator_addr);
        
        // Calculate splits using overflow-safe math
        let creator_cut = math64::mul_div(gross_amount, (config.creator_royalty_bps as u64), MAX_BPS);
        let vault_cut = math64::mul_div(gross_amount, (config.vault_royalty_bps as u64), MAX_BPS);
        let seller_net = gross_amount - creator_cut - vault_cut;
        
        let sale_currency_addr = object::object_address(&sale_currency);
        
        // Withdraw gross amount from marketplace
        let total_fa = primary_fungible_store::withdraw(marketplace, sale_currency, gross_amount);
        
        // Split the funds
        let creator_fa = fungible_asset::extract(&mut total_fa, creator_cut);
        let vault_fa = fungible_asset::extract(&mut total_fa, vault_cut);
        // Remaining is seller_net
        
        // Transfer creator cut
        primary_fungible_store::deposit(config.creator_payout_addr, creator_fa);
        
        // Deposit vault cut into NFT's vault
        deposit_fa_to_vault(nft_addr, sale_currency, vault_fa);
        
        // Transfer seller net to current owner
        primary_fungible_store::deposit(current_owner, total_fa);
        
        // Transfer NFT to buyer
        // Note: This requires the marketplace to have transfer permission
        // In practice, the seller would have listed via a transfer mechanism
        object::transfer(marketplace, nft_object, buyer);
        
        // Update compliance tracking
        let vault_info_mut = borrow_global_mut<VaultInfo>(nft_addr);
        vault_info_mut.last_sale_compliant = true;
        
        // Emit settlement event
        event::emit(RoyaltySettled {
            nft_object_addr: nft_addr,
            sale_currency: sale_currency_addr,
            gross_amount,
            creator_cut,
            vault_cut,
            seller_net,
        });
    }

    // ============================================
    // Internal Helper Functions
    // ============================================

    /// Internal: Withdraw from a fungible store with signer authority
    fun withdraw_from_store(
        store_signer: &signer,
        store: Object<FungibleStore>,
        amount: u64
    ): FungibleAsset {
        // Use the store's metadata to get the FA
        let _metadata = fungible_asset::store_metadata(store);
        fungible_asset::withdraw(store_signer, store, amount)
    }

    /// Internal: Deposit FA directly into a vault (used by royalty settlement)
    fun deposit_fa_to_vault(
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
            let store = fungible_asset::create_store(&store_constructor, fa_metadata);
            let store_addr = object::object_address(&store);
            smart_table::add(&mut vault_info.vault_stores, fa_addr, store_addr);
        };
        
        // Deposit
        let store_addr = *smart_table::borrow(&vault_info.vault_stores, fa_addr);
        let store = object::address_to_object<FungibleStore>(store_addr);
        fungible_asset::deposit(store, fa);
    }

    // ============================================
    // View Functions
    // ============================================

    #[view]
    /// Get all vault balances for an NFT
    /// Returns vector of (fa_metadata_address, balance) pairs
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

    /// Struct for returning vault balance info
    struct VaultBalance has copy, drop {
        fa_metadata_addr: address,
        balance: u64,
    }

    #[view]
    /// Get collection configuration
    public fun get_vault_config(creator_addr: address): (u16, u16, vector<address>, address) acquires VaultedCollectionConfig {
        assert!(exists<VaultedCollectionConfig>(creator_addr), ECONFIG_NOT_FOUND);
        let config = borrow_global<VaultedCollectionConfig>(creator_addr);
        (
            config.creator_royalty_bps,
            config.vault_royalty_bps,
            config.allowed_assets,
            config.creator_payout_addr
        )
    }

    #[view]
    /// Check if a vault exists for an NFT
    public fun vault_exists(nft_addr: address): bool {
        exists<VaultInfo>(nft_addr)
    }

    #[view]
    /// Check if last sale used vault royalty (compliance tracking)
    public fun last_sale_used_vault_royalty(nft_addr: address): bool acquires VaultInfo {
        if (!exists<VaultInfo>(nft_addr)) {
            return false
        };
        let vault_info = borrow_global<VaultInfo>(nft_addr);
        vault_info.last_sale_compliant
    }

    #[view]
    /// Get vault info details
    public fun get_vault_info(nft_addr: address): (bool, address, bool) acquires VaultInfo {
        assert!(exists<VaultInfo>(nft_addr), EVAULT_NOT_FOUND);
        let vault_info = borrow_global<VaultInfo>(nft_addr);
        (
            vault_info.is_redeemable,
            vault_info.creator_addr,
            vault_info.last_sale_compliant
        )
    }

    // ============================================
    // Test Functions
    // ============================================

    #[test_only]
    use std::string::utf8;

    #[test(creator = @0x123)]
    fun test_init_collection_config(creator: &signer) acquires VaultedCollectionConfig {
        init_collection_config(
            creator,
            utf8(b"Test Vaulted Collection"),
            utf8(b"A test collection for CVN-1"),
            utf8(b"https://example.com/collection.json"),
            250,  // 2.5% creator royalty
            250,  // 2.5% vault royalty
            vector::empty(),
            @0x123
        );
        
        let (creator_bps, vault_bps, assets, payout) = get_vault_config(@0x123);
        assert!(creator_bps == 250, 0);
        assert!(vault_bps == 250, 1);
        assert!(vector::is_empty(&assets), 2);
        assert!(payout == @0x123, 3);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = EINVALID_ROYALTY_BPS)]
    fun test_invalid_royalty_bps(creator: &signer) {
        // Should fail: 60% + 50% = 110% > 100%
        init_collection_config(
            creator,
            utf8(b"Test Collection"),
            utf8(b"Description"),
            utf8(b"https://example.com"),
            6000,  // 60%
            5000,  // 50%
            vector::empty(),
            @0x123
        );
    }
}

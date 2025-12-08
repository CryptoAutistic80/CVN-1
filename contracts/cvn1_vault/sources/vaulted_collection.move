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
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use cedra_framework::primary_fungible_store;
    use cedra_framework::event;
    
    use cedra_token_objects::collection;
    use cedra_token_objects::token::{Self, Token};
    
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
    }

    // ============================================
    // Events
    // ============================================

    #[event]
    /// Emitted when assets are deposited into a vault
    struct VaultDeposited has drop, store {
        nft_object_addr: address,
        fa_type: address,
        amount: u64,
        depositor: address,
    }

    #[event]
    /// Emitted when a vault is burned and redeemed
    struct VaultRedeemed has drop, store {
        nft_object_addr: address,
        redeemer: address,
    }

    #[event]
    /// Emitted when royalties are settled on a sale
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
    /// 
    /// # Arguments
    /// * `creator` - The signer creating the collection
    /// * `collection_name` - Name of the NFT collection
    /// * `collection_description` - Description of the collection
    /// * `collection_uri` - URI for collection metadata
    /// * `creator_royalty_bps` - Creator royalty in basis points
    /// * `vault_royalty_bps` - Vault royalty in basis points
    /// * `allowed_assets` - Vector of allowed FA metadata addresses (empty = any)
    /// * `creator_payout_addr` - Address to receive creator royalties
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
    /// 
    /// # Arguments
    /// * `creator` - The collection creator (signer)
    /// * `to` - Recipient address for the minted NFT
    /// * `name` - Token name
    /// * `description` - Token description  
    /// * `uri` - Token metadata URI
    /// * `is_redeemable` - Whether the vault can be burned and redeemed
    public entry fun mint_vaulted_nft(
        creator: &signer,
        to: address,
        name: String,
        description: String,
        uri: String,
        is_redeemable: bool
    ) acquires VaultedCollectionConfig {
        let creator_addr = signer::address_of(creator);
        let config = borrow_global<VaultedCollectionConfig>(creator_addr);
        
        // Get collection name from address
        let collection_obj = object::address_to_object<collection::Collection>(config.collection_addr);
        let collection_name = collection::name(collection_obj);
        
        // Create the NFT with a named token (supply = 1 for NFT uniqueness)
        let constructor_ref = token::create_named_token(
            creator,
            collection_name,
            description,
            name,
            option::none(), // No royalty
            uri,
        );
        
        let token_signer = object::generate_signer(&constructor_ref);
        let nft_addr = signer::address_of(&token_signer);
        
        // Create refs for vault lifecycle management
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let delete_ref = object::generate_delete_ref(&constructor_ref);
        
        // Initialize VaultInfo under the NFT address
        move_to(&token_signer, VaultInfo {
            is_redeemable,
            vault_stores: smart_table::new(),
            extend_ref,
            delete_ref,
        });
        
        // Transfer NFT to recipient
        let token_obj = object::object_from_constructor_ref<Token>(&constructor_ref);
        object::transfer(creator, token_obj, to);
    }

    /// Deposit fungible assets into an NFT's vault
    /// 
    /// # Arguments
    /// * `depositor` - The depositor signer
    /// * `nft_object` - The NFT to deposit into
    /// * `fa_metadata` - The fungible asset type
    /// * `amount` - Amount to deposit
    public entry fun deposit_to_vault(
        depositor: &signer,
        nft_object: Object<Token>,
        fa_metadata: Object<Metadata>,
        amount: u64
    ) acquires VaultInfo {
        // Validate amount
        assert!(amount > 0, EINVALID_AMOUNT);
        
        let nft_addr = object::object_address(&nft_object);
        assert!(exists<VaultInfo>(nft_addr), EVAULT_NOT_FOUND);
        
        let depositor_addr = signer::address_of(depositor);
        let fa_addr = object::object_address(&fa_metadata);
        
        // Check allowlist if configured
        // TODO: Find collection creator from NFT and check allowlist
        
        let vault_info = borrow_global_mut<VaultInfo>(nft_addr);
        
        // Withdraw from depositor
        let fa = primary_fungible_store::withdraw(depositor, fa_metadata, amount);
        
        // Get or create store for this FA type
        if (!smart_table::contains(&vault_info.vault_stores, fa_addr)) {
            // Create new store for this FA type
            let vault_signer = object::generate_signer_for_extending(&vault_info.extend_ref);
            let store_constructor = object::create_object_from_account(&vault_signer);
            let store = fungible_asset::create_store(&store_constructor, fa_metadata);
            let store_addr = object::object_address(&store);
            smart_table::add(&mut vault_info.vault_stores, fa_addr, store_addr);
        };
        
        // Deposit into vault store
        let store_addr = *smart_table::borrow(&vault_info.vault_stores, fa_addr);
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
    /// 
    /// # Arguments
    /// * `owner` - The current NFT owner (signer)
    /// * `nft_object` - The NFT to burn and redeem
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
        
        // Iterate all stores and withdraw to owner
        // TODO: Implement store iteration and withdrawal
        
        // Emit redeem event
        event::emit(VaultRedeemed {
            nft_object_addr: nft_addr,
            redeemer: owner_addr,
        });
        
        // Cleanup vault and burn NFT
        // TODO: Implement cleanup using delete_ref
        // TODO: Burn token
    }

    /// Settle a sale with vault royalty
    /// 
    /// # Arguments
    /// * `marketplace` - The marketplace signer holding funds
    /// * `nft_object` - The NFT being sold
    /// * `buyer` - The buyer address
    /// * `sale_currency` - The FA type used for payment
    /// * `gross_amount` - Total sale amount
    public entry fun settle_sale_with_vault_royalty(
        _marketplace: &signer,
        nft_object: Object<Token>,
        _buyer: address,
        _sale_currency: Object<Metadata>,
        _gross_amount: u64
    ) {
        let nft_addr = object::object_address(&nft_object);
        assert!(exists<VaultInfo>(nft_addr), EVAULT_NOT_FOUND);
        
        // TODO: Get collection config from NFT's collection
        // TODO: Calculate splits using math64::mul_div
        // TODO: Execute transfers
        // TODO: Transfer NFT to buyer
        // TODO: Emit RoyaltySettled event
    }

    // ============================================
    // View Functions
    // ============================================

    #[view]
    /// Get all vault balances for an NFT
    public fun get_vault_balances(nft_addr: address): vector<address> {
        // Return FA metadata addresses for now (simplified)
        // TODO: Return (address, u64) pairs
        if (!exists<VaultInfo>(nft_addr)) {
            return vector::empty()
        };
        
        // Placeholder - return empty for skeleton
        vector::empty()
    }

    #[view]
    /// Get collection configuration
    public fun get_vault_config(creator_addr: address): (u16, u16, vector<address>, address) acquires VaultedCollectionConfig {
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
    public fun last_sale_used_vault_royalty(_nft_addr: address): bool {
        // TODO: Implement tracking
        false
    }
}

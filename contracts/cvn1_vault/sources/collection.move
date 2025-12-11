/// CVN-1: Collection Management
/// 
/// Handles collection initialization and configuration.
module cvn1_vault::collection {
    use std::string::String;
    use std::signer;
    use std::option;
    use cedra_framework::object;
    use cedra_token_objects::collection;
    use cedra_token_objects::royalty;
    
    use cvn1_vault::vault_core;
    use cvn1_vault::fee_splitter;

    // ============================================
    // Entry Functions
    // ============================================

    /// Initialize a new vaulted NFT collection with configuration (v6)
    /// 
    /// Creates an unlimited collection and stores the CVN-1 config on the collection object.
    /// Deploys a fee splitter for royalty distribution between creator and protocol vault.
    /// 
    /// NOTE: Entry functions cannot return values in Move. After calling this,
    /// use `get_collection_address(creator, name)` to retrieve the collection address.
    public entry fun init_collection_config(
        creator: &signer,
        collection_name: String,
        collection_description: String,
        collection_uri: String,
        creator_royalty_bps: u16,
        vault_royalty_bps: u16,
        mint_vault_bps: u16,
        mint_price: u64,
        mint_price_fa: address,
        allowed_assets: vector<address>,
        creator_payout_addr: address,
        max_supply: u64,  // 0 = unlimited
        protocol_vault_addr: address,  // v6: Address for protocol's share of royalties
    ) {
        // Check if collection already exists for this creator with this name
        let creator_addr = signer::address_of(creator);
        let collection_addr = collection::create_collection_address(&creator_addr, &collection_name);
        assert!(
            !vault_core::config_exists(collection_addr),
            vault_core::err_collection_already_exists()
        );
        
        // Validate royalty basis points (for secondary sales)
        assert!(
            (creator_royalty_bps as u64) + (vault_royalty_bps as u64) <= vault_core::max_bps(),
            vault_core::err_invalid_royalty_bps()
        );
        
        // Validate mint vault bps
        assert!(
            (mint_vault_bps as u64) <= vault_core::max_bps(), 
            vault_core::err_invalid_royalty_bps()
        );
        
        // v6: Create fee splitter for royalty distribution
        // Total royalty = creator_royalty_bps, split between creator and vault
        // vault_royalty_bps determines what portion goes to protocol vault
        let creator_share = 10000 - (vault_royalty_bps as u64);  // Remainder to creator
        let vault_share = (vault_royalty_bps as u64);
        
        let splitter_addr = if (vault_share > 0) {
            // Create splitter with both recipients
            let addresses = vector[creator_payout_addr, protocol_vault_addr];
            let shares = vector[creator_share, vault_share];
            fee_splitter::create_splitter(creator, addresses, shares)
        } else {
            // No vault share, use creator address directly (no splitter needed)
            @0x0
        };
        
        // Determine royalty payout address: splitter if created, otherwise creator
        let royalty_payout = if (splitter_addr != @0x0) {
            splitter_addr
        } else {
            creator_payout_addr
        };
        
        // Create framework royalty for marketplace discovery (v6)
        // Uses total creator_royalty_bps with payout to splitter for distribution
        let royalty_opt = if (creator_royalty_bps > 0) {
            option::some(royalty::create(
                (creator_royalty_bps as u64),
                10000,  // denominator (basis points)
                royalty_payout
            ))
        } else {
            option::none()
        };
        
        // Create unlimited collection and get constructor ref
        let constructor_ref = collection::create_unlimited_collection(
            creator,
            collection_description,
            collection_name,
            royalty_opt,
            collection_uri,
        );
        
        let collection_signer = object::generate_signer(&constructor_ref);
        let collection_addr = signer::address_of(&collection_signer);
        
        // Generate ExtendRef for collection (enables public minting)
        let collection_extend_ref = object::generate_extend_ref(&constructor_ref);
        
        // Generate TransferRef to enable ownership transfer
        let transfer_ref = object::generate_transfer_ref(&constructor_ref);
        
        // Create and store collection config with v6 fields
        vault_core::create_and_store_config(
            &collection_signer,
            creator_royalty_bps,
            vault_royalty_bps,
            mint_vault_bps,
            mint_price,
            mint_price_fa,
            allowed_assets,
            creator_payout_addr,
            collection_extend_ref,
            max_supply,
            splitter_addr,  // v6: store splitter address
        );
        
        // Transfer collection ownership to itself using TransferRef (v4.1 fix)
        // This enables create_token_as_collection_owner to work with collection_signer
        let linear_transfer_ref = object::generate_linear_transfer_ref(&transfer_ref);
        object::transfer_with_ref(linear_transfer_ref, collection_addr);
    }

    // ============================================
    // View Functions
    // ============================================

    #[view]
    /// Get the deterministic collection address for a creator and collection name
    /// 
    /// Use this after calling `init_collection_config` to get the collection address
    /// for subsequent minting calls.
    public fun get_collection_address(creator: address, collection_name: String): address {
        collection::create_collection_address(&creator, &collection_name)
    }
}

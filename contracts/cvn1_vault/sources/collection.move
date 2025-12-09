/// CVN-1: Collection Management
/// 
/// Handles collection initialization and configuration.
module cvn1_vault::collection {
    use std::string::String;
    use std::option;
    use cedra_framework::object;
    use cedra_token_objects::collection;
    
    use cvn1_vault::vault_core;

    // ============================================
    // Entry Functions
    // ============================================

    /// Initialize a new vaulted NFT collection with configuration
    /// 
    /// Creates an unlimited collection and stores the CVN-1 config on the collection object.
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
        creator_payout_addr: address
    ) {
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
        
        // Create unlimited collection and get constructor ref
        let constructor_ref = collection::create_unlimited_collection(
            creator,
            collection_description,
            collection_name,
            option::none(),
            collection_uri,
        );
        
        let collection_signer = object::generate_signer(&constructor_ref);
        
        // Create and store collection config
        vault_core::create_and_store_config(
            &collection_signer,
            creator_royalty_bps,
            vault_royalty_bps,
            mint_vault_bps,
            mint_price,
            mint_price_fa,
            allowed_assets,
            creator_payout_addr,
        );
    }
}

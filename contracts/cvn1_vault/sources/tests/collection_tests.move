// CVN-1: Collection Tests
// Test module for collection initialization and configuration.
#[test_only]
module cvn1_vault::collection_tests {
    use std::string::utf8;
    use std::vector;
    use std::signer;
    
    use cvn1_vault::collection;
    use cvn1_vault::vault_core;
    use cvn1_vault::vault_views;

    // ============================================
    // Test Helpers
    // ============================================

    /// Helper to get collection address after creation
    fun get_collection_address(creator: address, name: vector<u8>): address {
        use cedra_token_objects::collection;
        let name_str = utf8(name);
        collection::create_collection_address(&creator, &name_str)
    }

    // ============================================
    // init_collection_config tests
    // ============================================

    #[test(creator = @0x123)]
    fun test_init_collection_config(creator: &signer) {
        collection::init_collection_config(
            creator,
            utf8(b"Test Vaulted Collection"),
            utf8(b"A test collection for CVN-1"),
            utf8(b"https://example.com/collection.json"),
            250,  // 2.5% creator royalty
            250,  // 2.5% vault royalty  
            5000, // 50% of mint goes to vault
            0,    // free mint
            @0x0, // no mint currency
            vector::empty(),
            @0x123
        );
        
        let collection_addr = get_collection_address(
            signer::address_of(creator), 
            b"Test Vaulted Collection"
        );
        
        assert!(vault_core::config_exists(collection_addr), 0);
        
        let (creator_bps, vault_bps, assets, payout) = vault_views::get_vault_config(collection_addr);
        assert!(creator_bps == 250, 1);
        assert!(vault_bps == 250, 2);
        assert!(vector::is_empty(&assets), 3);
        assert!(payout == @0x123, 4);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 9, location = cvn1_vault::collection)]
    fun test_invalid_royalty_bps(creator: &signer) {
        // Should fail: 60% + 50% = 110% > 100%
        collection::init_collection_config(
            creator,
            utf8(b"Test Collection"),
            utf8(b"Description"),
            utf8(b"https://example.com"),
            6000,  // 60%
            5000,  // 50%
            0,     // mint vault %
            0,     // price
            @0x0,  // currency
            vector::empty(),
            @0x123
        );
    }

    #[test(creator = @0x123)]
    fun test_max_royalty_bps(creator: &signer) {
        // 100% total should be allowed
        collection::init_collection_config(
            creator,
            utf8(b"Max Royalty Collection"),
            utf8(b"Description"),
            utf8(b"https://example.com"),
            5000,  // 50%
            5000,  // 50%
            10000, // 100% of mint to vault
            0, @0x0,
            vector::empty(),
            @0x123
        );
        
        let collection_addr = get_collection_address(
            signer::address_of(creator), 
            b"Max Royalty Collection"
        );
        
        let (creator_bps, vault_bps, _, _) = vault_views::get_vault_config(collection_addr);
        assert!(creator_bps == 5000, 0);
        assert!(vault_bps == 5000, 1);
    }

    #[test(creator = @0x123)]
    fun test_collection_with_allowed_assets(creator: &signer) {
        let allowed = vector[@0xA, @0xB, @0xC];
        collection::init_collection_config(
            creator,
            utf8(b"Restricted Assets Collection"),
            utf8(b"Description"),
            utf8(b"https://example.com"),
            250, 250, 0, 0, @0x0,
            allowed,
            @0x123
        );
        
        let collection_addr = get_collection_address(
            signer::address_of(creator), 
            b"Restricted Assets Collection"
        );
        
        let (_, _, assets, _) = vault_views::get_vault_config(collection_addr);
        assert!(vector::length(&assets) == 3, 0);
        assert!(vector::contains(&assets, &@0xA), 1);
    }

    #[test(creator = @0x123)]
    fun test_zero_royalties(creator: &signer) {
        collection::init_collection_config(
            creator,
            utf8(b"Zero Royalty Collection"),
            utf8(b"No royalties"),
            utf8(b"https://example.com"),
            0, 0, 0, 0, @0x0, // all zeros = no royalties, free mint
            vector::empty(),
            @0x123
        );
        
        let collection_addr = get_collection_address(
            signer::address_of(creator), 
            b"Zero Royalty Collection"
        );
        
        let (creator_bps, vault_bps, _, _) = vault_views::get_vault_config(collection_addr);
        assert!(creator_bps == 0, 0);
        assert!(vault_bps == 0, 1);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 9, location = cvn1_vault::collection)]
    fun test_invalid_mint_vault_bps(creator: &signer) {
        // Should fail: mint_vault_bps > 100%
        collection::init_collection_config(
            creator,
            utf8(b"Invalid Mint Vault"),
            utf8(b"Description"),
            utf8(b"https://example.com"),
            250, 250,
            10001, // 100.01% - invalid!
            0, @0x0,
            vector::empty(),
            @0x123
        );
    }

    #[test(creator = @0x123)]
    fun test_full_mint_to_vault(creator: &signer) {
        // 100% of mint fee to vault, 0% to creator
        collection::init_collection_config(
            creator,
            utf8(b"Full Vault Mint"),
            utf8(b"All mint fees go to vault"),
            utf8(b"https://example.com"),
            250, 250,
            10000, // 100% of mint to vault
            1000000, // 1 unit price
            @0xABC, // some FA address
            vector::empty(),
            @0x123
        );
        
        let collection_addr = get_collection_address(
            signer::address_of(creator), 
            b"Full Vault Mint"
        );
        
        // Config stored successfully
        assert!(vault_core::config_exists(collection_addr), 0);
    }
}

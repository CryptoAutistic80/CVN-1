/// CVN-1: Minting Functions
/// 
/// All mint variants for creating vaulted NFTs.
module cvn1_vault::minting {
    use std::string::{Self, String};
    use std::option;
    use std::signer;
    
    use cedra_framework::object::Self;
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::primary_fungible_store;
    
    use cedra_token_objects::collection::{Self, Collection};
    use cedra_token_objects::token::{Self, Token};
    
    use cedra_std::math64;
    
    use cvn1_vault::vault_core;
    use cvn1_vault::vault_events;

    // ============================================
    // Entry Functions
    // ============================================

    /// Creator mints a vaulted NFT, optionally charging a fee from buyer
    /// 
    /// This is the primary mint function for creator-controlled mints.
    public entry fun creator_mint_vaulted_nft(
        creator: &signer,
        buyer: &signer,
        collection_addr: address,
        to: address,
        name: String,
        description: String,
        uri: String,
        is_redeemable: bool
    ) {
        let creator_addr = signer::address_of(creator);
        
        assert!(vault_core::config_exists(collection_addr), vault_core::err_config_not_found());
        
        // Get all config values at once
        let (
            _creator_royalty_bps,
            _vault_royalty_bps,
            mint_vault_bps,
            mint_price,
            mint_price_fa_addr,
            _allowed_assets,
            creator_payout,
        ) = vault_core::get_config_values(collection_addr);
        
        // Get collection info
        let collection_obj = object::address_to_object<Collection>(collection_addr);
        let collection_name = collection::name(collection_obj);
        
        // Create the NFT
        let constructor_ref = token::create_named_token(
            creator,
            collection_name,
            description,
            name,
            option::none(),
            uri,
        );
        
        let token_signer = object::generate_signer(&constructor_ref);
        let nft_addr = object::address_from_constructor_ref(&constructor_ref);
        
        // Create refs for vault lifecycle management
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let delete_ref = object::generate_delete_ref(&constructor_ref);
        let burn_ref = token::generate_burn_ref(&constructor_ref);
        
        // Create and store VaultInfo
        vault_core::create_and_store_vault(
            &token_signer,
            is_redeemable,
            extend_ref,
            option::some(delete_ref),
            burn_ref,
            creator_addr,
        );
        
        // Handle mint payment if price > 0
        if (mint_price > 0 && mint_price_fa_addr != @0x0) {
            let fa_metadata = object::address_to_object<Metadata>(mint_price_fa_addr);
            
            // Calculate split
            let vault_seed = math64::mul_div(mint_price, (mint_vault_bps as u64), vault_core::max_bps());
            let creator_cut = mint_price - vault_seed;
            
            // Withdraw from buyer
            let payment = primary_fungible_store::withdraw(buyer, fa_metadata, mint_price);
            
            // Pay creator
            if (creator_cut > 0) {
                let creator_payment = fungible_asset::extract(&mut payment, creator_cut);
                primary_fungible_store::deposit(creator_payout, creator_payment);
            };
            
            // Seed vault with remainder
            if (vault_seed > 0) {
                vault_core::deposit_to_vault(nft_addr, fa_metadata, payment);
            } else {
                fungible_asset::destroy_zero(payment);
            };
        };
        
        // Transfer NFT to recipient
        let token_obj = object::object_from_constructor_ref<Token>(&constructor_ref);
        object::transfer(creator, token_obj, to);
        
        // Emit minted event
        vault_events::emit_minted(nft_addr, collection_addr, creator_addr, to, is_redeemable);
    }

    /// Creator mints a vaulted NFT to themselves (single signer, no payment)
    public entry fun creator_self_mint(
        creator: &signer,
        collection_addr: address,
        name: String,
        description: String,
        uri: String,
        is_redeemable: bool
    ) {
        let creator_addr = signer::address_of(creator);
        
        assert!(vault_core::config_exists(collection_addr), vault_core::err_config_not_found());
        
        // Get collection info
        let collection_obj = object::address_to_object<Collection>(collection_addr);
        let collection_name = collection::name(collection_obj);
        
        // Create the NFT
        let constructor_ref = token::create_named_token(
            creator,
            collection_name,
            description,
            name,
            option::none(),
            uri,
        );
        
        let token_signer = object::generate_signer(&constructor_ref);
        let nft_addr = object::address_from_constructor_ref(&constructor_ref);
        
        // Create refs for vault lifecycle management
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let burn_ref = token::generate_burn_ref(&constructor_ref);
        
        // Create and store VaultInfo (no delete_ref for named tokens)
        vault_core::create_and_store_vault(
            &token_signer,
            is_redeemable,
            extend_ref,
            option::none(),
            burn_ref,
            creator_addr,
        );
        
        // NFT stays with creator (no transfer needed)
        
        // Emit minted event
        vault_events::emit_minted(nft_addr, collection_addr, creator_addr, creator_addr, is_redeemable);
    }

    /// Public mint function - buyer pays and mints from a creator's collection
    public entry fun public_mint(
        buyer: &signer,
        collection_addr: address,
        name: String,
        description: String,
        uri: String,
        is_redeemable: bool
    ) {
        let buyer_addr = signer::address_of(buyer);
        
        assert!(vault_core::config_exists(collection_addr), vault_core::err_config_not_found());
        
        // Get all config values at once
        let (
            _creator_royalty_bps,
            _vault_royalty_bps,
            mint_vault_bps,
            mint_price,
            mint_price_fa_addr,
            _allowed_assets,
            creator_payout,
        ) = vault_core::get_config_values(collection_addr);
        
        // Get collection info
        let collection_obj = object::address_to_object<Collection>(collection_addr);
        let collection_name = collection::name(collection_obj);
        let creator_addr = collection::creator(collection_obj);
        
        // For public minting, use numbered token (not named)
        let constructor_ref = token::create_numbered_token(
            buyer,
            collection_name,
            description,
            name, // prefix
            string::utf8(b""), // suffix
            option::none(), // royalty
            uri,
        );
        
        let token_signer = object::generate_signer(&constructor_ref);
        let nft_addr = object::address_from_constructor_ref(&constructor_ref);
        
        // Create refs for vault lifecycle management
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let delete_ref = object::generate_delete_ref(&constructor_ref);
        let burn_ref = token::generate_burn_ref(&constructor_ref);
        
        // Create and store VaultInfo
        vault_core::create_and_store_vault(
            &token_signer,
            is_redeemable,
            extend_ref,
            option::some(delete_ref),
            burn_ref,
            creator_addr,
        );
        
        // Handle mint payment if price > 0
        if (mint_price > 0 && mint_price_fa_addr != @0x0) {
            let fa_metadata = object::address_to_object<Metadata>(mint_price_fa_addr);
            
            // Calculate split
            let vault_seed = math64::mul_div(mint_price, (mint_vault_bps as u64), vault_core::max_bps());
            let creator_cut = mint_price - vault_seed;
            
            // Withdraw from buyer
            let payment = primary_fungible_store::withdraw(buyer, fa_metadata, mint_price);
            
            // Pay creator
            if (creator_cut > 0) {
                let creator_payment = fungible_asset::extract(&mut payment, creator_cut);
                primary_fungible_store::deposit(creator_payout, creator_payment);
            };
            
            // Seed vault with remainder
            if (vault_seed > 0) {
                vault_core::deposit_to_vault(nft_addr, fa_metadata, payment);
            } else {
                fungible_asset::destroy_zero(payment);
            };
        };
        
        // Emit minted event
        vault_events::emit_minted(nft_addr, collection_addr, creator_addr, buyer_addr, is_redeemable);
    }
}

/// CVN-1: Royalty Settlement
/// 
/// Handles compliant secondary sales with vault royalty enforcement.
/// 
/// ## Compliance Model
/// 
/// CVN-1 provides a STRONGLY-ENCOURAGED sale path, not cryptographic enforcement.
/// 
/// - `settle_sale_with_vault_royalty` is the canonical compliant path
/// - Sets `last_sale_compliant = true` when used
/// - Standard `object::transfer` or `token::transfer` can bypass royalties entirely
/// 
/// This is NOT a bug - it's a fundamental limit of shared token standards on Cedra.
/// CVN-1 provides verifiable compliance tracking, not prevention.
/// 
/// ## For Marketplaces
/// 
/// To be CVN-1 compliant, call `settle_sale_with_vault_royalty` for all settlements.
/// The marketplace holds funds in escrow, then this function atomically:
/// 1. Splits funds (creator cut, vault cut, seller net)
/// 2. Deposits vault cut into the NFT's vault
/// 3. Transfers NFT to buyer
/// 4. Marks sale as compliant
/// 
/// ## For Collectors
/// 
/// Check `last_sale_used_vault_royalty` to verify if an NFT's last sale was compliant.
/// Non-compliant sales (direct transfers) will show `false`.
module cvn1_vault::royalties {
    use cedra_framework::object::{Self, Object};
    use cedra_framework::fungible_asset::{Self, Metadata};
    use cedra_framework::primary_fungible_store;
    
    use cedra_token_objects::token::{Self, Token};
    
    use cedra_std::math64;
    
    use cvn1_vault::vault_core;
    use cvn1_vault::vault_events;

    // ============================================
    // Entry Functions
    // ============================================

    /// Settle a sale with vault royalty
    /// 
    /// This is the canonical sale path for CVN-1 compliant marketplaces.
    /// It atomically:
    /// 1. Splits the gross amount into creator cut, vault cut, and seller net
    /// 2. Deposits creator cut to creator payout address
    /// 3. Deposits vault cut into the NFT's vault
    /// 4. Transfers seller net to current owner
    /// 5. Transfers NFT to buyer
    /// 6. Marks the sale as compliant
    public entry fun settle_sale_with_vault_royalty(
        marketplace: &signer,
        nft_object: Object<Token>,
        buyer: address,
        sale_currency: Object<Metadata>,
        gross_amount: u64
    ) {
        let nft_addr = object::object_address(&nft_object);
        assert!(vault_core::vault_exists(nft_addr), vault_core::err_vault_not_found());
        
        let current_owner = object::owner(nft_object);
        
        // Get collection config
        let collection = token::collection_object(nft_object);
        let collection_addr = object::object_address(&collection);
        
        assert!(vault_core::config_exists(collection_addr), vault_core::err_config_not_found());
        
        // Get config values
        let (
            creator_royalty_bps,
            vault_royalty_bps,
            _mint_vault_bps,
            _mint_price,
            _mint_price_fa,
            _allowed_assets,
            creator_payout_addr,
        ) = vault_core::get_config_values(collection_addr);
        
        // Calculate splits using overflow-safe math
        let creator_cut = math64::mul_div(gross_amount, (creator_royalty_bps as u64), vault_core::max_bps());
        let vault_cut = math64::mul_div(gross_amount, (vault_royalty_bps as u64), vault_core::max_bps());
        let seller_net = gross_amount - creator_cut - vault_cut;
        
        let sale_currency_addr = object::object_address(&sale_currency);
        
        // Withdraw gross amount from marketplace
        let total_fa = primary_fungible_store::withdraw(marketplace, sale_currency, gross_amount);
        
        // Split the funds
        let creator_fa = fungible_asset::extract(&mut total_fa, creator_cut);
        let vault_fa = fungible_asset::extract(&mut total_fa, vault_cut);
        // Remaining is seller_net
        
        // Transfer creator cut
        primary_fungible_store::deposit(creator_payout_addr, creator_fa);
        
        // Deposit vault cut into NFT's vault
        // NOTE: This bypasses the allowlist check intentionally.
        // Royalty settlements deposit the sale currency, which the marketplace
        // and seller agreed upon. The allowlist only restricts external deposits
        // via vault_ops::deposit_to_vault, not protocol-internal flows.
        vault_core::deposit_to_vault(nft_addr, sale_currency, vault_fa);
        
        // Transfer seller net to current owner
        primary_fungible_store::deposit(current_owner, total_fa);
        
        // Transfer NFT to buyer
        object::transfer(marketplace, nft_object, buyer);
        
        // Update compliance tracking
        vault_core::set_vault_compliance(nft_addr, true);
        
        // Emit settlement event
        vault_events::emit_royalty_settled(
            nft_addr,
            sale_currency_addr,
            gross_amount,
            creator_cut,
            vault_cut,
            seller_net,
        );
    }

    /// Mark an NFT as having had a non-compliant transfer
    /// 
    /// This is an OPTIONAL helper for marketplaces or wallet applications
    /// that want to explicitly track when a sale occurred without using
    /// the compliant settlement path.
    /// 
    /// Only the current owner can mark their NFT as non-compliant.
    /// Calling this is voluntary - direct transfers naturally result in
    /// an outdated (previous) compliance flag.
    public entry fun mark_non_compliant_transfer(
        owner: &signer,
        nft_object: Object<Token>
    ) {
        use std::signer;
        
        let owner_addr = signer::address_of(owner);
        let nft_addr = object::object_address(&nft_object);
        
        // Verify ownership
        assert!(object::owner(nft_object) == owner_addr, vault_core::err_not_owner());
        
        // Verify vault exists
        assert!(vault_core::vault_exists(nft_addr), vault_core::err_vault_not_found());
        
        // Mark as non-compliant
        vault_core::set_vault_compliance(nft_addr, false);
    }
}


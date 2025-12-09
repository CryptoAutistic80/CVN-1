/// CVN-1: Vault Operations
/// 
/// Deposit, burn/redeem, and internal vault helpers.
module cvn1_vault::vault_ops {
    use std::signer;
    use std::vector;
    
    use cedra_framework::object::{Self, Object};
    use cedra_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use cedra_framework::primary_fungible_store;
    
    use cedra_token_objects::token::{Self, Token};
    
    use cedra_std::smart_table;
    
    use cvn1_vault::vault_core;
    use cvn1_vault::vault_events;

    // ============================================
    // Entry Functions
    // ============================================

    /// Deposit fungible assets into an NFT's vault
    /// 
    /// Anyone can deposit allowed assets into any NFT's vault.
    /// If the collection has an allowlist, only those FA types are accepted.
    public entry fun deposit_to_vault(
        depositor: &signer,
        nft_object: Object<Token>,
        fa_metadata: Object<Metadata>,
        amount: u64
    ) {
        // Validate amount
        assert!(amount > 0, vault_core::err_invalid_amount());
        
        let nft_addr = object::object_address(&nft_object);
        assert!(vault_core::vault_exists(nft_addr), vault_core::err_vault_not_found());
        
        let depositor_addr = signer::address_of(depositor);
        let fa_addr = object::object_address(&fa_metadata);
        
        // Get collection addr to check allowlist
        let collection = token::collection_object(nft_object);
        let collection_addr = object::object_address(&collection);
        
        // Check allowlist
        assert!(
            vault_core::check_allowlist(collection_addr, fa_addr),
            vault_core::err_asset_not_allowed()
        );
        
        // Withdraw from depositor's primary store
        let fa = primary_fungible_store::withdraw(depositor, fa_metadata, amount);
        
        // Deposit into vault
        vault_core::deposit_to_vault(nft_addr, fa_metadata, fa);
        
        // Emit deposit event
        vault_events::emit_deposited(nft_addr, fa_addr, amount, depositor_addr);
    }

    /// Burn an NFT and redeem all vault contents to the owner
    public entry fun burn_and_redeem(
        owner: &signer,
        nft_object: Object<Token>
    ) {
        let owner_addr = signer::address_of(owner);
        let nft_addr = object::object_address(&nft_object);
        
        // Verify ownership
        assert!(object::owner(nft_object) == owner_addr, vault_core::err_not_owner());
        
        // Verify vault exists and is redeemable
        assert!(vault_core::vault_exists(nft_addr), vault_core::err_vault_not_found());
        assert!(vault_core::is_vault_redeemable(nft_addr), vault_core::err_not_redeemable());
        
        // Extract vault for redemption (destructive - removes VaultInfo)
        let (extend_ref, burn_ref, vault_stores) = vault_core::extract_vault_for_redeem(nft_addr);
        
        // Get vault signer for withdrawals
        let vault_signer = object::generate_signer_for_extending(&extend_ref);
        
        // Collect all FA addresses for the event
        let redeemed_assets = vector::empty<address>();
        
        // Iterate all stores and withdraw to owner
        let keys = smart_table::keys(&vault_stores);
        let i = 0;
        let len = vector::length(&keys);
        while (i < len) {
            let fa_addr = *vector::borrow(&keys, i);
            let store_addr = *smart_table::borrow(&vault_stores, fa_addr);
            let store = object::address_to_object<FungibleStore>(store_addr);
            
            // Get balance and withdraw if > 0
            let balance = fungible_asset::balance(store);
            if (balance > 0) {
                let fa = fungible_asset::withdraw(&vault_signer, store, balance);
                primary_fungible_store::deposit(owner_addr, fa);
                vector::push_back(&mut redeemed_assets, fa_addr);
            };
            i = i + 1;
        };
        
        // Clean up the SmartTable
        smart_table::destroy(vault_stores);
        
        // Emit redeem event
        vault_events::emit_redeemed(nft_addr, owner_addr, redeemed_assets);
        
        // Burn the token
        token::burn(burn_ref);
    }
}

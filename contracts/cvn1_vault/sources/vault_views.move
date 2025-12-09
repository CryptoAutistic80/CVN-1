/// CVN-1: View Functions
/// 
/// All read-only view functions for querying vault and collection state.
module cvn1_vault::vault_views {
    use cvn1_vault::vault_core::{Self, VaultBalance};

    // ============================================
    // View Functions
    // ============================================

    #[view]
    /// Get all vault balances for an NFT
    /// Returns vector of VaultBalance structs with fa_metadata_address and balance
    public fun get_vault_balances(nft_addr: address): vector<VaultBalance> {
        vault_core::get_vault_balances(nft_addr)
    }

    #[view]
    /// Get collection configuration
    /// Returns (creator_royalty_bps, vault_royalty_bps, allowed_assets, creator_payout_addr)
    public fun get_vault_config(collection_addr: address): (u16, u16, vector<address>, address) {
        assert!(vault_core::config_exists(collection_addr), vault_core::err_config_not_found());
        vault_core::get_config_for_view(collection_addr)
    }

    #[view]
    /// Check if a vault exists for an NFT
    public fun vault_exists(nft_addr: address): bool {
        vault_core::vault_exists(nft_addr)
    }

    #[view]
    /// Check if last sale used vault royalty (compliance tracking)
    public fun last_sale_used_vault_royalty(nft_addr: address): bool {
        if (!vault_core::vault_exists(nft_addr)) {
            return false
        };
        vault_core::get_vault_compliance(nft_addr)
    }

    #[view]
    /// Get vault info details
    /// Returns (is_redeemable, creator_addr, last_sale_compliant)
    public fun get_vault_info(nft_addr: address): (bool, address, bool) {
        assert!(vault_core::vault_exists(nft_addr), vault_core::err_vault_not_found());
        vault_core::get_vault_info_for_view(nft_addr)
    }
}

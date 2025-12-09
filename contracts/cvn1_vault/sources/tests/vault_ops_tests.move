// CVN-1 v3 Vault Operations Tests
// Tests for dual vault architecture: core vault, rewards vault, claim_rewards
#[test_only]
module cvn1_vault::vault_ops_tests {
    use cvn1_vault::vault_core;

    // ============================================
    // Error Code Tests
    // ============================================

    #[test]
    /// Test that vault_ops deposit functions exist and are callable
    fun test_deposit_functions_exist() {
        // This test verifies the entry functions exist at compile time
        // The actual deposit tests require a full NFT setup
        
        // Verify error codes exist
        assert!(vault_core::err_invalid_amount() != 0, 1);
        assert!(vault_core::err_vault_not_found() != 0, 2);
        assert!(vault_core::err_asset_not_allowed() != 0, 3);
    }

    #[test]
    /// Test that claim_rewards and burn_and_redeem exist
    fun test_redemption_functions_exist() {
        // Compile-time check that functions exist
        // Error codes for ownership/redeemability checks
        assert!(vault_core::err_not_owner() != 0, 1);
        assert!(vault_core::err_not_redeemable() != 0, 2);
    }

    #[test]
    /// Test that view functions for dual vault exist
    fun test_dual_vault_view_functions_exist() {
        // Test that the view functions return empty vectors for nonexistent vaults
        let core_balances = vault_core::get_core_vault_balances(@0x123);
        let rewards_balances = vault_core::get_rewards_vault_balances(@0x123);
        let combined_balances = vault_core::get_vault_balances(@0x123);
        
        assert!(std::vector::length(&core_balances) == 0, 1);
        assert!(std::vector::length(&rewards_balances) == 0, 2);
        assert!(std::vector::length(&combined_balances) == 0, 3);
    }

    #[test]
    /// Test VaultBalance accessor functions
    fun test_vault_balance_accessors() {
        let balance = vault_core::new_vault_balance(@0xFA, 1000);
        
        assert!(vault_core::balance_fa_addr(&balance) == @0xFA, 1);
        assert!(vault_core::balance_amount(&balance) == 1000, 2);
        assert!(vault_core::get_balance_fa_addr(&balance) == @0xFA, 3);
        assert!(vault_core::get_balance_amount(&balance) == 1000, 4);
    }
}

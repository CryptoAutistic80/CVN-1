// CVN-1: Vault Core Tests
// Test module for vault_core utility functions.
#[test_only]
module cvn1_vault::vault_core_tests {
    use std::vector;
    use cvn1_vault::vault_core;

    // ============================================
    // Error Code Tests
    // ============================================

    #[test]
    fun test_error_codes_are_distinct() {
        // Verify all error codes are unique (including v4 max supply)
        let codes = vector[
            vault_core::err_not_creator(),
            vault_core::err_not_owner(),
            vault_core::err_not_redeemable(),
            vault_core::err_invalid_amount(),
            vault_core::err_asset_not_allowed(),
            vault_core::err_insufficient_balance(),
            vault_core::err_collection_already_exists(),
            vault_core::err_vault_not_found(),
            vault_core::err_invalid_royalty_bps(),
            vault_core::err_config_not_found(),
            vault_core::err_max_supply_reached(),  // v4
        ];
        
        let i = 0;
        let len = vector::length(&codes);
        while (i < len) {
            let j = i + 1;
            while (j < len) {
                assert!(
                    *vector::borrow(&codes, i) != *vector::borrow(&codes, j),
                    i
                );
                j = j + 1;
            };
            i = i + 1;
        };
    }

    #[test]
    fun test_max_bps() {
        assert!(vault_core::max_bps() == 10000, 0);
    }

    // ============================================
    // Existence Check Tests
    // ============================================

    #[test]
    fun test_config_exists_returns_false_for_missing() {
        assert!(!vault_core::config_exists(@0xDEAD), 0);
    }

    #[test]
    fun test_vault_exists_returns_false_for_missing() {
        assert!(!vault_core::vault_exists(@0xDEAD), 0);
    }
}

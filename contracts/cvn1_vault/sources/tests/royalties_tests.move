// CVN-1: Royalties Tests
// Test module for compliance tracking functionality.
#[test_only]
module cvn1_vault::royalties_tests {
    use cvn1_vault::vault_core;

    // ============================================
    // Compliance Error Code Tests
    // ============================================

    // Verify error codes are accessible for compliance functions
    #[test]
    fun test_compliance_error_codes_exist() {
        // Verify error codes are correctly defined
        assert!(vault_core::err_not_owner() == 2, 0);
        assert!(vault_core::err_vault_not_found() == 8, 1);
    }
}


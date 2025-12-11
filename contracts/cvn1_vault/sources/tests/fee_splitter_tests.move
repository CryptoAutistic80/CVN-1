// CVN-1: Fee Splitter Tests
// Test module for fee splitter functionality.
#[test_only]
module cvn1_vault::fee_splitter_tests {
    use std::vector;
    use std::signer;
    
    use cvn1_vault::fee_splitter;

    // ============================================
    // create_splitter tests
    // ============================================

    #[test(creator = @0x123)]
    fun test_create_splitter_basic(creator: &signer) {
        let addresses = vector[@0xA, @0xB];
        let shares = vector[7000u64, 3000u64];
        
        let splitter_addr = fee_splitter::create_splitter(creator, addresses, shares);
        
        // Splitter should exist
        assert!(fee_splitter::splitter_exists(splitter_addr), 0);
        
        // Owner should be creator
        assert!(fee_splitter::get_owner(splitter_addr) == signer::address_of(creator), 1);
        
        // Should have 2 recipients
        assert!(fee_splitter::get_recipient_count(splitter_addr) == 2, 2);
    }

    #[test(creator = @0x123)]
    fun test_create_splitter_single_recipient(creator: &signer) {
        let addresses = vector[@0xA];
        let shares = vector[10000u64];
        
        let splitter_addr = fee_splitter::create_splitter(creator, addresses, shares);
        
        assert!(fee_splitter::splitter_exists(splitter_addr), 0);
        assert!(fee_splitter::get_recipient_count(splitter_addr) == 1, 1);
    }

    #[test(creator = @0x123)]
    fun test_create_splitter_many_recipients(creator: &signer) {
        let addresses = vector[@0xA, @0xB, @0xC, @0xD, @0xE];
        let shares = vector[2000u64, 2000u64, 2000u64, 2000u64, 2000u64];
        
        let splitter_addr = fee_splitter::create_splitter(creator, addresses, shares);
        
        assert!(fee_splitter::get_recipient_count(splitter_addr) == 5, 0);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 1, location = cvn1_vault::fee_splitter)]
    fun test_create_splitter_mismatched_lengths(creator: &signer) {
        // Should fail: addresses.length != shares.length
        let addresses = vector[@0xA, @0xB];
        let shares = vector[7000u64];  // Only 1 share for 2 addresses
        
        fee_splitter::create_splitter(creator, addresses, shares);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 2, location = cvn1_vault::fee_splitter)]
    fun test_create_splitter_zero_total_shares(creator: &signer) {
        // Should fail: total shares = 0
        let addresses = vector[@0xA, @0xB];
        let shares = vector[0u64, 0u64];
        
        fee_splitter::create_splitter(creator, addresses, shares);
    }

    #[test(creator = @0x123)]
    #[expected_failure(abort_code = 2, location = cvn1_vault::fee_splitter)]
    fun test_create_splitter_empty_vectors(creator: &signer) {
        // Should fail: empty vectors result in zero total shares
        let addresses = vector::empty<address>();
        let shares = vector::empty<u64>();
        
        fee_splitter::create_splitter(creator, addresses, shares);
    }

    // ============================================
    // get_recipient_info tests
    // ============================================

    #[test(creator = @0x123)]
    fun test_get_recipient_info(creator: &signer) {
        let addresses = vector[@0xAAA, @0xBBB];
        let shares = vector[7000u64, 3000u64];
        
        let splitter_addr = fee_splitter::create_splitter(creator, addresses, shares);
        
        // Check first recipient
        let (addr0, share0, total0) = fee_splitter::get_recipient_info(splitter_addr, 0);
        assert!(addr0 == @0xAAA, 0);
        assert!(share0 == 7000, 1);
        assert!(total0 == 10000, 2);
        
        // Check second recipient
        let (addr1, share1, total1) = fee_splitter::get_recipient_info(splitter_addr, 1);
        assert!(addr1 == @0xBBB, 3);
        assert!(share1 == 3000, 4);
        assert!(total1 == 10000, 5);
    }

    #[test(creator = @0x123)]
    fun test_recipient_info_unequal_shares(creator: &signer) {
        // Test non-standard share distribution
        let addresses = vector[@0xA, @0xB, @0xC];
        let shares = vector[5u64, 3u64, 2u64];  // Total = 10
        
        let splitter_addr = fee_splitter::create_splitter(creator, addresses, shares);
        
        let (_, _, total) = fee_splitter::get_recipient_info(splitter_addr, 0);
        assert!(total == 10, 0);
    }

    // ============================================
    // splitter_exists tests
    // ============================================

    #[test(_anyone = @0x123)]
    fun test_splitter_exists_false_for_nonexistent(_anyone: &signer) {
        assert!(!fee_splitter::splitter_exists(@0xDEAD), 0);
    }

    // ============================================
    // update_recipients tests
    // ============================================

    #[test(owner = @0x123)]
    fun test_update_recipients_by_owner(owner: &signer) {
        let addresses = vector[@0xA, @0xB];
        let shares = vector[5000u64, 5000u64];
        
        let splitter_addr = fee_splitter::create_splitter(owner, addresses, shares);
        
        // Update to new recipients
        let new_addresses = vector[@0xC, @0xD, @0xE];
        let new_shares = vector[3000u64, 3000u64, 4000u64];
        
        fee_splitter::update_recipients(owner, splitter_addr, new_addresses, new_shares);
        
        // Verify update
        assert!(fee_splitter::get_recipient_count(splitter_addr) == 3, 0);
        
        let (addr0, share0, total) = fee_splitter::get_recipient_info(splitter_addr, 0);
        assert!(addr0 == @0xC, 1);
        assert!(share0 == 3000, 2);
        assert!(total == 10000, 3);
    }

    #[test(owner = @0x123, attacker = @0x456)]
    #[expected_failure(abort_code = 5, location = cvn1_vault::fee_splitter)]
    fun test_update_recipients_not_owner(owner: &signer, attacker: &signer) {
        let addresses = vector[@0xA, @0xB];
        let shares = vector[5000u64, 5000u64];
        
        let splitter_addr = fee_splitter::create_splitter(owner, addresses, shares);
        
        // Attacker tries to update - should fail
        fee_splitter::update_recipients(
            attacker, 
            splitter_addr, 
            vector[@0xDEAD], 
            vector[10000u64]
        );
    }

    #[test(owner = @0x123)]
    #[expected_failure(abort_code = 3, location = cvn1_vault::fee_splitter)]
    fun test_update_recipients_nonexistent_splitter(owner: &signer) {
        // Try to update a splitter that doesn't exist
        fee_splitter::update_recipients(
            owner, 
            @0xDEADBEEF, 
            vector[@0xA], 
            vector[10000u64]
        );
    }

    // ============================================
    // Edge cases
    // ============================================

    #[test(creator = @0x123)]
    fun test_create_multiple_splitters(creator: &signer) {
        // Same creator can create multiple splitters
        let splitter1 = fee_splitter::create_splitter(
            creator, 
            vector[@0xA], 
            vector[10000u64]
        );
        
        let splitter2 = fee_splitter::create_splitter(
            creator, 
            vector[@0xB, @0xC], 
            vector[5000u64, 5000u64]
        );
        
        // Both should exist and be different
        assert!(fee_splitter::splitter_exists(splitter1), 0);
        assert!(fee_splitter::splitter_exists(splitter2), 1);
        assert!(splitter1 != splitter2, 2);
    }

    #[test(creator = @0x123)]
    fun test_large_shares(creator: &signer) {
        // Test with large share values
        let addresses = vector[@0xA, @0xB];
        let shares = vector[1000000000u64, 1000000000u64];  // 2 billion total
        
        let splitter_addr = fee_splitter::create_splitter(creator, addresses, shares);
        
        let (_, share, total) = fee_splitter::get_recipient_info(splitter_addr, 0);
        assert!(share == 1000000000, 0);
        assert!(total == 2000000000, 1);
    }
}

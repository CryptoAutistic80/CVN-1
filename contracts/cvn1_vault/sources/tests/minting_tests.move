// CVN-1: Minting Tests
// Test module for minting functions and helper utilities.
#[test_only]
module cvn1_vault::minting_tests {
    use std::string::{Self, String};
    use std::vector;

    // ============================================
    // u64_to_string Helper Tests
    // ============================================

    /// Local copy of u64_to_string for testing (since it's private in minting module)
    fun u64_to_string(value: u64): String {
        if (value == 0) {
            return string::utf8(b"0")
        };
        
        let buffer = vector::empty<u8>();
        let n = value;
        while (n > 0) {
            let digit = ((n % 10) as u8) + 48;
            vector::push_back(&mut buffer, digit);
            n = n / 10;
        };
        
        vector::reverse(&mut buffer);
        string::utf8(buffer)
    }

    #[test]
    fun test_u64_to_string_zero() {
        assert!(u64_to_string(0) == string::utf8(b"0"), 0);
    }

    #[test]
    fun test_u64_to_string_single_digit() {
        assert!(u64_to_string(1) == string::utf8(b"1"), 0);
        assert!(u64_to_string(5) == string::utf8(b"5"), 1);
        assert!(u64_to_string(9) == string::utf8(b"9"), 2);
    }

    #[test]
    fun test_u64_to_string_double_digit() {
        assert!(u64_to_string(10) == string::utf8(b"10"), 0);
        assert!(u64_to_string(42) == string::utf8(b"42"), 1);
        assert!(u64_to_string(99) == string::utf8(b"99"), 2);
    }

    #[test]
    fun test_u64_to_string_larger_numbers() {
        assert!(u64_to_string(100) == string::utf8(b"100"), 0);
        assert!(u64_to_string(1000) == string::utf8(b"1000"), 1);
        assert!(u64_to_string(12345) == string::utf8(b"12345"), 2);
        assert!(u64_to_string(1000000) == string::utf8(b"1000000"), 3);
    }

    #[test]
    fun test_u64_to_string_max_reasonable() {
        // Test a reasonable max supply value
        assert!(u64_to_string(999999999) == string::utf8(b"999999999"), 0);
    }

    // ============================================
    // Token Numbering Format Tests  
    // ============================================

    #[test]
    fun test_token_name_format() {
        // Verify the name + "#" + number format produces expected result
        let base_name = string::utf8(b"Cool NFT ");
        let token_number = 1u64;
        
        let token_name = base_name;
        string::append(&mut token_name, string::utf8(b"#"));
        string::append(&mut token_name, u64_to_string(token_number));
        
        assert!(token_name == string::utf8(b"Cool NFT #1"), 0);
    }

    #[test]
    fun test_token_name_format_larger_numbers() {
        let base_name = string::utf8(b"NFT ");
        
        // Test #10
        let token_name = base_name;
        string::append(&mut token_name, string::utf8(b"#"));
        string::append(&mut token_name, u64_to_string(10));
        assert!(token_name == string::utf8(b"NFT #10"), 0);
        
        // Test #100
        let token_name2 = string::utf8(b"NFT ");
        string::append(&mut token_name2, string::utf8(b"#"));
        string::append(&mut token_name2, u64_to_string(100));
        assert!(token_name2 == string::utf8(b"NFT #100"), 1);
    }
}

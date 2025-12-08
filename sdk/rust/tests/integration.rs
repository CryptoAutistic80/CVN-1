//! Tests for cvn1-sdk

#[cfg(test)]
mod utils_tests {
    use cvn1_sdk::{bps_to_percent, percent_to_bps, format_address, CVN1_TESTNET_ADDRESS};

    #[test]
    fn test_bps_to_percent() {
        assert_eq!(bps_to_percent(250), 2.5);
        assert_eq!(bps_to_percent(10000), 100.0);
        assert_eq!(bps_to_percent(0), 0.0);
    }

    #[test]
    fn test_percent_to_bps() {
        assert_eq!(percent_to_bps(2.5), 250);
        assert_eq!(percent_to_bps(100.0), 10000);
        assert_eq!(percent_to_bps(0.0), 0);
    }

    #[test]
    fn test_format_address() {
        let addr = "0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c";
        assert_eq!(format_address(addr), "0x87e8...cd2c");
        assert_eq!(format_address("0x1234"), "0x1234");
    }

    #[test]
    fn test_testnet_address() {
        assert_eq!(
            CVN1_TESTNET_ADDRESS, 
            "0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c"
        );
    }
}

#[cfg(test)]
mod types_tests {
    use cvn1_sdk::{VaultConfig, VaultBalance, CollectionConfig};

    #[test]
    fn test_vault_config_creation() {
        let config = VaultConfig {
            creator_royalty_bps: 250,
            vault_royalty_bps: 250,
            allowed_assets: vec!["0xCEDRA".to_string()],
            creator_payout_addr: "0xCREATOR".to_string(),
        };
        
        assert_eq!(config.creator_royalty_bps, 250);
        assert_eq!(config.vault_royalty_bps, 250);
    }

    #[test]
    fn test_vault_balance_creation() {
        let balance = VaultBalance {
            fa_metadata_addr: "0xCEDRA".to_string(),
            balance: 1_000_000,
        };
        
        assert_eq!(balance.balance, 1_000_000);
    }

    #[test]
    fn test_collection_config_creation() {
        let config = CollectionConfig {
            name: "Test Collection".to_string(),
            description: "A test collection".to_string(),
            uri: "https://test.com".to_string(),
            creator_royalty_bps: 250,
            vault_royalty_bps: 250,
            mint_vault_bps: 5000,
            mint_price: 100_000_000,
            mint_price_fa: "0xCEDRA".to_string(),
            allowed_assets: vec![],
            creator_payout_addr: "0xCREATOR".to_string(),
        };
        
        assert_eq!(config.mint_vault_bps, 5000);
        assert_eq!(config.mint_price, 100_000_000);
    }
}

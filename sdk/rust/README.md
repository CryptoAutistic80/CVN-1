# cvn1-sdk (Rust)

Rust SDK for the CVN-1 Vaulted NFT Standard on Cedra.

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
cvn1-sdk = { git = "https://github.com/CryptoAutistic80/CVN-1", branch = "main" }
```

## Quick Start

```rust
use cvn1_sdk::{CVN1Client, CVN1_TESTNET_ADDRESS};
use cedra_sdk::rest_client::Client;
use url::Url;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize clients
    let client = Client::new(Url::parse("https://testnet.cedra.dev")?);
    let cvn1 = CVN1Client::new(client, CVN1_TESTNET_ADDRESS);
    
    // Check if a vault exists
    let exists = cvn1.vault_exists("0xNFT_ADDRESS").await?;
    println!("Vault exists: {}", exists);
    
    // Get vault config
    let config = cvn1.get_vault_config("0xCREATOR_ADDRESS").await?;
    println!("Creator royalty: {}%", cvn1_sdk::bps_to_percent(config.creator_royalty_bps));
    
    Ok(())
}
```

## API Reference

### View Functions (gas-free)

| Method | Description |
|--------|-------------|
| `vault_exists(nft_addr)` | Check if vault exists |
| `get_vault_balances(nft_addr)` | Get all FA balances |
| `get_vault_config(creator_addr)` | Get collection config |
| `get_vault_info(nft_addr)` | Get vault details |
| `last_sale_used_vault_royalty(nft_addr)` | Check compliance |

### Entry Functions

| Method | Description |
|--------|-------------|
| `init_collection_config(signer, config)` | Create collection |
| `deposit_to_vault(depositor, nft, fa, amount)` | Deposit FA |
| `burn_and_redeem(owner, nft)` | Burn and claim |

## Types

```rust
pub struct VaultConfig {
    pub creator_royalty_bps: u16,
    pub vault_royalty_bps: u16,
    pub allowed_assets: Vec<String>,
    pub creator_payout_addr: String,
}

pub struct VaultBalance {
    pub fa_metadata_addr: String,
    pub balance: u64,
}

pub struct CollectionConfig {
    pub name: String,
    pub description: String,
    pub uri: String,
    pub creator_royalty_bps: u16,
    pub vault_royalty_bps: u16,
    pub mint_vault_bps: u16,
    pub mint_price: u64,
    pub mint_price_fa: String,
    pub allowed_assets: Vec<String>,
    pub creator_payout_addr: String,
}
```

## Utilities

```rust
use cvn1_sdk::{bps_to_percent, percent_to_bps, format_address};

bps_to_percent(250);     // 2.5
percent_to_bps(2.5);     // 250
format_address("0x1234567890abcdef"); // "0x1234...cdef"
```

## License

Proprietary - © Singularity Shift Ltd

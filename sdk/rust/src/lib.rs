//! CVN-1 Rust SDK
//!
//! Type-safe Rust client for the Cedra Vaulted NFT Standard
//!
//! # Example
//! ```rust,no_run
//! use cvn1_sdk::{CVN1Client, CVN1_TESTNET_ADDRESS};
//! use cedra_sdk::rest_client::Client;
//! use url::Url;
//!
//! #[tokio::main]
//! async fn main() -> anyhow::Result<()> {
//!     let client = Client::new(Url::parse("https://testnet.cedra.dev")?);
//!     let cvn1 = CVN1Client::new(client, CVN1_TESTNET_ADDRESS);
//!     
//!     // Check vault existence
//!     let exists = cvn1.vault_exists("0xNFT_ADDRESS").await?;
//!     
//!     // Get vault config
//!     let config = cvn1.get_vault_config("0xCREATOR").await?;
//!     println!("Creator royalty: {}%", config.creator_royalty_bps as f64 / 100.0);
//!     
//!     Ok(())
//! }
//! ```

pub mod client;
pub mod types;
pub mod utils;

// Re-exports
pub use client::CVN1Client;
pub use types::*;
pub use utils::{bps_to_percent, percent_to_bps, format_address, CVN1_TESTNET_ADDRESS};

//! CVN-1 Rust SDK Types
//! Type definitions for Cedra Vaulted NFT Standard

use serde::{Deserialize, Serialize};

/// Collection configuration stored on-chain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultConfig {
    /// Creator royalty in basis points (10000 = 100%)
    pub creator_royalty_bps: u16,
    /// Vault royalty in basis points (from secondary sales)
    pub vault_royalty_bps: u16,
    /// Allowed FA types (empty = any allowed)
    pub allowed_assets: Vec<String>,
    /// Address to receive creator payments
    pub creator_payout_addr: String,
}

/// Parameters for initializing a new collection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionConfig {
    /// Collection name
    pub name: String,
    /// Collection description
    pub description: String,
    /// Collection metadata URI
    pub uri: String,
    /// Creator royalty in basis points (0-10000)
    pub creator_royalty_bps: u16,
    /// Vault royalty in basis points (0-10000)
    pub vault_royalty_bps: u16,
    /// Percentage of mint fee to vault (0-10000)
    pub mint_vault_bps: u16,
    /// Mint price in smallest FA units (0 = free)
    pub mint_price: u64,
    /// FA metadata address for mint payments
    pub mint_price_fa: String,
    /// Allowed FA types for deposits
    pub allowed_assets: Vec<String>,
    /// Address to receive creator payments
    pub creator_payout_addr: String,
}

/// Parameters for minting a new vaulted NFT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MintParams {
    /// Recipient address
    pub to: String,
    /// Token name
    pub name: String,
    /// Token description
    pub description: String,
    /// Token metadata URI
    pub uri: String,
    /// Whether the vault can be burned and redeemed
    pub is_redeemable: bool,
}

/// Balance of a single FA type in a vault
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultBalance {
    /// FA metadata address
    pub fa_metadata_addr: String,
    /// Balance in smallest units
    pub balance: u64,
}

/// Vault info returned by get_vault_info view
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultInfo {
    /// Whether vault can be redeemed
    pub is_redeemable: bool,
    /// Creator address
    pub creator_addr: String,
    /// Whether last sale used vault royalty
    pub last_sale_compliant: bool,
}

/// Transaction result
#[derive(Debug, Clone)]
pub struct TxResult {
    /// Transaction hash
    pub hash: String,
    /// Whether transaction succeeded
    pub success: bool,
    /// Gas used
    pub gas_used: u64,
}

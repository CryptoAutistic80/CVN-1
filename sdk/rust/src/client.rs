//! CVN-1 Rust SDK Client
//! 
//! Main client for interacting with the Cedra Vaulted NFT Standard
//!
//! # Example
//! ```rust,no_run
//! use cvn1_sdk::{CVN1Client, CVN1_TESTNET_ADDRESS};
//!
//! #[tokio::main]
//! async fn main() -> anyhow::Result<()> {
//!     let cvn1 = CVN1Client::new("https://testnet.cedra.dev", CVN1_TESTNET_ADDRESS);
//!     
//!     let exists = cvn1.vault_exists("0xNFT_ADDRESS").await?;
//!     println!("Vault exists: {}", exists);
//!     Ok(())
//! }
//! ```

use anyhow::{Context, Result};
use cedra_sdk::types::LocalAccount;
use serde_json::Value;

use crate::types::*;

/// CVN1Client - Main client for CVN-1 contract interactions
pub struct CVN1Client {
    base_url: String,
    module_address: String,
    module_name: String,
    http_client: reqwest::Client,
}

impl CVN1Client {
    /// Create a new CVN1Client
    pub fn new(base_url: &str, module_address: &str) -> Self {
        Self {
            base_url: base_url.to_string(),
            module_address: module_address.to_string(),
            module_name: "vaulted_collection".to_string(),
            http_client: reqwest::Client::new(),
        }
    }

    // ========================================
    // VIEW FUNCTIONS (gas-free)
    // ========================================

    /// Check if a vault exists for an NFT
    pub async fn vault_exists(&self, nft_addr: &str) -> Result<bool> {
        let result = self.view_function("vault_exists", vec![nft_addr.to_string()]).await?;
        result[0].as_bool().context("Invalid vault_exists response")
    }

    /// Get all FA balances in a vault
    pub async fn get_vault_balances(&self, nft_addr: &str) -> Result<Vec<VaultBalance>> {
        let result = self.view_function("get_vault_balances", vec![nft_addr.to_string()]).await?;
        
        let balances = result[0].as_array().context("Invalid get_vault_balances response")?;
        balances
            .iter()
            .map(|b| {
                Ok(VaultBalance {
                    fa_metadata_addr: b["fa_metadata_addr"].as_str().unwrap_or_default().to_string(),
                    balance: b["balance"].as_u64().unwrap_or(0),
                })
            })
            .collect()
    }

    /// Get collection configuration
    pub async fn get_vault_config(&self, creator_addr: &str) -> Result<VaultConfig> {
        let result = self.view_function("get_vault_config", vec![creator_addr.to_string()]).await?;
        
        Ok(VaultConfig {
            creator_royalty_bps: result[0].as_u64().unwrap_or(0) as u16,
            vault_royalty_bps: result[1].as_u64().unwrap_or(0) as u16,
            allowed_assets: result[2]
                .as_array()
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default(),
            creator_payout_addr: result[3].as_str().unwrap_or_default().to_string(),
        })
    }

    /// Get vault info for an NFT
    pub async fn get_vault_info(&self, nft_addr: &str) -> Result<VaultInfo> {
        let result = self.view_function("get_vault_info", vec![nft_addr.to_string()]).await?;
        
        Ok(VaultInfo {
            is_redeemable: result[0].as_bool().unwrap_or(false),
            creator_addr: result[1].as_str().unwrap_or_default().to_string(),
            last_sale_compliant: result[2].as_bool().unwrap_or(false),
        })
    }

    /// Check if last sale used vault royalty
    pub async fn last_sale_used_vault_royalty(&self, nft_addr: &str) -> Result<bool> {
        let result = self.view_function("last_sale_used_vault_royalty", vec![nft_addr.to_string()]).await?;
        result[0].as_bool().context("Invalid last_sale_used_vault_royalty response")
    }

    // ========================================
    // ENTRY FUNCTIONS
    // ========================================

    /// Initialize a new vaulted NFT collection
    pub async fn init_collection_config(
        &self,
        signer: &mut LocalAccount,
        config: &CollectionConfig,
    ) -> Result<TxResult> {
        let args = vec![
            config.name.clone(),
            config.description.clone(),
            config.uri.clone(),
            config.creator_royalty_bps.to_string(),
            config.vault_royalty_bps.to_string(),
            config.mint_vault_bps.to_string(),
            config.mint_price.to_string(),
            config.mint_price_fa.clone(),
            serde_json::to_string(&config.allowed_assets)?,
            config.creator_payout_addr.clone(),
        ];
        
        self.submit_transaction(signer, "init_collection_config", args).await
    }

    /// Deposit fungible assets into a vault
    pub async fn deposit_to_vault(
        &self,
        depositor: &mut LocalAccount,
        nft_object: &str,
        fa_metadata: &str,
        amount: u64,
    ) -> Result<TxResult> {
        let args = vec![
            nft_object.to_string(),
            fa_metadata.to_string(),
            amount.to_string(),
        ];
        
        self.submit_transaction(depositor, "deposit_to_vault", args).await
    }

    /// Burn an NFT and redeem all vault contents
    pub async fn burn_and_redeem(
        &self,
        owner: &mut LocalAccount,
        nft_object: &str,
    ) -> Result<TxResult> {
        let args = vec![nft_object.to_string()];
        self.submit_transaction(owner, "burn_and_redeem", args).await
    }

    // ========================================
    // PRIVATE HELPERS
    // ========================================

    async fn view_function(&self, function: &str, args: Vec<String>) -> Result<Vec<Value>> {
        let function_id = format!("{}::{}::{}", self.module_address, self.module_name, function);
        
        let body = serde_json::json!({
            "function": function_id,
            "type_arguments": [],
            "arguments": args
        });

        let url = format!("{}/v1/view", self.base_url);

        let response = self.http_client
            .post(&url)
            .json(&body)
            .send()
            .await
            .context("Failed to call view function")?;

        let result: Vec<Value> = response.json().await.context("Failed to parse view response")?;
        Ok(result)
    }

    async fn submit_transaction(
        &self,
        _signer: &mut LocalAccount,
        function: &str,
        _args: Vec<String>,
    ) -> Result<TxResult> {
        // Note: Full transaction submission requires more complex BCS serialization
        // This is a simplified placeholder that would need the full cedra-sdk transaction builder
        let _function_id = format!("{}::{}::{}", self.module_address, self.module_name, function);
        
        // TODO: Implement full transaction building and submission
        // For now, return a placeholder result
        Ok(TxResult {
            hash: "0x...".to_string(),
            success: false,
            gas_used: 0,
        })
    }
}

use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

use crate::CVN1_ADDRESS;

const CEDRA_TESTNET: &str = "https://testnet.cedra.dev";

// === Request/Response Types ===

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct MintRequest {
    pub strategy_id: String,
    pub buyer_address: String,
    pub name: String,
    pub description: String,
    pub uri: String,
}

#[derive(Debug, Serialize)]
pub struct MintResponse {
    pub success: bool,
    pub tx_hash: String,
    pub nft_address: String,
    pub vault_amount: u64,
}

#[derive(Debug, Serialize)]
pub struct VaultResponse {
    pub exists: bool,
    pub balances: Vec<VaultBalance>,
}

#[derive(Debug, Serialize)]
pub struct VaultBalance {
    pub fa_metadata_addr: String,
    pub balance: u64,
    pub symbol: String,
}

#[derive(Debug, Serialize)]
pub struct ConfigResponse {
    pub creator_royalty_bps: u16,
    pub vault_royalty_bps: u16,
    pub allowed_assets: Vec<String>,
    pub creator_payout_addr: String,
}

// === Handlers ===

pub async fn mint_handler(body: web::Json<MintRequest>) -> impl Responder {
    log::info!("Mint request: {:?}", body);

    // In production, this would:
    // 1. Load creator's private key
    // 2. Build and sign the mint transaction
    // 3. Submit to Cedra testnet
    // 4. Return the NFT address from events

    // For demo, simulate success
    let (vault_amount, tx_hash) = match body.strategy_id.as_str() {
        "premium-art" => (100_000_000u64, "0xabc123...premium"),  // 100% of 100 CEDRA
        "pfp-collection" => (25_000_000u64, "0xdef456...pfp"),    // 50% of 50 CEDRA
        "piggy-bank" => (0u64, "0x789abc...piggy"),               // 0% of 0 CEDRA
        _ => return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Unknown strategy"
        })),
    };

    HttpResponse::Ok().json(MintResponse {
        success: true,
        tx_hash: tx_hash.to_string(),
        nft_address: format!("0x{:064x}", rand::random::<u64>()),
        vault_amount,
    })
}

pub async fn get_vault_handler(path: web::Path<String>) -> impl Responder {
    let nft_addr = path.into_inner();
    log::info!("Get vault: {}", nft_addr);

    // Query Cedra's view function
    let result = query_vault_exists(&nft_addr).await;

    match result {
        Ok(exists) => {
            if exists {
                // In production, query actual balances
                HttpResponse::Ok().json(VaultResponse {
                    exists: true,
                    balances: vec![
                        VaultBalance {
                            fa_metadata_addr: "0xced...".to_string(),
                            balance: 50_000_000,
                            symbol: "CEDRA".to_string(),
                        }
                    ],
                })
            } else {
                HttpResponse::Ok().json(VaultResponse {
                    exists: false,
                    balances: vec![],
                })
            }
        }
        Err(e) => {
            log::error!("Failed to query vault: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": e.to_string()
            }))
        }
    }
}

pub async fn get_config_handler(path: web::Path<String>) -> impl Responder {
    let creator_addr = path.into_inner();
    log::info!("Get config: {}", creator_addr);

    // Query via view function
    let result = query_vault_config(&creator_addr).await;

    match result {
        Ok(config) => HttpResponse::Ok().json(config),
        Err(e) => {
            log::error!("Failed to query config: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": e.to_string()
            }))
        }
    }
}

// === Cedra API Helpers ===

async fn query_vault_exists(nft_addr: &str) -> anyhow::Result<bool> {
    let client = reqwest::Client::new();
    let url = format!("{}/v1/view", CEDRA_TESTNET);
    
    let body = serde_json::json!({
        "function": format!("{}::vaulted_collection::vault_exists", CVN1_ADDRESS),
        "type_arguments": [],
        "arguments": [nft_addr]
    });

    let response = client.post(&url).json(&body).send().await?;
    let result: Vec<serde_json::Value> = response.json().await?;
    
    Ok(result.first().and_then(|v| v.as_bool()).unwrap_or(false))
}

async fn query_vault_config(creator_addr: &str) -> anyhow::Result<ConfigResponse> {
    let client = reqwest::Client::new();
    let url = format!("{}/v1/view", CEDRA_TESTNET);
    
    let body = serde_json::json!({
        "function": format!("{}::vaulted_collection::get_vault_config", CVN1_ADDRESS),
        "type_arguments": [],
        "arguments": [creator_addr]
    });

    let response = client.post(&url).json(&body).send().await?;
    let result: Vec<serde_json::Value> = response.json().await?;
    
    Ok(ConfigResponse {
        creator_royalty_bps: result.get(0).and_then(|v| v.as_u64()).unwrap_or(0) as u16,
        vault_royalty_bps: result.get(1).and_then(|v| v.as_u64()).unwrap_or(0) as u16,
        allowed_assets: result.get(2)
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default(),
        creator_payout_addr: result.get(3).and_then(|v| v.as_str()).unwrap_or("").to_string(),
    })
}

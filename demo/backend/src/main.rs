use actix_cors::Cors;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};

mod routes;

// CVN-1 contract address on testnet
pub const CVN1_ADDRESS: &str = "0x921213f0f52998b002b7f2c4fcf2b7042dab9f1a5f44a36158ed6424afc25bb7";

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    contract: &'static str,
}

async fn health() -> impl Responder {
    HttpResponse::Ok().json(HealthResponse {
        status: "ok",
        contract: CVN1_ADDRESS,
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    log::info!("Starting CVN-1 Demo Backend on http://127.0.0.1:8080");
    log::info!("Contract: {}", CVN1_ADDRESS);

    HttpServer::new(|| {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();

        App::new()
            .wrap(cors)
            .route("/health", web::get().to(health))
            .route("/api/mint", web::post().to(routes::mint_handler))
            .route("/api/vault/{nft}", web::get().to(routes::get_vault_handler))
            .route("/api/config/{creator}", web::get().to(routes::get_config_handler))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}

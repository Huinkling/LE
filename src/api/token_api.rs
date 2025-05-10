use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::{AppState, TokenInfo, ApiResponse};
use log::info;
use std::env;

// 获取代币信息
pub async fn get_token_info(app_state: web::Data<AppState>) -> impl Responder {
    let token_info = &app_state.token_info;
    
    #[derive(Serialize)]
    struct TokenInfoResponse {
        success: bool,
        message: String,
        token_info: TokenInfo,
        metadata: TokenMetadata,
    }
    
    #[derive(Serialize)]
    struct TokenMetadata {
        name: String,
        symbol: String,
        decimals: u8,
        total_supply: String,
        contract_address: String,
        logo_uri: String,
        description: String,
        website: Option<String>,
        explorer_url: String,
    }
    
    // 格式化总供应量，添加千位分隔符
    let formatted_supply = format!("{:,}", token_info.total_supply);
    
    // 获取当前网络（mainnet或devnet）
    let network = env::var("SOLANA_NETWORK").unwrap_or_else(|_| "devnet".to_string());
    
    // 构建区块链浏览器URL
    let explorer_base = if network == "mainnet" {
        "https://explorer.solana.com"
    } else {
        "https://explorer.solana.com/?cluster=devnet"
    };
    
    let explorer_url = format!("{}/address/{}", explorer_base, token_info.contract_address);
    
    // 构建元数据
    let metadata = TokenMetadata {
        name: token_info.name.clone(),
        symbol: token_info.symbol.clone(),
        decimals: token_info.decimals,
        total_supply: formatted_supply,
        contract_address: token_info.contract_address.clone(),
        logo_uri: "https://raw.githubusercontent.com/your-repo/le-token/main/assets/logo.png".to_string(),
        description: "$LE Token是一个基于Solana的积分代币系统，用于奖励社区活动和参与".to_string(),
        website: Some("https://example.com/le-token".to_string()),
        explorer_url,
    };
    
    info!("提供代币信息: {}, {}, 合约地址: {}", 
          token_info.name, token_info.symbol, token_info.contract_address);
    
    HttpResponse::Ok().json(TokenInfoResponse {
        success: true,
        message: "代币信息获取成功".to_string(),
        token_info: token_info.clone(),
        metadata,
    })
}

// 兑换积分为代币（仅管理员可用）
#[derive(Deserialize)]
pub struct ExchangeRequest {
    user_id: String,
    admin_key: String,
    points_amount: u64,
}

pub async fn exchange_points_to_token(_data: web::Json<ExchangeRequest>, _app_state: web::Data<AppState>) -> impl Responder {
    // 功能已禁用 - 不允许提币到链上交易
    HttpResponse::Forbidden().json(ApiResponse {
        success: false,
        message: "提币到链上交易功能已禁用".to_string(),
        points: None,
        qr_code: None,
    })
}
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use std::sync::Mutex;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use qrcode::QrCode;
use base64::encode;
use dotenv::dotenv;
use std::env;
use log::{info, error};
use le_token::{TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, TOKEN_TOTAL_SUPPLY};

mod token_api;

// In-memory storage for demo purposes
struct AppState {
    users: Mutex<HashMap<String, UserData>>,
    admin_keys: Vec<String>, // List of authorized admin public keys
    token_info: TokenInfo, // 代币基本信息
    user_counter: Mutex<u32>, // 用户编号计数器
    user_id_to_number: Mutex<HashMap<String, String>>, // 用户ID到编号的映射
}

#[derive(Serialize, Deserialize, Clone)]
struct UserData {
    pub user_id: String,
    pub pubkey: String,
    pub points: u64,
    pub last_check_in: u64,
    pub ad_views_today: u8,
    pub referrals: Vec<String>,
    pub user_number: String, // 用户唯一编号，例如 #00001
}

#[derive(Deserialize)]
struct RegisterRequest {
    user_id: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct TokenInfo {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub contract_address: String,
}

#[derive(Deserialize)]
struct CheckInRequest {
    user_id: String,
}

#[derive(Deserialize)]
struct AdViewRequest {
    user_id: String,
}

#[derive(Deserialize)]
struct ReferralRequest {
    referrer_id: String,
    new_user_id: String,
}

#[derive(Deserialize)]
struct CommunityActivityRequest {
    user_id: String,
    admin_key: String,
    points: u64,
}

#[derive(Serialize)]
struct ApiResponse {
    success: bool,
    message: String,
    points: Option<u64>,
    qr_code: Option<String>,
}

// Get current timestamp
fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs()
}

// Submit transaction to Solana blockchain
async fn submit_to_blockchain(user_pubkey: &str, instruction_type: u8, data: Vec<u8>) -> Result<String, String> {
    // This is a simplified implementation
    // In a real application, you would use the Solana client to submit the transaction
    
    // For demo purposes, we'll just log the transaction details
    info!("Submitting to blockchain: User: {}, Instruction: {}, Data length: {}", 
             user_pubkey, instruction_type, data.len());
    
    // In a real implementation, you would:
    // 1. Create a Solana transaction
    // 2. Sign it with your program's keypair
    // 3. Submit it to the Solana network
    // 4. Return the transaction signature
    
    Ok(format!("tx_{}_{}", instruction_type, get_current_timestamp()))
}

// API endpoints
async fn daily_check_in(data: web::Json<CheckInRequest>, app_state: web::Data<AppState>) -> impl Responder {
    let mut users = app_state.users.lock().unwrap();
    let user_id = &data.user_id;
    
    if let Some(user) = users.get_mut(user_id) {
        let current_time = get_current_timestamp();
        
        // Check if 24 hours have passed since last check-in
        if current_time - user.last_check_in >= 86400 {
            // Prepare blockchain transaction data
            let mut tx_data = vec![2]; // Instruction type 2 = daily check-in
            tx_data.extend_from_slice(&current_time.to_le_bytes());
            
            // Submit to blockchain
            match submit_to_blockchain(&user.pubkey, 2, tx_data).await {
                Ok(_) => {
                    // Update local state
                    user.points += 10;
                    user.last_check_in = current_time;
                    
                    HttpResponse::Ok().json(ApiResponse {
                        success: true,
                        message: "Daily check-in successful. Awarded 10 points.".to_string(),
                        points: Some(user.points),
                        qr_code: None,
                    })
                },
                Err(e) => {
                    error!("Failed to submit check-in transaction: {}", e);
                    HttpResponse::InternalServerError().json(ApiResponse {
                        success: false,
                        message: format!("Failed to submit transaction: {}", e),
                        points: None,
                        qr_code: None,
                    })
                }
            }
        } else {
            HttpResponse::BadRequest().json(ApiResponse {
                success: false,
                message: "Already checked in today.".to_string(),
                points: Some(user.points),
                qr_code: None,
            })
        }
    } else {
        HttpResponse::NotFound().json(ApiResponse {
            success: false,
            message: "User not found.".to_string(),
            points: None,
            qr_code: None,
        })
    }
}

async fn view_ad(data: web::Json<AdViewRequest>, app_state: web::Data<AppState>) -> impl Responder {
    let mut users = app_state.users.lock().unwrap();
    let user_id = &data.user_id;
    
    if let Some(user) = users.get_mut(user_id) {
        let current_time = get_current_timestamp();
        
        // Reset ad views counter if it's a new day
        if current_time - user.last_check_in >= 86400 {
            user.ad_views_today = 0;
        }
        
        // Check if daily ad view limit reached (max 5 per day)
        if user.ad_views_today < 5 {
            // Prepare blockchain transaction data
            let mut tx_data = vec![3]; // Instruction type 3 = ad view
            tx_data.extend_from_slice(&current_time.to_le_bytes());
            
            // Submit to blockchain
            match submit_to_blockchain(&user.pubkey, 3, tx_data).await {
                Ok(_) => {
                    // Update local state
                    user.points += 5;
                    user.ad_views_today += 1;
                    
                    HttpResponse::Ok().json(ApiResponse {
                        success: true,
                        message: format!("Ad view recorded. Awarded 5 points. {} ad views remaining today.", 5 - user.ad_views_today),
                        points: Some(user.points),
                        qr_code: None,
                    })
                },
                Err(e) => {
                    error!("Failed to submit ad view transaction: {}", e);
                    HttpResponse::InternalServerError().json(ApiResponse {
                        success: false,
                        message: format!("Failed to submit transaction: {}", e),
                        points: None,
                        qr_code: None,
                    })
                }
            }
        } else {
            HttpResponse::BadRequest().json(ApiResponse {
                success: false,
                message: "Daily ad view limit reached.".to_string(),
                points: Some(user.points),
                qr_code: None,
            })
        }
    } else {
        HttpResponse::NotFound().json(ApiResponse {
            success: false,
            message: "User not found.".to_string(),
            points: None,
            qr_code: None,
        })
    }
}

async fn refer_user(data: web::Json<ReferralRequest>, app_state: web::Data<AppState>) -> impl Responder {
    let mut users = app_state.users.lock().unwrap();
    let referrer_id = &data.referrer_id;
    let new_user_id = &data.new_user_id;
    
    // Check if referrer exists
    if !users.contains_key(referrer_id) {
        return HttpResponse::NotFound().json(ApiResponse {
            success: false,
            message: "Referrer not found.".to_string(),
            points: None,
            qr_code: None,
        });
    }
    
    // Check if new user already exists
    if users.contains_key(new_user_id) {
        return HttpResponse::BadRequest().json(ApiResponse {
            success: false,
            message: "User already exists.".to_string(),
            points: None,
            qr_code: None,
        });
    }
    
    // Get referrer data
    let referrer = users.get(referrer_id).unwrap().clone();
    
    // Check if new user is already in referrals
    if referrer.referrals.contains(new_user_id) {
        return HttpResponse::BadRequest().json(ApiResponse {
            success: false,
            message: "User already referred.".to_string(),
            points: Some(referrer.points),
            qr_code: None,
        });
    }
    
    // Calculate points based on number of existing referrals (decreasing rewards)
    let referral_count = referrer.referrals.len() as u64;
    let points_to_add = if referral_count == 0 {
        50 // First referral: 50 points
    } else {
        50 / (2_u64.pow(referral_count.try_into().unwrap())) // Exponential decrease
    };
    
    // 自动生成Solana钱包
    let keypair = Keypair::new();
    let pubkey = keypair.pubkey().to_string();
    
    // 生成唯一用户编号
    let mut counter = app_state.user_counter.lock().unwrap();
    *counter += 1;
    let user_number = format!("#{:05}", *counter);
    
    // 更新用户ID到编号的映射
    let mut id_to_number = app_state.user_id_to_number.lock().unwrap();
    id_to_number.insert(new_user_id.clone(), user_number.clone());
    
    // 创建新用户数据
    let new_user = UserData {
        user_id: new_user_id.clone(),
        pubkey: pubkey,
        points: 0,
        last_check_in: 0,
        ad_views_today: 0,
        referrals: Vec::new(),
        user_number: user_number.clone(),
    };
    
    // Add new user to storage
    users.insert(new_user_id.clone(), new_user);
    
    // Update referrer's data
    let mut updated_referrer = referrer.clone();
    updated_referrer.referrals.push(new_user_id.clone());
    
    // Prepare blockchain transaction data
    let mut tx_data = vec![4]; // Instruction type 4 = referral
    // In a real implementation, you would add the new user's pubkey here
    tx_data.extend_from_slice(&[0; 32]); // Placeholder for pubkey
    
    // Submit to blockchain
    match submit_to_blockchain(&referrer.pubkey, 4, tx_data).await {
        Ok(_) => {
            // Update local state
            updated_referrer.points += points_to_add;
            users.insert(referrer_id.clone(), updated_referrer.clone());
            
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                message: format!("Referral successful. Awarded {} points.", points_to_add),
                points: Some(updated_referrer.points),
                qr_code: None,
            })
        },
        Err(e) => {
            error!("Failed to submit referral transaction: {}", e);
            HttpResponse::InternalServerError().json(ApiResponse {
                success: false,
                message: format!("Failed to submit transaction: {}", e),
                points: None,
                qr_code: None,
            })
        }
    }
}

async fn community_activity(data: web::Json<CommunityActivityRequest>, app_state: web::Data<AppState>) -> impl Responder {
    let mut users = app_state.users.lock().unwrap();
    let user_id = &data.user_id;
    let admin_key = &data.admin_key;
    let points = data.points;
    
    // Verify admin key
    if !app_state.admin_keys.contains(admin_key) {
        return HttpResponse::Unauthorized().json(ApiResponse {
            success: false,
            message: "Unauthorized admin key.".to_string(),
            points: None,
            qr_code: None,
        });
    }
    
    if let Some(user) = users.get_mut(user_id) {
        // Prepare blockchain transaction data
        let mut tx_data = vec![5]; // Instruction type 5 = community activity
        tx_data.extend_from_slice(&points.to_le_bytes());
        
        // Submit to blockchain
        match submit_to_blockchain(&user.pubkey, 5, tx_data).await {
            Ok(_) => {
                // Update local state
                user.points += points;
                
                HttpResponse::Ok().json(ApiResponse {
                    success: true,
                    message: format!("Community activity recorded. Awarded {} points.", points),
                    points: Some(user.points),
                    qr_code: None,
                })
            },
            Err(e) => {
                error!("Failed to submit community activity transaction: {}", e);
                HttpResponse::InternalServerError().json(ApiResponse {
                    success: false,
                    message: format!("Failed to submit transaction: {}", e),
                    points: None,
                    qr_code: None,
                })
            }
        }
    } else {
        HttpResponse::NotFound().json(ApiResponse {
            success: false,
            message: "User not found.".to_string(),
            points: None,
            qr_code: None,
        })
    }
}

async fn generate_qr_code(user_id: web::Path<String>, app_state: web::Data<AppState>) -> impl Responder {
    let users = app_state.users.lock().unwrap();
    let user_id = user_id.into_inner();
    
    if let Some(user) = users.get(&user_id) {
        // Generate QR code with user number and points
        let qr_data = format!("user_number={}&points={}", user.user_number, user.points);
        let qr = QrCode::new(qr_data.as_bytes()).unwrap();
        let qr_svg = qr.render::<qrcode::render::svg::Color>().build();
        
        // Convert SVG to base64 for easy display in mobile app
        let qr_base64 = encode(qr_svg.as_bytes());
        
        HttpResponse::Ok().json(ApiResponse {
            success: true,
            message: "QR code generated successfully.".to_string(),
            points: Some(user.points),
            qr_code: Some(qr_base64),
        })
    } else {
        HttpResponse::NotFound().json(ApiResponse {
            success: false,
            message: "User not found.".to_string(),
            points: None,
            qr_code: None,
        })
    }
}

// Register a new user
async fn register_user(data: web::Json<RegisterRequest>, app_state: web::Data<AppState>) -> impl Responder {
    let mut users = app_state.users.lock().unwrap();
    let user_id = data.user_id.clone();
    
    if users.contains_key(&user_id) {
        return HttpResponse::BadRequest().json(ApiResponse {
            success: false,
            message: "User already exists.".to_string(),
            points: None,
            qr_code: None,
        });
    }
    
    // 自动生成Solana钱包
    let keypair = Keypair::new();
    let pubkey = keypair.pubkey().to_string();
    
    // 生成唯一用户编号
    let mut counter = app_state.user_counter.lock().unwrap();
    *counter += 1;
    let user_number = format!("#{:05}", *counter);
    
    // 更新用户ID到编号的映射
    let mut id_to_number = app_state.user_id_to_number.lock().unwrap();
    id_to_number.insert(user_id.clone(), user_number.clone());
    
    // 创建新用户数据，初始化默认值
    let user_data = UserData {
        user_id: user_id.clone(),
        pubkey,
        points: 0,
        last_check_in: 0,
        ad_views_today: 0,
        referrals: Vec::new(),
        user_number: user_number.clone(),
    };
    
    // 存储用户数据
    users.insert(user_id.clone(), user_data);
    
    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: format!("User registered successfully. Your user number is {}.", user_number),
        points: Some(0),
        qr_code: None,
    })
}

// Get user points
async fn get_user_points(user_id: web::Path<String>, app_state: web::Data<AppState>) -> impl Responder {
    let users = app_state.users.lock().unwrap();
    let user_id = user_id.into_inner();
    
    if let Some(user) = users.get(&user_id) {
        HttpResponse::Ok().json(ApiResponse {
            success: true,
            message: "User points retrieved successfully.".to_string(),
            points: Some(user.points),
            qr_code: None,
        })
    } else {
        HttpResponse::NotFound().json(ApiResponse {
            success: false,
            message: "User not found.".to_string(),
            points: None,
            qr_code: None,
        })
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load environment variables from .env file
    dotenv().ok();
    
    // Initialize logger
    env_logger::init();
    
    // Create app state with demo data
    let app_state = web::Data::new(AppState {
        users: Mutex::new(HashMap::new()),
        admin_keys: vec!["admin_key_1".to_string(), "admin_key_2".to_string()],
        token_info: TokenInfo {
            name: TOKEN_NAME.to_string(),
            symbol: TOKEN_SYMBOL.to_string(),
            decimals: TOKEN_DECIMALS,
            total_supply: TOKEN_TOTAL_SUPPLY,
            contract_address: env::var("PROGRAM_ID").unwrap_or_else(|_| "未部署".to_string()),
        },
        user_counter: Mutex::new(0),
        user_id_to_number: Mutex::new(HashMap::new()),
    });
    
    info!("Starting $LE Token API server");
    
    // Start HTTP server
    // 打印服务器启动信息
    let server_address = "0.0.0.0:8080";
    info!("服务器将在 {} 上启动，可通过局域网访问", server_address);
    
    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .route("/api/register", web::post().to(register_user))
            .route("/api/check-in", web::post().to(daily_check_in))
            .route("/api/view-ad", web::post().to(view_ad))
            .route("/api/refer", web::post().to(refer_user))
            .route("/api/community-activity", web::post().to(community_activity))
            .route("/api/qr-code/{user_id}", web::get().to(generate_qr_code))
            .route("/api/points/{user_id}", web::get().to(get_user_points))
            .route("/api/token-info", web::get().to(token_api::get_token_info))
            .route("/api/exchange", web::post().to(token_api::exchange_points_to_token))
    })
    .bind(server_address)?
    .run()
    .await
}
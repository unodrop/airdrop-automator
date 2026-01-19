use tauri::{Manager, Emitter};
use super::types::*;
use crate::modules::wallet::WalletAccount;
use crate::modules::wallet::utils::decrypt_private_key;
use crate::common::http::create_client;
use alloy::signers::local::PrivateKeySigner;
use alloy::signers::Signer;
use serde::Serialize;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tokio::sync::Mutex as AsyncMutex;
use lazy_static::lazy_static;

// Global state for Pharos tasks
lazy_static! {
    static ref PHAROS_STATE: AsyncMutex<PharosState> = AsyncMutex::new(PharosState::new());
}

pub struct PharosState {
    pub is_running: bool,
    pub should_stop: bool,
    pub task_results: HashMap<String, PharosTaskResult>,
}

impl PharosState {
    pub fn new() -> Self {
        Self {
            is_running: false,
            should_stop: false,
            task_results: HashMap::new(),
        }
    }
}

#[derive(Clone, Serialize)]
struct LogEvent {
    address: String,
    message: String,
    level: String, // "info", "success", "error"
    timestamp: u64,
}

fn emit_log(app: &tauri::AppHandle, address: &str, message: &str, level: &str) {
    let _ = app.emit("pharos_log", LogEvent {
        address: address.to_string(),
        message: message.to_string(),
        level: level.to_string(),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64,
    });
}

#[tauri::command]
pub async fn get_pharos_status() -> Result<PharosStatusResponse, String> {
    let state = PHAROS_STATE.lock().await;
    Ok(PharosStatusResponse {
        is_running: state.is_running,
        results: state.task_results.clone(),
    })
}

#[tauri::command]
pub async fn stop_pharos_tasks() -> Result<(), String> {
    let mut state = PHAROS_STATE.lock().await;
    state.should_stop = true;
    Ok(())
}

#[tauri::command]
pub async fn start_pharos_tasks(app: tauri::AppHandle, invite_code: Option<String>) -> Result<(), String> {
    let mut state = PHAROS_STATE.lock().await;
    if state.is_running {
        return Err("Tasks are already running".to_string());
    }
    state.is_running = true;
    state.should_stop = false;
    // Clear previous results or keep them? Let's clear for "Start All" semantics
    state.task_results.clear();
    drop(state);

    // Spawn a background task
    let app_handle = app.clone();
    let code = invite_code.unwrap_or("S6NGMzXSCDBxhnwo".to_string());
    
    tauri::async_runtime::spawn(async move {
        match run_pharos_tasks(app_handle, &code).await {
            Ok(_) => {},
            Err(e) => eprintln!("Pharos tasks error: {}", e),
        }
        
        // Reset running state
        let mut state = PHAROS_STATE.lock().await;
        state.is_running = false;
        state.should_stop = false;
    });

    Ok(())
}

async fn run_pharos_tasks(app: tauri::AppHandle, invite_code: &str) -> Result<(), String> {
    emit_log(&app, "SYSTEM", "Starting tasks...", "info");

    // 1. Get wallets
    let wallets_cmd = crate::modules::wallet::get_wallets(app.clone()).await;
    let wallets = match wallets_cmd {
        Ok(w) => w,
        Err(e) => {
            let msg = format!("Failed to load wallets: {}", e);
            emit_log(&app, "SYSTEM", &msg, "error");
            return Err(msg);
        }
    };

    if wallets.is_empty() {
        emit_log(&app, "SYSTEM", "No wallets found", "error");
        return Ok(());
    }

    // 2. Iterate wallets
    for wallet in wallets {
        // Check for stop signal
        {
            let state = PHAROS_STATE.lock().await;
            if state.should_stop {
                emit_log(&app, "SYSTEM", "Tasks stopped by user", "info");
                break;
            }
        }

        // Update status to running locally (optional, frontend handles "running" via logs or optimistic update)
        // But better to update global state so `get_pharos_status` returns correct info
        {
            let mut state = PHAROS_STATE.lock().await;
            state.task_results.insert(wallet.address.clone(), PharosTaskResult {
                success: false,
                message: "Running...".to_string(),
                jwt: None,
            });
        }
        
        let result = execute_single_login(&app, &wallet.address, invite_code).await;
        
        // Save result
        let mut state = PHAROS_STATE.lock().await;
        let final_res = match result {
            Ok(res) => res,
            Err(e) => PharosTaskResult {
                success: false,
                message: e,
                jwt: None,
            }
        };
        state.task_results.insert(wallet.address.clone(), final_res);
    }

    emit_log(&app, "SYSTEM", "All tasks completed", "success");
    Ok(())
}

async fn execute_single_login(
    app: &tauri::AppHandle,
    address: &str,
    invite_code: &str,
) -> Result<PharosTaskResult, String> {
    emit_log(app, address, "Starting login process...", "info");

    // 1. Get private key
    emit_log(app, address, "Decrypting private key...", "info");
    let app_password = "unodrop_secure_password_2024";
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let wallets_path = data_dir.join("wallets.json");
    
    if !wallets_path.exists() {
        let msg = "No wallets found";
        emit_log(app, address, msg, "error");
        return Err(msg.to_string());
    }
    
    let content = std::fs::read_to_string(&wallets_path).map_err(|e| e.to_string())?;
    let wallets: Vec<WalletAccount> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    let wallet = wallets.iter()
        .find(|w| w.address.eq_ignore_ascii_case(address))
        .ok_or_else(|| {
            let msg = "Wallet not found";
            emit_log(app, address, msg, "error");
            msg.to_string()
        })?;
        
    let private_key_str = decrypt_private_key(&wallet.encrypted_key, app_password).map_err(|e| {
        emit_log(app, address, &format!("Decryption failed: {}", e), "error");
        e
    })?;

    let clean_key = if private_key_str.starts_with("0x") {
        &private_key_str[2..]
    } else {
        &private_key_str
    };
    
    // 2. Sign message
    emit_log(app, address, "Signing message 'pharos'...", "info");
    let signer = clean_key.parse::<PrivateKeySigner>()
        .map_err(|e| {
             emit_log(app, address, &format!("Invalid private key: {}", e), "error");
             format!("Invalid private key: {}", e)
        })?;
        
    let message = "pharos";
    let signature = signer.sign_message(message.as_bytes()).await
        .map_err(|e| {
            emit_log(app, address, &format!("Signing failed: {}", e), "error");
            format!("Signing failed: {}", e)
        })?;
    
    // signature needs to be 0x-prefixed hex string
    let signature_str = signature.to_string();
    let signature_param = if signature_str.starts_with("0x") {
        signature_str
    } else {
        format!("0x{}", signature_str)
    };
    
    // 3. Send request
    emit_log(app, address, "Sending login request...", "info");
    let client = create_client(None)?;
    
    let url = format!(
        "https://api.pharosnetwork.xyz/user/login?address={}&signature={}&invite_code={}",
        address, signature_param, invite_code
    );
    
    let response = client.post(&url)
        .header("authorization", "Bearer null")
        .header("sec-ch-ua", "\"Chromium\";v=\"136\", \"Brave\";v=\"136\", \"Not.A/Brand\";v=\"99\"")
        .header("sec-ch-ua-mobile", "?0")
        .header("sec-ch-ua-platform", "\"Windows\"")
        .header("sec-fetch-dest", "empty")
        .header("sec-fetch-mode", "cors")
        .header("sec-fetch-site", "same-site")
        .header("sec-gpc", "1")
        .header("Referer", "https://testnet.pharosnetwork.xyz/")
        .header("Referrer-Policy", "strict-origin-when-cross-origin")
        .send()
        .await
        .map_err(|e| {
            emit_log(app, address, &format!("Request failed: {}", e), "error");
            format!("Request failed: {}", e)
        })?;
        
    let response_text = response.text().await
        .map_err(|e| {
            emit_log(app, address, &format!("Failed to read response: {}", e), "error");
            format!("Failed to read response: {}", e)
        })?;
        
    let login_res: PharosLoginResponse = serde_json::from_str(&response_text)
        .map_err(|e| {
            emit_log(app, address, &format!("Failed to parse response: {} - Raw: {}", e, response_text), "error");
            format!("Failed to parse response: {} - Raw: {}", e, response_text)
        })?;
        
    if login_res.code != 0 {
        emit_log(app, address, &format!("Login failed: {}", login_res.msg), "error");
        return Ok(PharosTaskResult {
            success: false,
            message: format!("Login failed: {}", login_res.msg),
            jwt: None,
        });
    }
    
    if let Some(data) = login_res.data {
        if let Some(jwt) = data.jwt {
            emit_log(app, address, "Login successful! JWT obtained.", "success");
            
            // 4. Check-in
            emit_log(app, address, "Sending check-in request...", "info");
            
            let check_in_url = format!("https://api.pharosnetwork.xyz/sign/in?address={}", address);
            
            // Common headers
            let mut headers = reqwest::header::HeaderMap::new();
            headers.insert("authorization", format!("Bearer {}", jwt).parse().unwrap());
            headers.insert("sec-ch-ua", "\"Chromium\";v=\"136\", \"Brave\";v=\"136\", \"Not.A/Brand\";v=\"99\"".parse().unwrap());
            headers.insert("sec-ch-ua-mobile", "?0".parse().unwrap());
            headers.insert("sec-ch-ua-platform", "\"Windows\"".parse().unwrap());
            headers.insert("sec-fetch-dest", "empty".parse().unwrap());
            headers.insert("sec-fetch-mode", "cors".parse().unwrap());
            headers.insert("sec-fetch-site", "same-site".parse().unwrap());
            headers.insert("sec-gpc", "1".parse().unwrap());
            headers.insert("Referer", "https://testnet.pharosnetwork.xyz/".parse().unwrap());
            headers.insert("Referrer-Policy", "strict-origin-when-cross-origin".parse().unwrap());
            
            let check_in_res = client.post(&check_in_url)
                .headers(headers.clone())
                .send()
                .await;

            match check_in_res {
                Ok(response) => {
                    match response.text().await {
                        Ok(text) => {
                            match serde_json::from_str::<PharosBaseResponse>(&text) {
                                Ok(res) => {
                                    if res.code == 0 {
                                        emit_log(app, address, "Check-in successful", "success");
                                    } else {
                                        emit_log(app, address, &format!("Check-in failed: {}", res.msg), "error");
                                    }
                                },
                                Err(e) => {
                                    emit_log(app, address, &format!("Check-in parse error: {}", e), "error");
                                }
                            }
                        },
                        Err(e) => {
                            emit_log(app, address, &format!("Check-in read error: {}", e), "error");
                        }
                    }
                },
                Err(e) => {
                    emit_log(app, address, &format!("Check-in request failed: {}", e), "error");
                }
            }
                
            // 5. Claim Faucet (Test Tokens)
            emit_log(app, address, "Checking faucet status...", "info");
            let faucet_status_url = format!("https://api.pharosnetwork.xyz/faucet/status?address={}", address);
            
            let faucet_status_res = client.get(&faucet_status_url)
                .headers(headers.clone())
                .send()
                .await;
                
            match faucet_status_res {
                Ok(response) => {
                    match response.text().await {
                        Ok(text) => {
                            // Assuming faucet status response has code/msg or data
                            // Just logging the attempt for now, or we can try to claim if needed.
                            // The user instruction implies "claim water/test tokens".
                            // Usually there is a status check and then a claim.
                            // Let's assume we just need to hit the status endpoint for now as requested, 
                            // or if the instruction implies actually claiming, we might need a POST to /faucet/claim.
                            // Based on "再执行一下领水领测试币", it means "Execute claim faucet/test tokens".
                            // But the code snippet provided was `statusUrl`.
                            // I will implement the status check as requested by the snippet, and if status implies we can claim, we might need another step.
                            // For now, I will implement the status check and log the result.
                            
                            match serde_json::from_str::<PharosFaucetStatusResponse>(&text) {
                                Ok(res) => {
                                    if res.code == 0 {
                                        if let Some(data) = res.data {
                                            if data.is_able_to_faucet {
                                                emit_log(app, address, "Faucet available, claiming...", "info");
                                                
                                                let claim_url = format!("https://api.pharosnetwork.xyz/faucet/daily?address={}", address);
                                                let claim_res = client.post(&claim_url)
                                                    .headers(headers.clone())
                                                    .send()
                                                    .await;
                                                    
                                                match claim_res {
                                                    Ok(claim_response) => {
                                                        match claim_response.text().await {
                                                            Ok(claim_text) => {
                                                                match serde_json::from_str::<PharosBaseResponse>(&claim_text) {
                                                                    Ok(claim_data) => {
                                                                        if claim_data.code == 0 {
                                                                            emit_log(app, address, "Faucet claimed successfully", "success");
                                                                        } else {
                                                                            emit_log(app, address, &format!("Faucet claim failed: {}", claim_data.msg), "error");
                                                                        }
                                                                    },
                                                                    Err(_) => {
                                                                        emit_log(app, address, &format!("Faucet claim response: {}", claim_text), "info");
                                                                    }
                                                                }
                                                            },
                                                            Err(e) => {
                                                                emit_log(app, address, &format!("Faucet claim read error: {}", e), "error");
                                                            }
                                                        }
                                                    },
                                                    Err(e) => {
                                                        emit_log(app, address, &format!("Faucet claim request failed: {}", e), "error");
                                                    }
                                                }
                                                
                                            } else {
                                                emit_log(app, address, "Faucet not available (already claimed?)", "info");
                                            }
                                        } else {
                                            emit_log(app, address, "Faucet status no data", "error");
                                        }
                                    } else {
                                        emit_log(app, address, &format!("Faucet status check failed: {}", res.msg), "error");
                                    }
                                },
                                Err(_) => {
                                    // Maybe the response structure is different, log raw text for debug
                                    emit_log(app, address, &format!("Faucet response: {}", text), "info");
                                }
                            }
                        },
                        Err(e) => {
                            emit_log(app, address, &format!("Faucet status read error: {}", e), "error");
                        }
                    }
                },
                Err(e) => {
                    emit_log(app, address, &format!("Faucet status request failed: {}", e), "error");
                }
            }

            // 6. Fetch Profile
            emit_log(app, address, "Fetching user profile...", "info");
            let profile_url = format!("https://api.pharosnetwork.xyz/user/profile?address={}", address);
            
            let profile_res = client.get(&profile_url)
                .headers(headers.clone())
                .send()
                .await;
                
            match profile_res {
                Ok(response) => {
                    match response.text().await {
                        Ok(text) => {
                            match serde_json::from_str::<PharosProfileResponse>(&text) {
                                Ok(profile_data) => {
                                    if profile_data.code == 0 {
                                        if let Some(data) = profile_data.data {
                                            if let Some(user_info) = data.user_info {
                                                let msg = format!("Success! ID: {} | Points: {} | Total: {}", 
                                                    user_info.id, user_info.task_points, user_info.total_points);
                                                emit_log(app, address, &msg, "success");
                                                Ok(PharosTaskResult {
                                                    success: true,
                                                    message: msg,
                                                    jwt: Some(jwt),
                                                })
                                            } else {
                                                emit_log(app, address, "Profile fetched but no user info", "error");
                                                 Ok(PharosTaskResult {
                                                    success: true,
                                                    message: "Profile fetched but no user info".to_string(),
                                                    jwt: Some(jwt),
                                                })
                                            }
                                        } else {
                                             emit_log(app, address, "Profile fetched but no data", "error");
                                             Ok(PharosTaskResult {
                                                success: true,
                                                message: "Profile fetched but no data".to_string(),
                                                jwt: Some(jwt),
                                            })
                                        }
                                    } else {
                                        let msg = format!("Fetch profile failed: {}", profile_data.msg);
                                        emit_log(app, address, &msg, "error");
                                        Ok(PharosTaskResult {
                                            success: true,
                                            message: msg,
                                            jwt: Some(jwt),
                                        })
                                    }
                                },
                                Err(e) => {
                                     emit_log(app, address, &format!("Failed to parse profile: {}", e), "error");
                                     Ok(PharosTaskResult {
                                        success: true,
                                        message: "Parse profile error".to_string(),
                                        jwt: Some(jwt),
                                    })
                                }
                            }
                        },
                        Err(e) => {
                            emit_log(app, address, &format!("Failed to read profile response: {}", e), "error");
                             Ok(PharosTaskResult {
                                success: true,
                                message: "Read profile error".to_string(),
                                jwt: Some(jwt),
                            })
                        }
                    }
                },
                Err(e) => {
                     emit_log(app, address, &format!("Profile request failed: {}", e), "error");
                     Ok(PharosTaskResult {
                        success: true,
                        message: "Profile request failed".to_string(),
                        jwt: Some(jwt),
                    })
                }
            }
        } else {
            emit_log(app, address, "Login successful but no JWT found.", "error");
            Ok(PharosTaskResult {
                success: false,
                message: "No JWT in response".to_string(),
                jwt: None,
            })
        }
    } else {
         emit_log(app, address, "Login successful but no data found.", "error");
         Ok(PharosTaskResult {
            success: false,
            message: "No data in response".to_string(),
            jwt: None,
        })
    }
}

// Keep the original command for single execution if needed, or deprecate it
#[tauri::command]
pub async fn execute_pharos_login(
    app: tauri::AppHandle,
    address: String,
    _proxy: Option<String>,
) -> Result<PharosTaskResult, String> {
    execute_single_login(&app, &address, "S6NGMzXSCDBxhnwo").await
}

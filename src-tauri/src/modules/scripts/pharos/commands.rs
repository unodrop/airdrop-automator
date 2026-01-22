use tauri::{Manager, Emitter};
use super::types::*;
use super::api::PharosClient;
use crate::modules::wallet::WalletAccount;
use crate::modules::wallet::utils::decrypt_private_key;
use alloy::signers::local::PrivateKeySigner;
use alloy::signers::Signer;
use serde::Serialize;
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
    
    let signature_str = signature.to_string();
    let signature_param = if signature_str.starts_with("0x") {
        signature_str
    } else {
        format!("0x{}", signature_str)
    };
    
    // 3. Login
    emit_log(app, address, "Sending login request...", "info");
    let client = PharosClient::new(address, None)?;
    let login_res = client.login(&signature_param, invite_code).await
        .map_err(|e| {
            emit_log(app, address, &e, "error");
            e
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
            
            let client = PharosClient::new(address, Some(jwt.clone()))?;
            
            // 4. Check-in
            emit_log(app, address, "Sending check-in request...", "info");
            let check_in_res = client.check_in().await;
            
            match check_in_res {
                Ok(res) => {
                    if res.code == 0 {
                        emit_log(app, address, "Check-in successful", "success");
                    } else {
                        emit_log(app, address, &format!("Check-in failed: {}", res.msg), "error");
                    }
                },
                Err(e) => {
                    emit_log(app, address, &format!("Check-in error: {}", e), "error");
                }
            }
                
            // 5. Claim Faucet
            emit_log(app, address, "Checking faucet status...", "info");
            let faucet_status = client.get_faucet_status().await;
            
            match faucet_status {
                Ok(res) => {
                    if res.code == 0 {
                        if let Some(data) = res.data {
                            if data.is_able_to_faucet {
                                emit_log(app, address, "Faucet available, claiming...", "info");
                                let claim_res = client.claim_faucet().await;
                                
                                match claim_res {
                                    Ok(claim_data) => {
                                        if claim_data.code == 0 {
                                            emit_log(app, address, "Faucet claimed successfully", "success");
                                        } else {
                                            emit_log(app, address, &format!("Faucet claim failed: {}", claim_data.msg), "error");
                                        }
                                    },
                                    Err(e) => {
                                        emit_log(app, address, &format!("Faucet claim error: {}", e), "error");
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
                Err(e) => {
                     emit_log(app, address, &format!("Faucet status error: {}", e), "error");
                }
            }
            
            // 6. Fetch Profile
            emit_log(app, address, "Fetching user profile...", "info");
            let profile_res = client.get_profile().await;
            
            match profile_res {
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
                    emit_log(app, address, &format!("Profile error: {}", e), "error");
                    Ok(PharosTaskResult {
                        success: true,
                        message: format!("Profile error: {}", e),
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

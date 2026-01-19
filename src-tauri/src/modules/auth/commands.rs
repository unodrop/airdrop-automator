use super::types::*;
use mac_address::get_mac_address;
use rand::Rng;
use std::fs;
use tauri::Manager;

/// 获取设备 MAC 地址
#[tauri::command]
pub fn get_device_mac_address() -> Result<String, String> {
    match get_mac_address() {
        Ok(Some(mac)) => {
            let mac_str = mac.bytes()
                .iter()
                .map(|b| format!("{:02X}", b))
                .collect::<Vec<String>>()
                .join(":");
            Ok(mac_str)
        }
        Ok(None) => Err("未找到网络接口".to_string()),
        Err(e) => Err(format!("获取MAC地址失败: {}", e)),
    }
}

/// 生成安全的加密密钥
#[tauri::command]
pub fn generate_encryption_key() -> Result<String, String> {
    use rand::rngs::OsRng;
    
    let mut rng = OsRng;
    let random_bytes: Vec<u8> = (0..16)
        .map(|_| rng.gen::<u8>())
        .collect();
    
    let hex_string: String = random_bytes
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect();
    
    let formatted = format!(
        "{}-{}-{}-{}",
        &hex_string[0..4],
        &hex_string[4..8],
        &hex_string[8..12],
        &hex_string[12..16]
    );
    
    Ok(formatted)
}

/// 使用加密密钥加密密码
#[tauri::command]
pub fn encrypt_password(password: String, key: String) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    
    let clean_key = key.replace("-", "");
    
    let mut hasher = Sha256::new();
    hasher.update(clean_key.as_bytes());
    let key_hash = hasher.finalize();
    
    let encrypted: Vec<u8> = password
        .bytes()
        .enumerate()
        .map(|(i, b)| b ^ key_hash[i % key_hash.len()])
        .collect();
    
    Ok(hex::encode(encrypted))
}

/// 保存登录凭据
#[tauri::command]
pub fn save_login_credentials(
    app: tauri::AppHandle,
    email: String,
    encrypted_password: String,
    encryption_key: String,
    mac_address: String,
    token: Option<String>,
) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let credentials_path = app_dir.join("credentials.json");
    
    let credentials = LoginCredentials {
        email,
        encrypted_password,
        encryption_key,
        mac_address,
        token,
        saved_at: chrono::Utc::now().to_rfc3339(),
    };
    
    let json = serde_json::to_string_pretty(&credentials).map_err(|e| e.to_string())?;
    fs::write(&credentials_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// 获取保存的登录凭据
#[tauri::command]
pub fn get_saved_credentials(app: tauri::AppHandle) -> Result<Option<LoginCredentials>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let credentials_path = app_dir.join("credentials.json");
    
    if !credentials_path.exists() {
        return Ok(None);
    }
    
    let content = fs::read_to_string(&credentials_path).map_err(|e| e.to_string())?;
    let credentials: LoginCredentials = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    Ok(Some(credentials))
}

/// 清除保存的登录凭据
#[tauri::command]
pub fn clear_saved_credentials(app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let credentials_path = app_dir.join("credentials.json");
    
    if credentials_path.exists() {
        fs::remove_file(&credentials_path).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

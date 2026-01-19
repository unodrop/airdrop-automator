use super::types::*;
use crate::modules::wallet::{ValidationResult, encrypt_data as encrypt_private_key};
use std::fs;
use tauri::Manager;

#[tauri::command]
pub async fn validate_social_token(
    platform: String,
    username: Option<String>,
    token: String,
) -> Result<ValidationResult, String> {
    // 简单验证逻辑（实际应该调用各平台 API）
    let token = token.trim();
    
    if token.is_empty() {
        return Ok(ValidationResult {
            valid: false,
            username: None,
            message: "Token 不能为空".to_string(),
        });
    }
    
    // 基础格式验证
    match platform.as_str() {
        "twitter" => {
            // Twitter auth_token 通常是 40 位十六进制
            if token.len() < 20 {
                return Ok(ValidationResult {
                    valid: false,
                    username: None,
                    message: "Twitter Auth Token 格式不正确".to_string(),
                });
            }
        }
        "discord" => {
            // Discord token 格式验证
            if !token.contains('.') || token.len() < 50 {
                return Ok(ValidationResult {
                    valid: false,
                    username: None,
                    message: "Discord Authorization Token 格式不正确".to_string(),
                });
            }
        }
        "email" => {
            // Email 需要用户名（邮箱地址）
            if username.is_none() || username.as_ref().unwrap().is_empty() {
                return Ok(ValidationResult {
                    valid: false,
                    username: None,
                    message: "邮箱地址不能为空".to_string(),
                });
            }
            
            let email = username.as_ref().unwrap();
            if !email.contains('@') {
                return Ok(ValidationResult {
                    valid: false,
                    username: None,
                    message: "邮箱地址格式不正确".to_string(),
                });
            }
        }
        "telegram" => {
            // Telegram session string 或 bot token
            if token.len() < 20 {
                return Ok(ValidationResult {
                    valid: false,
                    username: None,
                    message: "Telegram Token 格式不正确".to_string(),
                });
            }
        }
        _ => {
            return Ok(ValidationResult {
                valid: false,
                username: None,
                message: "不支持的平台".to_string(),
            });
        }
    }
    
    // 验证成功
    Ok(ValidationResult {
        valid: true,
        username: username.clone(),
        message: "验证成功".to_string(),
    })
}

#[tauri::command]
pub async fn batch_import_social_accounts(
    app: tauri::AppHandle,
    accounts: Vec<SocialAccount>,
) -> Result<BatchSocialImportResult, String> {
    let total = accounts.len();
    let mut successful = 0;
    let mut failed = 0;
    let mut results = Vec::new();
    
    let app_password = "unodrop_secure_password_2024";
    
    // 获取数据目录
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let socials_path = data_dir.join("social_accounts.json");
    
    // 读取现有社交账户
    let mut existing_accounts: Vec<SocialAccount> = if socials_path.exists() {
        let content = std::fs::read_to_string(&socials_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };
    
    // 处理每个账户
    for (index, account) in accounts.iter().enumerate() {
        // 检查是否已存在
        let exists = existing_accounts.iter().any(|a| {
            a.platform == account.platform && 
            a.username.eq_ignore_ascii_case(&account.username)
        });
        
        if exists {
            failed += 1;
            results.push(SingleSocialImportResult {
                success: false,
                platform: Some(account.platform.clone()),
                username: Some(account.username.clone()),
                error: Some("账户已存在".to_string()),
                index: Some(index + 1),
                message: Some("账户已存在".to_string()),
            });
            continue;
        }
        
        // 验证 Token 格式
        let token = account.encrypted_token.trim();
        if token.is_empty() {
            failed += 1;
            results.push(SingleSocialImportResult {
                success: false,
                platform: Some(account.platform.clone()),
                username: Some(account.username.clone()),
                error: Some("Token 不能为空".to_string()),
                index: Some(index + 1),
                message: Some("Token 不能为空".to_string()),
            });
            continue;
        }
        
        // 加密 Token
        let encrypted_token = encrypt_private_key(token, app_password);
        
        // 添加新账户
        let new_account = SocialAccount {
            platform: account.platform.clone(),
            username: account.username.clone(),
            encrypted_token,
            wallet_address: account.wallet_address.clone(),
            verified: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        
        existing_accounts.push(new_account);
        successful += 1;
        
        results.push(SingleSocialImportResult {
            success: true,
            platform: Some(account.platform.clone()),
            username: Some(account.username.clone()),
            error: None,
            index: Some(index + 1),
            message: Some("导入成功".to_string()),
        });
    }
    
    // 保存到文件
    if successful > 0 {
        let json = serde_json::to_string_pretty(&existing_accounts).map_err(|e| e.to_string())?;
        std::fs::write(&socials_path, json).map_err(|e| e.to_string())?;
    }
    
    Ok(BatchSocialImportResult {
        total,
        successful,
        failed,
        details: results,
    })
}

#[tauri::command]
pub async fn import_social_account(
    app: tauri::AppHandle,
    account: SocialAccount,
) -> Result<bool, String> {
    let app_password = "unodrop_secure_password_2024";
    
    // 加密 token
    let encrypted_token = encrypt_private_key(&account.encrypted_token, app_password);
    
    // 获取数据目录
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    
    let socials_path = data_dir.join("social_accounts.json");
    
    // 读取现有社交账户
    let mut accounts: Vec<SocialAccount> = if socials_path.exists() {
        let content = std::fs::read_to_string(&socials_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };
    
    // 检查是否已存在（同一平台同一用户名）
    let exists = accounts.iter().any(|a| {
        a.platform == account.platform && 
        a.username.eq_ignore_ascii_case(&account.username)
    });
    
    if exists {
        return Err("该社交账户已经导入过了".to_string());
    }
    
    // 添加新账户
    let new_account = SocialAccount {
        platform: account.platform,
        username: account.username,
        encrypted_token,
        wallet_address: account.wallet_address,
        verified: true,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    
    accounts.push(new_account);
    
    // 保存到文件
    let json = serde_json::to_string_pretty(&accounts).map_err(|e| e.to_string())?;
    std::fs::write(&socials_path, json).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
pub async fn get_social_accounts(app: tauri::AppHandle) -> Result<Vec<SocialAccount>, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let socials_path = data_dir.join("social_accounts.json");
    
    if !socials_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = std::fs::read_to_string(&socials_path).map_err(|e| e.to_string())?;
    let accounts: Vec<SocialAccount> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    Ok(accounts)
}

#[tauri::command]
pub async fn delete_social_account(
    app: tauri::AppHandle,
    platform: String,
    username: String,
) -> Result<bool, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let socials_path = data_dir.join("social_accounts.json");
    
    if !socials_path.exists() {
        return Ok(false);
    }
    
    let content = std::fs::read_to_string(&socials_path).map_err(|e| e.to_string())?;
    let mut accounts: Vec<SocialAccount> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    let original_len = accounts.len();
    accounts.retain(|a| {
        !(a.platform.eq_ignore_ascii_case(&platform) && 
          a.username.eq_ignore_ascii_case(&username))
    });
    
    if accounts.len() == original_len {
        return Ok(false);
    }
    
    let json = serde_json::to_string_pretty(&accounts).map_err(|e| e.to_string())?;
    std::fs::write(&socials_path, json).map_err(|e| e.to_string())?;
    
    Ok(true)
}
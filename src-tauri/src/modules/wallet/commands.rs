use super::types::*;
use super::utils::*;
use tauri::Manager;

#[tauri::command]
pub async fn batch_import_private_keys(
    app: tauri::AppHandle,
    private_keys: Vec<String>,
) -> Result<BatchImportResult, String> {
    let total = private_keys.len();
    let mut successful = 0;
    let mut failed = 0;
    let mut results = Vec::new();
    
    // 获取数据目录
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let wallets_path = data_dir.join("wallets.json");
    
    // 读取现有钱包
    let mut wallets: Vec<WalletAccount> = if wallets_path.exists() {
        let content = std::fs::read_to_string(&wallets_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };
    
    let app_password = "unodrop_secure_password_2024";
    
    // 处理每个私钥
    for (index, private_key) in private_keys.iter().enumerate() {
        let private_key = private_key.trim();
        
        // 跳过空行
        if private_key.is_empty() {
            continue;
        }
        
        // 获取私钥预览（前6位+后4位）
        let preview = if private_key.len() > 10 {
            format!("{}...{}", &private_key[..6], &private_key[private_key.len()-4..])
        } else {
            private_key.to_string()
        };
        
        // 验证并获取地址
        let address = match validate_and_get_address(private_key) {
            Ok(addr) => addr,
            Err(e) => {
                failed += 1;
                results.push(SingleImportResult {
                    success: false,
                    address: None,
                    error: Some(e),
                    index: Some(index + 1),
                    message: None,
                    private_key_preview: Some(preview),
                });
                continue;
            }
        };
        
        // 检查地址是否已存在
        if wallets.iter().any(|w| w.address.eq_ignore_ascii_case(&address)) {
            failed += 1;
            results.push(SingleImportResult {
                success: false,
                address: Some(address.clone()),
                error: Some("地址已存在".to_string()),
                index: Some(index + 1),
                message: Some("地址已存在".to_string()),
                private_key_preview: Some(preview),
            });
            continue;
        }
        
        // 加密私钥
        let encrypted_key = encrypt_private_key(private_key, app_password);
        
        // 生成账户名称（基于地址）
        let name = format!("Account {}", &address[2..8].to_uppercase());
        
        // 添加新钱包
        let new_wallet = WalletAccount {
            name,
            address: address.clone(),
            encrypted_key,
            encrypted_mnemonic: None,  // 导入的私钥没有助记词
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        
        wallets.push(new_wallet);
        successful += 1;
        
        results.push(SingleImportResult {
            success: true,
            address: Some(address),
            error: None,
            index: Some(index + 1),
            message: Some("导入成功".to_string()),
            private_key_preview: Some(preview),
        });
    }
    
    // 保存到文件
    if successful > 0 {
        let json = serde_json::to_string_pretty(&wallets).map_err(|e| e.to_string())?;
        std::fs::write(&wallets_path, json).map_err(|e| e.to_string())?;
    }
    
    Ok(BatchImportResult {
        total,
        successful,
        failed,
        details: results.clone(),
        results,
    })
}

#[tauri::command]
pub async fn batch_import_wallets(
    app: tauri::AppHandle,
    wallets_to_import: Vec<ExportedWallet>,
) -> Result<BatchImportResult, String> {
    let total = wallets_to_import.len();
    let mut successful = 0;
    let mut failed = 0;
    let mut results = Vec::new();
    
    // 获取数据目录
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let wallets_path = data_dir.join("wallets.json");
    
    // 读取现有钱包
    let mut wallets: Vec<WalletAccount> = if wallets_path.exists() {
        let content = std::fs::read_to_string(&wallets_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };
    
    let app_password = "unodrop_secure_password_2024";
    
    // 处理每个钱包
    for (index, imported_wallet) in wallets_to_import.iter().enumerate() {
        // 验证私钥并获取地址
        let derived_address = match validate_and_get_address(&imported_wallet.private_key) {
            Ok(addr) => addr,
            Err(e) => {
                failed += 1;
                results.push(SingleImportResult {
                    success: false,
                    address: Some(imported_wallet.address.clone()),
                    error: Some(e),
                    index: Some(index + 1),
                    message: Some("私钥无效".to_string()),
                    private_key_preview: None,
                });
                continue;
            }
        };

        // 验证地址是否匹配
        if !derived_address.eq_ignore_ascii_case(&imported_wallet.address) {
             failed += 1;
             results.push(SingleImportResult {
                 success: false,
                 address: Some(imported_wallet.address.clone()),
                 error: Some("地址与私钥不匹配".to_string()),
                 index: Some(index + 1),
                 message: Some("地址与私钥不匹配".to_string()),
                 private_key_preview: None,
             });
             continue;
        }

        // 检查地址是否已存在
        if wallets.iter().any(|w| w.address.eq_ignore_ascii_case(&imported_wallet.address)) {
            failed += 1;
            results.push(SingleImportResult {
                success: false,
                address: Some(imported_wallet.address.clone()),
                error: Some("地址已存在".to_string()),
                index: Some(index + 1),
                message: Some("地址已存在".to_string()),
                private_key_preview: None,
            });
            continue;
        }
        
        // 加密私钥
        let encrypted_key = encrypt_private_key(&imported_wallet.private_key, app_password);
        
        // 加密助记词（如果有）
        let encrypted_mnemonic = if let Some(ref m) = imported_wallet.mnemonic {
            Some(encrypt_private_key(m, app_password))
        } else {
            None
        };
        
        // 添加新钱包
        let new_wallet = WalletAccount {
            name: imported_wallet.name.clone(),
            address: imported_wallet.address.clone(),
            encrypted_key,
            encrypted_mnemonic,
            created_at: imported_wallet.created_at.clone().unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
        };
        
        wallets.push(new_wallet);
        successful += 1;
        
        results.push(SingleImportResult {
            success: true,
            address: Some(imported_wallet.address.clone()),
            error: None,
            index: Some(index + 1),
            message: Some("导入成功".to_string()),
            private_key_preview: None,
        });
    }
    
    // 保存到文件
    if successful > 0 {
        let json = serde_json::to_string_pretty(&wallets).map_err(|e| e.to_string())?;
        std::fs::write(&wallets_path, json).map_err(|e| e.to_string())?;
    }
    
    Ok(BatchImportResult {
        total,
        successful,
        failed,
        details: results.clone(),
        results,
    })
}

#[tauri::command]
pub async fn batch_create_wallets(
    app: tauri::AppHandle,
    count: usize,
) -> Result<BatchImportResult, String> {
    use alloy::signers::local::{MnemonicBuilder, coins_bip39::{English, Mnemonic}};
    use rand::Rng;
    
    if count == 0 || count > 100 {
        return Err("创建数量必须在 1-100 之间".to_string());
    }
    
    let total = count;
    let mut successful = 0;
    let mut failed = 0;
    let mut results = Vec::new();
    
    // 获取数据目录
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let wallets_path = data_dir.join("wallets.json");
    
    // 读取现有钱包
    let mut wallets: Vec<WalletAccount> = if wallets_path.exists() {
        let content = std::fs::read_to_string(&wallets_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };
    
    let app_password = "unodrop_secure_password_2024";
    
    // 创建多个钱包
    for index in 0..count {
        // 生成随机熵 (128 bits = 12 words)
        let mut entropy = [0u8; 16];
        rand::thread_rng().fill(&mut entropy);
        
        // 从熵生成助记词
        let mnemonic = Mnemonic::<English>::new_from_entropy(entropy.into());
        
        let mnemonic_phrase = mnemonic.to_phrase();
        
        // 从助记词生成钱包（使用默认派生路径 m/44'/60'/0'/0/0）
        let wallet = match MnemonicBuilder::<English>::default()
            .phrase(mnemonic_phrase.as_str())
            .index(0u32)
            .map_err(|e| e.to_string())?
            .build()
        {
            Ok(w) => w,
            Err(e) => {
                failed += 1;
                results.push(SingleImportResult {
                    success: false,
                    address: None,
                    error: Some(format!("生成钱包失败: {}", e)),
                    index: Some(index + 1),
                    message: Some(format!("生成钱包失败: {}", e)),
                    private_key_preview: Some("".to_string()),
                });
                continue;
            }
        };
        
        // 获取地址和私钥
        let address = format!("{:?}", wallet.address());
        let private_key_bytes = wallet.credential().to_bytes();
        let private_key = hex::encode(private_key_bytes);
        
        // 检查地址是否已存在
        let exists = wallets.iter().any(|w| w.address.eq_ignore_ascii_case(&address));
        if exists {
            failed += 1;
            results.push(SingleImportResult {
                success: false,
                address: Some(address),
                error: Some("地址已存在".to_string()),
                index: Some(index + 1),
                message: Some("地址已存在".to_string()),
                private_key_preview: Some("".to_string()),
            });
            continue;
        }
        
        // 加密私钥和助记词
        let encrypted_key = encrypt_private_key(&private_key, app_password);
        let encrypted_mnemonic = encrypt_private_key(&mnemonic_phrase, app_password);
        
        // 生成账户名称
        let name = format!("Wallet {}", &address[2..8].to_uppercase());
        
        // 添加新钱包
        let new_wallet = WalletAccount {
            name,
            address: address.clone(),
            encrypted_key,
            encrypted_mnemonic: Some(encrypted_mnemonic),
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        
        wallets.push(new_wallet);
        successful += 1;
        
        // 助记词预览（只显示前3个词）
        let mnemonic_words: Vec<&str> = mnemonic_phrase.split_whitespace().collect();
        let preview = if mnemonic_words.len() >= 3 {
            format!("{}...", mnemonic_words[..3].join(" "))
        } else {
            mnemonic_phrase
        };
        
        results.push(SingleImportResult {
            success: true,
            address: Some(address),
            error: None,
            index: Some(index + 1),
            message: Some("创建成功".to_string()),
            private_key_preview: Some(preview),
        });
    }
    
    // 保存到文件
    if successful > 0 {
        let json = serde_json::to_string_pretty(&wallets).map_err(|e| e.to_string())?;
        std::fs::write(&wallets_path, json).map_err(|e| e.to_string())?;
    }
    
    Ok(BatchImportResult {
        total,
        successful,
        failed,
        details: results.clone(),
        results,
    })
}

#[tauri::command]
pub async fn get_wallets(app: tauri::AppHandle) -> Result<Vec<WalletAccount>, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let wallets_path = data_dir.join("wallets.json");
    
    if !wallets_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = std::fs::read_to_string(&wallets_path).map_err(|e| e.to_string())?;
    let wallets: Vec<WalletAccount> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    Ok(wallets)
}

#[tauri::command]
pub async fn export_wallets(
    app: tauri::AppHandle,
    addresses: Option<Vec<String>>,
) -> Result<Vec<ExportedWallet>, String> {
    let app_password = "unodrop_secure_password_2024";
    
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let wallets_path = data_dir.join("wallets.json");
    
    if !wallets_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = std::fs::read_to_string(&wallets_path).map_err(|e| e.to_string())?;
    let wallets: Vec<WalletAccount> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    let mut exported = Vec::new();
    
    for wallet in wallets {
        // 如果指定了地址列表，只导出指定的钱包
        if let Some(ref filter_addresses) = addresses {
            if !filter_addresses.iter().any(|a| a.eq_ignore_ascii_case(&wallet.address)) {
                continue;
            }
        }
        
        // 解密私钥
        let private_key = decrypt_private_key(&wallet.encrypted_key, app_password)?;
        
        // 解密助记词（如果有）
        let mnemonic = if let Some(ref encrypted_mnemonic) = wallet.encrypted_mnemonic {
            Some(decrypt_private_key(encrypted_mnemonic, app_password)?)
        } else {
            None
        };
        
        exported.push(ExportedWallet {
            name: wallet.name,
            address: wallet.address,
            private_key,
            mnemonic,
            created_at: Some(wallet.created_at),
        });
    }
    
    Ok(exported)
}

#[tauri::command]
pub async fn get_wallet_private_key(
    app: tauri::AppHandle,
    address: String,
) -> Result<String, String> {
    let app_password = "unodrop_secure_password_2024";
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let wallets_path = data_dir.join("wallets.json");
    
    if !wallets_path.exists() {
        return Err("钱包文件不存在".to_string());
    }
    
    let content = std::fs::read_to_string(&wallets_path).map_err(|e| e.to_string())?;
    let wallets: Vec<WalletAccount> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    // 查找指定地址的钱包
    let wallet = wallets.iter()
        .find(|w| w.address.eq_ignore_ascii_case(&address))
        .ok_or_else(|| "未找到该钱包".to_string())?;
    
    // 解密私钥
    let private_key = decrypt_private_key(&wallet.encrypted_key, app_password)?;
    
    Ok(private_key)
}

#[tauri::command]
pub async fn update_wallet_name(
    app: tauri::AppHandle,
    address: String,
    new_name: String,
) -> Result<bool, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let wallets_path = data_dir.join("wallets.json");
    
    if !wallets_path.exists() {
        return Ok(false);
    }
    
    let content = std::fs::read_to_string(&wallets_path).map_err(|e| e.to_string())?;
    let mut wallets: Vec<WalletAccount> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    // 查找并更新钱包名称
    let mut found = false;
    for wallet in &mut wallets {
        if wallet.address.eq_ignore_ascii_case(&address) {
            wallet.name = new_name.clone();
            found = true;
            break;
        }
    }
    
    if !found {
        return Ok(false);
    }
    
    // 保存更新
    let json = serde_json::to_string_pretty(&wallets).map_err(|e| e.to_string())?;
    std::fs::write(&wallets_path, json).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
pub async fn delete_wallet(app: tauri::AppHandle, address: String) -> Result<bool, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let wallets_path = data_dir.join("wallets.json");
    
    if !wallets_path.exists() {
        return Ok(false);
    }
    
    let content = std::fs::read_to_string(&wallets_path).map_err(|e| e.to_string())?;
    let mut wallets: Vec<WalletAccount> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    let original_len = wallets.len();
    wallets.retain(|w| !w.address.eq_ignore_ascii_case(&address));
    
    if wallets.len() == original_len {
        return Ok(false); // 没有找到要删除的钱包
    }
    
    let json = serde_json::to_string_pretty(&wallets).map_err(|e| e.to_string())?;
    std::fs::write(&wallets_path, json).map_err(|e| e.to_string())?;
    
    Ok(true)
}
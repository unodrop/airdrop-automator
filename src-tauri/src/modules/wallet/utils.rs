use sha2::{Digest, Sha256};

/// 简单的 XOR 加密（实际生产应使用 AES-GCM）
pub fn encrypt_data(data: &str, password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let key = hasher.finalize();
    
    let data_bytes = data.as_bytes();
    let encrypted: Vec<u8> = data_bytes
        .iter()
        .enumerate()
        .map(|(i, &b)| b ^ key[i % key.len()])
        .collect();
    
    hex::encode(encrypted)
}

/// 简单的 XOR 解密
pub fn decrypt_data(encrypted_hex: &str, password: &str) -> Result<String, String> {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let key = hasher.finalize();
    
    let encrypted_bytes = hex::decode(encrypted_hex).map_err(|e| e.to_string())?;
    
    let decrypted: Vec<u8> = encrypted_bytes
        .iter()
        .enumerate()
        .map(|(i, &b)| b ^ key[i % key.len()])
        .collect();
    
    String::from_utf8(decrypted).map_err(|e| e.to_string())
}

/// 别名：简单的 XOR 加密私钥
pub fn encrypt_private_key(private_key: &str, password: &str) -> String {
    encrypt_data(private_key, password)
}

/// 别名：简单的 XOR 解密私钥
pub fn decrypt_private_key(encrypted_hex: &str, password: &str) -> Result<String, String> {
    decrypt_data(encrypted_hex, password)
}

/// 验证并获取地址
pub fn validate_and_get_address(private_key_str: &str) -> Result<String, String> {
    use alloy::signers::local::PrivateKeySigner;
    
    let clean_key = if private_key_str.starts_with("0x") {
        &private_key_str[2..]
    } else {
        private_key_str
    };

    let signer = clean_key.parse::<PrivateKeySigner>()
        .map_err(|e| format!("Invalid private key: {}", e))?;

    Ok(format!("{:?}", signer.address()))
}

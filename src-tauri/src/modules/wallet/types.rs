use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WalletAccount {
    pub name: String,
    pub address: String,
    pub encrypted_key: String,
    pub encrypted_mnemonic: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ValidationResult {
    pub valid: bool,
    pub username: Option<String>,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct BatchImportResult {
    pub total: usize,
    pub successful: usize,
    pub failed: usize,
    pub details: Vec<SingleImportResult>,
    pub results: Vec<SingleImportResult>,
}

#[derive(Debug, Serialize, Clone)]
pub struct SingleImportResult {
    pub success: bool,
    pub address: Option<String>,
    pub error: Option<String>,
    pub index: Option<usize>,
    pub message: Option<String>,
    pub private_key_preview: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportedWallet {
    pub name: String,
    pub address: String,
    pub private_key: String,
    pub mnemonic: Option<String>,
    pub created_at: Option<String>,
}

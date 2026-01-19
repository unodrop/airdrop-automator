use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SocialAccount {
    pub platform: String,
    pub username: String,
    pub encrypted_token: String,
    pub wallet_address: String,
    pub verified: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct BatchSocialImportResult {
    pub total: usize,
    pub successful: usize,
    pub failed: usize,
    pub details: Vec<SingleSocialImportResult>,
}

#[derive(Debug, Serialize)]
pub struct SingleSocialImportResult {
    pub success: bool,
    pub platform: Option<String>,
    pub username: Option<String>,
    pub error: Option<String>,
    pub index: Option<usize>,
    pub message: Option<String>,
}

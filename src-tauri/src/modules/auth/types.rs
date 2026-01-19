use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoginCredentials {
    pub email: String,
    pub encrypted_password: String,
    pub encryption_key: String,
    pub mac_address: String,
    pub token: Option<String>,
    pub saved_at: String,
}

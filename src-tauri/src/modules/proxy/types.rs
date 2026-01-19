use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProxyIP {
    pub id: String,
    pub ip: String,
    pub port: u16,
    pub protocol: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub country: Option<String>,
    pub status: String,
    pub wallet_bindings: Vec<String>,
    pub created_at: String,
    pub last_used: Option<String>,
}

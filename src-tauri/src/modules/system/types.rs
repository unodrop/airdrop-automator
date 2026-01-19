use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub memory_total: u64,
    pub memory_used: u64,
    pub network_speed: u64,
    pub public_ip: String,
    pub proxy_enabled: bool,
    pub proxy_ip: Option<String>,
}

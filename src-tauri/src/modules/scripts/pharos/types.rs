use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PharosLoginResponse {
    pub code: i32,
    pub msg: String,
    pub data: Option<PharosLoginData>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PharosLoginData {
    pub jwt: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PharosBaseResponse {
    pub code: i32,
    pub msg: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PharosProfileResponse {
    pub code: i32,
    pub msg: String,
    pub data: Option<PharosProfileData>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PharosProfileData {
    pub user_info: Option<PharosUserInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PharosUserInfo {
    #[serde(rename = "ID")]
    pub id: u64,
    #[serde(rename = "TaskPoints")]
    pub task_points: u64,
    #[serde(rename = "TotalPoints")]
    pub total_points: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PharosTaskResult {
    pub success: bool,
    pub message: String,
    pub jwt: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PharosStatusResponse {
    pub is_running: bool,
    pub results: HashMap<String, PharosTaskResult>,
}

// Faucet related structs
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PharosFaucetStatusResponse {
    pub code: i32,
    pub msg: String,
    pub data: Option<PharosFaucetStatusData>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PharosFaucetStatusData {
    pub is_able_to_faucet: bool,
}

use serde::{Deserialize, Serialize};

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
pub struct PharosTaskResult {
    pub success: bool,
    pub message: String,
    pub jwt: Option<String>,
}

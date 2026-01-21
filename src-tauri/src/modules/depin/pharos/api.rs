use reqwest::Client;
use crate::common::http::create_client;
use super::types::*;
use reqwest::header::HeaderMap;

pub struct PharosClient {
    client: Client,
    address: String,
    jwt: Option<String>,
}

impl PharosClient {
    pub fn new(address: &str, jwt: Option<String>) -> Result<Self, String> {
        let client = create_client(None)?;
        Ok(Self {
            client,
            address: address.to_string(),
            jwt,
        })
    }
    
    fn headers(&self) -> HeaderMap {
        let mut headers = HeaderMap::new();
        let auth_val = if let Some(jwt) = &self.jwt {
            format!("Bearer {}", jwt)
        } else {
            "Bearer null".to_string()
        };
        
        headers.insert("authorization", auth_val.parse().unwrap());
        headers.insert("sec-ch-ua", "\"Chromium\";v=\"136\", \"Brave\";v=\"136\", \"Not.A/Brand\";v=\"99\"".parse().unwrap());
        headers.insert("sec-ch-ua-mobile", "?0".parse().unwrap());
        headers.insert("sec-ch-ua-platform", "\"Windows\"".parse().unwrap());
        headers.insert("sec-fetch-dest", "empty".parse().unwrap());
        headers.insert("sec-fetch-mode", "cors".parse().unwrap());
        headers.insert("sec-fetch-site", "same-site".parse().unwrap());
        headers.insert("sec-gpc", "1".parse().unwrap());
        headers.insert("Referer", "https://testnet.pharosnetwork.xyz/".parse().unwrap());
        headers.insert("Referrer-Policy", "strict-origin-when-cross-origin".parse().unwrap());
        
        headers
    }

    async fn get<T: serde::de::DeserializeOwned>(&self, url: &str) -> Result<T, String> {
        let response = self.client.get(url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        let text = response.text().await
            .map_err(|e| format!("Failed to read response: {}", e))?;
            
        serde_json::from_str::<T>(&text)
            .map_err(|e| format!("Failed to parse response: {} - Raw: {}", e, text))
    }

    async fn post<T: serde::de::DeserializeOwned>(&self, url: &str) -> Result<T, String> {
        let response = self.client.post(url)
            .headers(self.headers())
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        let text = response.text().await
            .map_err(|e| format!("Failed to read response: {}", e))?;
            
        serde_json::from_str::<T>(&text)
            .map_err(|e| format!("Failed to parse response: {} - Raw: {}", e, text))
    }

    pub async fn login(&self, signature: &str, invite_code: &str) -> Result<PharosLoginResponse, String> {
        let url = format!(
            "https://api.pharosnetwork.xyz/user/login?address={}&signature={}&invite_code={}",
            self.address, signature, invite_code
        );
        self.post(&url).await
    }
    
    pub async fn check_in(&self) -> Result<PharosBaseResponse, String> {
        let url = format!("https://api.pharosnetwork.xyz/sign/in?address={}", self.address);
        self.post(&url).await
    }
    
    pub async fn get_faucet_status(&self) -> Result<PharosFaucetStatusResponse, String> {
        let url = format!("https://api.pharosnetwork.xyz/faucet/status?address={}", self.address);
        self.get(&url).await
    }
    
    pub async fn claim_faucet(&self) -> Result<PharosBaseResponse, String> {
        let url = format!("https://api.pharosnetwork.xyz/faucet/daily?address={}", self.address);
        self.post(&url).await
    }
    
    pub async fn get_profile(&self) -> Result<PharosProfileResponse, String> {
        let url = format!("https://api.pharosnetwork.xyz/user/profile?address={}", self.address);
        self.get(&url).await
    }
}

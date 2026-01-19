use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT, ACCEPT, ACCEPT_LANGUAGE};
use reqwest::Client;

pub fn create_client(proxy: Option<String>) -> Result<Client, String> {
    let mut headers = HeaderMap::new();
    // Default headers
    headers.insert(ACCEPT, HeaderValue::from_static("application/json, text/plain, */*"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("en-US,en;q=0.8"));
    
    // Random user agent
    let user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    ];
    let ua_idx = rand::random::<usize>() % user_agents.len();
    headers.insert(USER_AGENT, HeaderValue::from_str(user_agents[ua_idx]).unwrap());

    let client_builder = Client::builder()
        .default_headers(headers);
        
    let client = if let Some(proxy_url) = proxy {
        if !proxy_url.is_empty() {
             client_builder.proxy(reqwest::Proxy::all(proxy_url).map_err(|e| e.to_string())?)
        } else {
            client_builder
        }
    } else {
        client_builder
    };
    
    client.build().map_err(|e| e.to_string())
}

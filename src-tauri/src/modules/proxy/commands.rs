use super::types::*;
use tauri::Manager;

#[tauri::command]
pub async fn get_proxies(app: tauri::AppHandle) -> Result<Vec<ProxyIP>, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let proxies_path = data_dir.join("proxies.json");
    
    if !proxies_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = std::fs::read_to_string(&proxies_path).map_err(|e| e.to_string())?;
    let proxies: Vec<ProxyIP> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    Ok(proxies)
}

#[tauri::command]
pub async fn add_proxy(
    app: tauri::AppHandle,
    ip: String,
    port: u16,
    protocol: String,
    username: Option<String>,
    password: Option<String>,
    country: Option<String>,
) -> Result<ProxyIP, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let proxies_path = data_dir.join("proxies.json");
    
    // 读取现有代理列表
    let mut proxies: Vec<ProxyIP> = if proxies_path.exists() {
        let content = std::fs::read_to_string(&proxies_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };
    
    // 检查是否已存在（相同IP和端口）
    let exists = proxies.iter().any(|p| p.ip == ip && p.port == port);
    if exists {
        return Err("该代理IP已经存在".to_string());
    }
    
    // 创建新代理
    let new_proxy = ProxyIP {
        id: format!("{}", proxies.len() + 1),
        ip: ip.clone(),
        port,
        protocol,
        username,
        password,
        country,
        status: "inactive".to_string(),
        wallet_bindings: Vec::new(),
        created_at: chrono::Utc::now().to_rfc3339(),
        last_used: None,
    };
    
    proxies.push(new_proxy.clone());
    
    // 保存到文件
    let json = serde_json::to_string_pretty(&proxies).map_err(|e| e.to_string())?;
    std::fs::write(&proxies_path, json).map_err(|e| e.to_string())?;
    
    Ok(new_proxy)
}

#[tauri::command]
pub async fn batch_add_proxies(
    app: tauri::AppHandle,
    proxies_text: String,
) -> Result<(usize, usize), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let proxies_path = data_dir.join("proxies.json");
    
    // 读取现有代理列表
    let mut existing_proxies: Vec<ProxyIP> = if proxies_path.exists() {
        let content = std::fs::read_to_string(&proxies_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };
    
    let mut success_count = 0;
    let mut fail_count = 0;
    
    // 解析每一行（格式：ip:port:protocol 或 ip:port:protocol:username:password）
    for line in proxies_text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        
        let parts: Vec<&str> = line.split(':').collect();
        if parts.len() < 3 {
            fail_count += 1;
            continue;
        }
        
        let ip = parts[0].to_string();
        let port = match parts[1].parse::<u16>() {
            Ok(p) => p,
            Err(_) => {
                fail_count += 1;
                continue;
            }
        };
        let protocol = parts[2].to_string();
        let username = if parts.len() > 3 { Some(parts[3].to_string()) } else { None };
        let password = if parts.len() > 4 { Some(parts[4].to_string()) } else { None };
        
        // 检查是否已存在
        let exists = existing_proxies.iter().any(|p| p.ip == ip && p.port == port);
        if exists {
            fail_count += 1;
            continue;
        }
        
        // 添加新代理
        let new_proxy = ProxyIP {
            id: format!("{}", existing_proxies.len() + 1),
            ip,
            port,
            protocol,
            username,
            password,
            country: None,
            status: "inactive".to_string(),
            wallet_bindings: Vec::new(),
            created_at: chrono::Utc::now().to_rfc3339(),
            last_used: None,
        };
        
        existing_proxies.push(new_proxy);
        success_count += 1;
    }
    
    // 保存到文件
    let json = serde_json::to_string_pretty(&existing_proxies).map_err(|e| e.to_string())?;
    std::fs::write(&proxies_path, json).map_err(|e| e.to_string())?;
    
    Ok((success_count, fail_count))
}

#[tauri::command]
pub async fn delete_proxy(app: tauri::AppHandle, id: String) -> Result<bool, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let proxies_path = data_dir.join("proxies.json");
    
    if !proxies_path.exists() {
        return Ok(false);
    }
    
    let content = std::fs::read_to_string(&proxies_path).map_err(|e| e.to_string())?;
    let mut proxies: Vec<ProxyIP> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    let original_len = proxies.len();
    proxies.retain(|p| p.id != id);
    
    if proxies.len() == original_len {
        return Ok(false);
    }
    
    let json = serde_json::to_string_pretty(&proxies).map_err(|e| e.to_string())?;
    std::fs::write(&proxies_path, json).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
pub async fn update_proxy(
    app: tauri::AppHandle,
    id: String,
    ip: Option<String>,
    port: Option<u16>,
    protocol: Option<String>,
    username: Option<String>,
    password: Option<String>,
    country: Option<String>,
    wallet_bindings: Option<Vec<String>>,
) -> Result<bool, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let proxies_path = data_dir.join("proxies.json");
    
    if !proxies_path.exists() {
        return Ok(false);
    }
    
    let content = std::fs::read_to_string(&proxies_path).map_err(|e| e.to_string())?;
    let mut proxies: Vec<ProxyIP> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    let mut found = false;
    for proxy in &mut proxies {
        if proxy.id == id {
            if let Some(new_ip) = ip {
                proxy.ip = new_ip;
            }
            if let Some(new_port) = port {
                proxy.port = new_port;
            }
            if let Some(new_protocol) = protocol {
                proxy.protocol = new_protocol;
            }
            if let Some(new_username) = username {
                proxy.username = Some(new_username);
            }
            if let Some(new_password) = password {
                proxy.password = Some(new_password);
            }
            if let Some(new_country) = country {
                proxy.country = Some(new_country);
            }
            if let Some(new_bindings) = wallet_bindings {
                proxy.wallet_bindings = new_bindings;
            }
            found = true;
            break;
        }
    }
    
    if !found {
        return Ok(false);
    }
    
    let json = serde_json::to_string_pretty(&proxies).map_err(|e| e.to_string())?;
    std::fs::write(&proxies_path, json).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
pub async fn ping_proxy(
    app: tauri::AppHandle,
    id: String,
) -> Result<(bool, Option<u64>), String> {
    use std::time::{Duration, Instant};
    use std::net::TcpStream;
    
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let proxies_path = data_dir.join("proxies.json");
    
    if !proxies_path.exists() {
        return Err("代理列表不存在".to_string());
    }
    
    let content = std::fs::read_to_string(&proxies_path).map_err(|e| e.to_string())?;
    let mut proxies: Vec<ProxyIP> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
    
    let proxy = proxies.iter_mut().find(|p| p.id == id);
    if proxy.is_none() {
        return Err("找不到指定的代理".to_string());
    }
    
    let proxy = proxy.unwrap();
    let addr = format!("{}:{}", proxy.ip, proxy.port);
    
    // 尝试连接
    let start = Instant::now();
    let result = TcpStream::connect_timeout(
        &addr.parse().map_err(|e| format!("无效的地址: {}", e))?,
        Duration::from_secs(5),
    );
    let elapsed = start.elapsed().as_millis() as u64;
    
    let success = result.is_ok();
    
    // 更新状态
    proxy.status = if success { "active".to_string() } else { "inactive".to_string() };
    proxy.last_used = Some(chrono::Utc::now().to_rfc3339());
    
    // 保存更新
    let json = serde_json::to_string_pretty(&proxies).map_err(|e| e.to_string())?;
    std::fs::write(&proxies_path, json).map_err(|e| e.to_string())?;
    
    Ok((success, if success { Some(elapsed) } else { None }))
}
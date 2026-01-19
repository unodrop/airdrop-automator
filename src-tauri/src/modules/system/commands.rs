use super::types::*;
use crate::modules::proxy::ProxyIP;
use tauri::Manager;
use sysinfo::System;
use clipboard::{ClipboardProvider, ClipboardContext};

#[tauri::command]
pub async fn get_system_info(app: tauri::AppHandle) -> Result<SystemInfo, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    // CPU使用率（使用新API）
    let cpu_usage = sys.global_cpu_usage();
    
    // 内存信息
    let memory_total = sys.total_memory();
    let memory_used = sys.used_memory();
    
    // 网络速度（简化为0，因为新版API需要不同的实现）
    let network_speed: u64 = 0;
    
    // 获取公网IP
    let public_ip = match reqwest::get("https://api.ipify.org").await {
        Ok(response) => response.text().await.unwrap_or_else(|_| "未知".to_string()),
        Err(_) => "未知".to_string(),
    };
    
    // 检查是否启用代理（从配置文件读取）
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let proxies_path = app_data_dir.join("proxies.json");
    
    let mut proxy_enabled = false;
    let mut proxy_ip: Option<String> = None;
    
    if proxies_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&proxies_path) {
            if let Ok(proxies) = serde_json::from_str::<Vec<ProxyIP>>(&content) {
                // 查找第一个active状态的代理
                if let Some(active_proxy) = proxies.iter().find(|p| p.status == "active") {
                    proxy_enabled = true;
                    proxy_ip = Some(format!("{}:{}", active_proxy.ip, active_proxy.port));
                }
            }
        }
    }
    
    Ok(SystemInfo {
        cpu_usage,
        memory_total,
        memory_used,
        network_speed,
        public_ip,
        proxy_enabled,
        proxy_ip,
    })
}

#[tauri::command]
pub fn copy_to_clipboard(text: String) -> Result<(), String> {
    let mut ctx: ClipboardContext = ClipboardProvider::new()
        .map_err(|e| format!("无法访问剪贴板: {}", e))?;
    ctx.set_contents(text)
        .map_err(|e| format!("复制失败: {}", e))?;
    Ok(())
}
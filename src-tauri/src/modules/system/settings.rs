use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub close_behavior: CloseBehavior,
    pub auto_start: bool,
    pub minimize_to_tray: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CloseBehavior {
    Exit,          // 退出程序
    MinimizeToTray, // 最小化到托盘
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            close_behavior: CloseBehavior::MinimizeToTray,
            auto_start: false,
            minimize_to_tray: true,
        }
    }
}

#[tauri::command]
pub fn get_app_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let settings_path = app_data_dir.join("settings.json");
    
    if !settings_path.exists() {
        return Ok(AppSettings::default());
    }
    
    let content = fs::read_to_string(&settings_path).map_err(|e| e.to_string())?;
    let settings: AppSettings = serde_json::from_str(&content).unwrap_or_default();
    
    Ok(settings)
}

#[tauri::command]
pub fn save_app_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    
    let settings_path = app_data_dir.join("settings.json");
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&settings_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

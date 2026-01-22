// 模块声明
mod modules;
pub mod common;
mod tray;

// 使用模块中的所有类型和命令
use modules::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 创建系统托盘
            tray::create_tray(&app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            use tauri::Manager;
            
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                
                // 读取用户设置
                let app_data_dir = match app.path().app_data_dir() {
                    Ok(dir) => dir,
                    Err(_) => {
                        std::process::exit(0);
                    }
                };
                
                let settings_path = app_data_dir.join("settings.json");
                
                let settings = if settings_path.exists() {
                    match std::fs::read_to_string(&settings_path) {
                        Ok(content) => {
                            serde_json::from_str::<system::AppSettings>(&content)
                                .unwrap_or_default()
                        }
                        Err(_) => system::AppSettings::default(),
                    }
                } else {
                    system::AppSettings::default()
                };
                
                match settings.close_behavior {
                    system::CloseBehavior::Exit => {
                        // 退出程序
                        std::process::exit(0);
                    }
                    system::CloseBehavior::MinimizeToTray => {
                        // 隐藏窗口到托盘
                        let _ = window.hide();
                        api.prevent_close();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // ========== 认证模块 (Auth) ==========
            auth::get_device_mac_address,
            auth::generate_encryption_key,
            auth::encrypt_password,
            auth::save_login_credentials,
            auth::get_saved_credentials,
            auth::clear_saved_credentials,
            
            // ========== 钱包模块 (Wallet) ==========
            wallet::batch_import_private_keys,
            wallet::batch_import_wallets,
            wallet::batch_create_wallets,
            wallet::get_wallets,
            wallet::export_wallets,
            wallet::get_wallet_private_key,
            wallet::update_wallet_name,
            wallet::delete_wallet,
            
            // ========== 社交账号模块 (Social) ==========
            social::validate_social_token,
            social::batch_import_social_accounts,
            social::import_social_account,
            social::get_social_accounts,
            social::delete_social_account,
            
            // ========== 代理模块 (Proxy) ==========
            proxy::get_proxies,
            proxy::add_proxy,
            proxy::batch_add_proxies,
            proxy::delete_proxy,
            proxy::update_proxy,
            proxy::ping_proxy,
            
            // ========== 系统模块 (System) ==========
            system::get_system_info,
            system::get_app_settings,
            system::save_app_settings,
            system::copy_to_clipboard,

            // ========== Pharos 模块 ==========
            modules::scripts::pharos::execute_pharos_login,
            modules::scripts::pharos::start_pharos_tasks,
            modules::scripts::pharos::stop_pharos_tasks,
            modules::scripts::pharos::get_pharos_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

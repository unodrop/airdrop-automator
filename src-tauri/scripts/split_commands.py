#!/usr/bin/env python3
"""
自动拆分 lib.rs 中的命令到各个模块的 commands.rs 文件
"""
import re
import os

# 模块配置：命令名 -> 模块名
COMMAND_MODULES = {
    # Auth模块 - 已手动创建
    'get_device_mac_address': None,
    'generate_encryption_key': None,
    'encrypt_password': None,
    'save_login_credentials': None,
    'get_saved_credentials': None,
    'clear_saved_credentials': None,
    
    # Wallet模块
    'batch_import_private_keys': 'wallet',
    'batch_create_wallets': 'wallet',
    'get_wallets': 'wallet',
    'export_wallets': 'wallet',
    'update_wallet_name': 'wallet',
    'delete_wallet': 'wallet',
    
    # Social模块
    'validate_social_token': 'social',
    'batch_import_social_accounts': 'social',
    'import_social_account': 'social',
    'get_social_accounts': 'social',
    'delete_social_account': 'social',
    
    # Proxy模块
    'get_proxies': 'proxy',
    'add_proxy': 'proxy',
    'batch_add_proxies': 'proxy',
    'delete_proxy': 'proxy',
    'update_proxy': 'proxy',
    'ping_proxy': 'proxy',
    
    # Browser模块
    'get_browser_config': 'browser',
    'save_browser_config': 'browser',
    'get_browser_windows': 'browser',
    'create_browser_window': 'browser',
    'update_browser_window': 'browser',
    'delete_browser_window': 'browser',
    'test_browser_api': 'browser',
    'check_browser_profiles': 'browser',
    'create_browser_profile_api': 'browser',
    'delete_browser_profile_api': 'browser',
    'update_browser_profile_api': 'browser',
    'start_browser_window': 'browser',
    'stop_browser_window': 'browser',
    'batch_start_windows': 'browser',
    'batch_stop_windows': 'browser',
    
    # System模块
    'get_system_info': 'system',
}

def extract_function(content, func_name):
    """提取函数代码"""
    # 匹配 #[tauri::command] 和函数定义
    pattern = rf'#\[tauri::command\]\s*(?:pub\s+)?(?:async\s+)?fn\s+{func_name}\s*\([^)]*\)'
    
    matches = list(re.finditer(pattern, content, re.MULTILINE))
    if not matches:
        return None
    
    start = matches[0].start()
    
    # 查找函数体的结束位置（匹配大括号）
    brace_count = 0
    in_function = False
    end = start
    
    for i in range(start, len(content)):
        if content[i] == '{':
            brace_count += 1
            in_function = True
        elif content[i] == '}':
            brace_count -= 1
            if in_function and brace_count == 0:
                end = i + 1
                break
    
    if end > start:
        return content[start:end]
    return None

def main():
    # 读取备份文件
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backup_path = os.path.join(script_dir, '..', 'src', 'lib.rs.backup')
    if not os.path.exists(backup_path):
        print(f"Error: {backup_path} not found")
        print(f"Looking in: {os.path.abspath(backup_path)}")
        return
    
    with open(backup_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 按模块分组命令
    modules = {}
    for cmd, module in COMMAND_MODULES.items():
        if module is None:  # 跳过已手动创建的
            continue
        if module not in modules:
            modules[module] = []
        modules[module].append(cmd)
    
    # 提取每个模块的命令
    for module, commands in modules.items():
        print(f"\nProcessing module: {module}")
        module_commands = []
        
        for cmd in commands:
            func_code = extract_function(content, cmd)
            if func_code:
                # 添加 pub 关键字
                func_code = func_code.replace('\nfn ', '\npub fn ')
                func_code = func_code.replace('\nasync fn ', '\npub async fn ')
                module_commands.append(func_code)
                print(f"  ✓ Extracted: {cmd}")
            else:
                print(f"  ✗ Not found: {cmd}")
        
        # 写入到模块的 commands.rs
        output_path = os.path.join(script_dir, '..', 'src', 'modules', module, 'commands.rs')
        
        # 生成文件头
        header = f"""use super::types::*;
use std::fs;

"""
        
        # 写入文件
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(header)
            f.write('\n\n'.join(module_commands))
        
        print(f"  ✓ Written to: {output_path}")

if __name__ == '__main__':
    main()

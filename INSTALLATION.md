# 安装和配置指南

## 系统要求

### 1. Chrome/Chromium 浏览器

浏览器自动化功能需要系统安装 Chrome 或 Chromium 浏览器。

**macOS:**
- 下载并安装 [Google Chrome](https://www.google.com/chrome/)
- 或使用 Homebrew: `brew install --cask google-chrome`

**Windows:**
- 下载并安装 [Google Chrome](https://www.google.com/chrome/)

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install google-chrome-stable

# 或 Chromium
sudo apt-get install chromium-browser
```

### 2. Rust 开发环境

确保已安装 Rust 和 Cargo:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 3. Node.js 和 Bun

```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 或使用 npm
npm install -g bun
```

## 项目安装

### 1. 克隆项目并安装依赖

```bash
cd /Users/terry/Desktop/unodrop

# 安装前端依赖
bun install

# 构建 Rust 后端（首次）
cd src-tauri
cargo build
cd ..
```

### 2. 配置 Chrome 路径（可选）

如果 Chrome 不在默认路径，可以配置环境变量:

**macOS/Linux:**
```bash
export CHROME_PATH="/path/to/google-chrome"
```

**Windows:**
```cmd
set CHROME_PATH=C:\path\to\chrome.exe
```

## 运行项目

### 开发模式

```bash
# 方式一：使用 npm
npm run tauri dev

# 方式二：使用 bun
bun run tauri dev
```

### 生产构建

```bash
npm run tauri build
```

## 常见问题

### 1. 端口 1420 被占用

```bash
# macOS/Linux
lsof -ti :1420 | xargs kill -9

# Windows
netstat -ano | findstr :1420
taskkill /PID <PID> /F
```

### 2. Chrome 无法启动

**错误**: `Failed to launch browser`

**解决方案**:
1. 确认 Chrome 已正确安装
2. macOS 用户需要第一次手动打开 Chrome，授予权限
3. 检查 Chrome 版本（需要较新版本）

### 3. 权限问题（macOS）

如果遇到"需要辅助功能权限"的提示：

1. 打开"系统偏好设置" > "安全性与隐私" > "隐私"
2. 选择"辅助功能"
3. 添加你的应用或终端到列表中

### 4. Rust 编译错误

清理并重新构建：

```bash
cd src-tauri
cargo clean
cargo build
cd ..
```

### 5. 浏览器自动化不工作

检查依赖是否正确安装：

```bash
cd src-tauri
cargo check
```

如果看到关于 `headless_chrome` 的错误：

```bash
cargo update headless_chrome
cargo build
```

## 测试浏览器自动化

### 快速测试

1. 启动应用: `npm run tauri dev`
2. 进入"普通浏览器"页面
3. 创建一个测试会话：
   - 名称: "测试"
   - URL: `https://google.com`
4. 点击"启动"按钮
5. 应该会看到 Chrome 浏览器窗口打开并导航到 Google

### 控制台测试

打开浏览器控制台 (F12)，运行：

```javascript
const { invoke } = await import('@tauri-apps/api/core');

// 创建会话
const sessionId = 'test-session-' + Date.now();
await invoke('create_browser_session', {
  session: {
    name: 'Console Test',
    url: 'https://google.com',
    wallet_address: '',
    social_accounts: [],
    auto_login: false
  }
});

// 启动浏览器
await invoke('start_browser_session', {
  sessionId,
  autoLogin: false
});

console.log('浏览器已启动！');
```

## 更新依赖

定期更新依赖以获取最新功能和修复：

```bash
# 前端依赖
bun update

# Rust 依赖
cd src-tauri
cargo update
cd ..
```

## 获取帮助

如果遇到问题：

1. 查看浏览器控制台的错误信息
2. 检查 Rust 编译输出
3. 查看 `BROWSER_AUTOMATION.md` 了解功能详情
4. 确保所有系统要求都已满足

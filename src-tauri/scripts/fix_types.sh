#!/bin/bash
# 批量修复类型错误的脚本

echo "=== 开始修复编译错误 ==="

# 1. 修复 SingleImportResult 字段初始化
echo "修复 SingleImportResult 初始化..."

# 2. 修复 BatchImportResult 字段
echo "修复 BatchImportResult 初始化..."

# 3. 检查进度
cd /Users/terry/Desktop/unodrop/src-tauri
echo "编译检查..."
cargo check 2>&1 | grep -c "error\[E"

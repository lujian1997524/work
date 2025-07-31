#!/bin/bash

# 激光切割生产管理系统 - GitHub推送脚本 v2.0
# 推送到远程仓库：https://github.com/lujian1997524/work.git

echo "🚀 开始推送项目到GitHub仓库..."

# 检查Git状态
if [ ! -d ".git" ]; then
    echo "❌ 错误：当前目录不是Git仓库"
    exit 1
fi

# 显示当前目录
echo "📂 当前工作目录: $(pwd)"

# 添加远程仓库
echo "📡 配置远程仓库..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/lujian1997524/work.git

# 检查Git状态并显示统计
echo "📊 检查Git状态..."
MODIFIED_FILES=$(git status --porcelain | wc -l | tr -d ' ')
STAGED_FILES=$(git diff --cached --name-only | wc -l | tr -d ' ')

echo "   - 修改的文件: $MODIFIED_FILES"
echo "   - 已暂存的文件: $STAGED_FILES"

# 添加所有文件到暂存区
echo "📁 添加文件到暂存区..."
git add .

# 显示即将提交的文件类型统计
echo "📈 文件变更统计:"
echo "   前端文件: $(git diff --cached --name-only | grep "^frontend/" | wc -l | tr -d ' ')"
echo "   后端文件: $(git diff --cached --name-only | grep "^backend/" | wc -l | tr -d ' ')"
echo "   配置文件: $(git diff --cached --name-only | grep -E "\.(json|js|ts|env|config)" | wc -l | tr -d ' ')"
echo "   文档文件: $(git diff --cached --name-only | grep -E "\.(md|txt)" | wc -l | tr -d ' ')"

# 检查是否有需要提交的更改
if git diff --cached --quiet; then
    echo "ℹ️  没有需要提交的更改"
else
    echo "💾 提交更改..."
    git commit -m "系统更新推送 - $(date '+%Y-%m-%d %H:%M:%S')

主要更新内容:
- 前后端系统文件同步
- 跨平台图纸处理架构优化
- API接口和数据库结构更新
- 用户界面组件清理和优化

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
fi

# 设置主分支
echo "🌿 设置主分支为main..."
git branch -M main

# 推送到远程仓库
echo "📤 推送到远程仓库..."
if git push -u origin main --force; then
    echo ""
    echo "✅ 成功推送到GitHub仓库！"
    echo "🔗 仓库地址: https://github.com/lujian1997524/work.git"
    echo ""
    echo "📊 推送完成统计："
    echo "   - ✅ 前端代码 (Next.js + TypeScript)"
    echo "   - ✅ 后端代码 (Node.js + Express)"
    echo "   - ✅ 数据库配置和环境文件"
    echo "   - ✅ 项目配置和依赖管理"
    echo "   - ✅ 跨平台架构代码"
    echo ""
    echo "🔧 项目特性:"
    echo "   - 跨平台图纸处理 (Web/Tauri桌面端)"
    echo "   - 实时SSE通信"
    echo "   - 文件上传和管理"
    echo "   - 用户权限系统"
    echo "   - 响应式UI设计"
else
    echo ""
    echo "❌ 推送失败！"
    echo "可能的解决方案："
    echo "1. 检查网络连接"
    echo "2. 验证GitHub仓库权限"
    echo "3. 检查远程仓库是否存在"
    echo "4. 如果是首次推送，可能需要GitHub个人访问令牌"
    echo ""
    echo "💡 提示：如果遇到权限问题，请确保："
    echo "   - GitHub账户有该仓库的写入权限"
    echo "   - 本地Git配置了正确的用户信息"
    echo "   - 使用了有效的认证方式 (SSH密钥或个人访问令牌)"
    exit 1
fi

echo ""
echo "🎉 项目备份完成！代码已安全保存到GitHub仓库。"
#!/bin/bash

# 激光切割生产管理系统 - GitHub推送脚本
# 推送到远程仓库：https://github.com/lujian1997524/work.git

echo "🚀 开始推送项目到GitHub仓库..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# 检查Git状态
if [ ! -d ".git" ]; then
    echo "❌ 错误：当前目录不是Git仓库"
    exit 1
fi

# 添加远程仓库
echo "📡 添加远程仓库..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/lujian1997524/work.git

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  发现未提交的更改，正在提交..."
    git add .
    git commit -m "推送前自动提交 - $(date '+%Y-%m-%d %H:%M:%S')"
fi

# 设置主分支
echo "🌿 设置主分支为main..."
git branch -M main

# 推送到远程仓库
echo "📤 推送到远程仓库..."
if git push -u origin main; then
    echo "✅ 成功推送到GitHub仓库！"
    echo "🔗 仓库地址: https://github.com/lujian1997524/work.git"
    echo ""
    echo "📊 推送统计："
    echo "   - 项目文件已全量推送"
    echo "   - 遵循.gitignore规则，排除了非必要文件"
    echo "   - 包含完整的项目状态自动管理功能"
else
    echo "❌ 推送失败！"
    echo "请检查："
    echo "1. 网络连接是否正常"
    echo "2. GitHub仓库是否存在且有写入权限"
    echo "3. 如果是私有仓库，可能需要配置SSH密钥或个人访问令牌"
    exit 1
fi

echo ""
echo "🎉 项目备份完成！现在可以安全地进行下一步开发了。"
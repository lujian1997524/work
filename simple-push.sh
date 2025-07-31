#!/bin/bash

# 激光切割生产管理系统 - 简单推送脚本
# 直接推送当前干净的仓库状态

echo "🚀 推送当前项目到GitHub..."

# 检查仓库状态
echo "📊 当前仓库状态："
echo "   文件总数: $(git ls-files | wc -l | tr -d ' ')"
echo "   仓库大小: $(du -sh .git | cut -f1)"

# 检查远程仓库
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "📡 添加远程仓库..."
    git remote add origin https://github.com/lujian1997524/work.git
fi

# 直接推送
echo "📤 推送到GitHub..."
if git push -u origin main --force; then
    echo ""
    echo "✅ 推送成功！"
    echo "🔗 仓库地址: https://github.com/lujian1997524/work.git"
    echo ""
    echo "📋 推送内容："
    echo "   - 前端代码 (Next.js + TypeScript)"  
    echo "   - 后端代码 (Node.js + Express)"
    echo "   - 配置文件和环境设置"
    echo "   - 数据库初始化脚本"
    echo "   - Tauri桌面端配置"
else
    echo "❌ 推送失败"
    echo "请检查网络连接和GitHub权限"
    exit 1
fi

echo ""
echo "🎉 备份完成！"
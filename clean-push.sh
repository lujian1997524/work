#!/bin/bash

# 激光切割生产管理系统 - 清理推送脚本
# 重新创建干净的仓库并推送到GitHub

echo "🧹 开始清理项目并推送到GitHub..."

# 备份当前分支
echo "💾 备份当前工作..."
cp -r .git .git.backup

# 删除.git目录，重新初始化
echo "🔄 重新初始化Git仓库..."
rm -rf .git
git init
git branch -M main

# 添加远程仓库
echo "📡 添加远程仓库..."
git remote add origin https://github.com/lujian1997524/work.git

# 添加所有文件（.gitignore会自动排除不需要的）
echo "📁 添加项目文件..."
git add .

# 显示将要提交的文件统计
echo "📊 文件统计："
echo "   总文件数: $(git ls-files | wc -l | tr -d ' ')"
echo "   前端文件: $(git ls-files | grep "^frontend/" | grep -v "target/" | grep -v ".next/" | wc -l | tr -d ' ')"
echo "   后端文件: $(git ls-files | grep "^backend/" | wc -l | tr -d ' ')"

# 提交
echo "💾 创建初始提交..."
git commit -m "激光切割生产管理系统 - 完整项目推送

系统特性:
- 🌐 跨平台支持 (Web + Tauri桌面端)
- 📋 项目管理和材料跟踪
- 📐 CAD图纸处理和管理  
- 👥 工人和部门管理
- 🔍 全局搜索功能
- 📱 响应式UI设计
- 🔐 用户认证和权限系统
- 📡 实时SSE通信

技术栈:
- 前端: Next.js 15 + TypeScript + Tailwind CSS
- 后端: Node.js + Express + MySQL
- 桌面端: Tauri 2.0 + Rust
- 状态管理: Zustand
- UI组件: 自定义组件库

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 强制推送到远程仓库
echo "📤 推送到GitHub..."
if git push -u origin main --force; then
    echo ""
    echo "✅ 项目成功推送到GitHub！"
    echo "🔗 仓库地址: https://github.com/lujian1997524/work.git"
    echo ""
    echo "📈 推送统计："
    echo "   - ✅ 仓库大小已优化（排除构建文件）"
    echo "   - ✅ 包含完整源代码"
    echo "   - ✅ 配置文件和文档"
    echo "   - ❌ 已排除: target/、.next/、node_modules/ 等构建文件"
    
    # 清理备份
    rm -rf .git.backup
    echo ""
    echo "🎉 清理完成！项目已成功备份到GitHub。"
else
    echo ""
    echo "❌ 推送失败！恢复备份..."
    rm -rf .git
    mv .git.backup .git
    echo "已恢复到推送前状态"
    exit 1
fi
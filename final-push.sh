#!/bin/bash

# 激光切割生产管理系统 - 最终推送脚本
# 清理仓库并推送到GitHub

echo "🧹 最终清理并推送项目..."

# 检查并清理不存在的文件
echo "🔍 清理索引中不存在的文件..."
git ls-files | while read -r file; do
    if [ ! -e "$file" ]; then
        echo "移除不存在的文件: $file"
        git rm --cached "$file" 2>/dev/null || true
    fi
done

# 检查当前文件大小
echo "📊 当前项目文件统计:"
TOTAL_SIZE=$(find . -type f -not -path './.git/*' -exec du -ch {} + | grep total | cut -f1)
echo "   项目总大小: $TOTAL_SIZE"
echo "   文件数量: $(find . -type f -not -path './.git/*' | wc -l | tr -d ' ')"

# 提交清理
if ! git diff --cached --exit-code >/dev/null; then
    git commit -m "清理不存在的文件索引"
fi

# 推送到GitHub
if git push -u origin main --force; then
    echo ""
    echo "✅ 推送成功!"
    echo "🔗 仓库地址: https://github.com/lujian1997524/work.git"
else
    echo "❌ 推送失败"
fi
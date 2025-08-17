#!/bin/bash

# 超级缓存清理脚本 - 服务器端使用
# 使用方法: ./super-cache-clear.sh

echo "🚀 启动超级缓存清理程序..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 清理计数器
CLEARED_COUNT=0

print_step() {
    echo -e "${BLUE}[步骤 $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CLEARED_COUNT++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 步骤1: 清理 Nginx 缓存 (如果使用)
print_step "1" "检查并清理 Nginx 缓存"
if command -v nginx &> /dev/null; then
    if [ -d "/var/cache/nginx" ]; then
        sudo rm -rf /var/cache/nginx/*
        print_success "Nginx 缓存已清理"
    else
        print_warning "未找到 Nginx 缓存目录"
    fi
    
    # 重载 Nginx 配置
    sudo nginx -s reload 2>/dev/null && print_success "Nginx 配置已重载" || print_warning "Nginx 重载失败"
else
    print_warning "未检测到 Nginx"
fi

# 步骤2: 清理 Apache 缓存 (如果使用)
print_step "2" "检查并清理 Apache 缓存"
if command -v apache2 &> /dev/null || command -v httpd &> /dev/null; then
    # 清理 mod_cache 缓存
    if [ -d "/var/cache/apache2" ]; then
        sudo rm -rf /var/cache/apache2/*
        print_success "Apache 缓存已清理"
    fi
    
    # 重启 Apache
    sudo systemctl reload apache2 2>/dev/null || sudo systemctl reload httpd 2>/dev/null
    print_success "Apache 已重载"
else
    print_warning "未检测到 Apache"
fi

# 步骤3: 清理 Node.js 应用缓存
print_step "3" "清理 Node.js 应用缓存"
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    print_success "Node.js 模块缓存已清理"
fi

if [ -d ".next" ]; then
    rm -rf .next
    print_success "Next.js 构建缓存已清理"
fi

if [ -d "dist" ]; then
    rm -rf dist
    print_success "构建输出目录已清理"
fi

# 步骤4: 清理 PM2 缓存 (如果使用)
print_step "4" "清理 PM2 缓存"
if command -v pm2 &> /dev/null; then
    pm2 flush
    print_success "PM2 日志缓存已清理"
else
    print_warning "未检测到 PM2"
fi

# 步骤5: 清理系统缓存
print_step "5" "清理系统缓存"
# 清理页面缓存和目录缓存
sync
echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null
print_success "系统内存缓存已清理"

# 步骤6: 清理 DNS 缓存
print_step "6" "清理 DNS 缓存"
if command -v systemd-resolve &> /dev/null; then
    sudo systemd-resolve --flush-caches
    print_success "systemd DNS 缓存已清理"
elif [ -f "/etc/init.d/nscd" ]; then
    sudo /etc/init.d/nscd restart
    print_success "nscd DNS 缓存已清理"
else
    print_warning "未找到 DNS 缓存服务"
fi

# 步骤7: 清理临时文件
print_step "7" "清理临时文件"
if [ -d "/tmp" ]; then
    sudo find /tmp -type f -name "*.tmp" -delete 2>/dev/null
    sudo find /tmp -type f -name "npm-*" -delete 2>/dev/null
    print_success "临时文件已清理"
fi

# 步骤8: 生成新的缓存破坏版本
print_step "8" "生成缓存破坏版本"
TIMESTAMP=$(date +%s)
RANDOM_HASH=$(openssl rand -hex 8)
VERSION_FILE="public/cache-version.json"

echo "{
  \"version\": \"${TIMESTAMP}\",
  \"hash\": \"${RANDOM_HASH}\",
  \"timestamp\": \"$(date -Iseconds)\",
  \"cleared_by\": \"super-cache-clear.sh\"
}" > $VERSION_FILE

print_success "缓存版本文件已生成: $VERSION_FILE"

# 步骤9: 设置强制无缓存环境变量
print_step "9" "设置强制无缓存环境"
export FORCE_NO_CACHE=true
export CACHE_BUSTER=$TIMESTAMP
print_success "无缓存环境变量已设置"

# 步骤10: 重启应用服务 (可选)
print_step "10" "重启应用服务 (可选)"
read -p "是否要重启应用服务? (y/N): " restart_choice
if [[ $restart_choice =~ ^[Yy]$ ]]; then
    if command -v pm2 &> /dev/null; then
        pm2 restart all
        print_success "PM2 应用已重启"
    elif systemctl list-units --type=service | grep -q "frontend"; then
        sudo systemctl restart frontend
        print_success "Frontend 服务已重启"
    else
        print_warning "未找到可重启的服务，请手动重启应用"
    fi
else
    print_warning "跳过服务重启"
fi

# 显示清理结果
echo
echo "🎉 超级缓存清理完成!"
echo "📊 清理统计: 共完成 $CLEARED_COUNT 项清理操作"
echo "⏰ 完成时间: $(date)"
echo
echo "🔧 建议后续操作:"
echo "  1. 在浏览器中访问: http://your-domain/force-clear-all.html"
echo "  2. 执行客户端缓存清理"
echo "  3. 使用无痕模式验证效果"
echo "  4. 检查网络面板确认资源重新加载"
echo
echo "🌐 缓存破坏版本: $TIMESTAMP"
echo "🔗 测试URL: http://your-domain/?v=$TIMESTAMP&no-cache=$RANDOM_HASH"
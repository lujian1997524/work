# 企业级DXF API部署检查清单

## 问题诊断
当前状况：
- ✅ 本地文件配置正确
- ❌ 服务器API路由404 - `/api/enterprise-dxf`
- ❌ 前端DXF预览无法加载

## 解决步骤

### 1. 确认文件上传
确保以下文件已正确上传到服务器：
```bash
/path/to/your/server/backend/src/routes/enterprise-dxf.js
/path/to/your/server/backend/src/app.js
```

### 2. 安装依赖包
在服务器后端目录执行：
```bash
cd /path/to/your/server/backend
npm install dxf-parser canvas
```

### 3. 创建缓存目录
在服务器创建DXF缓存目录：
```bash
mkdir -p /path/to/your/server/backend/cache/dxf
mkdir -p /path/to/your/server/backend/cache/dxf/thumbnails
mkdir -p /path/to/your/server/backend/cache/dxf/previews
```

### 4. 重启服务
重启后端Node.js服务：
```bash
# 如果使用PM2
pm2 restart backend

# 如果使用其他进程管理器，请相应调整
```

### 5. 验证安装
重启后，测试API：
```bash
# 基础路由应该返回认证错误而不是404
curl https://api.gei5.com/api/enterprise-dxf

# 应该返回: {"error":"未提供认证令牌"} 而不是 {"error":"接口不存在"}
```

## 常见问题排查

### 问题1：canvas依赖安装失败
如果canvas安装失败，可能需要安装系统依赖：
```bash
# Ubuntu/Debian
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install cairo-devel pango-devel libjpeg-turbo-devel giflib-devel
```

### 问题2：文件权限
确保Node.js进程有权限访问缓存目录：
```bash
chown -R your-nodejs-user:your-nodejs-group /path/to/cache/directory
chmod -R 755 /path/to/cache/directory
```

### 问题3：端口和防火墙
确保服务器防火墙允许对应端口的访问。

## 测试验证
完成上述步骤后，以下请求应该成功：
```bash
# 这应该返回401认证错误（说明路由存在）
curl https://api.gei5.com/api/enterprise-dxf/1/enterprise-info

# 前端DXF预览窗口应该显示预览图而不是一直加载
```

## 如果仍然有问题
请检查服务器日志，查找以下错误信息：
1. 模块加载错误
2. 依赖包缺失错误  
3. 权限访问错误
4. 语法错误

常见日志位置：
- PM2: `pm2 logs`
- 系统日志: `/var/log/` 下的相关日志文件
- 应用日志: 检查应用配置的日志输出位置
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 关键约束和禁令

### NPM 命令禁用
**绝对不允许 Claude 自动执行任何 npm 相关命令**，包括但不限于：
- `npm run dev`
- `npm run build` 
- `npm start`
- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm test`

**原因**：
- 构建命令会创建问题性的 .next 文件
- 开发期间不应该运行构建
- 用户希望完全控制何时运行这些命令

**正确做法**：
- 只能建议用户运行相应命令
- 如果需要验证，询问用户是否要运行
- 绝不主动执行

### 端口检查约束
每次需要启动服务前，**必须**先检查端口占用情况：
```bash
lsof -ti:4000    # 检查前端端口
lsof -ti:35001   # 检查后端端口
lsof -ti:3330    # 检查数据库端口
```
如果端口被占用，说明服务已运行，直接继续工作。

## 快速开始

### 初次设置（仅需一次）
```bash
# 1. 启动数据库服务
docker-compose up -d

# 2. 安装依赖
cd backend && npm install
cd frontend && npm install

# 3. 初始化数据库
cd backend && npm run init:db && npm run create:sample
```

### 日常开发工作流
```bash
# 1. 检查服务状态
lsof -ti:4000 && echo "前端已启动" || echo "前端未启动"
lsof -ti:35001 && echo "后端已启动" || echo "后端未启动"

# 2. 启动开发服务器（仅在未启动时）
cd frontend && npm run dev    # 前端: http://localhost:4000
cd backend && npm run dev     # 后端: http://localhost:35001

# 3. 健康检查
curl http://localhost:35001/health  # 后端 API
curl http://localhost:4000          # 前端服务
```

### 关键开发端点
- **主应用**: http://localhost:4000
- **组件系统**: http://localhost:4000/design-system
- **API测试**: http://localhost:4000/api-test
- **数据库管理**: http://localhost:8880 (phpMyAdmin)
- **后端健康检查**: http://localhost:35001/health

## 严格遵守
- 所有回复必须使用中文
- 所有注释必须使用中文
- 样式和 UI 尽可能使用/design-system的组件
- 任何时候没有我的百分百确认开始，不要修改任何代码，永远都是讨论出结果，经过我明确的确认之后，才能进行开发和修改工作
- **严禁使用 emoji**：全站统一使用 @heroicons/react 图标库，不允许在任何代码、界面、注释中使用 emoji 表情符号
- **图标规范**：所有图标必须使用 @heroicons/react/24/outline 或 @heroicons/react/24/solid，确保视觉风格统一
- 每次需要启动前端和后端的时候，先检测端口是否被占用，如果被占用说明服务已经启动了，不需要再次启动，直接继续
- 遵守YAGNI原则
- **开发阶段严禁构建**：开发过程中只使用 `npm run dev` 开发服务器，严禁使用 `npm run build` 构建命令。构建会产生 `.next` 等文件导致重复问题和错误。只在最终部署前才进行构建
- **语法错误检查方式**：使用开发服务器的热重载和浏览器控制台检查错误，或使用 `npx tsc --noEmit` 进行类型检查，不要用构建来检查语法错误
## 项目概述

这是一个激光切割生产管理系统，采用VS Code风格的界面布局，支持项目管理、板材状态追踪、图纸管理和工人资源管理。

### 技术架构
- **后端**: Node.js + Express + Sequelize ORM + MySQL 8.0 (Docker)
- **前端**: Next.js 15.4.3 + React 18 + TypeScript + Zustand状态管理
- **UI系统**: Tailwind CSS + @heroicons/react + iOS 18设计规范  
- **实时通信**: Server-Sent Events (SSE) + 音频通知
- **桌面应用**: Electron多平台打包

### 端口和服务
- 前端开发服务器: http://localhost:4000
- 后端API服务: http://localhost:35001  
- MySQL数据库: localhost:3330
- phpMyAdmin: http://localhost:8880

### 默认用户
- **高春强** (admin) - 管理员权限
- **杨伟** (operator) - 操作员权限

## 核心架构约束

### 状态管理架构
- **禁止WebSocket**: 用户明确要求弃用WebSocket复杂方案
- **强制Zustand**: 所有状态管理必须使用4个核心Store
  - `projectStore.ts` - 项目数据管理
  - `materialStore.ts` - 材料状态管理
  - `globalSyncStore.ts` - 全局状态同步
  - `notificationStore.ts` - 通知系统
- **事件驱动通信**: 使用浏览器原生事件系统实现组件间状态同步
  ```javascript
  // 触发更新
  window.dispatchEvent(new CustomEvent('materials-updated'));
  // 监听更新  
  window.addEventListener('materials-updated', () => { /* 处理逻辑 */ });
  ```

### API架构约束
- **直连模式**: 前端通过 `utils/api.ts` 的 `apiRequest()` 直接连接后端
- **JWT认证**: 所有API请求必须包含 `Authorization: Bearer <token>` 头
- **响应格式处理**: 处理后端包装响应 `{projects: [...]}` → `[...]`
- **四状态循环**: Material状态必须支持 `empty→pending→in_progress→completed→empty`

### 布局系统约束
- **VS Code风格**: 严格遵循 ActivityBar(64px) + Sidebar(220px) + MainContent 布局
- **MaterialsTable格式**: 序号-项目名-工人-2mm-3mm-4mm...-备注-开始时间-完成时间-图纸
- **禁止修改布局**: 用户明确要求保持左侧边栏+右侧表格设计

## 开发命令

### 环境搭建和服务启动
```bash
# 启动Docker服务 (MySQL + phpMyAdmin)
docker-compose up -d

# 安装依赖
cd backend && npm install
cd frontend && npm install

# 单独启动服务
cd frontend && npm run dev         # 前端端口4000 (Next.js开发服务器)
cd backend && npm run dev          # 后端端口35001 (nodemon热重载)

# 生产环境运行
cd frontend && npm run start       # 前端生产服务器
cd backend && npm run start        # 后端生产服务器
```

### 后端API架构
系统采用标准的RESTful API设计，支持直连模式（前端直接连接后端，不使用Next.js API路由）：

#### 核心API端点
- **认证模块** - `/api/auth` - JWT认证和用户登录
- **项目管理** - `/api/projects` - 项目CRUD、状态管理、工人分配
- **材料管理** - `/api/materials` - 板材状态切换（empty→pending→in_progress→completed）
- **厚度规格** - `/api/thickness-specs` - 动态厚度配置管理
- **工人管理** - `/api/workers` - 工人信息CRUD、部门分配
- **部门管理** - `/api/departments` - 部门增删改查
- **图纸管理** - `/api/drawings` - 文件上传、版本控制、DXF预览
- **全局搜索** - `/api/search` - 跨模块搜索功能
- **仪表盘** - `/api/dashboard` - 统计数据和概览信息
- **SSE通信** - `/api/sse` - Server-Sent Events实时通知

#### 数据库模型
- **users** (id, name, role) - 用户表
- **workers** (id, name, phone, email, department, position) - 工人表
- **projects** (id, name, status, priority, assigned_worker_id, created_by) - 项目表
- **thickness_specs** (id, thickness, unit, material_type, is_active, sort_order) - 厚度规格表
- **materials** (id, project_id, thickness_spec_id, status, completed_by, completed_date) - 板材表
- **drawings** (id, project_id, filename, file_path, version, uploaded_by) - 图纸表
- **operation_history** - 操作历史日志
- 扩展表：material_inventory、material_borrowing、cutting_records等

### 前端架构特点
- **直连后端模式**: 前端通过 `/utils/api.ts` 的 `apiRequest()` 函数直接连接后端API
- **VSCode风格布局**: ActivityBar(64px) + Sidebar(220px) + MainContent的三栏布局
- **iOS 18设计系统**: 毛玻璃效果、圆角设计、Apple Human Interface Guidelines
- **响应式设计**: 支持桌面/平板/移动端自适应
- **组件化架构**: 40+自研UI组件，高度模块化

#### 关键前端功能
- **实时状态管理**: 4个Zustand Store（projectStore、materialStore、notificationStore、globalSyncStore）
- **事件驱动通信**: 使用浏览器原生事件系统实现组件间通信
- **全局搜索**: Ctrl+K/Cmd+K快捷键，跨模块搜索功能
- **CAD文件处理**: DXF解析和Three.js 3D预览
- **音频通知系统**: 5种智能音效，操作反馈
- **实时通知**: SSE + 桌面通知 + 音频提示的多重反馈

### 开发流程
```bash
# 前端开发（热重载）
cd frontend && npm run dev

# 后端开发（nodemon）
cd backend && npm run dev
```

### 数据库管理命令
```bash
# 数据库操作（后端目录）
cd backend
npm run init:db                      # 初始化数据库结构
npm run create:sample                # 创建测试数据
node sync-db.js                      # 同步数据库结构更新
node create-sample-data.js           # 创建样本数据
node fix-users.js                    # 修复用户数据

# 数据库访问
# phpMyAdmin: http://localhost:8880
# 直连: mysql -h localhost -P 3330 -u laser_user -p laser_cutting_db
# 凭据: user=laser_user, pass=laser_pass, db=laser_cutting_db
```

### 代码检查命令（用户手动运行）
```bash
# TypeScript类型检查（不构建）
cd frontend && npx tsc --noEmit      # 语法验证，推荐方式

# 代码质量检查
cd frontend && npm run lint          # ESLint检查

# 注意：Claude 不能自动运行这些命令，只能建议用户运行
```

### 故障排除命令
```bash
# 检查服务状态
docker ps                           # Docker容器状态
docker-compose logs mysql           # MySQL日志
docker-compose logs phpmyadmin      # phpMyAdmin日志

# 端口占用检查
lsof -ti:4000                       # 前端端口
lsof -ti:35001                      # 后端端口
lsof -ti:3330                       # 数据库端口
lsof -ti:8880                       # phpMyAdmin端口

# 网络连接测试
curl http://localhost:35001/health  # 后端健康检查
curl http://localhost:4000          # 前端服务
curl http://localhost:8880          # phpMyAdmin
```

## 关键开发模式和工作流程

### 代码修改确认流程
1. **讨论阶段**: 分析需求，讨论实现方案
2. **方案确认**: 等待用户明确确认："开始实现"或"确认修改" 
3. **实施阶段**: 收到确认后进行代码修改
4. **状态同步**: 修改后触发相应的更新事件

### API请求标准模式
```javascript
// 前端API请求标准格式
const response = await apiRequest('/api/projects', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
// 处理响应格式
const data = response.projects || response;
```

### 组件开发约定
- 基于 `components/ui/` 中的基础组件构建
- 使用 @heroicons/react 图标，禁用emoji
- 遵循 iOS 18 & macOS 15 设计规范
- 中文注释和变量命名

### 状态更新标准流程
```javascript
// 1. 更新Store数据
const store = useProjectStore.getState();
await store.updateProject(projectData);

// 2. 触发全局事件
window.dispatchEvent(new CustomEvent('materials-updated'));

// 3. 音频反馈（如适用）
const audioManager = useAudioManager();
audioManager.play('success');
```


## 数据库结构

### 主要数据表
- **users** (id, name, role) - 用户认证
- **workers** (id, name, phone, email, department, position) - 工人信息  
- **projects** (id, name, status, priority, assigned_worker_id, created_by) - 项目管理
- **thickness_specs** (id, thickness, unit, material_type, is_active) - 厚度规格配置
- **materials** (id, project_id, thickness_spec_id, status, completed_by) - 板材状态
- **drawings** (id, project_id, filename, file_path, version, uploaded_by) - 图纸文件

### 数据库凭据
- 数据库: laser_cutting_db
- 用户: laser_user  
- 密码: laser_pass
- Root密码: root123456


## 常见问题和故障排除

### 服务启动问题
**问题**: 前端或后端无法启动
```bash
# 诊断步骤
1. 检查端口占用: lsof -ti:4000 lsof -ti:35001
2. 检查Docker服务: docker ps
3. 检查日志: docker-compose logs
4. 重启服务: docker-compose restart
```

### API连接问题
**症状**: 401错误、连接失败、CORS问题
```bash
# 解决方案
1. 确认JWT token有效性
2. 检查后端服务状态: curl http://localhost:35001/health
3. 验证CORS配置允许前端域名
4. 确认API端点路径正确: /api/projects 而非 /projects
```

### 数据库连接问题
**症状**: 数据库连接超时、表不存在
```bash
# 解决步骤
1. 检查MySQL容器: docker ps | grep mysql
2. 重新初始化: cd backend && npm run init:db
3. 检查凭据: user=laser_user, pass=laser_pass
4. 端口确认: 3330(开发) 而非 3306
```

### 状态同步问题
**症状**: 数据不更新、组件不同步
```javascript
// 检查要点
1. 确认事件触发: window.dispatchEvent(new CustomEvent('materials-updated'))
2. 确认事件监听: window.addEventListener('materials-updated', handler)
3. 确认Store更新: useProjectStore.getState().fetchProjects()
4. 避免WebSocket，使用Zustand+事件
```

## 关键文件位置

### 核心状态管理
- `frontend/stores/projectStore.ts` - 项目数据管理
- `frontend/stores/materialStore.ts` - 材料状态管理  
- `frontend/stores/globalSyncStore.ts` - 全局同步
- `frontend/stores/notificationStore.ts` - 通知系统

### 核心API文件
- `frontend/utils/api.ts` - API请求统一管理
- `backend/src/routes/` - API路由定义
- `backend/src/models/` - 数据模型
- `backend/src/middleware/auth.js` - JWT认证

### 核心UI组件
- `frontend/components/ui/StatusIndicator.tsx` - 四状态切换组件
- `frontend/components/layout/VSCodeLayout.tsx` - 主布局容器
- `frontend/components/layout/ActivityBar.tsx` - 活动栏导航
- `frontend/components/materials/MaterialsTable.tsx` - 主数据表格

### 配置文件
- `frontend/.env.local` - 前端环境配置
- `backend/src/config/envConfig.js` - 后端环境配置
- `docker-compose.yml` - 数据库容器配置
- `database/init/01-create-tables.sql` - 数据库结构

### 数据模型文件
- `backend/src/models/index.js` - Sequelize模型汇总和关联定义
- `backend/src/models/[Entity].js` - 各实体的Sequelize模型定义

### 认证和中间件
- `backend/src/middleware/auth.js` - JWT认证中间件
- `backend/src/middleware/validation.js` - 请求验证中间件
- `frontend/contexts/AuthContext.tsx` - 前端认证上下文


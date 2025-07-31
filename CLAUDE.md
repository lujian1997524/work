# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
## 🚨 绝对禁令

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

这是一个激光切割生产管理系统，专为公司内部使用而设计。系统支持部门间的生产计划协作，包含项目管理、板材状态追踪、图纸管理和工人资源管理等功能。

### 核心功能
- 项目管理（增加、编辑、查看生产项目）
- 板材状态追踪（不同厚度板材的完成状态管理）
- 图纸管理（上传图纸、版本控制）
- 工人资料管理（联系方式、负责项目）
- 用户认证（简单的姓名登录系统）
- 权限管理（管理员/操作员角色区分）

### 默认用户
- **高春强** - 管理员（admin）：拥有所有功能权限
- **杨伟** - 操作员（operator）：查看项目、编辑板材状态、上传图纸

## 技术架构

### 技术栈
- **后端**: Node.js + Express 4.21.2 + Sequelize ORM + MySQL 8.0（Docker部署）
- **前端**: Next.js 15.4.3 + React 18.3.1 + TypeScript 5.7.2
- **桌面应用**: Electron 33.0.0 + 多平台打包支持
- **状态管理**: Zustand 5.0.3（轻量级状态管理，替代复杂的WebSocket方案）
- **UI框架**: Tailwind CSS 3.4.16 + iOS 18 & macOS 15 设计系统
- **动画**: Framer Motion 11.16.0 + 流畅过渡效果
- **CAD处理**: DXF Parser + Three.js 0.178.0（3D预览）
- **数据库**: MySQL容器（端口3330）+ phpMyAdmin（端口8880）
- **实时通信**: Server-Sent Events (SSE) + 桌面通知
- **开发方式**: 网页优先开发，实时预览，最后打包为桌面应用

### 端口配置
- 前端 (Next.js): `http://0.0.0.0:4000` （支持局域网访问）
- 后端 API: `http://0.0.0.0:35001`
- MySQL 数据库: `localhost:3330`
- phpMyAdmin: `http://localhost:8880`

### 项目结构
```
work/
├── backend/                    # Node.js后端API
│   ├── src/
│   │   ├── controllers/        # 业务逻辑控制器
│   │   ├── models/            # Sequelize数据模型
│   │   ├── routes/            # API路由模块
│   │   ├── middleware/        # 认证、验证、错误处理中间件
│   │   ├── utils/             # 工具函数（SSE管理、操作历史等）
│   │   └── config/            # 环境配置管理
│   ├── uploads/               # 图纸文件存储
│   ├── create-sample-data.js  # 样本数据生成脚本
│   ├── fix-users.js          # 用户数据修复脚本
│   └── sync-db.js            # 数据库同步脚本
├── frontend/                   # Next.js + React应用
│   ├── app/                   # Next.js App Router页面
│   ├── components/            # React组件
│   │   ├── ui/               # 基础UI组件（40+自研组件）
│   │   ├── layout/           # VSCode风格布局组件
│   │   ├── materials/        # 材料/项目管理
│   │   ├── projects/         # 项目管理模块
│   │   ├── workers/          # 工人管理模块
│   │   ├── drawings/         # CAD图纸管理
│   │   ├── search/           # 全局搜索功能
│   │   └── auth/             # 认证组件
│   ├── contexts/             # React上下文（AuthContext）
│   ├── hooks/                # 自定义React Hooks
│   ├── stores/               # Zustand状态管理（4个核心Store）
│   ├── utils/                # 工具函数（API客户端、音频管理、SSE等）
│   ├── config/               # 配置管理
│   └── types/                # TypeScript类型定义
├── shared/                    # 前后端共享配置
├── database/                  # 数据库初始化脚本和迁移
├── docker-compose.yml        # MySQL + phpMyAdmin配置
└── CLAUDE.md                 # 开发指导文档
```

## 开发命令

### 环境搭建和服务启动
```bash
# 启动Docker服务 (MySQL + phpMyAdmin)
docker-compose up -d

# 安装依赖
cd backend && npm install
cd frontend && npm install

# 并发启动前后端服务（推荐）
npm run dev                        # 根目录并发启动
# 或单独启动
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

### 数据库管理和初始化
```bash
# 数据库管理界面
# 访问 phpMyAdmin: http://localhost:8880
# MySQL直连: host=localhost, port=3330, user=laser_user, password=laser_pass, db=laser_cutting_db

# 数据库初始化脚本
cd backend && node sync-db.js              # 同步数据库结构
cd backend && node create-sample-data.js   # 创建测试数据
cd backend && npm run init:db               # 数据库初始化
cd backend && npm run create:sample         # 创建样本数据
```

### 构建和打包
```bash
# 前端类型检查和代码质量
cd frontend && npx tsc --noEmit           # TypeScript类型检查
cd frontend && npm run lint               # ESLint代码检查

# 前端构建
cd frontend && npm run build              # Next.js生产构建
cd frontend && npm run build:static       # 静态导出构建
cd frontend && npm run start              # 启动生产服务器

# Electron桌面应用构建
cd frontend && npm run build:electron-ssr    # SSR模式桌面应用
cd frontend && npm run build:electron-static # 静态模式桌面应用
cd frontend && npm run build:win-ssr         # Windows版本(SSR)
cd frontend && npm run build:win-static      # Windows版本(静态)
cd frontend && npm run build:mac-ssr         # macOS版本(SSR)

# 后端生产运行
cd backend && npm run production          # 生产环境启动
cd backend && npm run install:prod        # 仅安装生产依赖

# 开发调试页面
# http://localhost:4000/design-system - UI组件展示
# http://localhost:4000/api-test - API接口测试
# http://localhost:35001/health - 后端健康检查
```

## 环境配置与部署

### 环境配置架构
系统采用统一的配置管理策略，支持开发和生产环境的灵活切换：

#### 环境配置文件
- **`shared/config.js`** - 统一配置常量，避免硬编码
  - 生产环境服务器：`110.40.71.83`
  - 开发环境服务器：`localhost`
  - 端口配置：前端4000，后端35001，数据库3330(开发)/3306(生产)

- **`backend/src/config/envConfig.js`** - 后端环境配置管理
  - 自动检测环境类型（development/production）
  - 动态配置数据库连接、CORS源、JWT密钥
  - 智能日志输出和配置验证

- **`frontend/.env.local`** - 前端环境变量
  - NEXT_PUBLIC_BACKEND_HOST - 后端服务器地址
  - NEXT_PUBLIC_BACKEND_PORT - 后端端口
  - NODE_ENV - 环境类型

#### API代理配置
前端使用Next.js API重写功能实现后端代理：
```javascript
// frontend/next.config.js
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://110.40.71.83:35001/api/:path*'  // 生产服务器
    }
  ]
}
```

### 部署和版本管理
#### GitHub自动部署
- **`push-to-github.sh`** - 自动推送脚本
  - 远程仓库：`https://github.com/lujian1997524/tianhui.git`
  - 自动提交未保存的更改，时间戳格式化
  - 智能错误处理和推送状态反馈

#### Docker容器化开发
```yaml
# docker-compose.yml
services:
  mysql:        # 端口3330，数据库laser_cutting_db
  phpmyadmin:   # 端口8880，Web管理界面
```

#### Electron桌面应用打包
支持多平台打包：Windows NSIS安装包、便携版、macOS DMG、Linux AppImage

## 状态管理架构

### Zustand 状态管理
系统采用 Zustand 替代了复杂的 WebSocket 方案，实现简洁高效的状态管理：

#### 核心 Store 模块
- **`projectStore.ts`** - 项目数据管理
  - 项目CRUD操作（创建、读取、更新、删除）
  - JWT认证集成，自动处理授权头
  - 响应数据解析（处理后端包装的响应格式）
  - 事件监听器支持（监听 'materials-updated' 事件）

- **`materialStore.ts`** - 材料状态管理  
  - 材料状态更新（pending → in_progress → completed → empty 循环）
  - 自动日期处理（开始时间、完成时间）
  - 与项目数据的关联管理

- **`globalSyncStore.ts`** - 全局状态同步管理
  - 在线/离线状态跟踪
  - 同步错误管理和日志记录
  - 跨组件事件监听和状态同步
  - 支持项目创建、更新、材料状态变更等事件监听

- **`notificationStore.ts`** - 通知系统管理
  - SSE (Server-Sent Events) 连接管理
  - 实时通知显示和音频提示
  - 通知去重和自动清理机制
  - 桌面通知和应用内通知集成

#### 事件驱动通信
```javascript
// 组件间通信示例
window.dispatchEvent(new CustomEvent('materials-updated'));
window.addEventListener('materials-updated', () => {
  const store = useProjectStore.getState();
  store.fetchProjects();
});
```

#### 状态同步机制
- 使用浏览器原生事件系统实现组件间状态同步
- 支持跨组件实时数据更新，无需手动刷新
- 轻量级事件模型，避免了 WebSocket 的复杂性

### 音频管理系统
系统集成了智能音频提示功能，增强用户体验：

#### 音频管理器特性
- **智能音效选择**: 根据操作类型自动选择合适的提示音
  - `info.wav` - 项目创建、一般状态变更
  - `success.wav` - 进入进行中状态  
  - `wancheng.wav` - 已完成状态
  - `error.wav` - 项目删除
  - `warning.wav` - 警告提示
- **浏览器兼容性**: 处理现代浏览器的自动播放策略
- **用户偏好设置**: 支持音效开关和音量调节
- **音频预加载**: 提升播放响应速度

### 实时通知系统
集成SSE和桌面通知，提供完整的实时反馈：

#### 通知功能特性
- **SSE实时连接**: 基于Server-Sent Events的实时数据推送
- **智能去重**: 防止短时间内重复通知
- **多重提示**: 应用内通知 + 桌面通知 + 音频提示
- **自动清理**: 支持通知自动消失和手动清理

## 数据模型与API架构

### 核心数据模型
系统基于Sequelize ORM实现，支持完整的关联关系管理：

#### 主要实体表结构
- **`users`** - 用户表：基于姓名的简单认证（id, name, role）
- **`workers`** - 工人表：员工信息管理（id, name, phone, email, department, position）
- **`departments`** - 部门表：工人部门组织结构
- **`projects`** - 项目表：生产项目管理（id, name, status, priority, assigned_worker_id, created_by）
- **`thickness_specs`** - 厚度规格表：可配置的板材厚度规格（id, thickness, unit, material_type, is_active, sort_order）
- **`materials`** - 板材表：项目材料状态管理（id, project_id, thickness_spec_id, status, completed_by, completed_date）
- **`drawings`** - 图纸表：文件上传和版本控制（id, project_id, filename, file_path, version, uploaded_by）

#### 扩展功能模型
- **`material_inventory`** - 材料库存管理
- **`material_borrowing`** - 材料借用记录
- **`material_remainder`** - 材料剩余量管理
- **`cutting_records`** - 切割记录
- **`operation_history`** - 操作历史日志

### REST API架构
后端采用Express.js框架，提供完整的RESTful API：

#### 核心API端点
- **认证模块** - `/api/auth` - JWT认证和用户登录
- **项目管理** - `/api/projects` - 项目CRUD操作，支持状态管理和工人分配
- **材料管理** - `/api/materials` - 板材状态切换（empty→pending→in_progress→completed→empty）
- **工人管理** - `/api/workers` - 工人信息CRUD，联系方式和项目分配
- **部门管理** - `/api/departments` - 部门的增删改查，用于工人管理侧边栏
- **图纸管理** - `/api/drawings` - 文件上传、版本控制、DXF预览
- **厚度规格** - `/api/thickness-specs` - 动态厚度配置管理
- **全局搜索** - `/api/search` - 跨模块搜索功能
- **仪表盘** - `/api/dashboard` - 统计数据和概览信息
- **SSE通信** - `/api/sse` - Server-Sent Events实时通知

#### 中间件架构
- **`middleware/auth.js`** - JWT认证中间件，自动用户验证
- **`middleware/validation.js`** - 请求参数验证和数据清洗
- **`utils/operationHistory.js`** - 操作历史记录工具
- **`utils/sseManager.js`** - SSE连接管理器

### 文件上传与处理
- **存储路径**: `backend/uploads/drawings/` - 图纸文件存储
- **支持格式**: DXF、DWG、PDF、图片格式
- **文件处理**: 使用multer处理上传，sharp处理图像优化
- **预览功能**: 集成dxf-parser和three.js实现CAD文件预览

## 核心功能和数据模型

### 关键功能
- **项目树形导航** - 侧边栏中的层级项目组织
- **动态板材表格** - 根据厚度规格生成列，水平布局显示（序号-项目名-工人-2mm-3mm-4mm...-备注-开始时间-完成时间-图纸）
- **四状态管理** - 支持空白、待处理、进行中、已完成四个状态的可视化指示器和交互式切换
- **图纸上传** - 文件管理，支持版本历史
- **实时状态同步** - 通过Zustand和自定义事件实现状态变更的实时反映

## 设计系统

### iOS 18 & macOS 15 风格
- **色彩系统**: iOS 18 系统色彩（#0A84FF蓝色，#30D158绿色等）
- **字体系统**: SF Pro Display字体系列，iOS文字大小层级
- **组件风格**: 毛玻璃拟态效果、动态岛风格、圆角设计
- **动画效果**: Framer Motion实现流畅过渡和微交互

### 组件架构
- **基础UI组件**: Button、Card、Input、StatusIndicator、StatusToggle 位于 `/components/ui/`
- **功能组件**: 按领域组织（projects、workers、materials、drawings）
- **布局组件**: MainLayout、Sidebar、Header 保证结构一致性
- **状态管理**: 使用Zustand stores（projectStore、materialStore）进行数据管理

## 开发原则

### 代码质量要求
- **简洁优先** - 在保证功能完整的前提下，保持代码简洁明了
- **逻辑清晰** - 避免过度复杂的逻辑结构，优先选择直观易懂的实现方式
- **精简设计** - 避免代码臃肿，每个组件和函数都应有明确的单一职责
- **渐进增强** - 先实现核心功能，再逐步添加高级特性
- **可维护性** - 代码应该易于理解和修改，避免过度抽象

### 开发方式

#### 网页优先策略
1. 所有功能先在浏览器中开发和测试：`http://localhost:4000`
2. 开发专用页面：`/design-system`（组件展示）、`/api-test`（API测试）
3. 实时预览和热重载，快速迭代
4. Electron打包作为最后步骤

#### API集成
- REST API，使用 `/api/` 前缀，从前端代理到后端
- Next.js配置API代理：`/api/:path*` → `http://localhost:35001/api/:path*`
- JWT认证，基于角色的访问控制
- 文件上传处理（图纸管理，存储在 `backend/uploads/drawings/`）
- 使用Zustand进行客户端状态管理，通过自定义事件实现组件间通信

#### 关键API端点
- **部门管理**: `/api/departments` (GET/POST/PUT/DELETE) - 用于WorkersSidebar的部门CRUD操作
- **工人管理**: `/api/workers` (GET/POST/PUT/DELETE) - 工人信息管理
- **项目管理**: `/api/projects` - 项目CRUD和状态管理
- **材料管理**: `/api/materials` - 板材状态切换和数据同步
- **图纸管理**: `/api/drawings` - 文件上传和版本控制
- **认证端点**: `/api/auth` - JWT认证和用户登录

#### 专用开发页面
- `/design-system` - UI组件展示和测试
- `/api-test` - API接口测试工具
- `/project-tree-demo` - 项目树形结构演示

## 数据库结构

主要表及关系：
- `users` (id, name, role) - 用户表
- `workers` (id, name, phone, email, department, position) - 工人表
- `projects` (id, name, status, priority, assigned_worker_id, created_by) - 项目表
- `thickness_specs` (id, thickness, unit, material_type, is_active, sort_order) - 厚度规格表
- `materials` (id, project_id, thickness_spec_id, status, completed_by, completed_date) - 板材表
- `drawings` (id, project_id, filename, file_path, version, uploaded_by) - 图纸表

### 数据库连接信息
- **数据库名**: laser_cutting_db
- **用户名**: laser_user
- **密码**: laser_pass
- **Root密码**: root123456

### 重要文件和配置

#### 环境配置文件
- **`frontend/.env.example`** - 前端环境配置模板
  - API连接配置（API_URL、超时时间）
  - 功能开关（通知、SSE、离线模式）
  - UI配置（主题、语言、侧边栏宽度）
  - 网络配置（重试次数、延迟设置）

- **`backend/.env`** - 后端环境配置
  - 服务器IP和端口配置
  - 数据库连接信息
  - JWT密钥和过期时间
  - 文件上传限制配置

#### 状态管理相关文件
- **`frontend/stores/projectStore.ts`** - 项目数据的 Zustand Store
  - 支持项目 CRUD 操作，集成 JWT 认证
  - 监听 'materials-updated' 事件自动刷新数据
  - 处理后端包装响应格式 `{projects: [...]}` → `[...]`

- **`frontend/stores/materialStore.ts`** - 材料状态的 Zustand Store  
  - 处理材料状态循环：`empty → pending → in_progress → completed → empty`
  - 自动设置开始时间和完成时间
  - 集成用户认证和错误处理

- **`frontend/stores/globalSyncStore.ts`** - 全局状态同步的 Zustand Store
  - 在线/离线状态监控和网络连接管理
  - 跨组件事件监听（project-created、project-updated、material-updated）
  - 同步错误追踪和日志记录

- **`frontend/stores/notificationStore.ts`** - 通知系统的 Zustand Store
  - SSE连接管理和实时通知接收
  - 通知去重逻辑和自动清理机制
  - 音频提示和桌面通知集成

- **`frontend/stores/index.ts`** - 所有Store的统一导出
  - 统一的类型导出和Store访问接口

#### 核心组件文件
- **`frontend/components/materials/MaterialsTable.tsx`** - 主要数据表格
  - 水平厚度列布局：序号-项目名-工人-2mm-3mm-4mm...-备注-开始时间-完成时间-图纸
  - 集成 StatusToggle 组件实现交互式状态切换
  - 支持空状态处理（删除材料记录）
  - API 集成和实时数据同步

- **`frontend/components/ui/StatusIndicator.tsx`** - 状态指示器和切换组件
  - 四状态支持：`empty | pending | in_progress | completed`
  - StatusToggle 组件提供点击切换功能
  - 视觉样式配置和动画效果（Framer Motion）
  - 循环状态切换逻辑

#### 工具类和管理器
- **`frontend/utils/audioManager.ts`** - 音频管理器
  - 智能音效选择和播放控制
  - 浏览器自动播放策略处理
  - 用户偏好设置和音频预加载

- **`frontend/utils/notificationManager.ts`** - 通知管理器
  - 桌面通知权限管理和显示
  - 通知样式和交互处理

- **`frontend/utils/sseManager.ts`** - SSE连接管理器
  - Server-Sent Events连接建立和维护
  - 实时数据推送和错误处理

- **`frontend/utils/apiClient.ts`** - API客户端工具
  - 统一的HTTP请求处理和错误管理
  - JWT认证和请求拦截器

### 关键配置文件
- `frontend/next.config.js` - Next.js配置，包含API代理设置和Electron优化
- `frontend/package.json` - Electron构建配置，支持Windows/macOS/Linux打包
- `frontend/tailwind.config.js` - Tailwind CSS配置
- `frontend/tsconfig.json` - TypeScript配置
- `docker-compose.yml` - MySQL和phpMyAdmin容器配置
- `database/init/01-create-tables.sql` - 数据库表结构定义

### 数据模型文件
- `backend/src/models/index.js` - Sequelize模型汇总和关联定义
- `backend/src/models/[Entity].js` - 各实体的Sequelize模型定义

### 认证和中间件
- `backend/src/middleware/auth.js` - JWT认证中间件
- `backend/src/middleware/validation.js` - 请求验证中间件
- `frontend/contexts/AuthContext.tsx` - 前端认证上下文

## 测试和质量保证

### 预览和测试策略
- 每个开发阶段都有专用预览URL
- 通过设计系统展示页面进行组件测试
- 通过专用测试界面进行API测试
- Electron打包前进行跨浏览器兼容性测试

### 用户角色和权限
- **管理员**（高春强）：系统完整访问权限、用户管理、厚度规格配置
- **操作员**（杨伟）：项目查看、板材状态更新、图纸上传

## 部署

### 开发环境
- Docker Compose用于本地MySQL和phpMyAdmin
- Next.js开发服务器，包含API代理
- Express服务器用于后端API

### 生产打包
- Next.js静态导出，集成Electron
- Electron builder生成Windows exe文件
- 后端部署为独立Node.js服务

## 近期更新和已解决问题

### 2025-07-29 最新更新记录
1. **音频管理系统集成** - 全新的智能音频提示功能
   - 实现了智能音效选择，根据操作类型自动播放合适的提示音
   - 集成浏览器自动播放策略处理，兼容现代浏览器安全限制
   - 支持用户音效偏好设置（开关、音量调节）
   - 音频预加载机制，提升响应速度

2. **实时通知系统** - 基于SSE的完整通知解决方案
   - 实现Server-Sent Events实时数据推送
   - 集成应用内通知、桌面通知和音频提示的多重反馈
   - 智能通知去重，避免短时间内重复通知
   - 自动清理机制和通知持久化管理

3. **全局状态同步优化** - 增强的状态管理架构
   - 新增globalSyncStore管理在线/离线状态
   - 实现跨组件事件监听和状态同步
   - 同步错误追踪和日志记录功能
   - 网络连接状态实时监控

### 2025-07-28 更新记录
1. **VS Code风格布局系统** - 完全重构了界面布局架构
   - 实现了VS Code风格的活动栏（ActivityBar）+ 侧边栏（Sidebar）+ 主内容区布局
   - 活动栏使用Heroicons图标，支持活跃项目、过往项目、图纸库、工人管理、仪表盘等视图切换
   - 默认显示活跃项目侧边栏，图标选中状态优化了视觉效果
   - 响应式设计，在桌面/平板/移动端都有适配

2. **工人管理侧边栏** - 新增部门管理功能
   - 创建了WorkersSidebar组件，支持部门的创建、编辑、删除操作
   - 部门API使用 `/api/departments` 端点（不是 `/api/workers/departments`）
   - 集成到主应用的VS Code布局中，通过活动栏切换到工人管理视图
   - 支持管理员权限控制，只有admin用户可以管理部门

3. **ActivityBar组件优化**
   - 从文本按钮改为图标显示，大幅减少活动栏宽度（从192px到64px）
   - 修复了选中状态的视觉问题，使用浅蓝色背景和蓝色图标提高可见性
   - 支持搜索功能集成（Ctrl+K / Cmd+K快捷键）

### 2025-07-24 更新记录
1. **完全弃用WebSocket** - 用户明确要求弃用WebSocket，因为"websocket 有点过于复杂了"
   - 实现了基于Zustand的轻量级状态管理方案
   - 使用浏览器原生事件系统实现组件间通信
   - 避免了WebSocket的复杂性，同时保持实时更新功能

2. **MaterialsTable 表格布局优化**
   - 用户要求的水平厚度列格式：序号-项目名-工人-2mm-3mm-4mm...-备注-开始时间-完成时间-图纸
   - 保持原有的左侧边栏 + 右侧表格布局设计
   - 集成StatusToggle组件实现交互式状态切换

3. **四状态管理系统**
   - 扩展StatusToggle支持四个状态：空白 → 待处理 → 进行中 → 已完成 → 空白（循环）
   - 空白状态会删除对应的材料记录
   - 自动处理开始时间和完成时间设置

4. **API和认证修复**
   - 修复了API路由和认证相关的401错误
   - 添加了缺失的`GET /api/materials`端点
   - 修复了API请求字段名称匹配问题（camelCase vs snake_case）
   - 处理后端包装响应格式的数据解析

### 系统当前状态
- ✅ VS Code风格布局系统完全正常工作
- ✅ ActivityBar活动栏图标导航正常
- ✅ WorkersSidebar部门管理功能完全集成
- ✅ Zustand状态管理正常工作（4个核心Store）
- ✅ MaterialsTable 四状态切换功能完全正常
- ✅ API认证和数据同步正常
- ✅ 事件驱动的实时更新机制工作正常
- ✅ 智能音频提示系统完全集成
- ✅ SSE实时通知系统正常运行
- ✅ 桌面通知和应用内通知功能正常
- ✅ 全局状态同步和错误追踪正常
- ✅ 后端日志显示所有API调用成功执行
- ✅ 用户可以正常使用状态切换和数据管理功能

## 重要开发注意事项

### 用户偏好和限制
- **绝对禁止**修改用户的表格布局设计（保持左侧边栏+右侧表格）
- **严格遵循**用户指定的MaterialsTable格式要求
- **必须使用中文**进行所有回复和注释
- **状态管理**必须使用Zustand，不得重新引入WebSocket

### 关键实现细节
- StatusToggle 必须支持四状态循环切换
- 空状态处理需要删除数据库记录
- API调用必须包含正确的JWT认证头
- 事件系统用于组件间通信：`window.dispatchEvent(new CustomEvent('materials-updated'))`

## 完成的任务清单
项目目前已经完成了以下主要功能：
- ✅ VS Code风格界面布局（ActivityBar + Sidebar + MainContent）
- ✅ 用户认证系统（基于姓名的简单登录）
- ✅ 项目管理模块（CRUD操作）
- ✅ 工人资料管理和部门管理（WorkersSidebar集成）
- ✅ 四状态材料管理系统（empty → pending → in_progress → completed → empty）
- ✅ 动态厚度规格配置
- ✅ 图纸文件上传和版本控制
- ✅ 实时状态同步（Zustand + 自定义事件）
- ✅ iOS 18 & macOS 15 设计系统
- ✅ 数据库结构和关联关系
- ✅ API认证和权限控制
- ✅ Docker 容器化开发环境
- ✅ 智能音频提示系统（5种音效，智能选择）
- ✅ SSE实时通知系统（Server-Sent Events）
- ✅ 桌面通知和应用内通知集成
- ✅ 全局状态同步和错误追踪
- ✅ 4个核心Zustand Store（项目、材料、通知、全局同步）
- ✅ Electron桌面应用打包（Windows/macOS/Linux）

## 核心布局架构

### VS Code风格布局系统
系统使用VSCodeLayout作为主布局组件，包含三个核心区域：

#### ActivityBar（活动栏）
- 位置：最左侧，宽度64px
- 功能：主要视图切换，使用@heroicons/react图标
- 视图类型：`'active' | 'completed' | 'drawings' | 'workers' | 'dashboard' | 'settings'`
- 组件：`/components/layout/ActivityBar.tsx`

#### Sidebar（侧边栏）
- 位置：活动栏右侧，宽度220px
- 功能：根据当前视图显示对应的侧边栏内容
- 动态渲染：通过renderSidebar()函数根据viewType切换不同组件
- 主要侧边栏组件：
  - ProjectTree - 活跃项目树形导航
  - PastProjectsTree - 过往项目导航
  - DrawingsSidebar - 图纸分类导航
  - WorkersSidebar - 工人部门管理

#### MainContent（主内容区）
- 位置：侧边栏右侧，占据剩余空间
- 功能：显示主要内容组件
- 动画：使用Framer Motion的AnimatePresence实现视图切换动画

### 关键布局组件
- **`VSCodeLayout.tsx`** - 主布局容器，集成活动栏、侧边栏和主内容区
- **`ActivityBar.tsx`** - 左侧活动栏，图标导航
- **`useResponsive`** hook - 响应式检测，支持桌面/平板/移动端适配

## 技术栈与依赖

### 前端核心依赖
- **框架**: Next.js 15.4.3 + React 18.3.1
- **状态管理**: Zustand 5.0.3（轻量级状态管理）
- **UI组件**: @heroicons/react 2.2.0（图标库）
- **样式**: Tailwind CSS 3.4.16 + Framer Motion 11.16.0（动画）
- **桌面应用**: Electron 33.0.0 + Electron Builder 24.13.3
- **CAD处理**: dxf-parser 1.1.2 + three.js 0.178.0
- **拖拽排序**: @dnd-kit/core 6.3.1 + @dnd-kit/sortable 10.0.0

### 后端核心依赖
- **框架**: Express.js 4.21.2 + Node.js
- **数据库**: Sequelize 6.37.7 + MySQL2 3.14.2
- **认证**: JsonWebToken 9.0.2 + bcryptjs 3.0.2
- **文件处理**: Multer 2.0.2 + Sharp 0.34.3 + Canvas 3.1.2
- **安全**: Helmet 8.1.0 + CORS 2.8.5
- **开发工具**: Nodemon 3.1.10 + Morgan 1.10.1

### 开发和构建工具
- **TypeScript**: 类型安全开发，支持完整的类型检查
- **ESLint**: 代码质量检查和格式化
- **PostCSS + Autoprefixer**: CSS后处理和兼容性
- **Docker Compose**: 本地开发环境容器化
- **Concurrently**: 并发运行多个开发服务

## 关键开发注意事项

### 代码规范与约定
- **中文优先**: 所有界面文本、注释、变量名使用中文
- **图标统一**: 禁用emoji，统一使用@heroicons/react图标库
- **状态管理**: 严格使用Zustand，禁止重新引入WebSocket
- **组件设计**: 遵循iOS 18 & macOS 15设计系统风格
- **API设计**: RESTful API，统一错误处理和响应格式

### 核心架构原则
- **事件驱动通信**: 使用浏览器原生事件系统实现组件间状态同步
- **四状态循环**: Material状态管理（empty→pending→in_progress→completed→empty）
- **响应式布局**: VS Code风格布局系统，支持桌面/平板/移动端
- **实时通知**: SSE + 桌面通知 + 音频提示的多重反馈机制
- **配置统一**: 使用shared/config.js避免硬编码，支持开发/生产环境切换

### 性能和体验优化
- **音频管理**: 智能音效选择，浏览器自动播放策略处理
- **网络管理**: API请求重试机制，离线状态检测
- **文件预览**: CAD文件的Three.js渲染和实时预览
- **数据同步**: 基于事件的实时状态更新，避免手动刷新
- **用户体验**: 流畅的动画过渡，符合现代桌面应用标准
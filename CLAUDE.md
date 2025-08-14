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

### 服务器架构配置
**重要说明**：本项目采用分离式架构
- **前端服务**: 本地开发服务器 http://localhost:4000
- **后端服务**: 远程云服务器 https://api.gei5.com
- **数据库**: 远程MySQL服务器，不需要本地Docker

**端口检查约束**：
```bash
lsof -ti:4000    # 检查前端端口（仅需检查此端口）
```
**重要**：不要尝试启动本地后端服务或数据库，所有API请求直接连接远程服务器 https://api.gei5.com

**后端文件修改流程**：
- Claude只能修改本地backend文件
- 用户负责将修改后的文件上传到远程服务器
- 绝不在本地运行后端服务进行测试

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

### 日常开发工作流（远程后端架构）
```bash
# 1. 检查前端服务状态
lsof -ti:4000 && echo "前端已启动" || echo "前端未启动"

# 2. 仅启动前端开发服务器（仅在未启动时）
cd frontend && npm run dev     # 前端: http://localhost:4000

# 3. 健康检查（远程服务器）
curl http://localhost:4000     # 前端服务（本地）
# 后端API通过前端代理访问，无需直接访问
```

### 关键开发端点（远程后端架构）
- **主应用**: http://localhost:4000
- **组件系统**: http://localhost:4000/design-system
- **API测试**: http://localhost:4000/debug-api
- **后端API**: https://api.gei5.com（远程服务器）
- **考勤管理**: http://localhost:4000（导航至考勤模块）

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
- **桌面应用**: Tauri多平台打包 (Rust + Web技术)

### 端口和服务（远程后端架构）
- 前端开发服务器: http://localhost:4000
- 后端API服务: https://api.gei5.com（远程云服务器）
- MySQL数据库: 远程云数据库（通过API访问）
- phpMyAdmin: 不适用（远程数据库管理）

### 默认用户
- **高春强** (admin) - 管理员权限
- **杨伟** (operator) - 操作员权限

## 核心架构约束

### 状态管理架构
- **禁止WebSocket**: 用户明确要求弃用WebSocket复杂方案
- **强制Zustand**: 所有状态管理必须使用5个核心Store
  - `projectStore.ts` - 项目数据管理
  - `materialStore.ts` - 材料状态管理
  - `workerMaterialStore.ts` - 工人材料关联
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

# Tauri桌面应用开发
cd frontend && npm run tauri dev   # 开发模式启动桌面应用
cd frontend && npm run tauri build # 构建桌面应用(Windows/macOS/Linux)
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
- **worker_materials** - 工人材料关联表
- **material_dimensions** - 材料尺寸管理表
- **material_requirements** - 材料需求表
- **material_allocations** - 材料分配表
- 扩展表：material_inventory、material_borrowing、cutting_records等

### 前端架构特点
- **直连后端模式**: 前端通过 `/utils/api.ts` 的 `apiRequest()` 函数直接连接后端API
- **VSCode风格布局**: ActivityBar(64px) + Sidebar(220px) + MainContent的三栏布局
- **iOS 18设计系统**: 毛玻璃效果、圆角设计、Apple Human Interface Guidelines
- **响应式设计**: 支持桌面/平板/移动端自适应
- **组件化架构**: 40+自研UI组件，高度模块化

#### 关键前端功能
- **实时状态管理**: 5个Zustand Store（projectStore、materialStore、workerMaterialStore、notificationStore、globalSyncStore）
- **事件驱动通信**: 使用浏览器原生事件系统实现组件间通信
- **全局搜索**: Ctrl+K/Cmd+K快捷键，跨模块搜索功能
- **CAD文件处理**: DXF解析和dxf-viewer 3D预览，支持Canvas渲染
- **音频通知系统**: 5种智能音效(success/error/warning/info/wancheng)，操作反馈
- **实时通知**: SSE + 桌面通知 + 音频提示的多重反馈
- **Tauri桌面集成**: Rust后端处理系统级操作，Web前端负责UI

### Zustand Store架构详细说明
```javascript
// projectStore.ts - 核心项目数据管理
interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  fetchProjects(): Promise<void>;
  updateProject(id: number, data: Partial<Project>): Promise<void>;
  deleteProject(id: number): Promise<void>;
}

// materialStore.ts - 材料状态管理
interface MaterialState {
  materials: Material[];
  thicknessSpecs: ThicknessSpec[];
  loading: boolean;
  updateMaterialStatus(id: number, status: MaterialStatus): Promise<void>;
  fetchMaterials(): Promise<void>;
}

// workerMaterialStore.ts - 工人材料关联管理
// globalSyncStore.ts - 全局同步状态
// notificationStore.ts - 通知消息管理
```

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

# 单独构建前端（生产部署时）
cd frontend && npm run build         # 仅在部署时使用，生成优化后的静态文件

# 注意：项目无单元测试框架，主要依靠开发服务器热重载和类型检查
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

### 材料状态管理核心逻辑
材料状态采用四阶段循环，严格按顺序流转：
1. **empty** - 空白状态，未分配给任何项目
2. **pending** - 已分配但未开始加工
3. **in_progress** - 正在加工中
4. **completed** - 加工完成，可回收为empty状态

```javascript
// 状态切换示例
const nextStatus = {
  'empty': 'pending',
  'pending': 'in_progress', 
  'in_progress': 'completed',
  'completed': 'empty'
};
```

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

### 智能Toast系统使用模式
Toast系统支持专业化提示和AI驱动的智能建议：

```javascript
// 项目相关Toast
import { projectToastHelper } from '@/utils/projectToastHelper';
projectToastHelper.projectCreated(projectName, workerName);
projectToastHelper.projectUpdated(projectName);

// 材料操作Toast  
import { materialToastHelper } from '@/utils/materialToastHelper';
materialToastHelper.statusChanged(materialType, oldStatus, newStatus);
materialToastHelper.batchOperationComplete(message);

// 智能建议引擎
import { useSmartSuggestions } from '@/utils/smartSuggestionEngine';
const { start, updateMetrics } = useSmartSuggestions({ autoStart: true });
updateMetrics({ totalProjects: 50, carbonMaterialRatio: 92 });
```

### 考勤系统开发约定
```javascript
// 考勤状态管理
import { useAttendanceStore } from '@/stores/attendanceStore';
const { employees, addException, calculateMonthlySummary } = useAttendanceStore();

// 考勤数据导出
import { exportMonthlyAttendanceReport } from '@/utils/attendanceExporter';
await exportMonthlyAttendanceReport(2025, 1); // 导出2025年1月报表
```

### 数据库操作约定
```bash
# 考勤系统数据库初始化
mysql -h localhost -P 3330 -u laser_user -p < database/migrations/attendance_system.sql

# 计算月度考勤汇总（存储过程）
CALL sp_calculate_monthly_attendance(2025, 1);

# 查看考勤状态视图
SELECT * FROM v_employee_attendance_status;
SELECT * FROM v_monthly_attendance_stats;
```


## 数据库结构

### 主要数据表
- **users** (id, name, role) - 用户认证
- **workers** (id, name, phone, email, department, position) - 工人信息  
- **projects** (id, name, status, priority, assigned_worker_id, created_by) - 项目管理
- **thickness_specs** (id, thickness, unit, material_type, is_active) - 厚度规格配置
- **materials** (id, project_id, thickness_spec_id, status, completed_by) - 板材状态
- **drawings** (id, project_id, filename, file_path, version, uploaded_by) - 图纸文件

### 考勤系统数据表 (新增)
- **employees** (id, employee_id, name, department, position, daily_work_hours, status) - 员工基础信息
- **attendance_exceptions** (id, employee_id, date, exception_type, leave_type, leave_hours, overtime_hours) - 考勤异常记录
- **attendance_settings** (id, setting_key, setting_value, description) - 考勤系统设置
- **monthly_attendance_summary** (id, employee_id, year, month, work_days, total_work_hours, attendance_rate) - 月度考勤汇总
- **attendance_approvals** (id, attendance_exception_id, approver_id, status, approval_reason) - 考勤审批流程
- **annual_leave_balance** (id, employee_id, year, total_hours, used_hours, remaining_hours) - 年假余额管理

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

## 系统新增功能模块

### 考勤管理系统 (新增)
- **功能描述**: 员工考勤管理、请假审批、加班统计、月度报表
- **数据库表**: employees, attendance_exceptions, attendance_settings, monthly_attendance_summary, attendance_approvals, annual_leave_balance
- **前端组件**: `frontend/components/attendance/` - 完整的考勤管理界面
- **状态管理**: `frontend/stores/attendanceStore.ts` - 考勤数据状态管理
- **类型定义**: `frontend/types/attendance.ts` - 考勤相关类型
- **工具函数**: `frontend/utils/attendanceExporter.ts` - 考勤数据导出功能
- **数据库脚本**: `database/migrations/attendance_system.sql` - 考勤系统完整数据库结构

### Toast智能提示系统 (新增)
- **智能提示引擎**: `frontend/utils/smartSuggestionEngine.ts` - AI驱动的业务洞察和建议
- **专业化Toast助手**:
  - `frontend/utils/projectToastHelper.ts` - 项目相关提示
  - `frontend/utils/materialToastHelper.ts` - 材料操作提示
  - `frontend/utils/workerToastHelper.ts` - 工人管理提示
  - `frontend/utils/drawingToastHelper.ts` - 图纸管理提示
  - `frontend/utils/batchOperationToastHelper.ts` - 批量操作提示
- **Toast优化**:
  - `frontend/utils/toastAnimationOptimizer.ts` - 动画性能优化
  - `frontend/utils/toastAccessibility.ts` - 无障碍访问支持
  - `frontend/utils/sseToastMapper.ts` - SSE事件到Toast映射

### 增强组件库 (新增)
- **高级选择器**: `frontend/components/ui/SearchableSelect.tsx` - 支持搜索的下拉选择组件
- **Toast系统**: `frontend/components/ui/Toast.tsx` - 增强的智能提示组件
- **响应式布局**: `frontend/components/ui/ResponsiveLayout.tsx` - 自适应布局容器

## 关键文件位置

### 核心状态管理
- `frontend/stores/projectStore.ts` - 项目数据管理
- `frontend/stores/materialStore.ts` - 材料状态管理  
- `frontend/stores/attendanceStore.ts` - 考勤系统状态管理 (新增)
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
- `frontend/components/materials/MaterialInventoryManagerNew.tsx` - 主数据表格
- `frontend/components/ui/ModernTable.tsx` - 通用表格组件
- `frontend/components/ui/DxfPreviewModal.tsx` - DXF文件预览组件
- `frontend/components/attendance/` - 考勤管理组件库 (新增)

### 智能系统文件
- `frontend/utils/smartSuggestionEngine.ts` - AI智能提示引擎 (新增)
- `frontend/utils/*ToastHelper.ts` - 专业化Toast助手集合 (新增)
- `frontend/utils/toastAnimationOptimizer.ts` - Toast性能优化 (新增)

### 配置文件
- `frontend/.env.local` - 前端环境配置
- `backend/src/config/envConfig.js` - 后端环境配置
- `docker-compose.yml` - 数据库容器配置
- `database/init/01-create-tables.sql` - 基础数据库结构
- `database/migrations/attendance_system.sql` - 考勤系统数据库结构 (新增)
- `frontend/next.config.js` - Next.js开发配置(标准模式，非export)
- `frontend/tailwind.config.js` - iOS 18/macOS 15 设计系统配置
- `deploy-to-server.sh` - 云服务器部署脚本

### 数据模型文件
- `backend/src/models/index.js` - Sequelize模型汇总和关联定义
- `backend/src/models/[Entity].js` - 各实体的Sequelize模型定义
- `frontend/types/attendance.ts` - 考勤系统类型定义 (新增)

### 认证和中间件
- `backend/src/middleware/auth.js` - JWT认证中间件
- `backend/src/middleware/validation.js` - 请求验证中间件
- `frontend/contexts/AuthContext.tsx` - 前端认证上下文


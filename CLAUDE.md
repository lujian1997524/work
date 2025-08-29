# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 项目路径配置

**正确的项目路径**：`/Users/gao/Desktop/work`
- **前端代码**：`/Users/gao/Desktop/work/frontend`
- **后端代码**：`/Users/gao/Desktop/work/backend`

**重要提醒**：
- Claude 必须始终使用 `/Users/gao/Desktop/work` 作为项目根目录
- 不要使用 `/Users/gao/Downloads/work-main` 或其他路径
- 所有文件操作都必须基于正确的路径进行

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
**重要说明**：本项目采用远程后端分离式架构
- **前端服务**: 本地开发服务器 http://localhost:4000
- **后端服务**: 远程云服务器 https://api.gei5.com
- **数据库**: 远程MySQL服务器，无需本地数据库

**端口检查约束**：
```bash
lsof -ti:4000    # 检查前端端口（仅需检查此端口）
```

**关键架构要点**：
- 所有API请求通过前端的 `utils/api.ts` 直接连接远程服务器
- 后端代码仅用于开发和部署参考，不在本地运行
- 前端环境变量 `NEXT_PUBLIC_BACKEND_URL=https://api.gei5.com` 配置远程连接

## 快速开始

### 前端开发工作流（远程后端架构）
```bash
# 1. 检查前端服务状态
lsof -ti:4000 && echo "前端已启动" || echo "前端未启动"

# 2. 安装依赖（首次运行或package.json变化时）
cd /Users/gao/Desktop/work/frontend && npm install

# 3. 启动前端开发服务器（仅在未启动时）
cd /Users/gao/Desktop/work/frontend && npm run dev     # 前端: http://localhost:4000

# 4. 健康检查
curl http://localhost:4000     # 前端服务（本地）
# 后端API: https://api.gei5.com（远程，通过前端代理访问）
```

### 关键开发端点
- **主应用**: http://localhost:4000
- **组件系统**: http://localhost:4000/design-system
- **API测试**: http://localhost:4000/debug-api
- **DXF调试**: http://localhost:4000/debug-dxf - 企业级DXF预览系统测试 (v2.5.2新增)
- **考勤管理**: http://localhost:4000（导航至考勤模块）
- **移动端测试**: http://localhost:4000/mobile-test
- **Toast测试**: http://localhost:4000/toast-test
- **队列管理**: http://localhost:4000/queue/[token] - 公共页面实时同步

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

### Git提交约束
**禁止Claude作为贡献者**：
- **严禁使用Co-Authored-By标签**：Git提交信息中不得包含 `Co-Authored-By: Claude <noreply@anthropic.com>`
- **清理提交信息**：所有commit message必须只包含实际代码变更描述，不包含Claude相关标识
- **标准提交格式**：使用语义化提交信息，如 `fix:`, `feat:`, `docs:` 等，但不包含AI工具标识
- **原因**：避免在GitHub贡献者列表中显示Claude，保持项目贡献者的准确性

## 项目概述

这是一个激光切割生产管理系统，采用VS Code风格的界面布局，支持项目管理、板材状态追踪、图纸管理和工人资源管理。

## 核心技术栈和架构模式

### 前端技术栈
- **Next.js 15.4.7**: App Router模式，静态渲染和SSG
- **React 19.1.1**: 最新Hooks API和并发特性
- **TypeScript 5.9.2**: 严格类型检查，确保代码质量
- **Zustand 5.0.3**: 轻量级状态管理，替代Redux
- **Tailwind CSS 3.4.16**: 原子类CSS框架，iOS 18设计系统
- **Framer Motion 11.16.0**: 动画和手势库
- **ExcelJS 4.4.0**: 企业级Excel文件生成
- **@heroicons/react 2.2.0**: 官方图标库
- **three.js + dxf-viewer**: 3D CAD文件预览
- **@dnd-kit/***: 拖拽排序功能组件库

### 后端技术栈
- **Node.js + Express 4.21.2**: RESTful API服务
- **Sequelize 6.37.7**: MySQL ORM，数据模型管理
- **MySQL2 3.14.2**: 数据库驱动
- **JWT + bcryptjs**: 认证和密码安全
- **Multer 2.0.2**: 文件上传处理
- **Sharp 0.34.3**: 图像处理优化
- **Canvas 3.1.2**: DXF文件渲染服务

### 关键架构模式
- **远程后端分离**: 前端localhost:4000，后端https://api.gei5.com
- **事件驱动状态**: 原生CustomEvent实现跨组件通信
- **四状态材料循环**: empty→pending→in_progress→completed→empty
- **VS Code风格UI**: ActivityBar + Sidebar + MainContent布局
- **SSE实时通信**: Server-Sent Events替代WebSocket

### 端口和服务
- **前端开发服务器**: http://localhost:4000 (Next.js dev server)
- **后端API服务**: https://api.gei5.com（远程云服务器）
- **MySQL数据库**: 远程云数据库（通过API访问）

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

### 🚨 数据库字段约束（重要）
**Worker模型部门字段使用规范**：
- **✅ 正确字段**: `departmentId` - 外键关联departments表
- **❌ 禁用字段**: `department` - 废弃的字符串字段（数据为null）

**正确的查询方式**：
```javascript
// ✅ 正确：通过departmentId关联departments表
{
  model: Worker,
  as: 'assignedWorker',
  attributes: ['id', 'name', 'departmentId'],
  include: [
    {
      model: Department,
      as: 'departmentInfo',
      attributes: ['id', 'name']
    }
  ]
}

// ❌ 错误：直接使用department字段
{
  model: Worker,
  as: 'assignedWorker', 
  attributes: ['id', 'name', 'department']  // 此字段已废弃，始终为null
}
```

**部门信息访问**：
```javascript
// ✅ 正确访问方式
worker.departmentInfo?.name || '未分配部门'

// ❌ 错误访问方式  
worker.department  // 始终返回null
```

**重要性**：此约束已在v2.8.0中全面修复，所有API现在正确使用departmentId关联。违反此约束会导致部门信息显示为空或"未分配部门"。

### 布局系统约束
- **VS Code风格**: 严格遵循 ActivityBar(64px) + Sidebar(220px) + MainContent 布局
- **MaterialsTable格式**: 序号-项目名-工人-2mm-3mm-4mm...-备注-开始时间-完成时间-图纸
- **禁止修改布局**: 用户明确要求保持左侧边栏+右侧表格设计

## 开发命令

### 前端开发（主要工作流）
```bash
# 安装依赖（仅需一次）
cd frontend && npm install

# 启动前端开发服务器
cd frontend && npm run dev         # 前端端口4000 (Next.js开发服务器)

# 生产环境构建（谨慎使用）
cd frontend && npm run build       # 仅在最终部署时使用
cd frontend && npm run start       # 前端生产服务器

# Tauri桌面应用开发
cd frontend && npm run tauri dev   # 开发模式启动桌面应用
cd frontend && npm run tauri build # 构建桌面应用(Windows/macOS/Linux)
```

### 后端开发（仅供参考，远程部署）
```bash
# 后端安装依赖
cd backend && npm install

# 后端本地开发（仅测试用）
cd backend && npm run dev          # 使用nodemon热重载
cd backend && npm run start        # 生产模式启动

# 数据库操作（远程管理）
cd backend && npm run init:db      # 初始化数据库结构
cd backend && npm run create:sample # 创建测试数据

# 注意：本地不运行后端，仅修改代码供远程部署使用
```

### 代码检查命令（用户手动运行）
```bash
# TypeScript类型检查（推荐方式，不构建）
cd frontend && npx tsc --noEmit

# 代码质量检查
cd frontend && npm run lint

# 注意：项目无单元测试框架，主要依靠开发服务器热重载和类型检查
# 注意：Claude 不能自动运行这些命令，只能建议用户运行
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
- **企业级DXF预览** - `/api/enterprise-dxf/*` - 高性能DXF解析、多分辨率预览、缓存管理
- **全局搜索** - `/api/search` - 跨模块搜索功能（支持考勤、项目、材料、图纸搜索）
- **仪表盘** - `/api/dashboard` - 统计数据和概览信息
- **考勤管理** - `/api/attendance` - 员工考勤记录、请假、加班管理
- **员工管理** - `/api/employees` - 员工信息管理
- **SSE通信** - `/api/sse` - Server-Sent Events实时通知

#### 数据库模型
- **users** (id, name, role) - 用户表
- **workers** (id, name, phone, email, department, position) - 工人表
- **projects** (id, name, status, priority, assigned_worker_id, created_by) - 项目表
- **thickness_specs** (id, thickness, unit, material_type, is_active, sort_order) - 厚度规格表
- **materials** (id, project_id, thickness_spec_id, status, completed_by, completed_date) - 板材表
- **drawings** (id, project_id, filename, file_path, version, uploaded_by) - 图纸表
- **operation_history** - 操作历史日志
- **worker_materials** - 工人材料关联表（已恢复，81条记录）
- **material_dimensions** - 材料尺寸管理表（已恢复，12条记录）
- ~~**material_requirements**~~ - 材料需求表（已删除）
- ~~**material_allocations**~~ - 材料分配表（已删除）
- 扩展表：material_inventory、material_borrowing、cutting_records等

### 前端架构特点
- **直连后端模式**: 前端通过 `/utils/api.ts` 的 `apiRequest()` 函数直接连接后端API
- **VSCode风格布局**: ActivityBar(64px) + Sidebar(220px) + MainContent的三栏布局
- **iOS 18设计系统**: 毛玻璃效果、圆角设计、Apple Human Interface Guidelines
- **响应式设计**: 支持桌面/平板/移动端自适应
- **组件化架构**: 40+自研UI组件，高度模块化

### 关键前端功能
- **实时状态管理**: 6个Zustand Store（projectStore、materialStore、workerMaterialStore、notificationStore、globalSyncStore、attendanceStore）
- **事件驱动通信**: 使用浏览器原生事件系统实现组件间通信
- **全局搜索**: Ctrl+K/Cmd+K快捷键，跨模块搜索功能（支持考勤、项目、材料、工人、图纸）
- **企业级DXF预览**: WebAssembly高性能引擎、多分辨率预览、智能缓存、实时图层控制
- **CAD文件处理**: DXF解析和dxf-viewer 3D预览，支持Canvas渲染
- **音频通知系统**: 5种智能音效(success/error/warning/info/wancheng)，操作反馈
- **实时通知**: SSE + 桌面通知 + 音频提示的多重反馈
- **移动端适配**: MobileEmployeeCard、MobileFormWizard、StatCardSwiper等专用移动端组件
- **Tauri桌面集成**: Rust后端处理系统级操作，Web前端负责UI
- **拖拽排序**: @dnd-kit库实现的队列项目拖拽排序功能
- **公共页面**: 支持无登录访问的队列状态页面，实时同步更新

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

// attendanceStore.ts - 考勤系统状态管理（新增）
interface AttendanceState {
  employees: Employee[];
  attendanceExceptions: AttendanceException[];
  loading: boolean;
  createEmployee(data: Partial<Employee>): Promise<boolean>;
  addException(data: AttendanceExceptionData): Promise<boolean>;
  calculateMonthlySummary(year: number, month: number): Promise<void>;
}

// workerMaterialStore.ts - 工人材料关联管理
// globalSyncStore.ts - 全局同步状态
// notificationStore.ts - 通知消息管理
```

### 开发流程
```bash
# 前端开发（热重载）
cd frontend && npm run dev

# 后端开发（仅修改文件，不运行）
# 注意：本地不运行后端服务，仅修改代码文件供部署使用
```

### 数据库管理（远程）
```bash
# 数据库操作（远程管理，不在本地执行）
# 以下命令仅供参考，实际由远程服务器管理：
# npm run init:db                      # 初始化数据库结构
# npm run create:sample                # 创建测试数据
# node sync-db.js                      # 同步数据库结构更新
# node create-sample-data.js           # 创建样本数据

# 数据库访问（远程）
# 远程数据库: laser_cutting_db @ https://api.gei5.com
# 用户: laser_user
# 注意：无本地数据库访问权限
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
# 检查前端服务状态
lsof -ti:4000                       # 前端端口检查

# 网络连接测试
curl http://localhost:4000          # 前端服务
curl https://api.gei5.com/health    # 远程后端健康检查（如果可用）

# 前端日志查看
cd frontend && npm run dev          # 开发服务器会显示实时日志

# 注意：不需要检查本地后端服务或数据库，因为使用远程服务
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
2. 检查前端服务状态: curl http://localhost:4000
3. 检查环境变量: NEXT_PUBLIC_BACKEND_URL=https://api.gei5.com
4. 确认API端点路径正确: /api/projects 而非 /projects
```

### 前端服务问题
**症状**: 前端无法启动、页面无法访问
```bash
# 解决步骤
1. 检查端口占用: lsof -ti:4000
2. 重启前端服务: cd frontend && npm run dev
3. 清理缓存: rm -rf .next && npm run dev
4. 检查Node.js版本兼容性
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

### 移动端专用组件 (新增)
- **StatCardSwiper**: 移动端统计卡片轮播组件，支持触摸滑动浏览统计数据
- **MobileEmployeeCard**: 移动端员工卡片组件，卡片式员工信息展示，触摸友好的大按钮
- **MobileFormWizard**: 移动端分步表单向导，复杂表单拆分为多步骤，降低认知负担
- **MobileStatsOverview**: 移动端统计概览组件，紧凑的统计信息显示

### 全局搜索增强 (v2.4.0新增)
- **考勤模块搜索**: 支持按请假、加班、缺勤等类型搜索考勤异常记录
- **中文关键词映射**: 请假→leave、加班→overtime、缺勤→absent等自动转换
- **智能搜索结果**: 按原因搜索和按员工搜索的双重机制，支持并行查询和结果合并
- **搜索结果导航**: 从搜索结果直接跳转到对应模块（考勤、项目、材料等）

## 关键文件位置

### 核心状态管理
- `frontend/stores/projectStore.ts` - 项目数据管理
- `frontend/stores/materialStore.ts` - 材料状态管理  
- `frontend/stores/attendanceStore.ts` - 考勤系统状态管理 (新增)
- `frontend/stores/workerMaterialStore.ts` - 工人材料关联管理（已恢复）
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
- `frontend/components/materials/MaterialInventoryManager.tsx` - 基础板材库存管理组件（已恢复）
- `frontend/components/ui/ModernTable.tsx` - 通用表格组件
- `frontend/components/ui/DxfPreviewModal.tsx` - DXF文件预览组件
- `frontend/components/attendance/` - 考勤管理组件库 (新增)

### 智能系统文件
- `frontend/utils/smartSuggestionEngine.ts` - AI智能提示引擎 (新增)
- `frontend/utils/*ToastHelper.ts` - 专业化Toast助手集合 (新增)
- `frontend/utils/toastAnimationOptimizer.ts` - Toast性能优化 (新增)

### Excel导出工具 (ExcelJS版本)
- `frontend/utils/projectReportExporter.ts` - 项目报表导出（多工作表、专业样式）
- `frontend/utils/attendanceExporter.ts` - 考勤报表导出（彩色条件格式、部门汇总）

### 核心配置文件
- `frontend/.env.local` - 前端环境配置（远程后端URL配置）
- `frontend/next.config.js` - Next.js开发配置（标准模式，非export）
- `frontend/tailwind.config.js` - iOS 18/macOS 15 设计系统配置
- `frontend/utils/envConfig.ts` - 环境配置管理（支持远程API连接）
- `frontend/utils/api.ts` - API请求统一管理（远程后端连接）

### 移动端组件
- `frontend/components/ui/StatCardSwiper.tsx` - 响应式统计卡片轮播组件
- `frontend/components/ui/MobileEmployeeCard.tsx` - 移动端员工卡片组件
- `frontend/components/ui/MobileFormWizard.tsx` - 移动端分步表单向导
- `frontend/app/mobile-test/page.tsx` - 移动端组件测试页面

### 版本历史
- **当前版本**: v2.8.2 (2025-08-29) - 材料状态级联同步修复与考勤报表优化
- **v2.8.2 关键修复与优化 (CRITICAL SYNCHRONIZATION FIX)**:
  - **🔄 材料状态级联同步彻底修复**:
    - 修复后端materials.js中的关键逻辑错误：状态检查在数据更新后进行，导致级联条件永远为false
    - 核心修复：保存原始材料状态用于级联检查，确保项目状态正确响应材料变更
    - SSE事件格式兼容性：前端projectStore支持两种事件格式（直接项目更新和材料触发级联）
    - 多设备实时同步：材料状态变更引起的项目状态级联现在能在所有设备间实时同步
  - **📊 考勤报表系统重构**:
    - 完全重构attendanceExporter.ts，将复杂多表结构简化为单表三段式布局
    - 中文本土化：请假类型从英文(sick/personal/annual)转换为中文(病假/事假/年假)
    - 结构优化：综合统计 + 异常明细 + 加班明细三段式设计，信息密度大幅提升
    - 数据质量提升：过滤无效员工记录，确保报表数据准确性
  - **⚡ 实时同步架构完善**:
    - 智能级联预测：materialStore能预测项目状态变更并标记本地操作，避免重复通知
    - 多设备连接管理：SSE系统支持同用户多设备，每个设备独立追踪状态变更
    - 事件驱动优化：前端状态管理器智能处理不同来源的状态变更事件
  - **🔧 技术债务清理**:
    - TypeScript类型安全：修复考勤导出中的索引签名类型错误
    - 构建验证通过：所有代码变更经过完整类型检查和构建验证
    - 代码质量提升：清理调试日志，优化错误处理机制
  - **📈 系统稳定性提升**:
    - 解决了用户反馈的"材料状态同步但项目状态不同步"的核心问题
    - 多设备环境下状态一致性得到根本性改善
    - 考勤报表从基础统计升级为管理决策支持工具
- **v2.8.1 重大架构修复 (CRITICAL DATABASE FIX)**:
  - **🔧 版本显示系统重构**:
    - 修复登录窗口版本显示不准确问题(`config/default.ts:17`)
    - 版本号从硬编码`'2.6.1'`改为动态读取`packageJson.version`
    - 登录窗口现在显示准确的系统版本(v2.8.1)
    - 确保版本信息与package.json完全同步
  - **🚨 数据库字段架构修复**:
    - 发现并修复workers表双字段混用问题：`department`(废弃) vs `departmentId`(正确)
    - 统一修复5个关键文件中的错误字段引用：projects.js, searchController.js, material-requirements.js, worker-materials.js, search.js
    - 所有API现在正确使用`departmentId`外键关联departments表，Excel导出显示真实部门名称
    - 添加数据库迁移脚本`remove_deprecated_department_field.sql`彻底删除废弃字段
  - **📋 架构约束规范化**:
    - 在CLAUDE.md中新增"数据库字段约束"章节，明确禁用废弃的`department`字段
    - 提供标准的Worker模型查询范式和部门信息访问方式
    - 建立代码审查检查点，防止未来再次使用错误字段
  - **✅ 修复验证结果**:
    - Projects API: 秦晓贵→东厂, 高承海→东厂 (正确显示)
    - Worker-Materials API: 刘伟波→东厂, 刘崇强→西厂 (正确显示)  
    - Workers API: 公共库存→公共库存部门 (departmentId: 15)
    - Queue API: 所有工人都显示正确的部门信息而不是"未分配部门"
  - **🔧 技术债务清理**:
    - 彻底解决了"未知部门"显示问题的根本原因
    - 统一数据模型设计，消除字段命名混淆
    - 为v3.0.0的数据库架构重构奠定基础
- **v2.8.0 重大功能更新 (MAJOR FEATURE UPDATE)**:
  - **🔍 企业级全局智能搜索系统重构**:
    - 完全重写搜索后端API，从1976行复杂代码重构为高效的企业级架构
    - 实现7种搜索类型的并发查询：工人、项目、员工、板材规格、图纸、材料、考勤记录
    - 智能关联扩展：搜索工人时自动在项目Tab显示其负责的项目，在材料Tab显示其管理的材料
    - 双向关联支持：搜索员工时显示对应工人的项目和材料信息
    - 智能去重系统：防止关联搜索结果重复显示
  - **🎯 搜索体验全面升级**:
    - 状态中文显示：所有英文状态自动转换为中文（completed→已完成，in_progress→进行中）
    - 搜索框位置优化：调整到页面1/6位置，宽度扩展至max-w-7xl
    - 智能跳转系统：每种搜索结果支持精确跳转到对应页面和组件
    - 视觉交互增强：悬浮动画、跳转指示器、"点击查看"提示
  - **⚡ 性能和架构优化**:
    - 并发查询替代串行查询，搜索响应速度大幅提升
    - 智能相关性评分系统：精确匹配10分，关联结果按类型权重排序
    - 事件驱动导航：使用CustomEvent实现组件间智能跳转
    - TypeScript类型安全：完整的类型定义和构建时验证
  - **🔗 真正的全关联搜索**:
    - 搜索"高春强"：工人Tab显示基本信息，项目Tab显示负责项目，材料Tab显示管理材料，员工Tab显示考勤记录
    - 关键词智能处理：支持厚度识别、材料同义词、考勤中文映射
    - 跨系统数据整合：生产系统、考勤系统、文档系统完整关联
  - **📊 搜索结果丰富展示**:
    - 详细的关联项目列表（前3个+更多提示）
    - 详细的关联材料列表（规格、库存、数量统计）
    - 考勤统计详情（请假次数、加班次数、出勤率）
    - 项目时间线和完成度统计
- **v2.7.0 重大架构变更 (BREAKING ARCHITECTURE)**:
  - **🗑️ 板材分配需求系统彻底移除**:
    - 删除MaterialRequirement/MaterialAllocation复杂分配系统
    - 移除materials表中分配相关字段（shared_plate_id、usage_note、batch_allocation_id、actual_quantity_used）
    - 清理所有分配相关API端点（/allocate、/batch-allocation、/undo-allocation等）
    - 删除分配相关前端组件（TransferModal、分配管理界面等）
  - **📦 板材库存管理系统恢复**:
    - 恢复worker_materials表（工人材料关联，81条历史记录）
    - 恢复material_dimensions表（材料尺寸详情，12条历史记录）
    - 重建基础库存管理功能，支持工人材料库存查看和管理
    - 保留简单高效的库存追踪机制
  - **🔧 数据库完整性修复**:
    - 创建完整数据恢复脚本（restore_inventory_with_data.sql）包含全部历史数据
    - 修复外键约束和表结构一致性问题
    - 清理过时字段，确保数据准确性
  - **🏗️ 系统架构简化**:
    - 移除复杂的双轨分配机制，回归简单库存管理
    - 清理分配相关状态管理（移除分配相关Store和事件）
    - 保持材料四状态循环（empty→pending→in_progress→completed）
  - **⚠️ 重要说明**:
    - 此版本移除了板材分配和需求系统，保留基础库存管理
    - 用户明确要求"彻底去掉分配和需求功能"，保留"板材库存管理"
    - 数据库包含3个迁移脚本：清理脚本、改进恢复脚本、完整数据恢复脚本
- **v2.6.3 关键修复**:
  - **🔧 UI组件焦点管理修复**:
    - 修复SearchableSelect组件点击其他输入框时选择内容消失的问题
    - 优化失去焦点处理逻辑，已选择的项目现在会持续显示
    - 改进点击外部检测机制，只在下拉框开启时才处理外部点击
    - 解决函数定义顺序导致的JavaScript执行错误
  - **⚡ 用户体验提升**:
    - 选择工人后名字不会因点击其他输入框而消失
    - 搜索和选择行为更加直观和稳定
    - 减少用户操作中的困惑和重复输入
  - **🏗️ 代码架构优化**:
    - 使用useCallback优化函数引用，避免无限循环
    - 简化焦点处理逻辑，提高代码可维护性
    - 删除重复的函数定义，清理代码结构
- **v2.6.1 关键修复**:
  - **🧹 代码清理**:
    - 删除所有测试页面（advanced-dxf-test, button-test, drawings-table, simple-test）
    - 删除临时文档和脚本文件，保持代码库整洁
    - 清理废弃的DXF部署检查清单和项目搜索导出指南
  - **🔧 构建错误修复**:
    - 修复MobileDrawingList中缺失的handleAdvancedPreview函数引用
    - 添加FireIcon导入，解决图标缺失问题
    - 修复ProjectDetailModern中缺失的onAdvancedPreviewDrawing属性
    - 修复DxfDataAnalyzer中dxf-viewer的workerFactory属性
    - 修复attendanceExporter中的TypeScript类型错误
  - **✅ 构建验证**:
    - 前端构建成功通过，无TypeScript错误
    - 代码质量检查通过，项目处于稳定状态
    - 删除依赖缺失和模块解析错误
- **v2.6.0 重大更新**:
  - **🔄 DXF预览系统重构 (BREAKING CHANGE)**:
    - **全面替换预览组件**：将所有DxfPreviewModal替换为AdvancedDxfModal高级预览
    - **统一预览体验**：用户现在享受一致的专业级CAD预览体验，无论从哪个入口访问
    - **界面简化**：移除混淆的"普通预览"与"高级预览"之分，只保留一个预览按钮
    - **功能完整性**：集成下载功能、详细图纸信息、技术统计于一体
  - **🎨 用户体验大幅提升**:
    - **文件名显示优化**：支持originalFilename和originalName双字段兼容
    - **信息面板增强**：显示主文件名、系统文件名、版本信息、上传者等完整信息
    - **下载功能集成**：在预览界面直接提供下载按钮，操作更便捷
    - **CAD风格界面**：深色主题、专业工具栏、状态指示器等CAD软件体验
  - **⚡ 技术架构优化**:
    - **组件复用性提升**：移除DrawingTableView中的重复高级预览按钮和相关逻辑
    - **接口统一化**：统一Drawing接口定义，支持多种数据来源的兼容性
    - **代码清理**：删除4个文件中的DxfPreviewModal引用，减少代码冗余
    - **字体缓存保持**：完全兼容现有DxfFontCache字体预加载机制
  - **🔧 向后兼容处理**:
    - **数据适配**：自动适配DrawingLibrary的originalName字段和DrawingTable的originalFilename字段
    - **API保持不变**：后端接口无需任何修改，前端完全向下兼容
    - **性能维持**：保持相同的字体缓存和渲染性能优化
- **v2.5.5 主要更新**:
  - **🧹 代码清理**:
    - 删除废弃的EnterpriseDxfViewer和ModernDxfViewer组件
    - 统一DXF预览功能到DxfPreviewModal组件
    - 清理CLAUDE.md文档中的过时组件引用
    - 简化DXF预览系统架构
  - **📊 报表系统优化**:
    - 优化项目报表导出功能，修复函数调用
    - 改进考勤表格布局，使用CSS实现员工列固定
    - 提升移动端表格体验
  - **⚡ 性能提升**:
    - 减少代码冗余，降低维护成本
    - 优化字体缓存系统性能
    - 清理无用的dxf-parser依赖引用
- **v2.5.4 关键修复**:
  - **🔧 字体预加载机制修复**:
    - 修复字体缓存逻辑错误：之前只缓存ArrayBuffer但仍使用原始URL
    - 实现Blob URL机制：将缓存的ArrayBuffer转为可用的Blob URL
    - DXF查看器现在真正使用内存缓存的字体，避免重复网络请求
    - 添加内存管理：清理时释放Blob URL防止内存泄漏
  - **⚡ 性能提升**:
    - 首次预加载后，后续DXF文件打开0网络字体请求
    - 真正实现字体缓存，大幅提升图纸加载速度
    - 添加降级策略：缓存失败时自动回退到原始URL
- **v2.5.3 主要更新**:
  - **🎨 DXF字体预加载系统**:
    - 实现DxfFontCache单例模式字体缓存管理，避免重复加载字体文件
    - 应用启动时预加载DXF字体（NotoSansSC-Thin.ttf），提升图纸打开速度
    - 字体预加载时间约280ms，大幅减少后续DXF文件加载等待时间
    - 使用requestIdleCallback优化字体加载时机，不阻塞主线程
  - **🐛 界面布局修复**:
    - 修复图纸表格高度限制问题，改用flex布局占满可用空间
    - 修复侧边栏与主列表图纸数量不一致问题（后端API分页限制）
    - 修复归档图纸统计API参数错误（status=archived → category=archived）
    - 为表格底部添加适当间隙，优化视觉体验
  - **⚡ 性能优化**:
    - 统一API请求添加limit=1000参数，确保数据完整性
    - 优化ModernDxfViewer和DxfPreviewModal字体配置
    - 清理调试代码，提升生产环境性能
- **v2.5.2 重大更新**:
  - **🚀 企业级DXF预览系统**:
    - WebAssembly级高性能DXF解析引擎，支持多分辨率预览图生成
    - 智能缓存管理系统（内存+文件双重缓存，30分钟内存缓存+1小时文件缓存）
    - 实时图层控制和实体分析功能，精确边界框计算和元数据提取
    - 完整的REST API端点支持：/api/enterprise-dxf/* 企业级DXF预览API路由
    - 企业级性能监控和统计，健康检查API
  - **🎨 前端预览系统重构**:
    - DXF预览组件(DxfPreviewModal)，基于dxf-viewer的渲染引擎
    - 实时图层可见性控制，质量模式智能切换，性能统计显示
    - 前后端分离架构优化，远程后端API连接优化
  - **⚡ 技术架构升级**:
    - 企业级错误处理和日志记录系统
    - 智能缓存策略和性能监控
    - DXF文件高性能解析服务(dxf-parser + Canvas)
- **v2.5.1** (2025-01-18) - 界面优化与系统简化
- **v2.5.0** (2025-01-18) - 板材分配系统架构重构与移动端体验升级
- **v2.5.0 重大更新**:
  - **🔧 架构重构 (BREAKING ARCHITECTURE)**:
    - 数据模型现代化：完全移除WorkerMaterial.quantity字段，改用MaterialDimension动态计算
    - API接口重构：worker-materials、materials、material-requirements等核心接口全面升级
    - 系统集成简化：统一使用Material.assignedFromWorkerMaterialId字段管理分配关系
  - **📱 移动端体验重构**:
    - 响应式设计全面重构：项目详情页面、板材分配界面完全适配移动端
    - 界面布局现代化：表格式布局替代卡片式，大幅提升空间利用率
    - 交互一致性：状态切换按钮统一设计规范，提升用户体验
  - **🗄️ 数据系统升级**:
    - 借用详情系统重构：使用新分配系统替代废弃的MaterialRequirement架构  
    - 数据一致性优化：简化验证逻辑，移除冗余数据同步机制
    - 数据库清理：移除7个废弃迁移文件，优化项目结构
  - **🚀 性能与稳定性**:
    - 库存计算优化：实时从MaterialDimension计算，确保数据准确性
    - API响应改进：减少数据冗余，提升接口性能
    - 错误处理增强：完善异常捕获和用户反馈机制
- **v2.4.12** (2025-08-17) - 项目编辑板材添加功能修复
- **v2.4.12 主要更新**:
  - **项目编辑功能修复**: 完全修复项目编辑时无法添加新板材厚度的问题
    - 后端API支持：更新项目API现在正确处理 `requiredThickness` 字段
    - 动态材料创建：为新选择的厚度规格自动创建项目材料记录
    - 工人库存管理：确保工人拥有对应厚度的材料库存记录
    - 前端验证优化：编辑模式下放宽验证限制，提升用户体验
  - **数据完整性保障**: 新添加的板材会正确关联到项目和工人
  - **错误修复**: 解决了500内部服务器错误，修复了模型导入问题
  - **用户体验提升**: 侧边栏和卡片编辑按钮现在都能正常工作
- **v2.4.11** (2025-08-16) - Excel表头背景色无限延伸问题修复
- **重大更新内容**: 
  - **企业级报表美化标准**: 完全重写考勤和项目导出功能，达到专业商务报表水准
    - 考勤报表：6个专业工作表（封面页、执行摘要、详细汇总、趋势分析、请假详情、部门对比）
    - 项目报表：7个专业工作表（封面页、执行摘要、项目概览、进度分析、材料详情、时间线分析、资源统计）
    - 企业级配色方案：蓝色主题（考勤）+ 绿色主题（项目），渐变背景和专业配色
    - 专业图标系统：Unicode图标 + 智能色彩编码 + 条件格式化
  - **信息完整性大幅提升**: 
    - 项目报表新增：项目复杂度评估、风险等级分析、时间线预测、资源利用率统计
    - 考勤报表新增：执行摘要分析、趋势预测、部门绩效对比、智能建议系统
    - 详细的数据分析和管理建议，为决策层提供洞察支持
  - **视觉美化专业级提升**:
    - 多级标题和分组布局、专业边框和阴影效果
    - 数据可视化元素：进度条、状态指示器、绩效等级色彩编码
    - A4页面布局优化、打印友好的企业级设计标准
- **v2.4.4** (2025-08-16) - Excel导出库升级与UI优化
- **v2.4.3** (2025-08-16) - 项目创建/编辑向导模态框优化
- **架构变更**: 远程后端分离式部署、移动端专用组件系统
- **更新日志**: 详见 `/更新日志.txt`

## 版本管理原则

### 语义化版本控制
本项目采用语义化版本控制（Semantic Versioning），版本号格式为：`MAJOR.MINOR.PATCH`
更新日志文件路径：根目录/更新日志.txt

#### 版本号更新规则
1. **PATCH版本（2.4.0 → 2.4.1）**
   - **用途**: Bug修复、小优化、代码重构
   - **示例**: 
     - 修复SSE通知重复问题
     - 修复UI显示错误
     - 性能优化
     - 代码清理和注释完善
   - **兼容性**: 完全向后兼容
   - **数据库**: 无需变更

2. **MINOR版本（2.4.1 → 2.5.0）**
   - **用途**: 新功能添加、功能增强、新模块
   - **示例**:
     - 添加考勤管理系统
     - 新增全局搜索功能
     - 增加移动端专用组件
     - API接口扩展
   - **兼容性**: 向后兼容
   - **数据库**: 可能需要数据库迁移

3. **MAJOR版本（2.5.0 → 3.0.0）**
   - **用途**: 重大架构变更、不兼容的API变更、重要依赖升级
   - **示例**:
     - 技术栈升级（Next.js 16、React 19）
     - 数据库架构重大变更
     - API接口重大变更
     - UI/UX大幅重构
   - **兼容性**: 可能存在破坏性变更
   - **数据库**: 需要完整数据迁移

#### 版本更新流程
1. **开发阶段**: 在开发分支进行功能开发
2. **版本确定**: 根据变更内容确定版本号类型
3. **更新文件**:
   - `frontend/package.json` - 更新version字段
   - `CLAUDE.md` - 更新版本历史部分
   - 可选：`frontend/CHANGELOG.md` - 详细更新日志
4. **提交代码**: 使用规范的commit message
5. **创建标签**: `git tag v2.4.1`
6. **推送更新**: `git push && git push --tags`

#### Commit Message规范
```
类型(范围): 简短描述

详细描述（可选）

```

**常用类型**:
- `fix`: Bug修复 (PATCH)
- `feat`: 新功能 (MINOR)
- `BREAKING CHANGE`: 破坏性变更 (MAJOR)
- `refactor`: 代码重构 (PATCH)
- `docs`: 文档更新 (PATCH)
- `style`: 代码格式化 (PATCH)
- `perf`: 性能优化 (PATCH)
- `test`: 测试相关 (PATCH)

### 数据模型文件
- `backend/src/models/index.js` - Sequelize模型汇总和关联定义
- `backend/src/models/[Entity].js` - 各实体的Sequelize模型定义
- `frontend/types/attendance.ts` - 考勤系统类型定义 (新增)

### 认证和中间件
- `backend/src/middleware/auth.js` - JWT认证中间件
- `backend/src/middleware/validation.js` - 请求验证中间件
- `frontend/contexts/AuthContext.tsx` - 前端认证上下文


# 板材需求和分配系统完全移除指南

## 📋 清理进度

### ✅ 已完成
1. **数据库清理脚本**: `database/migrations/remove_allocation_system.sql`
2. **后端模型删除**: MaterialRequirement.js, MaterialAllocation.js, WorkerMaterial.js, MaterialDimension.js
3. **后端API路由删除**: material-requirements.js, worker-materials.js, material-dimensions.js
4. **后端中间件删除**: dataValidation.js
5. **前端组件删除**: MaterialRequirementManager.tsx, MaterialAllocationModal.tsx, BatchAllocationModal.tsx, ProjectBorrowingDetails.tsx, DimensionManager.tsx

### ⚠️ 需要手动清理的文件
由于涉及核心功能，以下文件需要手动清理分配相关代码：

#### 后端文件
- `backend/src/routes/materials.js` - 清理分配相关API端点和逻辑
- `backend/src/routes/projects.js` - 移除分配相关字段和功能
- `backend/src/routes/search.js` - 清理分配相关搜索功能
- `backend/src/utils/operationHistory.js` - 移除分配相关历史记录

#### 前端文件  
- `frontend/components/materials/MaterialInventoryManagerNew.tsx` - 主要库存管理组件，需要移除分配功能但保留核心库存管理
- `frontend/components/projects/ProjectCard.tsx` - 移除分配相关导入和功能
- `frontend/components/projects/ProjectDetailModern.tsx` - 清理分配相关组件引用
- `frontend/components/materials/ExpandableMaterialCell.tsx` - 可能包含分配相关功能

## 🎯 下一步操作建议

### 1. 执行数据库清理（！重要！）
```bash
# 先备份数据库
mysqldump -u laser_user -p laser_cutting_db > backup_before_cleanup.sql

# 执行清理脚本
mysql -u laser_user -p laser_cutting_db < database/migrations/remove_allocation_system.sql
```

### 2. 后端清理关键步骤

#### Materials模型清理
Material.js 模型已经清理了 `assignedFromWorkerMaterialId` 字段，但需要确认materials表的API接口正常工作。

#### 清理materials.js API中的分配相关端点
需要移除以下功能：
- 分配材料的API端点
- 库存检查相关的复杂逻辑
- WorkerMaterial和MaterialDimension的关联查询

#### 清理projects.js API中的分配引用
移除创建项目时的分配相关逻辑。

### 3. 前端清理关键步骤

#### MaterialInventoryManagerNew.tsx 简化
这是核心组件，需要：
- 移除DimensionManager相关功能
- 简化为纯Material管理（project_id, thickness_spec_id, quantity, status）
- 保留基本的CRUD操作

#### ProjectCard.tsx 简化  
- 移除MaterialAllocationModal, MaterialRequirementManager, ProjectBorrowingDetails导入
- 简化为纯项目Material的状态管理
- 保留基本的Material状态切换功能

### 4. 验证系统完整性

清理完成后需要验证：
- 项目创建功能正常
- 材料状态切换正常（pending → in_progress → completed）
- 基本的Material CRUD操作正常
- 不再出现分配相关的UI和API调用

## 🚨 风险提示

1. **数据丢失风险**: 执行数据库清理前务必备份
2. **功能缺失风险**: 移除后系统将回到最基本的项目-材料管理模式
3. **依赖关系风险**: 某些组件可能高度依赖分配功能，需要重写或简化

## 💡 建议执行顺序

1. 先完成数据库备份和清理
2. 测试后端API基本功能
3. 清理前端组件引用
4. 逐个测试核心功能
5. 整体系统测试

---

**注意**: 此清理将使系统回到最简单的"项目→材料→状态管理"模式，失去复杂的库存分配和需求管理功能。
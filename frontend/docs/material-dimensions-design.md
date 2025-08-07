# 板材尺寸管理扩展设计方案

## 问题描述

当前系统只能管理相同厚度板材的总数量，无法区分不同尺寸规格。例如：
- 2mm碳板：总共20张，但无法知道其中有多少张是 1000×2000mm，多少张是 1200×2400mm
- 需要支持同一厚度材料的不同尺寸规格管理

## 解决方案

### 方案一：扩展现有表结构（推荐）

#### 1. 新增 material_dimensions 表

```sql
-- 板材尺寸详情表
CREATE TABLE material_dimensions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    worker_material_id INT NOT NULL COMMENT '工人板材记录ID',
    width DECIMAL(10,2) COMMENT '宽度（mm）',
    height DECIMAL(10,2) COMMENT '长度（mm）',
    quantity INT NOT NULL DEFAULT 0 COMMENT '该尺寸数量',
    notes TEXT COMMENT '备注（批次、质量等级等）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_material_id) REFERENCES worker_materials(id) ON DELETE CASCADE,
    INDEX idx_worker_material_id (worker_material_id),
    INDEX idx_dimensions (width, height)
);
```

#### 2. 数据关系
```
workers (工人)
  └── worker_materials (工人板材总量)
      └── material_dimensions (具体尺寸明细)
```

#### 3. 数据示例
```sql
-- 工人张三有 2mm碳板 总共15张
INSERT INTO worker_materials (worker_id, thickness_spec_id, quantity, notes) 
VALUES (1, 1, 15, '2mm碳板库存');

-- 其中 1000×2000mm 8张，1200×2400mm 7张
INSERT INTO material_dimensions (worker_material_id, width, height, quantity, notes) VALUES
(1, 1000.00, 2000.00, 8, '标准板材'),
(1, 1200.00, 2400.00, 7, '大板材');
```

### 方案二：API 扩展

#### 1. 新增尺寸管理 API

```javascript
// 获取工人板材尺寸详情
GET /api/worker-materials/{workerId}/dimensions

// 添加尺寸记录
POST /api/worker-materials/{workerMaterialId}/dimensions
{
  "width": 1000.00,
  "height": 2000.00,
  "quantity": 5,
  "notes": "新到货批次"
}

// 更新尺寸数量
PUT /api/worker-materials/dimensions/{dimensionId}
{
  "quantity": 3
}

// 删除尺寸记录
DELETE /api/worker-materials/dimensions/{dimensionId}
```

### 方案三：前端界面扩展

#### 1. 表格列扩展
在现有板材数量单元格基础上，支持点击展开尺寸详情：

```
碳板 2mm: 15张 ▼
  ├── 1000×2000mm: 8张
  └── 1200×2400mm: 7张
```

#### 2. 编辑模态框增强
在 WorkerMaterialEditModal 中添加尺寸管理功能：

```typescript
// 材料编辑项增加尺寸列表
interface MaterialWithDimensions {
  id: number;
  materialType: string;
  thickness: string;
  quantity: number;
  dimensions: Array<{
    id: number;
    width: number;
    height: number;
    quantity: number;
    notes?: string;
  }>;
}
```

#### 3. 尺寸添加界面
在编辑模态框中添加"添加尺寸"按钮，支持：
- 输入宽度、长度、数量
- 自动计算并验证总数量一致性
- 支持批次备注

## 实现优先级

### 第一阶段：数据库结构扩展
1. ✅ 创建 material_dimensions 表
2. ✅ 添加约束和索引
3. ✅ 编写数据迁移脚本

### 第二阶段：API 扩展
1. ✅ 实现尺寸管理 CRUD API
2. ✅ 修改现有 worker-materials API，支持返回尺寸详情
3. ✅ 添加数量一致性校验

### 第三阶段：前端界面
1. ✅ 修改表格显示，支持尺寸信息提示
2. ✅ 扩展编辑模态框，添加尺寸管理功能
3. ✅ 添加尺寸添加/编辑组件

## 数据一致性保证

### 1. 数量校验
```sql
-- 触发器：确保尺寸明细总和等于主记录数量
DELIMITER $$
CREATE TRIGGER check_quantity_consistency 
AFTER INSERT ON material_dimensions
FOR EACH ROW
BEGIN
    DECLARE total_dimensions_qty INT DEFAULT 0;
    DECLARE main_qty INT DEFAULT 0;
    
    SELECT SUM(quantity) INTO total_dimensions_qty 
    FROM material_dimensions 
    WHERE worker_material_id = NEW.worker_material_id;
    
    SELECT quantity INTO main_qty 
    FROM worker_materials 
    WHERE id = NEW.worker_material_id;
    
    IF total_dimensions_qty > main_qty THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = '尺寸明细总量不能超过主记录数量';
    END IF;
END$$
DELIMITER ;
```

### 2. 前端校验
- 添加尺寸时实时计算总量
- 修改主记录数量时检查是否有尺寸明细
- 删除尺寸明细时自动更新主记录数量

## 用户体验优化

### 1. 渐进式披露
- 默认显示总量，点击可展开尺寸详情
- 支持"只显示有尺寸明细的材料"筛选
- 快速添加常用尺寸（预设模板）

### 2. 批量操作
- 支持批量添加相同尺寸的不同材料
- 支持从 Excel 导入尺寸数据
- 支持尺寸规格标准化管理

### 3. 统计报表
- 按尺寸规格统计库存分布
- 生成材料利用率报告
- 支持尺寸需求预测

## 技术实现细节

### 1. 数据库查询优化
```sql
-- 获取工人板材及尺寸详情
SELECT 
    wm.id, wm.quantity as total_quantity,
    ts.material_type, ts.thickness,
    md.width, md.height, md.quantity as dimension_quantity, md.notes
FROM worker_materials wm
JOIN thickness_specs ts ON wm.thickness_spec_id = ts.id
LEFT JOIN material_dimensions md ON wm.id = md.worker_material_id
WHERE wm.worker_id = ?
ORDER BY ts.material_type, ts.thickness, md.width, md.height;
```

### 2. 缓存策略
- 使用 Redis 缓存常用尺寸组合
- 实现尺寸规格的智能提示
- 缓存统计数据，定期更新

### 3. 事务处理
- 尺寸明细的增删改操作必须在事务中执行
- 自动同步主记录数量
- 支持操作回滚

## 总结

这个扩展方案能够在不影响现有功能的基础上，为系统添加精细化的尺寸管理能力。通过渐进式实现，可以：

1. **第一阶段**：完成数据库扩展，为将来功能做准备
2. **第二阶段**：实现基础的尺寸管理 API
3. **第三阶段**：提供用户友好的界面操作

这样既保证了系统的向后兼容性，又为精细化管理提供了完整的解决方案。
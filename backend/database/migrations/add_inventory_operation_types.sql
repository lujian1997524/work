-- 添加新的库存管理操作类型到 operation_history 表的 ENUM 字段
-- 此脚本用于解决操作历史记录功能导致的500错误问题

-- 首先查看当前的 ENUM 定义
SHOW COLUMNS FROM operation_history LIKE 'operation_type';

-- 修改 operation_type 字段，添加库存管理相关的新 ENUM 值
ALTER TABLE operation_history 
MODIFY COLUMN operation_type ENUM(
  -- 原有操作类型
  'material_update', 'drawing_upload', 'project_update', 'project_create', 'project_delete',
  -- 项目生命周期操作类型
  'material_start', 'material_complete', 'material_transfer', 'material_allocate',
  'requirement_add', 'requirement_allocate', 'project_status_change', 'worker_assign',
  'project_milestone', 'quality_check', 'delivery_schedule', 'resource_allocation',
  'batch_operation', 'system_backup', 'data_export', 'priority_change',
  -- 新增的材料库存管理操作类型（解决500错误）
  'material_stock', 'material_dimension_update', 'material_dimension_delete'
) NOT NULL COMMENT '操作类型：包含完整项目生命周期的所有关键操作';

-- 验证修改结果
SHOW COLUMNS FROM operation_history LIKE 'operation_type';

-- 测试插入新的操作类型（验证ENUM值是否生效）
INSERT INTO operation_history (
  project_id, 
  operation_type, 
  operation_description, 
  details, 
  operated_by,
  created_at
) VALUES (
  0,
  'material_stock',
  '测试材料入库操作记录',
  '{"test": true, "materialType": "碳板", "thickness": 2, "unit": "mm", "quantity": 10}',
  1,
  NOW()
);

-- 查看测试记录
SELECT * FROM operation_history WHERE operation_type IN ('material_stock', 'material_dimension_update', 'material_dimension_delete') ORDER BY id DESC LIMIT 5;

-- 删除测试记录
DELETE FROM operation_history WHERE operation_description = '测试材料入库操作记录' AND operated_by = 1;

-- 显示操作完成信息
SELECT 'ENUM值添加完成，可以恢复操作历史记录功能' AS status;
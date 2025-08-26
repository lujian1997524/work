-- 数据库同步脚本：添加 material_dimension_transfer 操作类型
-- 这个脚本用于确保数据库表结构与模型定义保持一致

USE work;

-- 直接更新操作类型枚举，添加 material_dimension_transfer
ALTER TABLE operation_history 
MODIFY COLUMN operation_type ENUM(
  'material_update',
  'drawing_upload', 
  'project_update',
  'project_create',
  'project_delete',
  'material_start',
  'material_complete',
  'material_transfer',
  'material_allocate',
  'requirement_add',
  'requirement_allocate',
  'project_status_change',
  'worker_assign',
  'project_milestone',
  'quality_check',
  'delivery_schedule',
  'resource_allocation',
  'batch_operation',
  'system_backup',
  'data_export',
  'priority_change',
  'material_stock',
  'material_dimension_update',
  'material_dimension_delete',
  'material_dimension_transfer'
) NOT NULL COMMENT '操作类型：包含完整项目生命周期的所有关键操作';

-- 查看最近的操作记录
SELECT 
  id,
  operation_type,
  operation_description,
  created_at
FROM operation_history 
ORDER BY created_at DESC 
LIMIT 10;
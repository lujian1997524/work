-- ============================================================================
-- 材料操作记录字段添加脚本 (简化版)
-- 创建时间：2025-08-24
-- 描述：为materials表添加操作记录相关字段，支持扣除操作历史追踪
-- 版本：v1.1 (无权限依赖版本)
-- ============================================================================

USE work;

SELECT '=== 材料操作记录字段添加开始 ===' as status, NOW() as start_time;

-- ============================================================================
-- 第一步：直接添加操作记录字段 (忽略已存在错误)
-- ============================================================================
SELECT '=== 添加操作记录字段 ===' as step;

-- 添加扣除备注字段
-- 如果字段已存在会报错，但不影响脚本继续执行
ALTER TABLE materials ADD COLUMN deduction_notes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '扣除操作备注';

-- 添加批次ID字段  
ALTER TABLE materials ADD COLUMN deduction_batch_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '批量扣除批次ID，用于关联同一次批量操作';

-- 添加操作类型字段
ALTER TABLE materials ADD COLUMN operation_type ENUM('deduction', 'supplement', 'adjustment', 'allocation', 'return') DEFAULT 'deduction' COMMENT '操作类型：扣除、补充、调整、分配、归还';

SELECT '操作记录字段添加完成（如有字段已存在的错误可忽略）' as info;

-- ============================================================================
-- 第二步：添加索引优化查询性能
-- ============================================================================
SELECT '=== 添加索引优化查询 ===' as step;

-- 为批次ID添加索引（如果索引已存在会报错，但不影响执行）
CREATE INDEX idx_materials_batch_id ON materials(deduction_batch_id);

-- 为操作类型添加索引
CREATE INDEX idx_materials_operation_type ON materials(operation_type);

-- 为操作记录查询添加复合索引
CREATE INDEX idx_materials_operation_history ON materials(completed_date, operation_type, completed_by);

SELECT '索引创建完成（如有索引已存在的错误可忽略）' as info;

-- ============================================================================
-- 第三步：验证字段添加结果
-- ============================================================================
SELECT '=== 验证字段添加结果 ===' as step;

-- 简单的数据统计验证
SELECT 
    COUNT(*) as '总记录数',
    SUM(CASE WHEN deduction_notes IS NULL THEN 1 ELSE 0 END) as '备注为空的记录数',
    SUM(CASE WHEN deduction_batch_id IS NULL THEN 1 ELSE 0 END) as '批次ID为空的记录数',
    SUM(CASE WHEN operation_type = 'deduction' THEN 1 ELSE 0 END) as '扣除类型记录数'
FROM materials;

-- ============================================================================
-- 第四步：显示表结构（验证字段是否添加成功）
-- ============================================================================
SELECT '=== 显示materials表结构 ===' as step;
SHOW COLUMNS FROM materials LIKE '%deduction%';
SHOW COLUMNS FROM materials LIKE '%operation%';

-- ============================================================================
-- 第五步：创建示例查询
-- ============================================================================
SELECT '=== 示例查询语句 ===' as step;

-- 查询最近的操作记录示例
SELECT 
    m.id,
    DATE_FORMAT(m.completed_date, '%Y-%m-%d %H:%i') as 操作时间,
    m.operation_type as 操作类型,
    IFNULL(m.deduction_notes, '无备注') as 备注,
    IFNULL(m.deduction_batch_id, '单个操作') as 批次ID,
    m.status as 状态
FROM materials m
WHERE m.completed_date IS NOT NULL 
ORDER BY m.completed_date DESC
LIMIT 5;

-- ============================================================================
-- 完成
-- ============================================================================
SELECT '=== 材料操作记录字段添加完成 ===' as status, NOW() as end_time;

SELECT 
    '脚本执行完成！' as message,
    '新增字段：deduction_notes（备注）, deduction_batch_id（批次ID）, operation_type（操作类型）' as added_fields,
    '如出现字段或索引已存在的错误，可安全忽略' as note,
    '现有数据完全不受影响，新字段均可为空且有默认值' as data_safety;
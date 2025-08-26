-- ============================================================================
-- 材料操作记录字段添加脚本
-- 创建时间：2025-08-24
-- 描述：为materials表添加操作记录相关字段，支持扣除操作历史追踪
-- 版本：v1.0
-- ============================================================================

USE work;

-- 设置安全模式
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

SELECT '=== 材料操作记录字段添加开始 ===' as status, NOW() as start_time;

-- ============================================================================
-- 第一步：检查现有表结构
-- ============================================================================
SELECT '=== 检查materials表当前结构 ===' as step;

-- 显示当前materials表结构
SHOW CREATE TABLE materials;

-- 检查是否已存在目标字段
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'work' 
    AND TABLE_NAME = 'materials' 
    AND COLUMN_NAME IN ('deduction_notes', 'deduction_batch_id', 'operation_type');

-- ============================================================================
-- 第二步：添加操作记录字段
-- ============================================================================
SELECT '=== 添加操作记录字段 ===' as step;

-- 添加扣除备注字段
SET @sql_notes = (
    SELECT IF(COUNT(*) = 0, 
        'ALTER TABLE materials ADD COLUMN deduction_notes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT "扣除操作备注"',
        'SELECT "deduction_notes字段已存在，跳过添加" as result'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND COLUMN_NAME = 'deduction_notes'
);
PREPARE stmt FROM @sql_notes; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加批次ID字段
SET @sql_batch = (
    SELECT IF(COUNT(*) = 0, 
        'ALTER TABLE materials ADD COLUMN deduction_batch_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT "批量扣除批次ID，用于关联同一次批量操作"',
        'SELECT "deduction_batch_id字段已存在，跳过添加" as result'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND COLUMN_NAME = 'deduction_batch_id'
);
PREPARE stmt FROM @sql_batch; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加操作类型字段
SET @sql_operation = (
    SELECT IF(COUNT(*) = 0, 
        'ALTER TABLE materials ADD COLUMN operation_type ENUM("deduction", "supplement", "adjustment", "allocation", "return") DEFAULT "deduction" COMMENT "操作类型：扣除、补充、调整、分配、归还"',
        'SELECT "operation_type字段已存在，跳过添加" as result'
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND COLUMN_NAME = 'operation_type'
);
PREPARE stmt FROM @sql_operation; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT '操作记录字段添加完成' as info;

-- ============================================================================
-- 第三步：添加索引优化查询性能
-- ============================================================================
SELECT '=== 添加索引优化查询 ===' as step;

-- 为批次ID添加索引（用于批量操作查询）
SET @sql_idx_batch = (
    SELECT IF(COUNT(*) = 0,
        'CREATE INDEX idx_materials_batch_id ON materials(deduction_batch_id)',
        'SELECT "idx_materials_batch_id索引已存在，跳过创建" as result'
    )
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND INDEX_NAME = 'idx_materials_batch_id'
);
PREPARE stmt FROM @sql_idx_batch; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 为操作类型添加索引（用于操作类型筛选）
SET @sql_idx_operation = (
    SELECT IF(COUNT(*) = 0,
        'CREATE INDEX idx_materials_operation_type ON materials(operation_type)',
        'SELECT "idx_materials_operation_type索引已存在，跳过创建" as result'
    )
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND INDEX_NAME = 'idx_materials_operation_type'
);
PREPARE stmt FROM @sql_idx_operation; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 为操作记录查询添加复合索引（时间+操作类型）
SET @sql_idx_compound = (
    SELECT IF(COUNT(*) = 0,
        'CREATE INDEX idx_materials_operation_history ON materials(completed_date, operation_type, completed_by)',
        'SELECT "idx_materials_operation_history索引已存在，跳过创建" as result'
    )
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND INDEX_NAME = 'idx_materials_operation_history'
);
PREPARE stmt FROM @sql_idx_compound; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT '索引创建完成' as info;

-- ============================================================================
-- 第四步：验证字段添加结果
-- ============================================================================
SELECT '=== 验证字段添加结果 ===' as step;

-- 检查新添加的字段
SELECT 
    COLUMN_NAME as '字段名',
    COLUMN_TYPE as '字段类型',
    IS_NULLABLE as '可为空',
    COLUMN_DEFAULT as '默认值',
    COLUMN_COMMENT as '注释'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'work' 
    AND TABLE_NAME = 'materials' 
    AND COLUMN_NAME IN ('deduction_notes', 'deduction_batch_id', 'operation_type')
ORDER BY ORDINAL_POSITION;

-- 检查新添加的索引
SELECT 
    INDEX_NAME as '索引名',
    COLUMN_NAME as '字段名',
    NON_UNIQUE as '非唯一',
    INDEX_COMMENT as '注释'
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND INDEX_NAME IN ('idx_materials_batch_id', 'idx_materials_operation_type', 'idx_materials_operation_history')
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ============================================================================
-- 第五步：数据完整性检查
-- ============================================================================
SELECT '=== 数据完整性检查 ===' as step;

-- 检查现有数据记录数
SELECT 
    COUNT(*) as '总记录数',
    COUNT(CASE WHEN deduction_notes IS NOT NULL THEN 1 END) as '有备注记录数',
    COUNT(CASE WHEN deduction_batch_id IS NOT NULL THEN 1 END) as '有批次ID记录数',
    COUNT(CASE WHEN operation_type IS NOT NULL THEN 1 END) as '有操作类型记录数'
FROM materials;

-- 检查各操作类型的分布
SELECT 
    IFNULL(operation_type, 'NULL') as '操作类型',
    COUNT(*) as '记录数'
FROM materials 
GROUP BY operation_type;

-- ============================================================================
-- 第六步：创建示例查询语句
-- ============================================================================
SELECT '=== 示例查询语句 ===' as step;

-- 示例1：查询最近的扣除操作记录
SELECT '-- 查询最近的扣除操作记录' as example_query;
SELECT 
    '
SELECT 
    m.id,
    m.completed_date as 操作时间,
    m.operation_type as 操作类型,
    p.name as 项目名称,
    CONCAT(ts.material_type, " ", ts.thickness, ts.unit) as 厚度规格,
    w.name as 工人名称,
    u.name as 操作人,
    m.deduction_notes as 备注,
    m.deduction_batch_id as 批次ID
FROM materials m
LEFT JOIN projects p ON m.project_id = p.id
LEFT JOIN thickness_specs ts ON m.thickness_spec_id = ts.id  
LEFT JOIN workers w ON m.completed_by = w.id
LEFT JOIN users u ON m.completed_by = u.id
WHERE m.completed_date IS NOT NULL 
    AND m.operation_type = "deduction"
ORDER BY m.completed_date DESC
LIMIT 20;
    ' as query_text;

-- 示例2：查询批量操作记录
SELECT '-- 查询批量操作记录' as example_query;
SELECT 
    '
SELECT 
    m.deduction_batch_id as 批次ID,
    COUNT(*) as 操作数量,
    MIN(m.completed_date) as 开始时间,
    MAX(m.completed_date) as 结束时间,
    u.name as 操作人,
    GROUP_CONCAT(DISTINCT p.name) as 涉及项目
FROM materials m
LEFT JOIN users u ON m.completed_by = u.id
LEFT JOIN projects p ON m.project_id = p.id
WHERE m.deduction_batch_id IS NOT NULL
GROUP BY m.deduction_batch_id, u.name
ORDER BY MIN(m.completed_date) DESC;
    ' as query_text;

-- ============================================================================
-- 完成
-- ============================================================================
SELECT '=== 材料操作记录字段添加完成 ===' as status, NOW() as end_time;

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

SELECT 
    '脚本执行完成！' as message,
    '新增字段：deduction_notes, deduction_batch_id, operation_type' as added_fields,
    '新增索引：idx_materials_batch_id, idx_materials_operation_type, idx_materials_operation_history' as added_indexes,
    '现有数据完全不受影响，字段均可为空' as data_safety;
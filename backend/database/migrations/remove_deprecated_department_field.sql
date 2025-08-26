-- 移除workers表中废弃的department字段
-- 此字段已被departmentId外键字段替代
-- v2.8.0 - 数据库字段清理

-- 检查字段是否存在
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'workers'
  AND COLUMN_NAME = 'department'
);

-- 如果字段存在，则删除
SET @sql = IF(@column_exists > 0,
  'ALTER TABLE workers DROP COLUMN department',
  'SELECT "Department column does not exist" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 验证删除结果
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Department字段已成功删除'
    ELSE '❌ Department字段仍然存在'
  END as result
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'workers'
  AND COLUMN_NAME = 'department';

-- 确认正确的departmentId字段仍然存在
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ DepartmentId字段正常存在'
    ELSE '❌ 警告：DepartmentId字段不存在'
  END as departmentId_check
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'workers'
  AND COLUMN_NAME = 'departmentId';

-- 显示workers表的最终字段结构
SELECT 
  COLUMN_NAME as '字段名',
  DATA_TYPE as '数据类型',
  IS_NULLABLE as '允许空值',
  COLUMN_DEFAULT as '默认值',
  COLUMN_COMMENT as '注释'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'workers'
ORDER BY ORDINAL_POSITION;
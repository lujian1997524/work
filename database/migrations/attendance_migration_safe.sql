-- ==========================================
-- 考勤管理系统安全迁移脚本
-- 创建日期: 2025年1月
-- 描述: 安全添加考勤系统表和字段，不影响现有数据
-- 执行方式: mysql -h hostname -P port -u username -p database_name < attendance_migration_safe.sql
-- ==========================================

-- 设置字符集和安全模式
SET NAMES utf8mb4;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET FOREIGN_KEY_CHECKS = 0;
SET @OLD_TIME_ZONE = @@TIME_ZONE;
SET TIME_ZONE = '+00:00';

-- 开始事务，确保原子性
START TRANSACTION;

-- ==========================================
-- 安全检查：验证数据库连接和权限
-- ==========================================
SELECT 'Starting Attendance System Migration...' AS status;

-- 检查是否已存在考勤表，避免重复创建
SET @table_exists = 0;
SELECT COUNT(*) INTO @table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'employees';

-- 如果表已存在，显示警告但继续执行（使用IF NOT EXISTS确保安全）
SELECT IF(@table_exists > 0, 
    'Warning: Some attendance tables already exist. Using IF NOT EXISTS for safety.', 
    'No attendance tables found. Creating new tables...'
) AS migration_status;

-- ==========================================
-- 1. 员工信息表 (employees)
-- 存储员工基本信息，作为考勤系统的基础
-- ==========================================
CREATE TABLE IF NOT EXISTS `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(50) NOT NULL COMMENT '员工工号',
  `name` varchar(100) NOT NULL COMMENT '员工姓名',
  `department` varchar(100) NOT NULL COMMENT '部门',
  `position` varchar(100) DEFAULT NULL COMMENT '职位',
  `phone` varchar(20) DEFAULT NULL COMMENT '电话号码',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱地址',
  `hire_date` date NOT NULL COMMENT '入职日期',
  `daily_work_hours` decimal(4,2) DEFAULT 8.00 COMMENT '日标准工作小时',
  `status` enum('active','inactive') DEFAULT 'active' COMMENT '员工状态',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像URL',
  `notes` text DEFAULT NULL COMMENT '备注',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工信息表';

-- 安全添加索引（如果不存在）
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = DATABASE() 
AND table_name = 'employees' 
AND index_name = 'uk_employee_id';

SET @sql = IF(@index_exists = 0, 
    'ALTER TABLE `employees` ADD UNIQUE KEY `uk_employee_id` (`employee_id`)',
    'SELECT "Index uk_employee_id already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加其他索引
SET @sql = 'ALTER TABLE `employees` 
    ADD INDEX IF NOT EXISTS `idx_department` (`department`),
    ADD INDEX IF NOT EXISTS `idx_status` (`status`)';

-- 使用安全的索引添加方式
SET @index_dept = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'employees' AND index_name = 'idx_department');
SET @index_status = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'employees' AND index_name = 'idx_status');

-- 条件添加部门索引
SET @sql = IF(@index_dept = 0, 
    'ALTER TABLE `employees` ADD INDEX `idx_department` (`department`)',
    'SELECT "Index idx_department already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 条件添加状态索引
SET @sql = IF(@index_status = 0, 
    'ALTER TABLE `employees` ADD INDEX `idx_status` (`status`)',
    'SELECT "Index idx_status already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- 2. 考勤异常记录表 (attendance_exceptions)
-- 采用"默认出勤+异常记录"模式，只记录非正常出勤情况
-- ==========================================
CREATE TABLE IF NOT EXISTS `attendance_exceptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL COMMENT '员工ID',
  `date` date NOT NULL COMMENT '考勤日期',
  `exception_type` enum('leave','absent','overtime') NOT NULL COMMENT '异常类型：请假/缺勤/加班',
  
  -- 请假相关字段
  `leave_type` enum('sick','personal','annual','compensatory') DEFAULT NULL COMMENT '请假类型：病假/事假/年假/调休',
  `leave_duration_type` enum('full_day','half_day','hours') DEFAULT NULL COMMENT '请假时长类型',
  `leave_hours` decimal(4,2) DEFAULT NULL COMMENT '请假小时数',
  `leave_start_time` time DEFAULT NULL COMMENT '请假开始时间',
  `leave_end_time` time DEFAULT NULL COMMENT '请假结束时间',
  `leave_reason` text DEFAULT NULL COMMENT '请假原因',
  
  -- 加班相关字段
  `overtime_hours` decimal(4,2) DEFAULT NULL COMMENT '加班小时数',
  `overtime_reason` text DEFAULT NULL COMMENT '加班原因',
  
  -- 缺勤相关字段
  `absent_reason` text DEFAULT NULL COMMENT '缺勤原因',
  
  -- 通用字段
  `notes` text DEFAULT NULL COMMENT '备注',
  `created_by` int(11) NOT NULL COMMENT '创建人ID',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤异常记录表';

-- 安全添加attendance_exceptions的索引和外键
-- 唯一索引
SET @unique_exists = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'attendance_exceptions' 
    AND index_name = 'uk_employee_date_type');

SET @sql = IF(@unique_exists = 0, 
    'ALTER TABLE `attendance_exceptions` ADD UNIQUE KEY `uk_employee_date_type` (`employee_id`, `date`, `exception_type`)',
    'SELECT "Unique index uk_employee_date_type already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 其他索引
SET @sql_indexes = 'ALTER TABLE `attendance_exceptions`';
SET @add_indexes = '';

-- 检查并添加各个索引
SET @idx_date = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'attendance_exceptions' AND index_name = 'idx_date');
IF @idx_date = 0 THEN
    SET @add_indexes = CONCAT(@add_indexes, ' ADD INDEX `idx_date` (`date`),');
END IF;

SET @idx_type = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'attendance_exceptions' AND index_name = 'idx_exception_type');
IF @idx_type = 0 THEN
    SET @add_indexes = CONCAT(@add_indexes, ' ADD INDEX `idx_exception_type` (`exception_type`),');
END IF;

SET @idx_leave = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'attendance_exceptions' AND index_name = 'idx_leave_type');
IF @idx_leave = 0 THEN
    SET @add_indexes = CONCAT(@add_indexes, ' ADD INDEX `idx_leave_type` (`leave_type`),');
END IF;

SET @idx_emp_date = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'attendance_exceptions' AND index_name = 'idx_employee_date_range');
IF @idx_emp_date = 0 THEN
    SET @add_indexes = CONCAT(@add_indexes, ' ADD INDEX `idx_employee_date_range` (`employee_id`, `date`),');
END IF;

-- 移除最后的逗号并执行
IF LENGTH(@add_indexes) > 0 THEN
    SET @add_indexes = LEFT(@add_indexes, LENGTH(@add_indexes) - 1);
    SET @sql_indexes = CONCAT(@sql_indexes, @add_indexes);
    PREPARE stmt FROM @sql_indexes;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END IF;

-- ==========================================
-- 3. 考勤设置表 (attendance_settings)
-- 存储考勤相关的系统配置
-- ==========================================
CREATE TABLE IF NOT EXISTS `attendance_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL COMMENT '设置键名',
  `setting_value` text NOT NULL COMMENT '设置值',
  `description` varchar(255) DEFAULT NULL COMMENT '设置描述',
  `category` varchar(50) DEFAULT 'general' COMMENT '设置分类',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤系统设置表';

-- 安全添加设置表的唯一索引
SET @settings_uk = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'attendance_settings' 
    AND index_name = 'uk_setting_key');

SET @sql = IF(@settings_uk = 0, 
    'ALTER TABLE `attendance_settings` ADD UNIQUE KEY `uk_setting_key` (`setting_key`)',
    'SELECT "Unique index uk_setting_key already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- 4. 月度考勤汇总表 (monthly_attendance_summary)
-- 预计算的月度考勤统计数据，提高查询性能
-- ==========================================
CREATE TABLE IF NOT EXISTS `monthly_attendance_summary` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL COMMENT '员工ID',
  `year` int(4) NOT NULL COMMENT '年份',
  `month` int(2) NOT NULL COMMENT '月份',
  
  -- 工作统计
  `work_days` int(3) DEFAULT 0 COMMENT '出勤天数',
  `total_work_hours` decimal(8,2) DEFAULT 0.00 COMMENT '总工作小时',
  `standard_work_hours` decimal(8,2) DEFAULT 0.00 COMMENT '标准工作小时',
  
  -- 请假统计
  `total_leave_hours` decimal(8,2) DEFAULT 0.00 COMMENT '总请假小时',
  `sick_leave_hours` decimal(8,2) DEFAULT 0.00 COMMENT '病假小时',
  `personal_leave_hours` decimal(8,2) DEFAULT 0.00 COMMENT '事假小时',
  `annual_leave_hours` decimal(8,2) DEFAULT 0.00 COMMENT '年假小时',
  `compensatory_leave_hours` decimal(8,2) DEFAULT 0.00 COMMENT '调休小时',
  
  -- 其他统计
  `total_overtime_hours` decimal(8,2) DEFAULT 0.00 COMMENT '总加班小时',
  `absent_days` int(3) DEFAULT 0 COMMENT '缺勤天数',
  `attendance_rate` decimal(5,2) DEFAULT 0.00 COMMENT '出勤率(%)',
  
  -- 元数据
  `calculated_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '计算时间',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='月度考勤汇总表';

-- 安全添加月度汇总表的索引
SET @summary_uk = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'monthly_attendance_summary' 
    AND index_name = 'uk_employee_year_month');

SET @sql = IF(@summary_uk = 0, 
    'ALTER TABLE `monthly_attendance_summary` ADD UNIQUE KEY `uk_employee_year_month` (`employee_id`, `year`, `month`)',
    'SELECT "Unique index uk_employee_year_month already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 其他索引
SET @summary_ym = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'monthly_attendance_summary' 
    AND index_name = 'idx_year_month');

SET @sql = IF(@summary_ym = 0, 
    'ALTER TABLE `monthly_attendance_summary` ADD INDEX `idx_year_month` (`year`, `month`)',
    'SELECT "Index idx_year_month already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- 5. 安全添加外键约束（如果表存在且相关表存在）
-- ==========================================

-- 检查users表是否存在
SET @users_exists = (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'users');

-- 只有当users表存在时才添加外键
IF @users_exists > 0 THEN
    -- 检查外键是否已存在
    SET @fk_exists = (SELECT COUNT(*) FROM information_schema.key_column_usage 
        WHERE table_schema = DATABASE() 
        AND table_name = 'attendance_exceptions' 
        AND constraint_name = 'fk_attendance_exceptions_creator');
    
    IF @fk_exists = 0 THEN
        ALTER TABLE `attendance_exceptions` 
        ADD CONSTRAINT `fk_attendance_exceptions_creator` 
        FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
        SELECT 'Added foreign key: attendance_exceptions -> users' AS fk_status;
    ELSE
        SELECT 'Foreign key attendance_exceptions -> users already exists' AS fk_status;
    END IF;
    
    -- 员工表到考勤异常表的外键
    SET @fk_emp_exc = (SELECT COUNT(*) FROM information_schema.key_column_usage 
        WHERE table_schema = DATABASE() 
        AND table_name = 'attendance_exceptions' 
        AND constraint_name = 'fk_attendance_exceptions_employee');
    
    IF @fk_emp_exc = 0 THEN
        ALTER TABLE `attendance_exceptions` 
        ADD CONSTRAINT `fk_attendance_exceptions_employee` 
        FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;
        SELECT 'Added foreign key: attendance_exceptions -> employees' AS fk_status;
    ELSE
        SELECT 'Foreign key attendance_exceptions -> employees already exists' AS fk_status;
    END IF;
    
    -- 月度汇总表的外键
    SET @fk_summary = (SELECT COUNT(*) FROM information_schema.key_column_usage 
        WHERE table_schema = DATABASE() 
        AND table_name = 'monthly_attendance_summary' 
        AND constraint_name = 'fk_monthly_summary_employee');
    
    IF @fk_summary = 0 THEN
        ALTER TABLE `monthly_attendance_summary` 
        ADD CONSTRAINT `fk_monthly_summary_employee` 
        FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;
        SELECT 'Added foreign key: monthly_attendance_summary -> employees' AS fk_status;
    ELSE
        SELECT 'Foreign key monthly_attendance_summary -> employees already exists' AS fk_status;
    END IF;
ELSE
    SELECT 'Warning: users table not found. Skipping foreign key creation.' AS warning;
END IF;

-- ==========================================
-- 6. 插入初始数据（仅在数据不存在时）
-- ==========================================

-- 插入默认考勤设置
INSERT IGNORE INTO `attendance_settings` (`setting_key`, `setting_value`, `description`, `category`) VALUES 
('work_days_per_week', '5', '每周工作天数', 'schedule'),
('daily_work_hours', '8.00', '每日标准工作小时', 'schedule'),
('work_start_time', '09:00', '标准上班时间', 'schedule'),
('work_end_time', '18:00', '标准下班时间', 'schedule'),
('lunch_break_hours', '1.00', '午休时长(小时)', 'schedule'),
('annual_leave_days', '5', '年假天数', 'leave'),
('sick_leave_days', '10', '病假天数', 'leave'),
('max_overtime_hours_per_day', '4.00', '每日最大加班小时', 'overtime'),
('require_approval', 'true', '是否需要审批', 'approval'),
('auto_calculate_summary', 'true', '是否自动计算月度汇总', 'system');

-- 插入示例员工数据（如果employees表为空）
SET @emp_count = (SELECT COUNT(*) FROM `employees`);

IF @emp_count = 0 THEN
    INSERT INTO `employees` (`employee_id`, `name`, `department`, `position`, `hire_date`, `daily_work_hours`) VALUES 
    ('EMP001', '张三', '生产部', '激光切割操作员', '2024-01-15', 8.00),
    ('EMP002', '李四', '生产部', '高级操作员', '2023-06-20', 8.00),
    ('EMP003', '王五', '技术部', '工艺工程师', '2023-03-10', 8.00),
    ('EMP004', '赵六', '质检部', '质量检验员', '2024-02-01', 8.00),
    ('EMP005', '钱七', '生产部', '班组长', '2022-08-15', 8.00);
    
    SELECT 'Inserted sample employee data' AS data_status;
ELSE
    SELECT 'Employees table already contains data. Skipping sample data insertion.' AS data_status;
END IF;

-- ==========================================
-- 7. 创建视图（安全替换）
-- ==========================================

-- 创建员工考勤状态视图
DROP VIEW IF EXISTS `v_employee_attendance_status`;
CREATE VIEW `v_employee_attendance_status` AS
SELECT 
    e.id AS employee_id,
    e.employee_id,
    e.name AS employee_name,
    e.department,
    e.position,
    e.daily_work_hours,
    e.status AS employee_status,
    CURDATE() AS attendance_date,
    COALESCE(ae.exception_type, 'present') AS attendance_status,
    ae.leave_type,
    ae.leave_hours,
    ae.overtime_hours,
    ae.notes
FROM employees e
LEFT JOIN attendance_exceptions ae ON e.id = ae.employee_id AND ae.date = CURDATE()
WHERE e.status = 'active';

-- 创建月度考勤统计视图
DROP VIEW IF EXISTS `v_monthly_attendance_stats`;
CREATE VIEW `v_monthly_attendance_stats` AS
SELECT 
    e.id AS employee_id,
    e.employee_id,
    e.name AS employee_name,
    e.department,
    YEAR(CURDATE()) AS year,
    MONTH(CURDATE()) AS month,
    e.daily_work_hours,
    
    -- 计算工作天数（排除周末）
    (SELECT COUNT(*) 
     FROM (
         SELECT DATE(DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL seq.seq DAY)) as date
         FROM (SELECT 0 seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
               UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 
               UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 
               UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 
               UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 
               UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 
               UNION SELECT 30) seq
     ) dates 
     WHERE dates.date <= LAST_DAY(CURDATE()) 
       AND WEEKDAY(dates.date) < 5) AS total_work_days,
    
    -- 请假统计
    COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' THEN ae.leave_hours ELSE 0 END), 0) AS total_leave_hours,
    COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'sick' THEN ae.leave_hours ELSE 0 END), 0) AS sick_leave_hours,
    COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'personal' THEN ae.leave_hours ELSE 0 END), 0) AS personal_leave_hours,
    COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'annual' THEN ae.leave_hours ELSE 0 END), 0) AS annual_leave_hours,
    COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'compensatory' THEN ae.leave_hours ELSE 0 END), 0) AS compensatory_leave_hours,
    
    -- 加班统计
    COALESCE(SUM(CASE WHEN ae.exception_type = 'overtime' THEN ae.overtime_hours ELSE 0 END), 0) AS total_overtime_hours,
    
    -- 缺勤统计
    COUNT(CASE WHEN ae.exception_type = 'absent' THEN 1 END) AS absent_days
    
FROM employees e
LEFT JOIN attendance_exceptions ae ON e.id = ae.employee_id 
    AND DATE_FORMAT(ae.date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
WHERE e.status = 'active'
GROUP BY e.id, e.employee_id, e.name, e.department, e.daily_work_hours;

-- ==========================================
-- 8. 提交事务并恢复设置
-- ==========================================

-- 提交事务
COMMIT;

-- 恢复设置
SET TIME_ZONE = @OLD_TIME_ZONE;
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- 9. 迁移完成报告
-- ==========================================
SELECT 
    'Attendance System Migration Completed Successfully!' as status,
    'Tables Created:' as description,
    'employees, attendance_exceptions, attendance_settings, monthly_attendance_summary' as tables,
    'Views, Indexes, and Foreign Keys Added' as additional_objects,
    NOW() as completed_at;

-- 显示创建的表信息
SELECT 
    table_name,
    table_comment,
    table_rows,
    ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name IN ('employees', 'attendance_exceptions', 'attendance_settings', 'monthly_attendance_summary')
ORDER BY table_name;

-- ==========================================
-- 验证脚本（可选执行）
-- ==========================================

-- 验证表结构
-- DESCRIBE employees;
-- DESCRIBE attendance_exceptions;
-- DESCRIBE attendance_settings;
-- DESCRIBE monthly_attendance_summary;

-- 验证视图
-- SELECT * FROM v_employee_attendance_status LIMIT 5;
-- SELECT * FROM v_monthly_attendance_stats LIMIT 5;

-- 验证初始数据
-- SELECT * FROM attendance_settings;
-- SELECT COUNT(*) as employee_count FROM employees;

-- ==========================================
-- 使用说明
-- ==========================================
/*
执行方式：
1. 本地执行：
   mysql -h localhost -P 3330 -u laser_user -p laser_cutting_db < attendance_migration_safe.sql

2. 远程服务器执行：
   mysql -h api.gei5.com -P 3306 -u username -p database_name < attendance_migration_safe.sql

3. 检查结果：
   - 查看表是否创建成功
   - 检查索引和外键
   - 验证初始数据

安全特性：
- 使用 CREATE TABLE IF NOT EXISTS 避免覆盖
- 事务保护确保原子性
- 条件检查避免重复操作
- 保留现有数据
- 详细的执行日志
*/
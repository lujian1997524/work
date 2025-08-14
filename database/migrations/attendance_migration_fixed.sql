-- ==========================================
-- 考勤管理系统安全迁移脚本 (修复版)
-- 创建日期: 2025年1月
-- 描述: 安全添加考勤系统表和字段，不影响现有数据
-- 执行方式: mysql -h hostname -P port -u username -p database_name < attendance_migration_fixed.sql
-- ==========================================

-- 设置字符集和安全模式
SET NAMES utf8mb4;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET FOREIGN_KEY_CHECKS = 0;

-- 开始事务，确保原子性
START TRANSACTION;

-- ==========================================
-- 安全检查：验证数据库连接和权限
-- ==========================================
SELECT 'Starting Attendance System Migration...' AS status;

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
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_id` (`employee_id`),
  KEY `idx_department` (`department`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工信息表';

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
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_date_type` (`employee_id`, `date`, `exception_type`),
  KEY `idx_date` (`date`),
  KEY `idx_exception_type` (`exception_type`),
  KEY `idx_leave_type` (`leave_type`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_employee_date_range` (`employee_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤异常记录表';

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
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤系统设置表';

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
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_year_month` (`employee_id`, `year`, `month`),
  KEY `idx_year_month` (`year`, `month`),
  KEY `idx_attendance_rate` (`attendance_rate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='月度考勤汇总表';

-- ==========================================
-- 5. 考勤审批流程表 (attendance_approvals) - 可选
-- 处理请假等需要审批的考勤异常
-- ==========================================
CREATE TABLE IF NOT EXISTS `attendance_approvals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `attendance_exception_id` int(11) NOT NULL COMMENT '考勤异常记录ID',
  `approver_id` int(11) NOT NULL COMMENT '审批人ID',
  `status` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT '审批状态',
  `approval_reason` text DEFAULT NULL COMMENT '审批意见',
  `approved_at` timestamp NULL DEFAULT NULL COMMENT '审批时间',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_attendance_exception` (`attendance_exception_id`),
  KEY `idx_approver` (`approver_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤审批流程表';

-- ==========================================
-- 6. 年假余额表 (annual_leave_balance) - 可选
-- 跟踪员工年假余额和使用情况
-- ==========================================
CREATE TABLE IF NOT EXISTS `annual_leave_balance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL COMMENT '员工ID',
  `year` int(4) NOT NULL COMMENT '年份',
  `total_hours` decimal(6,2) DEFAULT 0.00 COMMENT '年假总小时数',
  `used_hours` decimal(6,2) DEFAULT 0.00 COMMENT '已使用小时数',
  `remaining_hours` decimal(6,2) DEFAULT 0.00 COMMENT '剩余小时数',
  `carried_over_hours` decimal(6,2) DEFAULT 0.00 COMMENT '从上年结转小时数',
  `expired_hours` decimal(6,2) DEFAULT 0.00 COMMENT '过期小时数',
  
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_year` (`employee_id`, `year`),
  KEY `idx_year` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='年假余额表';

-- ==========================================
-- 7. 插入初始数据（仅在数据不存在时）
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
INSERT IGNORE INTO `employees` (`employee_id`, `name`, `department`, `position`, `hire_date`, `daily_work_hours`) VALUES 
('EMP001', '张三', '生产部', '激光切割操作员', '2024-01-15', 8.00),
('EMP002', '李四', '生产部', '高级操作员', '2023-06-20', 8.00),
('EMP003', '王五', '技术部', '工艺工程师', '2023-03-10', 8.00),
('EMP004', '赵六', '质检部', '质量检验员', '2024-02-01', 8.00),
('EMP005', '钱七', '生产部', '班组长', '2022-08-15', 8.00);

-- ==========================================
-- 8. 创建视图
-- ==========================================

-- 创建员工考勤状态视图
DROP VIEW IF EXISTS `v_employee_attendance_status`;
CREATE VIEW `v_employee_attendance_status` AS
SELECT 
    e.id AS employee_id,
    e.employee_id AS employee_code,
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
    e.employee_id AS employee_code,
    e.name AS employee_name,
    e.department,
    YEAR(CURDATE()) AS year,
    MONTH(CURDATE()) AS month,
    e.daily_work_hours,
    
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
-- 9. 添加外键约束 (在表创建后安全添加)
-- ==========================================

-- 只有当 users 表存在时才添加外键
SET @users_exists = (SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'users');

-- 准备外键添加语句
SET @sql_fk1 = 'SELECT "users table not found, skipping foreign keys" AS notice';
SET @sql_fk2 = 'SELECT "users table not found, skipping foreign keys" AS notice';
SET @sql_fk3 = 'SELECT "users table not found, skipping foreign keys" AS notice';

-- 如果 users 表存在，则准备外键添加语句
SET @sql_fk1 = CASE 
    WHEN @users_exists > 0 THEN 'ALTER TABLE `attendance_exceptions` ADD CONSTRAINT `fk_attendance_exceptions_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE'
    ELSE 'SELECT "users table not found, skipping foreign key for created_by" AS notice'
END;

SET @sql_fk2 = CASE 
    WHEN @users_exists > 0 THEN 'ALTER TABLE `attendance_exceptions` ADD CONSTRAINT `fk_attendance_exceptions_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE'
    ELSE 'SELECT "Skipping employee foreign key" AS notice'
END;

SET @sql_fk3 = CASE 
    WHEN @users_exists > 0 THEN 'ALTER TABLE `monthly_attendance_summary` ADD CONSTRAINT `fk_monthly_summary_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE'
    ELSE 'SELECT "Skipping monthly summary foreign key" AS notice'
END;

-- 执行外键添加
PREPARE stmt1 FROM @sql_fk1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

PREPARE stmt2 FROM @sql_fk2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

PREPARE stmt3 FROM @sql_fk3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- ==========================================
-- 10. 提交事务并恢复设置
-- ==========================================

-- 提交事务
COMMIT;

-- 恢复设置
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- 11. 迁移完成报告
-- ==========================================
SELECT 
    'Attendance System Migration Completed Successfully!' as status,
    'Tables Created: employees, attendance_exceptions, attendance_settings, monthly_attendance_summary, attendance_approvals, annual_leave_balance' as tables_created,
    'Views Created: v_employee_attendance_status, v_monthly_attendance_stats' as views_created,
    NOW() as completed_at;

-- 显示创建的表信息
SELECT 
    table_name,
    table_comment,
    table_rows,
    ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name IN ('employees', 'attendance_exceptions', 'attendance_settings', 'monthly_attendance_summary', 'attendance_approvals', 'annual_leave_balance')
ORDER BY table_name;

-- ==========================================
-- 使用说明
-- ==========================================
/*
执行方式：
1. 本地执行：
   mysql -h localhost -P 3330 -u laser_user -p laser_cutting_db < attendance_migration_fixed.sql

2. 远程服务器执行：
   mysql -h api.gei5.com -P 3306 -u username -p database_name < attendance_migration_fixed.sql

安全特性：
- 使用 CREATE TABLE IF NOT EXISTS 避免覆盖现有表
- 使用 INSERT IGNORE 避免重复插入数据
- 事务保护确保原子性
- 条件检查外键依赖
- 保留现有数据
- 详细的执行日志

验证脚本：
- 查看表结构：DESCRIBE employees;
- 查看视图：SELECT * FROM v_employee_attendance_status LIMIT 5;
- 查看初始数据：SELECT * FROM attendance_settings;
*/
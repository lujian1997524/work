-- ==========================================
-- 考勤管理系统数据库脚本
-- 创建日期: 2025年1月
-- 描述: 为激光切割生产管理系统添加考勤管理功能
-- ==========================================

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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
  CONSTRAINT `fk_attendance_exceptions_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_exceptions_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
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
  KEY `idx_attendance_rate` (`attendance_rate`),
  CONSTRAINT `fk_monthly_summary_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='月度考勤汇总表';

-- ==========================================
-- 5. 考勤审批流程表 (attendance_approvals)
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
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_approvals_exception` FOREIGN KEY (`attendance_exception_id`) REFERENCES `attendance_exceptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_approvals_approver` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤审批流程表';

-- ==========================================
-- 6. 年假余额表 (annual_leave_balance)
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
  KEY `idx_year` (`year`),
  CONSTRAINT `fk_annual_leave_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='年假余额表';

-- ==========================================
-- 插入初始数据
-- ==========================================

-- 插入默认考勤设置
INSERT INTO `attendance_settings` (`setting_key`, `setting_value`, `description`, `category`) VALUES 
('work_days_per_week', '5', '每周工作天数', 'schedule'),
('daily_work_hours', '8.00', '每日标准工作小时', 'schedule'),
('work_start_time', '09:00', '标准上班时间', 'schedule'),
('work_end_time', '18:00', '标准下班时间', 'schedule'),
('lunch_break_hours', '1.00', '午休时长(小时)', 'schedule'),
('annual_leave_days', '5', '年假天数', 'leave'),
('sick_leave_days', '10', '病假天数', 'leave'),
('max_overtime_hours_per_day', '4.00', '每日最大加班小时', 'overtime'),
('require_approval', 'true', '是否需要审批', 'approval'),
('auto_calculate_summary', 'true', '是否自动计算月度汇总', 'system')
ON DUPLICATE KEY UPDATE 
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = CURRENT_TIMESTAMP;

-- 插入示例员工数据（如果employees表为空）
INSERT IGNORE INTO `employees` (`employee_id`, `name`, `department`, `position`, `hire_date`, `daily_work_hours`) VALUES 
('EMP001', '张三', '生产部', '激光切割操作员', '2024-01-15', 8.00),
('EMP002', '李四', '生产部', '高级操作员', '2023-06-20', 8.00),
('EMP003', '王五', '技术部', '工艺工程师', '2023-03-10', 8.00),
('EMP004', '赵六', '质检部', '质量检验员', '2024-02-01', 8.00),
('EMP005', '钱七', '生产部', '班组长', '2022-08-15', 8.00);

-- ==========================================
-- 创建视图和存储过程
-- ==========================================

-- 创建员工考勤状态视图
CREATE OR REPLACE VIEW `v_employee_attendance_status` AS
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
CREATE OR REPLACE VIEW `v_monthly_attendance_stats` AS
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
-- 创建存储过程：计算月度考勤汇总
-- ==========================================
DELIMITER $$

CREATE PROCEDURE `sp_calculate_monthly_attendance`(
    IN p_year INT,
    IN p_month INT
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_employee_id INT;
    DECLARE v_work_days INT DEFAULT 0;
    DECLARE v_standard_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_total_work_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_total_leave_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_total_overtime_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_sick_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_personal_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_annual_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_compensatory_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_absent_days INT DEFAULT 0;
    DECLARE v_attendance_rate DECIMAL(5,2) DEFAULT 0.00;
    
    -- 游标定义
    DECLARE employee_cursor CURSOR FOR 
        SELECT id FROM employees WHERE status = 'active';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- 开始事务
    START TRANSACTION;
    
    -- 删除该月的旧汇总数据
    DELETE FROM monthly_attendance_summary WHERE year = p_year AND month = p_month;
    
    -- 打开游标
    OPEN employee_cursor;
    
    employee_loop: LOOP
        FETCH employee_cursor INTO v_employee_id;
        IF done THEN
            LEAVE employee_loop;
        END IF;
        
        -- 计算该员工当月的考勤统计
        SELECT 
            -- 计算工作天数（本月总工作日 - 请假天数 - 缺勤天数）
            (SELECT COUNT(*) 
             FROM (SELECT DATE(STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d')) + INTERVAL (seq.seq) DAY as date
                   FROM (SELECT 0 seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                         UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 
                         UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 
                         UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 
                         UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 
                         UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 
                         UNION SELECT 30) seq) dates 
             WHERE dates.date <= LAST_DAY(STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d'))
               AND WEEKDAY(dates.date) < 5
               AND dates.date NOT IN (
                   SELECT date FROM attendance_exceptions 
                   WHERE employee_id = v_employee_id 
                     AND YEAR(date) = p_year 
                     AND MONTH(date) = p_month 
                     AND exception_type IN ('leave', 'absent')
               )) - COUNT(CASE WHEN ae.exception_type = 'absent' THEN 1 END),
            
            -- 标准工作小时
            e.daily_work_hours * (SELECT COUNT(*) 
                                  FROM (SELECT DATE(STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d')) + INTERVAL (seq.seq) DAY as date
                                        FROM (SELECT 0 seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                                              UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 
                                              UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 
                                              UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 
                                              UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 
                                              UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 
                                              UNION SELECT 30) seq) dates 
                                  WHERE dates.date <= LAST_DAY(STR_TO_DATE(CONCAT(p_year, '-', p_month, '-01'), '%Y-%m-%d'))
                                    AND WEEKDAY(dates.date) < 5),
            
            -- 请假小时统计
            COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' THEN ae.leave_hours ELSE 0 END), 0),
            
            -- 加班小时统计  
            COALESCE(SUM(CASE WHEN ae.exception_type = 'overtime' THEN ae.overtime_hours ELSE 0 END), 0),
            
            -- 分类请假小时
            COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'sick' THEN ae.leave_hours ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'personal' THEN ae.leave_hours ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'annual' THEN ae.leave_hours ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'compensatory' THEN ae.leave_hours ELSE 0 END), 0),
            
            -- 缺勤天数
            COUNT(CASE WHEN ae.exception_type = 'absent' THEN 1 END)
            
        INTO v_work_days, v_standard_hours, v_total_leave_hours, v_total_overtime_hours,
             v_sick_hours, v_personal_hours, v_annual_hours, v_compensatory_hours, v_absent_days
        FROM employees e
        LEFT JOIN attendance_exceptions ae ON e.id = ae.employee_id 
            AND YEAR(ae.date) = p_year 
            AND MONTH(ae.date) = p_month
        WHERE e.id = v_employee_id
        GROUP BY e.id, e.daily_work_hours;
        
        -- 计算实际工作小时
        SET v_total_work_hours = v_standard_hours - v_total_leave_hours + v_total_overtime_hours;
        
        -- 计算出勤率
        IF v_standard_hours > 0 THEN
            SET v_attendance_rate = (v_total_work_hours / v_standard_hours) * 100;
        ELSE
            SET v_attendance_rate = 100.00;
        END IF;
        
        -- 插入汇总数据
        INSERT INTO monthly_attendance_summary (
            employee_id, year, month, work_days, total_work_hours, standard_work_hours,
            total_leave_hours, sick_leave_hours, personal_leave_hours, 
            annual_leave_hours, compensatory_leave_hours, total_overtime_hours,
            absent_days, attendance_rate, calculated_at
        ) VALUES (
            v_employee_id, p_year, p_month, v_work_days, v_total_work_hours, v_standard_hours,
            v_total_leave_hours, v_sick_hours, v_personal_hours,
            v_annual_hours, v_compensatory_hours, v_total_overtime_hours,
            v_absent_days, v_attendance_rate, NOW()
        );
        
    END LOOP;
    
    CLOSE employee_cursor;
    COMMIT;
    
    SELECT CONCAT('月度考勤汇总计算完成: ', p_year, '年', p_month, '月') AS message;
    
END$$

DELIMITER ;

-- ==========================================
-- 创建触发器：自动更新年假余额
-- ==========================================
DELIMITER $$

CREATE TRIGGER `tr_update_annual_leave_balance`
AFTER INSERT ON `attendance_exceptions`
FOR EACH ROW
BEGIN
    IF NEW.exception_type = 'leave' AND NEW.leave_type = 'annual' THEN
        INSERT INTO annual_leave_balance (employee_id, year, used_hours, remaining_hours)
        VALUES (NEW.employee_id, YEAR(NEW.date), NEW.leave_hours, 
                (SELECT COALESCE(setting_value, 40) * 8 FROM attendance_settings WHERE setting_key = 'annual_leave_days') - NEW.leave_hours)
        ON DUPLICATE KEY UPDATE
            used_hours = used_hours + NEW.leave_hours,
            remaining_hours = total_hours - used_hours,
            updated_at = NOW();
    END IF;
END$$

DELIMITER ;

-- ==========================================
-- 创建索引优化查询性能
-- ==========================================

-- 为考勤异常表创建复合索引
ALTER TABLE `attendance_exceptions` 
ADD INDEX `idx_employee_date_range` (`employee_id`, `date`),
ADD INDEX `idx_date_range` (`date`, `exception_type`),
ADD INDEX `idx_leave_type_date` (`leave_type`, `date`);

-- 为月度汇总表创建复合索引
ALTER TABLE `monthly_attendance_summary`
ADD INDEX `idx_year_month_employee` (`year`, `month`, `employee_id`),
ADD INDEX `idx_department_date` (`employee_id`, `year`, `month`);

-- ==========================================
-- 恢复外键检查
-- ==========================================
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- 创建完成提示
-- ==========================================
SELECT '考勤管理系统数据库表创建完成！' as message,
       '包含以下表:' as description,
       'employees, attendance_exceptions, attendance_settings, monthly_attendance_summary, attendance_approvals, annual_leave_balance' as tables,
       '以及相关视图、存储过程和触发器' as additional_objects;

-- ==========================================
-- 示例查询语句
-- ==========================================

-- 查看今日考勤状态
-- SELECT * FROM v_employee_attendance_status;

-- 查看当月考勤统计  
-- SELECT * FROM v_monthly_attendance_stats;

-- 手动计算当月考勤汇总
-- CALL sp_calculate_monthly_attendance(YEAR(CURDATE()), MONTH(CURDATE()));

-- 查看月度考勤汇总
-- SELECT * FROM monthly_attendance_summary WHERE year = YEAR(CURDATE()) AND month = MONTH(CURDATE());
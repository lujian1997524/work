-- ==========================================
-- 考勤系统增强功能数据库迁移脚本
-- 日期: 2025年1月
-- 描述: 添加早退、迟到功能，加班精确到分钟
-- ==========================================

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- 1. 更新 attendance_exceptions 表结构
-- ==========================================

-- 首先备份现有数据（如果有的话）
CREATE TABLE IF NOT EXISTS `attendance_exceptions_backup` AS SELECT * FROM `attendance_exceptions`;

-- 添加新的异常类型：early（早退）和 late（迟到）
ALTER TABLE `attendance_exceptions` 
MODIFY COLUMN `exception_type` enum('leave','absent','overtime','early','late') NOT NULL COMMENT '异常类型：请假/缺勤/加班/早退/迟到';

-- 添加加班分钟数字段（替换加班小时数）
ALTER TABLE `attendance_exceptions` 
ADD COLUMN `overtime_minutes` int(11) DEFAULT NULL COMMENT '加班分钟数（精确到分钟）' AFTER `overtime_hours`,
ADD COLUMN `overtime_start_time` time DEFAULT NULL COMMENT '加班开始时间' AFTER `overtime_minutes`,
ADD COLUMN `overtime_end_time` time DEFAULT NULL COMMENT '加班结束时间' AFTER `overtime_start_time`;

-- 添加早退相关字段
ALTER TABLE `attendance_exceptions`
ADD COLUMN `early_leave_time` time DEFAULT NULL COMMENT '早退时间' AFTER `absent_reason`,
ADD COLUMN `early_leave_reason` text DEFAULT NULL COMMENT '早退原因' AFTER `early_leave_time`;

-- 添加迟到相关字段
ALTER TABLE `attendance_exceptions`
ADD COLUMN `late_arrival_time` time DEFAULT NULL COMMENT '迟到到达时间' AFTER `early_leave_reason`,
ADD COLUMN `late_arrival_reason` text DEFAULT NULL COMMENT '迟到原因' AFTER `late_arrival_time`;

-- 数据迁移：将现有的加班小时数转换为分钟数
UPDATE `attendance_exceptions` 
SET `overtime_minutes` = ROUND(`overtime_hours` * 60)
WHERE `overtime_hours` IS NOT NULL AND `overtime_minutes` IS NULL;

-- 更新唯一索引以支持新的异常类型
DROP INDEX `uk_employee_date_type` ON `attendance_exceptions`;
CREATE UNIQUE INDEX `uk_employee_date_type` ON `attendance_exceptions` (`employee_id`, `date`, `exception_type`);

-- ==========================================
-- 2. 更新员工表默认工作小时数
-- ==========================================

-- 将所有员工的默认工作时间设置为9小时
UPDATE `employees` SET `daily_work_hours` = 9.00 WHERE `daily_work_hours` != 9.00;

-- 更新默认值
ALTER TABLE `employees` MODIFY COLUMN `daily_work_hours` decimal(4,2) DEFAULT 9.00 COMMENT '日标准工作小时';

-- ==========================================
-- 3. 更新视图以支持新字段
-- ==========================================

-- 重新创建员工考勤状态视图
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
    ae.overtime_minutes,
    ae.overtime_start_time,
    ae.overtime_end_time,
    ae.early_leave_time,
    ae.late_arrival_time,
    ae.notes
FROM employees e
LEFT JOIN attendance_exceptions ae ON e.id = ae.employee_id AND ae.date = CURDATE()
WHERE e.status = 'active';

-- 重新创建月度考勤统计视图
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
    
    -- 加班统计（转换为小时）
    COALESCE(SUM(CASE WHEN ae.exception_type = 'overtime' THEN ae.overtime_minutes / 60.0 ELSE 0 END), 0) AS total_overtime_hours,
    
    -- 缺勤统计
    COUNT(CASE WHEN ae.exception_type = 'absent' THEN 1 END) AS absent_days,
    
    -- 早退统计
    COUNT(CASE WHEN ae.exception_type = 'early' THEN 1 END) AS early_leave_days,
    
    -- 迟到统计
    COUNT(CASE WHEN ae.exception_type = 'late' THEN 1 END) AS late_arrival_days
    
FROM employees e
LEFT JOIN attendance_exceptions ae ON e.id = ae.employee_id 
    AND DATE_FORMAT(ae.date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
WHERE e.status = 'active'
GROUP BY e.id, e.employee_id, e.name, e.department, e.daily_work_hours;

-- ==========================================
-- 4. 更新存储过程支持新字段
-- ==========================================

-- 删除旧的存储过程
DROP PROCEDURE IF EXISTS `sp_calculate_monthly_attendance`;

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
    DECLARE v_total_overtime_minutes INT DEFAULT 0;
    DECLARE v_total_overtime_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_sick_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_personal_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_annual_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_compensatory_hours DECIMAL(8,2) DEFAULT 0.00;
    DECLARE v_absent_days INT DEFAULT 0;
    DECLARE v_early_days INT DEFAULT 0;
    DECLARE v_late_days INT DEFAULT 0;
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
            
            -- 加班分钟统计
            COALESCE(SUM(CASE WHEN ae.exception_type = 'overtime' THEN ae.overtime_minutes ELSE 0 END), 0),
            
            -- 分类请假小时
            COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'sick' THEN ae.leave_hours ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'personal' THEN ae.leave_hours ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'annual' THEN ae.leave_hours ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN ae.exception_type = 'leave' AND ae.leave_type = 'compensatory' THEN ae.leave_hours ELSE 0 END), 0),
            
            -- 各类异常天数统计
            COUNT(CASE WHEN ae.exception_type = 'absent' THEN 1 END),
            COUNT(CASE WHEN ae.exception_type = 'early' THEN 1 END),
            COUNT(CASE WHEN ae.exception_type = 'late' THEN 1 END)
            
        INTO v_work_days, v_standard_hours, v_total_leave_hours, v_total_overtime_minutes,
             v_sick_hours, v_personal_hours, v_annual_hours, v_compensatory_hours, 
             v_absent_days, v_early_days, v_late_days
        FROM employees e
        LEFT JOIN attendance_exceptions ae ON e.id = ae.employee_id 
            AND YEAR(ae.date) = p_year 
            AND MONTH(ae.date) = p_month
        WHERE e.id = v_employee_id
        GROUP BY e.id, e.daily_work_hours;
        
        -- 转换加班分钟为小时
        SET v_total_overtime_hours = v_total_overtime_minutes / 60.0;
        
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
    
    SELECT CONCAT('月度考勤汇总计算完成: ', p_year, '年', p_month, '月，支持早退和迟到统计') AS message;
    
END$$

DELIMITER ;

-- ==========================================
-- 5. 更新触发器支持分钟级加班
-- ==========================================

-- 删除旧的触发器
DROP TRIGGER IF EXISTS `tr_update_annual_leave_balance`;

DELIMITER $$

CREATE TRIGGER `tr_update_annual_leave_balance`
AFTER INSERT ON `attendance_exceptions`
FOR EACH ROW
BEGIN
    IF NEW.exception_type = 'leave' AND NEW.leave_type = 'annual' THEN
        INSERT INTO annual_leave_balance (employee_id, year, used_hours, remaining_hours)
        VALUES (NEW.employee_id, YEAR(NEW.date), NEW.leave_hours, 
                (SELECT COALESCE(setting_value, 40) * 9 FROM attendance_settings WHERE setting_key = 'annual_leave_days') - NEW.leave_hours)
        ON DUPLICATE KEY UPDATE
            used_hours = used_hours + NEW.leave_hours,
            remaining_hours = total_hours - used_hours,
            updated_at = NOW();
    END IF;
END$$

DELIMITER ;

-- ==========================================
-- 6. 更新系统设置
-- ==========================================

-- 更新标准工作时间为9小时
UPDATE `attendance_settings` 
SET `setting_value` = '9.00'
WHERE `setting_key` = 'daily_work_hours';

-- 添加新的设置项
INSERT INTO `attendance_settings` (`setting_key`, `setting_value`, `description`, `category`) VALUES 
('support_early_late_tracking', 'true', '支持早退迟到时间追踪', 'features'),
('overtime_precision_minutes', 'true', '加班时间精确到分钟', 'features'),
('default_work_start_time', '09:00', '默认上班时间', 'schedule'),
('default_work_end_time', '18:00', '默认下班时间', 'schedule'),
('allow_early_leave_tracking', 'true', '允许记录早退时间', 'features'),
('allow_late_arrival_tracking', 'true', '允许记录迟到时间', 'features')
ON DUPLICATE KEY UPDATE 
  `setting_value` = VALUES(`setting_value`),
  `updated_at` = CURRENT_TIMESTAMP;

-- ==========================================
-- 7. 创建新的索引优化查询
-- ==========================================

-- 为新字段创建索引
ALTER TABLE `attendance_exceptions` 
ADD INDEX `idx_overtime_minutes` (`overtime_minutes`),
ADD INDEX `idx_early_late_time` (`early_leave_time`, `late_arrival_time`),
ADD INDEX `idx_exception_type_date` (`exception_type`, `date`);

-- ==========================================
-- 8. 数据完整性检查和清理
-- ==========================================

-- 检查数据迁移是否成功
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN exception_type = 'overtime' AND overtime_minutes IS NOT NULL THEN 1 END) as migrated_overtime,
    COUNT(CASE WHEN exception_type IN ('early', 'late') THEN 1 END) as new_exception_types
FROM attendance_exceptions;

-- 删除弃用的 overtime_hours 字段
ALTER TABLE `attendance_exceptions` DROP COLUMN `overtime_hours`;

-- ==========================================
-- 恢复外键检查
-- ==========================================
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- 迁移完成提示
-- ==========================================
SELECT '考勤系统增强功能迁移完成！' as message,
       '新增功能:' as description,
       '1. 早退时间记录和原因' as feature_1,
       '2. 迟到时间记录和原因' as feature_2,  
       '3. 加班时间精确到分钟' as feature_3,
       '4. 员工标准工作时间调整为9小时' as feature_4,
       '5. 更新视图和存储过程支持新字段' as feature_5;

-- ==========================================
-- 测试查询示例
-- ==========================================

-- 查看更新后的考勤状态
-- SELECT * FROM v_employee_attendance_status;

-- 测试新的异常类型插入
-- INSERT INTO attendance_exceptions (employee_id, date, exception_type, late_arrival_time, late_arrival_reason, created_by) 
-- VALUES (1, CURDATE(), 'late', '09:30:00', '交通堵塞', 1);

-- INSERT INTO attendance_exceptions (employee_id, date, exception_type, early_leave_time, early_leave_reason, created_by)
-- VALUES (2, CURDATE(), 'early', '16:30:00', '家庭急事', 1);

-- INSERT INTO attendance_exceptions (employee_id, date, exception_type, overtime_minutes, overtime_start_time, overtime_end_time, overtime_reason, created_by)
-- VALUES (3, CURDATE(), 'overtime', 120, '18:00:00', '20:00:00', '项目紧急任务', 1);
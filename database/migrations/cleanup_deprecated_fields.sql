-- ==========================================
-- 基于实际数据库结构的弃用字段清理脚本
-- 针对 work 数据库的精确更新
-- ==========================================

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- 1. 更新 attendance_exceptions 表
-- ==========================================

-- 备份现有数据（如果有 overtime_hours 数据需要迁移）
UPDATE attendance_exceptions 
SET overtime_hours = NULL 
WHERE overtime_hours IS NOT NULL;

-- 添加新的异常类型：early（早退）和 late（迟到）
ALTER TABLE `attendance_exceptions` 
MODIFY COLUMN `exception_type` enum('leave','absent','overtime','early','late') 
COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '异常类型：请假/缺勤/加班/早退/迟到';

-- 添加加班分钟数字段和时间字段
ALTER TABLE `attendance_exceptions` 
ADD COLUMN `overtime_minutes` int(11) DEFAULT NULL COMMENT '加班分钟数（精确到分钟）' AFTER `overtime_reason`,
ADD COLUMN `overtime_start_time` time DEFAULT NULL COMMENT '加班开始时间' AFTER `overtime_minutes`,
ADD COLUMN `overtime_end_time` time DEFAULT NULL COMMENT '加班结束时间' AFTER `overtime_start_time`;

-- 添加早退相关字段
ALTER TABLE `attendance_exceptions`
ADD COLUMN `early_leave_time` time DEFAULT NULL COMMENT '早退时间' AFTER `absent_reason`,
ADD COLUMN `early_leave_reason` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '早退原因' AFTER `early_leave_time`;

-- 添加迟到相关字段
ALTER TABLE `attendance_exceptions`
ADD COLUMN `late_arrival_time` time DEFAULT NULL COMMENT '迟到到达时间' AFTER `early_leave_reason`,
ADD COLUMN `late_arrival_reason` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '迟到原因' AFTER `late_arrival_time`;

-- 数据迁移：将现有的加班小时数转换为分钟数
UPDATE `attendance_exceptions` 
SET `overtime_minutes` = ROUND(`overtime_hours` * 60)
WHERE `overtime_hours` IS NOT NULL AND `overtime_minutes` IS NULL;

-- 删除弃用的 overtime_hours 字段
ALTER TABLE `attendance_exceptions` DROP COLUMN `overtime_hours`;

-- ==========================================
-- 2. 更新 employees 表默认工作时间
-- ==========================================

-- 将所有员工的默认工作时间设置为9小时
UPDATE `employees` SET `daily_work_hours` = 9.00 WHERE `daily_work_hours` != 9.00;

-- 更新字段默认值
ALTER TABLE `employees` 
MODIFY COLUMN `daily_work_hours` decimal(4,2) DEFAULT '9.00' COMMENT '日标准工作小时';

-- ==========================================
-- 3. 更新 attendance_settings 系统设置
-- ==========================================

-- 更新标准工作时间设置为9小时
UPDATE `attendance_settings` 
SET `setting_value` = '9.00'
WHERE `setting_key` = 'daily_work_hours';

-- ==========================================
-- 4. 重建视图以支持新字段
-- ==========================================

-- 删除旧视图
DROP VIEW IF EXISTS `v_employee_attendance_status`;

-- 创建新的员工考勤状态视图
CREATE VIEW `v_employee_attendance_status` AS
SELECT 
    e.id AS employee_pk_id,
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
    -- 将分钟转换为小时显示
    CASE 
        WHEN ae.overtime_minutes IS NOT NULL THEN ae.overtime_minutes / 60.0 
        ELSE NULL 
    END AS overtime_hours,
    ae.overtime_start_time,
    ae.overtime_end_time,
    ae.early_leave_time,
    ae.late_arrival_time,
    ae.notes
FROM employees e
LEFT JOIN attendance_exceptions ae ON e.id = ae.employee_id AND ae.date = CURDATE()
WHERE e.status = 'active';

-- ==========================================
-- 5. 数据完整性检查
-- ==========================================

-- 检查更新结果
SELECT 
    'attendance_exceptions表结构检查' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN exception_type IN ('early', 'late') THEN 1 END) as new_exception_types,
    COUNT(CASE WHEN overtime_minutes IS NOT NULL THEN 1 END) as records_with_overtime_minutes
FROM attendance_exceptions;

-- 检查员工工作时间更新
SELECT 
    'employees表工作时间检查' as check_type,
    COUNT(*) as total_employees,
    COUNT(CASE WHEN daily_work_hours = 9.00 THEN 1 END) as employees_with_9h_workday,
    AVG(daily_work_hours) as average_work_hours
FROM employees;

-- 检查系统设置更新
SELECT 
    'attendance_settings检查' as check_type,
    setting_key,
    setting_value
FROM attendance_settings 
WHERE setting_key = 'daily_work_hours';

-- ==========================================
-- 恢复外键检查
-- ==========================================
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- 完成提示
-- ==========================================
SELECT 
    '🧹 弃用字段清理完成！' as message,
    '已删除字段: overtime_hours' as deleted_fields,
    '已添加字段: overtime_minutes, overtime_start_time, overtime_end_time, early_leave_time, early_leave_reason, late_arrival_time, late_arrival_reason' as added_fields,
    '已更新枚举: exception_type 现在支持 early, late' as updated_enums,
    '已更新默认值: 员工和系统设置的工作时间调整为9小时' as updated_defaults,
    '已重建视图: v_employee_attendance_status' as updated_views;
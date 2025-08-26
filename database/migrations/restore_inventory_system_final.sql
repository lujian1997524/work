-- ============================================================================
-- 板材库存管理系统最终恢复脚本 (v2.7.0)
-- 彻底清理分配系统，完整恢复基础库存管理功能
-- 包含完整历史数据：81条工人材料记录 + 12条尺寸记录
-- ============================================================================

USE work;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

SELECT '=== 板材库存管理系统最终恢复开始 ===' as status, NOW() as start_time;

-- ============================================================================
-- 第一步：清理materials表中的分配相关字段
-- ============================================================================
SELECT '=== 清理materials表分配字段 ===' as step;

-- 检查并删除分配相关字段（如果存在）
SET @sql = (
    SELECT CONCAT('ALTER TABLE materials DROP COLUMN ', COLUMN_NAME)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND COLUMN_NAME = 'shared_plate_id'
    LIMIT 1
);
SET @sql = IFNULL(@sql, 'SELECT "shared_plate_id字段不存在" as result');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT CONCAT('ALTER TABLE materials DROP COLUMN ', COLUMN_NAME)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND COLUMN_NAME = 'usage_note'
    LIMIT 1
);
SET @sql = IFNULL(@sql, 'SELECT "usage_note字段不存在" as result');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT CONCAT('ALTER TABLE materials DROP COLUMN ', COLUMN_NAME)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND COLUMN_NAME = 'batch_allocation_id'
    LIMIT 1
);
SET @sql = IFNULL(@sql, 'SELECT "batch_allocation_id字段不存在" as result');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT CONCAT('ALTER TABLE materials DROP COLUMN ', COLUMN_NAME)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND COLUMN_NAME = 'actual_quantity_used'
    LIMIT 1
);
SET @sql = IFNULL(@sql, 'SELECT "actual_quantity_used字段不存在" as result');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
    SELECT CONCAT('ALTER TABLE materials DROP COLUMN ', COLUMN_NAME)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'work'
    AND TABLE_NAME = 'materials'
    AND COLUMN_NAME = 'notes'
    LIMIT 1
);
SET @sql = IFNULL(@sql, 'SELECT "notes字段不存在" as result');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'materials表分配字段清理完成' as info;

-- ============================================================================
-- 第二步：删除现有表（如果存在）
-- ============================================================================
SELECT '=== 删除现有库存表 ===' as step;

DROP TABLE IF EXISTS `material_dimensions`;
DROP TABLE IF EXISTS `worker_materials`;

-- ============================================================================
-- 第三步：创建worker_materials表（使用准确结构）
-- ============================================================================
SELECT '=== 创建worker_materials表 ===' as step;

CREATE TABLE `worker_materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `worker_id` int NOT NULL COMMENT '工人ID',
  `thickness_spec_id` int NOT NULL COMMENT '厚度规格ID',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_worker_thickness` (`worker_id`,`thickness_spec_id`),
  KEY `idx_worker_id` (`worker_id`),
  KEY `idx_thickness_spec_id` (`thickness_spec_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工人材料库存表';

-- ============================================================================
-- 第四步：创建material_dimensions表
-- ============================================================================
SELECT '=== 创建material_dimensions表 ===' as step;

CREATE TABLE `material_dimensions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `worker_material_id` int NOT NULL COMMENT '工人材料记录ID',
  `width` decimal(10,2) NOT NULL COMMENT '宽度（mm）',
  `height` decimal(10,2) NOT NULL COMMENT '长度（mm）',
  `quantity` int NOT NULL DEFAULT '0' COMMENT '该尺寸数量（张）',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_worker_material_id` (`worker_material_id`),
  CONSTRAINT `fk_material_dimensions_worker_material` FOREIGN KEY (`worker_material_id`) REFERENCES `worker_materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='板材尺寸详情表';

-- ============================================================================
-- 第五步：恢复完整的worker_materials历史数据（81条记录）
-- ============================================================================
SELECT '=== 恢复worker_materials完整历史数据 ===' as step;

INSERT INTO `worker_materials` (`id`, `worker_id`, `thickness_spec_id`, `notes`, `created_at`, `updated_at`) VALUES
(59, 28, 33, '为项目 测试 自动创建', '2025-08-13 20:55:18', '2025-08-13 20:55:18'),
(60, 28, 36, '为项目 测试 自动创建', '2025-08-13 20:55:18', '2025-08-13 20:55:18'),
(62, 34, 35, '为项目 60斗提两台 自动创建', '2025-08-14 23:48:32', '2025-08-14 23:48:32'),
(63, 34, 36, '为项目 60斗提两台 自动创建', '2025-08-14 23:48:32', '2025-08-14 23:48:32'),
(64, 34, 38, '为项目 60斗提两台 自动创建', '2025-08-14 23:48:32', '2025-08-14 23:48:32'),
(65, 34, 39, '为项目 60斗提两台 自动创建', '2025-08-14 23:48:32', '2025-08-14 23:48:32'),
(66, 34, 40, '为项目 60斗提两台 自动创建', '2025-08-14 23:48:32', '2025-08-14 23:48:32'),
(67, 34, 41, '为项目 60斗提两台 自动创建', '2025-08-14 23:48:32', '2025-08-14 23:48:32'),
(68, 34, 42, '为项目 60斗提两台 自动创建', '2025-08-14 23:48:32', '2025-08-14 23:48:32'),
(69, 34, 37, '为项目 80斗提一台 自动创建', '2025-08-14 23:49:28', '2025-08-14 23:49:28'),
(70, 25, 35, '预估库存', '2025-08-14 23:50:33', '2025-08-17 21:33:06'),
(71, 25, 41, '预估库存', '2025-08-14 23:51:01', '2025-08-14 23:51:01'),
(72, 44, 33, '为项目 测试用 自动创建', '2025-08-15 07:34:57', '2025-08-15 07:34:57'),
(73, 44, 34, '为项目 测试用 自动创建', '2025-08-15 07:34:57', '2025-08-15 07:34:57'),
(74, 52, 35, '为项目 80斗提 自动创建', '2025-08-15 08:04:30', '2025-08-15 08:04:30'),
(75, 52, 37, '为项目 80斗提 自动创建', '2025-08-15 08:04:30', '2025-08-15 08:04:30'),
(76, 52, 38, '为项目 80斗提 自动创建', '2025-08-15 08:04:30', '2025-08-15 08:04:30'),
(77, 52, 39, '为项目 80斗提 自动创建', '2025-08-15 08:04:30', '2025-08-15 08:04:30'),
(78, 52, 40, '为项目 80斗提 自动创建', '2025-08-15 08:04:30', '2025-08-15 08:04:30'),
(79, 52, 41, '为项目 80斗提 自动创建', '2025-08-15 08:04:30', '2025-08-15 08:04:30'),
(80, 52, 42, '为项目 80斗提 自动创建', '2025-08-15 08:04:30', '2025-08-15 08:04:30'),
(81, 24, 34, '为项目 测试用 自动创建', '2025-08-15 08:38:36', '2025-08-15 08:38:36'),
(82, 24, 35, '为项目 测试用 自动创建', '2025-08-15 08:38:36', '2025-08-15 08:38:36'),
(83, 44, 35, '为项目 测试 自动创建', '2025-08-15 09:13:22', '2025-08-15 09:13:22'),
(84, 44, 42, '为项目 测试 自动创建', '2025-08-15 09:17:39', '2025-08-15 09:17:39'),
(85, 50, 35, '为项目 新力通前叉 自动创建', '2025-08-15 11:05:53', '2025-08-15 11:05:53'),
(86, 50, 37, '为项目 新力通前叉 自动创建', '2025-08-15 11:05:53', '2025-08-15 11:05:53'),
(87, 50, 42, '为项目 新力通前叉 自动创建', '2025-08-15 11:05:53', '2025-08-15 11:05:53'),
(88, 50, 43, '为项目 新力通前叉 自动创建', '2025-08-15 11:05:53', '2025-08-15 11:05:53'),
(89, 50, 44, '为项目 新力通前叉 自动创建', '2025-08-15 11:05:53', '2025-08-15 11:05:53'),
(90, 28, 34, '为项目 冲冲冲 自动创建', '2025-08-15 11:22:14', '2025-08-15 11:22:14'),
(91, 28, 37, '为项目 冲冲冲 自动创建', '2025-08-15 11:22:14', '2025-08-15 11:22:14'),
(92, 26, 34, '为项目 7室塑烧板 自动创建', '2025-08-15 19:51:28', '2025-08-15 19:51:28'),
(93, 26, 35, '为项目 7室塑烧板 自动创建', '2025-08-15 19:51:28', '2025-08-15 19:51:28'),
(94, 26, 39, '为项目 7室塑烧板 自动创建', '2025-08-15 19:51:28', '2025-08-15 19:51:28'),
(95, 50, 38, '为项目 卸砂门 自动创建', '2025-08-16 11:16:25', '2025-08-16 11:16:25'),
(96, 50, 39, '为项目 卸砂门 自动创建', '2025-08-16 11:16:25', '2025-08-16 11:16:25'),
(97, 50, 40, '为项目 卸砂门 自动创建', '2025-08-16 11:16:25', '2025-08-16 11:16:25'),
(98, 50, 41, '为项目 卸砂门 自动创建', '2025-08-16 11:16:25', '2025-08-16 11:16:25'),
(99, 37, 52, '为项目 不锈钢堵头 自动创建', '2025-08-16 14:35:35', '2025-08-16 14:35:35'),
(100, 53, 42, '为项目 22mm锥4个 自动创建', '2025-08-16 15:09:02', '2025-08-16 15:09:02'),
(101, 36, 35, '为项目 印度2.2米滚筒加衬 自动创建', '2025-08-16 16:01:13', '2025-08-16 16:01:13'),
(102, 36, 39, '为项目 印度2.2米滚筒加衬 自动创建', '2025-08-16 16:01:13', '2025-08-16 16:01:13'),
(103, 36, 40, '为项目 印度2.2米滚筒加衬 自动创建', '2025-08-16 16:01:13', '2025-08-16 16:01:13'),
(104, 36, 41, '为项目 印度2.2米滚筒加衬 自动创建', '2025-08-16 16:01:13', '2025-08-16 16:01:13'),
(105, 36, 42, '为项目 印度2.2米滚筒加衬 自动创建', '2025-08-16 16:01:13', '2025-08-16 16:01:13'),
(106, 36, 43, '为项目 印度2.2米滚筒加衬 自动创建', '2025-08-16 16:01:13', '2025-08-16 16:01:13'),
(107, 48, 46, '', '2025-08-16 16:06:34', '2025-08-16 16:06:34'),
(108, 48, 47, '', '2025-08-16 16:06:54', '2025-08-16 16:06:54'),
(109, 31, 39, '为项目 林州金仕落砂机 自动创建', '2025-08-16 16:10:07', '2025-08-16 16:10:07'),
(110, 49, 35, '为项目 河南东起钢材有限公司钢材切割 自动创建', '2025-08-16 16:23:16', '2025-08-16 16:23:16'),
(111, 49, 37, '为项目 河南东起钢材有限公司钢材切割 自动创建', '2025-08-16 16:23:16', '2025-08-16 16:23:16'),
(112, 49, 39, '为项目 河南东起钢材有限公司钢材切割 自动创建', '2025-08-16 16:23:16', '2025-08-16 16:23:16'),
(113, 49, 40, '为项目 河南东起钢材有限公司钢材切割 自动创建', '2025-08-16 16:23:16', '2025-08-16 16:23:16'),
(114, 49, 41, '为项目 河南东起钢材有限公司钢材切割 自动创建', '2025-08-16 16:23:16', '2025-08-16 16:23:16'),
(115, 49, 42, '为项目 河南东起钢材有限公司钢材切割 自动创建', '2025-08-16 16:23:16', '2025-08-16 16:23:16'),
(116, 49, 43, '为项目 河南东起钢材有限公司钢材切割 自动创建', '2025-08-16 16:23:16', '2025-08-16 16:23:16'),
(117, 49, 44, '为项目 河南东起钢材有限公司钢材切割 自动创建', '2025-08-16 16:23:16', '2025-08-16 16:23:16'),
(118, 25, 34, '为项目 测试 自动创建', '2025-08-16 21:34:23', '2025-08-16 21:34:23'),
(119, 25, 36, '为项目 测试 自动创建', '2025-08-16 21:34:23', '2025-08-16 21:34:23'),
(120, 25, 37, '为项目 测试 自动创建', '2025-08-16 21:34:23', '2025-08-16 21:34:23'),
(121, 25, 38, '为项目 测试 自动创建', '2025-08-16 21:34:23', '2025-08-16 21:34:23'),
(122, 25, 39, '为项目 测试 自动创建', '2025-08-16 21:34:23', '2025-08-16 21:34:23'),
(123, 25, 40, '为项目 测试 自动创建', '2025-08-16 21:34:23', '2025-08-16 21:34:23'),
(124, 25, 42, '为项目 测试 自动创建', '2025-08-16 21:34:23', '2025-08-16 21:34:23'),
(125, 25, 43, '为项目 测试 自动创建', '2025-08-16 21:34:23', '2025-08-16 21:34:23'),
(126, 25, 44, '为项目 测试 自动创建', '2025-08-16 21:34:23', '2025-08-16 21:34:23'),
(127, 31, 42, '为项目 林州金仕除尘器 自动创建', '2025-08-18 21:35:50', '2025-08-18 21:35:50'),
(128, 26, 40, '为项目 补单测试 自动创建', '2025-08-22 14:13:58', '2025-08-22 14:13:58'),
(129, 26, 41, '为项目 补单测试 自动创建', '2025-08-22 14:13:58', '2025-08-22 14:13:58'),
(130, 26, 42, '为项目 补单测试 自动创建', '2025-08-22 14:13:58', '2025-08-22 14:13:58'),
(131, 48, 35, '为项目 1.5mm轧机立辊测试 自动创建', '2025-08-22 14:38:39', '2025-08-22 14:38:39'),
(132, 48, 37, '为项目 3.0轧机立辊测试 自动创建', '2025-08-22 14:39:03', '2025-08-22 14:39:03'),
(133, 48, 39, '为项目 5mm轧机立辊测试 自动创建', '2025-08-22 14:39:24', '2025-08-22 14:39:24'),
(134, 48, 41, '为项目 8mm轧机立辊测试 自动创建', '2025-08-22 14:41:32', '2025-08-22 14:41:32'),
(135, 48, 42, '为项目 10mm轧机立辊测试 自动创建', '2025-08-22 14:43:06', '2025-08-22 14:43:06'),
(136, 48, 44, '为项目 16mm轧机立辊测试 自动创建', '2025-08-22 16:51:09', '2025-08-22 16:51:09'),
(137, 25, 33, '为项目 补单测试 自动创建', '2025-08-22 16:52:19', '2025-08-22 16:52:19'),
(138, 25, 46, '为项目 补单测试 自动创建', '2025-08-22 16:52:19', '2025-08-22 16:52:19'),
(139, 25, 47, '为项目 补单测试 自动创建', '2025-08-22 16:52:19', '2025-08-22 16:52:19');

-- ============================================================================
-- 第六步：恢复完整的material_dimensions历史数据（12条记录）
-- ============================================================================
SELECT '=== 恢复material_dimensions完整历史数据 ===' as step;

INSERT INTO `material_dimensions` (`id`, `worker_material_id`, `width`, `height`, `quantity`, `notes`, `created_at`, `updated_at`) VALUES
(23, 70, 1500.00, 6000.00, 66, NULL, '2025-08-14 23:50:33', '2025-08-18 16:26:41'),
(24, 71, 2250.00, 9500.00, 1, NULL, '2025-08-14 23:51:01', '2025-08-14 23:51:01'),
(25, 107, 1500.00, 6000.00, 9, NULL, '2025-08-16 16:06:34', '2025-08-22 16:53:12'),
(26, 108, 1500.00, 6000.00, 9, NULL, '2025-08-16 16:06:54', '2025-08-22 16:53:12'),
(28, 131, 1500.00, 6000.00, 9, NULL, '2025-08-22 14:38:39', '2025-08-22 16:53:12'),
(29, 132, 1500.00, 6000.00, 17, NULL, '2025-08-22 14:39:03', '2025-08-22 16:53:12'),
(30, 133, 1500.00, 6000.00, 6, NULL, '2025-08-22 14:39:24', '2025-08-22 14:39:24'),
(31, 122, 1500.00, 6000.00, 4, NULL, '2025-08-22 14:39:51', '2025-08-22 14:39:51'),
(32, 132, 1500.00, 6000.00, 2, NULL, '2025-08-22 14:40:43', '2025-08-22 14:40:43'),
(33, 134, 2250.00, 10000.00, 1, NULL, '2025-08-22 14:41:32', '2025-08-22 14:41:32'),
(34, 135, 2250.00, 10000.00, 1, NULL, '2025-08-22 14:43:06', '2025-08-22 14:43:06'),
(35, 136, 1500.00, 6000.00, 0, NULL, '2025-08-22 16:51:09', '2025-08-22 16:53:12');

-- ============================================================================
-- 第七步：添加外键约束
-- ============================================================================
SELECT '=== 添加外键约束 ===' as step;

ALTER TABLE `worker_materials` 
ADD CONSTRAINT `fk_worker_materials_worker` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE CASCADE,
ADD CONSTRAINT `fk_worker_materials_thickness_spec` FOREIGN KEY (`thickness_spec_id`) REFERENCES `thickness_specs` (`id`) ON DELETE CASCADE;

-- ============================================================================
-- 第八步：设置自增值
-- ============================================================================
SELECT '=== 设置自增值 ===' as step;

ALTER TABLE `worker_materials` AUTO_INCREMENT = 140;
ALTER TABLE `material_dimensions` AUTO_INCREMENT = 36;

-- ============================================================================
-- 第九步：验证数据完整性
-- ============================================================================
SELECT '=== 验证最终结果 ===' as step;

-- 验证表是否存在
SELECT 
  CASE WHEN COUNT(*) > 0 THEN 'worker_materials表已存在' ELSE 'worker_materials表不存在！' END as worker_materials_status
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'work' AND TABLE_NAME = 'worker_materials';

SELECT 
  CASE WHEN COUNT(*) > 0 THEN 'material_dimensions表已存在' ELSE 'material_dimensions表不存在！' END as material_dimensions_status
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'work' AND TABLE_NAME = 'material_dimensions';

-- 检查materials表结构是否正确（确保分配字段已删除）
SELECT 'materials表当前字段:' as info;
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'work' 
AND TABLE_NAME = 'materials'
ORDER BY ORDINAL_POSITION;

-- 检查恢复的数据
SELECT CONCAT('worker_materials表已恢复，包含 ', COUNT(*), ' 条记录') as status FROM worker_materials;
SELECT CONCAT('material_dimensions表已恢复，包含 ', COUNT(*), ' 条记录') as status FROM material_dimensions;

-- 验证数据完整性
SELECT 'worker_materials表中的无效worker_id引用:' as check_type,
    GROUP_CONCAT(DISTINCT wm.worker_id) as invalid_ids
FROM worker_materials wm 
LEFT JOIN workers w ON wm.worker_id = w.id 
WHERE w.id IS NULL;

SELECT 'worker_materials表中的无效thickness_spec_id引用:' as check_type,
    GROUP_CONCAT(DISTINCT wm.thickness_spec_id) as invalid_ids
FROM worker_materials wm 
LEFT JOIN thickness_specs ts ON wm.thickness_spec_id = ts.id 
WHERE ts.id IS NULL;

-- 验证外键关系
SELECT 'inventory tables外键约束:' as info;
SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE CONSTRAINT_SCHEMA = 'work' 
AND TABLE_NAME IN ('worker_materials', 'material_dimensions')
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- ============================================================================
-- 第十步：最终清理
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 1;

SELECT '=== 板材库存管理系统最终恢复完成 ===' as status, NOW() as completed_at;
SELECT '完整恢复: 81条工人材料记录 + 12条尺寸记录' as summary;
SELECT '分配系统已彻底清除，基础库存管理功能已完全恢复' as final_note;
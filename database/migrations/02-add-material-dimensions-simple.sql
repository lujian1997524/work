-- 板材尺寸管理扩展 - 数据库脚本（简化版）
USE laser_cutting_db;

-- 创建板材尺寸详情表
CREATE TABLE material_dimensions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    worker_material_id INT NOT NULL COMMENT '工人板材记录ID',
    width DECIMAL(10,2) NOT NULL COMMENT '宽度（mm）',
    height DECIMAL(10,2) NOT NULL COMMENT '长度（mm）',
    quantity INT NOT NULL DEFAULT 0 COMMENT '该尺寸数量（张）',
    notes TEXT COMMENT '备注（批次、供应商、质量等级等）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_material_id) REFERENCES worker_materials(id) ON DELETE CASCADE,
    INDEX idx_worker_material_id (worker_material_id),
    INDEX idx_dimensions (width, height),
    INDEX idx_quantity (quantity)
) COMMENT='板材尺寸详情表';

-- 插入测试数据（需要先查询worker_materials的实际ID）
-- 查看现有的worker_materials数据
SELECT wm.id, w.name, ts.material_type, ts.thickness, wm.quantity 
FROM worker_materials wm 
JOIN workers w ON wm.worker_id = w.id 
JOIN thickness_specs ts ON wm.thickness_spec_id = ts.id 
WHERE wm.quantity > 0;

-- 验证表创建成功
DESCRIBE material_dimensions;

-- 显示外键约束
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = 'laser_cutting_db' 
    AND TABLE_NAME = 'material_dimensions';
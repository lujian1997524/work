-- 板材尺寸管理扩展 - 数据库脚本
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

-- 创建数量一致性触发器
DELIMITER $$

-- 插入时更新主表数量
CREATE TRIGGER update_main_quantity_on_insert
AFTER INSERT ON material_dimensions
FOR EACH ROW
BEGIN
    UPDATE worker_materials 
    SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM material_dimensions 
        WHERE worker_material_id = NEW.worker_material_id
    )
    WHERE id = NEW.worker_material_id;
END$$

-- 更新时更新主表数量
CREATE TRIGGER update_main_quantity_on_update
AFTER UPDATE ON material_dimensions
FOR EACH ROW
BEGIN
    UPDATE worker_materials 
    SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM material_dimensions 
        WHERE worker_material_id = NEW.worker_material_id
    )
    WHERE id = NEW.worker_material_id;
END$$

-- 删除时更新主表数量
CREATE TRIGGER update_main_quantity_on_delete
AFTER DELETE ON material_dimensions
FOR EACH ROW
BEGIN
    UPDATE worker_materials 
    SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM material_dimensions 
        WHERE worker_material_id = OLD.worker_material_id
    )
    WHERE id = OLD.worker_material_id;
END$$

DELIMITER ;

-- 插入示例数据（基于现有的worker_materials数据）
-- 为高春强的碳板2mm添加尺寸明细
INSERT INTO material_dimensions (worker_material_id, width, height, quantity, notes) VALUES
-- 假设高春强的碳板2mm记录ID是27，总量15张
(27, 1000.00, 2000.00, 8, '标准板材1000×2000'),
(27, 1220.00, 2440.00, 7, '标准板材1220×2440');

-- 为高春强的碳板4mm添加尺寸明细  
INSERT INTO material_dimensions (worker_material_id, width, height, quantity, notes) VALUES
-- 假设高春强的碳板4mm记录ID是28，总量10张
(28, 1500.00, 3000.00, 6, '大板材1500×3000'),
(28, 1000.00, 2000.00, 4, '标准板材1000×2000');

-- 为高长春的碳板3mm添加尺寸明细
INSERT INTO material_dimensions (worker_material_id, width, height, quantity, notes) VALUES  
-- 假设高长春的碳板3mm记录ID是23，总量20张
(23, 1220.00, 2440.00, 12, '标准板材1220×2440'),
(23, 1500.00, 3000.00, 8, '大板材1500×3000');

-- 验证数据一致性的存储过程
DELIMITER $$
CREATE PROCEDURE CheckQuantityConsistency()
BEGIN
    SELECT 
        wm.id,
        w.name as worker_name,
        ts.material_type,
        ts.thickness,
        wm.quantity as main_quantity,
        COALESCE(SUM(md.quantity), 0) as dimensions_total,
        CASE 
            WHEN wm.quantity = COALESCE(SUM(md.quantity), 0) THEN 'OK'
            ELSE 'INCONSISTENT'
        END as status
    FROM worker_materials wm
    JOIN workers w ON wm.worker_id = w.id
    JOIN thickness_specs ts ON wm.thickness_spec_id = ts.id
    LEFT JOIN material_dimensions md ON wm.id = md.worker_material_id
    GROUP BY wm.id, w.name, ts.material_type, ts.thickness, wm.quantity
    ORDER BY status DESC, w.name, ts.material_type, ts.thickness;
END$$
DELIMITER ;

-- 执行一致性检查
CALL CheckQuantityConsistency();

SHOW CREATE TABLE material_dimensions;
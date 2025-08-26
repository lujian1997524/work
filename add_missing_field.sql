-- 为materials表添加缺失的assigned_from_worker_material_id字段
-- 这个字段用于关联工人材料来源

USE work;

-- 添加assigned_from_worker_material_id字段
ALTER TABLE materials 
ADD COLUMN assigned_from_worker_material_id INT NULL 
COMMENT '来源工人材料ID' 
AFTER completed_by;

-- 添加外键约束
ALTER TABLE materials 
ADD CONSTRAINT fk_materials_assigned_from_worker_material 
FOREIGN KEY (assigned_from_worker_material_id) 
REFERENCES worker_materials(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 添加索引以提高查询性能
CREATE INDEX idx_materials_assigned_from_worker_material_id 
ON materials(assigned_from_worker_material_id);

-- 验证字段是否添加成功
DESCRIBE materials;
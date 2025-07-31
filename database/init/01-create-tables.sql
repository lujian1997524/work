-- 激光切割生产管理系统 - 数据库初始化脚本
USE laser_cutting_db;

-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT '用户姓名',
    role ENUM('admin', 'operator') NOT NULL DEFAULT 'operator' COMMENT '用户角色',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 工人资料表
CREATE TABLE workers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '工人姓名',
    phone VARCHAR(20) COMMENT '联系电话',
    email VARCHAR(100) COMMENT '邮箱地址',
    department VARCHAR(50) COMMENT '所属部门',
    position VARCHAR(50) COMMENT '职位',
    skill_tags VARCHAR(200) COMMENT '技能标签，JSON格式',
    notes TEXT COMMENT '备注信息',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 厚度规格配置表
CREATE TABLE thickness_specs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    thickness DECIMAL(5,2) NOT NULL COMMENT '厚度值',
    unit VARCHAR(10) DEFAULT 'mm' COMMENT '单位',
    material_type VARCHAR(50) COMMENT '材料类型',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    sort_order INT DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 项目表
CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL COMMENT '项目名称',
    description TEXT COMMENT '项目描述',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '项目状态',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '优先级',
    start_date DATE COMMENT '开始日期',
    end_date DATE COMMENT '结束日期',
    created_by INT COMMENT '创建人',
    assigned_worker_id INT COMMENT '负责工人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_worker_id) REFERENCES workers(id)
);

-- 板材表
CREATE TABLE materials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    thickness_spec_id INT NOT NULL COMMENT '厚度规格ID',
    quantity INT DEFAULT 1 COMMENT '数量',
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending' COMMENT '状态',
    completed_date DATE COMMENT '完成日期',
    completed_by INT COMMENT '完成人',
    notes TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (thickness_spec_id) REFERENCES thickness_specs(id),
    FOREIGN KEY (completed_by) REFERENCES workers(id)
);

-- 图纸表
CREATE TABLE drawings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL COMMENT '文件名',
    original_filename VARCHAR(255) NOT NULL COMMENT '原始文件名',
    file_path VARCHAR(500) NOT NULL COMMENT '文件路径',
    file_size INT COMMENT '文件大小',
    file_type VARCHAR(50) COMMENT '文件类型',
    version INT DEFAULT 1 COMMENT '版本号',
    uploaded_by INT COMMENT '上传人',
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_current_version BOOLEAN DEFAULT TRUE COMMENT '是否当前版本',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 插入初始数据
INSERT INTO users (name, role) VALUES 
('高春强', 'admin'),
('杨伟', 'operator');

INSERT INTO thickness_specs (thickness, unit, sort_order) VALUES 
(3.0, 'mm', 1),
(4.0, 'mm', 2),
(6.0, 'mm', 3),
(10.0, 'mm', 4),
(16.0, 'mm', 5),
(20.0, 'mm', 6);

-- 插入测试工人数据
INSERT INTO workers (name, phone, department, position, status) VALUES 
('张三', '13800138001', '生产部', '激光切割操作员', 'active'),
('李四', '13800138002', '生产部', '质检员', 'active'),
('王五', '13800138003', '技术部', '工艺工程师', 'active');

-- 插入测试项目数据
INSERT INTO projects (name, description, status, priority, created_by, assigned_worker_id) VALUES 
('测试项目A', '激光切割测试项目A的描述', 'in_progress', 'high', 1, 1),
('测试项目B', '激光切割测试项目B的描述', 'pending', 'medium', 1, 2);

-- 插入测试板材数据
INSERT INTO materials (project_id, thickness_spec_id, quantity, status) VALUES 
(1, 1, 5, 'completed'),
(1, 2, 3, 'in_progress'),
(1, 3, 2, 'pending'),
(2, 1, 8, 'pending'),
(2, 4, 1, 'pending');
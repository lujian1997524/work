-- 激光切割排队管理系统数据表（简化版）
-- 只创建必要的新表和数据

-- 1. 排队管理表
CREATE TABLE IF NOT EXISTS cutting_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  worker_id INT NOT NULL,
  position INT NOT NULL COMMENT '排队位置',
  estimated_start_time DATETIME COMMENT '预计开始时间',
  estimated_duration INT COMMENT '预计切割时长（分钟）',
  priority ENUM('urgent', 'normal', 'low') DEFAULT 'normal' COMMENT '优先级',
  status ENUM('queued', 'cutting', 'completed') DEFAULT 'queued' COMMENT '状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_position (position),
  INDEX idx_status (status),
  INDEX idx_worker (worker_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- 2. 公告表
CREATE TABLE IF NOT EXISTS queue_announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '公告标题',
  content TEXT COMMENT '公告内容',
  type ENUM('priority_change', 'maintenance', 'delay', 'completion', 'general') DEFAULT 'general' COMMENT '公告类型',
  is_active BOOLEAN DEFAULT true COMMENT '是否有效',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL COMMENT '过期时间，NULL表示永不过期',
  created_by INT COMMENT '创建人ID',
  INDEX idx_active_expires (is_active, expires_at),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. 公共访问令牌表
CREATE TABLE IF NOT EXISTS public_queue_token (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(64) UNIQUE NOT NULL COMMENT '访问令牌',
  description VARCHAR(255) DEFAULT '激光切割排队公告板' COMMENT '令牌描述',
  is_active BOOLEAN DEFAULT true COMMENT '是否有效',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME NULL COMMENT '最后访问时间',
  access_count INT DEFAULT 0 COMMENT '访问次数'
);

-- 4. 插入默认的公共访问令牌（如果不存在）
INSERT IGNORE INTO public_queue_token (token, description) 
VALUES ('laser_queue_2025_public', '激光切割排队公告板');

-- 5. 创建活跃公告视图（先删除再创建）
DROP VIEW IF EXISTS v_active_announcements;
CREATE VIEW v_active_announcements AS
SELECT 
  id,
  title,
  content,
  type,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN '永久有效'
    WHEN expires_at > NOW() THEN CONCAT('有效至 ', DATE_FORMAT(expires_at, '%Y-%m-%d %H:%i'))
    ELSE '已过期'
  END as validity_status
FROM queue_announcements 
WHERE is_active = true 
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC;

-- 6. 插入示例公告（如果不存在）
INSERT IGNORE INTO queue_announcements (title, content, type, created_by) VALUES
('系统上线通知', '激光切割排队公告板系统正式上线，工人可扫码查看排队情况', 'general', 1),
('设备维护通知', '今日15:30-16:00进行设备维护，期间暂停切割作业', 'maintenance', 1);

-- 执行完成提示
SELECT 'laser_queue_2025_public' as 'default_token', 
       '激光切割排队系统数据库初始化完成' as 'status';
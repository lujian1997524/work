/**
 * 激光切割排队系统数据模型
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

// 排队管理模型
const CuttingQueue = sequelize.define('CuttingQueue', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'project_id'
  },
  workerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'worker_id'
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '排队位置'
  },
  estimatedStartTime: {
    type: DataTypes.DATE,
    field: 'estimated_start_time',
    comment: '预计开始时间'
  },
  estimatedDuration: {
    type: DataTypes.INTEGER,
    field: 'estimated_duration',
    comment: '预计切割时长（分钟）'
  },
  priority: {
    type: DataTypes.ENUM('urgent', 'normal', 'low'),
    defaultValue: 'normal',
    comment: '优先级'
  },
  status: {
    type: DataTypes.ENUM('queued', 'cutting', 'completed'),
    defaultValue: 'queued',
    comment: '状态'
  }
}, {
  tableName: 'cutting_queue',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['position'] },
    { fields: ['status'] },
    { fields: ['worker_id'] }
  ]
});

// 公告模型
const QueueAnnouncement = sequelize.define('QueueAnnouncement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '公告标题'
  },
  content: {
    type: DataTypes.TEXT,
    comment: '公告内容'
  },
  type: {
    type: DataTypes.ENUM('priority_change', 'maintenance', 'delay', 'completion', 'general'),
    defaultValue: 'general',
    comment: '公告类型'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: '是否有效'
  },
  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at',
    comment: '过期时间，NULL表示永不过期'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by',
    comment: '创建人ID'
  }
}, {
  tableName: 'queue_announcements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['is_active', 'expires_at'] }
  ]
});

// 公共访问令牌模型
const PublicQueueToken = sequelize.define('PublicQueueToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  token: {
    type: DataTypes.STRING(64),
    unique: true,
    allowNull: false,
    comment: '访问令牌'
  },
  description: {
    type: DataTypes.STRING(255),
    defaultValue: '激光切割排队公告板',
    comment: '令牌描述'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: '是否有效'
  },
  lastAccessed: {
    type: DataTypes.DATE,
    field: 'last_accessed',
    comment: '最后访问时间'
  },
  accessCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'access_count',
    comment: '访问次数'
  }
}, {
  tableName: 'public_queue_token',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 定义关联关系
const setupAssociations = (models) => {
  const { Project, Worker, User } = models;
  
  // 排队关联
  CuttingQueue.belongsTo(Project, {
    foreignKey: 'projectId',
    as: 'project'
  });
  
  CuttingQueue.belongsTo(Worker, {
    foreignKey: 'workerId',
    as: 'worker'
  });
  
  // 公告关联
  QueueAnnouncement.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
  
  // 项目关联排队
  Project.hasMany(CuttingQueue, {
    foreignKey: 'projectId',
    as: 'queueItems'
  });
  
  // 工人关联排队
  Worker.hasMany(CuttingQueue, {
    foreignKey: 'workerId',
    as: 'queueItems'
  });
};

module.exports = {
  CuttingQueue,
  QueueAnnouncement,
  PublicQueueToken,
  setupAssociations
};
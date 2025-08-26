const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

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
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  lastAccessed: {
    type: DataTypes.DATE,
    allowNull: true,
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
  timestamps: false
});

module.exports = PublicQueueToken;
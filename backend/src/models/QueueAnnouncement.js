const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

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
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at',
    comment: '过期时间，NULL表示永不过期'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    comment: '创建人ID'
  }
}, {
  tableName: 'queue_announcements',
  timestamps: false,
  indexes: [
    {
      fields: ['is_active', 'expires_at']
    }
  ]
});

module.exports = QueueAnnouncement;
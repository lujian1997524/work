const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

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
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'cutting_queue',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['position']
    },
    {
      fields: ['status']
    },
    {
      fields: ['worker_id']
    }
  ]
});

module.exports = CuttingQueue;
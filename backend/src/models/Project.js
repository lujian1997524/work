const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '项目名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '项目描述'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '项目状态'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'medium',
    comment: '优先级'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'start_date',
    comment: '开始日期'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'end_date',
    comment: '结束日期'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    comment: '创建人',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assignedWorkerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'assigned_worker_id',
    comment: '负责工人',
    references: {
      model: 'workers',
      key: 'id'
    }
  },
  // 过往项目相关字段
  isPastProject: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_past_project',
    comment: '是否为过往项目'
  },
  movedToPastAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'moved_to_past_at',
    comment: '移动到过往项目的时间'
  },
  movedToPastBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'moved_to_past_by',
    comment: '移动到过往项目的操作人ID',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // 软删除相关字段
  deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否已删除(软删除)'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at',
    comment: '删除时间'
  },
  deletedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'deleted_by',
    comment: '删除操作人ID',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // 排序相关字段
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sort_order',
    comment: '排序顺序'
  }
}, {
  tableName: 'projects',
  comment: '项目表',
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['assigned_worker_id']
    },
    {
      fields: ['is_past_project']
    },
    {
      fields: ['is_past_project', 'moved_to_past_at']
    },
    {
      fields: ['deleted']
    },
    {
      fields: ['sort_order']
    },
    {
      fields: ['is_past_project', 'sort_order']
    }
  ]
});

module.exports = Project;
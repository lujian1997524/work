const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const OperationHistory = sequelize.define('OperationHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'project_id',
    comment: '项目ID',
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  operationType: {
    type: DataTypes.ENUM(
      // 原有操作类型
      'material_update', 'drawing_upload', 'project_update', 'project_create', 'project_delete',
      // 新增的项目生命周期操作类型
      'material_start', 'material_complete', 'material_transfer', 'material_allocate',
      'requirement_add', 'requirement_allocate', 'project_status_change', 'worker_assign',
      'project_milestone', 'quality_check', 'delivery_schedule', 'resource_allocation',
      'batch_operation', 'system_backup', 'data_export', 'priority_change'
    ),
    allowNull: false,
    field: 'operation_type',
    comment: '操作类型：包含完整项目生命周期的所有关键操作'
  },
  operationDescription: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'operation_description',
    comment: '操作描述'
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '操作详细信息'
  },
  operatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'operated_by',
    comment: '操作人ID',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'operation_history',
  comment: '操作历史表',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // 不使用更新时间
  indexes: [
    {
      fields: ['project_id']
    },
    {
      fields: ['operated_by']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['operation_type']
    }
  ]
});

module.exports = OperationHistory;
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
    type: DataTypes.ENUM('material_update', 'drawing_upload', 'project_update', 'project_create', 'project_delete'),
    allowNull: false,
    field: 'operation_type',
    comment: '操作类型'
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
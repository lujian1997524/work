const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const MaterialRequirement = sequelize.define('MaterialRequirement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'project_id',
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'material_id',
    comment: '关联的项目材料ID',
    references: {
      model: 'materials',
      key: 'id'
    }
  },
  width: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: '宽度(mm)'
  },
  height: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: '长度(mm)'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '需求数量(张)'
  },
  allocatedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'allocated_quantity',
    comment: '已分配数量(张)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '需求备注'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
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
  tableName: 'material_requirements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['project_id']
    },
    {
      fields: ['material_id']
    }
  ]
});

module.exports = MaterialRequirement;
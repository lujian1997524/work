const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const WorkerMaterial = sequelize.define('WorkerMaterial', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  workerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'worker_id',
    references: {
      model: 'workers',
      key: 'id'
    }
  },
  thicknessSpecId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'thickness_spec_id',
    comment: '厚度规格ID',
    references: {
      model: 'thickness_specs',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '数量（张）'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
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
  tableName: 'worker_materials',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['worker_id']
    },
    {
      fields: ['thickness_spec_id']
    },
    {
      unique: true,
      fields: ['worker_id', 'thickness_spec_id']
    }
  ]
});

module.exports = WorkerMaterial;
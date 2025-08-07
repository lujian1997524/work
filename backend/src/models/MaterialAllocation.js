const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const MaterialAllocation = sequelize.define('MaterialAllocation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  requirementId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'requirement_id',
    comment: '关联的需求ID',
    references: {
      model: 'material_requirements',
      key: 'id'
    }
  },
  fromWorkerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'from_worker_id',
    comment: '出借人ID',
    references: {
      model: 'workers',
      key: 'id'
    }
  },
  toWorkerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'to_worker_id',
    comment: '项目负责人ID',
    references: {
      model: 'workers',
      key: 'id'
    }
  },
  workerMaterialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'worker_material_id',
    comment: '工人板材库存ID',
    references: {
      model: 'worker_materials',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '分配数量(张)'
  },
  status: {
    type: DataTypes.ENUM('allocated', 'returned'),
    allowNull: false,
    defaultValue: 'allocated',
    comment: '状态: allocated-已分配, returned-已归还'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '分配备注'
  },
  allocatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'allocated_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  allocatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'allocated_at'
  },
  returnedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'returned_at'
  }
}, {
  tableName: 'material_allocations',
  timestamps: false,
  indexes: [
    {
      fields: ['requirement_id']
    },
    {
      fields: ['from_worker_id']
    },
    {
      fields: ['to_worker_id']
    },
    {
      fields: ['worker_material_id']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = MaterialAllocation;
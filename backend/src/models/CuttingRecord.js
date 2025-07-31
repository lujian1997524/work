const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const CuttingRecord = sequelize.define('CuttingRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cuttingNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'cutting_number',
    comment: '切割号'
  },
  materialInventoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'material_inventory_id',
    comment: '使用的库存ID',
    references: {
      model: 'material_inventory',
      key: 'id'
    }
  },
  totalProjects: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_projects',
    comment: '涉及项目数'
  },
  cuttingDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'cutting_date',
    comment: '切割日期'
  },
  operatorWorkerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'operator_worker_id',
    comment: '操作员ID',
    references: {
      model: 'workers',
      key: 'id'
    }
  },
  materialUsedQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'material_used_quantity',
    comment: '使用材料数量'
  },
  remainderQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'remainder_quantity',
    comment: '产生余料数量'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '状态'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  }
}, {
  tableName: 'cutting_records',
  comment: '切割记录表',
  indexes: [
    {
      fields: ['cutting_number']
    },
    {
      fields: ['cutting_date']
    },
    {
      fields: ['operator_worker_id']
    }
  ]
});

module.exports = CuttingRecord;
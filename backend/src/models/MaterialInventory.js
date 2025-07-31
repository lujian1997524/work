const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const MaterialInventory = sequelize.define('MaterialInventory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  materialType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'material_type',
    comment: '材料类型：锰板、碳板、不锈钢'
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
  specification: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '尺寸规格，如1220×2440'
  },
  totalQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_quantity',
    comment: '总库存数量'
  },
  usedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'used_quantity',
    comment: '已使用数量'
  },
  remainingQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'remaining_quantity',
    comment: '剩余数量'
  },
  ownerWorkerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'owner_worker_id',
    comment: '归属工人ID',
    references: {
      model: 'workers',
      key: 'id'
    }
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '存放位置'
  },
  serialNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'serial_number',
    comment: '序号'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  }
}, {
  tableName: 'material_inventory',
  comment: '材料库存表',
  indexes: [
    {
      fields: ['material_type']
    },
    {
      fields: ['owner_worker_id']
    },
    {
      fields: ['thickness_spec_id']
    }
  ]
});

module.exports = MaterialInventory;
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const MaterialRemainder = sequelize.define('MaterialRemainder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cuttingNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'cutting_number',
    comment: '来源切割号'
  },
  materialType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'material_type',
    comment: '材料类型'
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
  originalQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'original_quantity',
    comment: '原始数量'
  },
  remainderQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'remainder_quantity',
    comment: '余料数量'
  },
  status: {
    type: DataTypes.ENUM('available', 'used', 'discarded'),
    allowNull: false,
    defaultValue: 'available',
    comment: '状态'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '存放位置'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  }
}, {
  tableName: 'material_remainder',
  comment: '余料管理表',
  indexes: [
    {
      fields: ['cutting_number']
    },
    {
      fields: ['material_type']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = MaterialRemainder;
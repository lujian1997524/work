const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const ThicknessSpec = sequelize.define('ThicknessSpec', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  thickness: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: '厚度值'
  },
  unit: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'mm',
    comment: '单位'
  },
  materialType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'material_type',
    comment: '材料类型'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active',
    comment: '是否启用'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sort_order',
    comment: '排序'
  }
}, {
  tableName: 'thickness_specs',
  comment: '厚度规格配置表',
  indexes: [
    {
      fields: ['thickness']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['sort_order']
    }
  ]
});

module.exports = ThicknessSpec;
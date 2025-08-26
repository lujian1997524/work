const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const Department = sequelize.define('Department', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '部门名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '部门描述'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否启用'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序顺序'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: '更新时间'
    }
  }, {
    tableName: 'departments',
    timestamps: true,
    comment: '部门表',
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['sortOrder']
      }
    ]
  });

module.exports = Department;
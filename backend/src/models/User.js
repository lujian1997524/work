const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '用户姓名'
  },
  role: {
    type: DataTypes.ENUM('admin', 'operator'),
    allowNull: false,
    defaultValue: 'operator',
    comment: '用户角色'
  }
}, {
  tableName: 'users',
  comment: '用户表',
  indexes: [
    {
      unique: true,
      fields: ['name']
    }
  ]
});

module.exports = User;
const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const Worker = sequelize.define('Worker', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '工人姓名'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '联系电话'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    },
    comment: '邮箱地址'
  },
  department: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '所属部门'
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    },
    comment: '部门ID'
  },
  position: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '职位'
  },
  skillTags: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'skill_tags',
    comment: '技能标签，JSON格式'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注信息'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
    comment: '状态'
  }
}, {
  tableName: 'workers',
  comment: '工人资料表',
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['department']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Worker;
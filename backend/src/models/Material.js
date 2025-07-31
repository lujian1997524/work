const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const Material = sequelize.define('Material', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'project_id',
    comment: '项目ID',
    references: {
      model: 'projects',
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
    defaultValue: 1,
    comment: '数量'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '状态'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'start_date',
    comment: '开始日期'
  },
  completedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'completed_date',
    comment: '完成日期'
  },
  completedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'completed_by',
    comment: '完成人',
    references: {
      model: 'workers',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  }
}, {
  tableName: 'materials',
  comment: '板材表',
  indexes: [
    {
      fields: ['project_id']
    },
    {
      fields: ['thickness_spec_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['completed_by']
    }
  ]
});

module.exports = Material;
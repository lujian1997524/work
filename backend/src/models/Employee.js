const { DataTypes } = require('sequelize');

class Employee {
  static init(sequelize) {
    return sequelize.define('Employee', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      employeeId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'employee_id',
        comment: '员工工号'
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '员工姓名'
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '车间'
      },
      position: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '职位'
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '电话号码'
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '邮箱地址'
      },
      hireDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'hire_date',
        comment: '入职日期'
      },
      dailyWorkHours: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 9.00,
        field: 'daily_work_hours',
        comment: '日标准工作小时'
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
        comment: '员工状态'
      },
      avatar: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '头像URL'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '备注'
      }
    }, {
      tableName: 'employees',
      timestamps: true,
      underscored: true,
      comment: '员工信息表',
      indexes: [
        {
          unique: true,
          fields: ['employee_id']
        },
        {
          fields: ['department']
        },
        {
          fields: ['status']
        }
      ]
    });
  }
}

module.exports = Employee;
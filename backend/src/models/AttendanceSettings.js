const { DataTypes } = require('sequelize');

class AttendanceSettings {
  static init(sequelize) {
    return sequelize.define('AttendanceSettings', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      settingKey: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'setting_key',
        comment: '设置键名'
      },
      settingValue: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'setting_value',
        comment: '设置值'
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '设置描述'
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'general',
        comment: '设置分类'
      }
    }, {
      tableName: 'attendance_settings',
      timestamps: true,
      underscored: true,
      comment: '考勤系统设置表',
      indexes: [
        {
          unique: true,
          fields: ['setting_key']
        }
      ]
    });
  }
}

module.exports = AttendanceSettings;
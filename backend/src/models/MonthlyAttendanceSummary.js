const { DataTypes } = require('sequelize');

class MonthlyAttendanceSummary {
  static init(sequelize) {
    return sequelize.define('MonthlyAttendanceSummary', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'employee_id',
        comment: '员工ID'
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '年份'
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '月份'
      },
      // 工作统计
      workDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'work_days',
        comment: '出勤天数'
      },
      totalWorkHours: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'total_work_hours',
        comment: '总工作小时'
      },
      standardWorkHours: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'standard_work_hours',
        comment: '标准工作小时'
      },
      // 请假统计
      totalLeaveHours: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'total_leave_hours',
        comment: '总请假小时'
      },
      sickLeaveHours: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'sick_leave_hours',
        comment: '病假小时'
      },
      personalLeaveHours: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'personal_leave_hours',
        comment: '事假小时'
      },
      annualLeaveHours: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'annual_leave_hours',
        comment: '年假小时'
      },
      compensatoryLeaveHours: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'compensatory_leave_hours',
        comment: '调休小时'
      },
      // 其他统计
      totalOvertimeHours: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'total_overtime_hours',
        comment: '总加班小时'
      },
      absentDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'absent_days',
        comment: '缺勤天数'
      },
      attendanceRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        field: 'attendance_rate',
        comment: '出勤率(%)'
      },
      // 元数据
      calculatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'calculated_at',
        comment: '计算时间'
      }
    }, {
      tableName: 'monthly_attendance_summary',
      timestamps: true,
      underscored: true,
      comment: '月度考勤汇总表',
      indexes: [
        {
          unique: true,
          fields: ['employee_id', 'year', 'month']
        },
        {
          fields: ['year', 'month']
        },
        {
          fields: ['attendance_rate']
        }
      ]
    });
  }
}

module.exports = MonthlyAttendanceSummary;
const { DataTypes } = require('sequelize');

class AttendanceException {
  static init(sequelize) {
    return sequelize.define('AttendanceException', {
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
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '考勤日期'
      },
      exceptionType: {
        type: DataTypes.ENUM('leave', 'absent', 'overtime', 'early', 'late'),
        allowNull: false,
        field: 'exception_type',
        comment: '异常类型：请假/缺勤/加班/早退/迟到'
      },
      // 请假相关字段
      leaveType: {
        type: DataTypes.ENUM('sick', 'personal', 'annual', 'compensatory'),
        allowNull: true,
        field: 'leave_type',
        comment: '请假类型：病假/事假/年假/调休'
      },
      leaveDurationType: {
        type: DataTypes.ENUM('full_day', 'half_day', 'hours'),
        allowNull: true,
        field: 'leave_duration_type',
        comment: '请假时长类型'
      },
      leaveHours: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        field: 'leave_hours',
        comment: '请假小时数'
      },
      leaveStartTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'leave_start_time',
        comment: '请假开始时间'
      },
      leaveEndTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'leave_end_time',
        comment: '请假结束时间'
      },
      leaveReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'leave_reason',
        comment: '请假原因'
      },
      // 加班相关字段
      overtimeMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'overtime_minutes',
        comment: '加班分钟数'
      },
      overtimeStartTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'overtime_start_time',
        comment: '加班开始时间'
      },
      overtimeEndTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'overtime_end_time',
        comment: '加班结束时间'
      },
      overtimeReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'overtime_reason',
        comment: '加班原因'
      },
      // 缺勤相关字段
      absentReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'absent_reason',
        comment: '缺勤原因'
      },
      // 早退相关字段
      earlyLeaveTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'early_leave_time',
        comment: '早退时间'
      },
      earlyLeaveReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'early_leave_reason',
        comment: '早退原因'
      },
      // 迟到相关字段
      lateArrivalTime: {
        type: DataTypes.TIME,
        allowNull: true,
        field: 'late_arrival_time',
        comment: '迟到到达时间'
      },
      lateArrivalReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'late_arrival_reason',
        comment: '迟到原因'
      },
      // 通用字段
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '备注'
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'created_by',
        comment: '创建人ID'
      }
    }, {
      tableName: 'attendance_exceptions',
      timestamps: true,
      underscored: true,
      comment: '考勤异常记录表',
      indexes: [
        {
          unique: true,
          fields: ['employee_id', 'date', 'exception_type'],
          name: 'attendance_exception_unique'
        },
        {
          fields: ['date']
        },
        {
          fields: ['exception_type']
        },
        {
          fields: ['leave_type']
        },
        {
          fields: ['created_by']
        },
        {
          fields: ['employee_id', 'date']
        }
      ]
    });
  }
}

module.exports = AttendanceException;
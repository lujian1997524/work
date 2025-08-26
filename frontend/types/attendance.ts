// 考勤系统类型定义

export interface Employee {
  id: number;
  name: string;
  employeeId?: string; // 自动生成，可选显示
  department?: string; // 默认部门，可选显示
  position: string;
  hireDate: string;
  dailyWorkHours?: number; // 后台设置，前台不显示
  status: 'active' | 'inactive';
  avatar?: string;
  phone?: string;
  email?: string; // 不再使用，但保留兼容性
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceException {
  id: number;
  employeeId: number;
  date: string;
  exceptionType: 'leave' | 'absent' | 'overtime' | 'early' | 'late';
  
  // 请假相关字段
  leaveType?: 'sick' | 'personal' | 'annual' | 'compensatory'; // 病假/事假/年假/调休
  leaveDurationType?: 'full_day' | 'half_day' | 'hours'; // 全天/半天/小时级
  leaveHours?: number; // 请假小时数（精确到0.5小时）
  leaveStartTime?: string; // 请假开始时间 HH:MM
  leaveEndTime?: string; // 请假结束时间 HH:MM
  leaveReason?: string; // 请假原因
  
  // 加班相关字段
  overtimeMinutes?: number; // 加班分钟数（精确到分钟）
  overtimeReason?: string; // 加班原因
  overtimeStartTime?: string; // 加班开始时间 HH:MM
  overtimeEndTime?: string; // 加班结束时间 HH:MM
  
  // 早退相关字段
  earlyLeaveTime?: string; // 早退时间 HH:MM
  earlyLeaveReason?: string; // 早退原因
  
  // 迟到相关字段
  lateArrivalTime?: string; // 迟到时间 HH:MM
  lateArrivalReason?: string; // 迟到原因
  
  // 缺勤相关字段
  absentReason?: string; // 缺勤原因
  
  notes?: string; // 备注
  createdBy: number; // 记录创建者
  createdAt: string;
  updatedAt: string;
}

export interface DailyAttendanceSummary {
  employeeId: number;
  employee: Employee;
  date: string;
  status: 'present' | 'leave' | 'absent' | 'overtime'; // 出勤状态
  actualWorkHours: number; // 实际工作小时数
  overtimeHours: number; // 加班小时数
  leaveHours: number; // 请假小时数
  exception?: AttendanceException; // 异常记录
}

export interface MonthlyAttendanceStats {
  employeeId: number;
  employee: Employee;
  year: number;
  month: number;
  workDays: number; // 出勤天数
  totalWorkHours: number; // 总工作小时数
  totalLeaveHours: number; // 总请假小时数
  totalOvertimeHours: number; // 总加班小时数
  attendanceRate: number; // 出勤率 (百分比)
  leaveBreakdown: {
    sick: number;
    personal: number;
    annual: number;
    compensatory: number;
  };
}

export interface AttendanceSettings {
  id: number;
  standardWorkHoursPerDay: number; // 标准工作时长/天
  workDaysPerMonth: number; // 每月标准工作日
  overtimeThreshold: number; // 加班时间阈值
  workStartTime: string; // 标准上班时间
  workEndTime: string; // 标准下班时间
  lunchBreakDuration: number; // 午休时长(小时)
  createdAt: string;
  updatedAt: string;
}

// 请假类型选项
export const LEAVE_TYPE_OPTIONS = [
  { value: 'sick', label: '病假' },
  { value: 'personal', label: '事假' },
  { value: 'annual', label: '年假' },
  { value: 'compensatory', label: '调休' }
] as const;

// 请假时长类型选项
export const LEAVE_DURATION_OPTIONS = [
  { value: 'full_day', label: '全天' },
  { value: 'half_day', label: '半天' },
  { value: 'hours', label: '小时级' }
] as const;

// 异常类型选项
export const EXCEPTION_TYPE_OPTIONS = [
  { value: 'leave', label: '请假' },
  { value: 'absent', label: '缺勤' },
  { value: 'overtime', label: '加班' },
  { value: 'early', label: '早退' },
  { value: 'late', label: '迟到' }
] as const;

// 考勤状态颜色映射
export const ATTENDANCE_STATUS_COLORS = {
  present: 'success',
  leave: 'warning', 
  absent: 'error',
  overtime: 'info',
  early: 'warning',
  late: 'warning'
} as const;

// 考勤状态文本映射
export const ATTENDANCE_STATUS_LABELS = {
  present: '正常出勤',
  leave: '请假',
  absent: '缺勤',
  overtime: '加班出勤',
  early: '早退',
  late: '迟到'
} as const;
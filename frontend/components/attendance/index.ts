// 考勤系统入口文件 - 导出所有组件
export { AttendanceManagement } from './AttendanceManagement';
export { EmployeeManagement } from './EmployeeManagement';
export { DailyAttendanceEntry } from './DailyAttendanceEntry';
export { LeaveManagement } from './LeaveManagement';
export { AttendanceStatistics } from './AttendanceStatistics';

// 导出类型定义
export type {
  Employee,
  AttendanceException,
  DailyAttendanceSummary,
  MonthlyAttendanceStats,
  AttendanceSettings
} from '../../types/attendance';

// 导出状态管理
export { useAttendanceStore } from '../../stores/attendanceStore';

// 导出工具函数 (ExcelJS版本)
export { 
  exportMonthlyAttendanceReport,
  exportDailyAttendance
} from '../../utils/attendanceExporter';
/**
 * 考勤管理Excel导出工具 - 简洁实用版
 */

import ExcelJS from 'exceljs';
import { 
  type Employee, 
  type AttendanceException, 
  type MonthlyAttendanceStats, 
  LEAVE_TYPE_OPTIONS 
} from '@/types/attendance';

interface ExportData {
  employees: Employee[];
  monthlyStats: MonthlyAttendanceStats[];
  attendanceExceptions: AttendanceException[];
  year: number;
  month: number;
}

// 简洁配色 - 只保留必要的颜色
const COLORS = {
  header: 'D0D0D0',      // 浅灰色表头
  border: '808080'       // 灰色边框
};

// 简单的样式应用函数
const applyHeaderStyle = (cell: any, text: string) => {
  cell.value = text;
  cell.font = { bold: true };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } }
  };
};

const applyCellStyle = (cell: any, text: string | number) => {
  cell.value = text;
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } }
  };
};

/**
 * 导出今日考勤详情到Excel - 简化版
 */
export const exportDailyAttendance = async (
  employees: Employee[], 
  attendanceExceptions: AttendanceException[], 
  date: string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('今日考勤');

  // 设置列宽
  worksheet.columns = [
    { header: '员工工号', key: 'employeeId', width: 15 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '部门', key: 'department', width: 15 },
    { header: '岗位', key: 'position', width: 15 },
    { header: '考勤状态', key: 'status', width: 15 },
    { header: '异常类型', key: 'exceptionType', width: 15 },
    { header: '备注', key: 'remark', width: 30 }
  ];

  // 应用表头样式
  worksheet.getRow(1).eachCell((cell) => {
    applyHeaderStyle(cell, cell.value as string);
  });

  // 添加员工考勤数据
  employees.forEach((employee, index) => {
    const rowIndex = index + 2;
    const row = worksheet.getRow(rowIndex);
    
    const exception = attendanceExceptions.find(ex => ex.employeeId === employee.employeeId);
    
    applyCellStyle(row.getCell(1), employee.employeeId);
    applyCellStyle(row.getCell(2), employee.name);
    applyCellStyle(row.getCell(3), employee.department);
    applyCellStyle(row.getCell(4), employee.position);
    applyCellStyle(row.getCell(5), exception ? exception.exceptionType : '正常');
    applyCellStyle(row.getCell(6), exception ? exception.exceptionType : '');
    applyCellStyle(row.getCell(7), exception ? exception.reason || '' : '');
  });

  // 导出文件
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${date}-考勤详情.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * 导出月度考勤统计到Excel - 完整版（使用Store数据）
 */
export const exportMonthlyAttendanceReport = async (year: number, month: number): Promise<void> => {
  try {
    // 从全局获取Store数据（需要在调用时传入）
    // 由于无法直接访问Store，我们需要修改调用方式
    throw new Error('请使用 exportMonthlyAttendanceReportWithData 函数');
  } catch (error) {
    console.error('导出月度考勤报告失败:', error);
    throw new Error('导出失败，请重试');
  }
};

/**
 * 导出月度考勤统计到Excel - 完整版（传入数据）
 */
export const exportMonthlyAttendanceReportWithData = async (
  year: number, 
  month: number, 
  employees: any[], 
  attendanceExceptions: any[]
): Promise<void> => {
  try {
    console.log('导出参数:', { year, month, employees: employees.length, exceptions: attendanceExceptions.length });
    console.log('员工数据:', employees);
    
    // 如果没有员工数据，添加一条提示信息
    if (!employees || employees.length === 0) {
      console.log('没有员工数据，添加提示信息');
      employees = [{
        id: 0,
        employeeId: '暂无数据',
        name: '暂无员工信息',
        department: '请检查数据',
        position: '系统管理员'
      }];
    }
    
    const workbook = new ExcelJS.Workbook();
    
    // 过滤当月的考勤异常
    const monthlyExceptions = attendanceExceptions.filter(exc => {
      const excDate = new Date(exc.date);
      return excDate.getFullYear() === year && excDate.getMonth() + 1 === month;
    });
    
    // 工作表1: 员工考勤汇总
    const summarySheet = workbook.addWorksheet('员工考勤汇总');
    
    // 设置列定义
    summarySheet.columns = [
      { header: '员工工号', key: 'employeeId', width: 15 },
      { header: '姓名', key: 'name', width: 15 },
      { header: '部门', key: 'department', width: 15 },
      { header: '岗位', key: 'position', width: 15 },
      { header: '正常出勤(天)', key: 'present', width: 15 },
      { header: '请假(天)', key: 'leave', width: 12 },
      { header: '缺勤(天)', key: 'absent', width: 12 },
      { header: '加班(小时)', key: 'overtime', width: 15 },
      { header: '迟到(次)', key: 'late', width: 12 },
      { header: '早退(次)', key: 'early', width: 12 }
    ];

    // 应用表头样式
    summarySheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D0D0D0' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // 添加员工考勤统计数据
    employees.forEach((employee, index) => {
      const rowIndex = index + 2;
      const row = summarySheet.getRow(rowIndex);
      
      // 统计该员工当月各种状态的时长和次数
      const employeeExceptions = monthlyExceptions.filter(exc => exc.employeeId === employee.id);
      
      // 按类型分组统计
      const leaveExceptions = employeeExceptions.filter(exc => exc.exceptionType === 'leave');
      const absentExceptions = employeeExceptions.filter(exc => exc.exceptionType === 'absent');
      const overtimeExceptions = employeeExceptions.filter(exc => exc.exceptionType === 'overtime');
      const lateExceptions = employeeExceptions.filter(exc => exc.exceptionType === 'late');
      const earlyExceptions = employeeExceptions.filter(exc => exc.exceptionType === 'early');
      
      // 计算请假总天数（按小时转天数，8小时=1天）
      const totalLeaveHours = leaveExceptions.reduce((sum, exc) => sum + (exc.leaveHours || 0), 0);
      const leaveDays = Math.round(totalLeaveHours / 8 * 10) / 10; // 保留1位小数
      
      // 计算缺勤天数（每次缺勤按1天计算）
      const absentDays = absentExceptions.length;
      
      // 计算加班总小时数
      const totalOvertimeMinutes = overtimeExceptions.reduce((sum, exc) => sum + (exc.overtimeMinutes || 0), 0);
      const overtimeHours = Math.round(totalOvertimeMinutes / 60 * 10) / 10; // 保留1位小数
      
      // 迟到早退按次数统计
      const lateCount = lateExceptions.length;
      const earlyCount = earlyExceptions.length;
      
      // 计算正常出勤天数（假设当月22个工作日）
      const workDaysInMonth = 22;
      const presentDays = workDaysInMonth - leaveDays - absentDays;
      
      row.getCell(1).value = employee.employeeId || '';
      row.getCell(2).value = employee.name || '';
      row.getCell(3).value = employee.department || '';
      row.getCell(4).value = employee.position || '';
      row.getCell(5).value = presentDays;
      row.getCell(6).value = leaveDays;
      row.getCell(7).value = absentDays;
      row.getCell(8).value = overtimeHours;
      row.getCell(9).value = lateCount;
      row.getCell(10).value = earlyCount;
      
      // 添加边框
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // 工作表2: 异常详情
    if (monthlyExceptions.length > 0) {
      const exceptionsSheet = workbook.addWorksheet('异常详情');
      
      exceptionsSheet.columns = [
        { header: '日期', key: 'date', width: 15 },
        { header: '员工工号', key: 'employeeId', width: 15 },
        { header: '姓名', key: 'name', width: 15 },
        { header: '异常类型', key: 'exceptionType', width: 15 },
        { header: '请假类型', key: 'leaveType', width: 15 },
        { header: '时长(小时)', key: 'hours', width: 15 },
        { header: '原因', key: 'reason', width: 30 }
      ];

      // 应用表头样式
      exceptionsSheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D0D0D0' } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // 添加异常数据
      monthlyExceptions.forEach((exception, index) => {
        const employee = employees.find(emp => emp.id === exception.employeeId);
        const rowIndex = index + 2;
        const row = exceptionsSheet.getRow(rowIndex);
        
        row.getCell(1).value = new Date(exception.date).toLocaleDateString();
        row.getCell(2).value = employee?.employeeId || '';
        row.getCell(3).value = employee?.name || '';
        row.getCell(4).value = exception.exceptionType || '';
        row.getCell(5).value = exception.leaveType || '';
        row.getCell(6).value = exception.leaveHours || exception.overtimeHours || 0;
        row.getCell(7).value = exception.leaveReason || exception.overtimeReason || exception.absentReason || exception.lateArrivalReason || exception.earlyLeaveReason || '';
        
        // 添加边框
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    }

    // 导出文件
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${year}年${month}月考勤统计报表.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('导出月度考勤报告失败:', error);
    throw new Error('导出失败，请重试');
  }
};
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
    
    const exception = attendanceExceptions.find(ex => ex.employeeId === employee.id);
    
    applyCellStyle(row.getCell(1), employee.employeeId || employee.id.toString());
    applyCellStyle(row.getCell(2), employee.name);
    applyCellStyle(row.getCell(3), employee.department || '未指定');
    applyCellStyle(row.getCell(4), employee.position);
    applyCellStyle(row.getCell(5), exception ? exception.exceptionType : '正常');
    applyCellStyle(row.getCell(6), exception ? exception.exceptionType : '');
    const getExceptionReason = (exception: AttendanceException) => {
      switch (exception.exceptionType) {
        case 'leave': return exception.leaveReason || '';
        case 'overtime': return exception.overtimeReason || '';
        case 'early': return exception.earlyLeaveReason || '';
        case 'late': return exception.lateArrivalReason || '';
        case 'absent': return exception.absentReason || '';
        default: return '';
      }
    };

    applyCellStyle(row.getCell(7), exception ? getExceptionReason(exception) : '');
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
 * 统计汇总在上面，异常明细在下面，合并到一个工作表
 */
export const exportMonthlyAttendanceReportWithData = async (
  year: number, 
  month: number, 
  employees: any[], 
  attendanceExceptions: any[]
): Promise<void> => {
  try {
    console.log('导出参数:', { year, month, employees: employees.length, exceptions: attendanceExceptions.length });
    
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
    const worksheet = workbook.addWorksheet(`${year}年${month}月考勤报表`);
    
    // 过滤当月的考勤异常
    const monthlyExceptions = attendanceExceptions.filter(exc => {
      const excDate = new Date(exc.date);
      return excDate.getFullYear() === year && excDate.getMonth() + 1 === month;
    });
    
    let currentRow = 1;
    
    // ===================
    // 第一部分：标题
    // ===================
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = `${year}年${month}月考勤统计报表`;
    titleCell.font = { bold: true, size: 16 };
    worksheet.mergeCells(currentRow, 1, currentRow, 12);
    titleCell.alignment = { horizontal: 'center' };
    currentRow += 2;
    
    // ===================
    // 第二部分：考勤综合统计
    // ===================
    const summaryTitleCell = worksheet.getCell(currentRow, 1);
    summaryTitleCell.value = '考勤综合统计';
    summaryTitleCell.font = { bold: true, size: 14 };
    worksheet.mergeCells(currentRow, 1, currentRow, 12);
    summaryTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F3FF' } };
    currentRow += 2;

    // 过滤掉员工信息不完整的数据
    const validEmployees = employees.filter(emp => 
      emp.name && emp.name.trim() !== '' && 
      emp.employeeId && emp.employeeId.trim() !== ''
    );

    console.log(`原始员工数: ${employees.length}, 有效员工数: ${validEmployees.length}`);
    
    // 统计表头 - 移除迟到次数和早退次数
    const summaryHeaders = ['员工工号', '姓名', '部门', '岗位', '应出勤天数', '实际出勤', '异常考勤时长', '加班时长(小时)', '出勤率', '主要异常原因'];
    summaryHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      applyHeaderStyle(cell, header);
    });
    currentRow++;

    // 统计数据 - 只处理有效员工
    validEmployees.forEach((employee) => {
      const employeeExceptions = monthlyExceptions.filter(exc => exc.employeeId === employee.id);
      
      // 按类型分组统计
      const leaveExceptions = employeeExceptions.filter(exc => exc.exceptionType === 'leave');
      const absentExceptions = employeeExceptions.filter(exc => exc.exceptionType === 'absent');
      const overtimeExceptions = employeeExceptions.filter(exc => exc.exceptionType === 'overtime');
      const lateExceptions = employeeExceptions.filter(exc => exc.exceptionType === 'late');
      const earlyExceptions = employeeExceptions.filter(exc => exc.exceptionType === 'early');
      
      // 计算异常考勤总时长（请假+缺勤，以天为单位，小于1天显示小时）
      const totalLeaveHours = leaveExceptions.reduce((sum, exc) => sum + (exc.leaveHours || 0), 0);
      const totalAbsentHours = absentExceptions.reduce((sum, exc) => sum + (exc.absentHours || 8), 0); // 缺勤默认8小时
      const totalExceptionHours = totalLeaveHours + totalAbsentHours;
      
      let exceptionDuration;
      if (totalExceptionHours >= 8) {
        const days = Math.round(totalExceptionHours / 8 * 10) / 10;
        exceptionDuration = `${days}天`;
      } else if (totalExceptionHours > 0) {
        exceptionDuration = `${totalExceptionHours}小时`;
      } else {
        exceptionDuration = '0天';
      }
      
      // 实际出勤天数计算
      const leaveDays = Math.ceil(totalLeaveHours / 8);
      const absentDays = absentExceptions.length;
      const totalOvertimeMinutes = overtimeExceptions.reduce((sum, exc) => sum + (exc.overtimeMinutes || 0), 0);
      const overtimeHours = Math.round(totalOvertimeMinutes / 60 * 10) / 10;
      const lateCount = lateExceptions.length;
      const earlyCount = earlyExceptions.length;
      
      // 应出勤天数（假设当月22个工作日）
      const workDaysInMonth = 22;
      const actualWorkDays = workDaysInMonth - leaveDays - absentDays;
      const attendanceRate = ((actualWorkDays / workDaysInMonth) * 100).toFixed(1) + '%';
      
      // 主要异常原因统计
      const exceptionCounts: { [key: string]: number } = {
        leave: leaveExceptions.length,
        absent: absentExceptions.length,
        overtime: overtimeExceptions.length
      };
      const maxException = Object.entries(exceptionCounts).reduce((a, b) => exceptionCounts[a[0]] > exceptionCounts[b[0]] ? a : b);
      const mainReason = maxException[1] > 0 ? getExceptionTypeName(maxException[0]) : '无异常';
      
      // 填充数据行 - 调整列顺序
      const row = worksheet.getRow(currentRow);
      applyCellStyle(row.getCell(1), employee.employeeId || '');
      applyCellStyle(row.getCell(2), employee.name || '');
      applyCellStyle(row.getCell(3), employee.department || '');
      applyCellStyle(row.getCell(4), employee.position || '');
      applyCellStyle(row.getCell(5), workDaysInMonth);
      applyCellStyle(row.getCell(6), actualWorkDays);
      applyCellStyle(row.getCell(7), exceptionDuration);
      applyCellStyle(row.getCell(8), overtimeHours);
      applyCellStyle(row.getCell(9), attendanceRate);
      applyCellStyle(row.getCell(10), mainReason);
      
      currentRow++;
    });

    currentRow += 2; // 空行分隔

    // ===================
    // 第三部分：异常考勤明细（不包括加班）
    // ===================
    const nonOvertimeExceptions = monthlyExceptions.filter(exc => exc.exceptionType !== 'overtime');
    if (nonOvertimeExceptions.length > 0) {
      const detailTitleCell = worksheet.getCell(currentRow, 1);
      detailTitleCell.value = '异常考勤明细';
      detailTitleCell.font = { bold: true, size: 14 };
      worksheet.mergeCells(currentRow, 1, currentRow, 11);
      detailTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2E6' } };
      currentRow += 2;

      // 明细表头
      const detailHeaders = ['日期', '星期', '员工工号', '姓名', '部门', '异常类型', '请假类型', '开始时间', '结束时间', '时长', '详细原因'];
      detailHeaders.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        applyHeaderStyle(cell, header);
      });
      currentRow++;

      // 明细数据 - 按日期排序，只显示有效员工的记录
      const sortedExceptions = nonOvertimeExceptions
        .filter(exception => {
          const employee = validEmployees.find(emp => emp.id === exception.employeeId);
          return employee; // 只显示找到有效员工信息的记录
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      sortedExceptions.forEach((exception) => {
        const employee = validEmployees.find(emp => emp.id === exception.employeeId);
        const exceptionDate = new Date(exception.date);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = '星期' + weekdays[exceptionDate.getDay()];
        
        // 格式化时间 - 根据异常类型使用正确的字段
        const getStartTime = (exception: any) => {
          switch (exception.exceptionType) {
            case 'leave': return exception.leaveStartTime;
            case 'overtime': return exception.overtimeStartTime;
            case 'late': return exception.lateArrivalTime;
            case 'early': return exception.earlyLeaveTime;
            default: return exception.startTime; // 兼容旧字段
          }
        };
        
        const getEndTime = (exception: any) => {
          switch (exception.exceptionType) {
            case 'leave': return exception.leaveEndTime;
            case 'overtime': return exception.overtimeEndTime;
            default: return exception.endTime; // 兼容旧字段
          }
        };
        
        const formatTime = (timeStr: string) => {
          if (!timeStr) return '';
          const time = new Date(`2000-01-01 ${timeStr}`);
          return time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        };
        
        // 计算时长显示
        let duration = '';
        if (exception.exceptionType === 'leave' && exception.leaveHours) {
          duration = `${exception.leaveHours}小时`;
        } else if (exception.exceptionType === 'late' && exception.lateMinutes) {
          duration = `${exception.lateMinutes}分钟`;
        } else if (exception.exceptionType === 'early' && exception.earlyMinutes) {
          duration = `${exception.earlyMinutes}分钟`;
        } else {
          duration = '全天';
        }
        
        // 详细原因
        const detailReason = exception.leaveReason || exception.absentReason || 
                           exception.lateArrivalReason || exception.earlyLeaveReason || '无';

        const row = worksheet.getRow(currentRow);
        applyCellStyle(row.getCell(1), exceptionDate.toLocaleDateString('zh-CN'));
        applyCellStyle(row.getCell(2), weekday);
        applyCellStyle(row.getCell(3), employee.employeeId);
        applyCellStyle(row.getCell(4), employee.name);
        applyCellStyle(row.getCell(5), employee.department || '未指定部门');
        applyCellStyle(row.getCell(6), getExceptionTypeName(exception.exceptionType));
        applyCellStyle(row.getCell(7), getLeaveTypeName(exception.leaveType) || '');
        applyCellStyle(row.getCell(8), formatTime(getStartTime(exception)) || '未记录');
        applyCellStyle(row.getCell(9), formatTime(getEndTime(exception)) || '未记录');
        applyCellStyle(row.getCell(10), duration);
        applyCellStyle(row.getCell(11), detailReason);
        
        currentRow++;
      });
    } else {
      const noDataCell = worksheet.getCell(currentRow, 1);
      noDataCell.value = '本月无异常考勤记录';
      noDataCell.font = { italic: true, color: { argb: '808080' } };
      worksheet.mergeCells(currentRow, 1, currentRow, 11);
      noDataCell.alignment = { horizontal: 'center' };
      currentRow += 2;
    }

    currentRow += 2; // 空行分隔

    // ===================
    // 第四部分：加班明细
    // ===================
    const overtimeExceptions = monthlyExceptions.filter(exc => exc.exceptionType === 'overtime');
    if (overtimeExceptions.length > 0) {
      const overtimeTitleCell = worksheet.getCell(currentRow, 1);
      overtimeTitleCell.value = '加班明细';
      overtimeTitleCell.font = { bold: true, size: 14 };
      worksheet.mergeCells(currentRow, 1, currentRow, 10);
      overtimeTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6FFE6' } };
      currentRow += 2;

      // 加班明细表头 - 调整顺序：加班原因放在审批状态后面
      const overtimeHeaders = ['日期', '星期', '员工工号', '姓名', '部门', '开始时间', '结束时间', '加班时长', '审批状态', '加班原因'];
      overtimeHeaders.forEach((header, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        applyHeaderStyle(cell, header);
      });
      currentRow++;

      // 加班明细数据 - 按日期排序，只显示有效员工的记录
      const sortedOvertimeExceptions = overtimeExceptions
        .filter(exception => {
          const employee = validEmployees.find(emp => emp.id === exception.employeeId);
          return employee; // 只显示找到有效员工信息的记录
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      sortedOvertimeExceptions.forEach((exception) => {
        const employee = validEmployees.find(emp => emp.id === exception.employeeId);
        const exceptionDate = new Date(exception.date);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = '星期' + weekdays[exceptionDate.getDay()];
        
        // 格式化时间
        const formatTime = (timeStr: string) => {
          if (!timeStr) return '';
          const time = new Date(`2000-01-01 ${timeStr}`);
          return time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        };
        
        // 加班时长显示 - 改进计算逻辑
        let overtimeHours = '未记录';
        if (exception.overtimeMinutes && exception.overtimeMinutes > 0) {
          overtimeHours = `${Math.round(exception.overtimeMinutes / 60 * 10) / 10}小时`;
        } else if (exception.overtimeHours && exception.overtimeHours > 0) {
          overtimeHours = `${exception.overtimeHours}小时`;
        } else if (exception.overtimeStartTime && exception.overtimeEndTime) {
          // 尝试从加班开始结束时间计算
          const start = new Date(`2000-01-01 ${exception.overtimeStartTime}`);
          const end = new Date(`2000-01-01 ${exception.overtimeEndTime}`);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            if (diffHours > 0) {
              overtimeHours = `${Math.round(diffHours * 10) / 10}小时`;
            }
          }
        }
        
        const row = worksheet.getRow(currentRow);
        applyCellStyle(row.getCell(1), exceptionDate.toLocaleDateString('zh-CN'));
        applyCellStyle(row.getCell(2), weekday);
        applyCellStyle(row.getCell(3), employee.employeeId);
        applyCellStyle(row.getCell(4), employee.name);
        applyCellStyle(row.getCell(5), employee.department || '未指定部门');
        applyCellStyle(row.getCell(6), formatTime(exception.overtimeStartTime) || '未记录');
        applyCellStyle(row.getCell(7), formatTime(exception.overtimeEndTime) || '未记录');
        applyCellStyle(row.getCell(8), overtimeHours);
        applyCellStyle(row.getCell(9), '已记录'); // 审批状态
        applyCellStyle(row.getCell(10), exception.overtimeReason || '无'); // 加班原因
        
        currentRow++;
      });
    } else {
      const noOvertimeCell = worksheet.getCell(currentRow, 1);
      noOvertimeCell.value = '本月无加班记录';
      noOvertimeCell.font = { italic: true, color: { argb: '808080' } };
      worksheet.mergeCells(currentRow, 1, currentRow, 10);
      noOvertimeCell.alignment = { horizontal: 'center' };
    }

    // 设置列宽
    worksheet.columns = [
      { width: 12 },  // 员工工号/日期
      { width: 12 },  // 姓名/星期  
      { width: 12 },  // 部门/员工工号
      { width: 12 },  // 岗位/姓名
      { width: 12 },  // 应出勤天数/部门
      { width: 12 },  // 实际出勤/异常类型
      { width: 12 },  // 请假天数/请假类型
      { width: 12 },  // 缺勤天数/开始时间
      { width: 12 },  // 迟到次数/结束时间
      { width: 12 },  // 早退次数/时长
      { width: 15 },  // 加班时长/详细原因
      { width: 12 },  // 出勤率
      { width: 15 }   // 主要异常原因
    ];

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

// 异常类型名称映射
const getExceptionTypeName = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    'leave': '请假',
    'absent': '缺勤', 
    'late': '迟到',
    'early': '早退',
    'overtime': '加班'
  };
  return typeMap[type] || type;
};

// 请假类型名称映射
const getLeaveTypeName = (type: string): string => {
  const leaveTypeMap: { [key: string]: string } = {
    'sick': '病假',
    'personal': '事假',
    'annual': '年假',
    'marriage': '婚假',
    'maternity': '产假',
    'paternity': '陪产假',
    'bereavement': '丧假',
    'work_injury': '工伤假',
    'compassionate': '探亲假',
    'other': '其他假期'
  };
  return leaveTypeMap[type] || type;
};
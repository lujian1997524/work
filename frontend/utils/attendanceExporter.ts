/**
 * 考勤管理Excel导出工具
 * 采用温暖明亮的配色方案，实现清晰美观的考勤数据展示
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

// 温暖简约配色方案
const COLORS = {
  // 主色调 - 温暖的蓝色
  primary: '2563EB',        // 明亮蓝色
  primaryLight: '60A5FA',   // 浅蓝色
  
  // 状态色彩 - 明亮温暖
  success: '16A34A',        // 鲜绿色
  warning: 'EA580C',        // 温暖橙色
  danger: 'DC2626',         // 明红色
  info: '0EA5E9',           // 天蓝色
  
  // 中性色 - 温暖灰调
  gray900: '1F2937',        // 深灰文字
  gray700: '374151',        // 中灰文字
  gray500: '6B7280',        // 浅灰文字
  gray300: 'D1D5DB',        // 边框灰
  gray100: 'F3F4F6',        // 背景浅灰
  gray50: 'FEFEFE',         // 纯白背景
};

// 专业图标字符映射（简约版）
const ICONS = {
  calendar: '■',
  clock: '●', 
  user: '◉',
  check: '●',
  warning: '▲',
  chart: '■',
  building: '▣',
  time: '●'
};

/**
 * 导出今日考勤详情到Excel
 */
export const exportDailyAttendance = async (
  employees: Employee[], 
  attendanceExceptions: AttendanceException[], 
  date: string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  
  // 设置基本工作簿属性
  workbook.creator = 'LaserCut考勤系统';
  workbook.title = `${date}今日考勤详情`;
  workbook.created = new Date();
  workbook.modified = new Date();

  // 创建今日考勤工作表
  await createDailyAttendanceSheet(workbook, employees, attendanceExceptions, date);

  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const fileName = `今日考勤_${date}_${timestamp}.xlsx`;
  
  // 下载文件
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 导出简化的月度考勤报表到Excel
 * 包含2个工作表：月度汇总、请假详情
 */
export const exportMonthlyAttendanceReport = async (data: ExportData): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  
  // 设置基本工作簿属性
  workbook.creator = 'LaserCut考勤系统';
  workbook.title = `${data.year}年${data.month}月考勤报表`;
  workbook.created = new Date();
  workbook.modified = new Date();

  // 创建简化的工作表
  await createSimpleMonthlySummarySheet(workbook, data);   // 月度汇总
  await createSimpleLeaveRecordsSheet(workbook, data);     // 请假详情

  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const fileName = `考勤报表_${data.year}年${String(data.month).padStart(2, '0')}月_${timestamp}.xlsx`;
  
  // 下载文件
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 创建今日考勤工作表
 */
const createDailyAttendanceSheet = async (
  workbook: ExcelJS.Workbook,
  employees: Employee[],
  attendanceExceptions: AttendanceException[],
  date: string
): Promise<void> => {
  const worksheet = workbook.addWorksheet('今日考勤');
  
  // 创建美化标题
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${ICONS.calendar} ${date} 今日考勤详情`;
  titleCell.font = { 
    name: 'Microsoft YaHei', 
    size: 18,  // 更大字体
    bold: true, 
    color: { argb: 'FFFFFF' }  // 白色字体
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.primary }
  };
  titleCell.border = {
    top: { style: 'thick', color: { argb: COLORS.primary } },
    bottom: { style: 'thick', color: { argb: COLORS.primary } },
    left: { style: 'thick', color: { argb: COLORS.primary } },
    right: { style: 'thick', color: { argb: COLORS.primary } }
  };
  
  try {
    worksheet.mergeCells('A1:H1');
  } catch (error) {
    console.warn('标题行合并失败');
  }
  
  // 生成时间
  const timeCell = worksheet.getCell('A2');
  timeCell.value = `生成时间: ${new Date().toLocaleString('zh-CN')}`;
  timeCell.font = { size: 10, color: { argb: COLORS.gray500 } };
  timeCell.alignment = { horizontal: 'center' };
  
  try {
    worksheet.mergeCells('A2:H2');
  } catch (error) {
    console.warn('生成时间行合并失败');
  }
  
  worksheet.getRow(1).height = 35;
  worksheet.getRow(2).height = 20;
  worksheet.getRow(3).height = 10;

  // 设置表头
  const headers = ['员工姓名', '工号', '部门', '职位', '出勤状态', '异常类型', '异常原因', '备注'];
  const headerRow = worksheet.addRow(headers);
  
  // 美化表头
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.font = { 
      bold: true, 
      size: 12, 
      color: { argb: 'FFFFFF' },  // 白色字体
      name: 'Microsoft YaHei'
    };
    cell.fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: COLORS.primary }  // 蓝色背景
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.primary } },
      bottom: { style: 'medium', color: { argb: COLORS.primary } },
      left: { style: 'thin', color: { argb: 'FFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFF' } }
    };
  });
  
  headerRow.height = 30;

  // 设置列宽
  worksheet.columns = [
    { width: 12 }, // 员工姓名
    { width: 10 }, // 工号
    { width: 15 }, // 部门
    { width: 12 }, // 职位
    { width: 12 }, // 出勤状态
    { width: 12 }, // 异常类型
    { width: 25 }, // 异常原因
    { width: 15 }  // 备注
  ];

  // 创建员工考勤映射
  const exceptionMap = new Map();
  attendanceExceptions
    .filter(exc => exc.date === date)
    .forEach(exc => exceptionMap.set(exc.employeeId, exc));

  // 添加员工数据
  employees.forEach((employee, index) => {
    const exception = exceptionMap.get(employee.employeeId);
    
    const row = worksheet.addRow([
      employee.name,
      employee.employeeId,
      employee.department,
      employee.position || '-',
      exception ? '异常' : '正常',
      exception ? getExceptionTypeLabel(exception.exceptionType) : '-',
      exception ? (exception.leaveReason || exception.overtimeReason || exception.absentReason || exception.earlyLeaveReason || exception.lateArrivalReason || '-') : '-',
      exception ? getLeaveTypeLabel(exception.leaveType) : '-'
    ]);

    // 应用行样式
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 根据状态着色（更鲜明的颜色）
    const statusCell = row.getCell(5);
    if (exception) {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warning } };
      statusCell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 11 };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.success } };
      statusCell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 11 };
    }
    
    // 异常原因列左对齐
    row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };
    
    // 隔行变色
    if (index % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray50 } };
    }
  });

  // 添加统计信息
  const totalEmployees = employees.length;
  const totalExceptions = attendanceExceptions.filter(exc => exc.date === date).length;
  const attendanceRate = totalEmployees > 0 ? ((totalEmployees - totalExceptions) / totalEmployees * 100).toFixed(1) : '0';

  const summaryRow = worksheet.addRow([
    '合计统计', '', '', '', 
    `出勤率: ${attendanceRate}%`, 
    `异常: ${totalExceptions}人`, 
    `总计: ${totalEmployees}人`, 
    ''
  ]);

  summaryRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
  summaryRow.fill = { 
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.primaryLight }
  };
  summaryRow.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryRow.border = {
    top: { style: 'medium', color: { argb: COLORS.primary } },
    bottom: { style: 'medium', color: { argb: COLORS.primary } }
  };
};

/**
 * 创建简化的月度汇总表
 */
const createSimpleMonthlySummarySheet = async (workbook: ExcelJS.Workbook, data: ExportData): Promise<void> => {
  const { monthlyStats, year, month } = data;
  const worksheet = workbook.addWorksheet('月度汇总');
  
  // 创建美化标题
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${ICONS.chart} ${year}年${month}月员工考勤汇总`;
  titleCell.font = { 
    name: 'Microsoft YaHei', 
    size: 18,  // 更大字体
    bold: true, 
    color: { argb: 'FFFFFF' }  // 白色字体
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.primary }
  };
  titleCell.border = {
    top: { style: 'thick', color: { argb: COLORS.primary } },
    bottom: { style: 'thick', color: { argb: COLORS.primary } },
    left: { style: 'thick', color: { argb: COLORS.primary } },
    right: { style: 'thick', color: { argb: COLORS.primary } }
  };
  
  try {
    worksheet.mergeCells('A1:K1');
  } catch (error) {
    console.warn('标题行合并失败');
  }
  
  // 生成时间
  const timeCell = worksheet.getCell('A2');
  timeCell.value = `生成时间: ${new Date().toLocaleString('zh-CN')}`;
  timeCell.font = { size: 10, color: { argb: COLORS.gray500 } };
  timeCell.alignment = { horizontal: 'center' };
  
  try {
    worksheet.mergeCells('A2:K2');
  } catch (error) {
    console.warn('生成时间行合并失败');
  }
  
  worksheet.getRow(1).height = 35;
  worksheet.getRow(2).height = 20;
  worksheet.getRow(3).height = 10;

  // 设置表头
  const headers = [
    '员工姓名', '工号', '部门', '职位', '出勤天数', 
    '实际工时', '请假时长', '加班时长', '出勤率', '绩效等级', '备注'
  ];
  const headerRow = worksheet.addRow(headers);
  
  // 美化表头
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.font = { 
      bold: true, 
      size: 12, 
      color: { argb: 'FFFFFF' },  // 白色字体
      name: 'Microsoft YaHei'
    };
    cell.fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: COLORS.primary }  // 蓝色背景
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.primary } },
      bottom: { style: 'medium', color: { argb: COLORS.primary } },
      left: { style: 'thin', color: { argb: 'FFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFF' } }
    };
  });
  
  headerRow.height = 30;

  // 设置列宽
  worksheet.columns = [
    { width: 12 }, // 员工姓名
    { width: 10 }, // 工号
    { width: 15 }, // 部门
    { width: 12 }, // 职位
    { width: 10 }, // 出勤天数
    { width: 10 }, // 实际工时
    { width: 10 }, // 请假时长
    { width: 10 }, // 加班时长
    { width: 10 }, // 出勤率
    { width: 10 }, // 绩效等级
    { width: 15 }  // 备注
  ];

  // 添加数据行
  monthlyStats.forEach((stat, index) => {
    const performanceGrade = calculatePerformanceGrade(stat);
    
    const row = worksheet.addRow([
      stat.employee.name,
      stat.employee.employeeId,
      stat.employee.department,
      stat.employee.position,
      stat.workDays,
      Math.round(stat.totalWorkHours * 10) / 10,
      Math.round(stat.totalLeaveHours * 10) / 10,
      Math.round(stat.totalOvertimeHours * 10) / 10,
      `${Math.round(stat.attendanceRate * 10) / 10}%`,
      performanceGrade.label,
      generateEmployeeNotes(stat)
    ]);

    // 应用样式
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 出勤率着色（更鲜明的效果）
    const rateCell = row.getCell(9);
    if (stat.attendanceRate >= 98) {
      rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.success } };
      rateCell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 11 };
    } else if (stat.attendanceRate >= 90) {
      rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.info } };
      rateCell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 11 };
    } else {
      rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.danger } };
      rateCell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 11 };
    }
    
    // 绩效等级着色（加背景色）
    const gradeCell = row.getCell(10);
    gradeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: performanceGrade.color } };
    gradeCell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 11 };
    
    // 备注列左对齐
    row.getCell(11).alignment = { horizontal: 'left', vertical: 'middle' };
    
    // 隔行变色
    if (index % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray50 } };
    }
  });

  // 添加汇总行
  const avgAttendanceRate = monthlyStats.length > 0 ? 
    monthlyStats.reduce((sum, stat) => sum + stat.attendanceRate, 0) / monthlyStats.length : 0;

  const summaryRow = worksheet.addRow([
    '合计/平均', '', '', '',
    Math.round(monthlyStats.reduce((sum, stat) => sum + stat.workDays, 0)),
    Math.round(monthlyStats.reduce((sum, stat) => sum + stat.totalWorkHours, 0) * 10) / 10,
    Math.round(monthlyStats.reduce((sum, stat) => sum + stat.totalLeaveHours, 0) * 10) / 10,
    Math.round(monthlyStats.reduce((sum, stat) => sum + stat.totalOvertimeHours, 0) * 10) / 10,
    `${Math.round(avgAttendanceRate * 10) / 10}%`,
    '',
    `共${monthlyStats.length}人`
  ]);

  summaryRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
  summaryRow.fill = { 
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.primaryLight }
  };
  summaryRow.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryRow.border = {
    top: { style: 'medium', color: { argb: COLORS.primary } },
    bottom: { style: 'medium', color: { argb: COLORS.primary } }
  };
};

/**
 * 创建简化的请假记录表
 */
const createSimpleLeaveRecordsSheet = async (workbook: ExcelJS.Workbook, data: ExportData): Promise<void> => {
  const { attendanceExceptions, employees } = data;
  const worksheet = workbook.addWorksheet('请假详情');
  
  // 创建美化标题
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${ICONS.time} 请假记录详细清单`;
  titleCell.font = { 
    name: 'Microsoft YaHei', 
    size: 18,  // 更大字体
    bold: true, 
    color: { argb: 'FFFFFF' }  // 白色字体
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.warning }
  };
  titleCell.border = {
    top: { style: 'thick', color: { argb: COLORS.warning } },
    bottom: { style: 'thick', color: { argb: COLORS.warning } },
    left: { style: 'thick', color: { argb: COLORS.warning } },
    right: { style: 'thick', color: { argb: COLORS.warning } }
  };
  
  try {
    worksheet.mergeCells('A1:I1');
  } catch (error) {
    console.warn('标题行合并失败');
  }
  
  // 生成时间
  const timeCell = worksheet.getCell('A2');
  timeCell.value = `生成时间: ${new Date().toLocaleString('zh-CN')}`;
  timeCell.font = { size: 10, color: { argb: COLORS.gray500 } };
  timeCell.alignment = { horizontal: 'center' };
  
  try {
    worksheet.mergeCells('A2:I2');
  } catch (error) {
    console.warn('生成时间行合并失败');
  }
  
  worksheet.getRow(1).height = 35;
  worksheet.getRow(2).height = 20;
  worksheet.getRow(3).height = 10;

  // 设置表头
  const headers = ['日期', '员工姓名', '部门', '异常类型', '请假类型', '请假时长', '加班时长', '申请原因', '状态'];
  const headerRow = worksheet.addRow(headers);
  
  // 美化表头
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.font = { 
      bold: true, 
      size: 12, 
      color: { argb: 'FFFFFF' },  // 白色字体
      name: 'Microsoft YaHei'
    };
    cell.fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: COLORS.primary }  // 蓝色背景
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.primary } },
      bottom: { style: 'medium', color: { argb: COLORS.primary } },
      left: { style: 'thin', color: { argb: 'FFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFF' } }
    };
  });
  
  headerRow.height = 30;

  // 设置列宽
  worksheet.columns = [
    { width: 12 }, // 日期
    { width: 12 }, // 员工姓名
    { width: 15 }, // 部门
    { width: 12 }, // 异常类型
    { width: 12 }, // 请假类型
    { width: 10 }, // 请假时长
    { width: 10 }, // 加班时长
    { width: 25 }, // 申请原因
    { width: 10 }  // 状态
  ];

  // 添加请假记录数据
  attendanceExceptions.forEach((exception, index) => {
    // 根据employeeId查找员工信息
    const employee = employees.find(emp => emp.id === exception.employeeId);
    
    const row = worksheet.addRow([
      new Date(exception.date).toLocaleDateString('zh-CN'),
      employee?.name || '未知员工',
      employee?.department || '未知部门',
      getExceptionTypeLabel(exception.exceptionType),
      getLeaveTypeLabel(exception.leaveType),
      exception.leaveHours || 0,
      (exception.overtimeMinutes || 0) / 60, // 转换分钟为小时
      exception.leaveReason || exception.overtimeReason || exception.absentReason || exception.earlyLeaveReason || exception.lateArrivalReason || '-',
      '已审批'
    ]);

    // 应用行样式
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 隔行变色
    if (index % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray50 } };
    }
    
    // 原因列左对齐
    row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // 添加统计汇总
  const totalLeaveHours = attendanceExceptions.reduce((sum, exc) => sum + (exc.leaveHours || 0), 0);
  const totalOvertimeHours = attendanceExceptions.reduce((sum, exc) => sum + ((exc.overtimeMinutes || 0) / 60), 0);

  const summaryRow = worksheet.addRow([
    '合计统计', '', '', '',
    `共${attendanceExceptions.length}条记录`,
    Math.round(totalLeaveHours * 10) / 10,
    Math.round(totalOvertimeHours * 10) / 10,
    '',
    ''
  ]);

  summaryRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
  summaryRow.fill = { 
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.warning }
  };
  summaryRow.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryRow.border = {
    top: { style: 'medium', color: { argb: COLORS.warning } },
    bottom: { style: 'medium', color: { argb: COLORS.warning } }
  };
};

// ====== 辅助函数 ======

/**
 * 计算绩效等级
 */
const calculatePerformanceGrade = (stat: MonthlyAttendanceStats) => {
  const rate = stat.attendanceRate;
  if (rate >= 98) return { label: 'A 优秀', color: COLORS.success };
  if (rate >= 90) return { label: 'B 良好', color: COLORS.info };
  if (rate >= 80) return { label: 'C 一般', color: COLORS.warning };
  return { label: 'D 待改进', color: COLORS.danger };
};

/**
 * 生成员工备注
 */
const generateEmployeeNotes = (stat: MonthlyAttendanceStats): string => {
  const notes = [];
  if (stat.attendanceRate >= 100) notes.push('满勤');
  if (stat.totalOvertimeHours > 20) notes.push('加班较多');
  if (stat.totalLeaveHours > 16) notes.push('请假较多');
  return notes.join(', ') || '-';
};

/**
 * 获取异常类型标签
 */
const getExceptionTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'leave': '请假',
    'overtime': '加班',
    'absent': '缺勤',
    'late': '迟到',
    'early': '早退'
  };
  return typeMap[type] || type;
};

/**
 * 获取请假类型标签
 */
const getLeaveTypeLabel = (leaveType?: string): string => {
  if (!leaveType) return '-';
  const option = LEAVE_TYPE_OPTIONS.find(opt => opt.value === leaveType);
  return option ? option.label : leaveType;
};
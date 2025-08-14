// Excel导出功能辅助模块
// 提供考勤报表的Excel导出功能

import * as XLSX from 'xlsx';
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

interface ExcelStyleConfig {
  headerStyle: any;
  dataStyle: any;
  summaryStyle: any;
}

// Excel样式配置
const excelStyles: ExcelStyleConfig = {
  headerStyle: {
    font: { bold: true, sz: 12 },
    fill: { fgColor: { rgb: 'E3F2FD' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  },
  dataStyle: {
    font: { sz: 11 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  },
  summaryStyle: {
    font: { bold: true, sz: 11 },
    fill: { fgColor: { rgb: 'FFF3E0' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  }
};

/**
 * 导出月度考勤报表到Excel
 */
export const exportMonthlyAttendanceReport = (data: ExportData): void => {
  const workbook = XLSX.utils.book_new();
  
  // 创建月度汇总表
  const summarySheet = createMonthlySummarySheet(data);
  XLSX.utils.book_append_sheet(workbook, summarySheet, '月度汇总');
  
  // 创建详细统计表
  const detailSheet = createDetailedStatsSheet(data);
  XLSX.utils.book_append_sheet(workbook, detailSheet, '详细统计');
  
  // 创建请假记录表
  const leaveSheet = createLeaveRecordsSheet(data);
  XLSX.utils.book_append_sheet(workbook, leaveSheet, '请假记录');
  
  // 创建部门汇总表
  const departmentSheet = createDepartmentSummarySheet(data);
  XLSX.utils.book_append_sheet(workbook, departmentSheet, '部门汇总');
  
  // 生成文件名
  const fileName = `考勤报表_${data.year}年${data.month}月_${new Date().toLocaleDateString().replace(/\//g, '')}.xlsx`;
  
  // 下载文件
  XLSX.writeFile(workbook, fileName);
};

/**
 * 创建月度汇总表
 */
const createMonthlySummarySheet = (data: ExportData): XLSX.WorkSheet => {
  const { monthlyStats, year, month } = data;
  
  // 表头信息
  const header = [
    [`${year}年${month}月考勤汇总报表`],
    [`生成时间: ${new Date().toLocaleString()}`],
    [],
    [
      '员工姓名', '工号', '部门', '职位', 
      '出勤天数', '标准工时', '实际工时', '请假时长', '加班时长',
      '病假(小时)', '事假(小时)', '年假(小时)', '调休(小时)', 
      '出勤率(%)', '备注'
    ]
  ];
  
  // 数据行
  const dataRows = monthlyStats.map(stat => [
    stat.employee.name,
    stat.employee.employeeId,
    stat.employee.department,
    stat.employee.position,
    stat.workDays,
    (stat.employee.dailyWorkHours || 8) * getWorkDaysInMonth(year, month),
    Math.round(stat.totalWorkHours * 10) / 10,
    Math.round(stat.totalLeaveHours * 10) / 10,
    Math.round(stat.totalOvertimeHours * 10) / 10,
    Math.round(stat.leaveBreakdown.sick * 10) / 10,
    Math.round(stat.leaveBreakdown.personal * 10) / 10,
    Math.round(stat.leaveBreakdown.annual * 10) / 10,
    Math.round(stat.leaveBreakdown.compensatory * 10) / 10,
    Math.round(stat.attendanceRate * 10) / 10,
    ''
  ]);
  
  // 汇总行
  const totalWorkHours = monthlyStats.reduce((sum, stat) => sum + stat.totalWorkHours, 0);
  const totalLeaveHours = monthlyStats.reduce((sum, stat) => sum + stat.totalLeaveHours, 0);
  const totalOvertimeHours = monthlyStats.reduce((sum, stat) => sum + stat.totalOvertimeHours, 0);
  const avgAttendanceRate = monthlyStats.length > 0 ? 
    monthlyStats.reduce((sum, stat) => sum + stat.attendanceRate, 0) / monthlyStats.length : 0;
  
  const summaryRow = [
    '合计/平均', '', '', '',
    Math.round(monthlyStats.reduce((sum, stat) => sum + stat.workDays, 0)),
    '',
    Math.round(totalWorkHours * 10) / 10,
    Math.round(totalLeaveHours * 10) / 10,
    Math.round(totalOvertimeHours * 10) / 10,
    Math.round(monthlyStats.reduce((sum, stat) => sum + stat.leaveBreakdown.sick, 0) * 10) / 10,
    Math.round(monthlyStats.reduce((sum, stat) => sum + stat.leaveBreakdown.personal, 0) * 10) / 10,
    Math.round(monthlyStats.reduce((sum, stat) => sum + stat.leaveBreakdown.annual, 0) * 10) / 10,
    Math.round(monthlyStats.reduce((sum, stat) => sum + stat.leaveBreakdown.compensatory, 0) * 10) / 10,
    Math.round(avgAttendanceRate * 10) / 10,
    `共${monthlyStats.length}人`
  ];
  
  // 合并所有数据
  const allData = [...header, ...dataRows, [], summaryRow];
  
  // 创建工作表
  const worksheet = XLSX.utils.aoa_to_sheet(allData);
  
  // 设置列宽
  worksheet['!cols'] = [
    { width: 12 }, // 员工姓名
    { width: 12 }, // 工号
    { width: 12 }, // 部门
    { width: 12 }, // 职位
    { width: 10 }, // 出勤天数
    { width: 10 }, // 标准工时
    { width: 10 }, // 实际工时
    { width: 10 }, // 请假时长
    { width: 10 }, // 加班时长
    { width: 10 }, // 病假
    { width: 10 }, // 事假
    { width: 10 }, // 年假
    { width: 10 }, // 调休
    { width: 10 }, // 出勤率
    { width: 15 }  // 备注
  ];
  
  // 合并标题单元格
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }, // 标题行
    { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }  // 生成时间行
  ];
  
  return worksheet;
};

/**
 * 创建详细统计表
 */
const createDetailedStatsSheet = (data: ExportData): XLSX.WorkSheet => {
  const { monthlyStats, year, month } = data;
  
  // 按部门分组的详细统计
  const departmentGroups = new Map<string, MonthlyAttendanceStats[]>();
  monthlyStats.forEach(stat => {
    const dept = stat.employee.department || '未分配';
    if (!departmentGroups.has(dept)) {
      departmentGroups.set(dept, []);
    }
    departmentGroups.get(dept)!.push(stat);
  });
  
  const allData: any[][] = [
    [`${year}年${month}月详细统计报表`],
    [`生成时间: ${new Date().toLocaleString()}`],
    []
  ];
  
  // 为每个部门创建详细统计
  Array.from(departmentGroups.entries()).forEach(([department, stats]) => {
    // 部门标题
    allData.push([`${department} (共${stats.length}人)`]);
    
    // 部门表头
    allData.push([
      '员工姓名', '工号', '入职日期', '日标准工时',
      '出勤天数', '实际工时', '请假详情', '加班时长', '出勤率(%)'
    ]);
    
    // 部门数据
    stats.forEach(stat => {
      const leaveDetails = [
        stat.leaveBreakdown.sick > 0 ? `病假${stat.leaveBreakdown.sick}h` : '',
        stat.leaveBreakdown.personal > 0 ? `事假${stat.leaveBreakdown.personal}h` : '',
        stat.leaveBreakdown.annual > 0 ? `年假${stat.leaveBreakdown.annual}h` : '',
        stat.leaveBreakdown.compensatory > 0 ? `调休${stat.leaveBreakdown.compensatory}h` : ''
      ].filter(Boolean).join(', ') || '无请假';
      
      allData.push([
        stat.employee.name,
        stat.employee.employeeId,
        stat.employee.hireDate.split('T')[0],
        stat.employee.dailyWorkHours,
        stat.workDays,
        Math.round(stat.totalWorkHours * 10) / 10,
        leaveDetails,
        Math.round(stat.totalOvertimeHours * 10) / 10,
        Math.round(stat.attendanceRate * 10) / 10
      ]);
    });
    
    // 部门汇总
    const deptTotalWorkHours = stats.reduce((sum, stat) => sum + stat.totalWorkHours, 0);
    const deptTotalLeaveHours = stats.reduce((sum, stat) => sum + stat.totalLeaveHours, 0);
    const deptAvgAttendanceRate = stats.reduce((sum, stat) => sum + stat.attendanceRate, 0) / stats.length;
    
    allData.push([
      '部门小计', '', '', '',
      stats.reduce((sum, stat) => sum + stat.workDays, 0),
      Math.round(deptTotalWorkHours * 10) / 10,
      `总请假${Math.round(deptTotalLeaveHours * 10) / 10}h`,
      Math.round(stats.reduce((sum, stat) => sum + stat.totalOvertimeHours, 0) * 10) / 10,
      Math.round(deptAvgAttendanceRate * 10) / 10
    ]);
    
    allData.push([]); // 空行分隔
  });
  
  // 创建工作表
  const worksheet = XLSX.utils.aoa_to_sheet(allData);
  
  // 设置列宽
  worksheet['!cols'] = [
    { width: 12 }, // 员工姓名
    { width: 12 }, // 工号
    { width: 12 }, // 入职日期
    { width: 10 }, // 日标准工时
    { width: 10 }, // 出勤天数
    { width: 10 }, // 实际工时
    { width: 25 }, // 请假详情
    { width: 10 }, // 加班时长
    { width: 10 }  // 出勤率
  ];
  
  return worksheet;
};

/**
 * 创建请假记录表
 */
const createLeaveRecordsSheet = (data: ExportData): XLSX.WorkSheet => {
  const { attendanceExceptions, employees, year, month } = data;
  
  // 筛选请假记录
  const leaveRecords = attendanceExceptions.filter(exc => 
    exc.exceptionType === 'leave' &&
    new Date(exc.date).getFullYear() === year &&
    new Date(exc.date).getMonth() + 1 === month
  );
  
  const header = [
    [`${year}年${month}月请假记录明细`],
    [`生成时间: ${new Date().toLocaleString()}`],
    [],
    [
      '请假日期', '员工姓名', '工号', '部门', 
      '请假类型', '请假时长', '开始时间', '结束时间',
      '请假原因', '备注'
    ]
  ];
  
  // 请假记录数据
  const leaveData = leaveRecords.map(record => {
    const employee = employees.find(emp => emp.id === record.employeeId);
    const leaveTypeLabel = LEAVE_TYPE_OPTIONS.find(opt => opt.value === record.leaveType)?.label || record.leaveType;
    
    let durationText = '';
    switch (record.leaveDurationType) {
      case 'full_day':
        durationText = '全天';
        break;
      case 'half_day':
        durationText = '半天';
        break;
      case 'hours':
        durationText = `${record.leaveHours}小时`;
        break;
    }
    
    return [
      new Date(record.date).toLocaleDateString(),
      employee?.name || '',
      employee?.employeeId || '',
      employee?.department || '',
      leaveTypeLabel,
      durationText,
      record.leaveStartTime || '',
      record.leaveEndTime || '',
      record.leaveReason || '',
      record.notes || ''
    ];
  });
  
  // 按类型统计
  const leaveStats = LEAVE_TYPE_OPTIONS.map(type => {
    const typeRecords = leaveRecords.filter(record => record.leaveType === type.value);
    const totalHours = typeRecords.reduce((sum, record) => sum + (record.leaveHours || 0), 0);
    return [type.label, typeRecords.length, Math.round(totalHours * 10) / 10];
  });
  
  const allData = [
    ...header,
    ...leaveData,
    [],
    ['请假类型统计'],
    ['类型', '次数', '总时长(小时)'],
    ...leaveStats,
    [],
    ['总计', leaveRecords.length, Math.round(leaveRecords.reduce((sum, record) => sum + (record.leaveHours || 0), 0) * 10) / 10]
  ];
  
  // 创建工作表
  const worksheet = XLSX.utils.aoa_to_sheet(allData);
  
  // 设置列宽
  worksheet['!cols'] = [
    { width: 12 }, // 请假日期
    { width: 12 }, // 员工姓名
    { width: 12 }, // 工号
    { width: 12 }, // 部门
    { width: 10 }, // 请假类型
    { width: 12 }, // 请假时长
    { width: 10 }, // 开始时间
    { width: 10 }, // 结束时间
    { width: 20 }, // 请假原因
    { width: 15 }  // 备注
  ];
  
  return worksheet;
};

/**
 * 创建部门汇总表
 */
const createDepartmentSummarySheet = (data: ExportData): XLSX.WorkSheet => {
  const { monthlyStats, year, month } = data;
  
  // 按部门分组统计
  const departmentStats = new Map<string, {
    employeeCount: number;
    totalWorkHours: number;
    totalLeaveHours: number;
    totalOvertimeHours: number;
    avgAttendanceRate: number;
  }>();
  
  monthlyStats.forEach(stat => {
    const dept = stat.employee.department || '未分配';
    if (!departmentStats.has(dept)) {
      departmentStats.set(dept, {
        employeeCount: 0,
        totalWorkHours: 0,
        totalLeaveHours: 0,
        totalOvertimeHours: 0,
        avgAttendanceRate: 0
      });
    }
    
    const deptStat = departmentStats.get(dept)!;
    deptStat.employeeCount++;
    deptStat.totalWorkHours += stat.totalWorkHours;
    deptStat.totalLeaveHours += stat.totalLeaveHours;
    deptStat.totalOvertimeHours += stat.totalOvertimeHours;
  });
  
  // 计算平均出勤率
  departmentStats.forEach((stat, dept) => {
    const deptEmployees = monthlyStats.filter(s => s.employee.department === dept);
    stat.avgAttendanceRate = deptEmployees.reduce((sum, emp) => sum + emp.attendanceRate, 0) / deptEmployees.length;
  });
  
  const header = [
    [`${year}年${month}月部门汇总报表`],
    [`生成时间: ${new Date().toLocaleString()}`],
    [],
    [
      '部门名称', '员工人数', '总工作时长', '人均工时', 
      '总请假时长', '人均请假', '总加班时长', '人均加班', 
      '平均出勤率(%)', '出勤状况'
    ]
  ];
  
  // 部门数据
  const departmentData = Array.from(departmentStats.entries())
    .sort((a, b) => b[1].avgAttendanceRate - a[1].avgAttendanceRate)
    .map(([dept, stat]) => [
      dept,
      stat.employeeCount,
      Math.round(stat.totalWorkHours * 10) / 10,
      Math.round((stat.totalWorkHours / stat.employeeCount) * 10) / 10,
      Math.round(stat.totalLeaveHours * 10) / 10,
      Math.round((stat.totalLeaveHours / stat.employeeCount) * 10) / 10,
      Math.round(stat.totalOvertimeHours * 10) / 10,
      Math.round((stat.totalOvertimeHours / stat.employeeCount) * 10) / 10,
      Math.round(stat.avgAttendanceRate * 10) / 10,
      stat.avgAttendanceRate >= 95 ? '优秀' :
      stat.avgAttendanceRate >= 85 ? '良好' : '需改善'
    ]);
  
  // 合计行
  const totalEmployees = monthlyStats.length;
  const totalWorkHours = monthlyStats.reduce((sum, stat) => sum + stat.totalWorkHours, 0);
  const totalLeaveHours = monthlyStats.reduce((sum, stat) => sum + stat.totalLeaveHours, 0);
  const totalOvertimeHours = monthlyStats.reduce((sum, stat) => sum + stat.totalOvertimeHours, 0);
  const overallAvgAttendanceRate = monthlyStats.reduce((sum, stat) => sum + stat.attendanceRate, 0) / totalEmployees;
  
  const summaryRow = [
    '全公司',
    totalEmployees,
    Math.round(totalWorkHours * 10) / 10,
    Math.round((totalWorkHours / totalEmployees) * 10) / 10,
    Math.round(totalLeaveHours * 10) / 10,
    Math.round((totalLeaveHours / totalEmployees) * 10) / 10,
    Math.round(totalOvertimeHours * 10) / 10,
    Math.round((totalOvertimeHours / totalEmployees) * 10) / 10,
    Math.round(overallAvgAttendanceRate * 10) / 10,
    overallAvgAttendanceRate >= 95 ? '优秀' :
    overallAvgAttendanceRate >= 85 ? '良好' : '需改善'
  ];
  
  const allData = [...header, ...departmentData, [], summaryRow];
  
  // 创建工作表
  const worksheet = XLSX.utils.aoa_to_sheet(allData);
  
  // 设置列宽
  worksheet['!cols'] = [
    { width: 15 }, // 部门名称
    { width: 10 }, // 员工人数
    { width: 12 }, // 总工作时长
    { width: 10 }, // 人均工时
    { width: 12 }, // 总请假时长
    { width: 10 }, // 人均请假
    { width: 12 }, // 总加班时长
    { width: 10 }, // 人均加班
    { width: 12 }, // 平均出勤率
    { width: 10 }  // 出勤状况
  ];
  
  return worksheet;
};

/**
 * 获取指定月份的工作日数
 */
const getWorkDaysInMonth = (year: number, month: number): number => {
  const date = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  let workDays = 0;
  
  for (let day = 1; day <= lastDay; day++) {
    date.setDate(day);
    const dayOfWeek = date.getDay();
    // 排除周六(6)和周日(0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
  }
  
  return workDays;
};

/**
 * 导出简化版CSV格式
 */
export const exportAttendanceCSV = (data: ExportData): void => {
  const { monthlyStats, year, month } = data;
  
  // CSV表头
  const headers = [
    '员工姓名', '工号', '部门', '职位',
    '出勤天数', '实际工时', '请假时长', '加班时长', '出勤率(%)'
  ];
  
  // CSV数据
  const csvData = [
    headers,
    ...monthlyStats.map(stat => [
      stat.employee.name,
      stat.employee.employeeId,
      stat.employee.department,
      stat.employee.position,
      stat.workDays.toString(),
      Math.round(stat.totalWorkHours * 10) / 10,
      Math.round(stat.totalLeaveHours * 10) / 10,
      Math.round(stat.totalOvertimeHours * 10) / 10,
      Math.round(stat.attendanceRate * 10) / 10
    ])
  ];
  
  // 转换为CSV格式
  const csvContent = csvData.map(row => row.join(',')).join('\\n');
  
  // 添加BOM以支持中文
  const BOM = '\\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // 下载文件
  const fileName = `考勤报表_${year}年${month}月_${new Date().toLocaleDateString().replace(/\//g, '')}.csv`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
};
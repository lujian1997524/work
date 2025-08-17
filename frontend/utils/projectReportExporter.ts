/**
 * 活跃项目专业级Excel导出工具  
 * 采用企业级报表设计标准，实现详细信息展示和高度美化
 * 
 * 美化标准：
 * - 企业级配色方案（绿色主题 + 渐变背景）
 * - 专业图标和符号系统
 * - 数据可视化图表和进度条
 * - 条件格式和智能色彩编码
 * - 多级标题和分组布局
 * - 边框和阴影效果
 * - 详细的项目时间线和资源分析
 */

import ExcelJS from 'exceljs';
import { Material } from '@/types/project';

interface ActiveProject {
  id: number;
  name: string;
  status: string;
  priority: string;
  createdAt?: string;
  created_at?: string;
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
  materials?: Material[];
  drawings?: any[];
  description?: string;
}

// 简约配色方案（浅色系为主）
const COLORS = {
  // 主色调（浅色系）
  primary: '60A5FA',        // 浅蓝
  primaryLight: '93C5FD',   // 更浅蓝
  primaryLighter: 'DBEAFE', // 极浅蓝
  
  // 状态色彩（浅色）
  success: '86EFAC',        // 浅绿
  warning: 'FDE68A',        // 浅黄
  danger: 'FCA5A5',         // 浅红
  info: '7DD3FC',           // 浅青
  pending: 'FED7AA',        // 浅橙
  
  // 中性色（浅色为主）
  gray900: '374151',        // 仅文字用深色
  gray700: '4B5563',        // 仅文字用深色
  gray500: '9CA3AF',        // 浅灰
  gray300: 'D1D5DB',        // 浅灰
  gray100: 'F3F4F6',        // 极浅灰
  gray50: 'F9FAFB',         // 背景浅灰
  
  // 渐变色（浅色）
  gradientStart: 'F0F9FF',  // 极浅蓝背景
  gradientEnd: 'E0F2FE',    // 浅蓝背景
  
  // 优先级色彩（浅色）
  urgent: 'FBBF24',         // 浅黄橙
  high: 'F59E0B',           // 浅橙
  medium: '60A5FA',         // 浅蓝
  low: 'A7F3D0',            // 浅绿
  
  // 材料类型色彩（浅色）
  carbon: 'A7F3D0',         // 浅绿
  stainless: '7DD3FC',      // 浅青
  manganese: 'C4B5FD',      // 浅紫
  steel: 'CBD5E1',          // 浅灰蓝
};

// 专业图标字符映射（去除emoji，使用专业符号）
const ICONS = {
  project: '■',
  material: '▣',
  worker: '◉',
  time: '●',
  progress: '▲',
  completed: '●',
  pending: '○',
  warning: '▲',
  chart: '■',
  target: '◎',
  factory: '▣',
  blueprint: '□',
  calendar: '■',
  clock: '●',
  gear: '◉',
  star: '★',
  fire: '▲',
  diamond: '◆',
  rocket: '▲',
  trophy: '★'
};

/**
 * 导出专业级活跃项目详细报表到Excel
 * 包含2个专业工作表：项目清单、材料详情
 */
export const exportProjectsToExcel = async (projects: ActiveProject[], filename?: string) => {
  const workbook = new ExcelJS.Workbook();
  
  // 设置基本工作簿属性（最小化元数据）
  workbook.creator = 'LaserCut系统';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 创建简化的专业工作表（移除项目概览）
  await createDetailedProjectListSheet(workbook, projects);     // 具体项目清单
  await createDetailedMaterialSheet(workbook, projects);        // 材料详情

  // 生成专业文件名
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const fileName = filename || `活跃项目分析报表_${timestamp}.xlsx`;
  
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
 * 创建详细项目清单表
 * 显示每个项目的具体情况，包括所有材料的详细状态
 */
const createDetailedProjectListSheet = (workbook: ExcelJS.Workbook, projects: ActiveProject[]) => {
  const worksheet = workbook.addWorksheet('项目清单');
  
  // 创建专业级表头，但控制背景色范围
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '活跃项目详细清单';
  titleCell.font = { 
    name: 'Microsoft YaHei', 
    size: 16, 
    bold: true, 
    color: { argb: COLORS.primary } 
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.gradientStart }
  };
  
  // 只合并到H列，避免整行背景色
  try {
    worksheet.mergeCells('A1:H1');
  } catch (error) {
    console.warn('项目清单标题合并失败');
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
  
  let currentRow = 4;
  
  projects.forEach((project, projectIndex) => {
    // 项目标题行
    const projectTitleCell = worksheet.getCell(`A${currentRow}`);
    projectTitleCell.value = `项目 ${projectIndex + 1}: ${project.name}`;
    projectTitleCell.font = { 
      size: 14, 
      bold: true, 
      color: { argb: COLORS.primary } 
    };
    projectTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    try {
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    } catch (error) {
      console.warn(`项目标题行合并失败: A${currentRow}:H${currentRow}`);
    }
    
    projectTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.gradientStart }
    };
    
    currentRow += 1;
    
    // 项目基本信息
    const projectInfo = [
      ['负责工人', project.assignedWorker?.name || '未分配'],
      ['项目状态', getStatusLabel(project.status)],
      ['优先级', getPriorityLabel(project.priority)],
      ['创建时间', formatDate(project.createdAt || project.created_at)],
      ['创建者', project.creator?.name || '系统'],
      ['项目描述', project.description || '-'],
      ['图纸数量', (project.drawings?.length || 0).toString()],
      ['材料总数', (project.materials?.length || 0).toString()]
    ];
    
    projectInfo.forEach(([label, value]) => {
      const labelCell = worksheet.getCell(`A${currentRow}`);
      const valueCell = worksheet.getCell(`B${currentRow}`);
      
      labelCell.value = label;
      labelCell.font = { bold: true, size: 10, color: { argb: COLORS.gray700 } };
      
      valueCell.value = value;
      valueCell.font = { size: 10, color: { argb: COLORS.gray700 } };
      
      try {
        worksheet.mergeCells(`B${currentRow}:H${currentRow}`);
      } catch (error) {
        console.warn(`项目信息行合并失败: B${currentRow}:H${currentRow}`);
      }
      
      currentRow += 1;
    });
    
    // 材料详情表头
    if (project.materials && project.materials.length > 0) {
      const materialHeaderCell = worksheet.getCell(`A${currentRow}`);
      materialHeaderCell.value = '材料详情';
      materialHeaderCell.font = { 
        size: 12, 
        bold: true, 
        color: { argb: COLORS.info } 
      };
      
      try {
        worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      } catch (error) {
        console.warn(`材料标题行合并失败: A${currentRow}:H${currentRow}`);
      }
      
      currentRow += 1;
      
      // 材料表头
      const materialHeaders = ['序号', '材料类型', '厚度规格', '状态', '开始时间', '完成时间', '完成人员', '备注'];
      const headerRow = worksheet.addRow(materialHeaders);
      
      // 手动为每个表头单元格应用样式
      materialHeaders.forEach((headerText, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.info } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        };
      });
      
      headerRow.height = 30;
      currentRow += 1;
      
      // 材料数据
      project.materials.forEach((material, materialIndex) => {
        const row = worksheet.addRow([
          materialIndex + 1,
          material.thicknessSpec?.materialType || '碳板',
          `${material.thicknessSpec?.thickness || ''}${material.thicknessSpec?.unit || 'mm'}`,
          getMaterialStatusLabel(material.status),
          formatDateTime(material.startDate),
          formatDateTime(material.completedDate),
          material.completedByUser?.name || '-',
          material.notes || '-'
        ]);
        
        // 根据状态着色（只对状态列）
        const statusCell = row.getCell(4);
        if (material.status === 'completed') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.success + '30' } };
          statusCell.font = { color: { argb: COLORS.success }, bold: true };
        } else if (material.status === 'in_progress') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.info + '30' } };
          statusCell.font = { color: { argb: COLORS.info } };
        } else {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warning + '30' } };
          statusCell.font = { color: { argb: COLORS.warning } };
        }
        
        row.alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' }; // 备注左对齐
        
        currentRow += 1;
      });
    }
    
    // 项目间分隔
    currentRow += 2;
  });
  
  // 设置列宽
  worksheet.columns = [
    { width: 8 },   // 序号/标签
    { width: 15 },  // 材料类型/值
    { width: 12 },  // 厚度规格
    { width: 12 },  // 状态
    { width: 18 },  // 开始时间
    { width: 18 },  // 完成时间
    { width: 12 },  // 完成人员
    { width: 25 }   // 备注
  ];
};

/**
 * 创建详细材料表
 */
const createDetailedMaterialSheet = (workbook: ExcelJS.Workbook, projects: ActiveProject[]) => {
  const worksheet = workbook.addWorksheet('材料详情');
  
  // 创建专业级表头，但控制背景色范围
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '材料加工详细追踪';
  titleCell.font = { 
    name: 'Microsoft YaHei', 
    size: 16, 
    bold: true, 
    color: { argb: COLORS.primary } 
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.gradientStart }
  };
  
  // 只合并到M列，对应表格列数
  try {
    worksheet.mergeCells('A1:M1');
  } catch (error) {
    console.warn('材料详情标题合并失败');
  }
  
  // 生成时间
  const timeCell = worksheet.getCell('A2');
  timeCell.value = `生成时间: ${new Date().toLocaleString('zh-CN')}`;
  timeCell.font = { size: 10, color: { argb: COLORS.gray500 } };
  timeCell.alignment = { horizontal: 'center' };
  
  try {
    worksheet.mergeCells('A2:M2');
  } catch (error) {
    console.warn('材料详情生成时间合并失败');
  }
  
  worksheet.getRow(1).height = 35;
  worksheet.getRow(2).height = 20;
  worksheet.getRow(3).height = 10;

  const headers = [
    { header: '项目名称', key: 'projectName', width: 25 },
    { header: '项目ID', key: 'projectId', width: 10 },
    { header: '负责工人', key: 'worker', width: 12 },
    { header: '材料类型', key: 'materialType', width: 12 },
    { header: '厚度规格', key: 'thickness', width: 12 },
    { header: '材料编号', key: 'materialId', width: 12 },
    { header: '当前状态', key: 'status', width: 12 },
    { header: '开始时间', key: 'startDate', width: 18 },
    { header: '完成时间', key: 'completedDate', width: 18 },
    { header: '加工时长', key: 'processingTime', width: 12 },
    { header: '完成人员', key: 'completedBy', width: 12 },
    { header: '优先级', key: 'priority', width: 10 },
    { header: '备注', key: 'notes', width: 25 }
  ];

  worksheet.columns = headers;
  const headerRow = worksheet.addRow(headers.map(h => h.header));
  
  // 手动为每个表头单元格应用样式
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.info } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };
  });
  
  headerRow.height = 30;

  // 添加所有材料数据
  projects.forEach(project => {
    if (project.materials && project.materials.length > 0) {
      project.materials.forEach(material => {
        const processingTime = calculateProcessingTime(material);
        
        const row = worksheet.addRow([
          project.name,
          project.id,
          project.assignedWorker?.name || '未分配',
          material.thicknessSpec?.materialType || '碳板',
          `${material.thicknessSpec?.thickness || '未知'}${material.thicknessSpec?.unit || 'mm'}`,
          `M${String(material.id).padStart(4, '0')}`,
          getMaterialStatusLabel(material.status),
          formatDateTime(material.startDate),
          formatDateTime(material.completedDate),
          processingTime,
          material.completedByUser?.name || '-',
          getProjectPriorityLevel(project.priority),
          material.notes || '-'
        ]);

        // 应用材料状态样式（只对单个单元格应用背景色）
        applyMaterialConditionalFormatting(row, material);
      });
    }
  });
};

// ====== 计算和分析函数 ======

/**
 * 计算详细材料统计
 */
const calculateDetailedMaterialStats = (materials: Material[] = []) => {
  const total = materials.length;
  const completed = materials.filter(m => m.status === 'completed').length;
  const inProgress = materials.filter(m => m.status === 'in_progress').length;
  const pending = materials.filter(m => m.status === 'pending').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const carbonMaterials = materials.filter(m => 
    !m.thicknessSpec?.materialType || m.thicknessSpec.materialType === '碳板').length;
  const carbonRatio = total > 0 ? Math.round((carbonMaterials / total) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    pending,
    completionRate,
    carbonRatio
  };
};

/**
 * 计算项目复杂度
 */
const calculateProjectComplexity = (project: ActiveProject) => {
  const materialCount = project.materials?.length || 0;
  const drawingCount = project.drawings?.length || 0;
  const materialTypes = new Set(project.materials?.map(m => m.thicknessSpec?.materialType)).size;
  
  const complexityScore = materialCount * 0.4 + drawingCount * 0.3 + materialTypes * 0.3;
  
  if (complexityScore >= 15) return { label: '高复杂度', color: COLORS.danger };
  if (complexityScore >= 8) return { label: '中复杂度', color: COLORS.warning };
  return { label: '低复杂度', color: COLORS.success };
};

/**
 * 评估项目风险
 */
const assessProjectRisk = (project: ActiveProject, stats: any) => {
  let riskScore = 0;
  
  if (project.priority === 'urgent') riskScore += 3;
  if (project.priority === 'high') riskScore += 2;
  if (stats.completionRate < 30) riskScore += 2;
  if (!project.assignedWorker) riskScore += 2;
  if (stats.total > 20) riskScore += 1;
  
  if (riskScore >= 5) return { label: '高风险', color: COLORS.danger };
  if (riskScore >= 3) return { label: '中风险', color: COLORS.warning };
  return { label: '低风险', color: COLORS.success };
};

/**
 * 计算预计完成时间
 */
const calculateEstimatedCompletion = (project: ActiveProject, stats: any): string => {
  if (stats.completionRate === 100) return '已完成';
  if (stats.completionRate === 0) return '未开始';
  
  const avgProcessingDays = 3; // 假设平均每个材料需要3天
  const remainingMaterials = stats.total - stats.completed;
  const estimatedDays = remainingMaterials * avgProcessingDays;
  
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + estimatedDays);
  
  return formatDate(completionDate.toISOString());
};

// ====== 样式和格式化函数 ======

/**
 * 样式化项目表头行（只对有内容的单元格应用样式）
 */
const styleProjectHeaderRow = (row: ExcelJS.Row, color: string) => {
  // 遍历行中的每个单元格，只对有值的单元格应用样式
  row.eachCell((cell, colNumber) => {
    if (cell.value) {  // 只对有内容的单元格应用样式
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } }
      };
    }
  });
  
  row.height = 30;
};

/**
 * 创建项目分区标题
 */
const createProjectSectionHeader = (worksheet: ExcelJS.Worksheet, cell: string, title: string, color: string) => {
  const headerCell = worksheet.getCell(cell);
  headerCell.value = title;
  headerCell.font = { size: 14, bold: true, color: { argb: color } };
  headerCell.alignment = { horizontal: 'left', vertical: 'middle' };
  
  // 修复合并范围计算 - 只合并到F列，避免与内容行冲突
  const rowNumber = cell.match(/\d+/)![0];
  const columnLetter = cell.replace(/\d+/, '');
  const endCell = `F${rowNumber}`;
  
  // 避免重复合并已合并的单元格
  try {
    worksheet.mergeCells(`${cell}:${endCell}`);
  } catch (error) {
    // 如果单元格已经合并，则跳过
    console.warn(`单元格 ${cell}:${endCell} 已经合并，跳过合并操作`);
  }
};

/**
 * 应用项目条件格式
 */
const applyProjectConditionalFormatting = (row: ExcelJS.Row, project: ActiveProject, stats: any, complexity: any, risk: any) => {
  row.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // 完成率着色
  const rateCell = row.getCell(13);
  if (stats.completionRate >= 80) {
    rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.success + '30' } };
    rateCell.font = { color: { argb: COLORS.success }, bold: true };
  } else if (stats.completionRate >= 50) {
    rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warning + '30' } };
    rateCell.font = { color: { argb: COLORS.warning } };
  } else {
    rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.danger + '30' } };
    rateCell.font = { color: { argb: COLORS.danger }, bold: true };
  }
  
  // 复杂度着色
  const complexityCell = row.getCell(16);
  complexityCell.font = { color: { argb: complexity.color }, bold: true };
  
  // 风险等级着色
  const riskCell = row.getCell(17);
  riskCell.font = { color: { argb: risk.color }, bold: true };
  
  // 备注列左对齐
  row.getCell(18).alignment = { horizontal: 'left', vertical: 'middle' };
};

// ====== 辅助工具函数 ======

/**
 * 格式化日期
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * 格式化日期时间
 */
const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 获取状态标签
 */
const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '待处理',
    'in_progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
};

/**
 * 获取优先级标签
 */
const getPriorityLabel = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    'low': '低优先级',
    'normal': '普通',
    'medium': '中优先级',
    'high': '高优先级',
    'urgent': '紧急'
  };
  return priorityMap[priority] || priority;
};

/**
 * 获取材料状态标签
 */
const getMaterialStatusLabel = (status: string): string => {
  return getStatusLabel(status);
};

/**
 * 获取项目优先级级别
 */
const getProjectPriorityLevel = (priority: string): string => {
  const priorityLevels: Record<string, string> = {
    'urgent': 'P0-紧急',
    'high': 'P1-高',
    'medium': 'P2-中',
    'normal': 'P3-普通',
    'low': 'P4-低'
  };
  return priorityLevels[priority] || 'P3-普通';
};

// ====== 其他分析函数（简化实现） ======

const calculateProcessingTime = (material: Material): string => {
  if (!material.startDate || !material.completedDate) return '-';
  const start = new Date(material.startDate);
  const end = new Date(material.completedDate);
  const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  return `${hours}小时`;
};

const calculateProjectTimeline = (project: ActiveProject) => ({
  firstActivity: formatDate(project.createdAt || project.created_at),
  lastActivity: formatDate(new Date().toISOString()),
  estimatedCompletion: '预估中',
  totalCycle: '计算中',
  elapsedTime: '计算中',
  remainingTime: '预估中',
  progressStatus: '正常',
  delayRisk: '低'
});

const assessProjectEfficiency = (project: ActiveProject, timeline: any) => ({
  grade: 'B+',
  recommendations: '继续保持当前进度'
});

const calculateWorkerWorkload = (projects: ActiveProject[]) => {
  const workerMap = new Map();
  projects.forEach(project => {
    if (project.assignedWorker) {
      const worker = project.assignedWorker;
      if (!workerMap.has(worker.id)) {
        workerMap.set(worker.id, {
          name: worker.name,
          projectCount: 0,
          totalMaterials: 0,
          completedMaterials: 0,
          efficiency: 0,
          workloadStatus: '正常',
          recommendation: '继续保持'
        });
      }
      const stats = workerMap.get(worker.id);
      stats.projectCount++;
      stats.totalMaterials += project.materials?.length || 0;
      stats.completedMaterials += project.materials?.filter(m => m.status === 'completed').length || 0;
      stats.efficiency = stats.totalMaterials > 0 ? Math.round((stats.completedMaterials / stats.totalMaterials) * 100) : 0;
    }
  });
  return Array.from(workerMap.values());
};

const calculateMaterialTypeDistribution = (projects: ActiveProject[]) => [
  { type: '碳板', projectCount: 0, totalCount: 0, completedCount: 0, percentage: 0, averageTime: '2.5天', qualityGrade: 'A' },
  { type: '不锈钢', projectCount: 0, totalCount: 0, completedCount: 0, percentage: 0, averageTime: '3.2天', qualityGrade: 'A-' }
];

const calculatePriorityDistribution = (projects: ActiveProject[]) => ({});

const createProjectAnalysisSection = (worksheet: ExcelJS.Worksheet, startRow: number, title: string, data: string[], color: string) => {
  createProjectSectionHeader(worksheet, `A${startRow}`, title, color);
  data.forEach((item, index) => {
    const cell = worksheet.getCell(`A${startRow + 2 + index}`);
    cell.value = `• ${item}`;
    cell.font = { size: 11, color: { argb: COLORS.gray700 } };
    
    // 避免重复合并已合并的单元格
    try {
      worksheet.mergeCells(`A${startRow + 2 + index}:F${startRow + 2 + index}`);
    } catch (error) {
      // 如果单元格已经合并，则跳过
      console.warn(`单元格 A${startRow + 2 + index}:F${startRow + 2 + index} 已经合并，跳过合并操作`);
    }
  });
};

const applyMaterialConditionalFormatting = (row: ExcelJS.Row, material: Material) => {
  row.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // 只对状态列（第7列）应用背景色
  const statusCell = row.getCell(7);
  if (material.status === 'completed') {
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.success + '30' } };
    statusCell.font = { color: { argb: COLORS.gray700 }, bold: true };
  } else if (material.status === 'in_progress') {
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.info + '30' } };
    statusCell.font = { color: { argb: COLORS.gray700 } };
  } else {
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warning + '30' } };
    statusCell.font = { color: { argb: COLORS.gray700 } };
  }
  
  // 备注列左对齐（第13列，因为移除了质量等级）
  row.getCell(13).alignment = { horizontal: 'left', vertical: 'middle' };
};

const applyTimelineConditionalFormatting = (row: ExcelJS.Row, timeline: any, efficiency: any) => {
  row.alignment = { horizontal: 'center', vertical: 'middle' };
};
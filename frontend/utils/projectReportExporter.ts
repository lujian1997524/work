/**
 * 项目Excel导出工具 - 企业级美化版
 */

import ExcelJS from 'exceljs';
import { Material } from '@/types/project';
import { apiRequest } from '@/utils/api';

interface ActiveProject {
  id: number;
  name: string;
  status: string;
  priority: string;
  createdAt?: string;
  created_at?: string;
  startDate?: string;
  endDate?: string;
  creator?: { id: number; name: string };
  assignedWorker?: { 
    id: number; 
    name: string; 
    departmentId?: number;
    departmentInfo?: { id: number; name: string };
    department?: string; // 向后兼容的备用字段
  };
  materials?: Material[];
  drawings?: any[];
  description?: string;
}

// 企业级配色方案
const COLORS = {
  primary: '2E86AB',        // 主要蓝色
  secondary: 'A23B72',      // 辅助紫色
  success: '4CAF50',        // 成功绿色
  warning: 'FF9800',        // 警告橙色
  danger: 'F44336',         // 危险红色
  header: '34495E',         // 深灰色表头
  subHeader: '5DADE2',      // 浅蓝色子标题
  border: '7F8C8D',         // 边框灰色
  background: 'ECF0F1',     // 背景浅灰
  text: '2C3E50'            // 文本深色
};

// 状态中文映射
const STATUS_MAP: { [key: string]: string } = {
  'pending': '待处理',
  'in_progress': '进行中',
  'completed': '已完成',
  'cancelled': '已取消',
  'paused': '已暂停'
};

// 优先级中文映射
const PRIORITY_MAP: { [key: string]: string } = {
  'low': '低',
  'medium': '中',
  'normal': '中',
  'high': '高',
  'urgent': '紧急'
};

// 材料状态中文映射
const MATERIAL_STATUS_MAP: { [key: string]: string } = {
  'empty': '空闲',
  'pending': '待处理',
  'in_progress': '处理中',
  'completed': '已完成'
};

// 高级表头样式
const applyHeaderStyle = (cell: any, text: string, bgColor: string = COLORS.header) => {
  cell.value = text;
  cell.font = { 
    bold: true, 
    color: { argb: 'FFFFFF' },
    size: 12
  };
  cell.fill = { 
    type: 'pattern', 
    pattern: 'solid', 
    fgColor: { argb: bgColor } 
  };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } }
  };
  cell.alignment = { 
    vertical: 'middle', 
    horizontal: 'center',
    wrapText: true
  };
};

// 高级单元格样式
const applyCellStyle = (cell: any, text: string | number, options: any = {}) => {
  cell.value = text;
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } }
  };
  cell.alignment = { 
    vertical: 'middle', 
    horizontal: options.align || 'left',
    wrapText: true
  };
  
  // 条件格式化
  if (options.bgColor) {
    cell.fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: options.bgColor } 
    };
  }
  
  if (options.fontColor) {
    cell.font = { color: { argb: options.fontColor } };
  }
  
  if (options.bold) {
    cell.font = { ...cell.font, bold: true };
  }
};

// 状态颜色映射
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return { bg: 'FFF3E0', text: COLORS.warning };
    case 'in_progress': return { bg: 'E3F2FD', text: COLORS.primary };
    case 'completed': return { bg: 'E8F5E8', text: COLORS.success };
    case 'cancelled': return { bg: 'FFEBEE', text: COLORS.danger };
    default: return { bg: 'F5F5F5', text: COLORS.text };
  }
};

// 优先级颜色映射
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return { bg: 'FFEBEE', text: COLORS.danger };
    case 'high': return { bg: 'FFF3E0', text: COLORS.warning };
    case 'medium': 
    case 'normal': return { bg: 'E8F5E8', text: COLORS.success };
    case 'low': return { bg: 'F5F5F5', text: COLORS.text };
    default: return { bg: 'F5F5F5', text: COLORS.text };
  }
};

/**
 * 导出活跃项目报表 - 企业级美化版
 */
export const exportActiveProjectsReport = async (projectsData?: ActiveProject[]): Promise<void> => {
  try {
    console.log('📊 导出函数开始执行...');
    
    let activeProjects: ActiveProject[] = [];
    
    if (projectsData && projectsData.length > 0) {
      console.log(`📊 使用传入的项目数据: ${projectsData.length} 个项目`);
      activeProjects = projectsData;
    } else {
      console.log('📊 没有传入项目数据，正在调用API获取...');
      const response: any = await apiRequest('/api/projects');
      const projects: ActiveProject[] = Array.isArray(response) ? response : response.projects || [];
      console.log(`📊 API返回项目数据: ${projects.length} 个项目`);
      
      activeProjects = projects.filter(p => 
        p.status === 'pending' || p.status === 'in_progress'
      );
      console.log(`📊 筛选出活跃项目: ${activeProjects.length} 个`);
    }
    
    if (activeProjects.length === 0) {
      console.log('📊 没有活跃项目可导出');
      throw new Error('没有活跃项目可导出');
    }
    
    console.log('📊 开始创建Excel工作簿...');
    const workbook = new ExcelJS.Workbook();
    
    // 设置工作簿属性
    workbook.creator = '激光切割生产管理系统';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.title = '活跃项目详细报表';

    // 工作表1: 项目总览
    const overviewSheet = workbook.addWorksheet('项目总览');
    overviewSheet.columns = [
      { header: '项目编号', key: 'id', width: 12 },
      { header: '项目名称', key: 'name', width: 25 },
      { header: '项目状态', key: 'status', width: 15 },
      { header: '优先级', key: 'priority', width: 12 },
      { header: '负责工人', key: 'worker', width: 15 },
      { header: '工人部门', key: 'department', width: 15 },
      { header: '创建者', key: 'creator', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 18 },
      { header: '开始日期', key: 'startDate', width: 15 },
      { header: '结束日期', key: 'endDate', width: 15 },
      { header: '材料数量', key: 'materialCount', width: 12 },
      { header: '图纸数量', key: 'drawingCount', width: 12 },
      { header: '项目描述', key: 'description', width: 35 }
    ];

    // 应用表头样式
    overviewSheet.getRow(1).eachCell((cell) => {
      applyHeaderStyle(cell, cell.value as string, COLORS.primary);
    });

    // 添加项目数据
    activeProjects.forEach((project, index) => {
      const rowIndex = index + 2;
      const row = overviewSheet.getRow(rowIndex);
      
      // 状态和优先级颜色
      const statusColor = getStatusColor(project.status);
      const priorityColor = getPriorityColor(project.priority);
      
      applyCellStyle(row.getCell(1), project.id, { align: 'center' });
      applyCellStyle(row.getCell(2), project.name, { bold: true });
      applyCellStyle(row.getCell(3), STATUS_MAP[project.status] || project.status, { 
        bgColor: statusColor.bg, 
        fontColor: statusColor.text,
        align: 'center'
      });
      applyCellStyle(row.getCell(4), PRIORITY_MAP[project.priority] || project.priority, { 
        bgColor: priorityColor.bg, 
        fontColor: priorityColor.text,
        align: 'center'
      });
      applyCellStyle(row.getCell(5), project.assignedWorker?.name || '未分配');
      applyCellStyle(row.getCell(6), 
        project.assignedWorker?.departmentInfo?.name || 
        project.assignedWorker?.department || 
        '未分配部门');  // 更准确的描述：未分配部门而不是未知部门
      applyCellStyle(row.getCell(7), project.creator?.name || '系统');
      applyCellStyle(row.getCell(8), project.createdAt ? 
        new Date(project.createdAt).toLocaleString('zh-CN') : 
        (project.created_at ? new Date(project.created_at).toLocaleString('zh-CN') : ''));
      applyCellStyle(row.getCell(9), project.startDate ? 
        new Date(project.startDate).toLocaleDateString('zh-CN') : '未设置');
      applyCellStyle(row.getCell(10), project.endDate ? 
        new Date(project.endDate).toLocaleDateString('zh-CN') : '未设置');
      applyCellStyle(row.getCell(11), project.materials?.length || 0, { align: 'center' });
      applyCellStyle(row.getCell(12), project.drawings?.length || 0, { align: 'center' });
      applyCellStyle(row.getCell(13), project.description || '无描述');
    });

    // 工作表2: 材料详细清单
    const materialsSheet = workbook.addWorksheet('材料详细清单');
    materialsSheet.columns = [
      { header: '项目编号', key: 'projectId', width: 12 },
      { header: '项目名称', key: 'projectName', width: 25 },
      { header: '材料编号', key: 'materialId', width: 12 },
      { header: '材料厚度', key: 'thickness', width: 15 },
      { header: '材料类型', key: 'materialType', width: 15 },
      { header: '材料状态', key: 'status', width: 15 },
      { header: '完成工人', key: 'completedBy', width: 15 },
      { header: '完成时间', key: 'completedDate', width: 18 },
      { header: '材料备注', key: 'notes', width: 25 }
    ];

    // 应用表头样式
    materialsSheet.getRow(1).eachCell((cell) => {
      applyHeaderStyle(cell, cell.value as string, COLORS.success);
    });

    // 添加材料数据
    let materialRowIndex = 2;
    activeProjects.forEach(project => {
      if (project.materials && project.materials.length > 0) {
        project.materials.forEach((material: any) => {
          const row = materialsSheet.getRow(materialRowIndex);
          const statusColor = getStatusColor(material.status);
          
          applyCellStyle(row.getCell(1), project.id, { align: 'center' });
          applyCellStyle(row.getCell(2), project.name);
          applyCellStyle(row.getCell(3), material.id, { align: 'center' });
          applyCellStyle(row.getCell(4), material.thicknessSpec ? 
            `${material.thicknessSpec.thickness}${material.thicknessSpec.unit}` : '未知厚度');
          applyCellStyle(row.getCell(5), material.thicknessSpec?.materialType || '未知类型');
          applyCellStyle(row.getCell(6), MATERIAL_STATUS_MAP[material.status] || material.status, {
            bgColor: statusColor.bg,
            fontColor: statusColor.text,
            align: 'center'
          });
          applyCellStyle(row.getCell(7), material.completedByWorker?.name || '未完成');
          applyCellStyle(row.getCell(8), material.completedDate ? 
            new Date(material.completedDate).toLocaleString('zh-CN') : '未完成');
          applyCellStyle(row.getCell(9), material.notes || '无备注');
          
          materialRowIndex++;
        });
      }
    });

    // 工作表3: 统计汇总
    const statsSheet = workbook.addWorksheet('统计汇总');
    
    // 计算统计数据
    const totalProjects = activeProjects.length;
    const pendingCount = activeProjects.filter(p => p.status === 'pending').length;
    const inProgressCount = activeProjects.filter(p => p.status === 'in_progress').length;
    const totalMaterials = activeProjects.reduce((sum, p) => sum + (p.materials?.length || 0), 0);
    const totalDrawings = activeProjects.reduce((sum, p) => sum + (p.drawings?.length || 0), 0);
    const urgentCount = activeProjects.filter(p => p.priority === 'urgent').length;
    const highCount = activeProjects.filter(p => p.priority === 'high').length;
    
    // 添加统计信息
    const statsData = [
      ['统计项目', '数量', '百分比'],
      ['总项目数', totalProjects, '100%'],
      ['待处理项目', pendingCount, `${((pendingCount/totalProjects)*100).toFixed(1)}%`],
      ['进行中项目', inProgressCount, `${((inProgressCount/totalProjects)*100).toFixed(1)}%`],
      ['总材料数量', totalMaterials, '-'],
      ['总图纸数量', totalDrawings, '-'],
      ['紧急项目数', urgentCount, `${((urgentCount/totalProjects)*100).toFixed(1)}%`],
      ['高优先级项目', highCount, `${((highCount/totalProjects)*100).toFixed(1)}%`]
    ];

    statsData.forEach((row, index) => {
      const excelRow = statsSheet.getRow(index + 1);
      row.forEach((cell, cellIndex) => {
        if (index === 0) {
          applyHeaderStyle(excelRow.getCell(cellIndex + 1), cell as string, COLORS.secondary);
        } else {
          applyCellStyle(excelRow.getCell(cellIndex + 1), cell, { 
            align: cellIndex > 0 ? 'center' : 'left',
            bold: cellIndex === 1
          });
        }
      });
    });

    // 设置列宽
    statsSheet.getColumn(1).width = 20;
    statsSheet.getColumn(2).width = 15;
    statsSheet.getColumn(3).width = 15;

    // 导出文件
    console.log('📊 开始生成Excel文件...');
    const buffer = await workbook.xlsx.writeBuffer();
    console.log(`📊 Excel缓冲区大小: ${buffer.byteLength} bytes`);
    
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    console.log(`📊 创建Blob, 大小: ${blob.size} bytes`);
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `活跃项目详细报表-${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    link.href = url;
    link.download = filename;
    
    console.log(`📊 准备下载文件: ${filename}`);
    link.click();
    window.URL.revokeObjectURL(url);
    console.log('📊 Excel文件下载完成');
    
  } catch (error) {
    console.error('📊 导出项目报表失败:', error);
    throw new Error('导出失败，请重试');
  }
};
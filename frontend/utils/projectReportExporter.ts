/**
 * 项目Excel导出工具 - 简洁实用版
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
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
  materials?: Material[];
  drawings?: any[];
  description?: string;
}

// 简洁配色
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
 * 导出活跃项目报表 - 简化版
 */
export const exportActiveProjectsReport = async (): Promise<void> => {
  try {
    // 使用 apiRequest 调用远程API
    const response: any = await apiRequest('/api/projects');
    const projects: ActiveProject[] = Array.isArray(response) ? response : response.projects || [];
    
    // 筛选活跃项目
    const activeProjects = projects.filter(p => 
      p.status === 'pending' || p.status === 'in_progress'
    );
    
    const workbook = new ExcelJS.Workbook();
    
    // 工作表1: 项目概览
    const overviewSheet = workbook.addWorksheet('项目概览');
    overviewSheet.columns = [
      { header: '项目ID', key: 'id', width: 10 },
      { header: '项目名称', key: 'name', width: 20 },
      { header: '状态', key: 'status', width: 15 },
      { header: '优先级', key: 'priority', width: 15 },
      { header: '负责人', key: 'assignedWorker', width: 15 },
      { header: '创建者', key: 'creator', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 18 },
      { header: '描述', key: 'description', width: 30 }
    ];

    // 应用表头样式
    overviewSheet.getRow(1).eachCell((cell) => {
      applyHeaderStyle(cell, cell.value as string);
    });

    // 添加项目数据
    activeProjects.forEach((project, index) => {
      const rowIndex = index + 2;
      const row = overviewSheet.getRow(rowIndex);
      
      applyCellStyle(row.getCell(1), project.id);
      applyCellStyle(row.getCell(2), project.name);
      applyCellStyle(row.getCell(3), project.status);
      applyCellStyle(row.getCell(4), project.priority);
      applyCellStyle(row.getCell(5), project.assignedWorker?.name || '未分配');
      applyCellStyle(row.getCell(6), project.creator?.name || '');
      applyCellStyle(row.getCell(7), project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 
                    (project.created_at ? new Date(project.created_at).toLocaleDateString() : ''));
      applyCellStyle(row.getCell(8), project.description || '');
    });

    // 工作表2: 材料详情
    const materialsSheet = workbook.addWorksheet('材料详情');
    materialsSheet.columns = [
      { header: '项目ID', key: 'projectId', width: 10 },
      { header: '项目名称', key: 'projectName', width: 20 },
      { header: '材料ID', key: 'materialId', width: 10 },
      { header: '厚度规格', key: 'thickness', width: 15 },
      { header: '状态', key: 'status', width: 15 },
      { header: '完成人', key: 'completedBy', width: 15 },
      { header: '完成时间', key: 'completedDate', width: 18 }
    ];

    // 应用表头样式
    materialsSheet.getRow(1).eachCell((cell) => {
      applyHeaderStyle(cell, cell.value as string);
    });

    // 添加材料数据
    let materialRowIndex = 2;
    activeProjects.forEach((project) => {
      if (project.materials && project.materials.length > 0) {
        project.materials.forEach((material) => {
          const row = materialsSheet.getRow(materialRowIndex);
          
          applyCellStyle(row.getCell(1), project.id);
          applyCellStyle(row.getCell(2), project.name);
          applyCellStyle(row.getCell(3), material.id);
          applyCellStyle(row.getCell(4), `${material.thicknessSpec?.thickness || ''}${material.thicknessSpec?.unit || ''}`);
          applyCellStyle(row.getCell(5), material.status);
          applyCellStyle(row.getCell(6), material.completedBy || '');
          applyCellStyle(row.getCell(7), material.completedDate ? new Date(material.completedDate).toLocaleDateString() : '');
          
          materialRowIndex++;
        });
      }
    });

    // 导出文件
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `活跃项目报表-${new Date().toLocaleDateString()}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('导出项目报表失败:', error);
    throw new Error('导出失败，请重试');
  }
};
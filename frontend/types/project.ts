// 项目相关类型定义 - 统一所有Project接口
// 确保前端组件之间类型一致性

export interface ThicknessSpec {
  id: number;
  thickness: string;
  unit: string;
  materialType: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Material {
  id: number;
  projectId: number;
  thicknessSpecId: number;
  status: 'pending' | 'in_progress' | 'completed';
  startDate?: string;
  completedDate?: string;
  completedBy?: number;
  notes?: string;
  thicknessSpec: ThicknessSpec;
  completedByUser?: { id: number; name: string };
}

export interface Drawing {
  id: number;
  projectId: number;
  filename: string;
  originalFilename?: string;
  version: number;
  filePath: string;
  uploadedAt: string;
  uploadedBy: { id: number; name: string };
  isCurrentVersion?: boolean;
}

// 统一的Project接口 - 基础版本
export interface BaseProject {
  id: number;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  assignedWorkerId?: number;
}

// 扩展版本 - 包含关联数据
export interface Project extends BaseProject {
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
  materials: Material[];
  drawings: Drawing[];
  // 过往项目相关字段
  isPastProject?: boolean;
  movedToPastAt?: string;
  movedToPastBy?: number;
}

// 简化版本 - 用于列表显示
export interface ProjectSummary extends BaseProject {
  assignedWorker?: { id: number; name: string };
  materialCount?: number;
  drawingCount?: number;
}

// 项目卡片数据类型 - 兼容现有组件
export interface ProjectCardData extends Project {
  // 兼容字段
  created_at?: string; // 兼容某些组件使用的字段名
}

// 表单数据类型
export interface ProjectFormData {
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedWorkerId: number | null;
  requiredThickness?: number[];
}

// 操作历史接口
export interface OperationHistory {
  id: number;
  operationType: string;
  operationDescription: string;
  created_at: string;
  operator: { id: number; name: string };
  details?: Record<string, any>;
}

// 导出所有类型
export type {
  ThicknessSpec,
  Material,
  Drawing,
  BaseProject,
  Project,
  ProjectSummary,
  ProjectCardData,
  ProjectFormData,
  OperationHistory
};
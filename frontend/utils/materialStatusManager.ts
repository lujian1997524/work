// 材料状态管理共享逻辑
// 提供项目间一致的材料状态更新功能

import type { StatusType } from '@/components/ui';
import type { Project, Material, ThicknessSpec } from '@/types/project';
import { notificationManager } from './notificationManager';
import { materialToastHelper } from './materialToastHelper';
import { apiRequest } from '@/utils/api';
import { sseManager } from '@/utils/sseManager';

// 获取认证token的辅助函数
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

/**
 * 材料状态计算规则
 * 简化的状态决策逻辑
 */
export class MaterialStatusCalculator {
  /**
   * 计算项目状态基于材料状态
   * 状态规则：
   * - pending: 所有板材都是 pending 状态
   * - in_progress: 任意一个板材是 in_progress 状态，或者有混合状态
   * - completed: 所有板材都是 completed 状态
   */
  static calculateProjectStatus(materialStatuses: StatusType[]): string {
    if (materialStatuses.length === 0) return 'pending';
    
    const hasInProgress = materialStatuses.includes('in_progress');
    const hasPending = materialStatuses.includes('pending');  
    const hasCompleted = materialStatuses.includes('completed');
    
    // 项目状态计算规则：
    // 1. 任意板材为进行中 → 项目进行中
    // 2. 混合状态（部分完成+部分待处理）→ 项目进行中
    // 3. 所有板材已完成 → 项目已完成
    // 4. 所有板材待处理 → 项目待处理
    
    if (hasInProgress) return 'in_progress';
    if (hasPending && hasCompleted) return 'in_progress';
    if (hasCompleted && !hasPending && !hasInProgress) return 'completed';
    return 'pending';
  }
  
  /**
   * 获取项目当前的材料状态列表
   */
  static getProjectMaterialStatuses(
    project: Project,
    thicknessSpecs: ThicknessSpec[],
    changedSpecId?: number,
    newStatus?: StatusType,
    isDelete?: boolean
  ): StatusType[] {
    const statuses: StatusType[] = [];
    
    // 只处理项目实际拥有的材料
    if (!project.materials) return statuses;
    
    project.materials.forEach(material => {
      if (material.thicknessSpecId === changedSpecId) {
        // 正在变更的材料
        if (isDelete) return; // 删除操作不计入
        if (newStatus) statuses.push(newStatus);
      } else {
        // 其他材料，使用现有状态
        statuses.push(material.status);
      }
    });
    
    return statuses;
  }
}

/**
 * 材料状态更新器
 * 处理材料状态的CRUD操作
 */
export class MaterialStatusUpdater {
  /**
   * 更新项目状态（基于材料状态变化）
   */
  static async updateProjectStatus(
    projects: Project[],
    updateProjectFn: (id: number, updates: { status: string }, options?: { silent?: boolean }) => Promise<any>,
    thicknessSpecs: ThicknessSpec[],
    projectId: number,
    changedSpecId?: number,
    newStatus?: StatusType,
    isDelete?: boolean
  ): Promise<void> {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const materialStatuses = MaterialStatusCalculator.getProjectMaterialStatuses(
      project, thicknessSpecs, changedSpecId, newStatus, isDelete
    );
    
    const newProjectStatus = MaterialStatusCalculator.calculateProjectStatus(materialStatuses);
    
    // 只在项目状态实际变化时才播放音效和发送通知
    if (project.status !== newProjectStatus) {
      try {
        await updateProjectFn(projectId, { status: newProjectStatus }, { silent: true });
        
        // 发送通知
        await notificationManager.showProjectStatusNotification(
          project.name,
          project.status,
          newProjectStatus,
          project.assignedWorker?.name
        );
        
        // 注意：图纸归档逻辑已移除
        // 图纸只在项目进入过往项目时才归档，不在项目完成时归档
        
      } catch (error) {
      }
    }
  }
}

/**
 * 材料状态更新 - 主要接口
 * 简化的统一更新接口
 */
export const updateMaterialStatusShared = async (
  projectId: number,
  thicknessSpecId: number,
  newStatus: StatusType,
  options: {
    projects: Project[];
    thicknessSpecs: ThicknessSpec[];
    user: { id: number; name: string } | null;
    updateProjectFn: (id: number, updates: { status: string }, options?: { silent?: boolean }) => Promise<any>;
    fetchProjectsFn: () => Promise<void>;
    setLoadingFn?: (loading: boolean) => void;
  }
): Promise<boolean> => {
  const { projects, thicknessSpecs, user, updateProjectFn, setLoadingFn } = options;
  
  try {
    setLoadingFn?.(true);
    
    const token = getAuthToken();
    if (!token) throw new Error('未找到认证令牌');
    
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('项目不存在');
    
    const existingMaterial = project.materials?.find(m => m.thicknessSpecId === thicknessSpecId);
    const thicknessSpec = thicknessSpecs.find(s => s.id === thicknessSpecId);
    
    // 获取材料信息用于Toast显示
    const materialTypeText = thicknessSpec 
      ? `${thicknessSpec.thickness}mm${thicknessSpec.materialType}` 
      : `厚度规格${thicknessSpecId}`;
    const workerName = user?.name || project.assignedWorker?.name || '未知工人';
    const projectName = project.name;
    
    // 获取之前的状态（如果存在）
    const previousStatus = existingMaterial?.status;
    
    // 更新或创建材料记录
    const success = existingMaterial 
      ? await updateExistingMaterial(existingMaterial.id, newStatus, token)
      : await createNewMaterial(projectId, thicknessSpecId, newStatus, token);
    
    if (!success) return false;
    
    // 标记本地操作，避免SSE重复通知
    if (existingMaterial) {
      sseManager.markLocalOperation('material-status-changed', existingMaterial.id);
    }
    
    // 根据状态变更触发相应的Toast通知
    triggerMaterialStatusToast(previousStatus, newStatus, {
      materialType: materialTypeText,
      workerName,
      projectName,
      isNewMaterial: !existingMaterial
    });
    
    // 更新项目状态
    await MaterialStatusUpdater.updateProjectStatus(
      projects, updateProjectFn, thicknessSpecs, projectId, thicknessSpecId, newStatus
    );
    
    // 发送同步事件
    window.dispatchEvent(new CustomEvent('material-status-updated', { 
      detail: { 
        projectId, 
        thicknessSpecId, 
        newStatus,
        previousStatus,
        timestamp: Date.now(),
        action: existingMaterial ? 'update' : 'create'
      } 
    }));
    
    return true;
    
  } catch (error) {
    // 通过Toast显示错误信息
    materialToastHelper.error('更新材料状态失败: ' + (error instanceof Error ? error.message : '未知错误'));
    
    // 保留原有的事件通知机制作为备份
    window.dispatchEvent(new CustomEvent('material-status-error', { 
      detail: { 
        message: '更新材料状态失败: ' + (error instanceof Error ? error.message : '未知错误'),
        projectId, 
        thicknessSpecId 
      } 
    }));
    return false;
  } finally {
    setLoadingFn?.(false);
  }
};

/**
 * 更新现有材料记录
 */
async function updateExistingMaterial(materialId: number, newStatus: StatusType, token: string): Promise<boolean> {
  const updateData: any = { status: newStatus };
  
  if (newStatus === 'in_progress') {
    updateData.startDate = new Date().toISOString().split('T')[0];
  } else if (newStatus === 'completed') {
    updateData.completedDate = new Date().toISOString().split('T')[0];
  }
  
  const response = await apiRequest(`/api/materials/${materialId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '更新材料失败');
  }
  
  return true;
}

/**
 * 创建新材料记录
 */
async function createNewMaterial(projectId: number, thicknessSpecId: number, status: StatusType, token: string): Promise<boolean> {
  const createData: any = {
    projectId,
    thicknessSpecId,
    status
  };
  
  if (status === 'in_progress') {
    createData.startDate = new Date().toISOString().split('T')[0];
  } else if (status === 'completed') {
    createData.completedDate = new Date().toISOString().split('T')[0];
  }
  
  const response = await apiRequest('/api/materials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(createData),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '创建材料失败');
  }
  
  return true;
}

/**
 * 获取项目材料状态
 */
export const getProjectMaterialStatus = (projects: Project[], projectId: number, thicknessSpecId: number): StatusType | null => {
  const project = projects.find(p => p.id === projectId);
  const material = project?.materials?.find(m => m.thicknessSpecId === thicknessSpecId);
  return material?.status || null;
};

/**
 * 根据材料状态变更触发相应的Toast通知
 * 处理四状态循环：empty → pending → in_progress → completed → empty
 */
const triggerMaterialStatusToast = (
  previousStatus: StatusType | undefined,
  newStatus: StatusType,
  context: {
    materialType: string;
    workerName: string;
    projectName: string;
    isNewMaterial: boolean;
  }
) => {
  const { materialType, workerName, projectName, isNewMaterial } = context;
  
  // 如果是新创建的材料，根据初始状态触发相应通知
  if (isNewMaterial) {
    switch (newStatus) {
      case 'pending':
        // 新材料直接分配到项目（empty → pending）
        materialToastHelper.materialAllocated(materialType, projectName, 1);
        break;
      case 'in_progress':
        // 新材料直接开始加工
        materialToastHelper.materialStarted(materialType, workerName);
        break;
      case 'completed':
        // 新材料直接完成（少见情况）
        materialToastHelper.materialCompleted(materialType, workerName);
        break;
    }
    return;
  }
  
  // 处理状态转换Toast通知
  switch (newStatus) {
    case 'pending':
      if (previousStatus === 'completed') {
        // completed → pending: 材料被回收后重新分配
        materialToastHelper.materialAllocated(materialType, projectName, 1);
      } else if ((previousStatus as string) === 'empty' || !previousStatus) {
        // empty → pending: 材料分配给项目
        materialToastHelper.materialAllocated(materialType, projectName, 1);
      }
      break;
      
    case 'in_progress':
      if (previousStatus === 'pending') {
        // pending → in_progress: 开始加工材料
        materialToastHelper.materialStarted(materialType, workerName);
      }
      break;
      
    case 'completed':
      if (previousStatus === 'in_progress') {
        // in_progress → completed: 完成材料加工
        materialToastHelper.materialCompleted(materialType, workerName);
      }
      break;
      
    default: // 处理 'empty' 状态
      if (previousStatus === 'completed') {
        // completed → empty: 材料回收循环
        materialToastHelper.materialRecycled(materialType);
      }
      break;
  }
};

/**
 * 获取项目材料信息
 */
export const getProjectMaterial = (projects: Project[], projectId: number, thicknessSpecId: number): Material | null => {
  const project = projects.find(p => p.id === projectId);
  return project?.materials?.find(m => m.thicknessSpecId === thicknessSpecId) || null;
};
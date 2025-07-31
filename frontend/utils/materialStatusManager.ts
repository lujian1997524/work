// 材料状态管理共享逻辑
// 提供项目间一致的材料状态更新功能

import type { StatusType } from '@/components/ui';
import { notificationManager } from './notificationManager';
import { apiRequest } from '@/utils/api';

// 获取认证token的辅助函数
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

interface ThicknessSpec {
  id: number;
  thickness: string;
  unit: string;
  materialType: string;
  isActive: boolean;
  sortOrder: number;
}

interface Material {
  id: number;
  projectId: number;
  thicknessSpecId: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedBy?: { id: number; name: string };
  startDate?: string;
  completedDate?: string;
  notes?: string;
  thicknessSpec: ThicknessSpec;
}

interface Project {
  id: number;
  name: string;
  status: string;
  priority: string;
  createdAt: string;
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
  materials: Material[];
}

/**
 * 计算项目应该的状态（基于当前已知的状态变更）
 */
export const calculateProjectStatusRealtime = (
  projects: Project[], 
  thicknessSpecs: ThicknessSpec[], 
  projectId: number, 
  changedThicknessSpecId?: number, 
  newMaterialStatus?: StatusType
): string => {
  const currentProject = projects.find(p => p.id === projectId);
  
  // 获取所有厚度规格的状态（包括即将变更的状态）
  const allThicknessStatuses: string[] = [];
  
  thicknessSpecs.forEach(spec => {
    if (spec.id === changedThicknessSpecId) {
      // 这是正在变更的厚度规格，使用新状态
      if (newMaterialStatus === 'empty') {
        allThicknessStatuses.push('empty');
      } else {
        allThicknessStatuses.push(newMaterialStatus || 'empty');
      }
    } else {
      // 其他厚度规格，查找现有材料记录
      const material = currentProject?.materials?.find(m => m.thicknessSpecId === spec.id);
      if (material) {
        allThicknessStatuses.push(material.status);
      } else {
        allThicknessStatuses.push('empty');
      }
    }
  });

  // 检查各种状态是否存在
  const hasEmpty = allThicknessStatuses.some(status => status === 'empty');
  const hasPending = allThicknessStatuses.some(status => status === 'pending');
  const hasInProgress = allThicknessStatuses.some(status => status === 'in_progress');
  const hasCompleted = allThicknessStatuses.some(status => status === 'completed');

  // 调试信息
  console.log(`项目 ${projectId} 实时状态分析:`, {
    allThicknessStatuses,
    hasEmpty,
    hasPending,
    hasInProgress,
    hasCompleted,
    changedSpec: changedThicknessSpecId,
    newStatus: newMaterialStatus
  });

  // 规则1: 有任何一个进行中状态时，项目为进行中状态
  if (hasInProgress) {
    console.log(`项目 ${projectId} -> in_progress (规则1: 有进行中状态)`);
    return 'in_progress';
  }

  // 规则2: 当待处理状态和已完成状态同时存在时，项目为进行中状态
  if (hasPending && hasCompleted) {
    console.log(`项目 ${projectId} -> in_progress (规则2: 待处理+已完成)`);
    return 'in_progress';
  }

  // 规则3: 当只有空白状态和已完成状态时，项目为已完成状态
  if (hasCompleted && !hasPending && !hasInProgress) {
    console.log(`项目 ${projectId} -> completed (规则3: 只有空白+已完成)`);
    return 'completed';
  }

  // 规则4: 当只有空白状态和待处理状态时，项目为待处理状态
  console.log(`项目 ${projectId} -> pending (规则4: 默认)`);
  return 'pending';
};

/**
 * 更新项目状态（实时）
 */
export const updateProjectStatusRealtime = async (
  projects: Project[],
  updateProjectFn: (projectId: number, updates: { status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }, options?: { silent?: boolean }) => Promise<any>,
  thicknessSpecs: ThicknessSpec[],
  projectId: number, 
  changedThicknessSpecId: number, 
  newMaterialStatus: StatusType
) => {
  console.log(`🔥 实时更新项目状态，项目ID: ${projectId}, 变更规格: ${changedThicknessSpecId}, 新状态: ${newMaterialStatus}`);
  
  const newStatus = calculateProjectStatusRealtime(projects, thicknessSpecs, projectId, changedThicknessSpecId, newMaterialStatus);
  const currentProject = projects.find(p => p.id === projectId);
  
  if (currentProject && currentProject.status !== newStatus) {
    console.log(`项目 ${projectId} 状态变更: ${currentProject.status} → ${newStatus}`);
    
    try {
      await updateProjectFn(projectId, { status: newStatus as 'pending' | 'in_progress' | 'completed' | 'cancelled' }, { silent: true });
      console.log(`项目 ${projectId} 状态更新成功（静默模式）`);
      
      // 发送项目状态变更通知
      if (currentProject) {
        console.log('🔔 发送项目状态变更通知:', {
          projectId,
          projectName: currentProject.name,
          oldStatus: currentProject.status,
          newStatus,
          workerName: currentProject.assignedWorker?.name,
          currentProjectData: currentProject
        });
        
        await notificationManager.showProjectStatusNotification(
          currentProject.name, // 直接使用currentProject的名称
          currentProject.status,
          newStatus,
          currentProject.assignedWorker?.name
        );
      } else {
        console.error('⚠️ 找不到项目信息，无法发送通知:', { projectId, projectsLength: projects.length });
      }
      
      // 如果项目状态变为已完成，自动归档相关图纸
      if (newStatus === 'completed') {
        try {
          const response = await apiRequest(`/api/drawings/archive-project/${projectId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${getAuthToken()}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`项目 ${projectId} 图纸归档成功:`, result.message);
          } else {
            console.error(`项目 ${projectId} 图纸归档失败:`, await response.text());
          }
        } catch (archiveError) {
          console.error(`项目 ${projectId} 图纸归档过程中发生错误:`, archiveError);
        }
      }
      
      // 注意：SSE事件将由后端的项目更新路由自动发送，不需要在前端重复发送
      
    } catch (error) {
      console.error('更新项目状态失败:', error);
    }
  } else {
    console.log(`项目 ${projectId} 状态无需变更，当前状态: ${currentProject?.status}`);
  }
};

/**
 * 更新材料状态 - 共享逻辑
 * 此函数处理材料状态的完整更新流程，包括创建、更新、删除以及项目状态同步
 */
export const updateMaterialStatusShared = async (
  projectId: number,
  thicknessSpecId: number,
  newStatus: StatusType,
  options: {
    projects: Project[];
    thicknessSpecs: ThicknessSpec[];
    user: { id: number; name: string } | null;
    updateProjectFn: (projectId: number, updates: { status: 'pending' | 'in_progress' | 'completed' | 'cancelled' }, options?: { silent?: boolean }) => Promise<any>;
    fetchProjectsFn: () => Promise<void>;
    setLoadingFn?: (loading: boolean) => void;
  }
) => {
  const { projects, thicknessSpecs, user, updateProjectFn, fetchProjectsFn, setLoadingFn } = options;
  
  console.log(`🎯 材料状态更新开始: 项目${projectId}, 厚度规格${thicknessSpecId}, 新状态${newStatus}`);
  console.log('🖼️ 传入的项目数据:', {
    projectsCount: projects.length,
    targetProject: projects.find(p => p.id === projectId),
    allProjectNames: projects.map(p => ({ id: p.id, name: p.name }))
  });
  
  try {
    setLoadingFn?.(true);
    
    const token = getAuthToken();
    if (!token) {
      throw new Error('未找到认证令牌');
    }
    
    // 从projects数组中找到对应项目
    const currentProject = projects.find(p => p.id === projectId);
    if (!currentProject) {
      console.error('项目不存在');
      return false;
    }
    
    const existingMaterial = currentProject.materials?.find(m => m.thicknessSpecId === thicknessSpecId);
    
    if (newStatus === 'empty') {
      // 如果切换到空白状态，删除现有材料记录
      if (existingMaterial) {
        const deleteResponse = await apiRequest(`/api/materials/${existingMaterial.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json();
          alert('删除材料记录失败: ' + (errorData.error || '服务器错误'));
          return false;
        }
      }
      // 成功删除或本来就没有记录，更新项目状态
      await updateProjectStatusRealtime(projects, updateProjectFn, thicknessSpecs, projectId, thicknessSpecId, 'empty');
      
      // 发送材料更新事件，保持组件间同步
      const eventTimestamp = Date.now();
      window.dispatchEvent(new CustomEvent('materials-updated', { 
        detail: { 
          projectId, 
          thicknessSpecId, 
          newStatus: 'empty',
          timestamp: eventTimestamp
        } 
      }));
      
      return true;
    }
    
    if (existingMaterial) {
      // 更新现有材料
      const updateData: any = { 
        status: newStatus
      };

      if (newStatus === 'in_progress' && !existingMaterial.startDate) {
        updateData.startDate = new Date().toISOString().split('T')[0];
      }

      if (newStatus === 'completed') {
        updateData.completedDate = new Date().toISOString().split('T')[0];
        // 注意：不设置completedBy，因为数据库中该字段引用workers表，而user是users表
      }

      const response = await apiRequest(`/api/materials/${existingMaterial.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert('更新材料状态失败: ' + (errorData.error || '服务器错误'));
        return false;
      }
    } else {
      // 创建新材料记录
      const createData: any = {
        projectId: projectId,
        thicknessSpecId: thicknessSpecId,
        status: newStatus
      };

      if (newStatus === 'in_progress') {
        createData.startDate = new Date().toISOString().split('T')[0];
      } else if (newStatus === 'completed') {
        createData.completedDate = new Date().toISOString().split('T')[0];
        // 注意：不设置completedBy，因为数据库中该字段引用workers表，而user是users表
      }

      const createResponse = await apiRequest('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(createData),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        alert('创建材料记录失败: ' + (errorData.error || '服务器错误'));
        return false;
      }
    }
    
    // 成功更新或创建后，项目状态会通过SSE事件自动更新
    await updateProjectStatusRealtime(projects, updateProjectFn, thicknessSpecs, projectId, thicknessSpecId, newStatus);
    
    // 发送材料更新事件，保持组件间同步
    const eventTimestamp = Date.now();
    window.dispatchEvent(new CustomEvent('materials-updated', { 
      detail: { 
        projectId, 
        thicknessSpecId, 
        newStatus,
        timestamp: eventTimestamp
      } 
    }));
    
    return true;
    
  } catch (error) {
    console.error('更新材料状态失败:', error);
    alert('更新材料状态失败');
    return false;
  } finally {
    setLoadingFn?.(false);
  }
};

/**
 * 获取项目的材料状态（根据厚度规格ID）
 */
export const getProjectMaterialStatus = (projects: Project[], projectId: number, thicknessSpecId: number): StatusType => {
  const proj = projects.find(p => p.id === projectId);
  if (!proj || !proj.materials) return 'empty';
  const material = proj.materials.find(m => m.thicknessSpecId === thicknessSpecId);
  return (material?.status || 'empty') as StatusType;
};

/**
 * 获取项目的材料信息
 */
export const getProjectMaterial = (projects: Project[], projectId: number, thicknessSpecId: number): Material | null => {
  const proj = projects.find(p => p.id === projectId);
  if (!proj || !proj.materials) return null;
  return proj.materials.find(m => m.thicknessSpecId === thicknessSpecId) || null;
};
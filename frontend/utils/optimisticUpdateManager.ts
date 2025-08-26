// 乐观更新管理器
// 为各种操作提供一致的乐观更新模式

import { useNotificationStore } from '@/stores/notificationStore';
import { drawingToastHelper } from './drawingToastHelper';
import { materialToastHelper } from './materialToastHelper';
import { projectToastHelper } from './projectToastHelper';
import { workerToastHelper } from './workerToastHelper';
import { apiRequest } from './api';

// 乐观更新操作结果
export interface OptimisticUpdateResult {
  success: boolean;
  data?: any;
  error?: string;
}

// 图纸乐观更新管理器
export class DrawingOptimisticUpdater {
  /**
   * 乐观更新图纸上传
   * 1. 立即更新UI显示
   * 2. 发送API请求
   * 3. 成功时确认更新，失败时回滚
   */
  static async uploadDrawing(
    file: File,
    options: {
      projectId?: number;
      isCommonPart?: boolean;
      description?: string;
    } = {},
    updateUICallback?: (tempDrawing: any) => void,
    rollbackCallback?: () => void
  ): Promise<OptimisticUpdateResult> {
    const { projectId, isCommonPart, description } = options;
    const tempId = `temp-${Date.now()}`;
    
    // Step 1: 乐观更新UI
    const tempDrawing = {
      id: tempId,
      filename: file.name,
      status: 'uploading',
      progress: 0,
      projectId: projectId || null,
      uploadedAt: new Date().toISOString(),
      size: file.size
    };
    
    // 立即更新UI状态
    updateUICallback?.(tempDrawing);
    
    // 显示开始上传通知
    drawingToastHelper.drawingUploadProgress(file.name, 0);
    
    try {
      // Step 2: 发送API请求
      const formData = new FormData();
      formData.append('drawing', file);
      formData.append('description', description || '');
      
      // 根据参数选择API端点
      let endpoint: string;
      if (projectId) {
        endpoint = `/api/drawings/project/${projectId}/upload`;
      } else if (isCommonPart) {
        endpoint = '/api/drawings/common-parts/upload';
      } else {
        endpoint = '/api/drawings/upload';
      }
      
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Step 3: 成功确认
        drawingToastHelper.drawingUploaded(file.name, result.data?.project?.name);
        
        return {
          success: true,
          data: result.data
        };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || '上传失败');
      }
    } catch (error) {
      // Step 3: 失败回滚
      rollbackCallback?.();
      
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      drawingToastHelper.drawingUploadFailed(file.name, errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * 乐观更新图纸删除
   */
  static async deleteDrawing(
    drawingId: number,
    filename: string,
    updateUICallback?: () => void,
    rollbackCallback?: (drawing: any) => void
  ): Promise<OptimisticUpdateResult> {
    const originalDrawing = { id: drawingId, filename }; // 保存原数据用于回滚
    
    // Step 1: 乐观删除UI
    updateUICallback?.();
    
    try {
      // Step 2: 发送删除请求
      const response = await apiRequest(`/api/drawings/${drawingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        // Step 3: 成功确认
        drawingToastHelper.drawingDeleted(filename);
        return { success: true };
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      // Step 3: 失败回滚
      rollbackCallback?.(originalDrawing);
      
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      drawingToastHelper.error(`删除图纸失败：${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// 材料乐观更新管理器
export class MaterialOptimisticUpdater {
  /**
   * 乐观更新材料库存
   */
  static async updateStock(
    materialId: number,
    newQuantity: number,
    materialType: string,
    updateUICallback?: (quantity: number) => void,
    rollbackCallback?: (originalQuantity: number) => void
  ): Promise<OptimisticUpdateResult> {
    const originalQuantity = 0; // 应该从当前状态获取
    
    // Step 1: 乐观更新UI
    updateUICallback?.(newQuantity);
    
    try {
      // Step 2: 发送API请求
      const response = await apiRequest(`/api/worker-materials/${materialId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ quantity: newQuantity })
      });
      
      if (response.ok) {
        // Step 3: 成功确认
        const diff = newQuantity - originalQuantity;
        if (diff > 0) {
          materialToastHelper.stockAdded('工人', materialType, diff);
        }
        
        return { success: true };
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      // Step 3: 失败回滚
      rollbackCallback?.(originalQuantity);
      
      const errorMessage = error instanceof Error ? error.message : '更新失败';
      materialToastHelper.error(`更新库存失败：${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// 项目乐观更新管理器
export class ProjectOptimisticUpdater {
  /**
   * 乐观更新项目信息
   */
  static async updateProject(
    projectId: number,
    updates: any,
    updateUICallback?: (updates: any) => void,
    rollbackCallback?: (original: any) => void
  ): Promise<OptimisticUpdateResult> {
    // Step 1: 乐观更新UI
    updateUICallback?.(updates);
    
    try {
      // Step 2: 发送API请求
      const response = await apiRequest(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        // Step 3: 成功确认
        if (updates.name) {
          projectToastHelper.projectUpdated(updates.name, '信息');
        }
        
        return { success: true };
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      // Step 3: 失败回滚
      rollbackCallback?.({}); // 应该传入原始数据
      
      const errorMessage = error instanceof Error ? error.message : '更新失败';
      projectToastHelper.error(`更新项目失败：${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * 乐观创建项目
   */
  static async createProject(
    projectData: any,
    updateUICallback?: (tempProject: any) => void,
    rollbackCallback?: () => void
  ): Promise<OptimisticUpdateResult> {
    const tempId = `temp-${Date.now()}`;
    
    // Step 1: 乐观创建UI
    const tempProject = {
      id: tempId,
      ...projectData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    updateUICallback?.(tempProject);
    
    try {
      // Step 2: 发送API请求
      const response = await apiRequest('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(projectData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Step 3: 成功确认
        projectToastHelper.projectCreated(
          projectData.name,
          projectData.assignedWorker?.name
        );
        
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      // Step 3: 失败回滚
      rollbackCallback?.();
      
      const errorMessage = error instanceof Error ? error.message : '创建失败';
      projectToastHelper.error(`创建项目失败：${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// 工人乐观更新管理器
export class WorkerOptimisticUpdater {
  /**
   * 乐观更新工人信息
   */
  static async updateWorker(
    workerId: number,
    updates: any,
    updateUICallback?: (updates: any) => void,
    rollbackCallback?: (original: any) => void
  ): Promise<OptimisticUpdateResult> {
    // Step 1: 乐观更新UI
    updateUICallback?.(updates);
    
    try {
      // Step 2: 发送API请求
      const response = await apiRequest(`/api/workers/${workerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        // Step 3: 成功确认
        if (updates.name) {
          workerToastHelper.workerUpdated(updates.name, '信息');
        }
        
        return { success: true };
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      // Step 3: 失败回滚
      rollbackCallback?.({});
      
      const errorMessage = error instanceof Error ? error.message : '更新失败';
      workerToastHelper.error(`更新工人信息失败：${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// 通用乐观更新工具
export const optimisticUpdateUtils = {
  /**
   * 创建乐观更新模式的通用函数
   */
  async executeOptimisticUpdate<T>(
    optimisticUpdate: () => void,
    apiCall: () => Promise<T>,
    rollback: () => void,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<OptimisticUpdateResult> {
    // Step 1: 乐观更新
    optimisticUpdate();
    
    try {
      // Step 2: API调用
      const result = await apiCall();
      
      // Step 3: 成功处理
      onSuccess?.(result);
      
      return { success: true, data: result };
    } catch (error) {
      // Step 3: 失败回滚
      rollback();
      onError?.(error as Error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '操作失败'
      };
    }
  }
};
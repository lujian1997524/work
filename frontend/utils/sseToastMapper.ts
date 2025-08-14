// SSE事件到Toast通知映射器
// 将Server-Sent Events自动转换为相应的Toast提示

import React from 'react';
import { sseManager, SSEEventType, SSEEventData } from './sseManager';
import { projectToastHelper } from './projectToastHelper';
import { materialToastHelper } from './materialToastHelper';
import { drawingToastHelper } from './drawingToastHelper';
import { workerToastHelper } from './workerToastHelper';

interface SSEToastMapper {
  // SSE事件映射控制
  startMapping: () => void;
  stopMapping: () => void;
  isActive: () => boolean;
  
  // 映射配置
  enableProjectEvents: (enabled: boolean) => void;
  enableMaterialEvents: (enabled: boolean) => void;
  enableDrawingEvents: (enabled: boolean) => void;
  enableWorkerEvents: (enabled: boolean) => void;
  
  // 事件处理统计
  getEventStats: () => EventStats;
}

interface EventStats {
  totalEvents: number;
  projectEvents: number;
  materialEvents: number;
  drawingEvents: number;
  workerEvents: number;
  lastEventTime: string | null;
}

interface MappingConfig {
  projectEvents: boolean;
  materialEvents: boolean;
  drawingEvents: boolean;
  workerEvents: boolean;
}

// SSE到Toast映射器实现
class SSEToastMapperImpl implements SSEToastMapper {
  private isMapperActive = false;
  private eventHandlers = new Map<SSEEventType, (data: any) => void>();
  private config: MappingConfig = {
    projectEvents: true,
    materialEvents: true,
    drawingEvents: true,
    workerEvents: true,
  };
  private stats: EventStats = {
    totalEvents: 0,
    projectEvents: 0,
    materialEvents: 0,
    drawingEvents: 0,
    workerEvents: 0,
    lastEventTime: null,
  };

  constructor() {
    this.initializeEventHandlers();
  }

  private initializeEventHandlers() {
    // 项目相关事件映射
    this.eventHandlers.set('project-created', (data) => {
      if (!this.config.projectEvents) return;
      this.updateStats('project');
      
      const projectName = data.project?.name || data.projectName || '未知项目';
      const workerName = data.assignedWorker?.name || data.userName || '未知用户';
      projectToastHelper.projectCreated(projectName, workerName);
    });

    this.eventHandlers.set('project-updated', (data) => {
      if (!this.config.projectEvents) return;
      this.updateStats('project');
      
      const projectName = data.project?.name || data.projectName || '未知项目';
      const updateType = data.updatedFields?.join(', ') || '项目信息';
      projectToastHelper.projectUpdated(projectName, updateType);
    });

    this.eventHandlers.set('project-status-changed', (data) => {
      if (!this.config.projectEvents) return;
      this.updateStats('project');
      
      const projectName = data.project?.name || data.projectName || '未知项目';
      const oldStatus = this.getStatusText(data.oldStatus);
      const newStatus = this.getStatusText(data.newStatus);
      const reason = data.reason || '自动更新';
      
      projectToastHelper.projectStatusChanged(projectName, oldStatus, newStatus, reason);
    });

    this.eventHandlers.set('project-deleted', (data) => {
      if (!this.config.projectEvents) return;
      this.updateStats('project');
      
      const projectName = data.project?.name || data.projectName || '未知项目';
      const userName = data.userName || '某用户';
      projectToastHelper.projectDeleted(projectName, userName);
    });

    this.eventHandlers.set('project-moved-to-past', (data) => {
      if (!this.config.projectEvents) return;
      this.updateStats('project');
      
      const projectName = data.project?.name || data.projectName || '未知项目';
      projectToastHelper.projectArchived(projectName);
    });

    this.eventHandlers.set('project-restored-from-past', (data) => {
      if (!this.config.projectEvents) return;
      this.updateStats('project');
      
      const projectName = data.project?.name || data.projectName || '未知项目';
      projectToastHelper.projectRestored(projectName);
    });

    // 材料相关事件映射
    this.eventHandlers.set('material-status-changed', (data) => {
      if (!this.config.materialEvents) return;
      this.updateStats('material');
      
      const materialType = data.materialType || `${data.thickness}mm${data.materialTypeText}` || '未知材料';
      const workerName = data.workerName || data.assignedWorker?.name || '未知工人';
      const projectName = data.projectName || data.project?.name || '未知项目';
      const oldStatus = data.oldStatus;
      const newStatus = data.newStatus;
      
      // 根据状态变化触发相应Toast
      this.handleMaterialStatusChange(materialType, workerName, projectName, oldStatus, newStatus);
    });

    this.eventHandlers.set('material-batch-status-changed', (data) => {
      if (!this.config.materialEvents) return;
      this.updateStats('material');
      
      const count = data.count || data.materials?.length || 0;
      const newStatus = data.newStatus;
      const statusText = this.getStatusText(newStatus);
      
      materialToastHelper.batchOperationComplete(`批量更新完成：${count}个材料状态已更新为${statusText}`);
    });

    // 批量操作事件映射
    this.eventHandlers.set('projects-batch-restored', (data) => {
      if (!this.config.projectEvents) return;
      this.updateStats('project');
      
      const count = data.count || data.projects?.length || 0;
      projectToastHelper.batchOperationComplete(`批量恢复完成：${count}个项目已从过往库恢复`);
    });

    this.eventHandlers.set('projects-batch-soft-deleted', (data) => {
      if (!this.config.projectEvents) return;
      this.updateStats('project');
      
      const count = data.count || data.projects?.length || 0;
      projectToastHelper.batchOperationComplete(`批量删除完成：${count}个项目已移动到过往库`);
    });

    this.eventHandlers.set('projects-batch-destroyed', (data) => {
      if (!this.config.projectEvents) return;
      this.updateStats('project');
      
      const count = data.count || data.projects?.length || 0;
      projectToastHelper.batchOperationComplete(`批量永久删除完成：${count}个项目已永久删除`);
    });

    // 连接状态事件
    this.eventHandlers.set('connected', (data) => {
      this.updateStats('system');
      // 可以添加连接成功的Toast，但通常不需要显示
    });

    this.eventHandlers.set('heartbeat', (data) => {
      // 心跳事件通常不需要显示Toast
    });

    // 测试事件
    this.eventHandlers.set('test', (data) => {
      this.updateStats('system');
      projectToastHelper.info('SSE测试事件已接收：' + JSON.stringify(data));
    });
  }

  private handleMaterialStatusChange(
    materialType: string,
    workerName: string,
    projectName: string,
    oldStatus: string,
    newStatus: string
  ) {
    switch (newStatus) {
      case 'pending':
        if (oldStatus === 'completed' || oldStatus === 'empty') {
          materialToastHelper.materialAllocated(materialType, projectName, 1);
        }
        break;
      case 'in_progress':
        if (oldStatus === 'pending') {
          materialToastHelper.materialStarted(materialType, workerName);
        }
        break;
      case 'completed':
        if (oldStatus === 'in_progress') {
          materialToastHelper.materialCompleted(materialType, workerName);
        }
        break;
      case 'empty':
        if (oldStatus === 'completed') {
          materialToastHelper.materialRecycled(materialType);
        }
        break;
    }
  }

  private updateStats(category: 'project' | 'material' | 'drawing' | 'worker' | 'system') {
    this.stats.totalEvents++;
    this.stats.lastEventTime = new Date().toISOString();
    
    switch (category) {
      case 'project':
        this.stats.projectEvents++;
        break;
      case 'material':
        this.stats.materialEvents++;
        break;
      case 'drawing':
        this.stats.drawingEvents++;
        break;
      case 'worker':
        this.stats.workerEvents++;
        break;
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'pending': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      case 'empty': return '空白';
      default: return status;
    }
  }

  // 公共接口实现
  startMapping() {
    if (this.isMapperActive) return;
    
    this.isMapperActive = true;
    
    // 注册所有事件处理器到SSE管理器
    this.eventHandlers.forEach((handler, eventType) => {
      sseManager.addEventListener(eventType, handler);
    });
  }

  stopMapping() {
    if (!this.isMapperActive) return;
    
    this.isMapperActive = false;
    
    // 移除所有事件处理器
    this.eventHandlers.forEach((handler, eventType) => {
      sseManager.removeEventListener(eventType, handler);
    });
  }

  isActive() {
    return this.isMapperActive;
  }

  enableProjectEvents(enabled: boolean) {
    this.config.projectEvents = enabled;
  }

  enableMaterialEvents(enabled: boolean) {
    this.config.materialEvents = enabled;
  }

  enableDrawingEvents(enabled: boolean) {
    this.config.drawingEvents = enabled;
  }

  enableWorkerEvents(enabled: boolean) {
    this.config.workerEvents = enabled;
  }

  getEventStats() {
    return { ...this.stats };
  }
}

// 创建全局SSE到Toast映射器实例
export const sseToastMapper = new SSEToastMapperImpl();

// React Hook：使用SSE到Toast映射
export const useSSEToastMapping = (options?: {
  autoStart?: boolean;
  projectEvents?: boolean;
  materialEvents?: boolean;
  drawingEvents?: boolean;
  workerEvents?: boolean;
}) => {
  const {
    autoStart = true,
    projectEvents = true,
    materialEvents = true,
    drawingEvents = true,
    workerEvents = true,
  } = options || {};

  React.useEffect(() => {
    // 配置映射器
    sseToastMapper.enableProjectEvents(projectEvents);
    sseToastMapper.enableMaterialEvents(materialEvents);
    sseToastMapper.enableDrawingEvents(drawingEvents);
    sseToastMapper.enableWorkerEvents(workerEvents);

    if (autoStart) {
      sseToastMapper.startMapping();
    }

    return () => {
      if (autoStart) {
        sseToastMapper.stopMapping();
      }
    };
  }, [autoStart, projectEvents, materialEvents, drawingEvents, workerEvents]);

  return {
    isActive: sseToastMapper.isActive(),
    start: () => sseToastMapper.startMapping(),
    stop: () => sseToastMapper.stopMapping(),
    stats: sseToastMapper.getEventStats(),
  };
};

// 项目Toast帮助器扩展（为SSE映射添加更多方法）
declare module './projectToastHelper' {
  interface ProjectToastHelper {
    projectStatusChanged: (projectName: string, oldStatus: string, newStatus: string, reason: string) => void;
    projectDeleted: (projectName: string, userName: string) => void;
    projectRestored: (projectName: string) => void;
    batchOperationComplete: (message: string) => void;
    info: (message: string) => void;
  }
}

// 材料Toast帮助器扩展
declare module './materialToastHelper' {
  interface MaterialToastHelper {
    batchOperationComplete: (message: string) => void;
  }
}
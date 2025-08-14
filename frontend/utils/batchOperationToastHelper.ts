// 批量操作Toast辅助模块
// 用于在非React组件中触发批量操作相关Toast提示

import React from 'react';
import { projectToastHelper } from './projectToastHelper';
import { materialToastHelper } from './materialToastHelper';
import { workerToastHelper } from './workerToastHelper';
import { drawingToastHelper } from './drawingToastHelper';

// 批量操作类型
export type BatchOperationType = 
  | 'project-batch'     // 项目批量操作
  | 'material-batch'    // 材料批量操作
  | 'worker-batch'      // 工人批量操作
  | 'drawing-batch'     // 图纸批量操作
  | 'mixed-batch';      // 混合批量操作

// 批量操作结果
export interface BatchOperationResult {
  operation: string;
  total: number;
  successful: number;
  failed: number;
  errors?: string[];
  details?: any;
}

// 批量操作进度
export interface BatchOperationProgress {
  operation: string;
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
}

// 批量操作Toast辅助接口
interface BatchOperationToastHelper {
  // 批量操作开始
  batchStarted: (operation: string, total: number, type: BatchOperationType) => void;
  
  // 批量操作进度更新
  batchProgress: (progress: BatchOperationProgress) => void;
  
  // 批量操作完成
  batchCompleted: (result: BatchOperationResult, type: BatchOperationType) => void;
  
  // 批量操作失败
  batchFailed: (operation: string, error: string, type: BatchOperationType) => void;
  
  // 特定业务批量操作
  // 项目批量操作
  projectBatchUpdate: (updatedCount: number, total: number, updateType: string) => void;
  projectBatchDelete: (deletedCount: number, total: number) => void;
  projectBatchStatusChange: (changedCount: number, total: number, newStatus: string) => void;
  projectBatchAssign: (assignedCount: number, total: number, workerName: string) => void;
  
  // 材料批量操作
  materialBatchStatusUpdate: (updatedCount: number, total: number, newStatus: string) => void;
  materialBatchTransfer: (transferredCount: number, total: number, fromWorker: string, toWorker: string) => void;
  materialBatchRecycle: (recycledCount: number, total: number) => void;
  materialBatchAllocation: (allocatedCount: number, total: number, projectName: string) => void;
  
  // 工人批量操作
  workerBatchCreate: (createdCount: number, total: number, department: string) => void;
  workerBatchUpdate: (updatedCount: number, total: number, updateType: string) => void;
  workerBatchAssign: (assignedCount: number, total: number, projectName: string) => void;
  workerBatchDepartmentChange: (changedCount: number, total: number, newDepartment: string) => void;
  
  // 图纸批量操作
  drawingBatchUpload: (uploadedCount: number, total: number, projectName: string) => void;
  drawingBatchDelete: (deletedCount: number, total: number) => void;
  drawingBatchMove: (movedCount: number, total: number, targetProject: string) => void;
  drawingBatchVersionUpdate: (updatedCount: number, total: number) => void;
  
  // 通用消息
  info: (message: string) => void;
  error: (message: string) => void;
}

// 创建全局事件来触发Toast
export const batchOperationToastEvents = {
  emit: (eventType: string, data: any) => {
    window.dispatchEvent(new CustomEvent(`batch-toast-${eventType}`, { detail: data }));
  }
};

// Toast事件处理器（在React组件中使用）
export const useBatchOperationToastListener = (toast: any) => {
  React.useEffect(() => {
    const handlers = {
      'batch-toast-started': (e: CustomEvent) => {
        const { operation, total, type } = e.detail;
        toast.addToast({
          type: 'info',
          message: `开始执行批量${operation}，共${total}项任务`,
          duration: 3000
        });
      },
      
      'batch-toast-progress': (e: CustomEvent) => {
        const { progress } = e.detail;
        const { operation, current, total, percentage, currentItem } = progress;
        const currentInfo = currentItem ? `正在处理：${currentItem}` : '';
        toast.addToast({
          type: 'info',
          message: `${operation}进度：${current}/${total} (${percentage.toFixed(1)}%) ${currentInfo}`,
          duration: 2000
        });
      },
      
      'batch-toast-completed': (e: CustomEvent) => {
        const { result, type } = e.detail;
        const { operation, total, successful, failed } = result;
        
        if (failed === 0) {
          toast.addToast({
            type: 'success',
            message: `批量${operation}成功完成，共处理${total}项`,
            duration: 4000
          });
        } else {
          toast.addToast({
            type: 'warning',
            message: `批量${operation}完成，成功${successful}项，失败${failed}项`,
            duration: 5000
          });
        }
      },
      
      'batch-toast-failed': (e: CustomEvent) => {
        const { operation, error } = e.detail;
        toast.addToast({
          type: 'error',
          message: `批量${operation}执行失败：${error}`,
          duration: 6000
        });
      },
      
      // 项目批量操作事件
      'batch-toast-project-update': (e: CustomEvent) => {
        const { updatedCount, total, updateType } = e.detail;
        if (updatedCount === total) {
          toast.addToast({
            type: 'success',
            message: `成功批量更新${updatedCount}个项目的${updateType}`
          });
        } else {
          toast.addToast({
            type: 'warning',
            message: `批量更新项目${updateType}：成功${updatedCount}个，共${total}个`
          });
        }
      },
      
      'batch-toast-project-delete': (e: CustomEvent) => {
        const { deletedCount, total } = e.detail;
        toast.addToast({
          type: deletedCount === total ? 'success' : 'warning',
          message: `批量删除项目完成：成功删除${deletedCount}个，共${total}个`
        });
      },
      
      'batch-toast-project-status-change': (e: CustomEvent) => {
        const { changedCount, total, newStatus } = e.detail;
        toast.addToast({
          type: changedCount === total ? 'success' : 'warning',
          message: `批量更改项目状态为"${newStatus}"：成功${changedCount}个，共${total}个`
        });
      },
      
      'batch-toast-project-assign': (e: CustomEvent) => {
        const { assignedCount, total, workerName } = e.detail;
        toast.addToast({
          type: assignedCount === total ? 'success' : 'warning',
          message: `批量分配项目给${workerName}：成功${assignedCount}个，共${total}个`
        });
      },
      
      // 材料批量操作事件
      'batch-toast-material-status-update': (e: CustomEvent) => {
        const { updatedCount, total, newStatus } = e.detail;
        toast.addToast({
          type: updatedCount === total ? 'success' : 'warning',
          message: `批量更新材料状态为"${newStatus}"：成功${updatedCount}个，共${total}个`
        });
      },
      
      'batch-toast-material-transfer': (e: CustomEvent) => {
        const { transferredCount, total, fromWorker, toWorker } = e.detail;
        toast.addToast({
          type: transferredCount === total ? 'success' : 'warning',
          message: `批量转移材料从${fromWorker}到${toWorker}：成功${transferredCount}个，共${total}个`
        });
      },
      
      'batch-toast-material-recycle': (e: CustomEvent) => {
        const { recycledCount, total } = e.detail;
        toast.addToast({
          type: recycledCount === total ? 'success' : 'warning',
          message: `批量回收材料：成功${recycledCount}个，共${total}个`
        });
      },
      
      'batch-toast-material-allocation': (e: CustomEvent) => {
        const { allocatedCount, total, projectName } = e.detail;
        toast.addToast({
          type: allocatedCount === total ? 'success' : 'warning',
          message: `批量分配材料到项目"${projectName}"：成功${allocatedCount}个，共${total}个`
        });
      },
      
      // 工人批量操作事件
      'batch-toast-worker-create': (e: CustomEvent) => {
        const { createdCount, total, department } = e.detail;
        toast.addToast({
          type: createdCount === total ? 'success' : 'warning',
          message: `批量创建${department}部门工人：成功${createdCount}个，共${total}个`
        });
      },
      
      'batch-toast-worker-update': (e: CustomEvent) => {
        const { updatedCount, total, updateType } = e.detail;
        toast.addToast({
          type: updatedCount === total ? 'success' : 'warning',
          message: `批量更新工人${updateType}：成功${updatedCount}个，共${total}个`
        });
      },
      
      'batch-toast-worker-assign': (e: CustomEvent) => {
        const { assignedCount, total, projectName } = e.detail;
        toast.addToast({
          type: assignedCount === total ? 'success' : 'warning',
          message: `批量分配工人到项目"${projectName}"：成功${assignedCount}个，共${total}个`
        });
      },
      
      'batch-toast-worker-department-change': (e: CustomEvent) => {
        const { changedCount, total, newDepartment } = e.detail;
        toast.addToast({
          type: changedCount === total ? 'success' : 'warning',
          message: `批量调整工人到${newDepartment}部门：成功${changedCount}个，共${total}个`
        });
      },
      
      // 图纸批量操作事件
      'batch-toast-drawing-upload': (e: CustomEvent) => {
        const { uploadedCount, total, projectName } = e.detail;
        toast.addToast({
          type: uploadedCount === total ? 'success' : 'warning',
          message: `批量上传图纸到项目"${projectName}"：成功${uploadedCount}个，共${total}个`
        });
      },
      
      'batch-toast-drawing-delete': (e: CustomEvent) => {
        const { deletedCount, total } = e.detail;
        toast.addToast({
          type: deletedCount === total ? 'success' : 'warning',
          message: `批量删除图纸：成功${deletedCount}个，共${total}个`
        });
      },
      
      'batch-toast-drawing-move': (e: CustomEvent) => {
        const { movedCount, total, targetProject } = e.detail;
        toast.addToast({
          type: movedCount === total ? 'success' : 'warning',
          message: `批量移动图纸到项目"${targetProject}"：成功${movedCount}个，共${total}个`
        });
      },
      
      'batch-toast-drawing-version-update': (e: CustomEvent) => {
        const { updatedCount, total } = e.detail;
        toast.addToast({
          type: updatedCount === total ? 'success' : 'warning',
          message: `批量更新图纸版本：成功${updatedCount}个，共${total}个`
        });
      },
      
      'batch-toast-info': (e: CustomEvent) => {
        const { message } = e.detail;
        toast.addToast({
          type: 'info',
          message
        });
      },
      
      'batch-toast-error': (e: CustomEvent) => {
        const { message } = e.detail;
        toast.addToast({
          type: 'error',
          message
        });
      }
    };

    // 注册事件监听器
    Object.entries(handlers).forEach(([eventType, handler]) => {
      window.addEventListener(eventType, handler as EventListener);
    });

    // 清理函数
    return () => {
      Object.entries(handlers).forEach(([eventType, handler]) => {
        window.removeEventListener(eventType, handler as EventListener);
      });
    };
  }, [toast]);
};

// 批量操作Toast辅助函数
export const batchOperationToastHelper: BatchOperationToastHelper = {
  // 通用批量操作
  batchStarted: (operation: string, total: number, type: BatchOperationType) => {
    batchOperationToastEvents.emit('started', { operation, total, type });
  },
  
  batchProgress: (progress: BatchOperationProgress) => {
    batchOperationToastEvents.emit('progress', { progress });
  },
  
  batchCompleted: (result: BatchOperationResult, type: BatchOperationType) => {
    batchOperationToastEvents.emit('completed', { result, type });
  },
  
  batchFailed: (operation: string, error: string, type: BatchOperationType) => {
    batchOperationToastEvents.emit('failed', { operation, error, type });
  },
  
  // 项目批量操作
  projectBatchUpdate: (updatedCount: number, total: number, updateType: string) => {
    batchOperationToastEvents.emit('project-update', { updatedCount, total, updateType });
  },
  
  projectBatchDelete: (deletedCount: number, total: number) => {
    batchOperationToastEvents.emit('project-delete', { deletedCount, total });
  },
  
  projectBatchStatusChange: (changedCount: number, total: number, newStatus: string) => {
    batchOperationToastEvents.emit('project-status-change', { changedCount, total, newStatus });
  },
  
  projectBatchAssign: (assignedCount: number, total: number, workerName: string) => {
    batchOperationToastEvents.emit('project-assign', { assignedCount, total, workerName });
  },
  
  // 材料批量操作
  materialBatchStatusUpdate: (updatedCount: number, total: number, newStatus: string) => {
    batchOperationToastEvents.emit('material-status-update', { updatedCount, total, newStatus });
  },
  
  materialBatchTransfer: (transferredCount: number, total: number, fromWorker: string, toWorker: string) => {
    batchOperationToastEvents.emit('material-transfer', { transferredCount, total, fromWorker, toWorker });
  },
  
  materialBatchRecycle: (recycledCount: number, total: number) => {
    batchOperationToastEvents.emit('material-recycle', { recycledCount, total });
  },
  
  materialBatchAllocation: (allocatedCount: number, total: number, projectName: string) => {
    batchOperationToastEvents.emit('material-allocation', { allocatedCount, total, projectName });
  },
  
  // 工人批量操作
  workerBatchCreate: (createdCount: number, total: number, department: string) => {
    batchOperationToastEvents.emit('worker-create', { createdCount, total, department });
  },
  
  workerBatchUpdate: (updatedCount: number, total: number, updateType: string) => {
    batchOperationToastEvents.emit('worker-update', { updatedCount, total, updateType });
  },
  
  workerBatchAssign: (assignedCount: number, total: number, projectName: string) => {
    batchOperationToastEvents.emit('worker-assign', { assignedCount, total, projectName });
  },
  
  workerBatchDepartmentChange: (changedCount: number, total: number, newDepartment: string) => {
    batchOperationToastEvents.emit('worker-department-change', { changedCount, total, newDepartment });
  },
  
  // 图纸批量操作
  drawingBatchUpload: (uploadedCount: number, total: number, projectName: string) => {
    batchOperationToastEvents.emit('drawing-upload', { uploadedCount, total, projectName });
  },
  
  drawingBatchDelete: (deletedCount: number, total: number) => {
    batchOperationToastEvents.emit('drawing-delete', { deletedCount, total });
  },
  
  drawingBatchMove: (movedCount: number, total: number, targetProject: string) => {
    batchOperationToastEvents.emit('drawing-move', { movedCount, total, targetProject });
  },
  
  drawingBatchVersionUpdate: (updatedCount: number, total: number) => {
    batchOperationToastEvents.emit('drawing-version-update', { updatedCount, total });
  },
  
  // 通用消息
  info: (message: string) => {
    batchOperationToastEvents.emit('info', { message });
  },
  
  error: (message: string) => {
    batchOperationToastEvents.emit('error', { message });
  }
};

// 批量操作进度追踪工具
export class BatchOperationTracker {
  private operation: string;
  private total: number;
  private current: number = 0;
  private type: BatchOperationType;
  private errors: string[] = [];
  
  constructor(operation: string, total: number, type: BatchOperationType) {
    this.operation = operation;
    this.total = total;
    this.type = type;
    
    // 通知开始
    batchOperationToastHelper.batchStarted(operation, total, type);
  }
  
  // 更新进度
  updateProgress(currentItem?: string) {
    this.current++;
    const percentage = (this.current / this.total) * 100;
    
    batchOperationToastHelper.batchProgress({
      operation: this.operation,
      current: this.current,
      total: this.total,
      percentage,
      currentItem
    });
  }
  
  // 添加错误
  addError(error: string) {
    this.errors.push(error);
  }
  
  // 完成操作
  complete(details?: any) {
    const result: BatchOperationResult = {
      operation: this.operation,
      total: this.total,
      successful: this.total - this.errors.length,
      failed: this.errors.length,
      errors: this.errors.length > 0 ? this.errors : undefined,
      details
    };
    
    batchOperationToastHelper.batchCompleted(result, this.type);
  }
  
  // 操作失败
  fail(error: string) {
    batchOperationToastHelper.batchFailed(this.operation, error, this.type);
  }
}

// React Hook：批量操作追踪
export const useBatchOperationTracker = () => {
  return {
    createTracker: (operation: string, total: number, type: BatchOperationType) => 
      new BatchOperationTracker(operation, total, type),
    helper: batchOperationToastHelper
  };
};
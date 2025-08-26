// 批量操作通知辅助模块
// 使用统一的通知系统（NotificationContainer + notificationStore）

import { useNotificationStore } from '@/stores/notificationStore';
import { audioManager } from './audioManager';
import { configManager } from './configManager';
import React from 'react';

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

// 批量操作通知辅助接口
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

// 播放批量操作相关音效的辅助函数
const playBatchSound = async (soundType: 'info' | 'success' | 'warning' | 'error' | 'wancheng') => {
  try {
    const config = configManager.getConfig();
    if (!config.notifications.sound || !audioManager.getConfig().enabled) {
      return;
    }
    await audioManager.playNotificationSound(soundType);
  } catch (error) {
    // 静默处理音频播放错误
  }
};

// 使用统一的通知系统显示批量操作通知
const showBatchNotification = (
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string,
  duration: number = 4000
) => {
  // 获取 notificationStore 的 addNotification 方法
  const notificationStore = useNotificationStore.getState();
  
  // 生成唯一ID
  const id = `batch-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // 播放对应音效
  playBatchSound(type === 'success' && message.includes('完成') ? 'wancheng' : type);
  
  // 添加通知到系统
  notificationStore.addNotification({
    id,
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    duration
  });
};

// 批量操作辅助函数（直接调用通知系统）
export const batchOperationToastHelper: BatchOperationToastHelper = {
  // 通用批量操作
  batchStarted: (operation: string, total: number, type: BatchOperationType) => {
    playBatchSound('info');
    showBatchNotification(
      'info',
      '批量操作开始',
      `开始执行批量${operation}，共${total}项任务`,
      3000
    );
  },
  
  batchProgress: (progress: BatchOperationProgress) => {
    const { operation, current, total, percentage, currentItem } = progress;
    const currentInfo = currentItem ? `正在处理：${currentItem}` : '';
    showBatchNotification(
      'info',
      '批量操作进度',
      `${operation}进度：${current}/${total} (${percentage.toFixed(1)}%) ${currentInfo}`,
      2000
    );
  },
  
  batchCompleted: (result: BatchOperationResult, type: BatchOperationType) => {
    const { operation, total, successful, failed } = result;
    
    if (failed === 0) {
      playBatchSound('wancheng');
      showBatchNotification(
        'success',
        '批量操作完成',
        `批量${operation}成功完成，共处理${total}项`,
        4000
      );
    } else {
      playBatchSound('warning');
      showBatchNotification(
        'warning',
        '批量操作部分完成',
        `批量${operation}完成，成功${successful}项，失败${failed}项`,
        5000
      );
    }
  },
  
  batchFailed: (operation: string, error: string, type: BatchOperationType) => {
    playBatchSound('error');
    showBatchNotification(
      'error',
      '批量操作失败',
      `批量${operation}执行失败：${error}`,
      6000
    );
  },
  
  // 项目批量操作
  projectBatchUpdate: (updatedCount: number, total: number, updateType: string) => {
    const sound = updatedCount === total ? 'wancheng' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      updatedCount === total ? 'success' : 'warning',
      '项目批量更新',
      updatedCount === total 
        ? `成功批量更新${updatedCount}个项目的${updateType}`
        : `批量更新项目${updateType}：成功${updatedCount}个，共${total}个`,
      4000
    );
  },
  
  projectBatchDelete: (deletedCount: number, total: number) => {
    const sound = deletedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      deletedCount === total ? 'success' : 'warning',
      '项目批量删除',
      `批量删除项目完成：成功删除${deletedCount}个，共${total}个`,
      4000
    );
  },
  
  projectBatchStatusChange: (changedCount: number, total: number, newStatus: string) => {
    const sound = changedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      changedCount === total ? 'success' : 'warning',
      '项目状态批量更改',
      `批量更改项目状态为"${newStatus}"：成功${changedCount}个，共${total}个`,
      4000
    );
  },
  
  projectBatchAssign: (assignedCount: number, total: number, workerName: string) => {
    const sound = assignedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      assignedCount === total ? 'success' : 'warning',
      '项目批量分配',
      `批量分配项目给${workerName}：成功${assignedCount}个，共${total}个`,
      4000
    );
  },
  
  // 材料批量操作
  materialBatchStatusUpdate: (updatedCount: number, total: number, newStatus: string) => {
    const sound = updatedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      updatedCount === total ? 'success' : 'warning',
      '材料状态批量更新',
      `批量更新材料状态为"${newStatus}"：成功${updatedCount}个，共${total}个`,
      4000
    );
  },
  
  materialBatchTransfer: (transferredCount: number, total: number, fromWorker: string, toWorker: string) => {
    const sound = transferredCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      transferredCount === total ? 'success' : 'warning',
      '材料批量调拨',
      `批量转移材料从${fromWorker}到${toWorker}：成功${transferredCount}个，共${total}个`,
      4000
    );
  },
  
  materialBatchRecycle: (recycledCount: number, total: number) => {
    const sound = recycledCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      recycledCount === total ? 'success' : 'warning',
      '材料批量回收',
      `批量回收材料：成功${recycledCount}个，共${total}个`,
      4000
    );
  },
  
  materialBatchAllocation: (allocatedCount: number, total: number, projectName: string) => {
    const sound = allocatedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      allocatedCount === total ? 'success' : 'warning',
      '材料批量分配',
      `批量分配材料到项目"${projectName}"：成功${allocatedCount}个，共${total}个`,
      4000
    );
  },
  
  // 工人批量操作
  workerBatchCreate: (createdCount: number, total: number, department: string) => {
    const sound = createdCount === total ? 'wancheng' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      createdCount === total ? 'success' : 'warning',
      '工人批量创建',
      `批量创建${department}部门工人：成功${createdCount}个，共${total}个`,
      4000
    );
  },
  
  workerBatchUpdate: (updatedCount: number, total: number, updateType: string) => {
    const sound = updatedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      updatedCount === total ? 'success' : 'warning',
      '工人信息批量更新',
      `批量更新工人${updateType}：成功${updatedCount}个，共${total}个`,
      4000
    );
  },
  
  workerBatchAssign: (assignedCount: number, total: number, projectName: string) => {
    const sound = assignedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      assignedCount === total ? 'success' : 'warning',
      '工人批量分配',
      `批量分配工人到项目"${projectName}"：成功${assignedCount}个，共${total}个`,
      4000
    );
  },
  
  workerBatchDepartmentChange: (changedCount: number, total: number, newDepartment: string) => {
    const sound = changedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      changedCount === total ? 'success' : 'warning',
      '工人部门批量调整',
      `批量调整工人到${newDepartment}部门：成功${changedCount}个，共${total}个`,
      4000
    );
  },
  
  // 图纸批量操作
  drawingBatchUpload: (uploadedCount: number, total: number, projectName: string) => {
    const sound = uploadedCount === total ? 'wancheng' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      uploadedCount === total ? 'success' : 'warning',
      '图纸批量上传',
      `批量上传图纸到项目"${projectName}"：成功${uploadedCount}个，共${total}个`,
      4000
    );
  },
  
  drawingBatchDelete: (deletedCount: number, total: number) => {
    const sound = deletedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      deletedCount === total ? 'success' : 'warning',
      '图纸批量删除',
      `批量删除图纸：成功${deletedCount}个，共${total}个`,
      4000
    );
  },
  
  drawingBatchMove: (movedCount: number, total: number, targetProject: string) => {
    const sound = movedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      movedCount === total ? 'success' : 'warning',
      '图纸批量移动',
      `批量移动图纸到项目"${targetProject}"：成功${movedCount}个，共${total}个`,
      4000
    );
  },
  
  drawingBatchVersionUpdate: (updatedCount: number, total: number) => {
    const sound = updatedCount === total ? 'success' : 'warning';
    playBatchSound(sound);
    showBatchNotification(
      updatedCount === total ? 'success' : 'warning',
      '图纸版本批量更新',
      `批量更新图纸版本：成功${updatedCount}个，共${total}个`,
      4000
    );
  },
  
  // 通用消息
  info: (message: string) => {
    playBatchSound('info');
    showBatchNotification(
      'info',
      '批量操作提示',
      message,
      4000
    );
  },
  
  error: (message: string) => {
    playBatchSound('error');
    showBatchNotification(
      'error',
      '批量操作错误',
      message,
      5000
    );
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

// 简化的React Hook（移除复杂的事件监听）
export const useBatchOperationToastListener = (toast?: any) => {
  // 不再需要复杂的事件监听，直接使用notificationStore
  return;
};
// 项目操作通知辅助模块
// 使用统一的通知系统（NotificationContainer + notificationStore）

import { useNotificationStore } from '@/stores/notificationStore';
import { audioManager } from './audioManager';
import { configManager } from './configManager';
import React from 'react';

// 状态转换函数 - 确保中文显示
const getStatusText = (status: string): string => {
  switch (status) {
    case 'pending': return '待处理';
    case 'in_progress': return '进行中';
    case 'completed': return '已完成';
    case 'cancelled': return '已取消';
    default: return status;
  }
};

interface ProjectToastHelper {
  projectCreated: (projectName: string, workerName?: string) => void;
  projectUpdated: (projectName: string, updateType?: string) => void;  
  projectDeleted: (projectName: string, userName?: string, drawingsCount?: number) => void;
  projectArchived: (projectName: string) => void;
  projectRestored: (projectName: string) => void;
  projectStatusAuto: (projectName: string, newStatus: string, reason: string) => void;
  projectStatusChanged: (projectName: string, oldStatus: string, newStatus: string, reason: string) => void;
  workerReassigned: (projectName: string, fromWorker: string, toWorker: string) => void;
  batchOperationComplete: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
}

// 播放项目相关音效的辅助函数
const playProjectSound = async (soundType: 'info' | 'success' | 'warning' | 'error' | 'wancheng') => {
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

// 使用统一的通知系统显示项目通知
const showProjectNotification = (
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string,
  duration: number = 4000
) => {
  // 获取 notificationStore 的 addNotification 方法
  const notificationStore = useNotificationStore.getState();
  
  // 生成唯一ID
  const id = `project-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // 播放对应音效
  playProjectSound(type === 'success' && (message.includes('完成') || message.includes('创建')) ? 'wancheng' : type);
  
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

// 项目操作辅助函数（直接调用通知系统）
export const projectToastHelper: ProjectToastHelper = {
  projectCreated: (projectName: string, workerName?: string) => {
    playProjectSound('wancheng');
    showProjectNotification(
      'success',
      '项目创建成功',
      workerName 
        ? `项目"${projectName}"已创建并分配给${workerName}` 
        : `项目"${projectName}"创建成功`,
      4000
    );
  },
  
  projectUpdated: (projectName: string, updateType?: string) => {
    playProjectSound('info');
    showProjectNotification(
      'info',
      '项目更新',
      updateType 
        ? `项目"${projectName}"${updateType}已更新` 
        : `项目"${projectName}"信息已更新`,
      3000
    );
  },
  
  projectDeleted: (projectName: string, userName?: string, drawingsCount?: number) => {
    playProjectSound('warning');
    let message = `项目"${projectName}"已删除`;
    if (drawingsCount && drawingsCount > 0) {
      message += `，包含${drawingsCount}个图纸文件`;
    }
    if (userName) {
      message += `（由${userName}执行）`;
    }
    
    showProjectNotification(
      'warning',
      '项目已删除',
      message,
      5000
    );
  },
  
  projectArchived: (projectName: string) => {
    playProjectSound('info');
    showProjectNotification(
      'info',
      '项目归档',
      `项目"${projectName}"已归档至过往库`,
      4000
    );
  },
  
  projectRestored: (projectName: string) => {
    playProjectSound('success');
    showProjectNotification(
      'success',
      '项目恢复',
      `项目"${projectName}"已从过往库恢复`,
      4000
    );
  },
  
  projectStatusAuto: (projectName: string, newStatus: string, reason: string) => {
    playProjectSound('info');
    showProjectNotification(
      'info',
      '项目状态自动更新',
      `项目"${projectName}"状态自动更新为"${getStatusText(newStatus)}"（${reason}）`,
      5000
    );
  },
  
  projectStatusChanged: (projectName: string, oldStatus: string, newStatus: string, reason: string) => {
    playProjectSound('info');
    showProjectNotification(
      'info',
      '项目状态变更',
      `项目"${projectName}"状态从"${getStatusText(oldStatus)}"改为"${getStatusText(newStatus)}"（${reason}）`,
      4000
    );
  },
  
  workerReassigned: (projectName: string, fromWorker: string, toWorker: string) => {
    playProjectSound('info');
    showProjectNotification(
      'info',
      '工人重新分配',
      `项目"${projectName}"工人从${fromWorker}重新分配给${toWorker}`,
      4000
    );
  },
  
  batchOperationComplete: (message: string) => {
    playProjectSound('success');
    showProjectNotification(
      'success',
      '批量操作完成',
      message,
      5000
    );
  },
  
  info: (message: string) => {
    playProjectSound('info');
    showProjectNotification(
      'info',
      '操作提示',
      message,
      4000
    );
  },
  
  error: (message: string) => {
    playProjectSound('error');
    showProjectNotification(
      'error',
      '操作失败',
      message,
      5000
    );
  }
};

// 简化的React Hook（移除复杂的事件监听）
export const useProjectToastListener = (toast?: any) => {
  // 不再需要复杂的事件监听，直接使用notificationStore
  return;
};
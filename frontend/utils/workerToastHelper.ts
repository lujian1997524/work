// 工人操作通知辅助模块
// 使用统一的通知系统（NotificationContainer + notificationStore）

import { useNotificationStore } from '@/stores/notificationStore';
import { audioManager } from './audioManager';
import { configManager } from './configManager';
import React from 'react';

interface WorkerToastHelper {
  // 工人CRUD操作通知
  workerAdded: (workerName: string, department: string) => void;
  workerUpdated: (workerName: string, updateType: string) => void;
  workerDeleted: (workerName: string) => void;
  workerProfileUpdated: (workerName: string, field: string) => void;
  
  // 部门管理通知
  departmentAdded: (departmentName: string) => void;
  departmentUpdated: (departmentName: string) => void;
  departmentDeleted: (departmentName: string) => void;
  
  // 工人负载管理通知
  workerOverloaded: (workerName: string, projectCount: number) => void;
  workerAvailable: (workerName: string) => void;
  workloadBalanced: () => void;
  workerReassigned: (workerName: string, fromProject: string, toProject: string) => void;
  
  // 工人技能和权限通知
  skillAdded: (workerName: string, skillName: string) => void;
  permissionUpdated: (workerName: string, permission: string) => void;
  accessGranted: (workerName: string, resource: string) => void;
  accessRevoked: (workerName: string, resource: string) => void;
  
  // 工人协作和通信通知
  taskAssigned: (workerName: string, taskName: string) => void;
  collaborationInvited: (workerName: string, projectName: string) => void;
  messageReceived: (fromWorker: string, toWorker: string) => void;
  
  // 通用消息通知
  info: (message: string) => void;
  
  // 通用错误
  error: (message: string) => void;
}

// 播放工人相关音效的辅助函数
const playWorkerSound = async (soundType: 'info' | 'success' | 'warning' | 'error' | 'wancheng') => {
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

// 使用统一的通知系统显示工人通知
const showWorkerNotification = (
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string,
  duration: number = 4000
) => {
  // 获取 notificationStore 的 addNotification 方法
  const notificationStore = useNotificationStore.getState();
  
  // 生成唯一ID
  const id = `worker-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // 播放对应音效
  playWorkerSound(type === 'success' && message.includes('创建') ? 'wancheng' : type);
  
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

// 工人操作辅助函数（直接调用通知系统）
export const workerToastHelper: WorkerToastHelper = {
  workerAdded: (workerName: string, department: string) => {
    playWorkerSound('wancheng');
    showWorkerNotification(
      'success',
      '工人添加成功',
      `工人"${workerName}"已添加到${department}部门`,
      4000
    );
  },
  
  workerUpdated: (workerName: string, updateType: string) => {
    playWorkerSound('info');
    showWorkerNotification(
      'info',
      '工人信息更新',
      `${workerName}的${updateType}信息已更新`,
      3000
    );
  },
  
  workerDeleted: (workerName: string) => {
    playWorkerSound('warning');
    showWorkerNotification(
      'warning',
      '工人移除',
      `工人"${workerName}"已从系统中移除`,
      4000
    );
  },
  
  workerProfileUpdated: (workerName: string, field: string) => {
    playWorkerSound('info');
    showWorkerNotification(
      'success',
      '个人信息更新',
      `${workerName}的${field}信息已更新`,
      3000
    );
  },
  
  departmentAdded: (departmentName: string) => {
    playWorkerSound('success');
    showWorkerNotification(
      'success',
      '部门创建成功',
      `新部门"${departmentName}"已创建`,
      4000
    );
  },
  
  departmentUpdated: (departmentName: string) => {
    playWorkerSound('info');
    showWorkerNotification(
      'info',
      '部门信息更新',
      `部门"${departmentName}"信息已更新`,
      3000
    );
  },
  
  departmentDeleted: (departmentName: string) => {
    playWorkerSound('warning');
    showWorkerNotification(
      'warning',
      '部门已删除',
      `部门"${departmentName}"已删除，相关工人需要重新分配部门`,
      6000
    );
  },
  
  workerOverloaded: (workerName: string, projectCount: number) => {
    playWorkerSound('warning');
    showWorkerNotification(
      'warning',
      '工人任务过载',
      `${workerName}当前有${projectCount}个项目，建议重新分配任务`,
      5000
    );
  },
  
  workerAvailable: (workerName: string) => {
    playWorkerSound('info');
    showWorkerNotification(
      'info',
      '工人有空闲',
      `${workerName}现在有空闲时间，可分配新任务`,
      4000
    );
  },
  
  workloadBalanced: () => {
    playWorkerSound('success');
    showWorkerNotification(
      'success',
      '负载平衡完成',
      `团队工作负载已平衡，所有工人任务分配合理`,
      4000
    );
  },
  
  workerReassigned: (workerName: string, fromProject: string, toProject: string) => {
    playWorkerSound('info');
    showWorkerNotification(
      'info',
      '工人重新分配',
      `${workerName}已从"${fromProject}"调配至"${toProject}"`,
      4000
    );
  },
  
  skillAdded: (workerName: string, skillName: string) => {
    playWorkerSound('success');
    showWorkerNotification(
      'success',
      '技能添加成功',
      `${workerName}新增技能：${skillName}`,
      4000
    );
  },
  
  permissionUpdated: (workerName: string, permission: string) => {
    playWorkerSound('info');
    showWorkerNotification(
      'info',
      '权限更新',
      `${workerName}的权限已更新：${permission}`,
      4000
    );
  },
  
  accessGranted: (workerName: string, resource: string) => {
    playWorkerSound('success');
    showWorkerNotification(
      'success',
      '权限授予',
      `已授权${workerName}访问${resource}`,
      4000
    );
  },
  
  accessRevoked: (workerName: string, resource: string) => {
    playWorkerSound('warning');
    showWorkerNotification(
      'warning',
      '权限撤销',
      `已撤销${workerName}对${resource}的访问权限`,
      4000
    );
  },
  
  taskAssigned: (workerName: string, taskName: string) => {
    playWorkerSound('info');
    showWorkerNotification(
      'info',
      '任务分配',
      `任务"${taskName}"已分配给${workerName}`,
      4000
    );
  },
  
  collaborationInvited: (workerName: string, projectName: string) => {
    playWorkerSound('info');
    showWorkerNotification(
      'info',
      '协作邀请',
      `邀请${workerName}参与项目"${projectName}"协作`,
      4000
    );
  },
  
  messageReceived: (fromWorker: string, toWorker: string) => {
    playWorkerSound('info');
    showWorkerNotification(
      'info',
      '消息通知',
      `${fromWorker}向${toWorker}发送了消息`,
      3000
    );
  },
  
  info: (message: string) => {
    playWorkerSound('info');
    showWorkerNotification(
      'info',
      '操作提示',
      message,
      4000
    );
  },
  
  error: (message: string) => {
    playWorkerSound('error');
    showWorkerNotification(
      'error',
      '操作失败',
      message,
      5000
    );
  }
};

// 简化的React Hook（移除复杂的事件监听）
export const useWorkerToastListener = (toast?: any) => {
  // 不再需要复杂的事件监听，直接使用notificationStore
  return;
};
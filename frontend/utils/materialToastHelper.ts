// 材料操作通知辅助模块
// 使用统一的通知系统（NotificationContainer + notificationStore）

import { useNotificationStore } from '@/stores/notificationStore';
import { audioManager } from './audioManager';
import { configManager } from './configManager';
import React from 'react';

interface MaterialToastHelper {
  // 四状态循环通知
  materialAllocated: (materialType: string, projectName: string, quantity: number) => void;
  materialStarted: (materialType: string, workerName: string) => void;
  materialCompleted: (materialType: string, workerName?: string) => void;
  materialRecycled: (materialType: string) => void;
  
  // 库存管理通知
  stockAdded: (workerName: string, materialType: string, quantity: number) => void;
  stockWarning: (workerName: string, materialType: string, currentStock: number, required: number) => void;
  dimensionAdded: (materialType: string, dimensions: string, quantity: number) => void;
  materialTransferred: (materialType: string, quantity: number, fromWorker: string, toWorker: string) => void;
  
  // 95/5策略提醒
  strategyDeviation: (carbonRatio: number, target?: number) => void;
  strategyBalanced: () => void;
  
  // 批量操作通知
  batchOperationComplete: (message: string) => void;
  
  // 通用错误
  error: (message: string) => void;
}

// 播放材料相关音效的辅助函数
const playMaterialSound = async (soundType: 'info' | 'success' | 'warning' | 'error' | 'wancheng') => {
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

// 使用统一的通知系统显示材料通知
const showMaterialNotification = (
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string,
  duration: number = 4000
) => {
  // 获取 notificationStore 的 addNotification 方法
  const notificationStore = useNotificationStore.getState();
  
  // 生成唯一ID
  const id = `material-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // 播放对应音效
  playMaterialSound(type === 'success' && message.includes('完成') ? 'wancheng' : type);
  
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

// 材料操作辅助函数（直接调用通知系统）
export const materialToastHelper: MaterialToastHelper = {
  materialAllocated: (materialType: string, projectName: string, quantity: number) => {
    playMaterialSound('info');
    showMaterialNotification(
      'info',
      '材料已分配',
      `${materialType} ${quantity}张已分配至项目"${projectName}"`,
      4000
    );
  },
  
  materialStarted: (materialType: string, workerName: string) => {
    playMaterialSound('info');
    showMaterialNotification(
      'info',
      '材料加工开始',
      `${workerName}开始加工${materialType}`,
      4000
    );
  },
  
  materialCompleted: (materialType: string, workerName?: string) => {
    playMaterialSound('wancheng');
    showMaterialNotification(
      'success',
      '材料加工完成',
      workerName 
        ? `${workerName}完成${materialType}加工` 
        : `${materialType}加工完成`,
      4000
    );
  },
  
  materialRecycled: (materialType: string) => {
    playMaterialSound('info');
    showMaterialNotification(
      'info',
      '材料已回收',
      `${materialType}已回收至库存`,
      3000
    );
  },
  
  stockAdded: (workerName: string, materialType: string, quantity: number) => {
    playMaterialSound('success');
    showMaterialNotification(
      'success',
      '库存增加',
      `${workerName}的${materialType}库存增加${quantity}张`,
      4000
    );
  },
  
  stockWarning: (workerName: string, materialType: string, currentStock: number, required: number) => {
    playMaterialSound('warning');
    showMaterialNotification(
      'warning',
      '库存不足警告',
      `${workerName}的${materialType}库存不足：当前${currentStock}张，需要${required}张`,
      6000
    );
  },
  
  dimensionAdded: (materialType: string, dimensions: string, quantity: number) => {
    playMaterialSound('success');
    showMaterialNotification(
      'success',
      '尺寸规格添加',
      `${materialType}添加新尺寸${dimensions}，数量${quantity}张`,
      4000
    );
  },
  
  materialTransferred: (materialType: string, quantity: number, fromWorker: string, toWorker: string) => {
    playMaterialSound('info');
    showMaterialNotification(
      'info',
      '材料调拨',
      `${materialType} ${quantity}张从${fromWorker}调拨至${toWorker}`,
      4000
    );
  },
  
  strategyDeviation: (carbonRatio: number, target: number = 95) => {
    playMaterialSound('warning');
    showMaterialNotification(
      'warning',
      '95/5策略偏离',
      `碳板比例${carbonRatio.toFixed(1)}%，偏离目标${target}%`,
      5000
    );
  },
  
  strategyBalanced: () => {
    playMaterialSound('success');
    showMaterialNotification(
      'success',
      '95/5策略平衡',
      '材料配比已达到95/5策略要求',
      4000
    );
  },
  
  batchOperationComplete: (message: string) => {
    playMaterialSound('success');
    showMaterialNotification(
      'success',
      '批量操作完成',
      message,
      5000
    );
  },
  
  error: (message: string) => {
    playMaterialSound('error');
    showMaterialNotification(
      'error',
      '操作失败',
      message,
      5000
    );
  }
};

// 简化的React Hook（移除复杂的事件监听）
export const useMaterialToastListener = (toast?: any) => {
  // 不再需要复杂的事件监听，直接使用notificationStore
  return;
};
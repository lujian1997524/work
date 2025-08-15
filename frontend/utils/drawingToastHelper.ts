// 图纸操作通知辅助模块
// 使用统一的通知系统（NotificationContainer + notificationStore）

import { useNotificationStore } from '@/stores/notificationStore';
import { audioManager } from './audioManager';
import { configManager } from './configManager';
import React from 'react';

interface DrawingToastHelper {
  // 图纸上传相关
  drawingUploaded: (filename: string, projectName?: string) => void;
  drawingUploadProgress: (filename: string, progress: number) => void;
  drawingUploadFailed: (filename: string, error: string) => void;
  batchUploadComplete: (successCount: number, totalCount: number) => void;
  
  // DXF处理相关
  dxfParsed: (filename: string, details: string) => void;
  dxfParsingFailed: (filename: string, error: string) => void;
  
  // 图纸管理相关
  drawingDeleted: (filename: string) => void;
  drawingVersionUpdated: (filename: string, newVersion: string) => void;
  drawingRenamed: (oldName: string, newName: string) => void;
  drawingArchived: (filename: string) => void;
  
  // 图纸版本控制
  versionCreated: (filename: string, version: string) => void;
  versionRestored: (filename: string, version: string) => void;
  versionCompared: (filename: string, version1: string, version2: string) => void;
  
  // 图纸分享和权限
  drawingShared: (filename: string, recipientName: string) => void;
  drawingPermissionUpdated: (filename: string, permission: string) => void;
  
  // DXF预览相关
  dxfPreviewGenerated: (filename: string) => void;
  dxfPreviewFailed: (filename: string) => void;
  
  // 通用错误
  error: (message: string) => void;
}

// 播放图纸相关音效的辅助函数
const playDrawingSound = async (soundType: 'info' | 'success' | 'warning' | 'error' | 'wancheng') => {
  try {
    // 直接调用audioManager，不检查配置以确保音频播放
    await audioManager.playNotificationSound(soundType);
  } catch (error) {
    // 静默处理音频播放错误
    // 音频播放失败时静默处理
  }
};

// 使用统一的通知系统显示图纸通知
const showDrawingNotification = (
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string,
  duration: number = 4000
) => {
  // 获取 notificationStore 的 addNotification 方法
  const notificationStore = useNotificationStore.getState();
  
  // 生成唯一ID
  const id = `drawing-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // 先播放音效
  playDrawingSound(type === 'success' && message.includes('完成') ? 'wancheng' : type);
  
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

// 图纸操作辅助函数（直接调用通知系统）
export const drawingToastHelper: DrawingToastHelper = {
  drawingUploaded: (filename: string, projectName?: string) => {
    playDrawingSound('success');
    showDrawingNotification(
      'success',
      '图纸上传成功',
      projectName 
        ? `图纸"${filename}"已上传至项目"${projectName}"` 
        : `图纸"${filename}"上传成功`,
      4000
    );
  },
  
  drawingUploadProgress: (filename: string, progress: number) => {
    showDrawingNotification(
      'info',
      '正在上传图纸',
      `正在上传图纸"${filename}" (${progress}%)`,
      0 // 持续显示
    );
  },
  
  drawingUploadFailed: (filename: string, error: string) => {
    playDrawingSound('error');
    showDrawingNotification(
      'error',
      '图纸上传失败',
      `图纸"${filename}"上传失败：${error}`,
      6000
    );
  },
  
  batchUploadComplete: (successCount: number, totalCount: number) => {
    // 根据成功率选择音效
    if (successCount === totalCount) {
      playDrawingSound('wancheng');
    } else if (successCount > 0) {
      playDrawingSound('success');
    } else {
      playDrawingSound('error');
    }
    
    showDrawingNotification(
      successCount === totalCount ? 'success' : successCount > 0 ? 'warning' : 'error',
      '批量上传完成',
      `批量上传完成：成功${successCount}个，共${totalCount}个文件`,
      5000
    );
  },
  
  dxfParsed: (filename: string, details: string) => {
    playDrawingSound('info');
    showDrawingNotification(
      'success',
      'DXF解析完成',
      `DXF文件"${filename}"解析完成: ${details}`,
      4000
    );
  },
  
  dxfParsingFailed: (filename: string, error: string) => {
    playDrawingSound('error');
    showDrawingNotification(
      'error',
      'DXF解析失败',
      `DXF文件"${filename}"解析失败: ${error}`,
      6000
    );
  },
  
  drawingDeleted: (filename: string) => {
    playDrawingSound('error');
    showDrawingNotification(
      'warning',
      '图纸已删除',
      `图纸"${filename}"已删除`,
      3000
    );
  },
  
  drawingVersionUpdated: (filename: string, newVersion: string) => {
    playDrawingSound('info');
    showDrawingNotification(
      'info',
      '版本更新',
      `图纸"${filename}"版本已更新至${newVersion}`,
      4000
    );
  },
  
  drawingRenamed: (oldName: string, newName: string) => {
    playDrawingSound('info');
    showDrawingNotification(
      'info',
      '图纸重命名',
      `图纸已重命名：${oldName} → ${newName}`,
      4000
    );
  },
  
  drawingArchived: (filename: string) => {
    playDrawingSound('info');
    showDrawingNotification(
      'info',
      '图纸归档',
      `图纸"${filename}"已归档`,
      3000
    );
  },
  
  versionCreated: (filename: string, version: string) => {
    playDrawingSound('success');
    showDrawingNotification(
      'success',
      '新版本创建',
      `图纸"${filename}"创建新版本：${version}`,
      4000
    );
  },
  
  versionRestored: (filename: string, version: string) => {
    playDrawingSound('info');
    showDrawingNotification(
      'info',
      '版本恢复',
      `图纸"${filename}"已恢复到版本：${version}`,
      4000
    );
  },
  
  versionCompared: (filename: string, version1: string, version2: string) => {
    playDrawingSound('info');
    showDrawingNotification(
      'info',
      '版本比较',
      `比较图纸"${filename}"版本：${version1} ↔ ${version2}`,
      4000
    );
  },
  
  drawingShared: (filename: string, recipientName: string) => {
    playDrawingSound('success');
    showDrawingNotification(
      'success',
      '图纸分享',
      `图纸"${filename}"已分享给 ${recipientName}`,
      4000
    );
  },
  
  drawingPermissionUpdated: (filename: string, permission: string) => {
    playDrawingSound('info');
    showDrawingNotification(
      'info',
      '权限更新',
      `图纸"${filename}"权限已更新：${permission}`,
      3000
    );
  },
  
  dxfPreviewGenerated: (filename: string) => {
    playDrawingSound('success');
    showDrawingNotification(
      'success',
      'DXF预览生成',
      `DXF图纸"${filename}"预览生成成功`,
      3000
    );
  },
  
  dxfPreviewFailed: (filename: string) => {
    playDrawingSound('error');
    showDrawingNotification(
      'error',
      'DXF预览失败',
      `DXF图纸"${filename}"预览生成失败`,
      5000
    );
  },
  
  error: (message: string) => {
    playDrawingSound('error');
    showDrawingNotification(
      'error',
      '操作失败',
      message,
      5000
    );
  }
};

// 简化的React Hook（移除复杂的事件监听）
export const useDrawingToastListener = () => {
  // 不再需要复杂的事件监听，直接使用notificationStore
  return;
};
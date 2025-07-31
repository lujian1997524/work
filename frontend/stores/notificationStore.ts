import { create } from 'zustand';
import { sseManager, type NotificationMessage } from '@/utils/sseManager';
import { audioManager } from '@/utils/audioManager';
import { notificationManager } from '@/utils/notificationManager';

interface NotificationStore {
  // 状态
  notifications: NotificationMessage[];
  isSSEConnected: boolean;
  notificationCallbackSetup: boolean; // 添加标志位防止重复回调
  
  // 操作方法
  addNotification: (notification: NotificationMessage) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  setSSEConnectionStatus: (connected: boolean) => void;
  
  // SSE连接管理
  connectSSE: (token: string) => Promise<boolean>;
  disconnectSSE: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // 初始状态
  notifications: [],
  isSSEConnected: false,
  notificationCallbackSetup: false, // 初始化标志位

  // 添加通知（增加去重逻辑）
  addNotification: (notification) => {
    // 检查是否已存在相同ID的通知
    const state = get();
    const existingNotification = state.notifications.find(n => n.id === notification.id);
    
    if (existingNotification) {
      return;
    }

    // 额外的去重检查：检查是否有相同类型和内容的通知（在短时间内）
    const now = Date.now();
    const duplicateNotification = state.notifications.find(n => 
      n.title === notification.title &&
      n.message === notification.message &&
      (now - new Date(n.timestamp).getTime()) < 1000 // 1秒内的相同通知视为重复
    );

    if (duplicateNotification) {
      return;
    }

    set(state => ({
      notifications: [...state.notifications, notification]
    }));
    
    // 智能选择并播放提示音
    const soundType = audioManager.getNotificationSound(
      notification.type, 
      notification.title, 
      notification.message
    );
    audioManager.playNotificationSound(soundType);
    
    // 发送桌面通知
    notificationManager.showNotification({
      title: notification.title,
      body: notification.message,
      tag: `app-notification-${notification.id}`,
      data: {
        type: notification.type,
        source: 'app-notification',
        originalId: notification.id
      }
    });
    
    // 如果设置了自动消失时间，添加定时器
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(notification.id);
      }, notification.duration);
    }
  },

  // 移除通知
  removeNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  // 清空所有通知
  clearAllNotifications: () => {
    set({ notifications: [] });
  },

  // 设置SSE连接状态
  setSSEConnectionStatus: (connected) => {
    set({ isSSEConnected: connected });
  },

  // 连接SSE
  connectSSE: async (token) => {
    try {
      // 防止重复注册通知回调
      const state = get();
      if (!state.notificationCallbackSetup) {
        sseManager.addNotificationCallback((notification) => {
          get().addNotification(notification);
        });
        set({ notificationCallbackSetup: true });
      }

      // 建立连接
      const success = await sseManager.connect(token);
      get().setSSEConnectionStatus(success);
      
      return success;
    } catch (error) {
      get().setSSEConnectionStatus(false);
      return false;
    }
  },

  // 断开SSE
  disconnectSSE: () => {
    sseManager.disconnect();
    get().setSSEConnectionStatus(false);
  }
}));
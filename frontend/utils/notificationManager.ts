/**
 * 通知管理器 - 处理桌面通知和系统通知
 */

import { configManager } from './configManager';
import { audioManager } from './audioManager';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  silent?: boolean;
  requireInteraction?: boolean;
  data?: any;
}

class NotificationManager {
  private static instance: NotificationManager;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.checkPermission();
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 检查通知权限
   */
  private checkPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * 请求通知权限
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission;
  }

  /**
   * 显示通知
   */
  public async showNotification(options: NotificationOptions): Promise<Notification | null> {
    const config = configManager.getConfig();
    
    // 检查是否启用桌面通知
    if (!config.notifications.desktop) {
      console.log('桌面通知已禁用');
      return null;
    }

    // 检查浏览器支持
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('当前浏览器不支持桌面通知');
      return null;
    }

    // 检查权限
    if (this.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.log('桌面通知权限未授予，将只显示应用内通知');
        return null;
      }
    }

    // 应用配置设置
    const notificationOptions: NotificationOptions = {
      ...options,
      body: config.notifications.showPreview ? options.body : '新消息',
      silent: options.silent !== undefined ? options.silent : !config.notifications.sound,
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico'
    };

    try {
      const notification = new Notification(notificationOptions.title, notificationOptions);

      // 播放音效（如果启用）
      if (config.notifications.sound && audioManager.getConfig().enabled) {
        const soundType = this.getSoundTypeFromTitle(notificationOptions.title);
        audioManager.playNotificationSound(soundType);
      }

      // 设置自动关闭
      if (!notificationOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // 点击事件处理
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // 处理自定义数据
        if (notificationOptions.data && notificationOptions.data.onClick) {
          notificationOptions.data.onClick();
        }
      };

      return notification;
    } catch (error) {
      console.error('显示通知失败:', error);
      return null;
    }
  }

  /**
   * 根据通知标题选择音效类型
   */
  private getSoundTypeFromTitle(title: string): 'info' | 'success' | 'warning' | 'error' | 'wancheng' {
    if (title.includes('完成') || title.includes('已完成')) {
      return 'wancheng';
    } else if (title.includes('成功') || title.includes('进行中')) {
      return 'success';
    } else if (title.includes('警告')) {
      return 'warning';
    } else if (title.includes('错误') || title.includes('失败') || title.includes('删除')) {
      return 'error';
    } else {
      return 'info';
    }
  }

  /**
   * 显示项目状态变更通知
   */
  public async showProjectStatusNotification(
    projectName: string, 
    oldStatus: string, 
    newStatus: string,
    workerName?: string
  ): Promise<Notification | null> {
    const statusLabels: Record<string, string> = {
      'pending': '待处理',
      'in_progress': '进行中',
      'completed': '已完成',
      'empty': '空白'
    };

    const title = `项目状态更新`;
    const body = `${projectName} 状态从 ${statusLabels[oldStatus] || oldStatus} 改为 ${statusLabels[newStatus] || newStatus}${workerName ? ` (${workerName})` : ''}`;

    return this.showNotification({
      title,
      body,
      tag: `project-${projectName}-status`,
      data: {
        type: 'project-status',
        projectName,
        oldStatus,
        newStatus,
        workerName
      }
    });
  }

  /**
   * 显示项目创建通知
   */
  public async showProjectCreatedNotification(
    projectName: string,
    createdBy: string
  ): Promise<Notification | null> {
    return this.showNotification({
      title: '新项目创建',
      body: `${createdBy} 创建了项目 "${projectName}"`,
      tag: `project-${projectName}-created`,
      data: {
        type: 'project-created',
        projectName,
        createdBy
      }
    });
  }

  /**
   * 显示项目删除通知
   */
  public async showProjectDeletedNotification(
    projectName: string,
    deletedBy: string,
    deletedDrawingsCount?: number
  ): Promise<Notification | null> {
    const drawingText = deletedDrawingsCount && deletedDrawingsCount > 0 
      ? ` (同时删除了 ${deletedDrawingsCount} 个图纸)`
      : '';
    
    return this.showNotification({
      title: '项目已删除',
      body: `${deletedBy} 删除了项目 "${projectName}"${drawingText}`,
      tag: `project-${projectName}-deleted`,
      data: {
        type: 'project-deleted',
        projectName,
        deletedBy,
        deletedDrawingsCount
      }
    });
  }

  /**
   * 显示系统消息通知
   */
  public async showSystemNotification(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<Notification | null> {
    const titles: Record<string, string> = {
      info: '系统消息',
      success: '操作成功',
      warning: '系统警告',
      error: '系统错误'
    };

    return this.showNotification({
      title: titles[type],
      body: message,
      tag: `system-${type}`,
      data: {
        type: 'system',
        level: type
      }
    });
  }

  /**
   * 获取当前通知权限状态
   */
  public getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  /**
   * 检查是否支持通知
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * 获取通知配置状态
   */
  public getNotificationStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    enabled: boolean;
    soundEnabled: boolean;
  } {
    const config = configManager.getConfig();
    return {
      supported: this.isSupported(),
      permission: this.permission,
      enabled: config.notifications.desktop,
      soundEnabled: config.notifications.sound && audioManager.getConfig().enabled
    };
  }
}

// 导出单例实例
export const notificationManager = NotificationManager.getInstance();

// 导出便捷方法
export const showNotification = (options: NotificationOptions) => 
  notificationManager.showNotification(options);

export const showProjectStatusNotification = (
  projectName: string, 
  oldStatus: string, 
  newStatus: string, 
  workerName?: string
) => notificationManager.showProjectStatusNotification(projectName, oldStatus, newStatus, workerName);

export const showSystemNotification = (message: string, type?: 'info' | 'success' | 'warning' | 'error') =>
  notificationManager.showSystemNotification(message, type);

export default notificationManager;
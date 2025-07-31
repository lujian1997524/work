/**
 * 默认配置文件
 * 这些是系统的默认设置,可以通过环境变量或用户配置覆盖
 */

import type { AppConfig } from '@/utils/configManager';

export const DEFAULT_CONFIG: AppConfig = {
  // API配置
  apiUrl: 'http://localhost:35001',
  apiTimeout: 30000,

  // 应用配置
  environment: 'production',
  appName: '激光切割生产管理系统', 
  version: '1.0.0',

  // 功能开关
  features: {
    enableNotifications: true,
    enableSSE: true,
    enableOfflineMode: false,
  },

  // UI配置
  ui: {
    theme: 'light',
    language: 'zh-CN',
    sidebarWidth: 220,
  },

  // 音频和通知配置
  audio: {
    notificationVolume: 70,
    enableSounds: true,
    soundTheme: 'default',
  },

  // 通知配置
  notifications: {
    desktop: true,
    sound: true,
    showPreview: true,
    position: 'top-right',
  },
};

/**
 * 开发环境配置覆盖
 */
export const DEVELOPMENT_CONFIG: Partial<AppConfig> = {
  environment: 'development',
  features: {
    enableNotifications: true,
    enableSSE: true,
    enableOfflineMode: true, // 开发环境启用离线模式便于测试
  },
};

/**
 * 生产环境配置覆盖
 */
export const PRODUCTION_CONFIG: Partial<AppConfig> = {
  environment: 'production',
  features: {
    enableNotifications: true,
    enableSSE: true,
    enableOfflineMode: false,
  },
};
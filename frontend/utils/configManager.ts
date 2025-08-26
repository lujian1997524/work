/**
 * 配置管理器
 * 支持多层配置：环境变量 > 用户配置文件 > 默认配置
 */

import { DEFAULT_CONFIG, DEVELOPMENT_CONFIG, PRODUCTION_CONFIG } from '@/config/default';
import { apiRequest } from '@/utils/api';

export interface AppConfig {
  // API配置
  apiUrl: string;
  apiTimeout: number;
  
  // 应用配置
  environment: 'development' | 'production' | 'test';
  appName: string;
  version: string;
  
  // 功能开关
  features: {
    enableNotifications: boolean;
    enableSSE: boolean;
    enableOfflineMode: boolean;
  };
  
  // UI配置
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: 'zh-CN' | 'en-US';
    sidebarWidth: number;
  };
  
  // 音频和通知配置
  audio: {
    notificationVolume: number; // 0-100
    enableSounds: boolean;
    soundTheme: 'default' | 'minimal' | 'none';
  };
  
  // 通知配置
  notifications: {
    desktop: boolean;
    sound: boolean;
    showPreview: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private listeners: Set<(config: AppConfig) => void> = new Set();

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 获取当前配置
   */
  public getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * 获取特定配置项
   */
  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * 更新配置
   */
  public async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    const newConfig = { ...this.config, ...updates };
    
    // 验证配置
    if (!this.validateConfig(newConfig)) {
      throw new Error('配置验证失败');
    }

    // 保存到本地存储
    await this.saveUserConfig(updates);
    
    // 更新内存中的配置
    this.config = newConfig;
    
    // 通知监听器
    this.notifyListeners();
  }

  /**
   * 测试API连接
   */
  public async testConnection(apiUrl?: string): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
  }> {
    const testUrl = apiUrl || this.config.apiUrl;
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
      
      const response = await apiRequest(`${testUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `连接成功 (${responseTime}ms)`,
          responseTime,
        };
      } else {
        return {
          success: false,
          message: `服务器响应错误: HTTP ${response.status}`,
          responseTime,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            message: '连接超时 (8秒)',
            responseTime,
          };
        }
        
        if (error.message.includes('Failed to fetch')) {
          return {
            success: false,
            message: '无法连接到服务器，请检查地址和网络',
            responseTime,
          };
        }
        
        return {
          success: false,
          message: `连接错误: ${error.message}`,
          responseTime,
        };
      }
      
      return {
        success: false,
        message: '未知连接错误',
        responseTime,
      };
    }
  }

  /**
   * 测试API连接（带重试）
   */
  public async testConnectionWithRetry(
    apiUrl?: string, 
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<{
    success: boolean;
    message: string;
    attempts: number;
    responseTime?: number;
  }> {
    let attempts = 0;
    let lastError = '';
    
    for (let i = 0; i < maxRetries; i++) {
      attempts++;
      const result = await this.testConnection(apiUrl);
      
      if (result.success) {
        return {
          success: true,
          message: `连接成功 (尝试 ${attempts}/${maxRetries})`,
          attempts,
          responseTime: result.responseTime,
        };
      }
      
      lastError = result.message;
      
      // 如果不是最后一次尝试，等待后重试
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    return {
      success: false,
      message: `连接失败 (${attempts}次尝试): ${lastError}`,
      attempts,
    };
  }

  /**
   * 重置为默认配置
   */
  public async resetToDefaults(): Promise<void> {
    const defaultConfig = this.getDefaultConfig();
    
    // 清除本地存储的用户配置
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userConfig');
    }
    
    this.config = defaultConfig;
    this.notifyListeners();
  }

  /**
   * 添加配置变更监听器
   */
  public addListener(callback: (config: AppConfig) => void): () => void {
    this.listeners.add(callback);
    
    // 返回移除监听器的函数
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 加载配置（按优先级）
   */
  private loadConfig(): AppConfig {
    // 1. 获取默认配置
    const defaultConfig = this.getDefaultConfig();
    
    // 2. 读取用户配置文件
    const userConfig = this.readUserConfig();
    
    // 3. 读取环境变量配置
    const envConfig = this.readEnvConfig();
    
    // 4. 合并配置（优先级：env > user > default）
    const config = {
      ...defaultConfig,
      ...userConfig,
      ...envConfig,
      // 深度合并对象类型的配置
      features: {
        ...defaultConfig.features,
        ...userConfig.features,
        ...envConfig.features,
      },
      ui: {
        ...defaultConfig.ui,
        ...userConfig.ui,
        ...envConfig.ui,
      },
      audio: {
        ...defaultConfig.audio,
        ...userConfig.audio,
        ...envConfig.audio,
      },
      notifications: {
        ...defaultConfig.notifications,
        ...userConfig.notifications,
        ...envConfig.notifications,
      },
    };

    return config;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AppConfig {
    const baseConfig = { ...DEFAULT_CONFIG };
    
    // 根据环境应用覆盖配置
    if (process.env.NODE_ENV === 'development') {
      return {
        ...baseConfig,
        ...DEVELOPMENT_CONFIG,
        features: {
          ...baseConfig.features,
          ...DEVELOPMENT_CONFIG.features,
        },
        ui: {
          ...baseConfig.ui,
          ...DEVELOPMENT_CONFIG.ui,
        },
        audio: {
          ...baseConfig.audio,
          ...DEVELOPMENT_CONFIG.audio,
        },
        notifications: {
          ...baseConfig.notifications,
          ...DEVELOPMENT_CONFIG.notifications,
        },
      };
    } else if (process.env.NODE_ENV === 'production') {
      return {
        ...baseConfig,
        ...PRODUCTION_CONFIG,
        features: {
          ...baseConfig.features,
          ...PRODUCTION_CONFIG.features,
        },
        ui: {
          ...baseConfig.ui,
          ...PRODUCTION_CONFIG.ui,
        },
        audio: {
          ...baseConfig.audio,
          ...PRODUCTION_CONFIG.audio,
        },
        notifications: {
          ...baseConfig.notifications,
          ...PRODUCTION_CONFIG.notifications,
        },
      };
    }
    
    return baseConfig;
  }

  /**
   * 读取用户配置
   */
  private readUserConfig(): Partial<AppConfig> {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const stored = localStorage.getItem('userConfig');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      // 读取用户配置失败，忽略错误
      return {};
    }
  }

  /**
   * 读取环境变量配置
   */
  private readEnvConfig(): Partial<AppConfig> {
    const env: Partial<AppConfig> = {};

    // API配置
    if (process.env.NEXT_PUBLIC_API_URL) {
      env.apiUrl = process.env.NEXT_PUBLIC_API_URL;
    }
    
    if (process.env.NEXT_PUBLIC_API_TIMEOUT) {
      env.apiTimeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT, 10);
    }

    // 环境配置
    if (process.env.NODE_ENV) {
      env.environment = process.env.NODE_ENV as AppConfig['environment'];
    }

    // 应用信息
    if (process.env.NEXT_PUBLIC_APP_NAME) {
      env.appName = process.env.NEXT_PUBLIC_APP_NAME;
    }

    if (process.env.NEXT_PUBLIC_APP_VERSION) {
      env.version = process.env.NEXT_PUBLIC_APP_VERSION;
    }

    // 功能开关
    const features: Partial<AppConfig['features']> = {};
    if (process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS) {
      features.enableNotifications = process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === 'true';
    }
    if (process.env.NEXT_PUBLIC_ENABLE_SSE) {
      features.enableSSE = process.env.NEXT_PUBLIC_ENABLE_SSE === 'true';
    }
    if (process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE) {
      features.enableOfflineMode = process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true';
    }
    if (Object.keys(features).length > 0) {
      env.features = features as any;
    }

    // UI配置
    const ui: Partial<AppConfig['ui']> = {};
    if (process.env.NEXT_PUBLIC_THEME) {
      ui.theme = process.env.NEXT_PUBLIC_THEME as AppConfig['ui']['theme'];
    }
    if (process.env.NEXT_PUBLIC_LANGUAGE) {
      ui.language = process.env.NEXT_PUBLIC_LANGUAGE as AppConfig['ui']['language'];
    }
    if (process.env.NEXT_PUBLIC_SIDEBAR_WIDTH) {
      ui.sidebarWidth = parseInt(process.env.NEXT_PUBLIC_SIDEBAR_WIDTH, 10);
    }
    if (Object.keys(ui).length > 0) {
      env.ui = ui as any;
    }

    return env;
  }

  /**
   * 保存用户配置
   */
  private async saveUserConfig(config: Partial<AppConfig>): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const existing = this.readUserConfig();
      const updated = { ...existing, ...config };
      localStorage.setItem('userConfig', JSON.stringify(updated));
    } catch (error) {
      // 保存用户配置失败，忽略错误日志
      throw new Error('保存配置失败');
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(config: AppConfig): boolean {
    try {
      // API URL验证
      if (!config.apiUrl || !this.isValidUrl(config.apiUrl)) {
        // 配置验证失败: API URL无效
        return false;
      }

      // 超时时间验证
      if (config.apiTimeout < 1000 || config.apiTimeout > 120000) {
        // 配置验证失败: API超时时间必须在1-120秒之间
        return false;
      }

      // 环境验证
      if (!['development', 'production', 'test'].includes(config.environment)) {
        // 配置验证失败: 无效的环境类型
        return false;
      }

      // 侧边栏宽度验证
      if (config.ui.sidebarWidth < 180 || config.ui.sidebarWidth > 400) {
        // 配置验证失败: 侧边栏宽度必须在180-400px之间
        return false;
      }

      // 应用名称验证
      if (!config.appName || config.appName.trim().length === 0) {
        // 配置验证失败: 应用名称不能为空
        return false;
      }

      // 版本号格式验证（简单的语义版本检查）
      const versionRegex = /^\d+\.\d+\.\d+$/;
      if (!config.version || !versionRegex.test(config.version)) {
        // 配置验证失败: 版本号格式无效
        return false;
      }

      return true;
    } catch (error) {
      // 配置验证过程中发生错误，忽略错误日志
      return false;
    }
  }

  /**
   * URL有效性验证
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.getConfig());
      } catch (error) {
        // 配置监听器执行失败，忽略错误日志
      }
    });
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance();

// 导出便捷方法
export const getConfig = () => configManager.getConfig();
export const getApiUrl = () => configManager.get('apiUrl');
export const updateConfig = (config: Partial<AppConfig>) => configManager.updateConfig(config);
export const testConnection = (url?: string) => configManager.testConnection(url);
/**
 * API客户端
 * 使用配置管理器来处理API调用
 */

import { configManager } from './configManager';
import { apiRequest } from '@/utils/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiClient {
  private static instance: ApiClient;
  
  private constructor() {}
  
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * 获取API基础URL
   */
  private getBaseUrl(): string {
    return configManager.get('apiUrl');
  }

  /**
   * 获取请求超时时间
   */
  private getTimeout(): number {
    return configManager.get('apiTimeout');
  }

  /**
   * 通用请求方法
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const config = configManager.getConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.getTimeout());

    try {
      const url = `${this.getBaseUrl()}${endpoint}`;
      
      const response = await apiRequest(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: '请求超时',
          };
        }
        
        return {
          success: false,
          error: error.message,
        };
      }
      
      return {
        success: false,
        error: '未知错误',
      };
    }
  }

  /**
   * GET请求
   */
  public async get<T = any>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers,
    });
  }

  /**
   * POST请求
   */
  public async post<T = any>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT请求
   */
  public async put<T = any>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE请求
   */
  public async delete<T = any>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers,
    });
  }

  /**
   * 带认证的请求
   */
  public async authenticatedRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    token: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    const headers = {
      'Authorization': `Bearer ${token}`,
    };

    switch (method) {
      case 'GET':
        return this.get<T>(endpoint, headers);
      case 'POST':
        return this.post<T>(endpoint, data, headers);
      case 'PUT':
        return this.put<T>(endpoint, data, headers);
      case 'DELETE':
        return this.delete<T>(endpoint, headers);
      default:
        return {
          success: false,
          error: '不支持的HTTP方法',
        };
    }
  }
}

// 导出单例实例
export const apiClient = ApiClient.getInstance();
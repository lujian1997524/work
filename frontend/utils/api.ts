// API配置工具 - 支持Electron环境，使用环境配置管理
import { getApiBaseUrl } from './envConfig';

// 创建API请求函数
export const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const baseURL = getApiBaseUrl();
  const url = `${baseURL}${endpoint}`;
  
  console.log(`🌐 API请求: ${url}`);
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

// 检查是否在Electron环境
export const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && window.location.protocol === 'file:';
};

// 检查localStorage是否可用
export const isLocalStorageAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.localStorage;
};
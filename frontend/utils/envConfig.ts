// 前端环境配置管理
// 专注于前端连接后端的配置，支持分离部署

interface FrontendConfig {
  // 后端连接配置
  BACKEND_URL: string;
  API_TIMEOUT: number;
  
  // 前端配置
  DEV_MODE: boolean;
  FRONTEND_PORT: string;
}

/**
 * 获取前端配置
 * 支持分离部署：前端和后端可以在不同服务器上
 */
export const getFrontendConfig = (): FrontendConfig => {
  // 后端地址配置 - 支持完整URL或主机+端口
  let BACKEND_URL: string;
  
  const backendFullUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendFullUrl) {
    // 如果配置了完整URL，直接使用（用于分离部署）
    BACKEND_URL = backendFullUrl.replace(/\/$/, ''); // 移除末尾斜杠
  } else {
    // 否则使用主机+端口组合（用于本地开发）
    const host = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost';
    const port = process.env.NEXT_PUBLIC_BACKEND_PORT || '35001';
    BACKEND_URL = `http://${host}:${port}`;
  }
  
  return {
    BACKEND_URL,
    API_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
    DEV_MODE: process.env.NODE_ENV === 'development',
    FRONTEND_PORT: process.env.NEXT_PUBLIC_FRONTEND_PORT || '4000'
  };
};

/**
 * 获取后端API基础URL
 */
export const getApiBaseUrl = (): string => {
  return getFrontendConfig().BACKEND_URL;
};

/**
 * 构建完整API URL
 */
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * 记录当前配置信息（调试用）
 */
export const logFrontendConfig = (): void => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const config = getFrontendConfig();
    console.log('🔧 前端配置信息:', {
      环境: process.env.NODE_ENV,
      后端API地址: config.BACKEND_URL,
      API超时: config.API_TIMEOUT + 'ms',
      开发模式: config.DEV_MODE,
      前端端口: config.FRONTEND_PORT
    });
  }
};

// 默认导出配置对象
const frontendConfig = getFrontendConfig();
export default frontendConfig;
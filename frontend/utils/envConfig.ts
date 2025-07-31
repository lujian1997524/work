// 环境配置管理模块
// 这个文件统一管理所有IP地址和端口配置

interface EnvironmentConfig {
  // 服务器配置
  BACKEND_HOST: string;
  BACKEND_PORT: string;
  FRONTEND_HOST: string;
  FRONTEND_PORT: string;
  
  // 派生的URL
  BACKEND_URL: string;
  FRONTEND_URL: string;
  
  // 其他配置
  API_TIMEOUT: number;
  DEV_MODE: boolean;
}

/**
 * 获取环境配置
 * 支持多种部署场景：本地开发、局域网部署、云服务器部署
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  // 从环境变量读取配置，提供默认值
  const BACKEND_HOST = process.env.NEXT_PUBLIC_BACKEND_HOST || '192.168.31.134';
  const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || '35001';
  const FRONTEND_HOST = process.env.NEXT_PUBLIC_FRONTEND_HOST || '192.168.31.134';
  const FRONTEND_PORT = process.env.NEXT_PUBLIC_FRONTEND_PORT || '4000';
  
  const config: EnvironmentConfig = {
    BACKEND_HOST,
    BACKEND_PORT,
    FRONTEND_HOST,
    FRONTEND_PORT,
    
    // 自动构建完整URL
    BACKEND_URL: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
    FRONTEND_URL: `http://${FRONTEND_HOST}:${FRONTEND_PORT}`,
    
    // 其他配置
    API_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000'),
    DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE === 'true',
  };
  
  return config;
};

/**
 * 获取API基础URL
 * 直连模式 - 返回后端基础URL，不包含/api路径
 */
export const getApiBaseUrl = (): string => {
  const config = getEnvironmentConfig();
  return config.BACKEND_URL;
};

/**
 * 获取完整的后端URL（包含协议和端口）
 */
export const getBackendUrl = (): string => {
  const config = getEnvironmentConfig();
  return config.BACKEND_URL;
};

/**
 * 获取可能的后端URL列表（用于连接检测）
 */
export const getPossibleBackendUrls = (): string[] => {
  const config = getEnvironmentConfig();
  
  return [
    config.BACKEND_URL,
    'http://localhost:35001',
    'http://127.0.0.1:35001'
  ];
};

/**
 * 检测可用的后端地址
 */
export async function detectAvailableBackend(): Promise<string | null> {
  // 检查是否在Electron环境
  if (typeof window === 'undefined' || !(window as any).ELECTRON_ENV) {
    return null;
  }

  const possibleUrls = getPossibleBackendUrls();

  console.log('🔍 开始检测可用的后端地址...');

  for (const url of possibleUrls) {
    try {
      console.log(`⚡ 检测: ${url}`);
      const startTime = Date.now();
      
      // 尝试访问健康检查端点
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 设置较短的超时时间
        signal: AbortSignal.timeout(3000)
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        console.log(`✅ 后端可用: ${url} (响应时间: ${responseTime}ms)`);
        // 更新全局变量
        (window as any).BACKEND_URL = url;
        return url;
      } else {
        console.log(`❌ 后端不可用: ${url} (状态码: ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ 连接失败: ${url} (错误: ${error})`);
    }
  }

  console.log('❌ 所有后端地址都不可用');
  return null;
}

/**
 * 带重试的后端检测
 */
export async function detectBackendWithRetry(maxRetries: number = 3): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    console.log(`🔄 第 ${i + 1} 次尝试检测后端...`);
    const result = await detectAvailableBackend();
    if (result) {
      return result;
    }
    
    if (i < maxRetries - 1) {
      console.log('⏳ 等待 2 秒后重试...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return null;
}

/**
 * 记录当前配置信息（调试用）
 */
export const logCurrentConfig = (): void => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const config = getEnvironmentConfig();
    console.log('🔧 环境配置信息:', {
      环境: process.env.NODE_ENV,
      前端地址: config.FRONTEND_URL,
      后端地址: config.BACKEND_URL,
      API基础URL: getApiBaseUrl(),
      开发模式: config.DEV_MODE,
      API超时: config.API_TIMEOUT + 'ms'
    });
  }
};

// 默认导出配置对象
const config = getEnvironmentConfig();
export default config;

import { apiRequest } from '@/utils/api';

interface BackendDetectionResult {
  url: string;
  available: boolean;
  responseTime?: number;
}

export async function detectAvailableBackend(): Promise<string | null> {
  // 检查是否在Electron环境
  if (typeof window === 'undefined' || !(window as any).ELECTRON_ENV) {
    return null;
  }

  const possibleUrls = (window as any).POSSIBLE_BACKEND_URLS || [
    'http://192.168.31.134:35001',
    'http://localhost:35001',
    'http://127.0.0.1:35001'
  ];

  console.log('🔍 开始检测可用的后端地址...');

  for (const url of possibleUrls) {
    try {
      console.log(`⚡ 检测: ${url}`);
      const startTime = Date.now();
      
      // 尝试访问健康检查端点
      const response = await apiRequest(`${url}/health`, {
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

// 获取当前配置的后端URL
export function getBackendUrl(): string {
  if (typeof window !== 'undefined' && (window as any).BACKEND_URL) {
    return (window as any).BACKEND_URL;
  }
  
  // 回退到默认值
  return 'http://192.168.31.134:35001';
}

// 带重试的后端检测
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
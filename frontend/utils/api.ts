// API配置工具 - Web应用环境，使用环境配置管理
import { getApiBaseUrl } from './envConfig';

// 扩展RequestInit接口以支持params
interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

// 创建API请求函数
export const apiRequest = async (
  endpoint: string, 
  options: ApiRequestOptions = {}
): Promise<Response> => {
  const baseURL = getApiBaseUrl();
  
  // 处理查询参数
  let url = `${baseURL}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  // 从options中提取params，避免传递给fetch
  const { params, ...fetchOptions } = options;
  
  // 检查是否是FormData，如果是则不设置Content-Type
  const isFormData = fetchOptions.body instanceof FormData;
  
  let headers: Record<string, string> = {};
  
  // 只有非FormData请求才设置默认Content-Type
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  // 合并用户提供的headers，但对于FormData请求，删除任何Content-Type
  if (fetchOptions.headers) {
    const userHeaders = fetchOptions.headers as Record<string, string>;
    Object.keys(userHeaders).forEach(key => {
      if (isFormData && key.toLowerCase() === 'content-type') {
        // FormData请求时忽略Content-Type header
        return;
      }
      headers[key] = userHeaders[key];
    });
  }
  
  try {
    // 在浏览器环境中使用标准fetch
    return await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (error: any) {
    throw error;
  }
};

// 检查localStorage是否可用
export const isLocalStorageAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.localStorage;
};
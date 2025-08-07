// API 配置 - 全部使用直连方式
// 优先使用完整URL配置，兜底使用主机+端口配置
const API_BASE_URL = (() => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.log('🔧 使用完整URL配置:', process.env.NEXT_PUBLIC_BACKEND_URL);
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost';
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '35001';
  const url = `http://${backendHost}:${backendPort}`;
  
  console.log('🔧 使用主机+端口配置:', { backendHost, backendPort, url });
  return url;
})();

export { API_BASE_URL };

// API 请求封装
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // 检查是否是 FormData，如果是则不设置任何 Content-Type
  const isFormData = options.body instanceof FormData;
  
  // 构建headers，确保FormData请求时不包含Content-Type
  let headers: Record<string, string> = {};
  
  if (!isFormData) {
    // 非FormData请求设置默认Content-Type
    headers['Content-Type'] = 'application/json';
  }
  
  // 合并用户提供的headers，但对于FormData请求，删除任何Content-Type
  if (options.headers) {
    const userHeaders = options.headers as Record<string, string>;
    Object.keys(userHeaders).forEach(key => {
      if (isFormData && key.toLowerCase() === 'content-type') {
        // FormData请求时忽略Content-Type header
        return;
      }
      headers[key] = userHeaders[key];
    });
  }
  
  const defaultOptions: RequestInit = {
    headers,
    ...options,
  };

  console.log(`📡 API 请求: ${options.method || 'GET'} ${url}`);
  if (isFormData) {
    console.log('📦 FormData请求，不设置Content-Type');
  }
  
  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ API 请求失败 ${url}:`, error);
    throw error;
  }
};

export default API_BASE_URL;
// 激光切割生产管理系统 - 统一配置常量
// 这个文件定义了所有默认配置值，避免硬编码

/**
 * 生产环境服务器配置
 */
const PRODUCTION_SERVER = {
  HOST: '110.40.71.83',
  BACKEND_PORT: '35001',
  FRONTEND_PORT: '4000',
  DATABASE_PORT: '3306'
};

/**
 * 开发环境服务器配置  
 */
const DEVELOPMENT_SERVER = {
  HOST: 'localhost',
  BACKEND_PORT: '35001', 
  FRONTEND_PORT: '4000',
  DATABASE_PORT: '3330'
};

/**
 * 获取默认服务器配置
 * @param {boolean} isProduction - 是否为生产环境
 * @returns {object} 服务器配置对象
 */
function getDefaultServerConfig(isProduction = false) {
  return isProduction ? PRODUCTION_SERVER : DEVELOPMENT_SERVER;
}

/**
 * 构建服务器URL
 * @param {string} host - 主机地址
 * @param {string} port - 端口号
 * @param {string} protocol - 协议 (http|https)
 * @returns {string} 完整URL
 */
function buildServerUrl(host, port, protocol = 'http') {
  return `${protocol}://${host}:${port}`;
}

/**
 * 获取默认后端URL
 * @param {boolean} isProduction - 是否为生产环境
 * @returns {string} 后端URL
 */
function getDefaultBackendUrl(isProduction = false) {
  const config = getDefaultServerConfig(isProduction);
  return buildServerUrl(config.HOST, config.BACKEND_PORT);
}

/**
 * 获取默认前端URL
 * @param {boolean} isProduction - 是否为生产环境
 * @returns {string} 前端URL
 */
function getDefaultFrontendUrl(isProduction = false) {
  const config = getDefaultServerConfig(isProduction);
  return buildServerUrl(config.HOST, config.FRONTEND_PORT);
}

/**
 * 数据库默认配置
 */
const DATABASE_DEFAULTS = {
  DEVELOPMENT: {
    HOST: 'localhost',
    PORT: '3330',
    NAME: 'laser_cutting_db',
    USER: 'laser_user', 
    PASSWORD: 'laser_pass'
  },
  PRODUCTION: {
    HOST: 'localhost',
    PORT: '3306',
    NAME: 'laser_cutting_db',
    USER: 'laser_user',
    PASSWORD: 'your_production_password'
  }
};

/**
 * API相关默认配置
 */
const API_DEFAULTS = {
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

/**
 * JWT默认配置
 */
const JWT_DEFAULTS = {
  SECRET: 'laser_cutting_jwt_secret_key_2024',
  EXPIRES_IN: '24h'
};

// Node.js环境导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PRODUCTION_SERVER,
    DEVELOPMENT_SERVER,
    DATABASE_DEFAULTS,
    API_DEFAULTS,
    JWT_DEFAULTS,
    getDefaultServerConfig,
    buildServerUrl,
    getDefaultBackendUrl,
    getDefaultFrontendUrl
  };
}

// 浏览器环境导出
if (typeof window !== 'undefined') {
  window.LaserCuttingConfig = {
    PRODUCTION_SERVER,
    DEVELOPMENT_SERVER,
    API_DEFAULTS,
    getDefaultServerConfig,
    buildServerUrl,
    getDefaultBackendUrl,
    getDefaultFrontendUrl
  };
}
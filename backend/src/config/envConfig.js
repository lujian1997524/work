// 后端环境配置管理
// 专注于后端服务自身配置，支持分离部署

require('dotenv').config();

/**
 * 获取服务器配置
 */
const getServerConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    HOST: process.env.BACKEND_HOST || '0.0.0.0', // 0.0.0.0允许外部访问
    PORT: parseInt(process.env.PORT || '35001'),
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // CORS配置需要的前端地址
    FRONTEND_ORIGINS: getFrontendOrigins(),
  };
};

/**
 * 获取前端允许的源地址（用于CORS配置）
 * 支持分离部署：前端可能在不同域名/端口
 */
const getFrontendOrigins = () => {
  const origins = [];
  
  // 从环境变量获取前端地址
  if (process.env.FRONTEND_URL) {
    // 完整URL配置（用于分离部署）
    origins.push(process.env.FRONTEND_URL);
  } else if (process.env.FRONTEND_HOST && process.env.FRONTEND_PORT) {
    // 主机+端口配置
    const frontendUrl = `http://${process.env.FRONTEND_HOST}:${process.env.FRONTEND_PORT}`;
    origins.push(frontendUrl);
  }
  
  // 添加常用的本地开发地址
  origins.push(
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:3000', // Next.js默认端口
  );
  
  // 自定义CORS源
  if (process.env.CORS_ORIGINS) {
    const customOrigins = process.env.CORS_ORIGINS.split(',').map(origin => origin.trim());
    origins.push(...customOrigins);
  }
  
  // 去重
  return [...new Set(origins)];
};

/**
 * 获取数据库配置
 */
const getDatabaseConfig = () => {
  return {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '3330'),
    DATABASE: process.env.DB_NAME || 'laser_cutting_db',
    USERNAME: process.env.DB_USER || 'laser_user',
    PASSWORD: process.env.DB_PASSWORD || 'laser_pass',
  };
};

/**
 * 获取JWT配置
 */
const getJWTConfig = () => {
  return {
    SECRET: process.env.JWT_SECRET || 'laser_cutting_jwt_secret_key_2024',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h'
  };
};

/**
 * 获取文件上传配置
 */
const getUploadConfig = () => {
  return {
    MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760'), // 10MB
    ALLOWED_TYPES: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,application/pdf,application/dwg,application/dxf').split(','),
    UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads'
  };
};

/**
 * 获取完整的后端配置
 */
const getBackendConfig = () => {
  const server = getServerConfig();
  
  return {
    server,
    database: getDatabaseConfig(),
    jwt: getJWTConfig(),
    upload: getUploadConfig(),
    cors: {
      origins: server.FRONTEND_ORIGINS
    },
    
    // 环境标识
    isDevelopment: server.NODE_ENV === 'development',
    isProduction: server.NODE_ENV === 'production',
  };
};

/**
 * 记录配置信息（开发环境）
 */
const logBackendConfig = () => {
  const config = getBackendConfig();
  
  if (config.isDevelopment) {
    console.log('🔧 后端配置信息:');
    console.log(`📡 服务器地址: http://${config.server.HOST}:${config.server.PORT}`);
    console.log(`🗄️ 数据库: ${config.database.HOST}:${config.database.PORT}/${config.database.DATABASE}`);
    console.log(`✅ 允许的前端源: ${config.cors.origins.join(', ')}`);
    console.log(`📂 上传目录: ${config.upload.UPLOAD_PATH}`);
    console.log(`⚙️ 环境: ${config.server.NODE_ENV}`);
  }
};

module.exports = {
  getBackendConfig,
  getServerConfig,
  getDatabaseConfig,
  getJWTConfig,
  getUploadConfig,
  getFrontendOrigins,
  logBackendConfig
};
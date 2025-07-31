// 后端环境配置管理模块
// 使用统一的配置常量，避免硬编码

const path = require('path');
require('dotenv').config();

// 导入统一配置常量
const CONFIG_DEFAULTS = {
  PRODUCTION_HOST: '110.40.71.83',
  DEVELOPMENT_HOST: 'localhost',
  BACKEND_PORT: '35001',
  FRONTEND_PORT: '4000',
  DB_PORT_DEV: '3330',
  DB_PORT_PROD: '3306'
};

/**
 * 服务器配置
 */
const getServerConfig = () => {
  // 检测是否为生产环境
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 根据环境选择默认主机地址  
  const defaultHost = isProduction ? CONFIG_DEFAULTS.PRODUCTION_HOST : CONFIG_DEFAULTS.DEVELOPMENT_HOST;
  
  return {
    // 服务器地址和端口
    HOST: process.env.BACKEND_HOST || defaultHost,
    PORT: parseInt(process.env.PORT || CONFIG_DEFAULTS.BACKEND_PORT),
    
    // 前端地址（用于CORS配置）
    FRONTEND_HOST: process.env.FRONTEND_HOST || defaultHost,
    FRONTEND_PORT: process.env.FRONTEND_PORT || CONFIG_DEFAULTS.FRONTEND_PORT,
    
    // 环境
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // 完整URL
    get BACKEND_URL() {
      return `http://${this.HOST}:${this.PORT}`;
    },
    
    get FRONTEND_URL() {
      return `http://${this.FRONTEND_HOST}:${this.FRONTEND_PORT}`;
    }
  };
};

/**
 * 数据库配置
 */
const getDatabaseConfig = () => {
  // 检测是否为生产环境
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 根据环境选择默认端口
  const defaultPort = isProduction ? CONFIG_DEFAULTS.DB_PORT_PROD : CONFIG_DEFAULTS.DB_PORT_DEV;
  
  return {
    HOST: process.env.DB_HOST || CONFIG_DEFAULTS.DEVELOPMENT_HOST,
    PORT: parseInt(process.env.DB_PORT || defaultPort),
    DATABASE: process.env.DB_NAME || 'laser_cutting_db',
    USERNAME: process.env.DB_USER || 'laser_user',
    PASSWORD: process.env.DB_PASSWORD || 'laser_pass',
    
    // 完整连接URL
    get CONNECTION_URL() {
      return `mysql://${this.USERNAME}:${this.PASSWORD}@${this.HOST}:${this.PORT}/${this.DATABASE}`;
    }
  };
};

/**
 * CORS配置 - 允许的源地址
 */
const getAllowedOrigins = () => {
  const serverConfig = getServerConfig();
  
  const origins = [
    serverConfig.FRONTEND_URL,  // 主前端地址
    'http://localhost:4000',    // 本地开发
    'http://127.0.0.1:4000',    // 本地开发
  ];
  
  // 如果有自定义CORS源，添加到列表中
  if (process.env.CORS_ORIGINS) {
    const customOrigins = process.env.CORS_ORIGINS.split(',').map(origin => origin.trim());
    origins.push(...customOrigins);
  }
  
  return origins;
};

/**
 * JWT配置
 */
const getJWTConfig = () => {
  return {
    SECRET: process.env.JWT_SECRET || 'laser_cutting_jwt_secret_key_2024',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h'
  };
};

/**
 * 文件上传配置
 */
const getUploadConfig = () => {
  return {
    MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760'), // 10MB
    ALLOWED_TYPES: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,application/pdf,application/dwg,application/dxf').split(','),
    UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads'
  };
};

/**
 * 获取完整配置对象
 */
const getConfig = () => {
  const server = getServerConfig();
  const database = getDatabaseConfig();
  
  return {
    server,
    database,
    jwt: getJWTConfig(),
    upload: getUploadConfig(),
    cors: {
      origins: getAllowedOrigins()
    },
    
    // 便捷访问常用配置
    isDevelopment: server.NODE_ENV === 'development',
    isProduction: server.NODE_ENV === 'production',
  };
};

/**
 * 打印配置信息（开发环境）
 */
const logConfig = () => {
  const config = getConfig();
  
  if (config.isDevelopment) {
    console.log('🔧 后端配置信息:');
    console.log(`📡 服务器地址: ${config.server.BACKEND_URL}`);
    console.log(`🌐 前端地址: ${config.server.FRONTEND_URL}`);
    console.log(`🗄️ 数据库: ${config.database.HOST}:${config.database.PORT}/${config.database.DATABASE}`);
    console.log(`✅ 允许的CORS源: ${config.cors.origins.join(', ')}`);
    console.log(`📂 上传路径: ${config.upload.UPLOAD_PATH}`);
  }
};

module.exports = {
  getConfig,
  getServerConfig,
  getDatabaseConfig,
  getAllowedOrigins,
  getJWTConfig,
  getUploadConfig,
  logConfig
};
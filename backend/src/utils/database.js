const { Sequelize } = require('sequelize');
require('dotenv').config();

// 创建Sequelize实例
const sequelize = new Sequelize(
  process.env.DB_NAME || 'laser_cutting_db',
  process.env.DB_USER || 'laser_user', 
  process.env.DB_PASSWORD || 'laser_pass',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3330,
    dialect: 'mysql',
    timezone: '+08:00', // 设置为北京时间
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
);

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
  }
};

module.exports = {
  sequelize,
  testConnection
};
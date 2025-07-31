require('dotenv').config();
const { sequelize } = require('./src/utils/database');
const models = require('./src/models');

async function syncDatabase() {
  try {
    console.log('开始同步数据库模型...');
    
    // 同步所有模型到数据库
    await sequelize.sync({ force: false, alter: true });
    
    console.log('✅ 数据库模型同步成功');
    
    // 创建测试用户
    const { User } = models;
    
    // 检查是否已有用户，避免重复插入
    const existingUsers = await User.findAll();
    
    if (existingUsers.length === 0) {
      await User.bulkCreate([
        { name: '高春强', role: 'admin' },
        { name: '杨伟', role: 'operator' },
        { name: '高长春', role: 'operator' }
      ]);
      
      console.log('✅ 测试用户创建成功');
    } else {
      console.log('📋 数据库中已有用户，跳过用户创建');
    }
    
    // 显示所有用户
    const users = await User.findAll();
    console.log('👥 当前用户列表:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.role})`);
    });
    
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

syncDatabase();
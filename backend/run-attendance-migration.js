const { sequelize } = require('./src/models');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('开始执行考勤系统数据库迁移...');
    
    // 读取迁移脚本
    const migrationPath = path.join(__dirname, '../database/migrations/attendance_enhancement_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // 按分号分割SQL语句
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`发现 ${statements.length} 条SQL语句需要执行`);
    
    // 逐条执行SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // 跳过注释和空语句
      if (statement.startsWith('--') || statement.trim() === '') {
        continue;
      }
      
      try {
        console.log(`执行第 ${i + 1} 条语句...`);
        await sequelize.query(statement);
      } catch (error) {
        console.warn(`第 ${i + 1} 条语句执行警告:`, error.message);
        // 继续执行，因为有些语句可能会因为已存在而报错
      }
    }
    
    console.log('数据库迁移执行完成!');
    
    // 验证迁移结果
    console.log('\n验证迁移结果:');
    
    // 检查表结构
    const [results] = await sequelize.query("DESCRIBE attendance_exceptions");
    console.log('attendance_exceptions 表结构:');
    results.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(可空)' : '(必填)'}`);
    });
    
    // 检查新字段是否存在
    const newFields = ['overtime_minutes', 'overtime_start_time', 'overtime_end_time', 'early_leave_time', 'early_leave_reason', 'late_arrival_time', 'late_arrival_reason'];
    const existingFields = results.map(col => col.Field);
    
    console.log('\n新字段检查:');
    newFields.forEach(field => {
      const exists = existingFields.includes(field);
      console.log(`  - ${field}: ${exists ? '✓ 已添加' : '✗ 缺失'}`);
    });
    
  } catch (error) {
    console.error('数据库迁移失败:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

runMigration();
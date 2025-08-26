// 系统性检查操作记录问题的诊断脚本
const path = require('path');

// 设置正确的工作目录
process.chdir(path.join(__dirname, 'backend'));

console.log('1. 检查数据库模型加载...');
try {
  const { OperationHistory } = require('./src/models');
  console.log('✅ OperationHistory模型加载成功');
  console.log('   - 表名:', OperationHistory.tableName);
  console.log('   - 操作类型枚举:', OperationHistory.rawAttributes.operationType.values);
  
  // 检查是否包含我们新增的类型
  const hasNewType = OperationHistory.rawAttributes.operationType.values.includes('material_dimension_transfer');
  console.log('   - 包含material_dimension_transfer:', hasNewType ? '✅' : '❌');
} catch (error) {
  console.error('❌ 模型加载失败:', error.message);
}

console.log('\n2. 检查操作记录工具函数...');
try {
  const { recordMaterialDimensionTransfer } = require('./src/utils/operationHistory');
  console.log('✅ recordMaterialDimensionTransfer函数导入成功');
  console.log('   - 函数类型:', typeof recordMaterialDimensionTransfer);
} catch (error) {
  console.error('❌ 工具函数导入失败:', error.message);
}

console.log('\n3. 检查数据库连接...');
async function checkDatabase() {
  try {
    const { sequelize } = require('./src/utils/database');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 检查operation_history表是否存在
    const [results] = await sequelize.query("SHOW TABLES LIKE 'operation_history'");
    if (results.length > 0) {
      console.log('✅ operation_history表存在');
      
      // 检查表结构
      const [columns] = await sequelize.query("DESCRIBE operation_history");
      console.log('   - 表字段:', columns.map(col => col.Field).join(', '));
      
      // 检查操作类型枚举
      const [enumInfo] = await sequelize.query("SHOW COLUMNS FROM operation_history LIKE 'operation_type'");
      if (enumInfo.length > 0) {
        console.log('   - 操作类型枚举:', enumInfo[0].Type);
      }
      
      // 查询最近的操作记录
      const [recentOps] = await sequelize.query("SELECT * FROM operation_history ORDER BY created_at DESC LIMIT 5");
      console.log(`   - 最近${recentOps.length}条记录:`, recentOps.map(op => op.operation_type));
      
    } else {
      console.log('❌ operation_history表不存在');
    }
    
  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
  }
}

console.log('\n4. 测试操作记录函数...');
async function testRecordFunction() {
  try {
    const { recordMaterialDimensionTransfer } = require('./src/utils/operationHistory');
    
    const testData = {
      fromDimensionId: 999,
      toDimensionId: 1000,
      materialType: '测试材料',
      thickness: 3,
      unit: 'mm',
      width: 1200,
      height: 800,
      quantity: 1,
      fromWorkerName: '测试源工人',
      toWorkerName: '测试目标工人',
      notes: '系统诊断测试'
    };
    
    const result = await recordMaterialDimensionTransfer(testData, 1, '系统诊断');
    
    if (result) {
      console.log('✅ 操作记录测试成功');
      console.log('   - 记录ID:', result.id);
      console.log('   - 操作类型:', result.operationType);
      console.log('   - 操作描述:', result.operationDescription);
      
      // 验证数据库中的记录
      const { OperationHistory } = require('./src/models');
      const dbRecord = await OperationHistory.findByPk(result.id);
      if (dbRecord) {
        console.log('✅ 数据库验证成功，记录已保存');
        console.log('   - 项目ID:', dbRecord.projectId);
        console.log('   - 详细信息:', JSON.stringify(dbRecord.details, null, 2));
      } else {
        console.log('❌ 数据库验证失败，记录未找到');
      }
      
    } else {
      console.log('❌ 操作记录测试失败，返回null');
    }
  } catch (error) {
    console.error('❌ 操作记录测试失败:', error.message);
    console.error('   - 详细错误:', error.stack);
  }
}

async function runDiagnostics() {
  await checkDatabase();
  await testRecordFunction();
  process.exit(0);
}

runDiagnostics().catch(error => {
  console.error('❌ 诊断失败:', error);
  process.exit(1);
});
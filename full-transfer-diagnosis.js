// 完整的转移操作记录诊断脚本
const path = require('path');

// 设置正确的工作目录
process.chdir(path.join(__dirname, 'backend'));

console.log('🔍 开始完整的转移操作记录诊断...\n');

async function fullDiagnostics() {
  try {
    // 1. 检查数据库连接和表结构
    console.log('1️⃣ 检查数据库连接和表结构...');
    const { sequelize } = require('./src/utils/database');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    // 检查operation_history表结构
    const [tables] = await sequelize.query("SHOW TABLES LIKE 'operation_history'");
    if (tables.length === 0) {
      console.log('❌ operation_history表不存在');
      return;
    }
    console.log('✅ operation_history表存在');

    // 检查表结构
    const [columns] = await sequelize.query("DESCRIBE operation_history");
    console.log('   - 表字段:', columns.map(col => `${col.Field}(${col.Type})`).join(', '));

    // 2. 检查模型定义
    console.log('\n2️⃣ 检查模型定义...');
    const { OperationHistory } = require('./src/models');
    const operationTypes = OperationHistory.rawAttributes.operationType.values;
    console.log('   - 可用操作类型:', operationTypes);
    
    const hasTransferType = operationTypes.includes('material_dimension_transfer');
    console.log('   - 包含转移类型:', hasTransferType ? '✅' : '❌');

    // 3. 检查工具函数
    console.log('\n3️⃣ 检查操作记录工具函数...');
    const { recordMaterialDimensionTransfer } = require('./src/utils/operationHistory');
    console.log('✅ recordMaterialDimensionTransfer函数导入成功');

    // 4. 测试操作记录函数
    console.log('\n4️⃣ 测试操作记录函数...');
    const testTransferData = {
      fromDimensionId: 999,
      toDimensionId: 1000,
      materialType: '测试材料',
      thickness: 3,
      unit: 'mm',
      width: 1200,
      height: 800,
      quantity: 2,
      fromWorkerName: '测试源工人',
      toWorkerName: '测试目标工人',
      notes: '系统诊断测试记录'
    };

    const recordResult = await recordMaterialDimensionTransfer(testTransferData, 1, '系统诊断员');
    
    if (recordResult) {
      console.log('✅ 操作记录创建成功');
      console.log('   - 记录ID:', recordResult.id);
      console.log('   - 操作类型:', recordResult.operationType);
      console.log('   - 操作描述:', recordResult.operationDescription);
      console.log('   - 项目ID:', recordResult.projectId);
      console.log('   - 详细信息:', JSON.stringify(recordResult.details, null, 2));

      // 验证数据库记录
      const dbRecord = await OperationHistory.findByPk(recordResult.id);
      if (dbRecord) {
        console.log('✅ 数据库记录验证成功');
      } else {
        console.log('❌ 数据库记录验证失败');
      }

      // 5. 测试操作历史查询API
      console.log('\n5️⃣ 测试操作历史查询API...');
      const recentRecords = await OperationHistory.findAll({
        where: {
          operationType: 'material_dimension_transfer'
        },
        limit: 5,
        order: [['created_at', 'DESC']]
      });

      console.log(`   - 找到 ${recentRecords.length} 条转移记录`);
      
      if (recentRecords.length > 0) {
        console.log('   - 最近的转移记录:');
        recentRecords.forEach((record, index) => {
          console.log(`     ${index + 1}. ID:${record.id} - ${record.operationDescription}`);
          console.log(`        时间: ${record.created_at}`);
          console.log(`        详情: ${record.details?.fromWorkerName} → ${record.details?.toWorkerName}`);
        });
      } else {
        console.log('   - ❌ 没有找到转移记录');
      }

      // 6. 检查API路由注册
      console.log('\n6️⃣ 检查API路由注册...');
      try {
        const express = require('express');
        const materialDimensionsRoutes = require('./src/routes/material-dimensions');
        
        // 检查路由是否包含transfer端点
        const routerStack = materialDimensionsRoutes.stack;
        const hasTransferRoute = routerStack.some(layer => 
          layer.route && layer.route.path === '/transfer' && layer.route.methods.post
        );
        
        console.log('✅ material-dimensions路由模块加载成功');
        console.log('   - 包含/transfer端点:', hasTransferRoute ? '✅' : '❌');
        
      } catch (error) {
        console.error('❌ 路由检查失败:', error.message);
      }

      // 7. 查看所有操作记录统计
      console.log('\n7️⃣ 操作记录统计...');
      const [stats] = await sequelize.query(`
        SELECT 
          operation_type,
          COUNT(*) as count
        FROM operation_history 
        GROUP BY operation_type
        ORDER BY count DESC
      `);
      
      console.log('   - 各类型操作记录数量:');
      stats.forEach(stat => {
        console.log(`     ${stat.operation_type}: ${stat.count}条`);
      });

      // 清理测试记录
      await OperationHistory.destroy({
        where: { id: recordResult.id }
      });
      console.log('\n🧹 测试记录已清理');

    } else {
      console.log('❌ 操作记录创建失败');
    }

    console.log('\n✅ 诊断完成！');

  } catch (error) {
    console.error('❌ 诊断过程中出错:', error);
    console.error('详细错误:', error.stack);
  } finally {
    process.exit(0);
  }
}

fullDiagnostics();
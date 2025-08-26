// 测试板材转移操作记录功能
const { recordMaterialDimensionTransfer } = require('./backend/src/utils/operationHistory');

async function testTransferHistory() {
  console.log('开始测试板材转移操作记录...');
  
  const transferData = {
    fromDimensionId: 1,
    toDimensionId: 2,
    materialType: '碳板',
    thickness: 3,
    unit: 'mm',
    width: 1200,
    height: 800,
    quantity: 5,
    fromWorkerName: '张三',
    toWorkerName: '李四',
    notes: '测试转移记录'
  };
  
  try {
    const result = await recordMaterialDimensionTransfer(transferData, 1, '管理员');
    
    if (result) {
      console.log('✅ 板材转移操作记录成功创建:');
      console.log(`   - 操作类型: ${result.operationType}`);
      console.log(`   - 操作描述: ${result.operationDescription}`);
      console.log(`   - 详细信息: ${JSON.stringify(result.details, null, 2)}`);
    } else {
      console.log('❌ 板材转移操作记录创建失败');
    }
  } catch (error) {
    console.error('❌ 测试出错:', error.message);
  }
}

// 仅在直接运行此脚本时执行测试
if (require.main === module) {
  testTransferHistory().then(() => {
    console.log('测试完成');
    process.exit(0);
  }).catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });
}

module.exports = { testTransferHistory };
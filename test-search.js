// 搜索功能测试脚本
const testSearches = [
  '3mm',      // 厚度搜索
  '碳板',     // 材料类型搜索
  '库存',     // 库存搜索
  '张三',     // 工人搜索
  '项目',     // 项目搜索
  '钢板',     // 特殊材料搜索
];

async function testSearch(query) {
  try {
    console.log(`\n🔍 测试搜索: "${query}"`);
    
    const response = await fetch(`http://localhost:35001/api/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': 'Bearer your-test-token',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ 搜索失败: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ 搜索成功, 总结果数: ${data.totalCount}`);
    console.log(`   - 项目: ${data.projects?.length || 0} 个`);
    console.log(`   - 工人: ${data.workers?.length || 0} 个`);
    console.log(`   - 部门: ${data.departments?.length || 0} 个`);
    console.log(`   - 图纸: ${data.drawings?.length || 0} 个`);
    console.log(`   - 库存: ${data.materials?.length || 0} 个`);
    
    // 显示前几个结果
    if (data.materials && data.materials.length > 0) {
      console.log(`   📦 库存结果示例:`);
      data.materials.slice(0, 2).forEach(item => {
        console.log(`     - ${item.name}: ${item.description}`);
      });
    }
    
    if (data.projects && data.projects.length > 0) {
      console.log(`   📋 项目结果示例:`);
      data.projects.slice(0, 2).forEach(item => {
        const materialCount = item.materials?.length || 0;
        console.log(`     - ${item.name}: ${item.status} (${materialCount}种材料)`);
      });
    }
    
  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 开始搜索功能增强测试...\n');
  
  for (const query of testSearches) {
    await testSearch(query);
    await new Promise(resolve => setTimeout(resolve, 500)); // 避免请求过快
  }
  
  console.log('\n✨ 搜索功能增强测试完成!');
}

// 如果作为脚本运行
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testSearch, runTests };
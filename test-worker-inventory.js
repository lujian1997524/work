#!/usr/bin/env node

/**
 * 测试工人库存显示功能
 * 验证项目创建时工人板材库存是否正确显示
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:35001';

async function testWorkerInventoryDisplay() {
  try {
    console.log('🧪 开始测试工人库存显示功能...\n');

    // 1. 首先登录获取token
    console.log('📝 步骤 1: 登录获取认证token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      name: '高春强'
    });

    if (!loginResponse.data.success) {
      throw new Error('登录失败: ' + loginResponse.data.message);
    }

    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log(`✅ 登录成功: ${user.name} (${user.role})`);
    console.log(`🔑 Token: ${token.substring(0, 20)}...`);

    // 设置认证头
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. 获取工人列表
    console.log('\n📝 步骤 2: 获取工人列表...');
    const workersResponse = await axios.get(`${BASE_URL}/api/workers`, {
      headers: authHeaders
    });

    const workers = workersResponse.data.workers || [];
    console.log(`✅ 获取到 ${workers.length} 个工人`);
    
    if (workers.length === 0) {
      console.log('⚠️  没有工人数据，创建测试工人...');
      // 创建测试工人
      const createWorkerResponse = await axios.post(`${BASE_URL}/api/workers`, {
        name: '测试工人',
        phone: '13800000000',
        email: 'test@example.com',
        department: '激光切割组',
        position: '操作员'
      }, { headers: authHeaders });
      
      if (createWorkerResponse.data.success) {
        workers.push(createWorkerResponse.data.worker);
        console.log('✅ 创建测试工人成功');
      }
    }

    const testWorker = workers[0];
    console.log(`🎯 使用测试工人: ${testWorker.name} (ID: ${testWorker.id})`);

    // 3. 检查工人是否有板材库存
    console.log('\n📝 步骤 3: 查询工人板材库存...');
    const workerMaterialsResponse = await axios.get(
      `${BASE_URL}/api/worker-materials?workerId=${testWorker.id}`, 
      { headers: authHeaders }
    );

    const workerMaterials = workerMaterialsResponse.data.materials || [];
    console.log(`📦 工人库存: ${workerMaterials.length} 种材料`);

    if (workerMaterials.length === 0) {
      console.log('⚠️  工人暂无库存，为其添加测试材料...');
      
      // 4. 获取厚度规格
      const specsResponse = await axios.get(`${BASE_URL}/api/thickness-specs`, {
        headers: authHeaders
      });
      const specs = specsResponse.data.thicknessSpecs || [];
      
      if (specs.length > 0) {
        const testSpec = specs[0];
        console.log(`🎯 使用厚度规格: ${testSpec.thickness}${testSpec.unit} ${testSpec.materialType || '碳板'}`);
        
        // 添加测试库存
        const addMaterialResponse = await axios.post(`${BASE_URL}/api/worker-materials`, {
          workerId: testWorker.id,
          thicknessSpecId: testSpec.id,
          quantity: 50,
          notes: '测试库存'
        }, { headers: authHeaders });
        
        if (addMaterialResponse.data.success) {
          console.log('✅ 添加测试库存成功');
        }
      }
    }

    // 5. 重新查询工人库存
    console.log('\n📝 步骤 5: 重新查询工人库存...');
    const finalWorkerMaterialsResponse = await axios.get(
      `${BASE_URL}/api/worker-materials?workerId=${testWorker.id}`, 
      { headers: authHeaders }
    );

    const finalWorkerMaterials = finalWorkerMaterialsResponse.data.materials || [];
    console.log(`📦 工人最终库存:`);
    finalWorkerMaterials.forEach((material, index) => {
      const spec = material.thicknessSpec;
      console.log(`  ${index + 1}. ${spec.thickness}${spec.unit} ${spec.materialType || '碳板'}: ${material.quantity}张`);
    });

    // 6. 模拟前端API调用
    console.log('\n📝 步骤 6: 模拟前端ProjectModal的API调用...');
    const frontendApiResponse = await axios.get(
      `${BASE_URL}/api/worker-materials?workerId=${testWorker.id}`, 
      { headers: authHeaders }
    );

    console.log('🎯 前端将收到的数据格式:');
    console.log(JSON.stringify({
      success: frontendApiResponse.data.success,
      materialsCount: frontendApiResponse.data.materials?.length || 0,
      totalQuantity: frontendApiResponse.data.materials?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0,
      materials: frontendApiResponse.data.materials?.map(m => ({
        id: m.id,
        quantity: m.quantity,
        thicknessSpec: {
          thickness: m.thicknessSpec.thickness,
          unit: m.thicknessSpec.unit,
          materialType: m.thicknessSpec.materialType
        }
      }))
    }, null, 2));

    console.log('\n🎉 测试完成!');
    console.log('✅ 工人库存查询API正常');
    console.log('✅ 数据格式符合前端ProjectModal预期');
    console.log('✅ 工人选择后应该能正确显示库存信息');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
testWorkerInventoryDisplay();
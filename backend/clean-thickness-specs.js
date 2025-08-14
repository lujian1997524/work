const { sequelize } = require('./src/utils/database');
const ThicknessSpec = require('./src/models/ThicknessSpec');

// 预设厚度规格定义
const presetSpecs = [
  // 碳板 (sortOrder: 1000 + thickness)
  { thickness: 2, materialType: '碳板', sortOrder: 1002 },
  { thickness: 3, materialType: '碳板', sortOrder: 1003 },
  { thickness: 4, materialType: '碳板', sortOrder: 1004 },
  { thickness: 5, materialType: '碳板', sortOrder: 1005 },
  { thickness: 6, materialType: '碳板', sortOrder: 1006 },
  { thickness: 8, materialType: '碳板', sortOrder: 1008 },
  { thickness: 10, materialType: '碳板', sortOrder: 1010 },
  { thickness: 12, materialType: '碳板', sortOrder: 1012 },
  { thickness: 16, materialType: '碳板', sortOrder: 1016 },
  { thickness: 20, materialType: '碳板', sortOrder: 1020 },
  { thickness: 25, materialType: '碳板', sortOrder: 1025 },
  { thickness: 30, materialType: '碳板', sortOrder: 1030 },
  
  // 锰板 (sortOrder: 2000 + thickness)
  { thickness: 6, materialType: '锰板', sortOrder: 2006 },
  { thickness: 8, materialType: '锰板', sortOrder: 2008 },
  { thickness: 10, materialType: '锰板', sortOrder: 2010 },
  { thickness: 12, materialType: '锰板', sortOrder: 2012 },
  { thickness: 16, materialType: '锰板', sortOrder: 2016 },
  { thickness: 20, materialType: '锰板', sortOrder: 2020 },
  
  // 不锈钢 (sortOrder: 3000 + thickness)
  { thickness: 2, materialType: '不锈钢', sortOrder: 3002 },
  { thickness: 4, materialType: '不锈钢', sortOrder: 3004 },
  { thickness: 6, materialType: '不锈钢', sortOrder: 3006 },
  { thickness: 8, materialType: '不锈钢', sortOrder: 3008 }
];

async function cleanNonPresetThicknessSpecs() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    console.log('开始清理非预设厚度规格...');
    
    // 创建预设规格的查找集合，用于快速判断
    const presetSpecsSet = new Set();
    presetSpecs.forEach(spec => {
      presetSpecsSet.add(`${spec.materialType}_${spec.thickness}`);
    });
    
    // 获取所有现有的厚度规格
    const allSpecs = await ThicknessSpec.findAll();
    console.log(`当前数据库中共有 ${allSpecs.length} 个厚度规格`);
    
    // 统计信息
    let deletedCount = 0;
    let keptCount = 0;
    let updatedCount = 0;
    const deletedSpecs = [];
    const keptSpecs = [];
    
    // 检查每个规格
    for (const spec of allSpecs) {
      const specKey = `${spec.materialType}_${spec.thickness}`;
      const isPreset = presetSpecsSet.has(specKey);
      
      if (isPreset) {
        // 是预设规格，保留并更新排序
        const presetSpec = presetSpecs.find(p => 
          p.materialType === spec.materialType && p.thickness === parseFloat(spec.thickness)
        );
        
        if (presetSpec && spec.sortOrder !== presetSpec.sortOrder) {
          await spec.update({ sortOrder: presetSpec.sortOrder });
          console.log(`✓ 更新排序: ${spec.materialType} ${spec.thickness}mm (排序: ${spec.sortOrder} → ${presetSpec.sortOrder})`);
          updatedCount++;
        } else {
          console.log(`✓ 保留: ${spec.materialType} ${spec.thickness}mm (排序: ${spec.sortOrder})`);
        }
        
        keptSpecs.push(`${spec.materialType} ${spec.thickness}mm`);
        keptCount++;
      } else {
        // 不是预设规格，需要删除
        console.log(`✗ 准备删除: ${spec.materialType} ${spec.thickness}mm (ID: ${spec.id})`);
        deletedSpecs.push(`${spec.materialType} ${spec.thickness}mm`);
        
        try {
          // 先删除相关的工人材料记录
          await sequelize.query(
            'DELETE FROM worker_materials WHERE thickness_spec_id = ?',
            { replacements: [spec.id] }
          );
          
          // 再删除厚度规格
          await spec.destroy();
          console.log(`  → 删除成功`);
          deletedCount++;
        } catch (error) {
          console.error(`  → 删除失败: ${error.message}`);
        }
      }
    }
    
    // 确保所有预设规格都存在
    console.log('\n检查缺失的预设规格...');
    let addedCount = 0;
    
    for (const presetSpec of presetSpecs) {
      const existing = await ThicknessSpec.findOne({
        where: {
          thickness: presetSpec.thickness,
          materialType: presetSpec.materialType
        }
      });
      
      if (!existing) {
        await ThicknessSpec.create({
          thickness: presetSpec.thickness,
          unit: 'mm',
          materialType: presetSpec.materialType,
          isActive: true,
          sortOrder: presetSpec.sortOrder
        });
        console.log(`+ 添加缺失的预设规格: ${presetSpec.materialType} ${presetSpec.thickness}mm`);
        addedCount++;
      }
    }
    
    console.log('\n=== 清理完成 ===');
    console.log(`保留规格: ${keptCount} 个`);
    console.log(`删除规格: ${deletedCount} 个`);
    console.log(`更新排序: ${updatedCount} 个`);
    console.log(`添加规格: ${addedCount} 个`);
    
    if (deletedSpecs.length > 0) {
      console.log('\n已删除的规格:');
      deletedSpecs.forEach(spec => console.log(`  - ${spec}`));
    }
    
    console.log('\n当前预设厚度规格 (按排序):');
    const finalSpecs = await ThicknessSpec.findAll({
      order: [['sortOrder', 'ASC'], ['thickness', 'ASC']]
    });
    
    finalSpecs.forEach(spec => {
      console.log(`${spec.materialType} ${spec.thickness}mm (排序: ${spec.sortOrder})`);
    });
    
  } catch (error) {
    console.error('清理厚度规格失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 运行清理
console.log('⚠️  警告：此脚本将删除所有非预设的厚度规格！');
console.log('预设规格包括:');
console.log('- 碳板: 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 30mm');
console.log('- 锰板: 6, 8, 10, 12, 16, 20mm');
console.log('- 不锈钢: 2, 4, 6, 8mm');
console.log('');

// 5秒倒计时
let countdown = 5;
const timer = setInterval(() => {
  if (countdown > 0) {
    console.log(`${countdown} 秒后开始清理...`);
    countdown--;
  } else {
    clearInterval(timer);
    cleanNonPresetThicknessSpecs();
  }
}, 1000);
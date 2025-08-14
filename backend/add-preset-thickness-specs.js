const { sequelize } = require('./src/utils/database');
const ThicknessSpec = require('./src/models/ThicknessSpec');

// 预设厚度规格数据
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

async function addPresetThicknessSpecs() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    console.log('正在检查和添加预设厚度规格...');
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const spec of presetSpecs) {
      try {
        // 检查是否已存在相同的厚度和材料类型
        const existing = await ThicknessSpec.findOne({
          where: {
            thickness: spec.thickness,
            materialType: spec.materialType
          }
        });
        
        if (existing) {
          console.log(`跳过已存在: ${spec.materialType} ${spec.thickness}mm`);
          skippedCount++;
          
          // 更新排序值（如果不同）
          if (existing.sortOrder !== spec.sortOrder) {
            await existing.update({ sortOrder: spec.sortOrder });
            console.log(`  → 更新排序值: ${existing.sortOrder} → ${spec.sortOrder}`);
          }
        } else {
          await ThicknessSpec.create({
            thickness: spec.thickness,
            unit: 'mm',
            materialType: spec.materialType,
            isActive: true,
            sortOrder: spec.sortOrder
          });
          console.log(`✓ 添加: ${spec.materialType} ${spec.thickness}mm (排序: ${spec.sortOrder})`);
          addedCount++;
        }
      } catch (error) {
        console.error(`添加 ${spec.materialType} ${spec.thickness}mm 时出错:`, error.message);
      }
    }
    
    console.log(`\n预设厚度规格处理完成！`);
    console.log(`新增: ${addedCount} 个，跳过: ${skippedCount} 个`);
    
    console.log('\n当前所有厚度规格（按排序）：');
    const allSpecs = await ThicknessSpec.findAll({
      order: [['sortOrder', 'ASC'], ['thickness', 'ASC']]
    });
    
    allSpecs.forEach(spec => {
      console.log(`${spec.materialType} ${spec.thickness}mm (排序: ${spec.sortOrder})`);
    });
    
  } catch (error) {
    console.error('处理预设厚度规格失败:', error);
  } finally {
    await sequelize.close();
  }
}

addPresetThicknessSpecs();
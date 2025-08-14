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

async function createPresetThicknessSpecs() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 清空现有数据（可选）
    console.log('正在清理现有厚度规格数据...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.query('DELETE FROM thickness_specs');
    await sequelize.query('DELETE FROM worker_materials');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    // 创建预设厚度规格
    console.log('正在创建预设厚度规格...');
    for (const spec of presetSpecs) {
      await ThicknessSpec.create({
        thickness: spec.thickness,
        unit: 'mm',
        materialType: spec.materialType,
        isActive: true,
        sortOrder: spec.sortOrder
      });
      console.log(`创建: ${spec.materialType} ${spec.thickness}mm (排序: ${spec.sortOrder})`);
    }
    
    console.log('\n预设厚度规格创建完成！');
    console.log('\n排序效果：');
    const allSpecs = await ThicknessSpec.findAll({
      order: [['sortOrder', 'ASC']]
    });
    
    allSpecs.forEach(spec => {
      console.log(`${spec.materialType} ${spec.thickness}mm (排序: ${spec.sortOrder})`);
    });
    
  } catch (error) {
    console.error('创建预设厚度规格失败:', error);
  } finally {
    await sequelize.close();
  }
}

createPresetThicknessSpecs();
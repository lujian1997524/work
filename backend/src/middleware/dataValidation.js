const { WorkerMaterial, Material, MaterialDimension, ThicknessSpec } = require('../models');

/**
 * 数据一致性校验中间件
 * 确保板材管理系统中的数据一致性
 */

/**
 * 验证工人材料数据一致性
 * 现在WorkerMaterial不再有quantity字段，这个验证不再需要
 */
const validateWorkerMaterialConsistency = async (req, res, next) => {
  try {
    // WorkerMaterial表已经不再有quantity字段，跳过验证
    console.log('数据一致性验证: WorkerMaterial不再维护quantity字段，跳过验证');
    next();
  } catch (error) {
    console.error('数据一致性验证失败:', error);
    next();
  }
};

/**
 * 验证项目材料分配一致性
 * 检查项目材料是否正确关联到工人材料
 */
const validateProjectMaterialAllocation = async (req, res, next) => {
  try {
    const { materialId } = req.params || req.body;
    
    if (materialId) {
      const projectMaterial = await Material.findByPk(materialId, {
        include: [{
          model: WorkerMaterial,
          as: 'assignedFromWorkerMaterial',
          include: [{
            model: ThicknessSpec,
            as: 'thicknessSpec'
          }]
        }, {
          model: ThicknessSpec,
          as: 'thicknessSpec'
        }]
      });
      
      if (projectMaterial && projectMaterial.assignedFromWorkerMaterial) {
        // 验证厚度规格匹配
        if (projectMaterial.thicknessSpecId !== projectMaterial.assignedFromWorkerMaterial.thicknessSpecId) {
          return res.status(400).json({
            error: '数据一致性错误：项目材料与工人材料的厚度规格不匹配',
            details: {
              projectThicknessSpecId: projectMaterial.thicknessSpecId,
              workerMaterialThicknessSpecId: projectMaterial.assignedFromWorkerMaterial.thicknessSpecId
            }
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('项目材料分配一致性验证失败:', error);
    next();
  }
};

/**
 * 验证板材分配数量一致性
 * 确保分配的数量不超过可用库存
 */
const validateAllocationQuantity = async (req, res, next) => {
  try {
    const { workerMaterialId, dimensionId, allocateQuantity } = req.body;
    
    if (workerMaterialId && allocateQuantity) {
      const workerMaterial = await WorkerMaterial.findByPk(workerMaterialId, {
        include: [{
          model: MaterialDimension,
          as: 'dimensions'
        }]
      });
      
      if (!workerMaterial) {
        return res.status(404).json({
          error: '工人材料记录不存在'
        });
      }
      
      // 验证分配数量
      if (dimensionId) {
        // 从特定尺寸分配
        const dimension = workerMaterial.dimensions?.find(d => d.id === dimensionId);
        if (!dimension) {
          return res.status(404).json({
            error: '指定的尺寸记录不存在'
          });
        }
        
        if (dimension.quantity < allocateQuantity) {
          return res.status(400).json({
            error: `尺寸库存不足，可用数量: ${dimension.quantity}，请求数量: ${allocateQuantity}`
          });
        }
      } else {
        // 从总库存分配 - 从MaterialDimension计算总量
        const totalAvailable = workerMaterial.dimensions?.reduce((sum, dim) => sum + dim.quantity, 0) || 0;
        if (totalAvailable < allocateQuantity) {
          return res.status(400).json({
            error: `工人材料库存不足，可用数量: ${totalAvailable}，请求数量: ${allocateQuantity}`
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('分配数量验证失败:', error);
    res.status(500).json({
      error: '数据验证失败',
      message: error.message
    });
  }
};

/**
 * 清理无效数据
 * 删除无尺寸记录的工人材料记录
 */
const cleanupEmptyWorkerMaterials = async (req, res, next) => {
  try {
    // 查找无尺寸记录的工人材料
    const emptyWorkerMaterials = await WorkerMaterial.findAll({
      include: [{
        model: MaterialDimension,
        as: 'dimensions',
        required: false
      }]
    });
    
    let cleanedCount = 0;
    for (const workerMaterial of emptyWorkerMaterials) {
      if (!workerMaterial.dimensions || workerMaterial.dimensions.length === 0) {
        await workerMaterial.destroy();
        cleanedCount++;
        console.log(`清理空的工人材料记录: ID ${workerMaterial.id}`);
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`数据清理完成: 删除了 ${cleanedCount} 个空的工人材料记录`);
    }
    
    next();
  } catch (error) {
    console.error('数据清理失败:', error);
    next();
  }
};

/**
 * 验证厚度规格关联一致性
 * 确保所有材料记录都关联到有效的厚度规格
 */
const validateThicknessSpecConsistency = async (req, res, next) => {
  try {
    const { thicknessSpecId } = req.body;
    
    if (thicknessSpecId) {
      const thicknessSpec = await ThicknessSpec.findByPk(thicknessSpecId);
      
      if (!thicknessSpec) {
        return res.status(404).json({
          error: '指定的厚度规格不存在'
        });
      }
      
      if (!thicknessSpec.isActive) {
        return res.status(400).json({
          error: '指定的厚度规格已被禁用',
          thicknessSpec: {
            id: thicknessSpec.id,
            thickness: thicknessSpec.thickness,
            materialType: thicknessSpec.materialType,
            isActive: thicknessSpec.isActive
          }
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('厚度规格验证失败:', error);
    next();
  }
};

/**
 * 综合数据一致性检查（用于定期任务）
 */
const performConsistencyCheck = async () => {
  try {
    console.log('开始执行数据一致性检查...');
    
    // WorkerMaterial不再有quantity字段，只需清理无尺寸记录的材料记录
    const emptyWorkerMaterials = await WorkerMaterial.findAll({
      include: [{
        model: MaterialDimension,
        as: 'dimensions',
        required: false
      }]
    });
    
    let deletedCount = 0;
    for (const workerMaterial of emptyWorkerMaterials) {
      if (!workerMaterial.dimensions || workerMaterial.dimensions.length === 0) {
        await workerMaterial.destroy();
        deletedCount++;
        console.log(`删除空的工人材料记录: ID ${workerMaterial.id}`);
      }
    }
    
    console.log(`数据一致性检查完成: 删除了 ${deletedCount} 个空记录`);
    
    return {
      fixed: 0, // 不再需要修复quantity字段
      deleted: deletedCount,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('数据一致性检查失败:', error);
    throw error;
  }
};

module.exports = {
  validateWorkerMaterialConsistency,
  validateProjectMaterialAllocation,
  validateAllocationQuantity,
  cleanupEmptyWorkerMaterials,
  validateThicknessSpecConsistency,
  performConsistencyCheck
};
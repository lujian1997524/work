const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { 
  validateWorkerMaterialConsistency,
  validateThicknessSpecConsistency,
  cleanupEmptyWorkerMaterials
} = require('../middleware/dataValidation');
const { Worker, WorkerMaterial, ThicknessSpec, MaterialDimension, Department } = require('../models');
const { recordMaterialTransfer } = require('../utils/operationHistory');

/**
 * 获取所有工人的板材库存概览
 * GET /api/worker-materials
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { workerId } = req.query;

    // 如果指定了工人ID，返回该工人的材料
    if (workerId) {
      const workerMaterials = await WorkerMaterial.findAll({
        where: { 
          workerId: parseInt(workerId)
        },
        include: [
          {
            model: ThicknessSpec,
            as: 'thicknessSpec',
            attributes: ['id', 'thickness', 'unit', 'materialType', 'sortOrder']
          },
          {
            model: Worker,
            as: 'worker',
            attributes: ['id', 'name', 'department']
          }
        ],
        order: [['thicknessSpec', 'sortOrder', 'ASC']]
      });

      return res.json({
        success: true,
        materials: await Promise.all(workerMaterials.map(async (wm) => {
          // 从MaterialDimension计算实际总量
          const dimensions = await MaterialDimension.findAll({
            where: { workerMaterialId: wm.id }
          });
          const totalQuantity = dimensions.reduce((sum, dim) => sum + dim.quantity, 0);
          
          return {
            ...wm.toJSON(),
            quantity: totalQuantity,
            dimensions
          };
        }))
      });
    }

    // 获取所有活跃工人及其板材
    const workers = await Worker.findAll({
      where: { status: 'active' },
      include: [
        {
          model: Department,
          as: 'departmentInfo',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: WorkerMaterial,
          as: 'materials',
          required: false,
          include: [
            {
              model: ThicknessSpec,
              as: 'thicknessSpec'
            },
            {
              model: MaterialDimension,
              as: 'dimensions',
              required: false
            }
          ]
        }
      ],
      order: [['name', 'ASC']]
    });

    // 获取所有厚度规格用于表头
    const thicknessSpecs = await ThicknessSpec.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC']]
    });

    // 格式化数据为表格结构
    const tableData = await Promise.all(workers.map(async (worker) => {
      const row = {
        workerId: worker.id,
        workerName: worker.name,
        department: worker.departmentInfo?.name || '未分配',
        phone: worker.phone,
        materials: {}
      };

      // 为每种厚度规格创建列
      for (const spec of thicknessSpecs) {
        const key = `${spec.materialType || '碳板'}_${spec.thickness}mm`;
        const workerMaterial = worker.materials.find(
          m => m.thicknessSpecId === spec.id
        );
        
        if (workerMaterial) {
          // 从MaterialDimension计算实际总量
          const dimensions = await MaterialDimension.findAll({
            where: { workerMaterialId: workerMaterial.id }
          });
          const totalQuantity = dimensions.reduce((sum, dim) => sum + dim.quantity, 0);
          
          row.materials[key] = {
            quantity: totalQuantity,
            id: workerMaterial.id,
            notes: workerMaterial.notes,
            dimensions: dimensions.map(dim => ({
              id: dim.id,
              width: parseFloat(dim.width),
              height: parseFloat(dim.height),
              quantity: dim.quantity,
              notes: dim.notes,
              dimensionLabel: `${dim.width}×${dim.height}mm`
            }))
          };
        } else {
          row.materials[key] = {
            quantity: 0,
            id: null,
            notes: null,
            dimensions: []
          };
        }
      }

      return row;
    }));

    // 生成材质编码
    const getMaterialCode = (materialType, thickness) => {
      const typeMap = {
        '碳板': 'T',
        '不锈钢': 'B', 
        '锰板': 'M'
      };
      const code = typeMap[materialType] || materialType?.charAt(0).toUpperCase() || 'T';
      return `${code}${thickness}`;
    };

    res.json({
      success: true,
      workers: tableData,
      thicknessSpecs: thicknessSpecs.map(spec => ({
        id: spec.id,
        key: `${spec.materialType || '碳板'}_${spec.thickness}mm`,
        materialType: spec.materialType || '碳板',
        thickness: spec.thickness,
        unit: spec.unit,
        code: getMaterialCode(spec.materialType, spec.thickness),
        label: `${spec.thickness}${spec.unit}${spec.materialType || '碳板'}`
      }))
    });

  } catch (error) {
    console.error('获取板材库存失败:', error);
    res.status(500).json({
      success: false,
      message: '获取板材库存失败',
      error: error.message
    });
  }
});

/**
 * 获取特定工人的详细板材信息
 * GET /api/worker-materials/:workerId
 */
router.get('/:workerId', authenticate, async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findByPk(workerId, {
      include: [
        {
          model: Department,
          as: 'departmentInfo',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: WorkerMaterial,
          as: 'materials',
          order: [['materialType', 'ASC'], ['thickness', 'ASC']]
        }
      ]
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: '工人不存在'
      });
    }

    res.json({
      success: true,
      worker: {
        id: worker.id,
        name: worker.name,
        department: worker.departmentInfo?.name || '未分配',
        phone: worker.phone,
        materials: worker.materials
      }
    });

  } catch (error) {
    console.error('获取工人板材详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工人板材详情失败',
      error: error.message
    });
  }
});

/**
 * 添加或更新工人板材
 * POST /api/worker-materials
 */
router.post('/', 
  authenticate, 
  validateThicknessSpecConsistency,
  async (req, res) => {
  try {
    const {
      workerId,
      thicknessSpecId,
      materialType,  // 兼容旧API
      thickness,     // 兼容旧API
      quantity,
      notes
    } = req.body;

    // 验证必填字段
    if (!workerId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段：工人ID、数量'
      });
    }

    // 验证工人是否存在
    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: '工人不存在'
      });
    }

    let finalThicknessSpecId = thicknessSpecId;

    // 如果没有提供 thicknessSpecId，通过 materialType 和 thickness 查找或创建
    if (!finalThicknessSpecId && materialType && thickness) {
      let thicknessSpec = await ThicknessSpec.findOne({
        where: {
          materialType: materialType,
          thickness: parseFloat(thickness).toFixed(3), // 支持3位小数精度
          isActive: true
        }
      });

      if (!thicknessSpec) {
        // 如果厚度规格不存在，自动创建新的厚度规格
        console.log(`🔧 自动创建新的厚度规格: ${materialType} ${thickness}mm`);
        
        // 计算排序顺序（按厚度从小到大）
        const maxSortOrder = await ThicknessSpec.max('sortOrder', {
          where: { materialType: materialType, isActive: true }
        }) || 0;
        
        thicknessSpec = await ThicknessSpec.create({
          thickness: parseFloat(thickness).toFixed(3),
          unit: 'mm',
          materialType: materialType,
          isActive: true,
          sortOrder: maxSortOrder + 10 // 给新规格留一些排序空间
        });
        
        console.log(`✅ 新厚度规格创建成功: ID=${thicknessSpec.id}`);
      }

      finalThicknessSpecId = thicknessSpec.id;
    }

    if (!finalThicknessSpecId) {
      return res.status(400).json({
        success: false,
        message: '必须提供厚度规格ID或材质类型和厚度'
      });
    }

    // 验证厚度规格是否存在
    const thicknessSpec = await ThicknessSpec.findByPk(finalThicknessSpecId);
    if (!thicknessSpec) {
      return res.status(404).json({
        success: false,
        message: '厚度规格不存在'
      });
    }

    // 查找是否已存在相同规格的板材
    const existingMaterial = await WorkerMaterial.findOne({
      where: {
        workerId,
        thicknessSpecId: finalThicknessSpecId
      }
    });

    let material;
    if (existingMaterial) {
      // 更新现有记录 - 不再使用quantity字段
      existingMaterial.notes = notes;
      await existingMaterial.save();
      material = existingMaterial;
    } else {
      // 创建新记录 - 不再使用quantity字段
      material = await WorkerMaterial.create({
        workerId,
        thicknessSpecId: finalThicknessSpecId,
        notes
      });
    }

    // 重新获取数据包含关联信息
    const materialWithAssociations = await WorkerMaterial.findByPk(material.id, {
      include: [
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'name', 'department']
        },
        {
          model: ThicknessSpec,
          as: 'thicknessSpec',
          attributes: ['id', 'thickness', 'unit', 'materialType']
        }
      ]
    });

    res.json({
      success: true,
      message: existingMaterial ? '板材关系已更新' : '板材关系已添加',
      material: materialWithAssociations
    });

  } catch (error) {
    console.error('添加/更新板材失败:', error);
    res.status(500).json({
      success: false,
      message: '添加/更新板材失败',
      error: error.message
    });
  }
});

/**
 * 更新板材关系信息（不再操作数量）
 * PUT /api/worker-materials/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const material = await WorkerMaterial.findByPk(id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: '板材记录不存在'
      });
    }

    if (notes !== undefined) {
      material.notes = notes;
    }

    await material.save();

    res.json({
      success: true,
      message: '板材信息已更新',
      material
    });

  } catch (error) {
    console.error('更新板材失败:', error);
    res.status(500).json({
      success: false,
      message: '更新板材失败',
      error: error.message
    });
  }
});

/**
 * 删除板材记录
 * DELETE /api/worker-materials/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const material = await WorkerMaterial.findByPk(id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: '板材记录不存在'
      });
    }

    await material.destroy();

    res.json({
      success: true,
      message: '板材记录已删除'
    });

  } catch (error) {
    console.error('删除板材失败:', error);
    res.status(500).json({
      success: false,
      message: '删除板材失败',
      error: error.message
    });
  }
});

/**
 * 板材转移（从一个工人转移给另一个工人）
 * POST /api/worker-materials/transfer
 */
router.post('/transfer', authenticate, async (req, res) => {
  try {
    const {
      fromWorkerId,
      toWorkerId,
      thicknessSpecId,  // 使用thicknessSpecId而不是materialType和thickness
      transferQuantity,
      notes
    } = req.body;

    // 验证参数
    if (!fromWorkerId || !toWorkerId || !thicknessSpecId || !transferQuantity) {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：源工人ID、目标工人ID、厚度规格ID、转移数量'
      });
    }

    console.log(`🔄 开始板材转移: ${fromWorkerId} -> ${toWorkerId}, 厚度规格: ${thicknessSpecId}, 数量: ${transferQuantity}`);

    // 验证厚度规格存在
    const thicknessSpec = await ThicknessSpec.findByPk(thicknessSpecId);
    if (!thicknessSpec) {
      return res.status(404).json({
        success: false,
        message: '厚度规格不存在'
      });
    }

    // 查找源工人的板材（使用正确的关联查询）
    const sourceMaterial = await WorkerMaterial.findOne({
      where: {
        workerId: fromWorkerId,
        thicknessSpecId: thicknessSpecId
      },
      include: [{
        model: Worker,
        as: 'worker',
        attributes: ['id', 'name']
      }]
    });

    console.log('🔍 源板材查询结果:', sourceMaterial ? '找到' : '未找到');

    if (!sourceMaterial) {
      return res.status(404).json({
        success: false,
        message: `源工人没有该规格的板材 (${thicknessSpec.materialType || '碳板'} ${thicknessSpec.thickness}${thicknessSpec.unit})`
      });
    }

    // 获取源工人该厚度的所有尺寸库存
    const sourceDimensions = await MaterialDimension.findAll({
      where: { workerMaterialId: sourceMaterial.id }
    });

    const totalSourceQuantity = sourceDimensions.reduce((sum, dim) => sum + dim.quantity, 0);
    console.log(`📦 源工人库存: ${totalSourceQuantity}张`);

    const transferQty = parseInt(transferQuantity);
    if (totalSourceQuantity < transferQty) {
      return res.status(400).json({
        success: false,
        message: `转移数量 ${transferQty} 超过可用库存 ${totalSourceQuantity}`
      });
    }

    // 验证目标工人存在
    const targetWorker = await Worker.findByPk(toWorkerId);
    if (!targetWorker) {
      return res.status(404).json({
        success: false,
        message: '目标工人不存在'
      });
    }

    // 按比例从各个尺寸中扣减库存
    let transferredDimensions = [];
    let remainingToTransfer = transferQty;
    
    for (let i = 0; i < sourceDimensions.length && remainingToTransfer > 0; i++) {
      const dim = sourceDimensions[i];
      let dimensionTransfer;
      
      if (i === sourceDimensions.length - 1) {
        // 最后一个尺寸转移剩余的所有数量
        dimensionTransfer = remainingToTransfer;
      } else {
        // 按比例分配
        dimensionTransfer = Math.min(
          Math.floor((dim.quantity / totalSourceQuantity) * transferQty),
          dim.quantity,
          remainingToTransfer
        );
      }
      
      if (dimensionTransfer > 0) {
        // 更新源尺寸数量
        const newQuantity = dim.quantity - dimensionTransfer;
        if (newQuantity === 0) {
          await dim.destroy();
        } else {
          await dim.update({ quantity: newQuantity });
        }
        
        // 记录转移的尺寸信息
        transferredDimensions.push({
          width: dim.width,
          height: dim.height,
          quantity: dimensionTransfer,
          notes: dim.notes
        });
        
        remainingToTransfer -= dimensionTransfer;
        console.log(`📤 从尺寸 ${dim.width}×${dim.height} 转移 ${dimensionTransfer}张`);
      }
    }

    // 查找或创建目标工人的板材记录
    let targetMaterial = await WorkerMaterial.findOne({
      where: {
        workerId: toWorkerId,
        thicknessSpecId: thicknessSpecId
      }
    });

    if (targetMaterial) {
      // 目标工人已有该厚度规格，更新备注
      if (notes) {
        targetMaterial.notes = notes;
        await targetMaterial.save();
      }
      console.log(`📥 目标工人已有该厚度规格的板材记录`);
    } else {
      // 创建新的板材记录
      targetMaterial = await WorkerMaterial.create({
        workerId: toWorkerId,
        thicknessSpecId: thicknessSpecId,
        notes: notes || null
      });
      console.log(`📥 为目标工人创建新的板材记录`);
    }

    // 为目标工人创建对应的MaterialDimension记录
    if (transferredDimensions.length > 0) {
      for (const dimInfo of transferredDimensions) {
        // 查找目标工人是否已有相同尺寸的记录
        const existingTargetDimension = await MaterialDimension.findOne({
          where: {
            workerMaterialId: targetMaterial.id,
            width: dimInfo.width,
            height: dimInfo.height
          }
        });

        if (existingTargetDimension) {
          // 如果已存在，累加数量
          await existingTargetDimension.update({
            quantity: existingTargetDimension.quantity + dimInfo.quantity
          });
        } else {
          // 如果不存在，创建新记录
          await MaterialDimension.create({
            workerMaterialId: targetMaterial.id,
            width: dimInfo.width,
            height: dimInfo.height,
            quantity: dimInfo.quantity,
            notes: dimInfo.notes
          });
        }
      }
    }

    // 检查源工人是否还有该厚度的库存，如果没有则删除WorkerMaterial记录
    const remainingSourceDimensions = await MaterialDimension.findAll({
      where: { workerMaterialId: sourceMaterial.id }
    });
    const remainingSourceQuantity = remainingSourceDimensions.reduce((sum, dim) => sum + dim.quantity, 0);
    
    if (remainingSourceQuantity === 0) {
      await sourceMaterial.destroy();
      console.log('🗑️ 源工人板材记录已删除（无剩余库存）');
    }

    // 同时处理MaterialDimension的转移（如果存在详细尺寸记录）
    const dimensionsTransferred = transferredDimensions.length;

    res.json({
      success: true,
      message: `成功转移 ${transferQty} 张 ${thicknessSpec.materialType || '碳板'} ${thicknessSpec.thickness}${thicknessSpec.unit} 板材${dimensionsTransferred > 0 ? `，包含 ${dimensionsTransferred} 个尺寸规格` : ''}`,
      transfer: {
        fromWorker: sourceMaterial.worker.name,
        toWorker: targetWorker.name,
        materialSpec: `${thicknessSpec.materialType || '碳板'} ${thicknessSpec.thickness}${thicknessSpec.unit}`,
        quantity: transferQty,
        dimensionsTransferred,
        transferredDimensions: transferredDimensions
      }
    });

  } catch (error) {
    console.error('板材转移失败:', error);
    res.status(500).json({
      success: false,
      message: '板材转移失败',
      error: error.message
    });
  }
});

// 辅助函数：转移MaterialDimension记录
router.transferMaterialDimensions = async function(sourceWorkerMaterialId, targetWorkerMaterialId, transferQuantity) {
  try {
    // 这里暂时简化处理，如果需要详细的尺寸转移逻辑，可以在MaterialDimension模块中实现
    return 0;
  } catch (error) {
    console.warn('MaterialDimension转移失败，但主转移继续:', error.message);
    return 0;
  }
};

/**
 * 数据一致性检查API
 * POST /api/worker-materials/consistency-check
 */
router.post('/consistency-check', authenticate, async (req, res) => {
  try {
    const { performConsistencyCheck } = require('../middleware/dataValidation');
    
    const result = await performConsistencyCheck();
    
    res.json({
      success: true,
      message: '数据一致性检查完成',
      result
    });
  } catch (error) {
    console.error('数据一致性检查失败:', error);
    res.status(500).json({
      success: false,
      error: '数据一致性检查失败',
      message: error.message
    });
  }
});

module.exports = router;
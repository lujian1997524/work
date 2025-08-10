const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { MaterialDimension, WorkerMaterial, Worker, ThicknessSpec, Department } = require('../models');
const { authenticate } = require('../middleware/auth');

// 搜索板材尺寸规格 (新增)
router.post('/search', authenticate, async (req, res) => {
  try {
    const { materialType, thickness, searchQuery } = req.body;

    if (!materialType || !thickness || !searchQuery) {
      return res.status(400).json({ error: '请提供材料类型、厚度和搜索关键词' });
    }

    // 将搜索关键词转换为数字（去掉可能的 'mm' 后缀）
    const searchNumber = parseFloat(searchQuery.replace(/mm$/i, ''));
    
    if (isNaN(searchNumber)) {
      return res.json({ dimensions: [] }); // 如果不是数字，返回空结果
    }

    // 搜索匹配的尺寸记录
    const dimensions = await MaterialDimension.findAll({
      include: [
        {
          model: WorkerMaterial,
          as: 'workerMaterial',
          required: true,
          include: [
            {
              model: ThicknessSpec,
              as: 'thicknessSpec',
              required: true,
              where: {
                materialType: materialType === '碳板' ? { [Op.or]: [null, '碳板'] } : materialType,
                thickness: thickness
              }
            },
            {
              model: Worker,
              as: 'worker',
              required: true,
              attributes: ['id', 'name', 'departmentId'],
              include: [
                {
                  model: Department,
                  as: 'departmentInfo',
                  attributes: ['id', 'name'],
                  required: false
                }
              ]
            }
          ],
          where: {
            quantity: { [Op.gt]: 0 } // 只搜索有库存的
          }
        }
      ],
      where: {
        quantity: { [Op.gt]: 0 }, // 该尺寸有库存
        [Op.or]: [
          { width: searchNumber },  // 宽度匹配
          { height: searchNumber }, // 或高度匹配
          { width: { [Op.like]: `%${searchNumber}%` } },  // 部分匹配宽度
          { height: { [Op.like]: `%${searchNumber}%` } }  // 部分匹配高度
        ]
      },
      order: [
        ['width', 'ASC'],
        ['height', 'ASC']
      ]
    });

    // 为添加需求聚合显示：按尺寸合并，只显示总库存，不显示具体工人
    // 职责分离：添加需求时只关心总体可行性，分配时才关心具体来源
    const dimensionMap = new Map();
    
    dimensions.forEach(dim => {
      const key = `${dim.width}x${dim.height}`;
      
      if (dimensionMap.has(key)) {
        const existing = dimensionMap.get(key);
        existing.totalQuantity += dim.quantity;
        existing.workerCount += 1;
        // 收集所有工人信息（分配时可能需要）
        existing.workers.push({
          workerId: dim.workerMaterial.worker.id,
          workerName: dim.workerMaterial.worker.name,
          department: dim.workerMaterial.worker.departmentInfo?.name || '未分配',
          quantity: dim.quantity
        });
      } else {
        dimensionMap.set(key, {
          width: parseFloat(dim.width),
          height: parseFloat(dim.height),
          totalQuantity: dim.quantity,
          workerCount: 1,
          // 添加需求时不显示具体工人，只显示系统总库存
          workerName: '系统库存', // 统一显示为系统库存
          workerId: null, // 不指定具体工人
          department: '多个工人', // 可能来自多个工人
          workers: [{
            workerId: dim.workerMaterial.worker.id,
            workerName: dim.workerMaterial.worker.name,
            department: dim.workerMaterial.worker.departmentInfo?.name || '未分配',
            quantity: dim.quantity
          }]
        });
      }
    });

    // 按尺寸聚合后的搜索结果
    const searchResults = Array.from(dimensionMap.values())
      .sort((a, b) => {
        // 优先显示完全匹配的
        const aExactMatch = (a.width === searchNumber || a.height === searchNumber) ? 1 : 0;
        const bExactMatch = (b.width === searchNumber || b.height === searchNumber) ? 1 : 0;
        
        if (aExactMatch !== bExactMatch) {
          return bExactMatch - aExactMatch; // 完全匹配的排在前面
        }
        
        // 然后按总数量降序
        return b.totalQuantity - a.totalQuantity;
      })
      .slice(0, 20); // 限制返回数量

    res.json({
      success: true,
      searchQuery,
      materialType,
      thickness,
      dimensions: searchResults
    });

  } catch (error) {
    console.error('搜索板材尺寸错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取指定工人板材记录的所有尺寸
router.get('/worker-materials/:workerMaterialId/dimensions', authenticate, async (req, res) => {
  try {
    const { workerMaterialId } = req.params;

    // 验证工人板材记录存在
    const workerMaterial = await WorkerMaterial.findByPk(workerMaterialId, {
      include: [
        { model: Worker, as: 'worker' },
        { model: ThicknessSpec, as: 'thicknessSpec' }
      ]
    });

    if (!workerMaterial) {
      return res.status(404).json({ error: '工人板材记录不存在' });
    }

    const dimensions = await MaterialDimension.getDimensionsByWorkerMaterial(workerMaterialId);

    res.json({
      workerMaterial: {
        id: workerMaterial.id,
        workerName: workerMaterial.worker.name,
        materialType: workerMaterial.thicknessSpec.materialType,
        thickness: workerMaterial.thicknessSpec.thickness,
        totalQuantity: workerMaterial.quantity
      },
      dimensions: dimensions.map(dim => ({
        id: dim.id,
        width: parseFloat(dim.width),
        height: parseFloat(dim.height),
        quantity: dim.quantity,
        notes: dim.notes,
        dimensionLabel: dim.getDimensionLabel(),
        createdAt: dim.createdAt,
        updatedAt: dim.updatedAt
      }))
    });

  } catch (error) {
    console.error('获取尺寸数据错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建新的尺寸记录
router.post('/worker-materials/:workerMaterialId/dimensions', authenticate, async (req, res) => {
  try {
    const { workerMaterialId } = req.params;
    const { width, height, quantity, notes } = req.body;

    // 验证工人板材记录存在
    const workerMaterial = await WorkerMaterial.findByPk(workerMaterialId);
    if (!workerMaterial) {
      return res.status(404).json({ error: '工人板材记录不存在' });
    }

    // 数据验证
    const validation = MaterialDimension.validateDimensionData({
      width, height, quantity
    });
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: '数据验证失败',
        details: validation.errors 
      });
    }

    const newDimension = await MaterialDimension.create({
      workerMaterialId: parseInt(workerMaterialId),
      width: parseFloat(width),
      height: parseFloat(height),
      quantity: parseInt(quantity),
      notes: notes || null
    });

    // 更新主表数量
    const totalQuantity = await MaterialDimension.calculateTotalQuantity(workerMaterialId);
    await workerMaterial.update({ quantity: totalQuantity });

    res.status(201).json({
      id: newDimension.id,
      width: parseFloat(newDimension.width),
      height: parseFloat(newDimension.height),
      quantity: newDimension.quantity,
      notes: newDimension.notes,
      dimensionLabel: newDimension.getDimensionLabel(),
      workerMaterialId: newDimension.workerMaterialId,
      updatedTotalQuantity: totalQuantity
    });

  } catch (error) {
    console.error('创建尺寸记录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新尺寸记录
router.put('/dimensions/:dimensionId', authenticate, async (req, res) => {
  try {
    const { dimensionId } = req.params;
    const { width, height, quantity, notes } = req.body;

    const dimension = await MaterialDimension.findByPk(dimensionId);
    if (!dimension) {
      return res.status(404).json({ error: '尺寸记录不存在' });
    }

    // 数据验证
    const validation = MaterialDimension.validateDimensionData({
      width, height, quantity
    });
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: '数据验证失败',
        details: validation.errors 
      });
    }

    const workerMaterialId = dimension.workerMaterialId;

    await dimension.update({
      width: parseFloat(width),
      height: parseFloat(height),
      quantity: parseInt(quantity),
      notes: notes || null
    });

    // 更新主表数量
    const totalQuantity = await MaterialDimension.calculateTotalQuantity(workerMaterialId);
    await WorkerMaterial.update(
      { quantity: totalQuantity },
      { where: { id: workerMaterialId } }
    );

    res.json({
      id: dimension.id,
      width: parseFloat(dimension.width),
      height: parseFloat(dimension.height),
      quantity: dimension.quantity,
      notes: dimension.notes,
      dimensionLabel: dimension.getDimensionLabel(),
      workerMaterialId: dimension.workerMaterialId,
      updatedTotalQuantity: totalQuantity
    });

  } catch (error) {
    console.error('更新尺寸记录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除尺寸记录
router.delete('/dimensions/:dimensionId', authenticate, async (req, res) => {
  try {
    const { dimensionId } = req.params;

    const dimension = await MaterialDimension.findByPk(dimensionId);
    if (!dimension) {
      return res.status(404).json({ error: '尺寸记录不存在' });
    }

    const workerMaterialId = dimension.workerMaterialId;

    await dimension.destroy();

    // 更新主表数量
    const totalQuantity = await MaterialDimension.calculateTotalQuantity(workerMaterialId);
    await WorkerMaterial.update(
      { quantity: totalQuantity },
      { where: { id: workerMaterialId } }
    );

    res.json({
      message: '尺寸记录已删除',
      deletedId: parseInt(dimensionId),
      workerMaterialId: workerMaterialId,
      updatedTotalQuantity: totalQuantity
    });

  } catch (error) {
    console.error('删除尺寸记录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 批量创建尺寸记录
router.post('/worker-materials/:workerMaterialId/dimensions/batch', authenticate, async (req, res) => {
  try {
    const { workerMaterialId } = req.params;
    const { dimensions } = req.body; // 数组格式: [{ width, height, quantity, notes }, ...]

    if (!Array.isArray(dimensions) || dimensions.length === 0) {
      return res.status(400).json({ error: '请提供有效的尺寸数组' });
    }

    // 验证工人板材记录存在
    const workerMaterial = await WorkerMaterial.findByPk(workerMaterialId);
    if (!workerMaterial) {
      return res.status(404).json({ error: '工人板材记录不存在' });
    }

    // 验证所有尺寸数据
    const validationResults = dimensions.map(dim => 
      MaterialDimension.validateDimensionData(dim)
    );

    const hasErrors = validationResults.some(result => !result.isValid);
    if (hasErrors) {
      return res.status(400).json({
        error: '数据验证失败',
        details: validationResults.map((result, index) => ({
          index,
          errors: result.errors
        })).filter(item => item.errors.length > 0)
      });
    }

    // 批量创建
    const createdDimensions = await MaterialDimension.bulkCreate(
      dimensions.map(dim => ({
        workerMaterialId: parseInt(workerMaterialId),
        width: parseFloat(dim.width),
        height: parseFloat(dim.height),
        quantity: parseInt(dim.quantity),
        notes: dim.notes || null
      }))
    );

    // 更新主表数量
    const totalQuantity = await MaterialDimension.calculateTotalQuantity(workerMaterialId);
    await workerMaterial.update({ quantity: totalQuantity });

    res.status(201).json({
      message: `成功创建 ${createdDimensions.length} 条尺寸记录`,
      dimensions: createdDimensions.map(dim => ({
        id: dim.id,
        width: parseFloat(dim.width),
        height: parseFloat(dim.height),
        quantity: dim.quantity,
        notes: dim.notes,
        dimensionLabel: `${dim.width}×${dim.height}mm`
      })),
      updatedTotalQuantity: totalQuantity
    });

  } catch (error) {
    console.error('批量创建尺寸记录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 转移材料尺寸
router.post('/transfer', authenticate, async (req, res) => {
  try {
    const { fromDimensionId, toWorkerId, quantity, notes } = req.body;

    // 数据验证
    if (!fromDimensionId || !toWorkerId || !quantity) {
      return res.status(400).json({ error: '请提供完整的转移信息' });
    }

    const transferQuantity = parseInt(quantity);
    if (transferQuantity <= 0) {
      return res.status(400).json({ error: '转移数量必须大于0' });
    }

    // 查找源尺寸记录
    const sourceDimension = await MaterialDimension.findByPk(fromDimensionId, {
      include: [
        {
          model: WorkerMaterial,
          as: 'workerMaterial',
          include: [
            { model: Worker, as: 'worker' },
            { model: ThicknessSpec, as: 'thicknessSpec' }
          ]
        }
      ]
    });

    if (!sourceDimension) {
      return res.status(404).json({ error: '源尺寸记录不存在' });
    }

    // 检查转移数量是否超过可用数量
    if (transferQuantity > sourceDimension.quantity) {
      return res.status(400).json({ 
        error: `转移数量 ${transferQuantity} 超过可用数量 ${sourceDimension.quantity}` 
      });
    }

    // 查找目标工人
    const targetWorker = await Worker.findByPk(toWorkerId);
    if (!targetWorker) {
      return res.status(404).json({ error: '目标工人不存在' });
    }

    const sourceWorkerMaterial = sourceDimension.workerMaterial;
    const thicknessSpec = sourceWorkerMaterial.thicknessSpec;

    // 查找或创建目标工人的材料记录
    let targetWorkerMaterial = await WorkerMaterial.findOne({
      where: {
        workerId: toWorkerId,
        thicknessSpecId: thicknessSpec.id
      }
    });

    if (!targetWorkerMaterial) {
      // 创建新的工人材料记录
      targetWorkerMaterial = await WorkerMaterial.create({
        workerId: toWorkerId,
        thicknessSpecId: thicknessSpec.id,
        quantity: 0 // 初始数量为0，稍后会更新
      });
    }

    // 查找或创建目标尺寸记录
    let targetDimension = await MaterialDimension.findOne({
      where: {
        workerMaterialId: targetWorkerMaterial.id,
        width: sourceDimension.width,
        height: sourceDimension.height
      }
    });

    if (targetDimension) {
      // 更新现有尺寸记录
      await targetDimension.update({
        quantity: targetDimension.quantity + transferQuantity,
        notes: notes ? (targetDimension.notes ? `${targetDimension.notes}; ${notes}` : notes) : targetDimension.notes
      });
    } else {
      // 创建新的尺寸记录
      targetDimension = await MaterialDimension.create({
        workerMaterialId: targetWorkerMaterial.id,
        width: sourceDimension.width,
        height: sourceDimension.height,
        quantity: transferQuantity,
        notes: notes || null
      });
    }

    // 更新源尺寸记录
    const remainingQuantity = sourceDimension.quantity - transferQuantity;
    if (remainingQuantity === 0) {
      // 如果转移全部数量，删除源记录
      await sourceDimension.destroy();
    } else {
      // 否则更新数量
      await sourceDimension.update({ quantity: remainingQuantity });
    }

    // 更新两个工人的材料总量
    const sourceTotalQuantity = await MaterialDimension.calculateTotalQuantity(sourceWorkerMaterial.id);
    const targetTotalQuantity = await MaterialDimension.calculateTotalQuantity(targetWorkerMaterial.id);

    await sourceWorkerMaterial.update({ quantity: sourceTotalQuantity });
    await targetWorkerMaterial.update({ quantity: targetTotalQuantity });

    res.json({
      success: true,
      message: `成功转移 ${transferQuantity} 张 ${sourceDimension.width}×${sourceDimension.height}mm 材料`,
      transfer: {
        fromWorker: sourceWorkerMaterial.worker.name,
        toWorker: targetWorker.name,
        dimension: `${sourceDimension.width}×${sourceDimension.height}mm`,
        quantity: transferQuantity,
        notes: notes || null
      },
      updatedQuantities: {
        sourceWorkerMaterial: {
          id: sourceWorkerMaterial.id,
          totalQuantity: sourceTotalQuantity
        },
        targetWorkerMaterial: {
          id: targetWorkerMaterial.id,
          totalQuantity: targetTotalQuantity
        }
      }
    });

  } catch (error) {
    console.error('转移材料失败:', error);
    res.status(500).json({ error: '服务器错误', details: error.message });
  }
});

module.exports = router;
const express = require('express');
const { MaterialInventory, MaterialRemainder, MaterialBorrowing, CuttingRecord, ThicknessSpec, Worker } = require('../models');
const { authenticate, requireOperator } = require('../middleware/auth');
const sseManager = require('../utils/sseManager');

const router = express.Router();

// 获取库存列表
router.get('/', authenticate, async (req, res) => {
  try {
    const { materialType, ownerId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (materialType && materialType !== 'all') {
      whereClause.materialType = materialType;
    }
    if (ownerId) {
      whereClause.ownerWorkerId = ownerId;
    }

    const inventories = await MaterialInventory.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['id', 'thickness', 'unit', 'materialType']
        },
        {
          association: 'ownerWorker',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['materialType', 'ASC'], ['thicknessSpecId', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      inventories: inventories.rows,
      pagination: {
        total: inventories.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(inventories.count / limit)
      }
    });

  } catch (error) {
    console.error('获取库存列表错误:', error);
    res.status(500).json({
      error: '获取库存列表失败',
      message: error.message
    });
  }
});

// 创建库存记录
router.post('/', authenticate, requireOperator, async (req, res) => {
  try {
    const {
      materialType,
      thicknessSpecId,
      specification,
      totalQuantity,
      ownerWorkerId,
      location,
      serialNumber,
      notes
    } = req.body;

    if (!materialType || !thicknessSpecId || !totalQuantity) {
      return res.status(400).json({
        error: '材料类型、厚度规格和总数量都是必需的'
      });
    }

    // 验证厚度规格和工人是否存在
    const thicknessSpec = await ThicknessSpec.findByPk(thicknessSpecId);
    if (!thicknessSpec) {
      return res.status(404).json({
        error: '厚度规格不存在'
      });
    }

    if (ownerWorkerId) {
      const worker = await Worker.findByPk(ownerWorkerId);
      if (!worker) {
        return res.status(404).json({
          error: '指定的工人不存在'
        });
      }
    }

    const inventory = await MaterialInventory.create({
      materialType,
      thicknessSpecId,
      specification,
      totalQuantity,
      usedQuantity: 0,
      remainingQuantity: totalQuantity,
      ownerWorkerId,
      location,
      serialNumber,
      notes
    });

    // 获取创建后的完整信息
    const createdInventory = await MaterialInventory.findByPk(inventory.id, {
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['id', 'thickness', 'unit', 'materialType']
        },
        {
          association: 'ownerWorker',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    res.status(201).json({
      message: '库存记录创建成功',
      inventory: createdInventory
    });

    // 广播库存变更事件
    sseManager.broadcast('inventory-created', {
      inventory: createdInventory,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('创建库存记录错误:', error);
    res.status(500).json({
      error: '创建库存记录失败',
      message: error.message
    });
  }
});

// 更新库存记录
router.put('/:id', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      totalQuantity,
      usedQuantity,
      remainingQuantity,
      ownerWorkerId,
      location,
      notes
    } = req.body;

    const inventory = await MaterialInventory.findByPk(id);
    if (!inventory) {
      return res.status(404).json({
        error: '库存记录不存在'
      });
    }

    const updateData = {};
    if (totalQuantity !== undefined) updateData.totalQuantity = totalQuantity;
    if (usedQuantity !== undefined) updateData.usedQuantity = usedQuantity;
    if (remainingQuantity !== undefined) updateData.remainingQuantity = remainingQuantity;
    if (ownerWorkerId !== undefined) updateData.ownerWorkerId = ownerWorkerId;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;

    // 自动计算剩余数量
    if (totalQuantity !== undefined || usedQuantity !== undefined) {
      const newTotal = totalQuantity !== undefined ? totalQuantity : inventory.totalQuantity;
      const newUsed = usedQuantity !== undefined ? usedQuantity : inventory.usedQuantity;
      updateData.remainingQuantity = newTotal - newUsed;
    }

    await inventory.update(updateData);

    // 获取更新后的完整信息
    const updatedInventory = await MaterialInventory.findByPk(id, {
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['id', 'thickness', 'unit', 'materialType']
        },
        {
          association: 'ownerWorker',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    res.json({
      message: '库存记录更新成功',
      inventory: updatedInventory
    });

    // 广播库存变更事件
    sseManager.broadcast('inventory-updated', {
      inventory: updatedInventory,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('更新库存记录错误:', error);
    res.status(500).json({
      error: '更新库存记录失败',
      message: error.message
    });
  }
});

// 删除库存记录
router.delete('/:id', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;

    const inventory = await MaterialInventory.findByPk(id);
    if (!inventory) {
      return res.status(404).json({
        error: '库存记录不存在'
      });
    }

    // 检查是否有相关的借用记录
    const borrowingCount = await MaterialBorrowing.count({
      where: { materialInventoryId: id, status: 'borrowed' }
    });

    if (borrowingCount > 0) {
      return res.status(400).json({
        error: '该库存记录有未归还的借用记录，无法删除'
      });
    }

    await inventory.destroy();

    res.json({
      message: '库存记录删除成功'
    });

    // 广播库存删除事件
    sseManager.broadcast('inventory-deleted', {
      inventoryId: id,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('删除库存记录错误:', error);
    res.status(500).json({
      error: '删除库存记录失败',
      message: error.message
    });
  }
});

// 获取库存统计信息
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { materialType } = req.query;

    const whereClause = {};
    if (materialType && materialType !== 'all') {
      whereClause.materialType = materialType;
    }

    const stats = await MaterialInventory.findAll({
      where: whereClause,
      attributes: [
        'materialType',
        [MaterialInventory.sequelize.fn('COUNT', '*'), 'count'],
        [MaterialInventory.sequelize.fn('SUM', MaterialInventory.sequelize.col('total_quantity')), 'totalQuantity'],
        [MaterialInventory.sequelize.fn('SUM', MaterialInventory.sequelize.col('used_quantity')), 'usedQuantity'],
        [MaterialInventory.sequelize.fn('SUM', MaterialInventory.sequelize.col('remaining_quantity')), 'remainingQuantity']
      ],
      group: ['materialType'],
      raw: true
    });

    // 获取低库存预警
    const lowStockItems = await MaterialInventory.findAll({
      where: {
        ...whereClause,
        remainingQuantity: {
          [MaterialInventory.sequelize.Op.lt]: MaterialInventory.sequelize.col('total_quantity') * 0.2 // 低于20%报警
        }
      },
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['thickness', 'unit']
        }
      ]
    });

    res.json({
      success: true,
      stats,
      lowStockItems,
      lowStockCount: lowStockItems.length
    });

  } catch (error) {
    console.error('获取库存统计错误:', error);
    res.status(500).json({
      error: '获取库存统计失败',
      message: error.message
    });
  }
});

// 借用管理相关端点

// 创建借用记录
router.post('/borrowing', authenticate, requireOperator, async (req, res) => {
  try {
    const {
      borrowerWorkerId,
      lenderWorkerId,
      materialInventoryId,
      borrowedQuantity,
      expectedReturnDate,
      reason
    } = req.body;

    if (!borrowerWorkerId || !lenderWorkerId || !materialInventoryId || !borrowedQuantity) {
      return res.status(400).json({
        error: '借用人、出借人、材料库存和借用数量都是必需的'
      });
    }

    // 验证库存是否存在且数量充足
    const inventory = await MaterialInventory.findByPk(materialInventoryId);
    if (!inventory) {
      return res.status(404).json({
        error: '库存记录不存在'
      });
    }

    if (inventory.remainingQuantity < borrowedQuantity) {
      return res.status(400).json({
        error: '库存数量不足，无法借用'
      });
    }

    // 验证借用人和出借人是否存在
    const borrower = await Worker.findByPk(borrowerWorkerId);
    const lender = await Worker.findByPk(lenderWorkerId);
    
    if (!borrower || !lender) {
      return res.status(404).json({
        error: '借用人或出借人不存在'
      });
    }

    // 创建借用记录
    const borrowing = await MaterialBorrowing.create({
      borrowerWorkerId,
      lenderWorkerId,
      materialInventoryId,
      borrowedQuantity,
      borrowDate: new Date().toISOString().split('T')[0],
      expectedReturnDate,
      reason
    });

    // 更新库存数量
    await inventory.update({
      usedQuantity: inventory.usedQuantity + borrowedQuantity,
      remainingQuantity: inventory.remainingQuantity - borrowedQuantity
    });

    // 获取创建后的完整信息
    const createdBorrowing = await MaterialBorrowing.findByPk(borrowing.id, {
      include: [
        {
          association: 'borrower',
          attributes: ['id', 'name']
        },
        {
          association: 'lender',
          attributes: ['id', 'name']
        },
        {
          association: 'materialInventory',
          include: [
            {
              association: 'thicknessSpec',
              attributes: ['thickness', 'unit', 'materialType']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      message: '借用记录创建成功',
      borrowing: createdBorrowing
    });

    // 广播借用事件
    sseManager.broadcast('material-borrowed', {
      borrowing: createdBorrowing,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('创建借用记录错误:', error);
    res.status(500).json({
      error: '创建借用记录失败',
      message: error.message
    });
  }
});

// 归还材料
router.put('/borrowing/:id/return', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const borrowing = await MaterialBorrowing.findByPk(id, {
      include: [{
        association: 'materialInventory'
      }]
    });

    if (!borrowing) {
      return res.status(404).json({
        error: '借用记录不存在'
      });
    }

    if (borrowing.status !== 'borrowed') {
      return res.status(400).json({
        error: '该借用记录已经归还或状态异常'
      });
    }

    // 更新借用记录
    await borrowing.update({
      status: 'returned',
      actualReturnDate: new Date().toISOString().split('T')[0],
      notes
    });

    // 更新库存数量
    const inventory = borrowing.materialInventory;
    await inventory.update({
      usedQuantity: inventory.usedQuantity - borrowing.borrowedQuantity,
      remainingQuantity: inventory.remainingQuantity + borrowing.borrowedQuantity
    });

    // 获取更新后的完整信息
    const updatedBorrowing = await MaterialBorrowing.findByPk(id, {
      include: [
        {
          association: 'borrower',
          attributes: ['id', 'name']
        },
        {
          association: 'lender',
          attributes: ['id', 'name']
        },
        {
          association: 'materialInventory',
          include: [
            {
              association: 'thicknessSpec',
              attributes: ['thickness', 'unit', 'materialType']
            }
          ]
        }
      ]
    });

    res.json({
      message: '材料归还成功',
      borrowing: updatedBorrowing
    });

    // 广播归还事件
    sseManager.broadcast('material-returned', {
      borrowing: updatedBorrowing,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('归还材料错误:', error);
    res.status(500).json({
      error: '归还材料失败',
      message: error.message
    });
  }
});

// 获取借用记录列表
router.get('/borrowing', authenticate, async (req, res) => {
  try {
    const { status, borrowerId, lenderId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (borrowerId) {
      whereClause.borrowerWorkerId = borrowerId;
    }
    if (lenderId) {
      whereClause.lenderWorkerId = lenderId;
    }

    const borrowings = await MaterialBorrowing.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'borrower',
          attributes: ['id', 'name']
        },
        {
          association: 'lender',
          attributes: ['id', 'name']
        },
        {
          association: 'materialInventory',
          include: [
            {
              association: 'thicknessSpec',
              attributes: ['thickness', 'unit', 'materialType']
            }
          ]
        }
      ],
      order: [['borrowDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      borrowings: borrowings.rows,
      pagination: {
        total: borrowings.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(borrowings.count / limit)
      }
    });

  } catch (error) {
    console.error('获取借用记录错误:', error);
    res.status(500).json({
      error: '获取借用记录失败',
      message: error.message
    });
  }
});

// 余料管理相关端点

// 创建余料记录
router.post('/remainder', authenticate, requireOperator, async (req, res) => {
  try {
    const {
      cuttingNumber,
      materialType,
      thicknessSpecId,
      originalQuantity,
      remainderQuantity,
      location,
      notes
    } = req.body;

    if (!cuttingNumber || !materialType || !thicknessSpecId || !remainderQuantity) {
      return res.status(400).json({
        error: '切割号、材料类型、厚度规格和余料数量都是必需的'
      });
    }

    // 验证厚度规格是否存在
    const thicknessSpec = await ThicknessSpec.findByPk(thicknessSpecId);
    if (!thicknessSpec) {
      return res.status(404).json({
        error: '厚度规格不存在'
      });
    }

    const remainder = await MaterialRemainder.create({
      cuttingNumber,
      materialType,
      thicknessSpecId,
      originalQuantity,
      remainderQuantity,
      location,
      notes
    });

    // 获取创建后的完整信息
    const createdRemainder = await MaterialRemainder.findByPk(remainder.id, {
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['thickness', 'unit', 'materialType']
        }
      ]
    });

    res.status(201).json({
      message: '余料记录创建成功',
      remainder: createdRemainder
    });

    // 广播余料创建事件
    sseManager.broadcast('remainder-created', {
      remainder: createdRemainder,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('创建余料记录错误:', error);
    res.status(500).json({
      error: '创建余料记录失败',
      message: error.message
    });
  }
});

// 获取余料列表
router.get('/remainder', authenticate, async (req, res) => {
  try {
    const { materialType, status, cuttingNumber, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (materialType && materialType !== 'all') {
      whereClause.materialType = materialType;
    }
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (cuttingNumber) {
      whereClause.cuttingNumber = {
        [MaterialRemainder.sequelize.Op.like]: `%${cuttingNumber}%`
      };
    }

    const remainders = await MaterialRemainder.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['thickness', 'unit', 'materialType']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      remainders: remainders.rows,
      pagination: {
        total: remainders.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(remainders.count / limit)
      }
    });

  } catch (error) {
    console.error('获取余料列表错误:', error);
    res.status(500).json({
      error: '获取余料列表失败',
      message: error.message
    });
  }
});

// 更新余料状态
router.put('/remainder/:id', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, location, notes } = req.body;

    const remainder = await MaterialRemainder.findByPk(id);
    if (!remainder) {
      return res.status(404).json({
        error: '余料记录不存在'
      });
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;

    await remainder.update(updateData);

    // 获取更新后的完整信息
    const updatedRemainder = await MaterialRemainder.findByPk(id, {
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['thickness', 'unit', 'materialType']
        }
      ]
    });

    res.json({
      message: '余料记录更新成功',
      remainder: updatedRemainder
    });

    // 广播余料更新事件
    sseManager.broadcast('remainder-updated', {
      remainder: updatedRemainder,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('更新余料记录错误:', error);
    res.status(500).json({
      error: '更新余料记录失败',
      message: error.message
    });
  }
});

module.exports = router;
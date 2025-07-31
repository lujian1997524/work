const express = require('express');
const { MaterialBorrowing, MaterialInventory, Worker, ThicknessSpec } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const sseManager = require('../utils/sseManager');
const { Op } = require('sequelize');
const { sequelize } = require('../utils/database');

const router = express.Router();

// 获取借用申请列表
router.get('/requests', authenticate, async (req, res) => {
  try {
    const { 
      status, 
      borrowerId, 
      materialType, 
      page = 1, 
      limit = 20,
      startDate,
      endDate 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    // 状态筛选
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // 借用人筛选
    if (borrowerId) {
      whereClause.borrowerWorkerId = borrowerId;
    }

    // 日期筛选
    if (startDate) {
      whereClause.borrowDate = {
        [Op.gte]: startDate
      };
    }
    if (endDate) {
      if (whereClause.borrowDate) {
        whereClause.borrowDate[Op.lte] = endDate;
      } else {
        whereClause.borrowDate = {
          [Op.lte]: endDate
        };
      }
    }

    const includeClause = [
      {
        association: 'borrower',
        attributes: ['id', 'name', 'department']
      },
      {
        association: 'lender',
        attributes: ['id', 'name', 'department']
      },
      {
        association: 'approver',
        attributes: ['id', 'name', 'department'],
        required: false
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
    ];

    const requests = await MaterialBorrowing.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 根据材料类型筛选
    const filteredRequests = materialType && materialType !== 'all' 
      ? requests.rows.filter(request => 
          request.materialInventory?.thicknessSpec?.materialType === materialType
        )
      : requests.rows;

    res.json({
      success: true,
      requests: filteredRequests,
      pagination: {
        total: requests.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(requests.count / limit)
      }
    });

  } catch (error) {
    console.error('获取借用申请错误:', error);
    res.status(500).json({
      error: '获取借用申请失败',
      message: error.message
    });
  }
});

// 创建借用申请
router.post('/requests', authenticate, async (req, res) => {
  try {
    const {
      lenderWorkerId,
      materialInventoryId,
      borrowedQuantity,
      expectedReturnDate,
      reason
    } = req.body;

    if (!lenderWorkerId || !materialInventoryId || !borrowedQuantity) {
      return res.status(400).json({
        error: '出借人、库存材料和借用数量都是必需的'
      });
    }

    // 验证出借人
    const lender = await Worker.findByPk(lenderWorkerId);
    if (!lender) {
      return res.status(404).json({
        error: '指定的出借人不存在'
      });
    }

    // 验证库存
    const inventory = await MaterialInventory.findByPk(materialInventoryId, {
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['thickness', 'unit', 'materialType']
        }
      ]
    });

    if (!inventory) {
      return res.status(404).json({
        error: '指定的库存不存在'
      });
    }

    if (inventory.remainingQuantity < borrowedQuantity) {
      return res.status(400).json({
        error: '库存数量不足'
      });
    }

    // 创建借用申请
    const borrowingRequest = await MaterialBorrowing.create({
      borrowerWorkerId: req.user.workerId, // 当前用户作为借用人
      lenderWorkerId,
      materialInventoryId,
      borrowedQuantity,
      borrowDate: new Date().toISOString().split('T')[0],
      expectedReturnDate,
      status: 'pending',
      reason
    });

    // 获取创建后的完整信息
    const createdRequest = await MaterialBorrowing.findByPk(borrowingRequest.id, {
      include: [
        {
          association: 'borrower',
          attributes: ['id', 'name', 'department']
        },
        {
          association: 'lender',
          attributes: ['id', 'name', 'department']
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
      message: '借用申请创建成功',
      request: createdRequest
    });

    // 广播借用申请创建事件
    sseManager.broadcast('borrowing-request-created', {
      request: createdRequest,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('创建借用申请错误:', error);
    res.status(500).json({
      error: '创建借用申请失败',
      message: error.message
    });
  }
});

// 审批借用申请 - 批准
router.put('/requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const request = await MaterialBorrowing.findByPk(id, {
      include: [
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

    if (!request) {
      return res.status(404).json({
        error: '借用申请不存在'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: '只能审批待审批状态的申请'
      });
    }

    // 检查库存是否足够
    if (request.materialInventory.remainingQuantity < request.borrowedQuantity) {
      return res.status(400).json({
        error: '当前库存不足，无法批准借用'
      });
    }

    // 更新申请状态
    await request.update({
      status: 'approved',
      approvedBy: req.user.workerId,
      approvedDate: new Date().toISOString().split('T')[0],
      notes: notes || request.notes
    });

    // 减少库存数量
    await request.materialInventory.update({
      remainingQuantity: request.materialInventory.remainingQuantity - request.borrowedQuantity
    });

    // 更新状态为已借出
    await request.update({ status: 'borrowed' });

    // 获取更新后的完整信息
    const updatedRequest = await MaterialBorrowing.findByPk(id, {
      include: [
        {
          association: 'borrower',
          attributes: ['id', 'name', 'department']
        },
        {
          association: 'lender',
          attributes: ['id', 'name', 'department']
        },
        {
          association: 'approver',
          attributes: ['id', 'name', 'department']
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
      message: '借用申请已批准',
      request: updatedRequest
    });

    // 广播审批事件
    sseManager.broadcast('borrowing-request-approved', {
      request: updatedRequest,
      approverName: req.user.name,
      approverId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('批准借用申请错误:', error);
    res.status(500).json({
      error: '批准借用申请失败',
      message: error.message
    });
  }
});

// 审批借用申请 - 拒绝
router.put('/requests/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        error: '拒绝原因是必需的'
      });
    }

    const request = await MaterialBorrowing.findByPk(id);
    if (!request) {
      return res.status(404).json({
        error: '借用申请不存在'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: '只能审批待审批状态的申请'
      });
    }

    // 更新申请状态
    await request.update({
      status: 'rejected',
      approvedBy: req.user.workerId,
      approvedDate: new Date().toISOString().split('T')[0],
      rejectionReason
    });

    // 获取更新后的完整信息
    const updatedRequest = await MaterialBorrowing.findByPk(id, {
      include: [
        {
          association: 'borrower',
          attributes: ['id', 'name', 'department']
        },
        {
          association: 'lender',
          attributes: ['id', 'name', 'department']
        },
        {
          association: 'approver',
          attributes: ['id', 'name', 'department']
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
      message: '借用申请已拒绝',
      request: updatedRequest
    });

    // 广播拒绝事件
    sseManager.broadcast('borrowing-request-rejected', {
      request: updatedRequest,
      approverName: req.user.name,
      approverId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('拒绝借用申请错误:', error);
    res.status(500).json({
      error: '拒绝借用申请失败',
      message: error.message
    });
  }
});

// 归还材料
router.post('/requests/:id/return', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { returnedQuantity, notes } = req.body;

    const request = await MaterialBorrowing.findByPk(id, {
      include: [
        {
          association: 'materialInventory'
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        error: '借用记录不存在'
      });
    }

    if (request.status !== 'borrowed') {
      return res.status(400).json({
        error: '只能归还已借出的材料'
      });
    }

    const actualReturnedQuantity = returnedQuantity || request.borrowedQuantity;

    if (actualReturnedQuantity > request.borrowedQuantity) {
      return res.status(400).json({
        error: '归还数量不能超过借用数量'
      });
    }

    // 更新借用记录
    await request.update({
      status: 'returned',
      actualReturnDate: new Date().toISOString().split('T')[0],
      returnedQuantity: actualReturnedQuantity,
      notes: notes || request.notes
    });

    // 增加库存数量
    await request.materialInventory.update({
      remainingQuantity: request.materialInventory.remainingQuantity + actualReturnedQuantity
    });

    // 获取更新后的完整信息
    const updatedRequest = await MaterialBorrowing.findByPk(id, {
      include: [
        {
          association: 'borrower',
          attributes: ['id', 'name', 'department']
        },
        {
          association: 'lender',
          attributes: ['id', 'name', 'department']
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
      request: updatedRequest
    });

    // 广播归还事件
    sseManager.broadcast('material-returned', {
      request: updatedRequest,
      returnedBy: req.user.name,
      returnedQuantity: actualReturnedQuantity
    }, req.user.id);

  } catch (error) {
    console.error('归还材料错误:', error);
    res.status(500).json({
      error: '归还材料失败',
      message: error.message
    });
  }
});

// 获取借用统计
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { period = '30' } = req.query; // 默认30天内
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // 借用申请状态统计
    const statusStats = await MaterialBorrowing.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate
        }
      },
      group: ['status']
    });

    // 用户借用统计
    const userStats = await MaterialBorrowing.findAll({
      attributes: [
        'borrowerWorkerId',
        [sequelize.fn('COUNT', sequelize.col('MaterialBorrowing.id')), 'borrowCount'],
        [sequelize.fn('SUM', sequelize.col('borrowed_quantity')), 'totalQuantity']
      ],
      include: [
        {
          association: 'borrower',
          attributes: ['name', 'department']
        }
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate
        }
      },
      group: ['borrowerWorkerId', 'borrower.id']
    });

    // 材料借用频率统计 - 简化查询避免GROUP BY问题
    const materialStatsQuery = `
      SELECT 
        ts.material_type,
        COUNT(mb.id) as borrowCount,
        SUM(mb.borrowed_quantity) as totalQuantity
      FROM material_borrowing mb
      JOIN material_inventory mi ON mb.material_inventory_id = mi.id
      JOIN thickness_specs ts ON mi.thickness_spec_id = ts.id
      WHERE mb.createdAt >= ?
      GROUP BY ts.material_type
    `;
    
    const materialStats = await sequelize.query(materialStatsQuery, {
      replacements: [startDate],
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      period: parseInt(period),
      stats: {
        status: statusStats,
        users: userStats,
        materials: materialStats
      }
    });

  } catch (error) {
    console.error('获取借用统计错误:', error);
    res.status(500).json({
      error: '获取借用统计失败',
      message: error.message
    });
  }
});

module.exports = router;
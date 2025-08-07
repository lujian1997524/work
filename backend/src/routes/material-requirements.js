const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { 
  MaterialRequirement, 
  MaterialAllocation, 
  WorkerMaterial, 
  Worker, 
  Material, 
  Project,
  ThicknessSpec,
  User 
} = require('../models');

/**
 * 获取项目的材料需求列表
 * GET /api/material-requirements/project/:projectId
 */
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    const requirements = await MaterialRequirement.findAll({
      where: { projectId },
      include: [
        {
          model: Material,
          as: 'material',
          include: [
            {
              model: ThicknessSpec,
              as: 'thicknessSpec'
            }
          ]
        },
        {
          model: MaterialAllocation,
          as: 'allocations',
          where: { status: 'allocated' },
          required: false,
          include: [
            {
              model: Worker,
              as: 'fromWorker',
              attributes: ['id', 'name', 'department']
            }
          ]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      requirements
    });

  } catch (error) {
    console.error('获取项目材料需求失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目材料需求失败',
      error: error.message
    });
  }
});

/**
 * 添加材料需求
 * POST /api/material-requirements
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, materialId, width, height, quantity, notes } = req.body;

    // 验证必填字段
    if (!projectId || !materialId || !width || !height || !quantity) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }

    // 验证项目和材料是否存在
    const material = await Material.findOne({
      where: { id: materialId, projectId },
      include: [
        {
          model: ThicknessSpec,
          as: 'thicknessSpec'
        }
      ]
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: '材料不存在或不属于此项目'
      });
    }

    // 创建需求
    const requirement = await MaterialRequirement.create({
      projectId,
      materialId,
      width: parseFloat(width),
      height: parseFloat(height),
      quantity: parseInt(quantity),
      notes,
      createdBy: req.user.id
    });

    // 获取完整的需求信息
    const fullRequirement = await MaterialRequirement.findByPk(requirement.id, {
      include: [
        {
          model: Material,
          as: 'material',
          include: [
            {
              model: ThicknessSpec,
              as: 'thicknessSpec'
            }
          ]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      success: true,
      message: '材料需求添加成功',
      requirement: fullRequirement
    });

  } catch (error) {
    console.error('添加材料需求失败:', error);
    res.status(500).json({
      success: false,
      message: '添加材料需求失败',
      error: error.message
    });
  }
});

/**
 * 检查库存状态
 * GET /api/material-requirements/check-inventory
 */
router.get('/check-inventory', authenticate, async (req, res) => {
  try {
    const { materialType, thickness, width, height, projectWorkerId } = req.query;

    if (!materialType || !thickness || !width || !height) {
      return res.status(400).json({
        success: false,
        message: '缺少查询参数'
      });
    }

    // 查找对应的厚度规格
    const thicknessSpec = await ThicknessSpec.findOne({
      where: {
        materialType,
        thickness: parseFloat(thickness).toFixed(3),
        isActive: true
      }
    });

    if (!thicknessSpec) {
      return res.json({
        success: true,
        inventory: []
      });
    }

    // 查找所有工人的该规格库存
    const workerMaterials = await WorkerMaterial.findAll({
      where: {
        thicknessSpecId: thicknessSpec.id,
        quantity: { [Op.gt]: 0 }
      },
      include: [
        {
          model: Worker,
          as: 'worker',
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
      order: [
        // 项目工人优先
        ...(projectWorkerId ? [
          [{ model: Worker, as: 'worker' }, 'id', projectWorkerId === 'workerId' ? 'ASC' : 'DESC']
        ] : []),
        ['quantity', 'DESC'] // 库存量倒序
      ]
    });

    const inventory = workerMaterials.map(wm => ({
      workerId: wm.workerId,
      workerName: wm.worker.name,
      department: wm.worker.departmentInfo?.name || '未分配',
      quantity: wm.quantity,
      isProjectWorker: projectWorkerId && wm.workerId == projectWorkerId
    }));

    res.json({
      success: true,
      inventory
    });

  } catch (error) {
    console.error('检查库存失败:', error);
    res.status(500).json({
      success: false,
      message: '检查库存失败',
      error: error.message
    });
  }
});

/**
 * 分配材料
 * POST /api/material-requirements/:id/allocate
 */
router.post('/:id/allocate', authenticate, async (req, res) => {
  try {
    const { id: requirementId } = req.params;
    const { allocations } = req.body; // [{ fromWorkerId, quantity }]

    if (!allocations || !Array.isArray(allocations)) {
      return res.status(400).json({
        success: false,
        message: '分配信息格式错误'
      });
    }

    // 获取需求信息
    const requirement = await MaterialRequirement.findByPk(requirementId, {
      include: [
        {
          model: Material,
          as: 'material',
          include: [
            {
              model: Project,
              as: 'project',
              include: [
                {
                  model: Worker,
                  as: 'assignedWorker'
                }
              ]
            },
            {
              model: ThicknessSpec,
              as: 'thicknessSpec'
            }
          ]
        }
      ]
    });

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: '材料需求不存在'
      });
    }

    const toWorkerId = requirement.material.project.assignedWorker?.id;
    if (!toWorkerId) {
      return res.status(400).json({
        success: false,
        message: '项目未分配工人'
      });
    }

    // 验证分配总量
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
    if (totalAllocated !== requirement.quantity) {
      return res.status(400).json({
        success: false,
        message: `分配总量(${totalAllocated})与需求量(${requirement.quantity})不匹配`
      });
    }

    // 开始事务
    const transaction = await require('../models').sequelize.transaction();

    try {
      const createdAllocations = [];

      for (const allocation of allocations) {
        const { fromWorkerId, quantity } = allocation;

        // 查找工人材料库存
        const workerMaterial = await WorkerMaterial.findOne({
          where: {
            workerId: fromWorkerId,
            thicknessSpecId: requirement.material.thicknessSpec.id
          },
          transaction
        });

        if (!workerMaterial || workerMaterial.quantity < quantity) {
          throw new Error(`工人${fromWorkerId}库存不足`);
        }

        // 扣减库存
        workerMaterial.quantity -= quantity;
        await workerMaterial.save({ transaction });

        // 创建分配记录
        const allocationRecord = await MaterialAllocation.create({
          requirementId,
          fromWorkerId,
          toWorkerId,
          workerMaterialId: workerMaterial.id,
          quantity,
          allocatedBy: req.user.id
        }, { transaction });

        createdAllocations.push(allocationRecord);
      }

      // 更新需求的已分配数量
      requirement.allocatedQuantity = requirement.quantity;
      await requirement.save({ transaction });

      await transaction.commit();

      // 获取完整的分配信息
      const fullAllocations = await MaterialAllocation.findAll({
        where: { requirementId },
        include: [
          {
            model: Worker,
            as: 'fromWorker',
            attributes: ['id', 'name', 'department']
          }
        ]
      });

      res.json({
        success: true,
        message: '材料分配成功',
        allocations: fullAllocations
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('分配材料失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '分配材料失败'
    });
  }
});

/**
 * 删除材料需求
 * DELETE /api/material-requirements/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const requirement = await MaterialRequirement.findByPk(id);
    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: '材料需求不存在'
      });
    }

    // 开始事务
    const transaction = await require('../models').sequelize.transaction();

    try {
      // 获取所有分配记录
      const allocations = await MaterialAllocation.findAll({
        where: { 
          requirementId: id,
          status: 'allocated'
        },
        include: [
          {
            model: WorkerMaterial,
            as: 'workerMaterial'
          }
        ],
        transaction
      });

      // 归还库存
      for (const allocation of allocations) {
        const workerMaterial = allocation.workerMaterial;
        workerMaterial.quantity += allocation.quantity;
        await workerMaterial.save({ transaction });

        // 标记分配为已归还
        allocation.status = 'returned';
        allocation.returnedAt = new Date();
        await allocation.save({ transaction });
      }

      // 删除需求
      await requirement.destroy({ transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: '材料需求删除成功，相关库存已归还'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('删除材料需求失败:', error);
    res.status(500).json({
      success: false,
      message: '删除材料需求失败',
      error: error.message
    });
  }
});

/**
 * 获取项目的借用详情
 * GET /api/material-requirements/project/:projectId/borrowing-details
 */
router.get('/project/:projectId/borrowing-details', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    const allocations = await MaterialAllocation.findAll({
      include: [
        {
          model: MaterialRequirement,
          as: 'requirement',
          where: { projectId },
          include: [
            {
              model: Material,
              as: 'material',
              include: [
                {
                  model: ThicknessSpec,
                  as: 'thicknessSpec'
                }
              ]
            }
          ]
        },
        {
          model: Worker,
          as: 'fromWorker',
          attributes: ['id', 'name', 'department']
        },
        {
          model: Worker,
          as: 'toWorker',
          attributes: ['id', 'name', 'department']
        }
      ],
      where: { status: 'allocated' },
      order: [['allocatedAt', 'DESC']]
    });

    // 按出借人分组
    const borrowingByWorker = {};
    allocations.forEach(allocation => {
      const fromWorkerId = allocation.fromWorkerId;
      if (!borrowingByWorker[fromWorkerId]) {
        borrowingByWorker[fromWorkerId] = {
          worker: allocation.fromWorker,
          items: [],
          totalQuantity: 0
        };
      }
      
      borrowingByWorker[fromWorkerId].items.push({
        materialType: allocation.requirement.material.thicknessSpec.materialType,
        thickness: allocation.requirement.material.thicknessSpec.thickness,
        dimensions: `${allocation.requirement.width}×${allocation.requirement.height}mm`,
        quantity: allocation.quantity,
        allocatedAt: allocation.allocatedAt
      });
      
      borrowingByWorker[fromWorkerId].totalQuantity += allocation.quantity;
    });

    res.json({
      success: true,
      borrowingDetails: Object.values(borrowingByWorker)
    });

  } catch (error) {
    console.error('获取借用详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取借用详情失败',
      error: error.message
    });
  }
});

module.exports = router;
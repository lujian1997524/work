const express = require('express');
const { CuttingRecord, MaterialInventory, Material, Project, ThicknessSpec, Worker } = require('../models');
const { authenticate, requireOperator } = require('../middleware/auth');
const sseManager = require('../utils/sseManager');

const router = express.Router();

// 获取切割计划列表
router.get('/plans', authenticate, async (req, res) => {
  try {
    const { status, materialType, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // 获取切割记录作为切割计划
    const plans = await CuttingRecord.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'materialInventory',
          include: [
            {
              association: 'thicknessSpec',
              attributes: ['thickness', 'unit', 'materialType']
            }
          ]
        },
        {
          association: 'operator',
          attributes: ['id', 'name', 'department']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 为每个计划获取关联的项目信息
    const plansWithProjects = await Promise.all(plans.rows.map(async (plan) => {
      // 通过切割号查找使用该切割号的材料
      const materials = await Material.findAll({
        where: { cuttingNumber: plan.cuttingNumber },
        include: [
          {
            association: 'project',
            attributes: ['id', 'name'],
            include: [
              {
                association: 'assignedWorker',
                attributes: ['name']
              }
            ]
          },
          {
            association: 'thicknessSpec',
            attributes: ['thickness', 'unit']
          }
        ]
      });

      const projects = materials.map(material => ({
        projectId: material.project.id,
        projectName: material.project.name,
        materialId: material.id,
        quantity: material.quantity,
        status: material.status,
        assignedWorker: material.project.assignedWorker?.name
      }));

      return {
        id: plan.id,
        cuttingNumber: plan.cuttingNumber,
        materialType: plan.materialInventory?.thicknessSpec?.materialType || '未知',
        thicknessSpecId: plan.materialInventory?.thicknessSpecId,
        projects: projects,
        totalProjects: projects.length,
        status: plan.status,
        operatorWorkerId: plan.operatorWorkerId,
        cuttingDate: plan.cuttingDate,
        notes: plan.notes,
        createdAt: plan.createdAt
      };
    }));

    // 根据材料类型筛选
    const filteredPlans = materialType && materialType !== 'all' 
      ? plansWithProjects.filter(plan => plan.materialType === materialType)
      : plansWithProjects;

    res.json({
      success: true,
      plans: filteredPlans,
      pagination: {
        total: plans.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(plans.count / limit)
      }
    });

  } catch (error) {
    console.error('获取切割计划错误:', error);
    res.status(500).json({
      error: '获取切割计划失败',
      message: error.message
    });
  }
});

// 获取可用于切割的项目材料
router.get('/available-projects', authenticate, async (req, res) => {
  try {
    const { materialType, thicknessSpecId } = req.query;

    const whereClause = {
      status: 'pending', // 只获取待处理的材料
      cuttingNumber: null // 还没有分配切割号的材料
    };

    const includeClause = [
      {
        association: 'project',
        attributes: ['id', 'name', 'status'],
        where: { status: ['pending', 'in_progress'] }, // 只包含进行中的项目
        include: [
          {
            association: 'assignedWorker',
            attributes: ['name']
          }
        ]
      },
      {
        association: 'thicknessSpec',
        attributes: ['thickness', 'unit', 'materialType']
      }
    ];

    // 根据参数筛选
    if (thicknessSpecId) {
      whereClause.thicknessSpecId = thicknessSpecId;
    }

    const materials = await Material.findAll({
      where: whereClause,
      include: includeClause
    });

    // 转换为前端需要的格式
    const projects = materials
      .filter(material => {
        // 根据材料类型筛选
        if (materialType && material.thicknessSpec.materialType !== materialType) {
          return false;
        }
        return true;
      })
      .map(material => ({
        projectId: material.project.id,
        projectName: material.project.name,
        materialId: material.id,
        quantity: material.quantity,
        status: 'pending',
        assignedWorker: material.project.assignedWorker?.name,
        thicknessSpec: material.thicknessSpec
      }));

    res.json({
      success: true,
      projects
    });

  } catch (error) {
    console.error('获取可用项目错误:', error);
    res.status(500).json({
      error: '获取可用项目失败',
      message: error.message
    });
  }
});

// 创建切割计划
router.post('/plans', authenticate, requireOperator, async (req, res) => {
  try {
    const {
      materialType,
      thicknessSpecId,
      projectIds,
      operatorWorkerId,
      notes
    } = req.body;

    if (!materialType || !thicknessSpecId || !projectIds || !projectIds.length) {
      return res.status(400).json({
        error: '材料类型、厚度规格和项目列表都是必需的'
      });
    }

    // 验证厚度规格
    const thicknessSpec = await ThicknessSpec.findByPk(thicknessSpecId);
    if (!thicknessSpec) {
      return res.status(404).json({
        error: '厚度规格不存在'
      });
    }

    // 验证操作员
    if (operatorWorkerId) {
      const operator = await Worker.findByPk(operatorWorkerId);
      if (!operator) {
        return res.status(404).json({
          error: '指定的操作员不存在'
        });
      }
    }

    // 查找可用的库存
    const inventory = await MaterialInventory.findOne({
      where: {
        thicknessSpecId: thicknessSpecId,
        remainingQuantity: { [MaterialInventory.sequelize.Op.gt]: 0 }
      },
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['thickness', 'unit', 'materialType']
        }
      ]
    });

    if (!inventory) {
      return res.status(400).json({
        error: '没有足够的库存材料'
      });
    }

    // 创建切割记录（作为切割计划）
    const cuttingRecord = await CuttingRecord.create({
      materialInventoryId: inventory.id,
      totalProjects: projectIds.length,
      operatorWorkerId,
      status: 'pending',
      notes
    });

    // 生成切割号
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = String(cuttingRecord.id).padStart(3, '0');
    const cuttingNumber = `C${today}-${sequence}`;

    await cuttingRecord.update({ cuttingNumber });

    // 更新相关材料的切割号
    await Material.update(
      { cuttingNumber },
      {
        where: {
          projectId: { [Material.sequelize.Op.in]: projectIds },
          thicknessSpecId: thicknessSpecId,
          status: 'pending',
          cuttingNumber: null
        }
      }
    );

    // 获取创建后的完整信息
    const createdPlan = await CuttingRecord.findByPk(cuttingRecord.id, {
      include: [
        {
          association: 'materialInventory',
          include: [
            {
              association: 'thicknessSpec',
              attributes: ['thickness', 'unit', 'materialType']
            }
          ]
        },
        {
          association: 'operator',
          attributes: ['id', 'name', 'department']
        }
      ]
    });

    res.status(201).json({
      message: '切割计划创建成功',
      plan: createdPlan
    });

    // 广播切割计划创建事件
    sseManager.broadcast('cutting-plan-created', {
      plan: createdPlan,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('创建切割计划错误:', error);
    res.status(500).json({
      error: '创建切割计划失败',
      message: error.message
    });
  }
});

// 更新切割计划状态
router.put('/plans/:id/status', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['planning', 'ready', 'cutting', 'completed'].includes(status)) {
      return res.status(400).json({
        error: '无效的状态值'
      });
    }

    const plan = await CuttingRecord.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        error: '切割计划不存在'
      });
    }

    // 更新状态
    await plan.update({ 
      status,
      cuttingDate: status === 'cutting' ? new Date().toISOString().split('T')[0] : plan.cuttingDate
    });

    // 如果是完成状态，更新相关材料状态
    if (status === 'completed') {
      await Material.update(
        { status: 'completed', completedDate: new Date().toISOString().split('T')[0] },
        { where: { cuttingNumber: plan.cuttingNumber } }
      );
    }

    // 获取更新后的完整信息
    const updatedPlan = await CuttingRecord.findByPk(id, {
      include: [
        {
          association: 'materialInventory',
          include: [
            {
              association: 'thicknessSpec',
              attributes: ['thickness', 'unit', 'materialType']
            }
          ]
        },
        {
          association: 'operator',
          attributes: ['id', 'name', 'department']
        }
      ]
    });

    res.json({
      message: '切割计划状态更新成功',
      plan: updatedPlan
    });

    // 广播状态更新事件
    sseManager.broadcast('cutting-plan-updated', {
      plan: updatedPlan,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('更新切割计划状态错误:', error);
    res.status(500).json({
      error: '更新切割计划状态失败',
      message: error.message
    });
  }
});

// 生成切割号
router.post('/plans/:id/generate-number', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await CuttingRecord.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        error: '切割计划不存在'
      });
    }

    if (plan.cuttingNumber) {
      return res.status(400).json({
        error: '切割号已存在'
      });
    }

    // 生成切割号
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = String(id).padStart(3, '0');
    const cuttingNumber = `C${today}-${sequence}`;

    await plan.update({ cuttingNumber });

    res.json({
      message: '切割号生成成功',
      cuttingNumber
    });

    // 广播切割号生成事件
    sseManager.broadcast('cutting-number-generated', {
      planId: id,
      cuttingNumber,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('生成切割号错误:', error);
    res.status(500).json({
      error: '生成切割号失败',
      message: error.message
    });
  }
});

// 批量生成切割号
router.post('/batch-generate', authenticate, requireOperator, async (req, res) => {
  try {
    const { materialIds } = req.body;

    if (!materialIds || !materialIds.length) {
      return res.status(400).json({
        error: '请提供要生成切割号的材料ID列表'
      });
    }

    const results = [];
    
    for (const materialId of materialIds) {
      try {
        const material = await Material.findByPk(materialId, {
          include: [
            {
              association: 'project',
              attributes: ['name']
            },
            {
              association: 'thicknessSpec',
              attributes: ['thickness', 'unit']
            }
          ]
        });

        if (!material) {
          results.push({
            materialId,
            success: false,
            error: '材料不存在'
          });
          continue;
        }

        if (material.cuttingNumber) {
          results.push({
            materialId,
            success: false,
            error: '切割号已存在',
            cuttingNumber: material.cuttingNumber
          });
          continue;
        }

        // 生成切割号
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const timestamp = Date.now().toString().slice(-6);
        const cuttingNumber = `C${today}-${timestamp}`;

        await material.update({ cuttingNumber });

        results.push({
          materialId,
          success: true,
          cuttingNumber,
          projectName: material.project.name
        });

      } catch (error) {
        results.push({
          materialId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      message: `批量生成切割号完成，成功 ${successCount} 个，失败 ${results.length - successCount} 个`,
      results
    });

    // 广播批量生成事件
    sseManager.broadcast('cutting-numbers-batch-generated', {
      results,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('批量生成切割号错误:', error);
    res.status(500).json({
      error: '批量生成切割号失败',
      message: error.message
    });
  }
});

// 获取切割记录
router.get('/records', authenticate, async (req, res) => {
  try {
    const { cuttingNumber, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (cuttingNumber) {
      whereClause.cuttingNumber = {
        [CuttingRecord.sequelize.Op.like]: `%${cuttingNumber}%`
      };
    }
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const records = await CuttingRecord.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'materialInventory',
          include: [
            {
              association: 'thicknessSpec',
              attributes: ['thickness', 'unit', 'materialType']
            }
          ]
        },
        {
          association: 'operator',
          attributes: ['id', 'name', 'department']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      records: records.rows,
      pagination: {
        total: records.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(records.count / limit)
      }
    });

  } catch (error) {
    console.error('获取切割记录错误:', error);
    res.status(500).json({
      error: '获取切割记录失败',
      message: error.message
    });
  }
});

module.exports = router;
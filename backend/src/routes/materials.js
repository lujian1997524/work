const express = require('express');
const { Material, ThicknessSpec, Project, Worker, WorkerMaterial, MaterialDimension, sequelize } = require('../models');
const { authenticate, requireOperator } = require('../middleware/auth');
const { 
  validateWorkerMaterialConsistency,
  validateProjectMaterialAllocation,
  validateAllocationQuantity,
  validateThicknessSpecConsistency,
  cleanupEmptyWorkerMaterials
} = require('../middleware/dataValidation');
const sseManager = require('../utils/sseManager');
const { recordMaterialUpdate } = require('../utils/operationHistory');

const router = express.Router();

// 获取所有板材列表
router.get('/', authenticate, async (req, res) => {
  try {
    const { project_id } = req.query;
    
    const whereClause = project_id ? { projectId: project_id } : {};

    const materials = await Material.findAll({
      where: whereClause,
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['id', 'thickness', 'unit', 'materialType']
        },
        {
          association: 'completedByUser',
          attributes: ['id', 'name'],
          required: false
        },
        {
          association: 'project',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['id', 'ASC']]
    });

    res.json({
      success: true,
      materials,
      count: materials.length
    });

  } catch (error) {
    console.error('获取板材列表错误:', error);
    res.status(500).json({
      error: '获取板材列表失败',
      message: error.message
    });
  }
});

// 获取项目的板材列表
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    // 验证项目是否存在
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        error: '项目不存在'
      });
    }

    const materials = await Material.findAll({
      where: { projectId },
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['id', 'thickness', 'unit', 'materialType']
        },
        {
          association: 'completedByUser',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['id', 'ASC']]
    });

    res.json({
      success: true,
      materials,
      count: materials.length
    });

  } catch (error) {
    console.error('获取项目板材列表错误:', error);
    res.status(500).json({
      error: '获取板材列表失败',
      message: error.message
    });
  }
});

// 创建板材
router.post('/', authenticate, requireOperator, async (req, res) => {
  try {
    const { projectId, thicknessSpecId, quantity = 1, notes, startDate } = req.body;

    // 验证项目和厚度规格是否存在
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        error: '项目不存在'
      });
    }

    const thicknessSpec = await ThicknessSpec.findByPk(thicknessSpecId);
    if (!thicknessSpec) {
      return res.status(404).json({
        error: '厚度规格不存在'
      });
    }

    const material = await Material.create({
      projectId,
      thicknessSpecId,
      quantity,
      notes,
      startDate,
      status: 'pending'
    });

    // 获取创建后的完整信息
    const createdMaterial = await Material.findByPk(material.id, {
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['id', 'thickness', 'unit', 'materialType']
        },
        {
          association: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      message: '板材创建成功',
      material: createdMaterial
    });

    // 广播板材状态变更事件（创建新材料也算状态变更）
    sseManager.broadcast('material-status-changed', {
      material: createdMaterial,
      oldStatus: 'empty', // 从空白状态
      newStatus: createdMaterial.status, // 到新状态
      projectId: createdMaterial.projectId,
      projectName: createdMaterial.project?.name,
      materialType: createdMaterial.thicknessSpec?.thickness + createdMaterial.thicknessSpec?.unit,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('创建板材错误:', error);
    res.status(500).json({
      error: '创建板材失败',
      message: error.message
    });
  }
});

// 更新板材状态
router.put('/:id', 
  authenticate, 
  requireOperator, 
  validateProjectMaterialAllocation,
  async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedBy, notes, startDate, completedDate } = req.body;

    const material = await Material.findByPk(id, {
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['thickness', 'unit']
        },
        {
          association: 'project',
          attributes: ['id', 'name', 'status']
        }
      ]
    });

    if (!material) {
      return res.status(404).json({
        error: '板材不存在'
      });
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedDate = new Date();
        if (completedBy) {
          updateData.completedBy = completedBy;
        }
      } else {
        // 如果状态不是completed，清除完成相关字段
        updateData.completedDate = null;
        updateData.completedBy = null;
      }
    }
    // 允许显式设置completedBy和completedDate（包括null值）
    if (completedBy !== undefined) updateData.completedBy = completedBy;
    if (notes !== undefined) updateData.notes = notes;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (completedDate !== undefined) updateData.completedDate = completedDate;

    // 记录操作历史
    if (status && status !== material.status) {
      try {
        await recordMaterialUpdate(
          material.projectId,
          {
            id: material.id,
            thicknessSpecId: material.thicknessSpecId,
            thicknessSpec: material.thicknessSpec
          },
          material.status,
          status,
          req.user.id,
          req.user.name
        );
      } catch (historyError) {
        console.error('记录材料更新历史失败:', historyError);
      }
    }

    await material.update(updateData);

    // 检查并更新项目状态
    if (status && status !== material.status) {
      const projectId = material.projectId;
      const project = material.project;
      const oldMaterialStatus = material.status; // 保存原始状态用于通知
      
      // 获取项目所有材料的状态（包括刚更新的材料）
      const allProjectMaterials = await Material.findAll({
        where: { projectId },
        attributes: ['status']
      });

      const materialStatuses = allProjectMaterials.map(m => m.status);
      const oldProjectStatus = project.status;
      let newProjectStatus = oldProjectStatus;

      // 项目状态判断逻辑
      const allCompleted = materialStatuses.every(s => s === 'completed');
      const hasInProgress = materialStatuses.some(s => s === 'in_progress');
      const allPending = materialStatuses.every(s => s === 'pending');

      if (allCompleted) {
        newProjectStatus = 'completed';
      } else if (hasInProgress || (!allPending && !allCompleted)) {
        newProjectStatus = 'in_progress';
      } else if (allPending) {
        newProjectStatus = 'pending';
      }

      // 如果项目状态需要更新
      if (newProjectStatus !== oldProjectStatus) {
        await Project.update({ status: newProjectStatus }, { where: { id: projectId } });
        
        console.log(`项目状态自动更新: ${project.name} ${oldProjectStatus} → ${newProjectStatus}`);

        // 发送项目状态变更通知（SSE事件）
        sseManager.broadcast('project-status-changed', {
          projectId,
          projectName: project.name,
          oldStatus: oldProjectStatus,
          newStatus: newProjectStatus,
          changedBy: req.user.name,
          changedById: req.user.id,
          reason: '材料状态变更导致',
          materialChanged: {
            materialId: material.id,
            thicknessSpec: material.thicknessSpec?.thickness + material.thicknessSpec?.unit,
            oldStatus: oldMaterialStatus,
            newStatus: status
          }
        }, req.user.id);
      }
    }

    // 获取更新后的完整信息
    const updatedMaterial = await Material.findByPk(id, {
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['id', 'thickness', 'unit', 'materialType']
        },
        {
          association: 'completedByUser',
          attributes: ['id', 'name']
        },
        {
          association: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      message: '板材状态更新成功',
      material: updatedMaterial
    });

    // 广播板材状态变更事件（不触发通知弹窗）
    sseManager.broadcast('material-status-changed', {
      material: updatedMaterial,
      oldStatus: material.status, // 原状态
      newStatus: status, // 新状态
      projectId: material.projectId,
      projectName: material.project?.name,
      materialType: material.thicknessSpec?.thickness + material.thicknessSpec?.unit,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('更新板材状态错误:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      sql: error.sql || '无SQL信息',
      parameters: error.parameters || '无参数信息'
    });
    res.status(500).json({
      error: '更新板材状态失败',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 删除板材(改为空白状态)
router.delete('/:id', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;

    const material = await Material.findByPk(id, {
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['thickness', 'unit']
        },
        {
          association: 'project',
          attributes: ['name']
        }
      ]
    });

    if (!material) {
      return res.status(404).json({
        error: '板材不存在'
      });
    }

    // 保存删除前的信息用于SSE广播
    const deletedMaterialInfo = {
      id: material.id,
      projectId: material.projectId,
      projectName: material.project?.name,
      materialType: material.thicknessSpec?.thickness + material.thicknessSpec?.unit,
      oldStatus: material.status
    };

    // 记录操作历史（删除操作）
    try {
      await recordMaterialUpdate(
        material.projectId,
        {
          id: material.id,
          thicknessSpecId: material.thicknessSpecId,
          thicknessSpec: material.thicknessSpec
        },
        material.status,
        'empty',
        req.user.id,
        req.user.name
      );
    } catch (historyError) {
      console.error('记录材料删除历史失败:', historyError);
    }

    await material.destroy();

    res.json({
      message: '板材删除成功'
    });

    // 广播板材状态变更事件（删除材料相当于改为空白状态）
    sseManager.broadcast('material-status-changed', {
      material: { id: deletedMaterialInfo.id },
      oldStatus: deletedMaterialInfo.oldStatus,
      newStatus: 'empty', // 删除后变为空白状态
      projectId: deletedMaterialInfo.projectId,
      projectName: deletedMaterialInfo.projectName,
      materialType: deletedMaterialInfo.materialType,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('删除板材错误:', error);
    res.status(500).json({
      error: '删除板材失败',
      message: error.message
    });
  }
});

// 批量更新板材状态
router.put('/batch/status', authenticate, requireOperator, async (req, res) => {
  try {
    const { materialIds, status, completedBy } = req.body;

    if (!materialIds || !Array.isArray(materialIds) || materialIds.length === 0) {
      return res.status(400).json({
        error: '请选择要更新的板材'
      });
    }

    if (!status) {
      return res.status(400).json({
        error: '请指定状态'
      });
    }

    const updateData = { status };
    if (status === 'completed') {
      updateData.completedDate = new Date();
      if (completedBy) {
        updateData.completedBy = completedBy;
      }
    }

    const [updatedCount] = await Material.update(updateData, {
      where: {
        id: materialIds
      }
    });

    res.json({
      message: `成功更新 ${updatedCount} 个板材的状态`,
      updatedCount
    });

    // 广播批量板材状态变更事件（不触发通知弹窗）
    sseManager.broadcast('material-batch-status-changed', {
      materialIds,
      status,
      updatedCount,
      userName: req.user.name,
      userId: req.user.id
    }, req.user.id);

  } catch (error) {
    console.error('批量更新板材状态错误:', error);
    res.status(500).json({
      error: '批量更新失败',
      message: error.message
    });
  }
});

// 获取板材统计信息
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const whereClause = projectId ? { projectId } : {};

    const stats = await Material.findAll({
      where: whereClause,
      attributes: [
        'status',
        [Material.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const result = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      total: 0
    };

    stats.forEach(stat => {
      result[stat.status] = parseInt(stat.count);
      result.total += parseInt(stat.count);
    });

    // 计算完成率
    result.completionRate = result.total > 0 
      ? Math.round((result.completed / result.total) * 100) 
      : 0;

    res.json({ stats: result });

  } catch (error) {
    console.error('获取板材统计错误:', error);
    res.status(500).json({
      error: '获取统计信息失败',
      message: error.message
    });
  }
});

// 获取材料类型统计数据（支持碳板优先策略）
router.get('/type-stats', authenticate, async (req, res) => {
  try {
    console.log('🔧 获取材料类型统计数据...');
    
    // 使用原生SQL查询获取精确的统计数据
    const query = `
      SELECT 
        ts.id as thicknessSpecId,
        ts.thickness,
        ts.unit,
        ts.material_type as materialType,
        ts.is_active as isActive,
        ts.sort_order as sortOrder,
        COUNT(m.id) as totalMaterials,
        COUNT(CASE WHEN m.status = 'pending' THEN 1 END) as pendingCount,
        COUNT(CASE WHEN m.status = 'in_progress' THEN 1 END) as inProgressCount,
        COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as completedCount,
        COUNT(DISTINCT m.project_id) as projectCount,
        COUNT(CASE WHEN p.is_past_project = false THEN m.id END) as activeMaterials
      FROM thickness_specs ts
      LEFT JOIN materials m ON ts.id = m.thickness_spec_id
      LEFT JOIN projects p ON m.project_id = p.id
      WHERE ts.is_active = 1
      GROUP BY ts.id, ts.thickness, ts.unit, ts.material_type, ts.is_active, ts.sort_order
      ORDER BY 
        CASE 
          WHEN (ts.material_type IS NULL OR ts.material_type = '碳板') THEN 0 
          ELSE 1 
        END,
        ts.sort_order ASC
    `;
    
    const [results] = await sequelize.query(query);
    
    // 处理查询结果，分类为碳板和特殊材料
    const carbonMaterials = [];
    const specialMaterials = [];
    
    results.forEach(row => {
      const materialStat = {
        thicknessSpecId: row.thicknessSpecId,
        thickness: row.thickness,
        unit: row.unit,
        materialType: row.materialType || '碳板',
        isActive: Boolean(row.isActive),
        sortOrder: row.sortOrder,
        stats: {
          totalMaterials: parseInt(row.totalMaterials) || 0,
          pendingCount: parseInt(row.pendingCount) || 0,
          inProgressCount: parseInt(row.inProgressCount) || 0,
          completedCount: parseInt(row.completedCount) || 0,
          projectCount: parseInt(row.projectCount) || 0,
          activeMaterials: parseInt(row.activeMaterials) || 0,
          completionRate: row.totalMaterials > 0 
            ? Math.round((row.completedCount / row.totalMaterials) * 100) 
            : 0
        }
      };
      
      // 按照95/5策略分类
      if (!row.materialType || row.materialType === '碳板') {
        carbonMaterials.push(materialStat);
      } else {
        specialMaterials.push(materialStat);
      }
    });
    
    // 计算汇总统计
    const totalCarbonMaterials = carbonMaterials.reduce((sum, item) => sum + item.stats.totalMaterials, 0);
    const totalSpecialMaterials = specialMaterials.reduce((sum, item) => sum + item.stats.totalMaterials, 0);
    const totalMaterials = totalCarbonMaterials + totalSpecialMaterials;
    
    const summary = {
      totalMaterials,
      carbonMaterials: {
        count: carbonMaterials.length,
        totalMaterials: totalCarbonMaterials,
        percentage: totalMaterials > 0 ? Math.round((totalCarbonMaterials / totalMaterials) * 100) : 0,
        completedMaterials: carbonMaterials.reduce((sum, item) => sum + item.stats.completedCount, 0),
        inProgressMaterials: carbonMaterials.reduce((sum, item) => sum + item.stats.inProgressCount, 0),
        pendingMaterials: carbonMaterials.reduce((sum, item) => sum + item.stats.pendingCount, 0)
      },
      specialMaterials: {
        count: specialMaterials.length,
        totalMaterials: totalSpecialMaterials,
        percentage: totalMaterials > 0 ? Math.round((totalSpecialMaterials / totalMaterials) * 100) : 0,
        completedMaterials: specialMaterials.reduce((sum, item) => sum + item.stats.completedCount, 0),
        inProgressMaterials: specialMaterials.reduce((sum, item) => sum + item.stats.inProgressCount, 0),
        pendingMaterials: specialMaterials.reduce((sum, item) => sum + item.stats.pendingCount, 0)
      },
      strategy95_5: {
        actual: {
          carbon: totalMaterials > 0 ? Math.round((totalCarbonMaterials / totalMaterials) * 100) : 0,
          special: totalMaterials > 0 ? Math.round((totalSpecialMaterials / totalMaterials) * 100) : 0
        },
        target: {
          carbon: 95,
          special: 5
        },
        deviation: {
          carbon: totalMaterials > 0 ? Math.round((totalCarbonMaterials / totalMaterials) * 100) - 95 : 0,
          special: totalMaterials > 0 ? Math.round((totalSpecialMaterials / totalMaterials) * 100) - 5 : 0
        }
      }
    };
    
    console.log('✅ 材料类型统计完成:', {
      碳板种类: carbonMaterials.length,
      特殊材料种类: specialMaterials.length,
      总材料数: totalMaterials,
      碳板占比: summary.carbonMaterials.percentage + '%',
      特殊材料占比: summary.specialMaterials.percentage + '%'
    });
    
    res.json({
      summary,
      carbonMaterials,
      specialMaterials,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('获取材料类型统计失败:', error);
    res.status(500).json({
      error: '获取材料类型统计失败',
      message: error.message
    });
  }
});

// 板材分配API - 从工人库存中分配特定尺寸的板材给项目
router.post('/allocate', 
  authenticate, 
  requireOperator, 
  validateThicknessSpecConsistency,
  validateAllocationQuantity,
  validateProjectMaterialAllocation,
  async (req, res) => {
  try {
    const {
      projectId,
      materialId, // 项目Material记录ID
      workerMaterialId, // 工人材料记录ID
      dimensionId, // 可选：特定尺寸ID
      allocateQuantity, // 分配数量
      notes
    } = req.body;

    // 验证必填字段
    if (!projectId || !materialId || !workerMaterialId || !allocateQuantity || allocateQuantity <= 0) {
      return res.status(400).json({
        error: '缺少必填字段或分配数量无效'
      });
    }

    // 使用事务确保数据一致性
    const result = await sequelize.transaction(async (transaction) => {
      // 1. 验证项目Material记录
      const projectMaterial = await Material.findByPk(materialId, {
        include: [
          { association: 'project' },
          { association: 'thicknessSpec' }
        ],
        transaction
      });

      if (!projectMaterial) {
        throw new Error('项目材料记录不存在');
      }

      if (projectMaterial.projectId !== parseInt(projectId)) {
        throw new Error('材料记录与项目不匹配');
      }

      // 2. 验证工人材料记录
      const workerMaterial = await WorkerMaterial.findByPk(workerMaterialId, {
        include: [
          { association: 'worker' },
          { association: 'thicknessSpec' },
          { association: 'dimensions' }
        ],
        transaction
      });

      if (!workerMaterial) {
        throw new Error('工人材料记录不存在');
      }

      // 3. 验证厚度规格匹配
      if (projectMaterial.thicknessSpecId !== workerMaterial.thicknessSpecId) {
        throw new Error('项目材料和工人材料的厚度规格不匹配');
      }

      // 4. 处理特定尺寸分配（如果指定了dimensionId）
      let allocatedDimension = null;
      if (dimensionId) {
        const dimension = await MaterialDimension.findByPk(dimensionId, { transaction });
        if (!dimension || dimension.workerMaterialId !== workerMaterialId) {
          throw new Error('指定的尺寸记录不存在或不属于该工人材料');
        }

        if (dimension.quantity < allocateQuantity) {
          throw new Error(`指定尺寸库存不足，可用数量: ${dimension.quantity}`);
        }

        // 扣减尺寸库存
        await dimension.update({
          quantity: dimension.quantity - allocateQuantity
        }, { transaction });

        // 如果尺寸数量为0，删除该尺寸记录
        if (dimension.quantity - allocateQuantity === 0) {
          await dimension.destroy({ transaction });
        }

        allocatedDimension = {
          width: dimension.width,
          height: dimension.height,
          quantity: allocateQuantity,
          notes: dimension.notes
        };
      } else {
        // 通用分配：从工人材料总量中扣减
        if (workerMaterial.quantity < allocateQuantity) {
          throw new Error(`工人材料库存不足，可用数量: ${workerMaterial.quantity}`);
        }

        // 扣减工人材料总量
        await workerMaterial.update({
          quantity: workerMaterial.quantity - allocateQuantity
        }, { transaction });
      }

      // 5. 更新项目Material记录
      const updatedProjectMaterial = await projectMaterial.update({
        quantity: projectMaterial.quantity + allocateQuantity,
        assignedFromWorkerMaterialId: workerMaterialId,
        status: projectMaterial.status === 'pending' ? 'pending' : projectMaterial.status,
        notes: notes || projectMaterial.notes,
        startDate: projectMaterial.startDate || new Date()
      }, { transaction });

      // 6. 如果工人材料总量为0且没有尺寸记录，删除工人材料记录
      const remainingDimensions = await MaterialDimension.count({
        where: { workerMaterialId: workerMaterialId },
        transaction
      });

      if (workerMaterial.quantity === 0 && remainingDimensions === 0) {
        await workerMaterial.destroy({ transaction });
      }

      return {
        projectMaterial: updatedProjectMaterial,
        workerMaterial,
        allocatedDimension,
        allocateQuantity
      };
    });

    res.json({
      success: true,
      message: `成功分配 ${allocateQuantity} 张板材`,
      allocation: {
        projectId,
        materialId,
        allocateQuantity,
        allocatedDimension: result.allocatedDimension,
        projectMaterial: result.projectMaterial
      }
    });

    // 发送SSE事件通知
    try {
      sseManager.broadcast('material-allocated', {
        projectId,
        projectName: result.projectMaterial.project?.name,
        workerName: result.workerMaterial.worker?.name,
        materialType: result.projectMaterial.thicknessSpec?.materialType || '碳板',
        thickness: result.projectMaterial.thicknessSpec?.thickness,
        allocateQuantity,
        allocatedDimension: result.allocatedDimension,
        userName: req.user.name,
        userId: req.user.id
      }, req.user.id);

      console.log(`板材分配完成: 项目 ${result.projectMaterial.project?.name}, 分配数量: ${allocateQuantity} 张`);
    } catch (sseError) {
      console.error('发送板材分配SSE事件失败:', sseError);
    }

  } catch (error) {
    console.error('板材分配失败:', error);
    res.status(500).json({
      success: false,
      error: '板材分配失败',
      message: error.message
    });
  }
});

module.exports = router;
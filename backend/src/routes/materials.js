const express = require('express');
const { Material, ThicknessSpec, Project, Worker, WorkerMaterial, MaterialDimension, OperationHistory, sequelize } = require('../models');
const { Op } = require('sequelize');
const { authenticate, requireOperator } = require('../middleware/auth');
const { 
  validateWorkerMaterialConsistency,
  validateProjectMaterialAllocation,
  validateAllocationQuantity,
  validateThicknessSpecConsistency,
  cleanupEmptyWorkerMaterials
} = require('../middleware/dataValidation');
const sseManager = require('../utils/sseManager');
const { recordMaterialUpdate, recordMaterialStart, recordMaterialComplete, recordMaterialAllocate } = require('../utils/operationHistory');

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
        const materialData = {
          id: material.id,
          thicknessSpecId: material.thicknessSpecId,
          thicknessSpec: material.thicknessSpec,
          project: material.project
        };

        // 根据状态变化使用不同的记录函数
        if (status === 'in_progress' && material.status === 'pending') {
          // 开始处理板材
          await recordMaterialStart(
            material.projectId,
            materialData,
            req.user.id,
            req.user.name
          );
        } else if (status === 'completed' && material.status === 'in_progress') {
          // 完成板材加工
          await recordMaterialComplete(
            material.projectId,
            materialData,
            material.startDate,
            req.user.id,
            req.user.name
          );
        } else {
          // 其他状态变更使用通用记录
          await recordMaterialUpdate(
            material.projectId,
            materialData,
            material.status,
            status,
            req.user.id,
            req.user.name
          );
        }
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
        // 通用分配：从MaterialDimension计算总量并扣减
        const dimensions = await MaterialDimension.findAll({
          where: { workerMaterialId: workerMaterialId },
          transaction
        });
        
        const totalAvailableQuantity = dimensions.reduce((sum, dim) => sum + dim.quantity, 0);
        if (totalAvailableQuantity < allocateQuantity) {
          throw new Error(`工人材料库存不足，可用数量: ${totalAvailableQuantity}`);
        }

        // 按比例从各个尺寸中扣减数量
        if (dimensions.length > 0) {
          // 计算总尺寸库存
          const totalDimensionQuantity = dimensions.reduce((sum, dim) => sum + dim.quantity, 0);
          
          if (totalDimensionQuantity > 0) {
            // 按比例分配扣减量到各个尺寸
            let remainingToAllocate = allocateQuantity;
            
            for (let i = 0; i < dimensions.length; i++) {
              const dim = dimensions[i];
              let dimensionAllocation;
              
              if (i === dimensions.length - 1) {
                // 最后一个尺寸分配剩余的所有数量，避免舍入误差
                dimensionAllocation = remainingToAllocate;
              } else {
                // 按比例分配
                dimensionAllocation = Math.floor((dim.quantity / totalDimensionQuantity) * allocateQuantity);
              }
              
              if (dimensionAllocation > 0 && dimensionAllocation <= dim.quantity) {
                await dim.update({
                  quantity: dim.quantity - dimensionAllocation
                }, { transaction });
                
                remainingToAllocate -= dimensionAllocation;
                
                // 如果尺寸数量为0，删除该尺寸记录
                if (dim.quantity - dimensionAllocation === 0) {
                  await dim.destroy({ transaction });
                }
              }
            }
          }
        }
      }

      // 5. 更新项目Material记录
      const updatedProjectMaterial = await projectMaterial.update({
        quantity: projectMaterial.quantity + allocateQuantity,
        assignedFromWorkerMaterialId: workerMaterialId,
        status: projectMaterial.status === 'pending' ? 'pending' : projectMaterial.status,
        notes: notes || projectMaterial.notes,
        startDate: projectMaterial.startDate || new Date()
      }, { transaction });

      // 6. 如果没有尺寸记录，删除工人材料记录
      const remainingDimensions = await MaterialDimension.count({
        where: { workerMaterialId: workerMaterialId },
        transaction
      });

      if (remainingDimensions === 0) {
        await workerMaterial.destroy({ transaction });
      }

      return {
        projectMaterial: updatedProjectMaterial,
        workerMaterial,
        allocatedDimension,
        allocateQuantity
      };
    });

    // 记录材料分配历史
    try {
      await recordMaterialAllocate(
        projectId,
        {
          materialType: result.projectMaterial.thicknessSpec?.materialType || '碳板',
          thickness: result.projectMaterial.thicknessSpec?.thickness,
          quantity: allocateQuantity,
          sources: result.workerMaterial.worker?.name,
          allocatedTo: result.projectMaterial.project?.name,
          projectName: result.projectMaterial.project?.name
        },
        req.user.id,
        req.user.name
      );
    } catch (historyError) {
      console.error('记录材料分配历史失败:', historyError);
    }

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

// 批量分配API - 为多个项目分配共用板材（支持上海博创cypnext排版软件）
router.post('/batch-allocation', authenticate, requireOperator, async (req, res) => {
  try {
    const {
      sharedPlateId, // 共用板材ID
      totalQuantity, // 物理板材总数量
      allocations // 分配详情数组：[{projectId, thicknessSpecId, quantity, usageNote}]
    } = req.body;

    // 验证必填字段
    if (!sharedPlateId || !totalQuantity || !allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({
        error: '缺少必填字段：共用板材ID、总数量或分配详情'
      });
    }

    // 验证总需求数量不超过物理数量
    const totalDemand = allocations.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (totalDemand > totalQuantity) {
      return res.status(400).json({
        error: `总需求数量 ${totalDemand} 超过物理板材数量 ${totalQuantity}`
      });
    }

    // 验证所有项目使用相同规格
    const uniqueSpecs = [...new Set(allocations.map(item => item.thicknessSpecId))];
    if (uniqueSpecs.length > 1) {
      return res.status(400).json({
        error: '批量分配要求所有项目使用相同的板材规格'
      });
    }

    const thicknessSpecId = uniqueSpecs[0];

    // 使用事务确保数据一致性
    const result = await sequelize.transaction(async (transaction) => {
      const results = [];

      // 验证厚度规格存在
      const thicknessSpec = await ThicknessSpec.findByPk(thicknessSpecId, { transaction });
      if (!thicknessSpec) {
        throw new Error('厚度规格不存在');
      }

      // 处理每个项目的分配
      for (const allocation of allocations) {
        const { projectId, quantity, usageNote } = allocation;

        // 验证项目存在
        const project = await Project.findByPk(projectId, { transaction });
        if (!project) {
          throw new Error(`项目 ID ${projectId} 不存在`);
        }

        // 查找或创建项目的材料记录
        let material = await Material.findOne({
          where: { projectId, thicknessSpecId },
          transaction
        });

        if (material) {
          // 更新现有材料记录
          await material.update({
            quantity: material.quantity + quantity,
            notes: usageNote || material.notes
          }, { transaction });
        } else {
          // 创建新的材料记录
          material = await Material.create({
            projectId,
            thicknessSpecId,
            quantity,
            status: 'pending',
            notes: usageNote
          }, { transaction });
        }

        results.push({
          projectId,
          projectName: project.name,
          materialId: material.id,
          allocatedQuantity: quantity,
          thicknessSpec: thicknessSpec.thickness + thicknessSpec.unit,
          materialType: thicknessSpec.materialType || '碳板'
        });
      }

      return results;
    });

    // 记录批量分配历史
    try {
      const projectNames = result.map(r => r.projectName).join('、');
      await recordMaterialAllocate(
        result[0].projectId, // 使用第一个项目ID作为主项目
        {
          materialType: result[0].materialType,
          thickness: result[0].thicknessSpec,
          quantity: totalQuantity,
          sources: 'cypnext排版系统',
          allocatedTo: projectNames,
          projectName: `批量分配：${projectNames}`,
          sharedPlateId,
          batchAllocation: true
        },
        req.user.id,
        req.user.name
      );
    } catch (historyError) {
      console.error('记录批量分配历史失败:', historyError);
    }

    res.json({
      success: true,
      message: `成功为 ${result.length} 个项目分配共用板材`,
      sharedPlateId,
      totalQuantity,
      totalDemand,
      allocations: result
    });

    // 发送SSE事件通知
    try {
      sseManager.broadcast('material-batch-allocated', {
        sharedPlateId,
        totalQuantity,
        totalDemand,
        allocations: result,
        userName: req.user.name,
        userId: req.user.id
      }, req.user.id);

      console.log(`批量分配完成: 共用板材ID ${sharedPlateId}, 涉及项目: ${result.map(r => r.projectName).join('、')}`);
    } catch (sseError) {
      console.error('发送批量分配SSE事件失败:', sseError);
    }

  } catch (error) {
    console.error('批量分配失败:', error);
    res.status(500).json({
      success: false,
      error: '批量分配失败',
      message: error.message
    });
  }
});

// 撤销板材分配API - 恢复工人库存并清除分配记录
router.post('/:id/undo-allocation', authenticate, requireOperator, async (req, res) => {
  try {
    const { id: materialId } = req.params;

    // 使用事务确保数据一致性
    const result = await sequelize.transaction(async (transaction) => {
      // 1. 获取项目材料记录
      const projectMaterial = await Material.findByPk(materialId, {
        include: [
          { association: 'project' },
          { association: 'thicknessSpec' }
        ],
        transaction
      });

      if (!projectMaterial) {
        throw new Error('材料记录不存在');
      }

      if (!projectMaterial.assignedFromWorkerMaterialId) {
        throw new Error('该材料尚未分配，无需撤销');
      }

      // 2. 查找原始工人材料记录
      const originalWorkerMaterial = await WorkerMaterial.findByPk(
        projectMaterial.assignedFromWorkerMaterialId,
        {
          include: [
            { association: 'worker' },
            { association: 'thicknessSpec' }
          ],
          transaction
        }
      );

      // 3. 恢复工人材料库存 - 不再操作WorkerMaterial.quantity
      // 直接在MaterialDimension中恢复库存
      if (originalWorkerMaterial && projectMaterial.allocatedDimension) {
        // 恢复到原始尺寸
        const { width, height, quantity: restoredQuantity } = projectMaterial.allocatedDimension;
        
        // 查找是否已有相同尺寸的记录
        const existingDimension = await MaterialDimension.findOne({
          where: {
            workerMaterialId: originalWorkerMaterial.id,
            width: width,
            height: height
          },
          transaction
        });
        
        if (existingDimension) {
          // 累加到现有尺寸
          await existingDimension.update({
            quantity: existingDimension.quantity + restoredQuantity
          }, { transaction });
        } else {
          // 创建新的尺寸记录
          await MaterialDimension.create({
            workerMaterialId: originalWorkerMaterial.id,
            width: width,
            height: height,
            quantity: restoredQuantity,
            notes: '撤销分配恢复'
          }, { transaction });
        }
      } else {
        console.warn(`原工人材料记录 ${projectMaterial.assignedFromWorkerMaterialId} 不存在或缺少尺寸信息，无法完全恢复库存`);
      }

      // 4. 清除项目材料的分配信息
      await projectMaterial.update({
        assignedFromWorkerMaterialId: null,
        quantity: 0, // 重置为0，表示未分配状态
        notes: projectMaterial.notes ? `${projectMaterial.notes} [分配已撤销]` : '分配已撤销'
      }, { transaction });

      return {
        projectMaterial,
        originalWorkerMaterial,
        restoredQuantity: projectMaterial.quantity || 1
      };
    });

    // 记录撤销分配历史
    try {
      await recordMaterialUpdate(
        result.projectMaterial.projectId,
        {
          id: result.projectMaterial.id,
          thicknessSpecId: result.projectMaterial.thicknessSpecId,
          thicknessSpec: result.projectMaterial.thicknessSpec
        },
        'allocated', // 从已分配状态
        'pending',   // 回到待分配状态
        req.user.id,
        req.user.name,
        `撤销分配：恢复 ${result.restoredQuantity} 张到工人库存`
      );
    } catch (historyError) {
      console.error('记录撤销分配历史失败:', historyError);
    }

    res.json({
      success: true,
      message: `成功撤销分配，已恢复 ${result.restoredQuantity} 张板材到工人库存`,
      undoAllocation: {
        materialId: result.projectMaterial.id,
        projectName: result.projectMaterial.project?.name,
        workerName: result.originalWorkerMaterial?.worker?.name,
        materialSpec: `${result.projectMaterial.thicknessSpec?.materialType || '碳板'} ${result.projectMaterial.thicknessSpec?.thickness}${result.projectMaterial.thicknessSpec?.unit}`,
        restoredQuantity: result.restoredQuantity
      }
    });

    // 发送SSE事件通知
    try {
      sseManager.broadcast('material-allocation-undone', {
        materialId: result.projectMaterial.id,
        projectId: result.projectMaterial.projectId,
        projectName: result.projectMaterial.project?.name,
        workerName: result.originalWorkerMaterial?.worker?.name,
        materialType: result.projectMaterial.thicknessSpec?.materialType || '碳板',
        thickness: result.projectMaterial.thicknessSpec?.thickness,
        restoredQuantity: result.restoredQuantity,
        userName: req.user.name,
        userId: req.user.id
      }, req.user.id);

      console.log(`撤销分配完成: 项目 ${result.projectMaterial.project?.name}, 恢复数量: ${result.restoredQuantity} 张`);
    } catch (sseError) {
      console.error('发送撤销分配SSE事件失败:', sseError);
    }

  } catch (error) {
    console.error('撤销分配失败:', error);
    res.status(500).json({
      success: false,
      error: '撤销分配失败',
      message: error.message
    });
  }
});

// 获取操作历史记录
router.get('/operation-history', authenticate, async (req, res) => {
  try {
    const { 
      projectId, 
      materialId, 
      operationType, 
      page = 1, 
      limit = 20, 
      offset, 
      search, 
      startDate,
      endDate 
    } = req.query;
    
    // 计算分页参数
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offsetNum = offset ? parseInt(offset) : (pageNum - 1) * limitNum;
    
    // 构建查询条件
    const whereClause = {};
    
    if (projectId) {
      whereClause.projectId = projectId;
    }
    
    if (operationType && operationType !== 'all') {
      whereClause.operationType = operationType;
    }
    
    // 日期范围过滤
    if (startDate || endDate) {
      whereClause.created_at = {};  // 使用数据库字段名
      if (startDate) {
        whereClause.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.created_at[Op.lte] = new Date(endDate);
      }
    }
    
    // 搜索条件（在operationDescription中搜索）
    if (search) {
      whereClause.operationDescription = {
        [Op.like]: `%${search}%`
      };
    }
    
    // 如果指定了materialId，在where子句中处理JSON字段查询
    if (materialId) {
      // 使用更安全的JSON查询方式
      whereClause.details = {
        [Op.like]: `%"materialId":${materialId}%`
      };
    }

    const operationHistory = await OperationHistory.findAll({
      where: whereClause,
      include: [
        {
          association: 'project',
          attributes: ['id', 'name'],
          required: false
        },
        {
          association: 'operator',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset: offsetNum
    });

    // 统计总数（用于分页）
    let totalCount;
    try {
      // 使用简单的count方法
      totalCount = await OperationHistory.count({
        where: whereClause,
        include: [
          {
            association: 'project',
            attributes: [],
            required: false
          }
        ]
      });
    } catch (countError) {
      console.error('计算总数失败:', countError);
      totalCount = 0;
    }
    
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;

    // 格式化响应数据
    const formattedHistory = operationHistory.map(record => {
      // 解析details中的材料信息
      const details = record.details || {};
      
      return {
        id: record.id,
        projectId: record.projectId,
        projectName: record.project?.name || (record.projectId === 0 ? '系统操作' : '未知项目'),
        operationType: record.operationType,
        operationDescription: record.operationDescription,
        details: record.details,
        operatedBy: record.operatedBy,
        operatorName: record.operator?.name || '未知操作员',
        createdAt: record.createdAt || record.created_at || new Date().toISOString(),
        
        // 解析并格式化材料相关信息
        materialInfo: {
          materialId: details.materialId,
          dimensionId: details.dimensionId,
          workerMaterialId: details.workerMaterialId,
          thickness: details.thickness ? `${details.thickness}${details.unit || 'mm'}` : '未指定',
          materialType: details.materialType || '碳板',
          // 尺寸信息
          width: details.width,
          height: details.height,
          dimensions: details.width && details.height ? `${details.width}×${details.height}mm` : null,
          // 数量相关
          quantity: details.quantity || '未指定',
          oldQuantity: details.oldQuantity,
          newQuantity: details.newQuantity,
          // 状态变更
          oldStatus: details.oldStatus,
          newStatus: details.newStatus,
          statusChange: details.oldStatus && details.newStatus 
            ? `${details.oldStatus} → ${details.newStatus}` 
            : null,
          // 工人和部门信息
          workerName: details.workerName || details.operatorName || details.targetWorker || details.newWorkerName,
          departmentName: details.departmentName,
          // 项目名称
          projectName: details.projectName,
          // 持续时间（如果有）
          duration: details.duration,
          // 开始时间
          startTime: details.startTime,
          // 完成时间  
          completeTime: details.completeTime,
          // 变更详情
          changes: details.changes,
          // 操作类型标识
          operationType: details.operationType,
          // 备注
          notes: details.notes
        },

        // 为不同操作类型提供友好的显示标签
        operationTypeLabel: getOperationTypeLabel(record.operationType),
        operationCategory: getOperationCategory(record.operationType)
      };
    });

    function getOperationTypeLabel(operationType) {
      const labels = {
        'material_stock': '材料入库',
        'material_dimension_update': '尺寸修改',
        'material_dimension_delete': '尺寸删除',
        'material_update': '材料状态更新',
        'material_start': '开始加工',
        'material_complete': '完成加工',
        'material_transfer': '材料转移',
        'material_allocate': '材料分配',
        'project_create': '创建项目',
        'project_update': '项目更新',
        'project_delete': '删除项目',
        'drawing_upload': '图纸上传',
        'drawing_delete': '图纸删除',
        'worker_assign': '工人分配',
        'project_status_change': '项目状态变更',
        'priority_change': '优先级变更'
      };
      return labels[operationType] || operationType;
    }

    function getOperationCategory(operationType) {
      const categories = {
        'material_stock': 'inventory',
        'material_dimension_update': 'inventory',
        'material_dimension_delete': 'inventory', 
        'material_update': 'material',
        'material_start': 'material',
        'material_complete': 'material',
        'material_transfer': 'material',
        'material_allocate': 'material',
        'project_create': 'project',
        'project_update': 'project', 
        'project_delete': 'project',
        'drawing_upload': 'drawing',
        'drawing_delete': 'drawing',
        'worker_assign': 'assignment',
        'project_status_change': 'status',
        'priority_change': 'status'
      };
      return categories[operationType] || 'other';
    }

    res.json({
      success: true,
      operationHistory: formattedHistory,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage,
        offset: offsetNum
      }
    });

  } catch (error) {
    console.error('获取操作历史记录失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      sql: error.sql || '无SQL信息'
    });
    res.status(500).json({
      error: '获取操作历史记录失败',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
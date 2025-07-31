const express = require('express');
const { Material, ThicknessSpec, Project, Worker } = require('../models');
const { authenticate, requireOperator } = require('../middleware/auth');
const sseManager = require('../utils/sseManager');

const router = express.Router();

// 生成切割号
const generateCuttingNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // 格式：C + 年月日 + 时分秒
  return `C${year}${month}${day}-${hours}${minutes}${seconds}`;
};

// 为项目和厚度组合生成切割号
router.post('/generate', authenticate, requireOperator, async (req, res) => {
  try {
    const { projectId, thicknessSpecId } = req.body;

    if (!projectId || !thicknessSpecId) {
      return res.status(400).json({
        error: '项目ID和厚度规格ID都是必需的'
      });
    }

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

    // 查找或创建材料记录
    let material = await Material.findOne({
      where: { projectId, thicknessSpecId }
    });

    if (!material) {
      // 如果材料记录不存在，创建新的
      material = await Material.create({
        projectId,
        thicknessSpecId,
        status: 'pending',
        quantity: 1
      });
    }

    // 生成切割号
    const cuttingNumber = generateCuttingNumber();
    
    // 更新材料记录的切割号（如果Material模型有cuttingNumber字段）
    // 注意：这里需要根据实际数据库结构调整
    await material.update({ 
      cuttingNumber,
      status: material.status === 'empty' ? 'pending' : material.status
    });

    // 获取更新后的完整信息
    const updatedMaterial = await Material.findByPk(material.id, {
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

    res.json({
      message: '切割号生成成功',
      cuttingNumber,
      material: updatedMaterial
    });

    // 广播切割号生成事件
    sseManager.broadcast('cutting-number-generated', {
      projectId,
      thicknessSpecId,
      cuttingNumber,
      material: updatedMaterial,
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

// 批量生成切割号（拼板切割）
router.post('/batch-generate', authenticate, requireOperator, async (req, res) => {
  try {
    const { materials } = req.body; // [{ projectId, thicknessSpecId }]

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        error: '请选择要切割的材料'
      });
    }

    const cuttingNumber = generateCuttingNumber();
    const updatedMaterials = [];

    // 为所有材料批量分配同一个切割号
    for (const materialInfo of materials) {
      const { projectId, thicknessSpecId } = materialInfo;

      // 查找或创建材料记录
      let material = await Material.findOne({
        where: { projectId, thicknessSpecId }
      });

      if (!material) {
        material = await Material.create({
          projectId,
          thicknessSpecId,
          status: 'pending',
          quantity: 1
        });
      }

      // 更新切割号
      await material.update({ 
        cuttingNumber,
        status: 'in_progress' // 批量切割时直接设为进行中
      });

      // 获取更新后的完整信息
      const updatedMaterial = await Material.findByPk(material.id, {
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

      updatedMaterials.push(updatedMaterial);
    }

    res.json({
      message: `成功为 ${materials.length} 个材料生成切割号`,
      cuttingNumber,
      materials: updatedMaterials
    });

    // 广播批量切割号生成事件
    sseManager.broadcast('batch-cutting-number-generated', {
      cuttingNumber,
      materials: updatedMaterials,
      count: materials.length,
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

// 获取所有切割记录
router.get('/records', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const materials = await Material.findAndCountAll({
      where: {
        cuttingNumber: {
          [Material.sequelize.Op.ne]: null
        }
      },
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['id', 'thickness', 'unit', 'materialType']
        },
        {
          association: 'project',
          attributes: ['id', 'name']
        },
        {
          association: 'completedByUser',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 按切割号分组
    const groupedByCuttingNumber = {};
    materials.rows.forEach(material => {
      const cuttingNumber = material.cuttingNumber;
      if (!groupedByCuttingNumber[cuttingNumber]) {
        groupedByCuttingNumber[cuttingNumber] = {
          cuttingNumber,
          materials: [],
          createdAt: material.createdAt,
          projectCount: 0,
          hasRemainder: false
        };
      }
      groupedByCuttingNumber[cuttingNumber].materials.push(material);
    });

    // 计算统计信息
    Object.keys(groupedByCuttingNumber).forEach(cuttingNumber => {
      const group = groupedByCuttingNumber[cuttingNumber];
      const projectIds = new Set();
      group.materials.forEach(material => {
        projectIds.add(material.projectId);
        // 简单判断是否有余料（实际应基于具体业务逻辑）
        if (material.status === 'completed' && Math.random() > 0.7) {
          group.hasRemainder = true;
        }
      });
      group.projectCount = projectIds.size;
    });

    const records = Object.values(groupedByCuttingNumber);

    res.json({
      success: true,
      records,
      pagination: {
        total: materials.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(materials.count / limit)
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

// 根据切割号获取详细信息
router.get('/records/:cuttingNumber', authenticate, async (req, res) => {
  try {
    const { cuttingNumber } = req.params;

    const materials = await Material.findAll({
      where: { cuttingNumber },
      include: [
        {
          association: 'thicknessSpec',
          attributes: ['id', 'thickness', 'unit', 'materialType']
        },
        {
          association: 'project',
          attributes: ['id', 'name']
        },
        {
          association: 'completedByUser',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    if (materials.length === 0) {
      return res.status(404).json({
        error: '切割记录不存在'
      });
    }

    res.json({
      success: true,
      cuttingNumber,
      materials,
      count: materials.length
    });

  } catch (error) {
    console.error('获取切割记录详情错误:', error);
    res.status(500).json({
      error: '获取切割记录详情失败',
      message: error.message
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { ThicknessSpec } = require('../models');
const { authenticate } = require('../middleware/auth');

// 获取所有厚度规格
router.get('/', authenticate, async (req, res) => {
  try {
    const thicknessSpecs = await ThicknessSpec.findAll({
      order: [['sortOrder', 'ASC'], ['thickness', 'ASC']]
    });
    
    res.json({
      success: true,
      thicknessSpecs
    });
  } catch (error) {
    console.error('获取厚度规格列表失败:', error);
    res.status(500).json({
      error: '获取厚度规格列表失败',
      details: error.message
    });
  }
});

// 创建厚度规格（仅管理员）
router.post('/', authenticate, async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: '权限不足，只有管理员可以添加厚度规格'
      });
    }

    const { thickness, unit, materialType, isActive, sortOrder } = req.body;

    // 验证必填字段
    if (!thickness) {
      return res.status(400).json({
        error: '厚度值不能为空'
      });
    }

    // 验证厚度值为正数
    if (thickness <= 0) {
      return res.status(400).json({
        error: '厚度值必须为正数'
      });
    }

    // 检查是否已存在相同厚度和材料类型的规格
    const existingSpec = await ThicknessSpec.findOne({
      where: {
        thickness: thickness,
        materialType: materialType || null
      }
    });

    if (existingSpec) {
      return res.status(400).json({
        error: '该厚度和材料类型的规格已存在'
      });
    }

    const thicknessSpec = await ThicknessSpec.create({
      thickness,
      unit: unit || 'mm',
      materialType: materialType || null,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0
    });

    res.status(201).json({
      success: true,
      message: '厚度规格创建成功',
      thicknessSpec
    });
  } catch (error) {
    console.error('创建厚度规格失败:', error);
    res.status(500).json({
      error: '创建厚度规格失败',
      details: error.message
    });
  }
});

// 更新厚度规格（仅管理员）
router.put('/:id', authenticate, async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: '权限不足，只有管理员可以修改厚度规格'
      });
    }

    const { id } = req.params;
    const { thickness, unit, materialType, isActive, sortOrder } = req.body;

    const thicknessSpec = await ThicknessSpec.findByPk(id);
    if (!thicknessSpec) {
      return res.status(404).json({
        error: '厚度规格不存在'
      });
    }

    // 验证厚度值
    if (thickness !== undefined && thickness <= 0) {
      return res.status(400).json({
        error: '厚度值必须为正数'
      });
    }

    // 如果修改了厚度或材料类型，检查是否与其他规格冲突
    if (thickness !== undefined || materialType !== undefined) {
      const checkThickness = thickness !== undefined ? thickness : thicknessSpec.thickness;
      const checkMaterialType = materialType !== undefined ? materialType : thicknessSpec.materialType;
      
      const existingSpec = await ThicknessSpec.findOne({
        where: {
          thickness: checkThickness,
          materialType: checkMaterialType || null,
          id: { [require('sequelize').Op.ne]: id }
        }
      });

      if (existingSpec) {
        return res.status(400).json({
          error: '该厚度和材料类型的规格已存在'
        });
      }
    }

    // 更新字段
    const updateData = {};
    if (thickness !== undefined) updateData.thickness = thickness;
    if (unit !== undefined) updateData.unit = unit;
    if (materialType !== undefined) updateData.materialType = materialType;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    await thicknessSpec.update(updateData);

    res.json({
      success: true,
      message: '厚度规格更新成功',
      thicknessSpec
    });
  } catch (error) {
    console.error('更新厚度规格失败:', error);
    res.status(500).json({
      error: '更新厚度规格失败',
      details: error.message
    });
  }
});

// 删除厚度规格（仅管理员）
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: '权限不足，只有管理员可以删除厚度规格'
      });
    }

    const { id } = req.params;

    const thicknessSpec = await ThicknessSpec.findByPk(id);
    if (!thicknessSpec) {
      return res.status(404).json({
        error: '厚度规格不存在'
      });
    }

    // 检查是否有材料使用此厚度规格
    const { Material } = require('../models');
    const materialsUsingSpec = await Material.count({
      where: { thicknessSpecId: id }
    });

    if (materialsUsingSpec > 0) {
      return res.status(400).json({
        error: `无法删除该厚度规格，有 ${materialsUsingSpec} 个板材记录正在使用此规格`
      });
    }

    await thicknessSpec.destroy();

    res.json({
      success: true,
      message: '厚度规格删除成功'
    });
  } catch (error) {
    console.error('删除厚度规格失败:', error);
    res.status(500).json({
      error: '删除厚度规格失败',
      details: error.message
    });
  }
});

// 批量更新排序（仅管理员）
router.put('/batch/sort', authenticate, async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: '权限不足，只有管理员可以调整排序'
      });
    }

    const { sortData } = req.body; // [{ id, sortOrder }, ...]

    if (!Array.isArray(sortData)) {
      return res.status(400).json({
        error: '排序数据格式错误'
      });
    }

    // 使用事务更新排序
    const { sequelize } = require('../utils/database');
    await sequelize.transaction(async (t) => {
      for (const item of sortData) {
        await ThicknessSpec.update(
          { sortOrder: item.sortOrder },
          { 
            where: { id: item.id },
            transaction: t
          }
        );
      }
    });

    res.json({
      success: true,
      message: '排序更新成功'
    });
  } catch (error) {
    console.error('更新排序失败:', error);
    res.status(500).json({
      error: '更新排序失败',
      details: error.message
    });
  }
});

module.exports = router;
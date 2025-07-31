const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Department } = require('../models');

// 获取所有部门
router.get('/', authenticate, async (req, res) => {
  try {
    const { Worker } = require('../models');
    
    const departments = await Department.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'sortOrder']
    });

    // 为每个部门添加工人数量
    const departmentsWithWorkerCount = await Promise.all(
      departments.map(async (dept) => {
        const workerCount = await Worker.count({
          where: { department: dept.name }
        });
        return {
          id: dept.id,
          name: dept.name,
          description: dept.description,
          sortOrder: dept.sortOrder,
          workerCount
        };
      })
    );

    res.json({
      success: true,
      departments: departmentsWithWorkerCount
    });
  } catch (error) {
    console.error('获取部门列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取部门列表失败',
      error: error.message
    });
  }
});

// 创建新部门
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, sortOrder } = req.body;

    // 检查用户权限（只有管理员可以创建部门）
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以创建部门'
      });
    }

    // 验证必填字段
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '部门名称不能为空'
      });
    }

    // 检查部门名称是否已存在
    const existingDepartment = await Department.findOne({
      where: { name: name.trim() }
    });

    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: '部门名称已存在'
      });
    }

    // 创建部门
    const department = await Department.create({
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: sortOrder || 0
    });

    res.status(201).json({
      success: true,
      message: '部门创建成功',
      department: {
        id: department.id,
        name: department.name,
        description: department.description,
        sortOrder: department.sortOrder
      }
    });
  } catch (error) {
    console.error('创建部门错误:', error);
    res.status(500).json({
      success: false,
      message: '创建部门失败',
      error: error.message
    });
  }
});

// 更新部门
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sortOrder } = req.body;

    // 检查用户权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以修改部门'
      });
    }

    // 查找部门
    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      });
    }

    // 验证部门名称
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '部门名称不能为空'
      });
    }

    // 检查名称是否与其他部门冲突
    const existingDepartment = await Department.findOne({
      where: { 
        name: name.trim(),
        id: { [require('sequelize').Op.ne]: id }
      }
    });

    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: '部门名称已存在'
      });
    }

    // 更新部门
    await department.update({
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: sortOrder || 0
    });

    res.json({
      success: true,
      message: '部门更新成功',
      department: {
        id: department.id,
        name: department.name,
        description: department.description,
        sortOrder: department.sortOrder
      }
    });
  } catch (error) {
    console.error('更新部门错误:', error);
    res.status(500).json({
      success: false,
      message: '更新部门失败',
      error: error.message
    });
  }
});

// 删除部门
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查用户权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以删除部门'
      });
    }

    // 查找部门
    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      });
    }

    // 检查是否有工人分配到这个部门
    const { Worker } = require('../models');
    const workersInDepartment = await Worker.count({
      where: { department: department.name }
    });

    if (workersInDepartment > 0) {
      return res.status(400).json({
        success: false,
        message: `无法删除部门，还有 ${workersInDepartment} 个工人分配在该部门中`
      });
    }

    // 软删除（设置为不活跃）
    await department.update({ isActive: false });

    res.json({
      success: true,
      message: '部门删除成功'
    });
  } catch (error) {
    console.error('删除部门错误:', error);
    res.status(500).json({
      success: false,
      message: '删除部门失败',
      error: error.message
    });
  }
});

module.exports = router;
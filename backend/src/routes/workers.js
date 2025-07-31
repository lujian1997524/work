const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { Worker, Department, Project } = require('../models');

/**
 * 获取所有工人列表
 * GET /api/workers
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { department = 'all', status = 'active', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereCondition = { status };
    
    if (department && department !== 'all') {
      whereCondition.departmentId = department;
    }

    const { rows: workers, count: total } = await Worker.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Department,
          as: 'departmentInfo',
          attributes: ['id', 'name']
        }
      ],
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    const formattedWorkers = await Promise.all(workers.map(async (worker) => {
      // 获取工人关联的活跃项目数量
      const projectCount = await Project.count({
        where: {
          assignedWorkerId: worker.id,
          isPastProject: false, // 只统计活跃项目
          status: {
            [Op.in]: ['pending', 'in_progress', 'completed']
          }
        }
      });

      return {
        id: worker.id,
        name: worker.name,
        phone: worker.phone,
        department: worker.departmentInfo?.name || '未分配',
        departmentId: worker.departmentId,
        status: worker.status,
        projectCount: projectCount, // 添加项目数量
        createdAt: worker.createdAt,
        updatedAt: worker.updatedAt
      };
    }));

    res.json({
      success: true,
      workers: formattedWorkers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取工人列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取工人列表失败',
      error: error.message
    });
  }
});

/**
 * 创建工人
 * POST /api/workers
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, phone, departmentId } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '工人姓名不能为空'
      });
    }

    if (!phone || phone.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '手机号不能为空'
      });
    }

    // 检查工人姓名是否已存在
    const existingWorker = await Worker.findOne({
      where: { 
        name: name.trim(),
        status: 'active'
      }
    });

    if (existingWorker) {
      return res.status(400).json({
        success: false,
        message: '该工人姓名已存在'
      });
    }

    const worker = await Worker.create({
      name: name.trim(),
      phone: phone.trim(),
      departmentId: departmentId || null,
      status: 'active'
    });

    const createdWorker = await Worker.findByPk(worker.id, {
      include: [
        {
          model: Department,
          as: 'departmentInfo',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: '工人创建成功',
      worker: {
        id: createdWorker.id,
        name: createdWorker.name,
        phone: createdWorker.phone,
        department: createdWorker.departmentInfo?.name || '未分配',
        departmentId: createdWorker.departmentId,
        status: createdWorker.status,
        projectCount: 0, // 新创建的工人项目数量为0
        createdAt: createdWorker.createdAt,
        updatedAt: createdWorker.updatedAt
      }
    });
  } catch (error) {
    console.error('创建工人失败:', error);
    res.status(500).json({
      success: false,
      message: '创建工人失败',
      error: error.message
    });
  }
});

/**
 * 更新工人信息
 * PUT /api/workers/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, departmentId } = req.body;

    const worker = await Worker.findByPk(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: '工人不存在'
      });
    }

    // 如果修改了姓名，检查是否与其他工人重复
    if (name && name.trim() !== worker.name) {
      const existingWorker = await Worker.findOne({
        where: { 
          name: name.trim(),
          status: 'active',
          id: { [Op.ne]: id }
        }
      });

      if (existingWorker) {
        return res.status(400).json({
          success: false,
          message: '该工人姓名已存在'
        });
      }
    }

    await worker.update({
      name: name?.trim() || worker.name,
      phone: phone?.trim() || worker.phone,
      departmentId: departmentId !== undefined ? departmentId : worker.departmentId,
      updatedAt: new Date()
    });

    const updatedWorker = await Worker.findByPk(id, {
      include: [
        {
          model: Department,
          as: 'departmentInfo',
          attributes: ['id', 'name']
        }
      ]
    });

    // 获取工人关联的活跃项目数量
    const projectCount = await Project.count({
      where: {
        assignedWorkerId: id,
        isPastProject: false,
        status: {
          [Op.in]: ['pending', 'in_progress', 'completed']
        }
      }
    });

    res.json({
      success: true,
      message: '工人信息更新成功',
      worker: {
        id: updatedWorker.id,
        name: updatedWorker.name,
        phone: updatedWorker.phone,
        department: updatedWorker.departmentInfo?.name || '未分配',
        departmentId: updatedWorker.departmentId,
        status: updatedWorker.status,
        projectCount: projectCount,
        createdAt: updatedWorker.createdAt,
        updatedAt: updatedWorker.updatedAt
      }
    });
  } catch (error) {
    console.error('更新工人信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新工人信息失败',
      error: error.message
    });
  }
});

/**
 * 删除工人
 * DELETE /api/workers/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await Worker.findByPk(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: '工人不存在'
      });
    }

    // 检查工人是否有关联的项目
    const assignedProjects = await Project.count({
      where: { assignedWorkerId: id }
    });

    if (assignedProjects > 0) {
      // 软删除：标记为非活跃状态
      await worker.update({
        status: 'inactive',
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: '工人已标记为非活跃状态（因有关联项目）'
      });
    } else {
      // 硬删除：完全删除记录
      await worker.destroy();

      res.json({
        success: true,
        message: '工人删除成功'
      });
    }
  } catch (error) {
    console.error('删除工人失败:', error);
    res.status(500).json({
      success: false,
      message: '删除工人失败',
      error: error.message
    });
  }
});

/**
 * 获取所有部门列表
 * GET /api/workers/departments
 */
router.get('/departments', authenticate, async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    // 获取每个部门的工人数量
    const departmentsWithCount = await Promise.all(
      departments.map(async (dept) => {
        const workerCount = await Worker.count({
          where: { 
            departmentId: dept.id,
            status: 'active'
          }
        });

        return {
          id: dept.id,
          name: dept.name,
          description: dept.description,
          isActive: dept.isActive,
          sortOrder: dept.sortOrder,
          workerCount,
          createdAt: dept.createdAt,
          updatedAt: dept.updatedAt
        };
      })
    );

    res.json({
      success: true,
      departments: departmentsWithCount
    });
  } catch (error) {
    console.error('获取部门列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取部门列表失败',
      error: error.message
    });
  }
});

/**
 * 创建部门
 * POST /api/workers/departments
 */
router.post('/departments', authenticate, async (req, res) => {
  try {
    const { user } = req;
    
    // 只有管理员可以创建部门
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '只有管理员可以创建部门'
      });
    }

    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '部门名称不能为空'
      });
    }

    // 检查部门名称是否已存在
    const existingDept = await Department.findOne({
      where: { 
        name: name.trim(),
        isActive: true
      }
    });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: '该部门名称已存在'
      });
    }

    // 获取最大排序值
    const maxSortOrder = await Department.max('sortOrder') || 0;

    const department = await Department.create({
      name: name.trim(),
      description: description?.trim() || null,
      isActive: true,
      sortOrder: maxSortOrder + 1
    });

    res.status(201).json({
      success: true,
      message: '部门创建成功',
      department: {
        id: department.id,
        name: department.name,
        description: department.description,
        isActive: department.isActive,
        sortOrder: department.sortOrder,
        workerCount: 0,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt
      }
    });
  } catch (error) {
    console.error('创建部门失败:', error);
    res.status(500).json({
      success: false,
      message: '创建部门失败',
      error: error.message
    });
  }
});

/**
 * 更新部门信息
 * PUT /api/workers/departments/:id
 */
router.put('/departments/:id', authenticate, async (req, res) => {
  try {
    const { user } = req;
    
    // 只有管理员可以更新部门
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '只有管理员可以更新部门'
      });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      });
    }

    // 如果修改了名称，检查是否与其他部门重复
    if (name && name.trim() !== department.name) {
      const existingDept = await Department.findOne({
        where: { 
          name: name.trim(),
          isActive: true,
          id: { [Op.ne]: id }
        }
      });

      if (existingDept) {
        return res.status(400).json({
          success: false,
          message: '该部门名称已存在'
        });
      }
    }

    await department.update({
      name: name?.trim() || department.name,
      description: description?.trim() || department.description,
      updatedAt: new Date()
    });

    // 获取工人数量
    const workerCount = await Worker.count({
      where: { 
        departmentId: id,
        status: 'active'
      }
    });

    res.json({
      success: true,
      message: '部门信息更新成功',
      department: {
        id: department.id,
        name: department.name,
        description: department.description,
        isActive: department.isActive,
        sortOrder: department.sortOrder,
        workerCount,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt
      }
    });
  } catch (error) {
    console.error('更新部门信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新部门信息失败',
      error: error.message
    });
  }
});

/**
 * 删除部门
 * DELETE /api/workers/departments/:id
 */
router.delete('/departments/:id', authenticate, async (req, res) => {
  try {
    const { user } = req;
    
    // 只有管理员可以删除部门
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '只有管理员可以删除部门'
      });
    }

    const { id } = req.params;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: '部门不存在'
      });
    }

    // 检查部门是否有关联的工人
    const workerCount = await Worker.count({
      where: { 
        departmentId: id,
        status: 'active'
      }
    });

    if (workerCount > 0) {
      return res.status(400).json({
        success: false,
        message: `无法删除部门，还有 ${workerCount} 名工人属于该部门`
      });
    }

    // 软删除：标记为非活跃状态
    await department.update({
      isActive: false,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: '部门删除成功'
    });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({
      success: false,
      message: '删除部门失败',
      error: error.message
    });
  }
});

module.exports = router;
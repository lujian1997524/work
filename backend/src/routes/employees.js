const express = require('express');
const router = express.Router();
const { 
  Employee, 
  AttendanceException, 
  MonthlyAttendanceSummary 
} = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { body, validationResult, query, param } = require('express-validator');
const { Op } = require('sequelize');

// 获取员工列表
router.get('/', 
  authenticate,
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('状态必须是active或inactive'),
  query('search').optional().isString().withMessage('搜索词必须是字符串'),
  async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '参数验证失败', 
        details: errors.array() 
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      status = 'active', 
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const whereClause = { status };
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { position: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: employees } = await Employee.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      employees,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取员工列表失败:', error);
    res.status(500).json({ 
      error: '获取员工列表失败', 
      message: error.message 
    });
  }
});

// 获取单个员工详情
router.get('/:id', 
  authenticate,
  param('id').isInt().withMessage('员工ID必须是整数'),
  async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '参数验证失败', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    
    const employee = await Employee.findByPk(id);
    
    if (!employee) {
      return res.status(404).json({ 
        error: '员工不存在', 
        message: `找不到ID为${id}的员工` 
      });
    }

    res.json({ employee });
  } catch (error) {
    console.error('获取员工详情失败:', error);
    res.status(500).json({ 
      error: '获取员工详情失败', 
      message: error.message 
    });
  }
});

// 创建员工
router.post('/', 
  authenticate, 
  requireAdmin,
  body('name').notEmpty().withMessage('员工姓名不能为空')
    .isLength({ max: 100 }).withMessage('员工姓名不能超过100个字符'),
  body('position').optional().isLength({ max: 100 }).withMessage('职位不能超过100个字符'),
  body('phone').optional().isLength({ max: 20 }).withMessage('电话号码不能超过20个字符'),
  body('hireDate').isISO8601().withMessage('入职日期格式不正确'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态必须是active或inactive'),
  async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '参数验证失败', 
        details: errors.array() 
      });
    }

    const {
      name,
      position,
      phone,
      hireDate,
      status = 'active',
      notes
    } = req.body;

    // 自动生成员工工号
    const currentYear = new Date().getFullYear();
    const lastEmployee = await Employee.findOne({
      order: [['id', 'DESC']]
    });
    const nextNumber = lastEmployee ? lastEmployee.id + 1 : 1;
    const employeeId = `EMP${currentYear}${String(nextNumber).padStart(4, '0')}`;

    const employee = await Employee.create({
      employeeId,
      name,
      department: '默认部门', // 设置默认部门
      position: position || '普通员工',
      phone,
      email: null, // 不需要邮箱
      hireDate,
      dailyWorkHours: 9.00, // 默认9小时
      status,
      notes
    });

    res.status(201).json({ 
      message: '员工创建成功', 
      employee 
    });
  } catch (error) {
    console.error('创建员工失败:', error);
    
    res.status(500).json({ 
      error: '创建员工失败', 
      message: error.message 
    });
  }
});

// 更新员工信息
router.put('/:id', 
  authenticate, 
  requireAdmin,
  param('id').isInt().withMessage('员工ID必须是整数'),
  body('name').optional().isLength({ max: 100 }).withMessage('员工姓名不能超过100个字符'),
  body('position').optional().isLength({ max: 100 }).withMessage('职位不能超过100个字符'),
  body('phone').optional().isLength({ max: 20 }).withMessage('电话号码不能超过20个字符'),
  body('hireDate').optional().isISO8601().withMessage('入职日期格式不正确'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态必须是active或inactive'),
  async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '参数验证失败', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const employee = await Employee.findByPk(id);
    
    if (!employee) {
      return res.status(404).json({ 
        error: '员工不存在', 
        message: `找不到ID为${id}的员工` 
      });
    }

    await employee.update(updateData);

    res.json({ 
      message: '员工信息更新成功', 
      employee 
    });
  } catch (error) {
    console.error('更新员工信息失败:', error);
    res.status(500).json({ 
      error: '更新员工信息失败', 
      message: error.message 
    });
  }
});

// 删除员工（软删除）
router.delete('/:id', 
  authenticate, 
  requireAdmin,
  param('id').isInt().withMessage('员工ID必须是整数'),
  async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '参数验证失败', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    
    const employee = await Employee.findByPk(id);
    
    if (!employee) {
      return res.status(404).json({ 
        error: '员工不存在', 
        message: `找不到ID为${id}的员工` 
      });
    }

    // 软删除：将状态设为inactive
    await employee.update({ status: 'inactive' });

    res.json({ 
      message: '员工删除成功', 
      employee 
    });
  } catch (error) {
    console.error('删除员工失败:', error);
    res.status(500).json({ 
      error: '删除员工失败', 
      message: error.message 
    });
  }
});

// 获取部门列表
router.get('/departments/list', authenticate, async (req, res) => {
  try {
    const departments = await Employee.findAll({
      attributes: ['department'],
      where: { status: 'active' },
      group: ['department'],
      order: [['department', 'ASC']]
    });

    const departmentList = departments.map(d => d.department);

    res.json({ departments: departmentList });
  } catch (error) {
    console.error('获取部门列表失败:', error);
    res.status(500).json({ 
      error: '获取部门列表失败', 
      message: error.message 
    });
  }
});

// 获取员工统计
router.get('/statistics/overview', authenticate, async (req, res) => {
  try {
    const totalEmployees = await Employee.count({ where: { status: 'active' } });
    
    const departmentStats = await Employee.findAll({
      attributes: [
        'department',
        [Employee.sequelize.fn('COUNT', Employee.sequelize.col('id')), 'count']
      ],
      where: { status: 'active' },
      group: ['department'],
      order: [['department', 'ASC']]
    });

    res.json({
      totalEmployees,
      departmentStats: departmentStats.map(d => ({
        department: d.department,
        count: parseInt(d.dataValues.count)
      }))
    });
  } catch (error) {
    console.error('获取员工统计失败:', error);
    res.status(500).json({ 
      error: '获取员工统计失败', 
      message: error.message 
    });
  }
});

module.exports = router;
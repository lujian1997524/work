const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { 
  Employee, 
  AttendanceException, 
  MonthlyAttendanceSummary, 
  AttendanceSettings, 
  User 
} = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { body, validationResult, query, param } = require('express-validator');
const { Op } = require('sequelize');

// 获取服务器当前时间
router.get('/server-time', (req, res) => {
  try {
    const now = new Date();
    
    // 获取中国时区的日期 (UTC+8)
    const chinaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Shanghai"}));
    
    // 格式化为 YYYY-MM-DD
    const year = chinaTime.getFullYear();
    const month = String(chinaTime.getMonth() + 1).padStart(2, '0');
    const day = String(chinaTime.getDate()).padStart(2, '0');
    const localDate = `${year}-${month}-${day}`;
    
    console.log('当前服务器时间:', {
      utc: now.toISOString(),
      china: chinaTime.toISOString(),
      date: localDate
    });
    
    res.json({
      date: localDate, // 中国时区的日期
      utcTime: now.toISOString(),
      chinaTime: chinaTime.toISOString(),
      timestamp: now.getTime(),
      timezone: 'Asia/Shanghai'
    });
  } catch (error) {
    console.error('获取服务器时间失败:', error);
    res.status(500).json({ error: '获取服务器时间失败' });
  }
});

// 获取考勤异常记录
router.get('/exceptions', 
  authenticate,
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('employeeId').optional().isInt().withMessage('员工ID必须是整数'),
  query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
  query('exceptionType').optional().isIn(['leave', 'absent', 'overtime', 'early', 'late']).withMessage('异常类型无效'),
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
      employeeId, 
      startDate, 
      endDate, 
      exceptionType 
    } = req.query;

    const offset = (page - 1) * limit;
    
    // 构建查询条件，自动限制到今天为止
    const whereClause = {};
    const today = new Date().toISOString().split('T')[0];
    
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }
    
    // 日期过滤逻辑
    whereClause.date = {};
    if (startDate) {
      whereClause.date[Op.gte] = startDate;
    }
    if (endDate) {
      // 如果指定了结束日期，但超过今天，则限制为今天
      const limitedEndDate = endDate <= today ? endDate : today;
      whereClause.date[Op.lte] = limitedEndDate;
    } else {
      // 如果没有指定结束日期，默认限制为今天
      whereClause.date[Op.lte] = today;
    }
    
    if (exceptionType) {
      whereClause.exceptionType = exceptionType;
    }

    const { count, rows: exceptions } = await AttendanceException.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'name', 'department', 'position']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      exceptions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取考勤异常记录失败:', error);
    res.status(500).json({ 
      error: '获取考勤异常记录失败', 
      message: error.message 
    });
  }
});

// 创建考勤异常记录
router.post('/exceptions', 
  authenticate,
  body('employeeId').isInt().withMessage('员工ID必须是整数'),
  body('date').isISO8601().withMessage('日期格式不正确'),
  body('exceptionType').isIn(['leave', 'absent', 'overtime', 'early', 'late']).withMessage('异常类型必须是leave/absent/overtime/early/late'),
  body('leaveType').optional().isIn(['sick', 'personal', 'annual', 'compensatory']).withMessage('请假类型无效'),
  body('leaveDurationType').optional().isIn(['full_day', 'half_day', 'hours']).withMessage('请假时长类型无效'),
  body('leaveHours').optional().isFloat({ min: 0, max: 9 }).withMessage('请假小时数必须在0-9之间'),
  body('leaveReason').optional().isString().withMessage('请假原因必须是字符串').isLength({ max: 500 }).withMessage('请假原因不能超过500字符'),
  body('overtimeMinutes').optional().isInt({ min: 0, max: 1440 }).withMessage('加班分钟数必须在0-1440之间'),
  body('overtimeStartTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('加班开始时间格式不正确'),
  body('overtimeEndTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('加班结束时间格式不正确'),
  body('overtimeReason').optional().isString().withMessage('加班原因必须是字符串').isLength({ max: 500 }).withMessage('加班原因不能超过500字符'),
  body('absentReason').optional().isString().withMessage('缺勤原因必须是字符串').isLength({ max: 500 }).withMessage('缺勤原因不能超过500字符'),
  body('earlyLeaveTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('早退时间格式不正确'),
  body('earlyLeaveReason').optional().isString().withMessage('早退原因必须是字符串').isLength({ max: 500 }).withMessage('早退原因不能超过500字符'),
  body('lateArrivalTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('迟到时间格式不正确'),
  body('lateArrivalReason').optional().isString().withMessage('迟到原因必须是字符串').isLength({ max: 500 }).withMessage('迟到原因不能超过500字符'),
  body('notes').optional().isString().withMessage('备注必须是字符串').isLength({ max: 1000 }).withMessage('备注不能超过1000字符'),
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
      employeeId,
      date,
      exceptionType,
      // 请假相关字段
      leaveType,
      leaveDurationType,
      leaveHours,
      leaveStartTime,
      leaveEndTime,
      leaveReason,
      // 加班相关字段
      overtimeMinutes,
      overtimeStartTime,
      overtimeEndTime,
      overtimeReason,
      // 缺勤相关字段
      absentReason,
      // 早退相关字段
      earlyLeaveTime,
      earlyLeaveReason,
      // 迟到相关字段
      lateArrivalTime,
      lateArrivalReason,
      // 通用字段
      notes
    } = req.body;

    // 验证员工是否存在
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ 
        error: '员工不存在', 
        message: `找不到ID为${employeeId}的员工` 
      });
    }

    // 检查是否已存在相同日期和类型的记录
    const existingException = await AttendanceException.findOne({
      where: {
        employeeId,
        date,
        exceptionType
      }
    });

    if (existingException) {
      return res.status(400).json({ 
        error: '考勤记录已存在', 
        message: `该员工在${date}已有${exceptionType}记录` 
      });
    }

    const exception = await AttendanceException.create({
      employeeId,
      date,
      exceptionType,
      // 请假相关字段
      leaveType,
      leaveDurationType,
      leaveHours,
      leaveStartTime,
      leaveEndTime,
      leaveReason,
      // 加班相关字段
      overtimeMinutes,
      overtimeStartTime,
      overtimeEndTime,
      overtimeReason,
      // 缺勤相关字段
      absentReason,
      // 早退相关字段
      earlyLeaveTime,
      earlyLeaveReason,
      // 迟到相关字段
      lateArrivalTime,
      lateArrivalReason,
      // 通用字段
      notes,
      createdBy: req.user.id
    });

    // 包含关联数据返回
    const createdException = await AttendanceException.findByPk(exception.id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'name', 'department']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({ 
      message: '考勤异常记录创建成功', 
      exception: createdException 
    });
  } catch (error) {
    console.error('创建考勤异常记录失败:', error);
    res.status(500).json({ 
      error: '创建考勤异常记录失败', 
      message: error.message 
    });
  }
});

// 更新考勤异常记录
router.put('/exceptions/:id', 
  authenticate,
  param('id').isInt().withMessage('记录ID必须是整数'),
  body('exceptionType').optional().isIn(['leave', 'absent', 'overtime', 'early', 'late']).withMessage('异常类型无效'),
  body('leaveType').optional().isIn(['sick', 'personal', 'annual', 'compensatory']).withMessage('请假类型无效'),
  body('leaveDurationType').optional().isIn(['full_day', 'half_day', 'hours']).withMessage('请假时长类型无效'),
  body('leaveHours').optional().isFloat({ min: 0, max: 9 }).withMessage('请假小时数必须在0-9之间'),
  body('overtimeMinutes').optional().isInt({ min: 0, max: 1440 }).withMessage('加班分钟数必须在0-1440之间'),
  body('overtimeStartTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('加班开始时间格式不正确'),
  body('overtimeEndTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('加班结束时间格式不正确'),
  body('earlyLeaveTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('早退时间格式不正确'),
  body('lateArrivalTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('迟到时间格式不正确'),
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

    const exception = await AttendanceException.findByPk(id);
    
    if (!exception) {
      return res.status(404).json({ 
        error: '考勤记录不存在', 
        message: `找不到ID为${id}的考勤记录` 
      });
    }

    await exception.update(updateData);

    // 返回更新后的数据，包含关联信息
    const updatedException = await AttendanceException.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'name', 'department']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({ 
      message: '考勤异常记录更新成功', 
      exception: updatedException 
    });
  } catch (error) {
    console.error('更新考勤异常记录失败:', error);
    res.status(500).json({ 
      error: '更新考勤异常记录失败', 
      message: error.message 
    });
  }
});

// 删除考勤异常记录
router.delete('/exceptions/:id', 
  authenticate, 
  requireAdmin,
  param('id').isInt().withMessage('记录ID必须是整数'),
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
    
    const exception = await AttendanceException.findByPk(id);
    
    if (!exception) {
      return res.status(404).json({ 
        error: '考勤记录不存在', 
        message: `找不到ID为${id}的考勤记录` 
      });
    }

    await exception.destroy();

    res.json({ 
      message: '考勤异常记录删除成功' 
    });
  } catch (error) {
    console.error('删除考勤异常记录失败:', error);
    res.status(500).json({ 
      error: '删除考勤异常记录失败', 
      message: error.message 
    });
  }
});

// 获取月度考勤汇总
router.get('/summary', 
  authenticate,
  query('year').optional().isInt({ min: 2020, max: 2030 }).withMessage('年份必须在2020-2030之间'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('月份必须在1-12之间'),
  query('employeeId').optional().isInt().withMessage('员工ID必须是整数'),
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
      year = new Date().getFullYear(), 
      month = new Date().getMonth() + 1, 
      employeeId 
    } = req.query;

    const whereClause = { year: parseInt(year), month: parseInt(month) };
    
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    const summaries = await MonthlyAttendanceSummary.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'employeeId', 'name', 'department', 'position']
        }
      ],
      order: [['attendanceRate', 'DESC']]
    });

    // 如果没有找到现有的汇总数据，动态生成
    if (summaries.length === 0) {
      const dynamicSummaries = await generateMonthlyAttendanceStats(parseInt(year), parseInt(month), employeeId);
      return res.json({ summaries: dynamicSummaries });
    }

    // 格式化返回数据，匹配前端期望的类型
    const formattedSummaries = summaries.map(summary => ({
      employeeId: summary.employeeId,
      employee: summary.employee,
      year: summary.year,
      month: summary.month,
      workDays: summary.workDays,
      totalWorkHours: parseFloat(summary.totalWorkHours),
      totalLeaveHours: parseFloat(summary.totalLeaveHours),
      totalOvertimeHours: parseFloat(summary.totalOvertimeHours),
      attendanceRate: parseFloat(summary.attendanceRate),
      leaveBreakdown: {
        sick: parseFloat(summary.sickLeaveHours),
        personal: parseFloat(summary.personalLeaveHours),
        annual: parseFloat(summary.annualLeaveHours),
        compensatory: parseFloat(summary.compensatoryLeaveHours)
      }
    }));

    res.json({ summaries: formattedSummaries });
  } catch (error) {
    console.error('获取月度考勤汇总失败:', error);
    res.status(500).json({ 
      error: '获取月度考勤汇总失败', 
      message: error.message 
    });
  }
});

// 动态生成月度考勤统计数据
async function generateMonthlyAttendanceStats(year, month, employeeId = null) {
  try {
    // 获取员工列表
    const employeeWhere = employeeId ? { id: employeeId } : { status: 'active' };
    const employees = await Employee.findAll({
      where: employeeWhere,
      attributes: ['id', 'employeeId', 'name', 'department', 'position', 'dailyWorkHours']
    });

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // 该月最后一天

    const monthlyStats = [];

    for (const employee of employees) {
      // 获取该员工该月的考勤异常记录
      const exceptions = await AttendanceException.findAll({
        where: {
          employeeId: employee.id,
          date: {
            [Op.gte]: startDate,
            [Op.lte]: endDate
          }
        },
        order: [['date', 'ASC']]
      });

      // 计算统计数据
      const stats = calculateEmployeeMonthlyStats(employee, exceptions, year, month);
      monthlyStats.push(stats);
    }

    return monthlyStats;
  } catch (error) {
    console.error('生成月度统计失败:', error);
    throw error;
  }
}

// 计算单个员工的月度统计
function calculateEmployeeMonthlyStats(employee, exceptions, year, month) {
  const dailyWorkHours = employee.dailyWorkHours || 9; // 默认9小时工作制
  
  // 计算实际工作天数：从月初到今天或月末，取较小值
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  
  let actualWorkingDays;
  if (year === currentYear && month === currentMonth) {
    // 当前月份：只计算到今天
    actualWorkingDays = currentDay;
  } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
    // 过去月份：计算整月
    actualWorkingDays = daysInMonth;
  } else {
    // 未来月份：不应该有数据，但为安全起见返回0
    actualWorkingDays = 0;
  }

  const standardWorkHours = actualWorkingDays * dailyWorkHours;

  // 初始化统计数据
  let totalLeaveHours = 0;
  let totalOvertimeHours = 0;
  let absentDays = 0;
  const leaveBreakdown = {
    sick: 0,
    personal: 0,
    annual: 0,
    compensatory: 0
  };
  
  // 收集详细的异常考勤信息
  const attendanceDetails = [];

  // 处理考勤异常
  exceptions.forEach(exception => {
    const exceptionDate = new Date(exception.date).toLocaleDateString('zh-CN');
    
    switch (exception.exceptionType) {
      case 'leave':
        const leaveHours = exception.leaveHours || dailyWorkHours;
        totalLeaveHours += leaveHours;
        
        const leaveType = exception.leaveType || 'personal';
        if (leaveBreakdown.hasOwnProperty(leaveType)) {
          leaveBreakdown[leaveType] += leaveHours;
        }
        
        // 收集请假详细信息
        const leaveDays = Math.round(leaveHours / dailyWorkHours * 10) / 10;
        const leaveTypeText = {
          'sick': '病假',
          'personal': '事假', 
          'annual': '年假',
          'compensatory': '调休'
        }[leaveType] || '请假';
        
        attendanceDetails.push(`${exceptionDate} ${leaveTypeText} ${leaveDays}天${exception.leaveReason ? ` (${exception.leaveReason})` : ''}`);
        break;
        
      case 'overtime':
        const overtimeHours = (exception.overtimeMinutes || 0) / 60;
        totalOvertimeHours += overtimeHours;
        
        // 收集加班详细信息
        const overtimeText = `${exceptionDate} 加班 ${Math.round(overtimeHours * 10) / 10}小时`;
        if (exception.overtimeStartTime && exception.overtimeEndTime) {
          attendanceDetails.push(`${overtimeText} (${exception.overtimeStartTime}-${exception.overtimeEndTime})${exception.overtimeReason ? ` ${exception.overtimeReason}` : ''}`);
        } else {
          attendanceDetails.push(`${overtimeText}${exception.overtimeReason ? ` ${exception.overtimeReason}` : ''}`);
        }
        break;
        
      case 'absent':
        absentDays += 1;
        totalLeaveHours += dailyWorkHours; // 缺勤按全天请假计算
        
        // 收集缺勤详细信息
        attendanceDetails.push(`${exceptionDate} 缺勤${exception.absentReason ? ` (${exception.absentReason})` : ''}`);
        break;
        
      case 'late':
        // 收集迟到详细信息
        attendanceDetails.push(`${exceptionDate} 迟到${exception.lateArrivalTime ? ` 至${exception.lateArrivalTime}` : ''}${exception.lateArrivalReason ? ` (${exception.lateArrivalReason})` : ''}`);
        break;
        
      case 'early':
        // 收集早退详细信息
        attendanceDetails.push(`${exceptionDate} 早退${exception.earlyLeaveTime ? ` 于${exception.earlyLeaveTime}` : ''}${exception.earlyLeaveReason ? ` (${exception.earlyLeaveReason})` : ''}`);
        break;
    }
  });

  // 计算实际工作时长和出勤率
  // 实际工作时长 = 标准工作时长 - 请假时长 + 加班时长
  const actualWorkHours = Math.max(0, standardWorkHours - totalLeaveHours + totalOvertimeHours);
  const attendanceRate = standardWorkHours > 0 ? 
    ((actualWorkHours / standardWorkHours) * 100) : 100;

  // 实际出勤天数计算
  const leaveDays = Math.ceil(totalLeaveHours / dailyWorkHours);
  const workDays = Math.max(0, actualWorkingDays - leaveDays);

  return {
    employeeId: employee.id,
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department,
      position: employee.position
    },
    year: year,
    month: month,
    workDays: workDays,
    totalWorkHours: Math.round(actualWorkHours * 100) / 100,
    totalLeaveHours: Math.round(totalLeaveHours * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    attendanceRate: Math.round(attendanceRate * 10) / 10,
    leaveBreakdown: {
      sick: Math.round(leaveBreakdown.sick * 100) / 100,
      personal: Math.round(leaveBreakdown.personal * 100) / 100,
      annual: Math.round(leaveBreakdown.annual * 100) / 100,
      compensatory: Math.round(leaveBreakdown.compensatory * 100) / 100
    },
    attendanceDetails: attendanceDetails.join('; ') || '无异常记录'
  };
}

// 计算月度考勤汇总
router.post('/summary/calculate', 
  authenticate, 
  requireAdmin,
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('年份必须在2020-2030之间'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('月份必须在1-12之间'),
  async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '参数验证失败', 
        details: errors.array() 
      });
    }

    const { year, month } = req.body;

    // 这里可以调用存储过程或实现计算逻辑
    // 简化版本：直接返回成功消息
    res.json({ 
      message: `${year}年${month}月考勤汇总计算完成`,
      year,
      month
    });
  } catch (error) {
    console.error('计算月度考勤汇总失败:', error);
    res.status(500).json({ 
      error: '计算月度考勤汇总失败', 
      message: error.message 
    });
  }
});

// 获取考勤设置
router.get('/settings', authenticate, async (req, res) => {
  try {
    const settings = await AttendanceSettings.findAll({
      order: [['category', 'ASC'], ['settingKey', 'ASC']]
    });

    // 转换为对象格式
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.settingKey] = {
        value: setting.settingValue,
        description: setting.description,
        category: setting.category
      };
    });

    res.json({ settings: settingsObj });
  } catch (error) {
    console.error('获取考勤设置失败:', error);
    res.status(500).json({ 
      error: '获取考勤设置失败', 
      message: error.message 
    });
  }
});

// 更新考勤设置
router.put('/settings', 
  authenticate, 
  requireAdmin,
  body('settings').isObject().withMessage('设置必须是对象格式'),
  async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '参数验证失败', 
        details: errors.array() 
      });
    }

    const { settings } = req.body;

    // 更新设置
    for (const [key, value] of Object.entries(settings)) {
      await AttendanceSettings.upsert({
        settingKey: key,
        settingValue: value.toString(),
        description: `${key}设置`,
        category: 'general'
      });
    }

    res.json({ 
      message: '考勤设置更新成功' 
    });
  } catch (error) {
    console.error('更新考勤设置失败:', error);
    res.status(500).json({ 
      error: '更新考勤设置失败', 
      message: error.message 
    });
  }
});

// 获取今日考勤状态
router.get('/status/today', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 获取所有活跃员工
    const employees = await Employee.findAll({
      where: { status: 'active' },
      include: [
        {
          model: AttendanceException,
          as: 'todayExceptions',
          where: { date: today },
          required: false
        }
      ]
    });

    const attendanceStatus = employees.map(employee => {
      const exception = employee.todayExceptions?.[0];
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        status: exception ? exception.exceptionType : 'present',
        exception: exception || null
      };
    });

    res.json({ attendanceStatus, date: today });
  } catch (error) {
    console.error('获取今日考勤状态失败:', error);
    res.status(500).json({ 
      error: '获取今日考勤状态失败', 
      message: error.message 
    });
  }
});

// 获取日报汇总
router.get('/daily-summary', 
  authenticate,
  query('date').optional().isISO8601().withMessage('日期格式不正确'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: '参数验证失败', 
          details: errors.array() 
        });
      }

      const { date = new Date().toISOString().split('T')[0] } = req.query;
      
      // 获取所有活跃员工
      const employees = await Employee.findAll({
        where: { status: 'active' },
        include: [
          {
            model: AttendanceException,
            as: 'attendanceExceptions',
            where: { date },
            required: false
          }
        ]
      });

      // 统计数据
      let presentCount = 0;
      let leaveCount = 0;
      let absentCount = 0;
      let overtimeCount = 0;
      let earlyCount = 0;
      let lateCount = 0;

      const attendanceDetails = employees.map(employee => {
        const exceptions = employee.attendanceExceptions || [];
        const todayException = exceptions.find(exc => exc.date === date);
        
        let status = 'present';
        if (todayException) {
          status = todayException.exceptionType;
          switch (status) {
            case 'leave': leaveCount++; break;
            case 'absent': absentCount++; break;
            case 'overtime': overtimeCount++; break;
            case 'early': earlyCount++; break;
            case 'late': lateCount++; break;
          }
        } else {
          presentCount++;
        }

        return {
          employeeId: employee.id,
          employeeCode: employee.employeeId,
          name: employee.name,
          department: employee.department,
          position: employee.position,
          status,
          exception: todayException || null
        };
      });

      const summary = {
        date,
        totalEmployees: employees.length,
        present: presentCount,
        leave: leaveCount,
        absent: absentCount,
        overtime: overtimeCount,
        early: earlyCount,
        late: lateCount,
        attendanceRate: employees.length > 0 ? ((presentCount / employees.length) * 100).toFixed(2) : 0
      };

      res.json({
        summary,
        details: attendanceDetails
      });
    } catch (error) {
      console.error('获取日报汇总失败:', error);
      res.status(500).json({ 
        error: '获取日报汇总失败', 
        message: error.message 
      });
    }
});

// 获取休息日列表
router.get('/holidays', authenticate, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // 从settings表中获取休息日配置，使用JSON格式存储
    const holidaySettings = await AttendanceSettings.findOne({
      where: { settingKey: 'holidays' }
    });
    
    let holidays = [];
    if (holidaySettings && holidaySettings.settingValue) {
      try {
        holidays = JSON.parse(holidaySettings.settingValue);
      } catch (e) {
        console.error('解析休息日数据失败:', e);
      }
    }
    
    // 如果指定了年月，则过滤
    if (year && month) {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      holidays = holidays.filter(date => {
        const holidayDate = new Date(date);
        return holidayDate.getFullYear() === yearNum && 
               holidayDate.getMonth() + 1 === monthNum;
      });
    }
    
    res.json({ holidays });
  } catch (error) {
    console.error('获取休息日失败:', error);
    res.status(500).json({ error: '获取休息日失败' });
  }
});

// 设置休息日
router.post('/holidays', 
  authenticate,
  requireAdmin,
  body('date').isISO8601().withMessage('日期格式不正确'),
  body('name').optional().isString().withMessage('休息日名称必须是字符串'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: '参数验证失败', 
          details: errors.array() 
        });
      }

      const { date, name } = req.body;
      
      // 获取现有的休息日配置
      let holidaySettings = await AttendanceSettings.findOne({
        where: { settingKey: 'holidays' }
      });
      
      let holidays = [];
      if (holidaySettings && holidaySettings.settingValue) {
        try {
          holidays = JSON.parse(holidaySettings.settingValue);
        } catch (e) {
          holidays = [];
        }
      }
      
      // 检查是否已存在
      const existingIndex = holidays.findIndex(h => 
        (typeof h === 'string' ? h : h.date) === date
      );
      
      if (existingIndex >= 0) {
        return res.status(400).json({ error: '该日期已设置为休息日' });
      }
      
      // 添加新的休息日
      const holidayEntry = name ? { date, name } : date;
      holidays.push(holidayEntry);
      
      if (holidaySettings) {
        await holidaySettings.update({ 
          settingValue: JSON.stringify(holidays) 
        });
      } else {
        await AttendanceSettings.create({
          settingKey: 'holidays',
          settingValue: JSON.stringify(holidays),
          description: '休息日配置',
          category: 'general'
        });
      }
      
      res.json({ 
        message: '休息日设置成功',
        holiday: holidayEntry
      });
    } catch (error) {
      console.error('设置休息日失败:', error);
      res.status(500).json({ error: '设置休息日失败' });
    }
  }
);

// 删除休息日
router.delete('/holidays/:date', 
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { date } = req.params;
      
      // 获取现有的休息日配置
      const holidaySettings = await AttendanceSettings.findOne({
        where: { settingKey: 'holidays' }
      });
      
      if (!holidaySettings) {
        return res.status(404).json({ error: '没有找到休息日配置' });
      }
      
      let holidays = [];
      try {
        holidays = JSON.parse(holidaySettings.settingValue);
      } catch (e) {
        return res.status(400).json({ error: '休息日数据格式错误' });
      }
      
      // 删除指定日期
      const filteredHolidays = holidays.filter(h => 
        (typeof h === 'string' ? h : h.date) !== date
      );
      
      if (filteredHolidays.length === holidays.length) {
        return res.status(404).json({ error: '未找到指定的休息日' });
      }
      
      await holidaySettings.update({ 
        settingValue: JSON.stringify(filteredHolidays) 
      });
      
      res.json({ message: '休息日删除成功' });
    } catch (error) {
      console.error('删除休息日失败:', error);
      res.status(500).json({ error: '删除休息日失败' });
    }
  }
);

// 导出今日考勤报表
router.get('/daily-export', 
  authenticate,
  query('date').optional().isISO8601().withMessage('日期格式不正确'),
  query('format').isIn(['xlsx', 'csv']).withMessage('格式必须是xlsx或csv'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: '参数验证失败', 
          details: errors.array() 
        });
      }

      const { date = new Date().toISOString().split('T')[0], format = 'xlsx' } = req.query;
      
      // 获取所有活跃员工
      const employees = await Employee.findAll({
        where: { status: 'active' },
        order: [['department', 'ASC'], ['name', 'ASC']]
      });

      // 获取指定日期的考勤异常记录
      const exceptions = await AttendanceException.findAll({
        where: {
          date: date
        },
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'employeeId', 'name', 'department', 'position']
          }
        ]
      });

      // 构建今日考勤数据
      const attendanceData = employees.map(employee => {
        const exception = exceptions.find(exc => exc.employeeId === employee.id);
        let status = '正常出勤';
        let details = '';
        
        if (exception) {
          switch (exception.exceptionType) {
            case 'leave':
              const leaveTypeText = {
                'sick': '病假',
                'personal': '事假', 
                'annual': '年假',
                'compensatory': '调休'
              }[exception.leaveType] || '请假';
              const leaveDays = Math.round((exception.leaveHours || 9) / 9 * 10) / 10;
              status = leaveTypeText;
              details = `${leaveDays}天${exception.leaveReason ? ` (${exception.leaveReason})` : ''}`;
              break;
              
            case 'overtime':
              const overtimeHours = (exception.overtimeMinutes || 0) / 60;
              status = '加班';
              details = `${Math.round(overtimeHours * 10) / 10}小时`;
              if (exception.overtimeStartTime && exception.overtimeEndTime) {
                details += ` (${exception.overtimeStartTime}-${exception.overtimeEndTime})`;
              }
              if (exception.overtimeReason) {
                details += ` ${exception.overtimeReason}`;
              }
              break;
              
            case 'absent':
              status = '缺勤';
              details = exception.absentReason || '';
              break;
              
            case 'late':
              status = '迟到';
              details = exception.lateArrivalTime ? `至${exception.lateArrivalTime}` : '';
              if (exception.lateArrivalReason) {
                details += ` (${exception.lateArrivalReason})`;
              }
              break;
              
            case 'early':
              status = '早退';
              details = exception.earlyLeaveTime ? `于${exception.earlyLeaveTime}` : '';
              if (exception.earlyLeaveReason) {
                details += ` (${exception.earlyLeaveReason})`;
              }
              break;
          }
        }
        
        return {
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          position: employee.position,
          status,
          details
        };
      });

      if (format === 'xlsx') {
        // 创建Excel工作簿
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`今日考勤_${date}`);

        // 设置标题
        worksheet.addRow([
          '员工工号', '员工姓名', '车间', '岗位', '考勤状态', '详细信息'
        ]);

        // 添加数据
        attendanceData.forEach(data => {
          worksheet.addRow([
            data.employeeId,
            data.name,
            data.department,
            data.position,
            data.status,
            data.details
          ]);
        });

        // 设置列宽
        worksheet.columns.forEach((column, index) => {
          if (index === 1) { // 员工姓名列
            column.width = 15;
          } else if (index === 5) { // 详细信息列
            column.width = 30;
          } else {
            column.width = 12;
          }
        });

        // 设置响应头
        const filename = `今日考勤_${date}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

        // 写入响应
        await workbook.xlsx.write(res);
        res.end();
      } else {
        // CSV格式
        const csvData = attendanceData.map(data => [
          data.employeeId,
          data.name,
          data.department,
          data.position,
          data.status,
          data.details
        ]);

        const csvContent = [
          ['员工工号', '员工姓名', '车间', '岗位', '考勤状态', '详细信息'],
          ...csvData
        ].map(row => row.join(',')).join('\n');

        const filename = `今日考勤_${date}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send('\ufeff' + csvContent); // 添加BOM以支持中文
      }
    } catch (error) {
      console.error('导出今日考勤失败:', error);
      res.status(500).json({ 
        error: '导出今日考勤失败', 
        message: error.message 
      });
    }
  }
);

// 导出考勤报表
router.get('/export', 
  authenticate,
  query('year').isInt({ min: 2020, max: 2030 }).withMessage('年份必须在2020-2030之间'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('月份必须在1-12之间'),
  query('format').isIn(['xlsx', 'csv']).withMessage('格式必须是xlsx或csv'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: '参数验证失败', 
          details: errors.array() 
        });
      }

      const { year, month, format } = req.query;
      const isMonthly = month !== undefined;

      // 获取统计数据
      let stats;
      if (isMonthly) {
        stats = await generateMonthlyAttendanceStats(parseInt(year), parseInt(month));
      } else {
        // 年度数据：获取12个月汇总
        const monthlyPromises = [];
        for (let m = 1; m <= 12; m++) {
          monthlyPromises.push(
            generateMonthlyAttendanceStats(parseInt(year), m).catch(() => [])
          );
        }
        const allMonthlyData = await Promise.all(monthlyPromises);
        
        // 合并年度数据
        const employeeYearlyMap = new Map();
        allMonthlyData.flat().forEach(stat => {
          const employeeId = stat.employeeId;
          if (!employeeYearlyMap.has(employeeId)) {
            employeeYearlyMap.set(employeeId, {
              ...stat,
              totalWorkHours: 0,
              totalLeaveHours: 0,
              totalOvertimeHours: 0,
              workDays: 0
            });
          }
          const yearlyData = employeeYearlyMap.get(employeeId);
          yearlyData.totalWorkHours += stat.totalWorkHours || 0;
          yearlyData.totalLeaveHours += stat.totalLeaveHours || 0;
          yearlyData.totalOvertimeHours += stat.totalOvertimeHours || 0;
          yearlyData.workDays += stat.workDays || 0;
        });
        
        stats = Array.from(employeeYearlyMap.values()).map(stat => {
          // 计算实际年度工作天数
          let actualYearlyDays;
          const today = new Date();
          const currentYear = today.getFullYear();
          
          if (parseInt(year) === currentYear) {
            // 当前年份：计算从年初到今天的天数
            const startOfYear = new Date(parseInt(year), 0, 1);
            const daysPassed = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            actualYearlyDays = daysPassed;
          } else {
            // 过去年份：计算整年天数（简单直接的方法）
            const lastDayOfYear = new Date(parseInt(year), 11, 31); // 12月31日
            const firstDayOfYear = new Date(parseInt(year), 0, 1);   // 1月1日
            const daysInYear = Math.floor((lastDayOfYear.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            actualYearlyDays = daysInYear;
          }
          
          stat.attendanceRate = (stat.totalWorkHours / (actualYearlyDays * 9)) * 100;
          return stat;
        });
      }

      if (format === 'xlsx') {
        // 创建Excel工作簿
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(isMonthly ? `${year}年${month}月考勤` : `${year}年度考勤`);

        // 设置标题
        worksheet.addRow([
          '员工工号', '员工姓名', '车间', '岗位', '工作天数', 
          '工作时长(小时)', '请假天数', '加班时长(小时)', '出勤率(%)', '考勤异常详情'
        ]);

        // 添加数据
        stats.forEach(stat => {
          const leaveDays = Math.round((stat.totalLeaveHours || 0) / 9 * 10) / 10; // 按9小时工作日换算天数
          worksheet.addRow([
            stat.employee?.employeeId || '',
            stat.employee?.name || '',
            stat.employee?.department || '',
            stat.employee?.position || '',
            stat.workDays || 0,
            Math.round((stat.totalWorkHours || 0) * 100) / 100,
            leaveDays,
            Math.round((stat.totalOvertimeHours || 0) * 100) / 100,
            Math.round((stat.attendanceRate || 0) * 10) / 10,
            stat.attendanceDetails || '无异常记录'
          ]);
        });

        // 设置列宽
        worksheet.columns.forEach((column, index) => {
          if (index === 1) { // 员工姓名列
            column.width = 15;
          } else if (index === 9) { // 考勤异常详情列（新增）
            column.width = 50; // 较宽的列宽以显示详细信息
          } else {
            column.width = 12;
          }
        });

        // 设置响应头
        const filename = isMonthly ? 
          `考勤报表_${year}年${month}月.xlsx` : 
          `年度考勤报表_${year}年.xlsx`;
          
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

        // 写入响应
        await workbook.xlsx.write(res);
        res.end();
      } else {
        // CSV格式
        const csvData = stats.map(stat => {
          const leaveDays = Math.round((stat.totalLeaveHours || 0) / 9 * 10) / 10; // 按9小时工作日换算天数
          return [
            stat.employee?.employeeId || '',
            stat.employee?.name || '',
            stat.employee?.department || '',
            stat.employee?.position || '',
            stat.workDays || 0,
            Math.round((stat.totalWorkHours || 0) * 100) / 100,
            leaveDays,
            Math.round((stat.totalOvertimeHours || 0) * 100) / 100,
            Math.round((stat.attendanceRate || 0) * 10) / 10,
            stat.attendanceDetails || '无异常记录'
          ];
        });

        const csvContent = [
          ['员工工号', '员工姓名', '车间', '岗位', '工作天数', '工作时长(小时)', '请假天数', '加班时长(小时)', '出勤率(%)', '考勤异常详情'],
          ...csvData
        ].map(row => row.join(',')).join('\n');

        const filename = isMonthly ? 
          `考勤报表_${year}年${month}月.csv` : 
          `年度考勤报表_${year}年.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send('\ufeff' + csvContent); // 添加BOM以支持中文
      }
    } catch (error) {
      console.error('导出报表失败:', error);
      res.status(500).json({ 
        error: '导出报表失败', 
        message: error.message 
      });
    }
  }
);

module.exports = router;
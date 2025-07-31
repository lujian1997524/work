const { body, validationResult, param, query } = require('express-validator');

// 通用验证错误处理
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: '输入数据验证失败',
      details: errors.array()
    });
  }
  next();
};

// 用户登录验证
const validateLogin = [
  body('name')
    .notEmpty()
    .withMessage('用户姓名不能为空'),
  handleValidationErrors
];

// 用户创建验证
const validateUserCreate = [
  body('name')
    .notEmpty()
    .withMessage('用户姓名不能为空')
    .isLength({ min: 2, max: 50 })
    .withMessage('用户姓名长度应在2-50字符之间'),
  body('role')
    .optional()
    .isIn(['admin', 'operator'])
    .withMessage('用户角色必须是admin或operator'),
  handleValidationErrors
];

// 工人创建验证
const validateWorkerCreate = [
  body('name')
    .notEmpty()
    .withMessage('工人姓名不能为空')
    .isLength({ min: 2, max: 50 })
    .withMessage('工人姓名长度应在2-50字符之间'),
  body('phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('请输入有效的手机号码'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('department')
    .optional()
    .isLength({ max: 50 })
    .withMessage('部门名称不能超过50字符'),
  handleValidationErrors
];

// 项目创建验证
const validateProjectCreate = [
  body('name')
    .notEmpty()
    .withMessage('项目名称不能为空')
    .isLength({ min: 2, max: 100 })
    .withMessage('项目名称长度应在2-100字符之间'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('优先级必须是low, medium, high或urgent'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式无效'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式无效'),
  handleValidationErrors
];

// ID参数验证
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数'),
  handleValidationErrors
];

// 分页参数验证
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateLogin,
  validateUserCreate,
  validateWorkerCreate,
  validateProjectCreate,
  validateId,
  validatePagination
};
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// JWT认证中间件
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: '未提供认证令牌'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: '用户不存在'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error('认证错误:', error);
    res.status(401).json({
      error: '认证令牌无效'
    });
  }
};

// 管理员权限中间件
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: '需要管理员权限'
    });
  }
  next();
};

// 操作员或管理员权限中间件
const requireOperator = (req, res, next) => {
  if (!['admin', 'operator'].includes(req.user.role)) {
    return res.status(403).json({
      error: '权限不足'
    });
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireOperator
};
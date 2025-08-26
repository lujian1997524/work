const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const router = express.Router();

// 用户登录（仅需姓名）
router.post('/login', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: '请输入用户姓名'
      });
    }

    // 查找用户
    const user = await User.findOne({
      where: { name: name.trim() }
    });

    if (!user) {
      return res.status(404).json({
        error: '用户不存在'
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    );

    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      error: '登录失败',
      message: error.message
    });
  }
});

// 用户登出
router.post('/logout', (req, res) => {
  res.json({
    message: '登出成功'
  });
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
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
      return res.status(404).json({
        error: '用户不存在'
      });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(401).json({
      error: '认证令牌无效'
    });
  }
});

module.exports = router;
const express = require('express');
const { User } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validateUserCreate, validateId } = require('../middleware/validation');

const router = express.Router();

// 获取用户列表
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'role', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'ASC']]
    });

    res.json({
      users,
      total: users.length
    });

  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      error: '获取用户列表失败',
      message: error.message
    });
  }
});

// 获取单个用户信息
router.get('/:id', authenticate, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'role', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({
        error: '用户不存在'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      error: '获取用户信息失败',
      message: error.message
    });
  }
});

// 创建用户（仅管理员）
router.post('/', authenticate, requireAdmin, validateUserCreate, async (req, res) => {
  try {
    const { name, role = 'operator' } = req.body;

    if (!name) {
      return res.status(400).json({
        error: '用户姓名不能为空'
      });
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      where: { name: name.trim() }
    });

    if (existingUser) {
      return res.status(400).json({
        error: '用户名已存在'
      });
    }

    const user = await User.create({
      name: name.trim(),
      role
    });

    res.status(201).json({
      message: '用户创建成功',
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({
      error: '创建用户失败',
      message: error.message
    });
  }
});

// 更新用户角色（仅管理员）
router.put('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'operator'].includes(role)) {
      return res.status(400).json({
        error: '无效的用户角色'
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        error: '用户不存在'
      });
    }

    await user.update({ role });

    res.json({
      message: '用户角色更新成功',
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({
      error: '更新用户失败',
      message: error.message
    });
  }
});

// 删除用户（仅管理员）
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        error: '用户不存在'
      });
    }

    await user.destroy();

    res.json({
      message: '用户删除成功'
    });

  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({
      error: '删除用户失败',
      message: error.message
    });
  }
});

module.exports = router;
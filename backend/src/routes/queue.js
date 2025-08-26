const express = require('express');
const { Project, Material, ThicknessSpec, Worker, CuttingQueue, QueueAnnouncement, PublicQueueToken, User, Department } = require('../models');
const { Op } = require('sequelize');
const sseManager = require('../utils/sseManager');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 获取公共队列项目
router.get('/projects/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // 验证token
    const validToken = await PublicQueueToken.findOne({
      where: {
        token: token,
        isActive: true
      }
    });
    
    if (!validToken) {
      return res.status(401).json({
        error: '无效的访问令牌'
      });
    }

    // 更新访问统计
    await validToken.update({
      lastAccessed: new Date(),
      accessCount: validToken.accessCount + 1
    });

    // 获取活跃项目（pending和in_progress状态）
    const projects = await Project.findAll({
      where: {
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      },
      include: [
        {
          model: Worker,
          as: 'assignedWorker',
          attributes: ['id', 'name', 'departmentId'],
          include: [
            {
              model: Department,
              as: 'departmentInfo',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: Material,
          as: 'materials',
          include: [
            {
              model: ThicknessSpec,
              as: 'thicknessSpec',
              attributes: ['thickness', 'unit', 'materialType']
            }
          ]
        }
      ],
      order: [
        ['sortOrder', 'ASC'],  // 首先按排序字段排序
        ['priority', 'DESC'],   // 然后按优先级排序
        ['createdAt', 'ASC']    // 最后按创建时间排序
      ]
    });

    res.json({
      projects,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取队列项目失败:', error);
    res.status(500).json({
      error: '获取项目信息失败'
    });
  }
});

// 获取公共队列信息（包含公告）
router.get('/public/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // 验证token
    const validToken = await PublicQueueToken.findOne({
      where: {
        token: token,
        isActive: true
      }
    });
    
    if (!validToken) {
      return res.status(401).json({
        error: '无效的访问令牌'
      });
    }

    // 获取活跃公告
    const announcements = await QueueAnnouncement.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      announcements,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取公共队列信息失败:', error);
    res.status(500).json({
      error: '获取公告信息失败'
    });
  }
});

// 项目重新排序（需要管理员权限）
router.put('/projects/:token/reorder', async (req, res) => {
  try {
    const { token } = req.params;
    const { projectIds } = req.body;
    
    if (!token || !projectIds || !Array.isArray(projectIds)) {
      return res.status(400).json({
        error: '参数错误'
      });
    }

    // 验证token
    const validToken = await PublicQueueToken.findOne({
      where: {
        token: token,
        isActive: true
      }
    });
    
    if (!validToken) {
      return res.status(401).json({
        error: '无效的访问令牌'
      });
    }

    // 验证管理员权限：需要有效的JWT token且角色为admin
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '需要管理员登录权限'
      });
    }

    try {
      const jwtToken = authHeader.split(' ')[1];
      const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
      
      // 验证用户存在且为管理员
      const user = await User.findByPk(decoded.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          error: '需要管理员权限才能修改队列排序'
        });
      }
      
      console.log(`管理员 ${user.name} 正在修改队列排序`);
      
    } catch (jwtError) {
      return res.status(401).json({
        error: '无效的管理员令牌'
      });
    }

    // 验证用户权限并更新项目排序
    // 遍历projectIds数组，为每个项目设置新的sortOrder
    for (let i = 0; i < projectIds.length; i++) {
      const projectId = projectIds[i];
      const newSortOrder = i + 1; // 排序从1开始
      
      await Project.update(
        { sortOrder: newSortOrder },
        { where: { id: projectId } }
      );
    }
    
    console.log(`✅ 队列排序已更新: ${projectIds.length}个项目`);
    console.log(`📋 更新的项目ID: ${projectIds.join(', ')}`);
    
    // 向所有连接的客户端广播队列排序更新事件
    console.log('📡 开始广播队列排序更新事件...');
    const broadcastCount = sseManager.broadcast('queue-reorder', {
      message: '队列排序已更新',
      updatedCount: projectIds.length,
      timestamp: new Date().toISOString(),
      projectIds: projectIds
    });
    
    console.log(`📡 SSE队列排序事件已广播给 ${broadcastCount} 个连接`);
    console.log(`🎯 广播事件类型: queue-reorder`);
    console.log(`📊 事件数据: ${JSON.stringify({
      message: '队列排序已更新',
      updatedCount: projectIds.length,
      timestamp: new Date().toISOString(),
      projectIds: projectIds
    })}`);
    
    res.json({
      success: true,
      message: '项目排序已更新',
      updatedCount: projectIds.length
    });

  } catch (error) {
    console.error('项目排序失败:', error);
    res.status(500).json({
      error: '排序保存失败'
    });
  }
});

// 获取公告列表
router.get('/announcements', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    console.log(`📢 获取公告列表请求，限制条数: ${limit}`);
    
    const announcements = await QueueAnnouncement.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    console.log(`📢 找到 ${announcements.length} 个活跃公告`);
    announcements.forEach(ann => {
      console.log(`  - ID: ${ann.id}, 标题: "${ann.title}", 类型: ${ann.type}, 创建时间: ${ann.createdAt}`);
    });

    res.json({ 
      announcements,
      count: announcements.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    res.status(500).json({
      error: '获取公告失败'
    });
  }
});

// 创建公告（需要认证）
router.post('/announcements', authenticate, async (req, res) => {
  try {
    const { title, content, type = 'general', expiresAt } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        error: '标题和内容不能为空'
      });
    }

    const announcement = await QueueAnnouncement.create({
      title,
      content,
      type,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user.id // 现在有认证中间件，req.user一定存在
    });

    console.log(`✅ 用户 ${req.user.name} 创建了新公告: ${title}`);
    res.status(201).json(announcement);
  } catch (error) {
    console.error('创建公告失败:', error);
    res.status(500).json({
      error: '创建公告失败'
    });
  }
});

// 获取单个公告
router.get('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await QueueAnnouncement.findByPk(id);
    
    if (!announcement) {
      return res.status(404).json({
        error: '公告不存在'
      });
    }

    res.json(announcement);
  } catch (error) {
    console.error('获取公告失败:', error);
    res.status(500).json({
      error: '获取公告失败'
    });
  }
});

// 更新公告
router.put('/announcements/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, expiresAt, isActive } = req.body;
    
    const announcement = await QueueAnnouncement.findByPk(id);
    
    if (!announcement) {
      return res.status(404).json({
        error: '公告不存在'
      });
    }

    await announcement.update({
      title,
      content,
      type,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive
    });

    res.json(announcement);
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({
      error: '更新公告失败'
    });
  }
});

// 删除公告
router.delete('/announcements/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await QueueAnnouncement.findByPk(id);
    
    if (!announcement) {
      return res.status(404).json({
        error: '公告不存在'
      });
    }

    // 软删除：设置为不活跃
    await announcement.update({
      isActive: false
    });

    res.json({
      success: true,
      message: '公告已删除'
    });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({
      error: '删除公告失败'
    });
  }
});

module.exports = router;
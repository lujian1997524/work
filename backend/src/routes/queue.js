/**
 * 激光切割排队系统API路由
 */

const express = require('express');
const { Op } = require('sequelize');
const { authenticate, requireOperator, requireAdmin } = require('../middleware/auth');
const { CuttingQueue, QueueAnnouncement, PublicQueueToken } = require('../models/QueueModels');
const { Project, Worker, User, Material, ThicknessSpec } = require('../models');

const router = express.Router();

// ==================== 公共访问API（无需登录）====================

// 验证访问令牌中间件
const validateToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(404).json({ error: '页面不存在' });
    }
    
    // 特殊处理：允许默认公共token直接访问
    if (token === 'laser_queue_2025_public') {
      req.tokenRecord = {
        token: token,
        isActive: true,
        description: '默认公共访问token',
        accessCount: 0,
        lastAccessed: new Date()
      };
      return next();
    }
    
    const tokenRecord = await PublicQueueToken.findOne({
      where: { 
        token: token,
        isActive: true 
      }
    });
    
    if (!tokenRecord) {
      return res.status(404).json({ error: '页面不存在或已过期' });
    }
    
    // 更新访问记录
    await tokenRecord.update({
      lastAccessed: new Date(),
      accessCount: tokenRecord.accessCount + 1
    });
    
    req.tokenRecord = tokenRecord;
    next();
  } catch (error) {
    console.error('令牌验证错误:', error);
    res.status(500).json({ error: '系统错误' });
  }
};

// 公共项目数据API（支持完整项目数据）
router.get('/projects/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // 简化版token验证（支持laser_queue_2025_public）
    if (token !== 'laser_queue_2025_public') {
      return res.status(401).json({ error: '无效的访问令牌' });
    }
    
    // 获取所有活跃项目（pending + in_progress）
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
          attributes: ['id', 'name', 'department']
        },
        {
          model: Material,
          as: 'materials',
          include: [{
            model: ThicknessSpec,
            as: 'thicknessSpec',
            attributes: ['thickness', 'unit', 'materialType']
          }]
        }
      ],
      order: [
        ['sortOrder', 'ASC'],  // 首先按拖拽排序
        ['priority', 'DESC'],  // 然后按优先级排序 
        ['createdAt', 'ASC']   // 最后按创建时间升序
      ]
    });
    
    res.json({
      projects: projects,
      total: projects.length,
      lastUpdated: new Date().toISOString(),
      isPublic: true
    });
    
  } catch (error) {
    console.error('获取公共项目数据失败:', error);
    res.status(500).json({ error: '获取项目信息失败' });
  }
});

// 公共页面项目排序API（支持拖拽排序）
router.put('/projects/:token/reorder', async (req, res) => {
  try {
    const { token } = req.params;
    const { projectIds } = req.body;
    
    // 简化版token验证（支持laser_queue_2025_public）
    if (token !== 'laser_queue_2025_public') {
      return res.status(401).json({ error: '无效的访问令牌' });
    }
    
    if (!projectIds || !Array.isArray(projectIds)) {
      return res.status(400).json({ error: '项目ID列表无效' });
    }
    
    console.log('🔧 公共页面排序API被调用, 项目ID:', projectIds);
    
    // 先验证所有项目是否存在
    const existingProjects = await Project.findAll({
      where: { 
        id: projectIds,
        status: { [Op.in]: ['pending', 'in_progress'] } // 只允许排序活跃项目
      },
      attributes: ['id', 'name']
    });
    
    if (existingProjects.length !== projectIds.length) {
      const foundIds = existingProjects.map(p => p.id);
      const missingIds = projectIds.filter(id => !foundIds.includes(id));
      console.log('❌ 缺失的项目ID:', missingIds);
      return res.status(404).json({
        error: '部分项目不存在或不是活跃项目',
        missingIds
      });
    }

    // 使用事务确保原子性
    const { sequelize } = require('../utils/database');
    await sequelize.transaction(async (transaction) => {
      // 批量更新排序顺序
      const updatePromises = projectIds.map((projectId, index) => 
        Project.update(
          { sortOrder: index + 1 },
          { 
            where: { id: projectId },
            transaction
          }
        )
      );

      await Promise.all(updatePromises);
    });

    console.log('✅ 公共页面项目排序更新成功');

    // 发送SSE事件通知所有用户（包括公共页面用户）
    try {
      const sseManager = require('../utils/sseManager');
      sseManager.broadcast('projects-reordered', {
        projectIds,
        userName: '公共页面用户',
        userId: 'public-user',
        source: 'public-queue'
      });
      
      console.log('SSE事件已发送: 公共页面项目排序更新');
    } catch (sseError) {
      console.error('发送SSE事件失败:', sseError);
    }

    res.json({
      success: true,
      message: '项目排序更新成功',
      projectIds
    });
    
  } catch (error) {
    console.error('更新公共页面项目排序错误:', error);
    res.status(500).json({
      error: '更新项目排序失败',
      message: error.message
    });
  }
});

// 公共排队信息页面API（保持兼容）
router.get('/public/:token', validateToken, async (req, res) => {
  try {
    // 获取当前正在切割的项目
    const currentCutting = await CuttingQueue.findOne({
      where: { status: 'cutting' },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'name', 'department']
        }
      ]
    });
    
    // 获取排队列表（不包括已完成）
    const queueList = await CuttingQueue.findAll({
      where: { 
        status: ['queued', 'cutting']
      },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name'],
          include: [{
            model: Material,
            as: 'materials',
            include: [{
              model: ThicknessSpec,
              as: 'thicknessSpec',
              attributes: ['thickness', 'unit', 'materialType']
            }]
          }]
        },
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'name', 'department']
        }
      ],
      order: [
        ['position', 'ASC'],
        // 备用排序：优先级 + 创建时间（确保一致性）
        ['priority', 'ASC'], // urgent < normal < low
        ['created_at', 'ASC']
      ]
    });
    
    // 获取活跃公告
    console.log('🔍 查询公告数据...');
    const announcements = await QueueAnnouncement.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      order: [['created_at', 'DESC']],
      limit: 5
    });
    console.log('📢 查询到公告数量:', announcements.length);
    console.log('📢 公告详情:', announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      isActive: a.isActive,
      expiresAt: a.expiresAt,
      created_at: a.created_at
    })));
    
    
    // 处理队列数据，添加材料信息
    const processedQueue = queueList.map(item => {
      const materials = item.project?.materials || [];
      const materialInfo = materials.map(m => {
        const spec = m.thicknessSpec;
        return `${spec?.materialType || '碳板'}${spec?.thickness}${spec?.unit || 'mm'}`;
      }).join(', ') || '未指定';
      
      return {
        id: item.id,
        position: item.position,
        projectName: item.project?.name || '未命名项目',
        workerName: item.worker?.name || '未分配',
        workerDepartment: item.worker?.department || '',
        materials: materialInfo,
        estimatedStartTime: item.estimatedStartTime,
        estimatedDuration: item.estimatedDuration,
        priority: item.priority,
        status: item.status
      };
    });
    
    // 处理当前切割项目
    let currentCuttingInfo = null;
    if (currentCutting) {
      const materials = currentCutting.project?.materials || [];
      const materialInfo = materials.map(m => {
        const spec = m.thicknessSpec;
        return `${spec?.materialType || '碳板'}${spec?.thickness}${spec?.unit || 'mm'}`;
      }).join(', ') || '未指定';
      
      currentCuttingInfo = {
        projectName: currentCutting.project?.name || '未命名项目',
        workerName: currentCutting.worker?.name || '未分配',
        materials: materialInfo,
        estimatedDuration: currentCutting.estimatedDuration,
        estimatedStartTime: currentCutting.estimatedStartTime
      };
    }
    
    res.json({
      success: true,
      data: {
        currentCutting: currentCuttingInfo,
        queueList: processedQueue,
        announcements: announcements,
        totalQueued: queueList.filter(item => item.status === 'queued').length,
        lastUpdated: new Date()
      }
    });
    
  } catch (error) {
    console.error('获取公共排队信息错误:', error);
    res.status(500).json({ error: '获取排队信息失败' });
  }
});

// ==================== 管理API（需要登录）====================

// 获取当前切割状态
router.get('/current-cutting', authenticate, async (req, res) => {
  try {
    const currentCutting = await CuttingQueue.findOne({
      where: { status: 'cutting' },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name'],
          include: [{
            model: Material,
            as: 'materials',
            include: [{
              model: ThicknessSpec,
              as: 'thicknessSpec',
              attributes: ['thickness', 'unit', 'materialType']
            }]
          }]
        },
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'name', 'department']
        }
      ]
    });
    
    let currentCuttingInfo = null;
    if (currentCutting) {
      currentCuttingInfo = {
        id: currentCutting.id,
        name: currentCutting.project?.name || '未命名项目',
        assignedWorker: currentCutting.worker ? {
          id: currentCutting.worker.id,
          name: currentCutting.worker.name
        } : null,
        materials: currentCutting.project?.materials || [],
        estimatedDuration: currentCutting.estimatedDuration,
        estimatedStartTime: currentCutting.estimatedStartTime
      };
    }
    
    res.json({ currentCutting: currentCuttingInfo });
  } catch (error) {
    console.error('获取当前切割状态错误:', error);
    res.status(500).json({ error: '获取当前切割状态失败' });
  }
});

// 获取排队管理列表
router.get('/manage', authenticate, async (req, res) => {
  try {
    const queueList = await CuttingQueue.findAll({
      where: { 
        status: ['queued', 'cutting']
      },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: Worker,
          as: 'worker',
          attributes: ['id', 'name', 'department']
        }
      ],
      order: [
        ['position', 'ASC'],
        // 备用排序：优先级 + 创建时间（确保一致性）
        ['priority', 'ASC'], // urgent < normal < low
        ['created_at', 'ASC']
      ]
    });
    
    res.json({ queueList });
  } catch (error) {
    console.error('获取排队管理列表错误:', error);
    res.status(500).json({ error: '获取排队列表失败' });
  }
});

// 添加项目到排队
router.post('/add', authenticate, requireOperator, async (req, res) => {
  try {
    const { projectId, workerId, priority = 'normal', estimatedDuration } = req.body;
    
    // 验证项目和工人存在
    const project = await Project.findByPk(projectId);
    const worker = await Worker.findByPk(workerId);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    if (!worker) {
      return res.status(404).json({ error: '工人不存在' });
    }
    
    // 检查项目是否已在排队
    const existingQueue = await CuttingQueue.findOne({
      where: { projectId, status: ['queued', 'cutting'] }
    });
    
    if (existingQueue) {
      return res.status(400).json({ error: '项目已在排队中' });
    }
    
    // 智能位置分配：基于优先级和添加时间
    let position;
    
    if (priority === 'urgent') {
      // 紧急任务：插入到所有紧急任务的最后，但在正常和低优先级任务之前
      const lastUrgentPosition = await CuttingQueue.max('position', {
        where: { status: ['queued', 'cutting'], priority: 'urgent' }
      }) || 0;
      
      // 如果有紧急任务，插在最后一个紧急任务后面
      // 如果没有紧急任务，插在队列最前面（位置1，或当前cutting任务后）
      const cuttingExists = await CuttingQueue.findOne({
        where: { status: 'cutting' }
      });
      position = Math.max(lastUrgentPosition + 1, cuttingExists ? 2 : 1);
      
      // 更新后续任务的位置
      await CuttingQueue.increment('position', {
        by: 1,
        where: { 
          status: ['queued'],
          position: { [Op.gte]: position }
        }
      });
      
    } else if (priority === 'low') {
      // 低优先级：添加到队列最后
      const lastPosition = await CuttingQueue.max('position', {
        where: { status: ['queued', 'cutting'] }
      }) || 0;
      position = lastPosition + 1;
      
    } else {
      // 正常优先级：插入到正常优先级任务的最后，但在低优先级任务之前
      const lastNormalPosition = await CuttingQueue.max('position', {
        where: { 
          status: ['queued', 'cutting'], 
          priority: { [Op.in]: ['urgent', 'normal'] }
        }
      });
      
      if (lastNormalPosition) {
        position = lastNormalPosition + 1;
        // 更新低优先级任务的位置
        await CuttingQueue.increment('position', {
          by: 1,
          where: { 
            status: ['queued'],
            priority: 'low',
            position: { [Op.gte]: position }
          }
        });
      } else {
        // 如果没有正常或紧急任务，检查是否有cutting任务
        const cuttingExists = await CuttingQueue.findOne({
          where: { status: 'cutting' }
        });
        position = cuttingExists ? 2 : 1;
        
        // 更新所有排队任务的位置
        await CuttingQueue.increment('position', {
          by: 1,
          where: { 
            status: ['queued'],
            position: { [Op.gte]: position }
          }
        });
      }
    }
    
    // 创建排队记录
    const queueItem = await CuttingQueue.create({
      projectId,
      workerId,
      position: position,
      priority,
      estimatedDuration: estimatedDuration || 240, // 默认4小时，更符合激光切割实际情况
      status: 'queued'
    });
    
    res.json({ 
      success: true, 
      message: '项目已添加到排队',
      queueItem 
    });
    
  } catch (error) {
    console.error('添加排队错误:', error);
    res.status(500).json({ error: '添加排队失败' });
  }
});

// 更新排队顺序
router.put('/reorder', authenticate, requireOperator, async (req, res) => {
  try {
    const { queueIds } = req.body; // 新的排序ID数组
    
    if (!Array.isArray(queueIds)) {
      return res.status(400).json({ error: '排序数据格式错误' });
    }
    
    // 使用事务更新排序
    const { sequelize } = require('../utils/database');
    await sequelize.transaction(async (t) => {
      for (let i = 0; i < queueIds.length; i++) {
        await CuttingQueue.update(
          { position: i + 1 },
          { 
            where: { id: queueIds[i] },
            transaction: t
          }
        );
      }
    });
    
    res.json({ success: true, message: '排队顺序已更新' });
    
  } catch (error) {
    console.error('更新排队顺序错误:', error);
    res.status(500).json({ error: '更新排队顺序失败' });
  }
});

// 开始切割（更新状态为cutting）
router.put('/:id/start', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否有其他正在切割的项目
    const currentCutting = await CuttingQueue.findOne({
      where: { status: 'cutting' }
    });
    
    if (currentCutting && currentCutting.id !== parseInt(id)) {
      return res.status(400).json({ error: '已有其他项目正在切割中' });
    }
    
    const queueItem = await CuttingQueue.findByPk(id);
    if (!queueItem) {
      return res.status(404).json({ error: '排队项目不存在' });
    }
    
    await queueItem.update({
      status: 'cutting',
      estimatedStartTime: new Date()
    });
    
    res.json({ success: true, message: '已开始切割' });
    
  } catch (error) {
    console.error('开始切割错误:', error);
    res.status(500).json({ error: '开始切割失败' });
  }
});

// 完成切割
router.put('/:id/complete', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;
    
    const queueItem = await CuttingQueue.findByPk(id);
    if (!queueItem) {
      return res.status(404).json({ error: '排队项目不存在' });
    }
    
    await queueItem.update({
      status: 'completed'
    });
    
    res.json({ success: true, message: '切割已完成' });
    
  } catch (error) {
    console.error('完成切割错误:', error);
    res.status(500).json({ error: '完成切割失败' });
  }
});

// ==================== 公告管理API ====================

// 获取公告列表
router.get('/announcements', authenticate, async (req, res) => {
  try {
    const announcements = await QueueAnnouncement.findAll({
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name']
      }],
      order: [['created_at', 'DESC']]
    });
    
    res.json({ announcements });
  } catch (error) {
    console.error('获取公告列表错误:', error);
    res.status(500).json({ error: '获取公告列表失败' });
  }
});

//创建公告
router.post('/announcements', authenticate, requireOperator, async (req, res) => {
  try {
    const { title, content, type = 'general', expiresAt } = req.body;
    
    console.log('📝 创建公告请求:', { title, content, type, expiresAt });
    
    const announcement = await QueueAnnouncement.create({
      title,
      content,
      type,
      expiresAt: expiresAt || null,
      createdBy: req.user.id,
      isActive: true // 默认设置为活跃状态
    });
    
    console.log('✅ 公告创建成功:', {
      id: announcement.id,
      title: announcement.title,
      isActive: announcement.isActive,
      created_at: announcement.created_at
    });
    
    res.json({ 
      success: true, 
      message: '公告创建成功',
      announcement 
    });
    
  } catch (error) {
    console.error('创建公告错误:', error);
    res.status(500).json({ error: '创建公告失败' });
  }
});

// 编辑公告
router.put('/announcements/:id', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, expiresAt } = req.body;
    
    console.log('✏️ 编辑公告请求:', { id, title, content, type, expiresAt });
    
    const announcement = await QueueAnnouncement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: '公告不存在' });
    }
    
    await announcement.update({
      title,
      content,
      type,
      expiresAt: expiresAt || null
    });
    
    console.log('✅ 公告编辑成功:', {
      id: announcement.id,
      title: announcement.title,
      updated_at: announcement.updated_at
    });
    
    res.json({ 
      success: true, 
      message: '公告编辑成功',
      announcement 
    });
    
  } catch (error) {
    console.error('编辑公告错误:', error);
    res.status(500).json({ error: '编辑公告失败' });
  }
});

// 删除公告
router.delete('/announcements/:id', authenticate, requireOperator, async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await QueueAnnouncement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: '公告不存在' });
    }
    
    await announcement.destroy();
    
    res.json({ success: true, message: '公告已删除' });
    
  } catch (error) {
    console.error('删除公告错误:', error);
    res.status(500).json({ error: '删除公告失败' });
  }
});

// ==================== 令牌管理API ====================

// 获取访问令牌
router.get('/tokens', authenticate, requireAdmin, async (req, res) => {
  try {
    const tokens = await PublicQueueToken.findAll({
      order: [['created_at', 'DESC']]
    });
    
    res.json({ tokens });
  } catch (error) {
    console.error('获取令牌列表错误:', error);
    res.status(500).json({ error: '获取令牌列表失败' });
  }
});

// 生成新的访问令牌
router.post('/tokens', authenticate, requireAdmin, async (req, res) => {
  try {
    const { description } = req.body;
    
    // 生成随机令牌
    const token = `laser_queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newToken = await PublicQueueToken.create({
      token,
      description: description || '激光切割排队公告板'
    });
    
    res.json({ 
      success: true, 
      message: '访问令牌生成成功',
      token: newToken,
      qrCodeUrl: `/queue/public/${token}` // 二维码内容
    });
    
  } catch (error) {
    console.error('生成令牌错误:', error);
    res.status(500).json({ error: '生成令牌失败' });
  }
});

module.exports = router;
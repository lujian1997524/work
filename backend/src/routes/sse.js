const express = require('express');
const { authenticate } = require('../middleware/auth');
const sseManager = require('../utils/sseManager');

const router = express.Router();

/**
 * SSE连接端点
 * GET /api/sse/connect?token=xxx
 * 建立服务器发送事件连接，用于实时推送
 * 
 * 由于EventSource不支持自定义请求头，token通过查询参数传递
 */
router.get('/connect', async (req, res) => {
  // 从查询参数获取token
  const token = req.query.token;
  
  console.log('SSE连接请求:', {
    url: req.url,
    method: req.method,
    headers: {
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent']?.substring(0, 50),
      accept: req.headers.accept
    },
    query: req.query,
    tokenExists: !!token,
    tokenLength: token ? token.length : 0,
    tokenStart: token ? token.substring(0, 20) + '...' : 'N/A'
  });
  
  if (!token) {
    console.log('❌ SSE连接失败: 缺少token');
    return res.status(401).json({
      success: false,
      error: '缺少认证令牌'
    });
  }

  // 手动验证token
  const jwt = require('jsonwebtoken');
  const { PublicQueueToken } = require('../models');
  let user;
  let isPublicToken = false;
  
  // 检查是否为公共队列token
  if (token.startsWith('public-queue-')) {
    try {
      console.log('🔍 验证公共队列token...');
      const tokenPart = token.replace('public-queue-', '');
      
      const publicToken = await PublicQueueToken.findOne({
        where: {
          token: tokenPart,
          isActive: true
        }
      });
      
      if (publicToken) {
        console.log('✅ 公共token验证成功:', tokenPart);
        isPublicToken = true;
        user = { id: 'public', name: '公共访问', role: 'public' };
        
        // 更新访问统计
        await publicToken.update({
          lastAccessed: new Date(),
          accessCount: publicToken.accessCount + 1
        });
      } else {
        throw new Error('无效的公共访问令牌');
      }
    } catch (error) {
      console.log('❌ 公共token验证失败:', error.message);
      return res.status(401).json({
        success: false,
        error: '无效的公共访问令牌'
      });
    }
  } else {
    // JWT token验证
    try {
      console.log('🔍 验证JWT token...');
      console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = decoded;
      console.log('✅ JWT验证成功:', { userId: user.id, userName: user.name, role: user.role });
    } catch (error) {
      console.log('❌ JWT验证失败:', error.message);
      console.log('Token内容:', token);
      return res.status(401).json({
        success: false,
        error: '无效的认证令牌'
      });
    }
  }
  
  console.log(`🔌 用户 ${user.name}(ID:${user.id}) 请求建立SSE连接`);

  // 设置SSE响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'Access-Control-Expose-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no' // 禁用nginx缓冲
  });

  // 发送初始连接成功消息
  const welcomeMessage = sseManager.formatSSEMessage('connected', {
    message: '连接成功',
    userId: user.id,
    userName: user.name,
    timestamp: new Date().toISOString()
  });
  res.write(welcomeMessage);

  // 添加客户端到SSE管理器
  const clientId = sseManager.addClient(user.id, res);

  // 处理客户端断开连接
  req.on('close', () => {
    console.log(`用户 ${user.name}(ID:${user.id}) SSE连接关闭`);
    sseManager.removeClient(user.id, clientId);
  });

  req.on('error', (error) => {
    console.error(`用户 ${user.name}(ID:${user.id}) SSE连接错误:`, error.message);
    sseManager.removeClient(user.id, clientId);
  });
});

/**
 * 获取SSE连接状态
 * GET /api/sse/status
 * 返回当前SSE连接统计信息（仅管理员）
 */
router.get('/status', authenticate, (req, res) => {
  const { user } = req;
  
  // 检查管理员权限
  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '需要管理员权限'
    });
  }

  const status = sseManager.getStatus();
  
  res.json({
    success: true,
    status: {
      ...status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * 发送测试消息
 * POST /api/sse/test
 * 发送测试SSE消息（仅管理员）
 */
router.post('/test', authenticate, (req, res) => {
  const { user } = req;
  const { message, targetUserId, eventType = 'test' } = req.body;
  
  // 检查管理员权限
  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '需要管理员权限'
    });
  }

  try {
    let sentCount = 0;
    
    if (targetUserId) {
      // 发送给特定用户
      const sent = sseManager.sendToUser(parseInt(targetUserId), eventType, {
        message: message || '这是一条测试消息',
        from: user.name
      });
      sentCount = sent ? 1 : 0;
    } else {
      // 广播给所有用户
      sentCount = sseManager.broadcast(eventType, {
        message: message || '这是一条测试广播消息',
        from: user.name
      });
    }

    res.json({
      success: true,
      message: `测试消息已发送给${sentCount}个连接`,
      sentCount
    });
  } catch (error) {
    console.error('发送测试消息失败:', error);
    res.status(500).json({
      success: false,
      error: '发送测试消息失败'
    });
  }
});

module.exports = router;
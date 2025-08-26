// SSE事件管理器
class SSEManager {
  constructor() {
    // 存储所有连接的客户端
    this.clients = new Map(); // userId -> Set of response objects
    this.nextClientId = 1;
  }

  // 添加客户端连接
  addClient(userId, response, clientId = null) {
    if (!clientId) {
      clientId = this.nextClientId++;
    }

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Map());
    }

    this.clients.get(userId).set(clientId, response);
    
    console.log(`SSE客户端连接: 用户${userId}, 连接ID${clientId}`);
    console.log(`当前总连接数: ${this.getTotalConnections()}`);
    
    return clientId;
  }

  // 移除客户端连接
  removeClient(userId, clientId) {
    if (this.clients.has(userId)) {
      const userClients = this.clients.get(userId);
      userClients.delete(clientId);
      
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
    
    console.log(`SSE客户端断开: 用户${userId}, 连接ID${clientId}`);
    console.log(`当前总连接数: ${this.getTotalConnections()}`);
  }

  // 获取总连接数
  getTotalConnections() {
    let total = 0;
    for (const userClients of this.clients.values()) {
      total += userClients.size;
    }
    return total;
  }

  // 向特定用户发送事件
  sendToUser(userId, eventType, data) {
    if (!this.clients.has(userId)) {
      return false;
    }

    const userClients = this.clients.get(userId);
    const message = this.formatSSEMessage(eventType, data);
    let sentCount = 0;

    for (const [clientId, response] of userClients) {
      try {
        response.write(message);
        sentCount++;
      } catch (error) {
        console.error(`发送SSE消息失败 (用户${userId}, 连接${clientId}):`, error.message);
        // 清理无效连接
        userClients.delete(clientId);
      }
    }

    return sentCount > 0;
  }

  // 向所有用户广播事件（除了指定的排除用户）
  broadcast(eventType, data, excludeUserId = null) {
    let totalSent = 0;
    const message = this.formatSSEMessage(eventType, data);

    for (const [userId, userClients] of this.clients) {
      // 跳过排除的用户（通常是触发事件的用户）
      // 确保类型一致性，将两个值都转换为字符串进行比较
      console.log(`🔍 SSE广播比较: userId=${userId}(${typeof userId}), excludeUserId=${excludeUserId}(${typeof excludeUserId})`);
      if (excludeUserId && String(userId) === String(excludeUserId)) {
        console.log(`⏭️ 跳过用户 ${userId} (被排除)`);
        continue;
      }

      for (const [clientId, response] of userClients) {
        try {
          response.write(message);
          totalSent++;
        } catch (error) {
          console.error(`广播SSE消息失败 (用户${userId}, 连接${clientId}):`, error.message);
          // 清理无效连接
          userClients.delete(clientId);
        }
      }

      // 如果用户没有有效连接，清理用户记录
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }

    console.log(`SSE广播: ${eventType}, 发送给${totalSent}个连接, 排除用户${excludeUserId} (userId类型: ${typeof excludeUserId})`);
    return totalSent;
  }

  // 格式化SSE消息
  formatSSEMessage(eventType, data) {
    const timestamp = new Date().toISOString();
    const eventData = {
      type: eventType,
      data: data,
      timestamp: timestamp
    };

    return `event: ${eventType}\ndata: ${JSON.stringify(eventData)}\n\n`;
  }

  // 发送心跳包
  sendHeartbeat() {
    const heartbeatMessage = this.formatSSEMessage('heartbeat', { 
      time: new Date().toISOString(),
      connections: this.getTotalConnections()
    });

    let totalSent = 0;
    for (const [userId, userClients] of this.clients) {
      for (const [clientId, response] of userClients) {
        try {
          response.write(heartbeatMessage);
          totalSent++;
        } catch (error) {
          console.error(`发送心跳失败 (用户${userId}, 连接${clientId}):`, error.message);
          userClients.delete(clientId);
        }
      }

      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }

    return totalSent;
  }

  // 清理所有连接
  cleanup() {
    for (const [userId, userClients] of this.clients) {
      for (const [clientId, response] of userClients) {
        try {
          response.end();
        } catch (error) {
          console.error(`关闭SSE连接失败:`, error.message);
        }
      }
    }
    this.clients.clear();
    console.log('所有SSE连接已清理');
  }

  // 获取连接状态
  getStatus() {
    const userConnections = {};
    for (const [userId, userClients] of this.clients) {
      userConnections[userId] = userClients.size;
    }

    return {
      totalUsers: this.clients.size,
      totalConnections: this.getTotalConnections(),
      userConnections: userConnections
    };
  }
}

// 创建全局SSE管理器实例
const sseManager = new SSEManager();

// 定期发送心跳包（每30秒）
setInterval(() => {
  const sent = sseManager.sendHeartbeat();
  if (sent > 0) {
    console.log(`发送心跳包给${sent}个连接`);
  }
}, 30000);

// 进程退出时清理连接
process.on('SIGINT', () => {
  console.log('正在关闭SSE连接...');
  sseManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('正在关闭SSE连接...');
  sseManager.cleanup();
  process.exit(0);
});

module.exports = sseManager;
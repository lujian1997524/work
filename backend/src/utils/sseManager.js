// SSE事件管理器
class SSEManager {
  constructor() {
    // 存储所有连接的客户端 - 重构为支持设备ID的多层结构
    this.clients = new Map(); // userId -> Map<connectionId, {response, deviceId, userAgent, connectedAt}>
    this.nextConnectionId = 1;
    
    // 连接索引，便于快速查找
    this.connectionIndex = new Map(); // connectionId -> {userId, deviceId}
  }

  // 添加客户端连接 - 支持设备ID和详细连接信息
  addClient(userId, response, deviceId = null, userAgent = null) {
    const connectionId = this.nextConnectionId++;
    
    // 生成设备ID（如果未提供）
    if (!deviceId) {
      deviceId = this.generateDeviceId(userAgent);
    }

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Map());
    }

    // 存储连接详细信息
    const connectionInfo = {
      response,
      deviceId,
      userAgent: userAgent || 'Unknown',
      connectedAt: new Date().toISOString(),
      lastHeartbeat: Date.now()
    };

    this.clients.get(userId).set(connectionId, connectionInfo);
    this.connectionIndex.set(connectionId, { userId, deviceId });
    
    console.log(`SSE客户端连接: 用户${userId}, 连接ID${connectionId}, 设备ID${deviceId}`);
    console.log(`当前总连接数: ${this.getTotalConnections()}`);
    
    return connectionId;
  }

  // 生成设备ID（基于用户代理和时间戳）
  generateDeviceId(userAgent) {
    const timestamp = Date.now();
    const userAgentHash = userAgent ? this.simpleHash(userAgent) : 'unknown';
    return `device_${userAgentHash}_${timestamp}`;
  }

  // 简单哈希函数
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转为32位整数
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  // 移除客户端连接
  removeClient(userId, connectionId) {
    if (this.clients.has(userId)) {
      const userConnections = this.clients.get(userId);
      const connectionInfo = userConnections.get(connectionId);
      
      userConnections.delete(connectionId);
      this.connectionIndex.delete(connectionId);
      
      if (userConnections.size === 0) {
        this.clients.delete(userId);
      }
      
      const deviceId = connectionInfo?.deviceId || 'unknown';
      console.log(`SSE客户端断开: 用户${userId}, 连接ID${connectionId}, 设备ID${deviceId}`);
      console.log(`当前总连接数: ${this.getTotalConnections()}`);
    }
  }

  // 获取总连接数
  getTotalConnections() {
    let total = 0;
    for (const userConnections of this.clients.values()) {
      total += userConnections.size;
    }
    return total;
  }

  // 向特定用户发送事件
  sendToUser(userId, eventType, data) {
    if (!this.clients.has(userId)) {
      return false;
    }

    const userConnections = this.clients.get(userId);
    const message = this.formatSSEMessage(eventType, data);
    let sentCount = 0;

    for (const [connectionId, connectionInfo] of userConnections) {
      try {
        connectionInfo.response.write(message);
        connectionInfo.lastHeartbeat = Date.now(); // 更新心跳时间
        sentCount++;
      } catch (error) {
        console.error(`发送SSE消息失败 (用户${userId}, 连接${connectionId}, 设备${connectionInfo.deviceId}):`, error.message);
        // 清理无效连接
        userConnections.delete(connectionId);
        this.connectionIndex.delete(connectionId);
      }
    }

    return sentCount > 0;
  }

  // 向所有用户广播事件 - 支持精确的连接排除
  broadcast(eventType, data, excludeOptions = {}) {
    let totalSent = 0;
    const message = this.formatSSEMessage(eventType, data);
    
    // 支持多种排除方式
    const { 
      excludeUserId = null, 
      excludeConnectionId = null,
      excludeDeviceId = null,
      excludeAll = false 
    } = typeof excludeOptions === 'string' || typeof excludeOptions === 'number'
      ? { excludeUserId: excludeOptions } // 兼容旧版本API
      : excludeOptions;

    if (excludeAll) {
      console.log(`SSE广播: ${eventType}, 排除所有连接`);
      return 0;
    }

    for (const [userId, userConnections] of this.clients) {
      for (const [connectionId, connectionInfo] of userConnections) {
        
        // 精确排除逻辑 - 只排除特定连接，而非整个用户
        let shouldExclude = false;
        
        if (excludeConnectionId && connectionId === excludeConnectionId) {
          shouldExclude = true;
          console.log(`⏭️ 跳过连接 ${connectionId} (连接ID被排除)`);
        } else if (excludeDeviceId && connectionInfo.deviceId === excludeDeviceId) {
          shouldExclude = true;
          console.log(`⏭️ 跳过设备 ${connectionInfo.deviceId} (设备ID被排除)`);
        } else if (excludeUserId && String(userId) === String(excludeUserId) && !excludeDeviceId && !excludeConnectionId) {
          // 只有在没有指定设备ID或连接ID时，才排除用户的所有设备
          // 这保持了向后兼容性，但推荐使用更精确的排除方式
          shouldExclude = true;
          console.log(`⏭️ 跳过用户 ${userId} 的所有设备 (用户ID被排除，未指定精确排除)`);
        }

        if (shouldExclude) {
          continue;
        }

        // 发送消息
        try {
          connectionInfo.response.write(message);
          connectionInfo.lastHeartbeat = Date.now();
          totalSent++;
        } catch (error) {
          console.error(`广播SSE消息失败 (用户${userId}, 连接${connectionId}, 设备${connectionInfo.deviceId}):`, error.message);
          // 清理无效连接
          userConnections.delete(connectionId);
          this.connectionIndex.delete(connectionId);
        }
      }

      // 如果用户没有有效连接，清理用户记录
      if (userConnections.size === 0) {
        this.clients.delete(userId);
      }
    }

    const excludeInfo = excludeConnectionId ? `连接${excludeConnectionId}` :
                       excludeDeviceId ? `设备${excludeDeviceId}` :
                       excludeUserId ? `用户${excludeUserId}` : '无';
                       
    console.log(`📡 SSE广播完成: ${eventType}, 发送给${totalSent}个连接, 排除${excludeInfo}`);
    return totalSent;
  }

  // 精确广播 - 排除特定连接ID（推荐使用）
  broadcastExcludeConnection(eventType, data, excludeConnectionId) {
    return this.broadcast(eventType, data, { excludeConnectionId });
  }

  // 精确广播 - 排除特定设备ID
  broadcastExcludeDevice(eventType, data, excludeDeviceId) {
    return this.broadcast(eventType, data, { excludeDeviceId });
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

  // 发送心跳包 - 增强版本，支持连接健康检查
  sendHeartbeat() {
    const now = Date.now();
    const heartbeatTimeout = 60000; // 60秒无心跳则认为连接异常
    let totalSent = 0;
    let expiredConnections = [];

    for (const [userId, userConnections] of this.clients) {
      for (const [connectionId, connectionInfo] of userConnections) {
        // 检查连接是否超时
        const timeSinceLastHeartbeat = now - connectionInfo.lastHeartbeat;
        if (timeSinceLastHeartbeat > heartbeatTimeout) {
          expiredConnections.push({ userId, connectionId, deviceId: connectionInfo.deviceId });
          continue;
        }

        try {
          const heartbeatMessage = this.formatSSEMessage('heartbeat', { 
            time: new Date().toISOString(),
            connections: this.getTotalConnections(),
            connectionId: connectionId,
            deviceId: connectionInfo.deviceId
          });
          
          connectionInfo.response.write(heartbeatMessage);
          connectionInfo.lastHeartbeat = now;
          totalSent++;
        } catch (error) {
          console.error(`发送心跳失败 (用户${userId}, 连接${connectionId}, 设备${connectionInfo.deviceId}):`, error.message);
          expiredConnections.push({ userId, connectionId, deviceId: connectionInfo.deviceId });
        }
      }
    }

    // 清理过期连接
    for (const { userId, connectionId, deviceId } of expiredConnections) {
      console.log(`清理过期连接: 用户${userId}, 连接${connectionId}, 设备${deviceId}`);
      this.removeClient(userId, connectionId);
    }

    if (expiredConnections.length > 0) {
      console.log(`清理了${expiredConnections.length}个过期连接`);
    }

    return totalSent;
  }

  // 获取连接状态 - 增强版本，包含设备信息
  getStatus() {
    const userConnections = {};
    const deviceConnections = {};
    let totalConnections = 0;

    for (const [userId, connections] of this.clients) {
      userConnections[userId] = {
        connectionCount: connections.size,
        devices: []
      };

      for (const [connectionId, connectionInfo] of connections) {
        const deviceInfo = {
          connectionId,
          deviceId: connectionInfo.deviceId,
          userAgent: connectionInfo.userAgent,
          connectedAt: connectionInfo.connectedAt,
          lastHeartbeat: new Date(connectionInfo.lastHeartbeat).toISOString(),
          isHealthy: Date.now() - connectionInfo.lastHeartbeat < 60000
        };

        userConnections[userId].devices.push(deviceInfo);
        
        if (!deviceConnections[connectionInfo.deviceId]) {
          deviceConnections[connectionInfo.deviceId] = [];
        }
        deviceConnections[connectionInfo.deviceId].push({
          userId,
          connectionId,
          ...deviceInfo
        });

        totalConnections++;
      }
    }

    return {
      totalUsers: this.clients.size,
      totalConnections,
      userConnections,
      deviceConnections,
      healthySummary: {
        healthy: Object.values(deviceConnections).flat().filter(c => c.isHealthy).length,
        unhealthy: Object.values(deviceConnections).flat().filter(c => !c.isHealthy).length
      }
    };
  }

  // 清理所有连接
  cleanup() {
    for (const [userId, userConnections] of this.clients) {
      for (const [connectionId, connectionInfo] of userConnections) {
        try {
          connectionInfo.response.end();
        } catch (error) {
          console.error(`关闭SSE连接失败 (用户${userId}, 连接${connectionId}, 设备${connectionInfo.deviceId}):`, error.message);
        }
      }
    }
    this.clients.clear();
    this.connectionIndex.clear();
    console.log('所有SSE连接已清理');
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
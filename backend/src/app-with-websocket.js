const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
require('dotenv').config();

const app = express();

// 现有的Express中间件和路由
app.use(express.json());
// ... 其他中间件和路由

// 创建HTTP服务器
const server = http.createServer(app);

// 在HTTP服务器上创建WebSocket服务器
const wss = new WebSocket.Server({
  server,
  path: '/ws',
  verifyClient: (info) => {
    const query = url.parse(info.req.url, true).query;
    const token = query.token;
    
    if (!token) {
      console.log('WebSocket连接被拒绝：缺少token');
      return false;
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      info.req.user = decoded;
      return true;
    } catch (error) {
      console.log('WebSocket连接被拒绝：token无效', error.message);
      return false;
    }
  }
});

// WebSocket连接处理
const clients = new Map();

wss.on('connection', (ws, req) => {
  const user = req.user;
  const clientId = `${user.id}_${Date.now()}`;
  
  clients.set(clientId, { ws, user, lastPing: Date.now() });
  
  console.log(`用户 ${user.name} 已连接 WebSocket`);
  
  ws.send(JSON.stringify({
    type: 'connection_established',
    data: { clientId, user: user.name }
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'ping') {
        clients.get(clientId).lastPing = Date.now();
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      
      // 广播给其他客户端
      broadcastToOthers(clientId, data);
    } catch (error) {
      console.error('WebSocket消息处理错误:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`用户 ${user.name} 断开连接`);
  });
});

function broadcastToOthers(senderClientId, message) {
  const senderClient = clients.get(senderClientId);
  if (!senderClient) return;
  
  clients.forEach((client, clientId) => {
    if (clientId === senderClientId) return;
    
    if (client.ws.readyState === WebSocket.OPEN) {
      const messageWithSender = {
        ...message,
        userId: senderClient.user.id,
        userName: senderClient.user.name,
        timestamp: new Date().toISOString()
      };
      
      client.ws.send(JSON.stringify(messageWithSender));
    }
  });
}

// 启动服务器（同时支持HTTP和WebSocket）
const PORT = process.env.PORT || 35001;
server.listen(PORT, () => {
  console.log(`服务器启动成功：`);
  console.log(`- HTTP API: http://localhost:${PORT}`);
  console.log(`- WebSocket: ws://localhost:${PORT}/ws`);
});

module.exports = { app, server, wss, clients, broadcastToOthers };
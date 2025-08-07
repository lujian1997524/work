import { useAuth } from '@/contexts/AuthContext';
import { configManager } from './configManager';

// SSE事件类型
export type SSEEventType = 
  | 'connected'
  | 'heartbeat'
  | 'project-created'
  | 'project-updated'
  | 'project-deleted'
  | 'project-status-changed'
  | 'project-restored' 
  | 'project-soft-deleted'
  | 'project-moved-to-past'
  | 'project-restored-from-past'
  | 'projects-batch-restored'
  | 'projects-batch-soft-deleted'
  | 'projects-batch-destroyed'
  | 'material-status-changed'
  | 'material-batch-status-changed'
  | 'test';

// SSE事件数据接口
export interface SSEEventData {
  type: SSEEventType;
  data: any;
  timestamp: string;
}

// 消息通知接口
export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  duration?: number; // 显示时长（毫秒），0表示不自动消失
  onClick?: () => void;
}

// SSE连接管理器
class SSEManager {
  private eventSource: EventSource | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  private reconnectInterval = 3000; // 3秒
  private isManuallyDisconnected = false;
  private currentToken: string | null = null; // 保存当前token用于重连
  private listeners: Map<SSEEventType, Set<(data: any) => void>> = new Map();
  private notificationCallbacks: Set<(notification: NotificationMessage) => void> = new Set();
  private recentEvents: Set<string> = new Set(); // 用于去重的最近事件集合

  constructor() {
    // 绑定方法上下文
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
  }

  // 获取SSE连接URL - 直连模式
  private getSSEUrl(token: string): string {
    // 优先使用完整URL配置
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
      const sseUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sse/connect?token=${encodeURIComponent(token)}`;
      console.log('📡 使用完整URL SSE:', sseUrl.substring(0, 80) + '...');
      return sseUrl;
    }
    
    // 兜底使用主机+端口配置
    const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost';
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '35001';
    
    const sseUrl = `http://${backendHost}:${backendPort}/api/sse/connect?token=${encodeURIComponent(token)}`;
    console.log('📡 使用主机+端口SSE URL:', sseUrl.substring(0, 80) + '...');
    return sseUrl;
  }

  // 连接到SSE服务
  connect(token: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // 检查是否启用SSE功能
      const config = configManager.getConfig();
      if (!config.features.enableSSE) {
        console.log('SSE功能已禁用，跳过连接');
        resolve(false);
        return;
      }

      if (this.eventSource) {
        console.log('SSE连接已存在，先关闭现有连接');
        this.disconnect();
      }

      console.log('正在建立SSE连接...');
      this.isManuallyDisconnected = false;
      this.currentToken = token; // 保存token用于重连

      try {
        // 创建EventSource连接，将token作为查询参数传递
        const sseUrl = this.getSSEUrl(token);
        console.log(`SSE连接URL: ${sseUrl}`);
        this.eventSource = new EventSource(sseUrl);

        // 设置事件监听器
        this.eventSource.onopen = (event) => {
          this.handleOpen(event);
          resolve(true);
        };

        this.eventSource.onerror = (event) => {
          this.handleError(event);
          if (this.reconnectAttempts === 0) {
            reject(new Error('SSE连接失败'));
          }
        };

        // 监听所有SSE事件类型
        const eventTypes: SSEEventType[] = [
          'connected', 'heartbeat', 'project-created', 'project-updated', 
          'project-deleted', 'project-status-changed',
          'project-restored', 'project-soft-deleted', 'project-moved-to-past',
          'project-restored-from-past', 'projects-batch-restored',
          'projects-batch-soft-deleted', 'projects-batch-destroyed',
          'material-status-changed', 'material-batch-status-changed', 'test'
        ];

        eventTypes.forEach(eventType => {
          this.eventSource?.addEventListener(eventType, (event) => {
            this.handleMessage(event as MessageEvent, eventType);
          });
        });

        // 使用配置中的API超时设置
        setTimeout(() => {
          if (this.eventSource?.readyState !== EventSource.OPEN) {
            this.eventSource?.close();
            reject(new Error('SSE连接超时'));
          }
        }, config.apiTimeout || 10000);

      } catch (error) {
        console.error('创建SSE连接失败:', error);
        reject(error);
      }
    });
  }

  // 断开SSE连接
  disconnect() {
    console.log('正在断开SSE连接...');
    this.isManuallyDisconnected = true;
    this.currentToken = null; // 清空保存的token
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.reconnectAttempts = 0;
    console.log('SSE连接已断开');
  }

  // 处理连接打开
  private handleOpen(event: Event) {
    console.log('✅ SSE连接建立成功');
    this.reconnectAttempts = 0;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // 处理接收到的消息
  private handleMessage(event: MessageEvent, eventType: SSEEventType) {
    try {
      const eventData: SSEEventData = JSON.parse(event.data);
      console.log('📨 收到SSE事件:', eventType, eventData);

      // 生成事件唯一标识符用于去重（使用事件类型+时间戳+数据的关键字段）
      let eventId: string;
      if (eventType === 'project-status-changed') {
        if (eventData.data.projectId) {
          eventId = `${eventType}-${eventData.data.projectId}-${eventData.timestamp}`;
        } else if (eventData.data.project?.id) {
          eventId = `${eventType}-${eventData.data.project.id}-${eventData.timestamp}`;
        } else {
          eventId = `${eventType}-${eventData.timestamp}`;
        }
      } else if (eventType === 'project-created' && eventData.data.project) {
        eventId = `${eventType}-${eventData.data.project.id}-${eventData.timestamp}`;
      } else if (eventType === 'project-deleted') {
        eventId = `${eventType}-${eventData.data.projectId}-${eventData.timestamp}`;
      } else {
        eventId = `${eventType}-${eventData.timestamp}`;
      }
      
      console.log('🔍 事件ID:', eventId);
      
      if (this.recentEvents.has(eventId)) {
        console.log('⚠️ 检测到重复事件，跳过处理:', eventId);
        return;
      }

      // 将事件添加到最近事件集合，并设置过期清理
      this.recentEvents.add(eventId);
      setTimeout(() => {
        this.recentEvents.delete(eventId);
        console.log('🧹 清理事件ID:', eventId);
      }, 5000); // 5秒后清理，防止短时间内的重复事件

      // 触发对应类型的监听器
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(eventData.data);
          } catch (error) {
            console.error(`SSE事件监听器执行失败 (${eventType}):`, error);
          }
        });
      }

      // 处理项目相关事件的通知（板材事件不显示通知）
      if (eventType.startsWith('project-')) {
        this.handleProjectNotification(eventType, eventData.data);
      }

    } catch (error) {
      console.error('解析SSE消息失败:', error, event.data);
    }
  }

  // 处理项目通知
  private handleProjectNotification(eventType: SSEEventType, data: any) {
    console.log('🔔 处理项目通知:', { eventType, data });
    
    let notification: NotificationMessage | null = null;
    const timestamp = Date.now();

    switch (eventType) {
      case 'project-created':
        notification = {
          id: `project-created-${data.project?.id}-${timestamp}`,
          type: 'info',
          title: '新项目创建',
          message: `${data.userName || '某用户'} 创建了项目 "${data.project?.name || '未知项目'}"`,
          timestamp: new Date().toISOString(),
          duration: 5000
        };
        break;

      case 'project-status-changed':
        const statusText = this.getStatusText(data.newStatus);
        const reasonText = data.reason ? ` (${data.reason})` : '';
        const materialInfo = data.materialChanged 
          ? ` - ${data.materialChanged.thicknessSpec} 从${this.getStatusText(data.materialChanged.oldStatus)}改为${this.getStatusText(data.materialChanged.newStatus)}`
          : '';
        
        // 从项目对象或直接字段获取项目名称
        const projectName = data.project?.name || data.projectName || '未知项目';
        console.log('🏷️ 项目状态变更通知 - 获取项目名称:', {
          projectName,
          fromProject: data.project?.name,
          fromDirect: data.projectName,
          fullData: data
        });
        
        notification = {
          id: `project-status-${data.projectId}-${timestamp}`,
          type: data.newStatus === 'completed' ? 'success' : 'info',
          title: '项目状态自动更新',
          message: `项目 "${projectName}" 状态从${this.getStatusText(data.oldStatus)}改为${statusText}${reasonText}${materialInfo}`,
          timestamp: new Date().toISOString(),
          duration: 6000 // 增加显示时间，因为信息更详细
        };
        break;

      case 'project-deleted':
        const drawingText = data.deletedDrawingsCount && data.deletedDrawingsCount > 0
          ? ` (同时删除了 ${data.deletedDrawingsCount} 个图纸)`
          : '';
        
        // 从项目对象或直接字段获取项目名称
        const deletedProjectName = data.project?.name || data.projectName || '未知项目';
        
        notification = {
          id: `project-deleted-${data.projectId}-${timestamp}`,
          type: 'warning',
          title: '项目已删除',
          message: `${data.userName || '某用户'} 删除了项目 "${deletedProjectName}"${drawingText}`,
          timestamp: new Date().toISOString(),
          duration: 8000 // 增加显示时间，因为信息更丰富
        };
        break;
    }

    if (notification) {
      console.log('🔔 生成通知:', notification.id);
      this.showNotification(notification);
    }
  }

  // 显示通知
  private showNotification(notification: NotificationMessage) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('通知回调执行失败:', error);
      }
    });
  }

  // 获取状态文本
  private getStatusText(status: string): string {
    switch (status) {
      case 'pending': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  }

  // 处理连接错误
  private handleError(event: Event) {
    console.error('SSE连接错误:', event);

    // 如果是手动断开，不进行重连
    if (this.isManuallyDisconnected) {
      return;
    }

    // 达到最大重连次数
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('SSE重连失败，已达到最大重连次数');
      return;
    }

    // 开始重连
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * this.reconnectAttempts;
    
    console.log(`SSE连接断开，${delay}ms后进行第${this.reconnectAttempts}次重连...`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isManuallyDisconnected && this.currentToken) {
        console.log(`尝试重连SSE，使用保存的token...`);
        this.connect(this.currentToken).catch(error => {
          console.error('SSE重连失败:', error);
        });
      }
    }, delay);
  }

  // 添加事件监听器
  addEventListener(eventType: SSEEventType, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  // 移除事件监听器
  removeEventListener(eventType: SSEEventType, callback: (data: any) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  // 添加通知回调
  addNotificationCallback(callback: (notification: NotificationMessage) => void) {
    this.notificationCallbacks.add(callback);
  }

  // 移除通知回调
  removeNotificationCallback(callback: (notification: NotificationMessage) => void) {
    this.notificationCallbacks.delete(callback);
  }

  // 获取连接状态
  getConnectionState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }

  // 检查是否已连接
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// 创建全局SSE管理器实例
export const sseManager = new SSEManager();
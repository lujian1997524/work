import { useAuth } from '@/contexts/AuthContext';
import { configManager } from './configManager';

// 生成设备唯一标识符
const generateDeviceId = (): string => {
  // 尝试从localStorage获取已存在的设备ID
  if (typeof window !== 'undefined') {
    const existingDeviceId = localStorage.getItem('device_id');
    if (existingDeviceId) {
      return existingDeviceId;
    }
  }

  // 生成新的设备ID
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const userAgent = typeof window !== 'undefined' ? navigator.userAgent : 'unknown';
  const userAgentHash = simpleHash(userAgent);
  
  const deviceId = `device_${userAgentHash}_${timestamp}_${random}`;
  
  // 保存到localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('device_id', deviceId);
      localStorage.setItem('device_created_at', new Date().toISOString());
      console.log('🏷️ 生成新设备ID:', deviceId);
    } catch (error) {
      console.warn('无法保存设备ID到localStorage:', error);
    }
  }
  
  return deviceId;
};

// 简单哈希函数
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转为32位整数
  }
  return Math.abs(hash).toString(36).substring(0, 8);
};

// 获取设备信息
const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'server_unknown',
      userAgent: 'Server',
      platform: 'Server',
      deviceType: 'unknown'
    };
  }

  const deviceId = generateDeviceId();
  const userAgent = navigator.userAgent;
  const platform = navigator.platform || 'Unknown';
  
  // 简单的设备类型检测
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/.test(userAgent)) {
    deviceType = 'tablet';
  }

  return {
    deviceId,
    userAgent,
    platform,
    deviceType
  };
};

// SSE事件类型
export type SSEEventType = 
  | 'connected'
  | 'heartbeat'
  // 项目相关事件
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
  | 'projects-reordered'
  | 'project-worker-assigned'
  | 'project-worker-reassigned'
  // 队列相关事件
  | 'queue-reorder'
  // 材料相关事件
  | 'material-status-changed'
  | 'material-batch-status-changed'
  | 'material-allocated'
  | 'material-started'
  | 'material-completed'
  | 'material-recycled'
  | 'material-transferred'
  | 'material-stock-added'
  | 'material-stock-warning'
  | 'material-dimension-added'
  // 图纸相关事件
  | 'drawing-uploaded'
  | 'drawing-deleted'
  | 'drawing-version-updated'
  | 'drawing-moved'
  | 'drawing-linked'
  | 'drawing-unlinked'
  | 'dxf-parsed'
  | 'drawing-batch-uploaded'
  | 'drawing-batch-deleted'
  // 工人相关事件
  | 'worker-added'
  | 'worker-updated'
  | 'worker-deleted'
  | 'worker-department-changed'
  | 'worker-overloaded'
  | 'worker-available'
  | 'workload-balanced'
  | 'worker-skill-added'
  | 'worker-permission-updated'
  // 协作相关事件
  | 'collaboration-invited'
  | 'task-assigned'
  | 'message-received'
  | 'sync-updated'
  | 'assignment-changed'
  // 系统相关事件
  | 'system-maintenance'
  | 'backup-completed'
  | 'connection-lost'
  | 'connection-restored'
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
  private localOperations: Map<string, number> = new Map(); // 跟踪本地操作，时间戳作为值
  
  // 新增：设备和连接信息
  private deviceInfo: ReturnType<typeof getDeviceInfo>;
  private connectionId: string | null = null;
  private serverDeviceId: string | null = null; // 服务器确认的设备ID

  constructor() {
    // 绑定方法上下文
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    
    // 初始化设备信息
    this.deviceInfo = getDeviceInfo();
    console.log('🏷️ SSE管理器设备信息:', this.deviceInfo);
  }

  // 获取当前设备信息
  getDeviceInfo() {
    return this.deviceInfo;
  }

  // 获取连接信息
  getConnectionInfo() {
    return {
      connectionId: this.connectionId,
      deviceId: this.serverDeviceId || this.deviceInfo.deviceId,
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // 获取SSE连接URL - 直连模式，支持设备ID
  private getSSEUrl(token: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.gei5.com';
    const deviceId = this.deviceInfo.deviceId;
    
    // 构建包含设备ID的SSE URL
    const sseUrl = `${baseUrl}/api/sse/connect?token=${encodeURIComponent(token)}&deviceId=${encodeURIComponent(deviceId)}`;
    console.log('🔗 SSE连接URL:', sseUrl.replace(token, token.substring(0, 20) + '...'));
    
    return sseUrl;
  }

  // 连接到SSE服务
  connect(token: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // 检查是否启用SSE功能
      const config = configManager.getConfig();
      if (!config.features.enableSSE) {
        resolve(false);
        return;
      }

      if (this.eventSource) {
        this.disconnect();
      }

      this.isManuallyDisconnected = false;
      this.currentToken = token; // 保存token用于重连

      try {
        // 创建EventSource连接，将token作为查询参数传递
        const sseUrl = this.getSSEUrl(token);
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
          'projects-reordered', 'queue-reorder', 'material-status-changed', 'material-batch-status-changed', 'test'
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
        reject(error);
      }
    });
  }

  // 断开SSE连接
  disconnect() {
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
  }

  // 处理连接打开
  private handleOpen(event: Event) {
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

      // 处理连接确认消息，保存服务器返回的连接信息
      if (eventType === 'connected') {
        this.connectionId = eventData.data.connectionId || null;
        this.serverDeviceId = eventData.data.deviceId || null;
        console.log('🔗 SSE连接已确认:', {
          connectionId: this.connectionId,
          serverDeviceId: this.serverDeviceId,
          clientDeviceId: this.deviceInfo.deviceId
        });
      }

      // 处理心跳消息，更新连接信息
      if (eventType === 'heartbeat') {
        if (eventData.data.connectionId) {
          this.connectionId = eventData.data.connectionId;
        }
        if (eventData.data.deviceId) {
          this.serverDeviceId = eventData.data.deviceId;
        }
        // 心跳不需要进一步处理
        return;
      }

      // 生成事件唯一标识符用于去重（使用事件类型+时间戳+数据的关键字段）
      let eventId: string;
      if (eventType === 'project-status-changed') {
        const projectId = eventData.data.projectId || eventData.data.project?.id || 'unknown';
        // 包含状态变更信息避免同一项目的不同状态变更被误判为重复
        eventId = `${eventType}-${projectId}-${eventData.data.oldStatus}-${eventData.data.newStatus}-${eventData.timestamp}`;
      } else if (eventType === 'project-created' && eventData.data.project) {
        eventId = `${eventType}-${eventData.data.project.id}-${eventData.timestamp}`;
      } else if (eventType === 'project-deleted') {
        eventId = `${eventType}-${eventData.data.projectId}-${eventData.timestamp}`;
      } else if (eventType === 'material-status-changed') {
        const materialId = eventData.data.material?.id || eventData.data.materialId || 'unknown';
        eventId = `${eventType}-${materialId}-${eventData.timestamp}`;
      } else {
        eventId = `${eventType}-${eventData.timestamp}`;
      }
      
      if (this.recentEvents.has(eventId)) {
        console.log('⏭️ 跳过重复事件:', eventId);
        return;
      }

      // 将事件添加到最近事件集合，并设置过期清理
      this.recentEvents.add(eventId);
      setTimeout(() => {
        this.recentEvents.delete(eventId);
      }, 5000); // 5秒后清理，防止短时间内的重复事件

      // 触发对应类型的监听器
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(eventData.data);
          } catch (error) {
            console.error('SSE事件监听器执行错误:', error);
          }
        });
      }

      // 处理通知消息（根据事件类型分发）
      this.handleEventNotification(eventType, eventData.data);

    } catch (error) {
      console.error('处理SSE消息失败:', error, event.data);
    }
  }

  // 处理事件通知（统一通知处理）
  private handleEventNotification(eventType: SSEEventType, data: any) {
    let notification: NotificationMessage | null = null;
    const timestamp = Date.now();

    switch (eventType) {
      // 项目相关事件 - 智能去重处理
      case 'project-created':
        // 只有非本地操作才显示Toast通知
        if (!this.isLocalOperation(eventType, data)) {
          notification = {
            id: `project-created-${data.project?.id || 'unknown'}-${timestamp}`,
            type: 'success',
            title: '项目创建成功',
            message: `项目 "${String(data.project?.name || '未知项目')}" 已创建${data.project?.assignedWorker?.name ? `，负责人：${String(data.project.assignedWorker.name)}` : ''}`,
            timestamp: new Date().toISOString(),
            duration: 4000
          };
        }
        break;

      case 'project-status-changed':
        if (!this.isLocalOperation(eventType, data)) {
          const statusText = this.getStatusText(data.newStatus || data.project?.status || '');
          notification = {
            id: `project-status-changed-${data.projectId || data.project?.id}-${timestamp}`,
            type: 'info',
            title: '项目状态更新',
            message: `项目 "${String(data.project?.name || '未知项目')}" 状态更新为：${statusText}`,
            timestamp: new Date().toISOString(),
            duration: 4000
          };
        }
        break;

      case 'project-deleted':
        if (!this.isLocalOperation(eventType, data)) {
          notification = {
            id: `project-deleted-${data.projectId}-${timestamp}`,
            type: 'warning',
            title: '项目删除成功',
            message: `项目 "${String(data.projectName || '未知项目')}" 已删除`,
            timestamp: new Date().toISOString(),
            duration: 4000
          };
        }
        break;

      case 'project-worker-assigned':
      case 'project-worker-reassigned':
        if (!this.isLocalOperation(eventType, data)) {
          const actionText = eventType === 'project-worker-assigned' ? '分配' : '重新分配';
          notification = {
            id: `${eventType}-${data.projectId}-${timestamp}`,
            type: 'info',
            title: `工人${actionText}成功`,
            message: `项目 "${String(data.projectName || '未知项目')}" 已${actionText}给 ${String(data.workerName || '某工人')}`,
            timestamp: new Date().toISOString(),
            duration: 4000
          };
        }
        break;

      // 材料相关事件
      case 'material-allocated':
        notification = {
          id: `material-allocated-${data.materialId}-${timestamp}`,
          type: 'info',
          title: '材料分配成功',
          message: `${String(data.materialType || '材料')} ${data.quantity || 0}张已分配至项目 "${String(data.projectName || '未知项目')}"`,
          timestamp: new Date().toISOString(),
          duration: 4000
        };
        break;

      case 'material-completed':
        notification = {
          id: `material-completed-${data.materialId}-${timestamp}`,
          type: 'success',
          title: '材料加工完成',
          message: `${String(data.workerName || '某工人')} 完成了 ${String(data.materialType || '材料')} 加工`,
          timestamp: new Date().toISOString(),
          duration: 4000
        };
        break;

      case 'material-stock-warning':
        notification = {
          id: `material-stock-warning-${data.materialId}-${timestamp}`,
          type: 'warning',
          title: '库存不足警告',
          message: `${String(data.workerName || '某工人')} 的 ${String(data.materialType || '材料')} 库存不足：当前${data.currentStock || 0}张，需要${data.required || 0}张`,
          timestamp: new Date().toISOString(),
          duration: 6000
        };
        break;

      // 图纸相关事件
      case 'drawing-uploaded':
        notification = {
          id: `drawing-uploaded-${data.drawingId}-${timestamp}`,
          type: 'success',
          title: '图纸上传成功',
          message: `图纸 "${String(data.filename || '未知文件')}" 已上传${data.projectName ? `至项目 "${String(data.projectName)}"` : ''}`,
          timestamp: new Date().toISOString(),
          duration: 4000
        };
        break;

      case 'drawing-deleted':
        notification = {
          id: `drawing-deleted-${data.drawingId}-${timestamp}`,
          type: 'warning',
          title: '图纸删除成功',
          message: `图纸 "${String(data.filename || '未知文件')}" 已删除`,
          timestamp: new Date().toISOString(),
          duration: 4000
        };
        break;

      case 'dxf-parsed':
        notification = {
          id: `dxf-parsed-${data.drawingId}-${timestamp}`,
          type: 'success',
          title: 'DXF解析完成',
          message: `DXF文件 "${String(data.filename || '未知文件')}" 解析完成：${String(data.details || '')}`,
          timestamp: new Date().toISOString(),
          duration: 4000
        };
        break;

      case 'drawing-batch-uploaded':
        notification = {
          id: `drawing-batch-uploaded-${timestamp}`,
          type: 'success',
          title: '批量上传完成',
          message: `成功上传 ${data.successCount || 0} 个图纸，共 ${data.totalCount || 0} 个文件`,
          timestamp: new Date().toISOString(),
          duration: 5000
        };
        break;

      // 工人相关事件
      case 'worker-added':
        notification = {
          id: `worker-added-${data.workerId}-${timestamp}`,
          type: 'success',
          title: '工人添加成功',
          message: `工人 "${String(data.workerName || '未知')}" 已添加到 ${String(data.department || '未知部门')}`,
          timestamp: new Date().toISOString(),
          duration: 4000
        };
        break;

      case 'worker-overloaded':
        notification = {
          id: `worker-overloaded-${data.workerId}-${timestamp}`,
          type: 'warning',
          title: '工人任务过载',
          message: `${String(data.workerName || '某工人')} 当前有 ${data.projectCount || 0} 个项目，建议重新分配任务`,
          timestamp: new Date().toISOString(),
          duration: 5000
        };
        break;

      case 'workload-balanced':
        notification = {
          id: `workload-balanced-${timestamp}`,
          type: 'success',
          title: '负载平衡完成',
          message: '团队工作负载已平衡，所有工人任务分配合理',
          timestamp: new Date().toISOString(),
          duration: 4000
        };
        break;

      // 协作相关事件
      case 'collaboration-invited':
        notification = {
          id: `collaboration-invited-${data.projectId}-${timestamp}`,
          type: 'info',
          title: '协作邀请',
          message: `邀请 ${String(data.workerName || '某工人')} 参与项目 "${String(data.projectName || '未知项目')}" 协作`,
          timestamp: new Date().toISOString(),
          duration: 4000
        };
        break;

      case 'task-assigned':
        notification = {
          id: `task-assigned-${data.taskId}-${timestamp}`,
          type: 'info',
          title: '任务分配',
          message: `任务 "${String(data.taskName || '未知任务')}" 已分配给 ${String(data.workerName || '某工人')}`,
          timestamp: new Date().toISOString(),
          duration: 4000
        };
        break;

      // 系统相关事件
      case 'connection-restored':
        notification = {
          id: `connection-restored-${timestamp}`,
          type: 'success',
          title: '连接已恢复',
          message: '实时同步连接已恢复',
          timestamp: new Date().toISOString(),
          duration: 3000
        };
        break;

      case 'backup-completed':
        notification = {
          id: `backup-completed-${timestamp}`,
          type: 'success',
          title: '数据备份完成',
          message: '系统数据备份已完成',
          timestamp: new Date().toISOString(),
          duration: 4000
        };
        break;

      // 材料相关事件
      case 'material-status-changed': 
        // 智能去重：只有非本地操作才显示Toast通知
        if (!this.isLocalOperation(eventType, data)) {
          const statusText = this.getStatusText(data.newStatus || '');
          notification = {
            id: `material-status-changed-${data.material?.id || 'unknown'}-${timestamp}`,
            type: 'info',
            title: '材料状态更新',
            message: `${String(data.material?.thicknessSpec?.thickness || '')}${String(data.material?.thicknessSpec?.unit || 'mm')} ${String(data.material?.thicknessSpec?.materialType || '材料')} 状态更新为：${statusText}`,
            timestamp: new Date().toISOString(),
            duration: 3000
          };
        }
        break;
        
      // 其他不需要显示通知的事件可以在这里过滤
      case 'heartbeat':
      case 'connected':
        return; // 不显示通知

      default:
        // 对于未处理的事件类型，可以显示通用通知
        if (data.message) {
          notification = {
            id: `generic-${eventType}-${timestamp}`,
            type: 'info',
            title: '系统通知',
            message: data.message,
            timestamp: new Date().toISOString(),
            duration: 4000
          };
        }
        break;
    }

    if (notification) {
      this.showNotification(notification);
    }
  }

  // 显示通知
  private showNotification(notification: NotificationMessage) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
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

  // 记录本地操作，用于智能去重 - 增强版本
  markLocalOperation(eventType: SSEEventType, entityId: string | number, additionalInfo?: any): void {
    const deviceId = this.serverDeviceId || this.deviceInfo.deviceId;
    const connectionId = this.connectionId || 'unknown';
    
    // 创建更精确的操作标识
    const operationKey = `${eventType}-${entityId}-${deviceId}`;
    const operationInfo = {
      timestamp: Date.now(),
      deviceId,
      connectionId,
      eventType,
      entityId,
      ...additionalInfo
    };
    
    this.localOperations.set(operationKey, operationInfo.timestamp);
    
    console.log('🏷️ 标记本地操作:', {
      key: operationKey,
      info: operationInfo
    });
    
    // 5秒后清理记录
    setTimeout(() => {
      this.localOperations.delete(operationKey);
    }, 5000);
  }

  // 检查是否为本地操作（避免重复通知） - 增强版本
  private isLocalOperation(eventType: SSEEventType, data: any): boolean {
    let entityId: string | number = 'unknown';
    
    // 根据事件类型提取实体ID
    switch (eventType) {
      case 'project-created':
      case 'project-updated':
      case 'project-status-changed':
        entityId = data.project?.id || data.projectId || 'unknown';
        break;
      case 'project-deleted':
        entityId = data.projectId || 'unknown';
        break;
      case 'material-status-changed':
        entityId = data.material?.id || data.materialId || 'unknown';
        break;
      default:
        // 对于其他事件类型，不进行本地操作检查
        return false;
    }
    
    const deviceId = this.serverDeviceId || this.deviceInfo.deviceId;
    const operationKey = `${eventType}-${entityId}-${deviceId}`;
    const localOpTime = this.localOperations.get(operationKey);
    
    if (localOpTime) {
      const timeDiff = Date.now() - localOpTime;
      // 如果在5秒内有本地操作，则认为是本地操作触发的SSE事件
      const isLocal = timeDiff < 5000;
      
      if (isLocal) {
        console.log('⏭️ 检测到本地操作触发的事件:', {
          operationKey,
          timeDiff: `${timeDiff}ms`,
          deviceId: deviceId
        });
      }
      
      return isLocal;
    }
    
    return false;
  }

  // 处理连接错误 - 增强版本
  private handleError(_event: Event) {
    console.warn('🔴 SSE连接发生错误:', {
      deviceId: this.serverDeviceId || this.deviceInfo.deviceId,
      connectionId: this.connectionId,
      reconnectAttempts: this.reconnectAttempts,
      isManuallyDisconnected: this.isManuallyDisconnected
    });

    // 如果是手动断开，不进行重连
    if (this.isManuallyDisconnected) {
      return;
    }

    // 达到最大重连次数
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚫 SSE重连次数已达上限，停止重连:', {
        maxAttempts: this.maxReconnectAttempts,
        deviceId: this.serverDeviceId || this.deviceInfo.deviceId
      });
      
      // 发送连接丢失通知
      this.showNotification({
        id: `connection-lost-${Date.now()}`,
        type: 'error',
        title: '连接已断开',
        message: '实时同步连接已断开，请刷新页面重新连接',
        timestamp: new Date().toISOString(),
        duration: 0 // 不自动消失
      });
      
      return;
    }

    // 开始重连
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000); // 指数退避，最大30秒
    
    console.log('🔄 开始SSE重连:', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay: `${delay}ms`,
      deviceId: this.serverDeviceId || this.deviceInfo.deviceId
    });
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isManuallyDisconnected && this.currentToken) {
        this.connect(this.currentToken).catch(error => {
          console.error('🔴 SSE重连失败:', error);
        });
      }
    }, delay);
  }

  // 获取连接健康状态
  getHealthStatus() {
    const now = Date.now();
    const isConnected = this.isConnected();
    
    return {
      isConnected,
      isHealthy: isConnected && this.reconnectAttempts === 0,
      deviceId: this.serverDeviceId || this.deviceInfo.deviceId,
      connectionId: this.connectionId,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      connectionState: this.getConnectionState(),
      lastReconnectTime: this.reconnectAttempts > 0 ? new Date().toISOString() : null
    };
  }

  // 强制重连
  forceReconnect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.currentToken) {
        reject(new Error('没有保存的令牌，无法重连'));
        return;
      }

      console.log('🔄 用户强制重连SSE...');
      this.disconnect();
      this.reconnectAttempts = 0; // 重置重连次数
      
      setTimeout(() => {
        this.connect(this.currentToken!)
          .then(resolve)
          .catch(reject);
      }, 1000);
    });
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
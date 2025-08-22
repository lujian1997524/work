import { useAuth } from '@/contexts/AuthContext';
import { configManager } from './configManager';

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
      return sseUrl;
    }
    
    // 兜底使用生产服务器配置
    const sseUrl = `https://api.gei5.com/api/sse/connect?token=${encodeURIComponent(token)}`;
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
          'projects-reordered', 'material-status-changed', 'material-batch-status-changed', 'test'
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
      
      if (this.recentEvents.has(eventId)) {
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
          }
        });
      }

      // 处理通知消息（根据事件类型分发）
      this.handleEventNotification(eventType, eventData.data);

    } catch (error) {
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

  // 记录本地操作，用于智能去重
  markLocalOperation(eventType: SSEEventType, entityId: string | number): void {
    const key = `${eventType}-${entityId}`;
    this.localOperations.set(key, Date.now());
    
    // 5秒后清理记录
    setTimeout(() => {
      this.localOperations.delete(key);
    }, 5000);
  }

  // 检查是否为本地操作（避免重复通知）
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
    
    const key = `${eventType}-${entityId}`;
    const localOpTime = this.localOperations.get(key);
    
    if (localOpTime) {
      const timeDiff = Date.now() - localOpTime;
      // 如果在3秒内有本地操作，则认为是本地操作触发的SSE事件
      return timeDiff < 3000;
    }
    
    return false;
  }

  // 处理连接错误
  private handleError(_event: Event) {
    // 如果是手动断开，不进行重连
    if (this.isManuallyDisconnected) {
      return;
    }

    // 达到最大重连次数
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    // 开始重连
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * this.reconnectAttempts;
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isManuallyDisconnected && this.currentToken) {
        this.connect(this.currentToken).catch(_error => {
          // 重连失败，忽略错误
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
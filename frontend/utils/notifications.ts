/**
 * 通知管理器 - 用于显示操作反馈
 */

export interface NotificationOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export function showNotification(options: NotificationOptions): void {
  const { type, title, message, duration = 4000 } = options;
  
  // 如果在浏览器环境，使用HTML5通知或自定义通知组件
  if (typeof window !== 'undefined') {
    // 优先使用系统通知
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: getNotificationIcon(type)
      });
    } else if (Notification.permission !== 'denied') {
      // 请求通知权限
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body: message,
            icon: getNotificationIcon(type)
          });
        } else {
          // 降级到控制台输出和自定义通知
          fallbackNotification(options);
        }
      });
    } else {
      // 降级到控制台输出和自定义通知
      fallbackNotification(options);
    }
  }
}

function getNotificationIcon(type: NotificationOptions['type']): string {
  const baseUrl = window.location.origin;
  switch (type) {
    case 'success':
      return `${baseUrl}/icons/success.png`;
    case 'error':
      return `${baseUrl}/icons/error.png`;
    case 'warning':
      return `${baseUrl}/icons/warning.png`;
    case 'info':
    default:
      return `${baseUrl}/icons/info.png`;
  }
}

function fallbackNotification(options: NotificationOptions): void {
  const { type, title, message } = options;
  
  // 控制台输出
  const emoji = getConsoleEmoji(type);
  console.log(`${emoji} ${title}: ${message}`);
  
  // 如果有自定义通知系统，可以在这里调用
  // 例如：window.dispatchEvent(new CustomEvent('show-notification', { detail: options }));
  
  // 临时使用alert作为最后的降级方案（仅用于重要通知）
  if (type === 'error') {
    alert(`${title}\n${message}`);
  }
}

function getConsoleEmoji(type: NotificationOptions['type']): string {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
    default:
      return 'ℹ️';
  }
}
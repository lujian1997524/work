'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '@/stores/notificationStore';
import type { NotificationMessage } from '@/utils/sseManager';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

// 内置图标映射
const iconMap = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon
};

// 样式映射（采用设计系统Notification组件风格）
const styleMap = {
  success: {
    icon: 'text-green-500',
    bg: 'bg-green-50 border-green-200',
    title: 'text-green-800',
    message: 'text-green-700',
    borderColor: 'border-l-green-500',
    progressBg: 'bg-green-400'
  },
  error: {
    icon: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
    title: 'text-red-800',
    message: 'text-red-700',
    borderColor: 'border-l-red-500',
    progressBg: 'bg-red-400'
  },
  warning: {
    icon: 'text-yellow-500',
    bg: 'bg-yellow-50 border-yellow-200',
    title: 'text-yellow-800',
    message: 'text-yellow-700',
    borderColor: 'border-l-yellow-500',
    progressBg: 'bg-yellow-400'
  },
  info: {
    icon: 'text-blue-500',
    bg: 'bg-blue-50 border-blue-200',
    title: 'text-blue-800',
    message: 'text-blue-700',
    borderColor: 'border-l-blue-500',
    progressBg: 'bg-blue-400'
  }
};

// 单个通知项组件
const NotificationItem = ({ 
  notification, 
  onClose, 
  onClick 
}: { 
  notification: NotificationMessage;
  onClose: () => void;
  onClick?: () => void;
}) => {
  const [isVisible, setIsVisible] = React.useState(true);
  
  const styles = styleMap[notification.type];
  const IconComponent = iconMap[notification.type];

  const handleClick = () => {
    if (notification.onClick) {
      notification.onClick();
    } else if (onClick) {
      onClick();
    }
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300); // 等待动画完成
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 400, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 400, scale: 0.8 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        mass: 0.8 
      }}
      className={`
        relative w-full max-w-sm
        ${styles.bg}
        border-l-4 ${styles.borderColor}
        backdrop-blur-lg
        rounded-ios-lg shadow-lg
        p-4 mb-3
        cursor-pointer
        hover:shadow-xl
        transition-all duration-200
      `}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        {/* 图标 */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm ${styles.title} mb-1`}>
            {notification.title}
          </div>
          <div className={`text-sm ${styles.message} leading-relaxed`}>
            {notification.message}
          </div>
          <div className="text-text-tertiary text-xs mt-2">
            {new Date(notification.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className={`
            flex-shrink-0 p-1 rounded-full
            ${styles.icon} hover:bg-black/10
            transition-colors duration-200
          `}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      
      {/* 进度条（如果有持续时间）*/}
      {notification.duration && notification.duration > 0 && (
        <motion.div
          className={`
            absolute bottom-0 left-0 h-1 
            ${styles.progressBg}
            rounded-bl-ios-lg
          `}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ 
            duration: notification.duration / 1000,
            ease: "linear"
          }}
        />
      )}
    </motion.div>
  );
};

// 通知容器组件
export const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotificationStore();

  // 调试日志：监控通知数组变化
  React.useEffect(() => {
    console.log('📱 NotificationContainer - 通知列表更新:', notifications.map(n => ({
      id: n.id,
      title: n.title,
      timestamp: n.timestamp
    })));
  }, [notifications]);

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => {
          console.log('🗝️ 渲染通知key:', notification.id);
          return (
            <div key={notification.id} className="pointer-events-auto">
              <NotificationItem
                notification={notification}
                onClose={() => removeNotification(notification.id)}
              />
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// SSE连接状态指示器组件
export const SSEConnectionIndicator = () => {
  const { isSSEConnected } = useNotificationStore();

  if (isSSEConnected) {
    // 连接正常时不显示
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 left-6 z-50 pointer-events-none"
    >
      <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-500 backdrop-blur-lg rounded-ios-lg shadow-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-700 text-sm font-medium">
            实时同步已断开
          </span>
        </div>
      </div>
    </motion.div>
  );
};
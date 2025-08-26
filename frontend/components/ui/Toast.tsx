'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  PlayIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PlusIcon,
  CloudArrowUpIcon,
  // 新增智能Toast所需图标
  UserGroupIcon,
  ChartBarIcon,
  LightBulbIcon,
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  StarIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import { audioManager } from '@/utils/audioManager'

export interface ToastProps {
  id?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info' | 'project-created' | 'project-updated' | 'project-deleted' | 'material-changed' | 'file-uploaded' | 'sync-completed' | 'wancheng' | 
        // 真实业务场景类型
        'project-status-auto' | 'project-archived' | 'worker-reassigned' |
        'material-allocated' | 'material-started' | 'material-completed' | 'material-recycled' |
        'stock-added' | 'stock-warning' | 'dimension-added' | 'material-transferred' |
        'strategy-deviation' | 'strategy-warning' | 'strategy-balanced' |
        'file-uploading' | 'dxf-parsed' | 'common-part-tagged' | 'upload-error' |
        'version-updated' | 'version-conflict' | 'version-deprecated' |
        'drawing-linked' | 'drawing-unlinked' |
        'worker-updated' | 'worker-added' | 'worker-removed' |
        'worker-overloaded' | 'worker-available' | 'workload-balanced' |
        'collaboration-notify' | 'sync-updated' | 'collaboration-alert' | 'assignment-changed' |
        'sync-error' | 'connection-lost' | 'connection-restored' |
        'smart-suggestion' | 'pattern-insight' | 'skill-match' | 'timeline-insight' |
        'efficiency-insight' | 'performance-report' | 'bottleneck-detected' | 'workflow-optimization' |
        'batch-operation'
  duration?: number
  position?: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left' | 'top-center'
  showIcon?: boolean
  closable?: boolean
  onClose?: () => void
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }>
  progress?: number
  showProgress?: boolean
  persistent?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'filled' | 'outline' | 'glass'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  category?: 'project' | 'material' | 'drawing' | 'worker' | 'system' | 'collaboration'
  relatedId?: string
  metadata?: Record<string, any>
  showAvatar?: boolean
  avatarUrl?: string
  showTime?: boolean
  expandable?: boolean
  details?: string
  linkTo?: string
}

export interface ToastContextType {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, 'id'>) => string
  removeToast: (id: string) => void
  clearAllToasts: () => void
  updateToast: (id: string, updates: Partial<ToastProps>) => void
}

// 基于真实业务场景的图标映射
const getToastIcon = (type: ToastProps['type']) => {
  switch (type) {
    // 基础类型
    case 'success':
      return CheckCircleIcon
    case 'error':
      return XCircleIcon
    case 'warning':
      return ExclamationTriangleIcon
    case 'info':
      return InformationCircleIcon
    
    // 项目管理
    case 'project-created':
      return PlusIcon
    case 'project-updated':
      return ArrowPathIcon
    case 'project-deleted':
      return TrashIcon
    case 'project-status-auto':
      return CogIcon
    case 'project-archived':
      return DocumentDuplicateIcon
    case 'worker-reassigned':
      return UserGroupIcon
    
    // 材料管理（四状态循环）
    case 'material-changed':
    case 'material-allocated':
      return TruckIcon
    case 'material-started':
      return PlayIcon
    case 'material-completed':
    case 'wancheng':
      return CheckCircleIcon
    case 'material-recycled':
      return ArrowPathIcon
    case 'stock-added':
      return PlusIcon
    case 'stock-warning':
      return ExclamationTriangleIcon
    case 'dimension-added':
      return WrenchScrewdriverIcon
    case 'material-transferred':
      return TruckIcon
    case 'strategy-deviation':
    case 'strategy-warning':
      return ExclamationTriangleIcon
    case 'strategy-balanced':
      return CheckCircleIcon
    
    // 图纸管理
    case 'file-uploaded':
    case 'file-uploading':
      return CloudArrowUpIcon
    case 'dxf-parsed':
      return EyeIcon
    case 'common-part-tagged':
      return StarIcon
    case 'upload-error':
      return XCircleIcon
    case 'version-updated':
      return ArrowPathIcon
    case 'version-conflict':
      return ExclamationTriangleIcon
    case 'version-deprecated':
      return ClockIcon
    case 'drawing-linked':
    case 'drawing-unlinked':
      return DocumentDuplicateIcon
    
    // 工人管理
    case 'worker-updated':
    case 'worker-added':
      return UserGroupIcon
    case 'worker-removed':
      return TrashIcon
    case 'worker-overloaded':
      return ExclamationTriangleIcon
    case 'worker-available':
      return CheckCircleIcon
    case 'workload-balanced':
      return ChartBarIcon
    
    // 实时协作（SSE）
    case 'collaboration-notify':
    case 'sync-updated':
    case 'assignment-changed':
      return BellIcon
    case 'collaboration-alert':
      return ShieldCheckIcon
    case 'sync-completed':
      return CheckCircleIcon
    case 'sync-error':
      return XCircleIcon
    case 'connection-lost':
      return ExclamationTriangleIcon
    case 'connection-restored':
      return CheckCircleIcon
    
    // 智能辅助
    case 'smart-suggestion':
    case 'pattern-insight':
    case 'skill-match':
    case 'timeline-insight':
      return LightBulbIcon
    case 'efficiency-insight':
    case 'performance-report':
    case 'workflow-optimization':
      return ChartBarIcon
    case 'bottleneck-detected':
      return ExclamationTriangleIcon
    
    // 批量操作
    case 'batch-operation':
      return DocumentDuplicateIcon
    
    // 默认图标
    default:
      return InformationCircleIcon
  }
}

// 基于真实业务场景的样式映射
const getToastStyles = (type: ToastProps['type'], variant: ToastProps['variant'] = 'filled') => {
  const baseStyles = {
    'success': {
      filled: 'bg-green-500 text-white border-green-500',
      outline: 'bg-green-50 text-green-800 border-green-500 border',
      glass: 'bg-green-500/90 backdrop-blur-md text-white border-green-400/50 border'
    },
    'error': {
      filled: 'bg-red-500 text-white border-red-500',
      outline: 'bg-red-50 text-red-800 border-red-500 border',
      glass: 'bg-red-500/90 backdrop-blur-md text-white border-red-400/50 border'
    },
    'warning': {
      filled: 'bg-yellow-500 text-white border-yellow-500',
      outline: 'bg-yellow-50 text-yellow-800 border-yellow-500 border',
      glass: 'bg-yellow-500/90 backdrop-blur-md text-white border-yellow-400/50 border'
    },
    'info': {
      filled: 'bg-blue-500 text-white border-blue-500',
      outline: 'bg-blue-50 text-blue-800 border-blue-500 border',
      glass: 'bg-blue-500/90 backdrop-blur-md text-white border-blue-400/50 border'
    },
    'wancheng': {
      filled: 'bg-emerald-500 text-white border-emerald-500',
      outline: 'bg-emerald-50 text-emerald-800 border-emerald-500 border',
      glass: 'bg-emerald-500/90 backdrop-blur-md text-white border-emerald-400/50 border'
    }
  }

  if (!variant || !type || !(type in baseStyles)) {
    return baseStyles.info?.filled || 'bg-blue-500 text-white'
  }
  
  const typeStyles = baseStyles[type as keyof typeof baseStyles] || baseStyles.info
  return typeStyles?.[variant] || baseStyles.info?.[variant] || 'bg-blue-500 text-white'
}

// Toast 组件 - 简化版
export const Toast: React.FC<ToastProps & { onRemove: () => void }> = ({
  message,
  type = 'info',
  showIcon = true,
  closable = true,
  onRemove,
  actions = [],
  progress,
  showProgress = false,
  size = 'md',
  variant = 'filled',
  priority = 'normal',
  showAvatar = false,
  avatarUrl,
  showTime = false,
  expandable = false,
  details,
  linkTo
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const IconComponent = getToastIcon(type)
  const styles = getToastStyles(type, variant)

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm max-w-xs',
    md: 'px-4 py-3 text-base max-w-sm', 
    lg: 'px-5 py-4 text-lg max-w-md'
  }

  // 优先级样式
  const priorityStyles = {
    low: 'border-l-2 border-l-gray-400',
    normal: '',
    high: 'border-l-4 border-l-yellow-500 shadow-lg',
    urgent: 'border-l-4 border-l-red-500 shadow-xl ring-2 ring-red-200'
  }

  // 播放提示音
  useEffect(() => {
    const playSound = async () => {
      try {
        // 根据优先级选择音效
        let soundType = audioManager.getNotificationSound(type || 'info', '', message)
        if (priority === 'urgent') {
          soundType = 'error' // 紧急使用错误音效
        } else if (priority === 'high') {
          soundType = 'warning' // 高优先级使用警告音效
        }
        await audioManager.playNotificationSound(soundType)
      } catch (error) {
        // 静默处理音频错误
      }
    }
    playSound()
  }, [type, message, priority])

  const handleRemove = () => {
    setIsVisible(false)
    setTimeout(() => onRemove(), 300)
  }

  const handleClick = () => {
    if (linkTo) {
      window.location.href = linkTo
    }
  }

  const toggleExpand = () => {
    if (expandable) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <motion.div
      className={`
        ${styles} ${sizeClasses[size]} ${priorityStyles[priority!]}
        rounded-ios-xl shadow-ios-lg
        flex flex-col
        relative overflow-hidden
        ${linkTo ? 'cursor-pointer hover:shadow-xl' : ''}
        ${priority === 'urgent' ? 'animate-pulse' : ''}
      `}
      initial={{ opacity: 0, x: 400, scale: 0.8 }}
      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 400, scale: isVisible ? 1 : 0.8 }}
      exit={{ opacity: 0, x: 400, scale: 0.8 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        mass: 0.8 
      }}
      onClick={handleClick}
    >
      {/* 主内容区域 */}
      <div className="flex items-start space-x-3">
        {/* 头像或图标 */}
        {showAvatar && avatarUrl ? (
          <div className="flex-shrink-0 mt-0.5">
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className={`rounded-full ${size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'}`}
            />
          </div>
        ) : showIcon && IconComponent && (
          <span className="flex-shrink-0 mt-0.5">
            <IconComponent className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`} />
          </span>
        )}
        
        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className={`font-medium ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
              {message}
            </div>
            
            <div className="flex items-center space-x-1 ml-2">
              {/* 时间显示 */}
              {showTime && (
                <span className="text-xs opacity-70">
                  {new Date().toLocaleTimeString('zh-CN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
              
              {/* 展开按钮 */}
              {expandable && details && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpand()
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="w-3 h-3" />
                  ) : (
                    <ChevronDownIcon className="w-3 h-3" />
                  )}
                </button>
              )}
              
              {/* 关闭按钮 */}
              {closable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove()
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <XMarkIcon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
                </button>
              )}
            </div>
          </div>
          
          {/* 详情展开区域 */}
          <AnimatePresence>
            {expandable && isExpanded && details && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 text-sm opacity-90"
              >
                {details}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* 进度条 */}
          {showProgress && typeof progress === 'number' && (
            <div className="mt-2 w-full bg-white/20 rounded-full h-1.5">
              <motion.div 
                className="bg-white rounded-full h-1.5"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
          
          {/* 操作按钮 */}
          {actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    action.onClick()
                  }}
                  className={`
                    px-3 py-1 rounded text-xs font-medium transition-colors
                    ${action.variant === 'primary' 
                      ? 'bg-white/20 hover:bg-white/30 text-white' 
                      : 'bg-transparent hover:bg-white/10 text-white/80 border border-white/30'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// 简化的全局 Toast 函数（保留向后兼容）
export const toast = {
  success: (message: string, options?: Partial<ToastProps>) => {
    // Toast success message
  },
  error: (message: string, options?: Partial<ToastProps>) => {
    // Toast error message
  },
  warning: (message: string, options?: Partial<ToastProps>) => {
    // Toast warning message
  },
  info: (message: string, options?: Partial<ToastProps>) => {
    // Toast info message
  }
};

// 向后兼容的useToast Hook（已弃用，使用统一的通知系统）
export const useToast = () => {
  return {
    addToast: (options: { type: string; message: string; duration?: number }) => {
      // Deprecated useToast called
      // 可以选择重定向到统一通知系统
      // const notificationStore = useNotificationStore.getState();
      // notificationStore.addNotification({...});
    },
    // 添加其他旧Toast方法的兼容性
    projectCreated: (message: string) => {},
    materialAllocated: (message: string) => {},
    drawingUploaded: (message: string) => {},
    workerAdded: (message: string) => {},
  };
};

// 向后兼容的ToastContainer组件（已弃用，使用NotificationContainer）
export const ToastContainer: React.FC = () => {
  // 返回空的div，因为现在使用NotificationContainer
  return <div style={{ display: 'none' }} />;
};
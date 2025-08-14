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
  CloudArrowDownIcon,
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
        // 真实业务场景类型（基于修订方案）
        // 项目管理
        'project-status-auto' | 'project-archived' | 'worker-reassigned' |
        // 材料管理（四状态循环）
        'material-allocated' | 'material-started' | 'material-completed' | 'material-recycled' |
        'stock-added' | 'stock-warning' | 'dimension-added' | 'material-transferred' |
        'strategy-deviation' | 'strategy-warning' | 'strategy-balanced' |
        // 图纸管理
        'file-uploading' | 'dxf-parsed' | 'common-part-tagged' | 'upload-error' |
        'version-updated' | 'version-conflict' | 'version-deprecated' |
        'drawing-linked' | 'drawing-unlinked' |
        // 工人管理
        'worker-updated' | 'worker-added' | 'worker-removed' |
        'worker-overloaded' | 'worker-available' | 'workload-balanced' |
        // 实时协作（SSE）
        'collaboration-notify' | 'sync-updated' | 'collaboration-alert' | 'assignment-changed' |
        'sync-completed' | 'sync-error' | 'connection-lost' | 'connection-restored' |
        // 智能辅助
        'smart-suggestion' | 'pattern-insight' | 'skill-match' | 'timeline-insight' |
        'efficiency-insight' | 'performance-report' | 'bottleneck-detected' | 'workflow-optimization' |
        // 批量操作
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
  progress?: number // 0-100，用于显示任务进度
  showProgress?: boolean
  persistent?: boolean // 是否持久显示（不自动关闭）
  size?: 'sm' | 'md' | 'lg'
  variant?: 'filled' | 'outline' | 'glass' // 视觉变体
  // 真实业务扩展属性
  priority?: 'low' | 'normal' | 'high' | 'urgent' // 优先级
  category?: 'project' | 'material' | 'drawing' | 'worker' | 'system' | 'collaboration' // 真实分类
  relatedId?: string // 关联的业务ID（项目ID、材料ID等）
  metadata?: Record<string, any> // 附加业务数据
  showAvatar?: boolean // 显示头像（协作场景）
  avatarUrl?: string // 头像URL
  showTime?: boolean // 显示时间戳
  expandable?: boolean // 可展开显示详情
  details?: string // 详细信息内容
  linkTo?: string // 点击跳转链接
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
    // 基础样式
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

    // 项目管理样式
    'project-created': {
      filled: 'bg-green-600 text-white border-green-600',
      outline: 'bg-green-50 text-green-800 border-green-600 border',
      glass: 'bg-green-600/90 backdrop-blur-md text-white border-green-500/50 border'
    },
    'project-updated': {
      filled: 'bg-blue-600 text-white border-blue-600',
      outline: 'bg-blue-50 text-blue-800 border-blue-600 border',
      glass: 'bg-blue-600/90 backdrop-blur-md text-white border-blue-500/50 border'
    },
    'project-deleted': {
      filled: 'bg-red-600 text-white border-red-600',
      outline: 'bg-red-50 text-red-800 border-red-600 border',
      glass: 'bg-red-600/90 backdrop-blur-md text-white border-red-500/50 border'
    },
    'project-status-auto': {
      filled: 'bg-indigo-600 text-white border-indigo-600',
      outline: 'bg-indigo-50 text-indigo-800 border-indigo-600 border',
      glass: 'bg-indigo-600/90 backdrop-blur-md text-white border-indigo-500/50 border'
    },
    'project-archived': {
      filled: 'bg-gray-600 text-white border-gray-600',
      outline: 'bg-gray-50 text-gray-800 border-gray-600 border',
      glass: 'bg-gray-600/90 backdrop-blur-md text-white border-gray-500/50 border'
    },
    'worker-reassigned': {
      filled: 'bg-purple-600 text-white border-purple-600',
      outline: 'bg-purple-50 text-purple-800 border-purple-600 border',
      glass: 'bg-purple-600/90 backdrop-blur-md text-white border-purple-500/50 border'
    },

    // 材料管理样式（四状态循环）
    'material-changed': {
      filled: 'bg-purple-500 text-white border-purple-500',
      outline: 'bg-purple-50 text-purple-800 border-purple-500 border',
      glass: 'bg-purple-500/90 backdrop-blur-md text-white border-purple-400/50 border'
    },
    'material-allocated': {
      filled: 'bg-orange-500 text-white border-orange-500',
      outline: 'bg-orange-50 text-orange-800 border-orange-500 border',
      glass: 'bg-orange-500/90 backdrop-blur-md text-white border-orange-400/50 border'
    },
    'material-started': {
      filled: 'bg-blue-500 text-white border-blue-500',
      outline: 'bg-blue-50 text-blue-800 border-blue-500 border',
      glass: 'bg-blue-500/90 backdrop-blur-md text-white border-blue-400/50 border'
    },
    'material-completed': {
      filled: 'bg-green-500 text-white border-green-500',
      outline: 'bg-green-50 text-green-800 border-green-500 border',
      glass: 'bg-green-500/90 backdrop-blur-md text-white border-green-400/50 border'
    },
    'material-recycled': {
      filled: 'bg-gray-500 text-white border-gray-500',
      outline: 'bg-gray-50 text-gray-800 border-gray-500 border',
      glass: 'bg-gray-500/90 backdrop-blur-md text-white border-gray-400/50 border'
    },
    'stock-added': {
      filled: 'bg-emerald-500 text-white border-emerald-500',
      outline: 'bg-emerald-50 text-emerald-800 border-emerald-500 border',
      glass: 'bg-emerald-500/90 backdrop-blur-md text-white border-emerald-400/50 border'
    },
    'stock-warning': {
      filled: 'bg-red-500 text-white border-red-500',
      outline: 'bg-red-50 text-red-800 border-red-500 border',
      glass: 'bg-red-500/90 backdrop-blur-md text-white border-red-400/50 border'
    },

    // 图纸管理样式
    'file-uploaded': {
      filled: 'bg-indigo-500 text-white border-indigo-500',
      outline: 'bg-indigo-50 text-indigo-800 border-indigo-500 border',
      glass: 'bg-indigo-500/90 backdrop-blur-md text-white border-indigo-400/50 border'
    },
    'file-uploading': {
      filled: 'bg-blue-500 text-white border-blue-500',
      outline: 'bg-blue-50 text-blue-800 border-blue-500 border',
      glass: 'bg-blue-500/90 backdrop-blur-md text-white border-blue-400/50 border'
    },
    'dxf-parsed': {
      filled: 'bg-cyan-500 text-white border-cyan-500',
      outline: 'bg-cyan-50 text-cyan-800 border-cyan-500 border',
      glass: 'bg-cyan-500/90 backdrop-blur-md text-white border-cyan-400/50 border'
    },
    'version-updated': {
      filled: 'bg-purple-500 text-white border-purple-500',
      outline: 'bg-purple-50 text-purple-800 border-purple-500 border',
      glass: 'bg-purple-500/90 backdrop-blur-md text-white border-purple-400/50 border'
    },

    // 协作与同步样式
    'sync-completed': {
      filled: 'bg-teal-500 text-white border-teal-500',
      outline: 'bg-teal-50 text-teal-800 border-teal-500 border',
      glass: 'bg-teal-500/90 backdrop-blur-md text-white border-teal-400/50 border'
    },
    'collaboration-notify': {
      filled: 'bg-pink-500 text-white border-pink-500',
      outline: 'bg-pink-50 text-pink-800 border-pink-500 border',
      glass: 'bg-pink-500/90 backdrop-blur-md text-white border-pink-400/50 border'
    },
    'sync-error': {
      filled: 'bg-red-600 text-white border-red-600',
      outline: 'bg-red-50 text-red-800 border-red-600 border',
      glass: 'bg-red-600/90 backdrop-blur-md text-white border-red-500/50 border'
    },

    // 智能辅助样式
    'smart-suggestion': {
      filled: 'bg-purple-500 text-white border-purple-500',
      outline: 'bg-purple-50 text-purple-800 border-purple-500 border',
      glass: 'bg-purple-500/90 backdrop-blur-md text-white border-purple-400/50 border'
    },
    'efficiency-insight': {
      filled: 'bg-cyan-500 text-white border-cyan-500',
      outline: 'bg-cyan-50 text-cyan-800 border-cyan-500 border',
      glass: 'bg-cyan-500/90 backdrop-blur-md text-white border-cyan-400/50 border'
    },
    'workflow-optimization': {
      filled: 'bg-lime-500 text-white border-lime-500',
      outline: 'bg-lime-50 text-lime-800 border-lime-500 border',
      glass: 'bg-lime-500/90 backdrop-blur-md text-white border-lime-400/50 border'
    },

    // 特殊状态
    'wancheng': {
      filled: 'bg-emerald-500 text-white border-emerald-500',
      outline: 'bg-emerald-50 text-emerald-800 border-emerald-500 border',
      glass: 'bg-emerald-500/90 backdrop-blur-md text-white border-emerald-400/50 border'
    },
    'batch-operation': {
      filled: 'bg-slate-600 text-white border-slate-600',
      outline: 'bg-slate-50 text-slate-800 border-slate-600 border',
      glass: 'bg-slate-600/90 backdrop-blur-md text-white border-slate-500/50 border'
    }
  }

  if (!variant || !type || !(type in baseStyles)) {
    return baseStyles.info?.filled || 'bg-blue-500 text-white'
  }
  
  const typeStyles = baseStyles[type as keyof typeof baseStyles]
  return typeStyles?.[variant] || baseStyles.info?.[variant] || 'bg-blue-500 text-white'
}

// Toast 组件 - 增强版
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
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -20, scale: isVisible ? 1 : 0.9 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        duration: 0.3
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

// 全局Toast状态管理器（修复状态同步问题）
class GlobalToastManager {
  private toasts: ToastProps[] = []
  private listeners: Set<(toasts: ToastProps[]) => void> = new Set()

  addToast(toast: Omit<ToastProps, 'id'>) {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const newToast = { ...toast, id }
    
    this.toasts = [...this.toasts, newToast]
    this.notifyListeners()
    
    // 自动移除
    if (!toast.persistent && toast.duration !== 0) {
      setTimeout(() => {
        this.removeToast(id)
      }, toast.duration || 4000)
    }
    
    return id
  }

  removeToast(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id)
    this.notifyListeners()
  }

  updateToast(id: string, updates: Partial<ToastProps>) {
    this.toasts = this.toasts.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    )
    this.notifyListeners()
  }

  clearAll() {
    this.toasts = []
    this.notifyListeners()
  }

  subscribe(listener: (toasts: ToastProps[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.toasts]))
  }

  getToasts() {
    return [...this.toasts]
  }
}

// 全局单例
const globalToastManager = new GlobalToastManager()

// 简化的自包含Toast容器（用于布局组件）
export const ToastContainer: React.FC<{
  position?: ToastProps['position']
}> = ({ position = 'top-right' }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  useEffect(() => {
    const unsubscribe = globalToastManager.subscribe(setToasts)
    setToasts(globalToastManager.getToasts())
    return () => {
      unsubscribe()
    }
  }, [])

  return <InternalToastContainer 
    toasts={toasts} 
    position={position}
    onRemove={globalToastManager.removeToast}
  />
}

// 重命名原来的ToastContainer为内部组件
const InternalToastContainer: React.FC<{
  toasts: ToastProps[]
  position?: ToastProps['position']
  onRemove: (id: string) => void
}> = ({ 
  toasts, 
  position = 'top-right',
  onRemove 
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const positionClasses = {
    'top': 'top-4 left-1/2 transform -translate-x-1/2',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom': 'bottom-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  if (!mounted) {
    return null
  }

  return createPortal(
    <div 
      className={`fixed ${positionClasses[position]} z-50 space-y-3 pointer-events-none`}
      data-testid="toast-container"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              {...toast}
              onRemove={() => onRemove(toast.id!)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

// Enhanced Toast Hook（使用全局管理器）
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  useEffect(() => {
    const unsubscribe = globalToastManager.subscribe(setToasts)
    setToasts(globalToastManager.getToasts())
    return () => {
      unsubscribe()
    }
  }, [])

  const addToast = (toast: Omit<ToastProps, 'id'>) => {
    return globalToastManager.addToast(toast)
  }

  const removeToast = (id: string) => {
    globalToastManager.removeToast(id)
  }

  const updateToast = (id: string, updates: Partial<ToastProps>) => {
    globalToastManager.updateToast(id, updates)
  }

  const clearAllToasts = () => {
    globalToastManager.clearAll()
  }

  // 业务专用方法
  const projectCreated = (projectName: string) => {
    return addToast({
      type: 'project-created',
      message: `项目 "${projectName}" 创建成功`,
      duration: 3000
    })
  }

  const projectUpdated = (projectName: string) => {
    return addToast({
      type: 'project-updated', 
      message: `项目 "${projectName}" 更新成功`,
      duration: 3000
    })
  }

  const projectDeleted = (projectName: string) => {
    return addToast({
      type: 'project-deleted',
      message: `项目 "${projectName}" 删除成功`,
      duration: 3000
    })
  }

  const materialStatusChanged = (materialName: string, newStatus: string) => {
    const statusNames = {
      'empty': '空闲',
      'pending': '待处理', 
      'in_progress': '进行中',
      'completed': '已完成'
    }
    
    return addToast({
      type: newStatus === 'completed' ? 'wancheng' : 'material-changed',
      message: `${materialName} 状态变更为 ${statusNames[newStatus as keyof typeof statusNames] || newStatus}`,
      duration: newStatus === 'completed' ? 5000 : 3000
    })
  }

  const fileUploaded = (fileName: string) => {
    return addToast({
      type: 'file-uploaded',
      message: `文件 "${fileName}" 上传成功`,
      duration: 3000
    })
  }

  const syncCompleted = () => {
    return addToast({
      type: 'sync-completed',
      message: '数据同步完成',
      duration: 2000
    })
  }

  // 智能业务方法 - 基于深度分析的扩展
  const smartSuggestion = (suggestion: string, actions?: ToastProps['actions']) => {
    return addToast({
      type: 'smart-suggestion',
      message: suggestion,
      variant: 'glass',
      size: 'lg',
      priority: 'normal',
      expandable: true,
      details: '基于您的操作历史和系统数据分析生成',
      actions: actions || [
        { label: '应用建议', variant: 'primary', onClick: () => console.log('应用建议') },
        { label: '暂时跳过', variant: 'secondary', onClick: () => console.log('跳过') }
      ],
      duration: 8000
    })
  }

  const efficiencyInsight = (insight: string, data?: string) => {
    return addToast({
      type: 'efficiency-insight',
      message: insight,
      variant: 'glass',
      showTime: true,
      expandable: !!data,
      details: data,
      duration: 6000
    })
  }

  const workflowReminder = (reminder: string, nextSteps: string[]) => {
    return addToast({
      type: 'info',
      message: reminder,
      priority: 'high',
      expandable: true,
      details: `下一步：${nextSteps.join(' → ')}`,
      actions: [
        { label: '开始处理', variant: 'primary', onClick: () => console.log('开始处理') },
        { label: '稍后提醒', variant: 'secondary', onClick: () => console.log('稍后提醒') }
      ],
      persistent: true
    })
  }

  const collaborationNotify = (workerName: string, action: string, avatarUrl?: string) => {
    return addToast({
      type: 'collaboration-notify',
      message: `${workerName} ${action}`,
      showAvatar: true,
      avatarUrl: avatarUrl || '/avatars/default.png',
      showTime: true,
      actions: [
        { label: '查看详情', variant: 'primary', onClick: () => console.log('查看详情') },
        { label: '回复', variant: 'secondary', onClick: () => console.log('回复') }
      ],
      duration: 5000
    })
  }

  const stockWarning = (materialType: string, currentStock: number, minStock: number) => {
    return addToast({
      type: 'stock-warning',
      message: `${materialType}库存不足：${currentStock}/${minStock}`,
      priority: 'urgent',
      persistent: true,
      actions: [
        { label: '立即采购', variant: 'primary', onClick: () => console.log('立即采购') },
        { label: '调配库存', variant: 'secondary', onClick: () => console.log('调配库存') }
      ],
      expandable: true,
      details: '建议采购数量：' + Math.max(minStock * 2, 50) + '件'
    })
  }

  const qualityAlert = (itemName: string, issue: string, severity: 'low' | 'medium' | 'high') => {
    const priorityMap = { low: 'normal', medium: 'high', high: 'urgent' } as const
    return addToast({
      type: severity === 'high' ? 'error' : 'warning',
      message: `质检异常：${itemName} - ${issue}`,
      priority: priorityMap[severity],
      actions: [
        { label: '立即处理', variant: 'primary', onClick: () => console.log('立即处理') },
        { label: '标记跟进', variant: 'secondary', onClick: () => console.log('标记跟进') }
      ],
      persistent: severity === 'high'
    })
  }

  const equipmentStatus = (equipmentName: string, status: string, actionRequired?: boolean) => {
    return addToast({
      type: actionRequired ? 'error' : 'info',
      message: `${equipmentName}: ${status}`,
      priority: actionRequired ? 'urgent' : 'normal',
      actions: actionRequired ? [
        { label: '暂停设备', variant: 'primary', onClick: () => console.log('暂停设备') },
        { label: '联系维修', variant: 'secondary', onClick: () => console.log('联系维修') }
      ] : [
        { label: '查看详情', variant: 'primary', onClick: () => console.log('查看详情') }
      ],
      persistent: actionRequired
    })
  }

  const scheduleUpdate = (change: string, impact: string) => {
    return addToast({
      type: 'info',
      message: `生产计划调整：${change}`,
      expandable: true,
      details: `影响评估：${impact}`,
      showTime: true,
      actions: [
        { label: '确认调整', variant: 'primary', onClick: () => console.log('确认调整') },
        { label: '查看详情', variant: 'secondary', onClick: () => console.log('查看详情') }
      ]
    })
  }

  const workerUpdate = (workerName: string, updateType: 'checkin' | 'checkout' | 'task-complete', details?: string) => {
    const messages = {
      checkin: `${workerName} 已签到`,
      checkout: `${workerName} 已签退`,
      'task-complete': `${workerName} 完成任务`
    }

    return addToast({
      type: 'info',
      message: messages[updateType],
      showTime: true,
      expandable: !!details,
      details,
      duration: 3000
    })
  }

  const optimizationTip = (tip: string, potentialSaving: string) => {
    return addToast({
      type: 'info',
      message: `优化建议：${tip}`,
      variant: 'outline',
      expandable: true,
      details: `预期效果：${potentialSaving}`,
      actions: [
        { label: '应用建议', variant: 'primary', onClick: () => console.log('应用建议') },
        { label: '了解更多', variant: 'secondary', onClick: () => console.log('了解更多') }
      ],
      duration: 10000
    })
  }

  return {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearAllToasts,
    
    // 基础业务方法
    projectCreated,
    projectUpdated,
    projectDeleted,
    materialStatusChanged,
    fileUploaded,
    syncCompleted,
    
    // 真实业务场景方法（简化版 - 纯提示功能）
    
    // 项目管理
    projectStatusAuto: (projectName: string, newStatus: string, reason: string) => {
      return addToast({
        type: 'project-status-auto',
        message: `项目"${projectName}"状态自动更新为${newStatus}，原因：${reason}`,
        showTime: true,
        duration: 6000
      })
    },

    projectArchived: (projectName: string) => {
      return addToast({
        type: 'project-archived',
        message: `项目"${projectName}"已移动到过往项目库，释放活跃列表空间`,
        showTime: true,
        duration: 4000
      })
    },

    workerReassigned: (projectName: string, fromWorker: string, toWorker: string) => {
      return addToast({
        type: 'worker-reassigned',
        message: `项目"${projectName}"已重新分配：${fromWorker} → ${toWorker}`,
        showTime: true,
        duration: 5000
      })
    },

    // 材料管理（四状态循环）
    materialAllocated: (materialType: string, projectName: string, quantity: number) => {
      return addToast({
        type: 'material-allocated',
        message: `${materialType} ${quantity}张已分配给项目"${projectName}"`,
        showTime: true,
        duration: 4000
      })
    },

    materialStarted: (materialType: string, workerName: string) => {
      return addToast({
        type: 'material-started',
        message: `${workerName}开始加工 ${materialType}`,
        showTime: true,
        duration: 3000
      })
    },

    materialCompleted: (materialType: string, workerName?: string) => {
      return addToast({
        type: 'material-completed',
        message: `${materialType} 加工完成！${workerName ? `由${workerName}完成` : ''}`,
        showTime: true,
        priority: 'high',
        duration: 5000
      })
    },

    materialRecycled: (materialType: string) => {
      return addToast({
        type: 'material-recycled',
        message: `${materialType} 已回收为空闲状态，可重新分配使用`,
        showTime: true,
        duration: 3000
      })
    },

    stockAdded: (workerName: string, materialType: string, quantity: number) => {
      return addToast({
        type: 'stock-added',
        message: `${workerName}库存增加：${materialType} ${quantity}张`,
        showTime: true,
        duration: 4000
      })
    },

    stockWarning: (workerName: string, materialType: string, currentStock: number, required: number) => {
      return addToast({
        type: 'stock-warning',
        message: `警告：${workerName} ${materialType}库存不足：剩余${currentStock}张，需求${required}张`,
        priority: 'urgent',
        persistent: true
      })
    },

    dimensionAdded: (materialType: string, dimensions: string, quantity: number) => {
      return addToast({
        type: 'dimension-added',
        message: `已添加尺寸规格：${materialType} ${dimensions} 共${quantity}张`,
        showTime: true,
        duration: 4000
      })
    },

    materialTransferred: (materialType: string, quantity: number, fromWorker: string, toWorker: string) => {
      return addToast({
        type: 'material-transferred',
        message: `${quantity}张${materialType}已从${fromWorker}调拨给${toWorker}`,
        showTime: true,
        duration: 5000
      })
    },

    // 95/5策略提醒
    strategyDeviation: (carbonRatio: number, target: number = 95) => {
      return addToast({
        type: 'strategy-deviation',
        message: `警告：碳板使用率${carbonRatio}%，偏离${target}%目标，建议减少特殊材料使用`,
        priority: 'high',
        duration: 8000
      })
    },

    strategyBalanced: () => {
      return addToast({
        type: 'strategy-balanced',
        message: `材料配比已回归95/5策略目标，保持良好状态`,
        showTime: true,
        duration: 4000
      })
    },

    // 图纸管理
    fileUploading: (fileName: string, progress: number) => {
      return addToast({
        type: 'file-uploading',
        message: `正在上传图纸"${fileName}" (${progress}%)`,
        showProgress: true,
        progress,
        persistent: true
      })
    },

    dxfParsed: (fileName: string) => {
      return addToast({
        type: 'dxf-parsed',
        message: `图纸"${fileName}"解析完成，可进行3D预览和编辑`,
        duration: 6000
      })
    },

    commonPartTagged: (fileName: string) => {
      return addToast({
        type: 'common-part-tagged',
        message: `图纸"${fileName}"已标记为常用零件，将在库中分类显示`,
        showTime: true,
        duration: 4000
      })
    },

    versionUpdated: (fileName: string, version: string) => {
      return addToast({
        type: 'version-updated',
        message: `图纸"${fileName}"版本已自动更新至 ${version}`,
        showTime: true,
        duration: 4000
      })
    },

    versionConflict: (fileName: string) => {
      return addToast({
        type: 'version-conflict',
        message: `注意：发现同名图纸"${fileName}"，系统将自动创建新版本`,
        priority: 'high',
        duration: 8000
      })
    },

    drawingLinked: (fileName: string, projectName: string) => {
      return addToast({
        type: 'drawing-linked',
        message: `图纸"${fileName}"已成功关联到项目"${projectName}"`,
        showTime: true,
        duration: 4000
      })
    },

    drawingUploaded: (fileName: string, projectName?: string) => {
      return addToast({
        type: 'file-uploading',
        message: projectName 
          ? `图纸"${fileName}"已上传至项目"${projectName}"` 
          : `图纸"${fileName}"上传成功`,
        showTime: true,
        duration: 4000
      })
    },

    drawingUploadFailed: (fileName: string, error: string) => {
      return addToast({
        type: 'upload-error',
        message: `图纸"${fileName}"上传失败：${error}`,
        priority: 'high',
        duration: 6000
      })
    },

    batchUploadComplete: (successCount: number, totalCount: number) => {
      return addToast({
        type: 'batch-operation',
        message: `批量上传完成：成功${successCount}个，共${totalCount}个文件`,
        showTime: true,
        duration: 5000
      })
    },

    drawingDeleted: (fileName: string) => {
      return addToast({
        type: 'success',
        message: `图纸"${fileName}"已删除`,
        showTime: true,
        duration: 3000
      })
    },

    drawingVersionUpdated: (fileName: string, newVersion: string) => {
      return addToast({
        type: 'version-updated',
        message: `图纸"${fileName}"版本已更新至${newVersion}`,
        showTime: true,
        duration: 4000
      })
    },

    versionCreated: (fileName: string, version: string) => {
      return addToast({
        type: 'version-updated',
        message: `图纸"${fileName}"创建新版本：${version}`,
        showTime: true,
        duration: 4000
      })
    },

    dxfPreviewGenerated: (fileName: string) => {
      return addToast({
        type: 'dxf-parsed',
        message: `DXF图纸"${fileName}"预览生成成功`,
        showTime: true,
        duration: 3000
      })
    },

    dxfPreviewFailed: (fileName: string) => {
      return addToast({
        type: 'upload-error',
        message: `DXF图纸"${fileName}"预览生成失败`,
        priority: 'high',
        duration: 5000
      })
    },

    drawingArchived: (fileName: string) => {
      return addToast({
        type: 'success',
        message: `图纸"${fileName}"已归档`,
        showTime: true,
        duration: 3000
      })
    },

    // 工人管理
    workerUpdated: (workerName: string, updateType: string) => {
      return addToast({
        type: 'worker-updated',
        message: `工人信息已更新：${workerName} - ${updateType}`,
        showTime: true,
        duration: 3000
      })
    },

    workerAdded: (workerName: string, department: string) => {
      return addToast({
        type: 'worker-added',
        message: `新工人加入团队：${workerName} (${department})`,
        showTime: true,
        duration: 4000
      })
    },

    workerOverloaded: (workerName: string, projectCount: number) => {
      return addToast({
        type: 'worker-overloaded',
        message: `注意：${workerName}当前负责${projectCount}个项目，工作负载较重`,
        priority: 'high',
        duration: 8000
      })
    },

    workerAvailable: (workerName: string) => {
      return addToast({
        type: 'worker-available',
        message: `${workerName}目前无在进行项目，可分配新任务`,
        duration: 6000
      })
    },

    // 实时协作
    collaborationNotify: (userName: string, action: string) => {
      return addToast({
        type: 'collaboration-notify',
        message: `${userName} ${action}`,
        showTime: true,
        duration: 5000
      })
    },

    syncUpdated: (userName: string, updateType: string, itemName: string) => {
      return addToast({
        type: 'sync-updated',
        message: `${userName}更新了${updateType}：${itemName}`,
        showTime: true,
        duration: 4000
      })
    },

    syncError: () => {
      return addToast({
        type: 'sync-error',
        message: `数据同步失败，请检查网络连接后重试`,
        persistent: true,
        priority: 'urgent'
      })
    },

    connectionLost: () => {
      return addToast({
        type: 'connection-lost',
        message: `实时连接中断，正在自动重连中...`,
        persistent: true,
        priority: 'high'
      })
    },

    connectionRestored: () => {
      return addToast({
        type: 'connection-restored',
        message: `实时连接已恢复，数据同步正常`,
        duration: 2000
      })
    },

    // 智能辅助
    smartSuggestion: (suggestion: string) => {
      return addToast({
        type: 'smart-suggestion',
        message: `智能建议：${suggestion}`,
        priority: 'normal',
        duration: 8000
      })
    },

    patternInsight: (insight: string, pattern: string) => {
      return addToast({
        type: 'pattern-insight',
        message: `发现规律：${insight} (${pattern})`,
        showTime: true,
        duration: 6000
      })
    },

    efficiencyInsight: (insight: string) => {
      return addToast({
        type: 'efficiency-insight',
        message: `效率分析：${insight}`,
        variant: 'glass',
        showTime: true,
        duration: 6000
      })
    },

    workflowOptimization: (tip: string, potentialSaving: string) => {
      return addToast({
        type: 'workflow-optimization',
        message: `优化建议：${tip}，预期效果：${potentialSaving}`,
        duration: 10000
      })
    },

    bottleneckDetected: (bottleneck: string, solution: string) => {
      return addToast({
        type: 'bottleneck-detected',
        message: `发现生产瓶颈：${bottleneck}，建议：${solution}`,
        priority: 'high',
        persistent: true
      })
    },

    // 批量操作
    batchOperation: (operation: string, count: number, result: 'success' | 'partial' | 'failed') => {
      const resultMessages = {
        success: `${operation}完成：成功处理${count}条记录`,
        partial: `${operation}部分完成：${count}条记录中部分成功`,
        failed: `${operation}失败：${count}条记录处理失败`
      }
      
      return addToast({
        type: 'batch-operation',
        message: resultMessages[result],
        priority: result === 'failed' ? 'urgent' : result === 'partial' ? 'high' : 'normal',
        showTime: true,
        duration: result === 'success' ? 4000 : 6000
      })
    }
  }
}

// 简化的全局 Toast 函数
export const toast = {
  success: (message: string, options?: Partial<ToastProps>) => {
    // 需要全局 toast 管理器实现
    console.log('Global toast success:', message)
  },
  error: (message: string, options?: Partial<ToastProps>) => {
    console.log('Global toast error:', message)
  },
  warning: (message: string, options?: Partial<ToastProps>) => {
    console.log('Global toast warning:', message)
  },
  info: (message: string, options?: Partial<ToastProps>) => {
    console.log('Global toast info:', message)
  },
  // 业务专用全局方法
  projectCreated: (projectName: string) => {
    console.log('Global toast project created:', projectName)
  },
  materialChanged: (materialName: string, status: string) => {
    console.log('Global toast material changed:', materialName, status)
  }
}
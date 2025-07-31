'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

// 通知类型
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

// 通知位置
export type NotificationPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right'

// 单个通知配置
export interface NotificationConfig {
  id?: string
  type?: NotificationType
  title?: string
  message: string
  duration?: number // 显示时长，0 表示不自动关闭
  closable?: boolean
  persistent?: boolean // 是否持久显示
  icon?: React.ReactNode
  action?: React.ReactNode
  onClick?: () => void
  onClose?: () => void
}

// 内置图标映射
const iconMap = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon
}

// 样式映射
const styleMap = {
  success: {
    icon: 'text-green-500',
    bg: 'bg-green-50 border-green-200',
    title: 'text-green-800',
    message: 'text-green-700'
  },
  error: {
    icon: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
    title: 'text-red-800',
    message: 'text-red-700'
  },
  warning: {
    icon: 'text-yellow-500',
    bg: 'bg-yellow-50 border-yellow-200',
    title: 'text-yellow-800',
    message: 'text-yellow-700'
  },
  info: {
    icon: 'text-blue-500',
    bg: 'bg-blue-50 border-blue-200',
    title: 'text-blue-800',
    message: 'text-blue-700'
  }
}

// 位置样式映射
const positionMap: Record<NotificationPosition, string> = {
  'top-left': 'top-6 left-6',
  'top-center': 'top-6 left-1/2 transform -translate-x-1/2',
  'top-right': 'top-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-center': 'bottom-6 left-1/2 transform -translate-x-1/2',
  'bottom-right': 'bottom-6 right-6'
}

// 单个通知组件
interface NotificationItemProps extends NotificationConfig {
  onRemove: (id: string) => void
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  id = '',
  type = 'info',
  title,
  message,
  duration = 4000,
  closable = true,
  persistent = false,
  icon,
  action,
  onClick,
  onClose,
  onRemove
}) => {
  const [isVisible, setIsVisible] = useState(true)
  
  const styles = styleMap[type]
  const IconComponent = iconMap[type]

  // 自动关闭逻辑
  useEffect(() => {
    if (!persistent && duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [duration, persistent])

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
    setTimeout(() => onRemove(id), 300) // 等待动画完成
  }

  const handleClick = () => {
    onClick?.()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`
            relative w-full max-w-sm
            ${styles.bg}
            border-l-4 border-l-current
            backdrop-blur-lg
            rounded-ios-lg shadow-lg
            p-4 mb-3
            cursor-pointer
            ${onClick ? 'hover:shadow-xl' : ''}
            transition-all duration-200
          `}
          onClick={handleClick}
        >
          <div className="flex items-start space-x-3">
            {/* 图标 */}
            <div className={`flex-shrink-0 ${styles.icon}`}>
              {icon || <IconComponent className="w-5 h-5" />}
            </div>
            
            {/* 内容 */}
            <div className="flex-1 min-w-0">
              {title && (
                <div className={`font-semibold text-sm ${styles.title} mb-1`}>
                  {title}
                </div>
              )}
              <div className={`text-sm ${styles.message} leading-relaxed`}>
                {message}
              </div>
              
              {/* 操作按钮 */}
              {action && (
                <div className="mt-3 flex justify-end">
                  {action}
                </div>
              )}
            </div>
            
            {/* 关闭按钮 */}
            {closable && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
                className={`
                  flex-shrink-0 p-1 rounded-full
                  ${styles.icon} hover:bg-black/10
                  transition-colors duration-200
                `}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* 进度条（仅在有duration时显示） */}
          {!persistent && duration > 0 && (
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: "linear" }}
              className={`
                absolute bottom-0 left-0 h-1 
                ${type === 'success' ? 'bg-green-400' : 
                  type === 'error' ? 'bg-red-400' :
                  type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'}
                rounded-bl-ios-lg
              `}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 通知容器组件
interface NotificationContainerProps {
  notifications: (NotificationConfig & { id: string })[]
  position?: NotificationPosition
  onRemove: (id: string) => void
  maxCount?: number
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  position = 'top-right',
  onRemove,
  maxCount = 5
}) => {
  // 限制显示数量
  const displayNotifications = notifications.slice(0, maxCount)
  
  if (displayNotifications.length === 0) return null

  return (
    <div className={`fixed z-50 ${positionMap[position]} w-auto`}>
      <div className="space-y-2">
        {displayNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            {...notification}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

// 通知管理Hook
export const useNotification = () => {
  const [notifications, setNotifications] = useState<(NotificationConfig & { id: string })[]>([])

  const addNotification = (config: NotificationConfig) => {
    const id = config.id || `notification-${Date.now()}-${Math.random()}`
    const newNotification = { ...config, id }
    
    setNotifications(prev => [newNotification, ...prev])
    return id
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  // 便捷方法
  const success = (message: string, options?: Partial<NotificationConfig>) =>
    addNotification({ ...options, message, type: 'success' })

  const error = (message: string, options?: Partial<NotificationConfig>) =>
    addNotification({ ...options, message, type: 'error' })

  const warning = (message: string, options?: Partial<NotificationConfig>) =>
    addNotification({ ...options, message, type: 'warning' })

  const info = (message: string, options?: Partial<NotificationConfig>) =>
    addNotification({ ...options, message, type: 'info' })

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info
  }
}
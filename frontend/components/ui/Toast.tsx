'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

export interface ToastProps {
  id?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  position?: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left'
  showIcon?: boolean
  closable?: boolean
  onClose?: () => void
}

export interface ToastContextType {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, 'id'>) => string
  removeToast: (id: string) => void
  clearAllToasts: () => void
}

// Toast 组件
export const Toast: React.FC<ToastProps & { onRemove: () => void }> = ({
  message,
  type = 'info',
  showIcon = true,
  closable = true,
  onRemove
}) => {
  const typeStyles = {
    success: {
      bg: 'bg-green-500',
      icon: '✅',
      textColor: 'text-white'
    },
    error: {
      bg: 'bg-red-500',
      icon: '❌',
      textColor: 'text-white'
    },
    warning: {
      bg: 'bg-yellow-500',
      icon: '⚠️',
      textColor: 'text-white'
    },
    info: {
      bg: 'bg-ios18-blue',
      icon: 'ℹ️',
      textColor: 'text-white'
    }
  }

  const style = typeStyles[type]

  return (
    <motion.div
      className={`
        ${style.bg} ${style.textColor}
        px-4 py-3 rounded-ios-xl shadow-ios-lg
        flex items-center space-x-3
        backdrop-blur-glass
        max-w-sm
      `}
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        duration: 0.3
      }}
    >
      {showIcon && (
        <span className="text-lg flex-shrink-0">
          {style.icon}
        </span>
      )}
      
      <div className="flex-1 font-medium text-sm">
        {message}
      </div>
      
      {closable && (
        <motion.button
          onClick={onRemove}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      )}
    </motion.div>
  )
}

// Toast 容器组件
export const ToastContainer: React.FC<{
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
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom': 'bottom-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  if (!mounted) {
    return <div className={`fixed ${positionClasses[position]} z-50 space-y-3`} />
  }

  return createPortal(
    <div className={`fixed ${positionClasses[position]} z-50 space-y-3`}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onRemove={() => onRemove(toast.id!)}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

// Toast Hook
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = (toast: Omit<ToastProps, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const newToast = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])

    // 自动移除
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 3000)
    }

    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const clearAllToasts = () => {
    setToasts([])
  }

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts
  }
}

// 简化的 Toast 函数
export const toast = {
  success: (message: string, options?: Partial<ToastProps>) => {
    // 这里需要全局的 toast 管理器
    console.log('Success toast:', message)
  },
  error: (message: string, options?: Partial<ToastProps>) => {
    console.log('Error toast:', message)
  },
  warning: (message: string, options?: Partial<ToastProps>) => {
    console.log('Warning toast:', message)
  },
  info: (message: string, options?: Partial<ToastProps>) => {
    console.log('Info toast:', message)
  }
}
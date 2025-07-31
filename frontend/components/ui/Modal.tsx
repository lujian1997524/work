'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
  closable?: boolean
  maskClosable?: boolean
  footer?: React.ReactNode
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closable = true,
  maskClosable = true,
  footer,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    '3xl': 'max-w-7xl max-h-[80vh]',
    full: 'max-w-[95vw] max-h-[95vh]'
  }

  // 处理 ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, closable, onClose])

  if (typeof window === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* 遮罩层 */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={maskClosable ? onClose : undefined}
          />
          
          {/* 模态框容器 */}
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              className={`
                relative w-full ${sizeClasses[size]}
                bg-white/95 backdrop-blur-xl
                rounded-ios-2xl shadow-ios-2xl
                border border-white/20
                ${className}
              `}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 30,
                duration: 0.3
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 标题栏 */}
              {(title || closable) && (
                <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {title}
                  </h3>
                  {closable && (
                    <motion.button
                      onClick={onClose}
                      className="p-2 hover:bg-gray-100/50 rounded-ios-lg transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  )}
                </div>
              )}
              
              {/* 内容区域 */}
              <div className={`p-6 ${size === '3xl' ? 'max-h-[60vh] overflow-y-auto' : ''}`}>
                {children}
              </div>
              
              {/* 底部操作区 */}
              {footer && (
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200/50">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// 确认对话框组件
export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'danger'
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info'
}) => {
  const typeStyles = {
    info: {
      icon: 'ℹ️',
      confirmBg: 'bg-ios18-blue hover:bg-blue-600'
    },
    warning: {
      icon: '⚠️',
      confirmBg: 'bg-yellow-500 hover:bg-yellow-600'
    },
    danger: {
      icon: '❌',
      confirmBg: 'bg-red-500 hover:bg-red-600'
    }
  }

  const style = typeStyles[type]

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="text-center space-y-4">
        <div className="text-4xl">{style.icon}</div>
        <p className="text-gray-700 text-base leading-relaxed">
          {message}
        </p>
      </div>
      
      <div className="flex items-center justify-center space-x-3 mt-6">
        <motion.button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-ios-lg hover:bg-gray-200 transition-colors font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {cancelText}
        </motion.button>
        <motion.button
          onClick={handleConfirm}
          className={`px-4 py-2 ${style.confirmBg} text-white rounded-ios-lg transition-colors font-medium`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {confirmText}
        </motion.button>
      </div>
    </Modal>
  )
}
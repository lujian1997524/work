'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface AlertProps {
  children: React.ReactNode
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'error' | 'primary'
  title?: string
  onClose?: () => void
  closable?: boolean
  icon?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  title,
  onClose,
  closable = false,
  icon,
  className = '',
  size = 'md'
}) => {
  const variantStyles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: '💡'
    },
    primary: {
      bg: 'bg-ios18-blue/10 dark:bg-ios18-blue/20',
      border: 'border-ios18-blue/30 dark:border-ios18-blue/50',
      text: 'text-ios18-blue dark:text-ios18-blue',
      icon: '🚀'
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: '✅'
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: '⚠️'
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: '❌'
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: '❌'
    }
  }

  const sizeStyles = {
    sm: 'p-2 text-sm',
    md: 'p-4 text-base',
    lg: 'p-6 text-lg'
  }

  const style = variantStyles[variant]
  const sizeStyle = sizeStyles[size]
  const defaultIcon = icon || style.icon

  return (
    <AnimatePresence>
      <motion.div
        className={`
          ${style.bg} ${style.border} ${style.text}
          border rounded-ios-xl ${sizeStyle}
          backdrop-blur-sm
          ${className}
        `}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ 
          type: "spring", 
          stiffness: 500, 
          damping: 30,
          duration: 0.3
        }}
      >
        <div className="flex items-start space-x-3">
          {/* 图标 */}
          {defaultIcon && (
            <div className="flex-shrink-0 mt-0.5">
              {typeof defaultIcon === 'string' ? (
                <span className="text-lg">{defaultIcon}</span>
              ) : (
                defaultIcon
              )}
            </div>
          )}
          
          {/* 内容 */}
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="font-semibold text-sm mb-1">
                {title}
              </h4>
            )}
            <div className="text-sm leading-relaxed">
              {children}
            </div>
          </div>
          
          {/* 关闭按钮 */}
          {closable && onClose && (
            <motion.button
              onClick={onClose}
              className={`
                flex-shrink-0 p-1 rounded-lg
                ${style.text} hover:bg-black/5 dark:hover:bg-white/5
                transition-colors duration-200
              `}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
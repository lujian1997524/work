'use client'

import React from 'react'
import { motion } from 'framer-motion'

export type StatusType = 'empty' | 'pending' | 'in_progress' | 'completed'

export interface StatusIndicatorProps {
  status: StatusType
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onClick?: (newStatus: StatusType) => void
  showLabel?: boolean
  className?: string
  disabled?: boolean
}

const statusConfig = {
  empty: {
    color: 'bg-gray-100 border-gray-300 hover:bg-gray-200',
    icon: '○',
    label: '空白',
    textColor: 'text-gray-500'
  },
  pending: {
    color: 'bg-orange-100 border-orange-400 hover:bg-orange-200',
    icon: '⏳',
    label: '待处理',
    textColor: 'text-orange-600'
  },
  in_progress: {
    color: 'bg-blue-500 hover:bg-blue-600',
    icon: '⚙️',
    label: '进行中',
    textColor: 'text-white'
  },
  completed: {
    color: 'bg-green-500 hover:bg-green-600',
    icon: '✓',
    label: '已完成',
    textColor: 'text-white'
  }
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  interactive = false,
  onClick,
  showLabel = false,
  className = '',
  disabled = false
}) => {
  const config = statusConfig[status]
  
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-8 h-8 text-base'
  }

  const baseClasses = `
    ${sizeClasses[size]} ${config.color} ${config.textColor}
    rounded-full flex items-center justify-center font-medium
    transition-all duration-300 ease-in-out
    ${status === 'empty' || status === 'pending' ? 'border-2' : ''}
    ${interactive && !disabled ? 'cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `

  const handleClick = () => {
    if (disabled || !onClick) return;
    const nextStatus = getNextStatus(status);
    onClick(nextStatus);
  }

  const IndicatorElement = (
    <motion.div
      className={`${baseClasses} ${className}`}
      whileHover={interactive && !disabled ? { scale: 1.15, rotate: 5 } : {}}
      whileTap={interactive && !disabled ? { scale: 0.9, rotate: -5 } : {}}
      onClick={handleClick}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25,
        delay: 0.1 
      }}
      key={status} // 重要：状态变化时重新触发动画
    >
      {status === 'empty' ? null : config.icon}
    </motion.div>
  )

  if (showLabel) {
    return (
      <div className="flex items-center space-x-2">
        {IndicatorElement}
        <span className="text-sm text-gray-600 font-medium">
          {config.label}
        </span>
      </div>
    )
  }

  return IndicatorElement
}

// 四状态循环函数
const getNextStatus = (current: StatusType): StatusType => {
  switch (current) {
    case 'empty':
      return 'pending'
    case 'pending':
      return 'in_progress'
    case 'in_progress':
      return 'completed'
    case 'completed':
      return 'empty'
    default:
      return 'empty'
  }
}

// 状态切换组件
export interface StatusToggleProps {
  status: StatusType
  onChange: (newStatus: StatusType) => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export const StatusToggle: React.FC<StatusToggleProps> = ({
  status,
  onChange,
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const handleClick = (newStatus: StatusType) => {
    if (disabled) return;
    onChange(newStatus);
  }

  return (
    <StatusIndicator
      status={status}
      size={size}
      interactive={!disabled}
      onClick={handleClick}
      disabled={disabled}
      className={className}
    />
  )
}
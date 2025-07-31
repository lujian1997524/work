'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface TimelineItem {
  id: string
  title: string
  description?: string
  timestamp?: string | Date
  icon?: React.ReactNode
  color?: string
  status?: 'success' | 'error' | 'warning' | 'info' | 'pending'
  content?: React.ReactNode
  actions?: React.ReactNode
}

export interface TimelineProps {
  items: TimelineItem[]
  mode?: 'left' | 'right' | 'alternate'
  size?: 'sm' | 'md' | 'lg'
  reverse?: boolean
  pending?: React.ReactNode
  className?: string
}

export const Timeline: React.FC<TimelineProps> = ({
  items,
  mode = 'left',
  size = 'md',
  reverse = false,
  pending,
  className = ''
}) => {
  const sizeClasses = {
    sm: {
      dot: 'w-3 h-3',
      title: 'text-sm',
      description: 'text-xs',
      timestamp: 'text-xs',
      spacing: 'space-y-4',
      dotSpacing: 'mt-1.5'
    },
    md: {
      dot: 'w-4 h-4',
      title: 'text-base',
      description: 'text-sm',
      timestamp: 'text-sm',
      spacing: 'space-y-6',
      dotSpacing: 'mt-2'
    },
    lg: {
      dot: 'w-5 h-5',
      title: 'text-lg',
      description: 'text-base',
      timestamp: 'text-base',
      spacing: 'space-y-8',
      dotSpacing: 'mt-2.5'
    }
  }

  const statusColors = {
    success: 'bg-green-500 border-green-500',
    error: 'bg-red-500 border-red-500',
    warning: 'bg-yellow-500 border-yellow-500',
    info: 'bg-blue-500 border-blue-500',
    pending: 'bg-gray-300 border-gray-300'
  }

  const defaultStatusIcons = {
    success: (
      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    info: (
      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    pending: (
      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const formatTimestamp = (timestamp: string | Date) => {
    if (!timestamp) return ''
    
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getItemPosition = (index: number) => {
    if (mode === 'alternate') {
      return index % 2 === 0 ? 'left' : 'right'
    }
    return mode
  }

  const displayItems = reverse ? [...items].reverse() : items

  const renderTimelineItem = (item: TimelineItem, index: number, isLast: boolean) => {
    const position = getItemPosition(index)
    const statusColor = item.status ? statusColors[item.status] : statusColors.info
    const customColor = item.color ? `bg-${item.color} border-${item.color}` : statusColor

    return (
      <motion.div
        key={item.id}
        className={`relative flex ${position === 'right' ? 'flex-row-reverse' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        {/* 时间轴线 */}
        <div className="flex flex-col items-center">
          {/* 圆点 */}
          <motion.div
            className={`
              ${sizeClasses[size].dot} rounded-full border-2 flex items-center justify-center
              ${customColor} relative z-10 flex-shrink-0
              ${sizeClasses[size].dotSpacing}
            `}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.1 + 0.2 }}
          >
            {item.icon || (item.status && defaultStatusIcons[item.status]) || (
              <div className="w-2 h-2 bg-white rounded-full" />
            )}
          </motion.div>

          {/* 连接线 */}
          {!isLast && (
            <motion.div
              className="w-0.5 bg-gray-200 flex-1 mt-2"
              style={{ minHeight: '24px' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
            />
          )}
        </div>

        {/* 内容区域 */}
        <motion.div
          className={`
            flex-1 pb-8
            ${position === 'right' ? 'pr-6 text-right' : 'pl-6'}
            ${mode === 'alternate' ? 'max-w-md' : ''}
          `}
          initial={{ opacity: 0, x: position === 'right' ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 + 0.1 }}
        >
          {/* 时间戳 */}
          {item.timestamp && (
            <div className={`${sizeClasses[size].timestamp} text-gray-500 mb-1`}>
              {formatTimestamp(item.timestamp)}
            </div>
          )}

          {/* 标题 */}
          <h3 className={`${sizeClasses[size].title} font-semibold text-gray-900 mb-2`}>
            {item.title}
          </h3>

          {/* 描述 */}
          {item.description && (
            <p className={`${sizeClasses[size].description} text-gray-600 mb-3 leading-relaxed`}>
              {item.description}
            </p>
          )}

          {/* 自定义内容 */}
          {item.content && (
            <div className="mb-3">
              {item.content}
            </div>
          )}

          {/* 操作按钮 */}
          {item.actions && (
            <div className={`flex ${position === 'right' ? 'justify-end' : 'justify-start'} space-x-2`}>
              {item.actions}
            </div>
          )}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div className={`timeline-component ${className}`}>
      <div className={sizeClasses[size].spacing}>
        {displayItems.map((item, index) => 
          renderTimelineItem(item, index, index === displayItems.length - 1)
        )}

        {/* 待处理项 */}
        {pending && (
          <motion.div
            className="relative flex"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: displayItems.length * 0.1 }}
          >
            {/* 时间轴线 */}
            <div className="flex flex-col items-center">
              {/* 待处理圆点 */}
              <motion.div
                className={`
                  ${sizeClasses[size].dot} rounded-full border-2 border-dashed
                  border-gray-300 bg-white flex items-center justify-center
                  ${sizeClasses[size].dotSpacing}
                `}
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="w-2 h-2 bg-gray-300 rounded-full" />
              </motion.div>
            </div>

            {/* 待处理内容 */}
            <div className="flex-1 pl-6">
              <div className={`${sizeClasses[size].description} text-gray-400`}>
                {pending}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// 预设组件
export const VerticalTimeline: React.FC<Omit<TimelineProps, 'mode'>> = (props) => (
  <Timeline mode="left" {...props} />
)

export const AlternateTimeline: React.FC<Omit<TimelineProps, 'mode'>> = (props) => (
  <Timeline mode="alternate" {...props} />
)

export const SimpleTimeline: React.FC<Omit<TimelineProps, 'size'>> = (props) => (
  <Timeline size="sm" {...props} />
)
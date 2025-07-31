'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface EmptyProps {
  image?: React.ReactNode | string
  title?: string
  description?: string
  action?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// 预设的空状态图标
const EmptyIcons = {
  default: (
    <svg className="w-full h-full text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  noData: (
    <svg className="w-full h-full text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  noResults: (
    <svg className="w-full h-full text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  noFiles: (
    <svg className="w-full h-full text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  noNotifications: (
    <svg className="w-full h-full text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  network: (
    <svg className="w-full h-full text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  )
}

export const Empty: React.FC<EmptyProps> = ({
  image,
  title = '暂无数据',
  description,
  action,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      image: 'w-16 h-16 mb-4',
      title: 'text-base',
      description: 'text-sm'
    },
    md: {
      container: 'py-12',
      image: 'w-20 h-20 mb-6',
      title: 'text-lg',
      description: 'text-base'
    },
    lg: {
      container: 'py-16',
      image: 'w-24 h-24 mb-8',
      title: 'text-xl',
      description: 'text-lg'
    }
  }

  // 获取图像内容
  const getImageContent = () => {
    if (!image) return EmptyIcons.default
    
    if (typeof image === 'string') {
      // 如果是预设图标名称
      if (image in EmptyIcons) {
        return EmptyIcons[image as keyof typeof EmptyIcons]
      }
      // 如果是图片URL
      return <img src={image} alt="Empty" className="w-full h-full object-contain" />
    }
    
    return image
  }

  return (
    <motion.div
      className={`
        flex flex-col items-center justify-center text-center
        ${sizeClasses[size].container} ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* 图像 */}
      <motion.div
        className={`${sizeClasses[size].image} flex items-center justify-center`}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {getImageContent()}
      </motion.div>

      {/* 标题 */}
      <motion.h3
        className={`font-semibold text-gray-900 mb-2 ${sizeClasses[size].title}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {title}
      </motion.h3>

      {/* 描述 */}
      {description && (
        <motion.p
          className={`text-gray-500 mb-6 max-w-md leading-relaxed ${sizeClasses[size].description}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {description}
        </motion.p>
      )}

      {/* 操作按钮 */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  )
}

// 预设的空状态组件
export const EmptyData: React.FC<Omit<EmptyProps, 'image'>> = (props) => (
  <Empty image="noData" title="暂无数据" {...props} />
)

export const EmptySearch: React.FC<Omit<EmptyProps, 'image'>> = (props) => (
  <Empty 
    image="noResults" 
    title="未找到相关结果" 
    description="尝试调整搜索条件或使用其他关键词"
    {...props} 
  />
)

export const EmptyFiles: React.FC<Omit<EmptyProps, 'image'>> = (props) => (
  <Empty 
    image="noFiles" 
    title="暂无文件" 
    description="还没有上传任何文件"
    {...props} 
  />
)

export const EmptyNotifications: React.FC<Omit<EmptyProps, 'image'>> = (props) => (
  <Empty 
    image="noNotifications" 
    title="暂无通知" 
    description="您已查看所有通知"
    {...props} 
  />
)

export const NetworkError: React.FC<Omit<EmptyProps, 'image'>> = (props) => (
  <Empty 
    image="network" 
    title="网络连接失败" 
    description="请检查您的网络连接并重试"
    {...props} 
  />
)
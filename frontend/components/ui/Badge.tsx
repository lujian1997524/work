'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface BadgeProps {
  children?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  count?: number
  maxCount?: number
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  count,
  maxCount = 99,
  className = ''
}) => {
  const variantClasses = {
    primary: 'bg-ios18-blue text-white',
    secondary: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    success: 'bg-ios18-teal text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-500 text-white',
    info: 'bg-ios18-indigo text-white',
    outline: 'bg-transparent border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  const dotSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  }

  const displayCount = count !== undefined ? (count > maxCount ? `${maxCount}+` : count.toString()) : ''

  const badgeContent = dot ? (
    <motion.div
      className={`${dotSizeClasses[size]} ${variantClasses[variant]} rounded-full`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  ) : (
    <motion.span
      className={`
        ${sizeClasses[size]} ${variantClasses[variant]}
        inline-flex items-center justify-center
        rounded-full font-medium leading-none
        shadow-sm
      `}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {count !== undefined ? displayCount : children}
    </motion.span>
  )

  // 如果是数字徽章且没有内容，只显示徽章
  if (count !== undefined && !children) {
    return <div className={className}>{badgeContent}</div>
  }

  // 如果是点徽章且没有内容，只显示徽章
  if (dot && !children) {
    return <div className={className}>{badgeContent}</div>
  }

  // 如果有子元素，作为相对定位的容器
  if (children && (count !== undefined || dot)) {
    return (
      <div className={`relative inline-flex ${className}`}>
        {children}
        <div className="absolute -top-1 -right-1 z-10">
          {badgeContent}
        </div>
      </div>
    )
  }

  return <div className={className}>{badgeContent}</div>
}
'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface AvatarProps {
  src?: string
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  name?: string
  shape?: 'circle' | 'square'
  status?: 'online' | 'offline' | 'away' | 'busy'
  badge?: React.ReactNode
  className?: string
  onClick?: () => void
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  name,
  shape = 'circle',
  status,
  badge,
  className = '',
  onClick
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl'
  }

  const statusClasses = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500'
  }

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    '2xl': 'w-4 h-4'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const baseClasses = `
    ${sizeClasses[size]}
    ${shape === 'circle' ? 'rounded-full' : 'rounded-ios-lg'}
    bg-gradient-to-br from-ios18-blue to-ios18-indigo
    text-white font-semibold
    flex items-center justify-center
    overflow-hidden
    shadow-sm
    ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''}
  `

  const avatarContent = src ? (
    <img
      src={src}
      alt={alt || name || 'Avatar'}
      className="w-full h-full object-cover"
      onError={(e) => {
        // 如果图片加载失败，隐藏图片显示初始字母
        e.currentTarget.style.display = 'none'
      }}
    />
  ) : name ? (
    getInitials(name)
  ) : (
    <svg className="w-3/5 h-3/5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  )

  const avatarElement = (
    <motion.div
      className={`${baseClasses} ${className}`}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {avatarContent}
      {!src && name && (
        <div className="absolute inset-0 flex items-center justify-center">
          {getInitials(name)}
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="relative inline-flex">
      {avatarElement}
      
      {/* 状态指示器 */}
      {status && (
        <div className={`
          absolute -bottom-0.5 -right-0.5
          ${statusSizes[size]} ${statusClasses[status]}
          rounded-full border-2 border-white dark:border-gray-800
        `} />
      )}
      
      {/* 徽章 */}
      {badge && (
        <div className="absolute -top-1 -right-1">
          {badge}
        </div>
      )}
    </div>
  )
}
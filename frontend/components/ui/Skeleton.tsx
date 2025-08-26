'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded'
  animation?: 'pulse' | 'wave' | 'none'
  lines?: number
  avatar?: boolean
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  variant = 'text',
  animation = 'pulse',
  lines = 1,
  avatar = false,
  className = ''
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700'
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-ios-lg'
  }

  const getAnimationClasses = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse'
      case 'wave':
        return 'animate-shimmer'
      default:
        return ''
    }
  }

  const getSize = () => {
    const style: React.CSSProperties = {}
    if (width) style.width = typeof width === 'number' ? `${width}px` : width
    if (height) style.height = typeof height === 'number' ? `${height}px` : height
    return style
  }

  const getDefaultSize = () => {
    switch (variant) {
      case 'text':
        return { height: '1em', width: '100%' }
      case 'circular':
        return { width: '40px', height: '40px' }
      default:
        return { height: '1.2em', width: '100%' }
    }
  }

  const shimmerAnimation = {
    initial: { backgroundPosition: '-200% 0' },
    animate: { backgroundPosition: '200% 0' },
    transition: {
      duration: 2,
      ease: 'linear',
      repeat: Infinity
    }
  }

  // 如果是头像骨架屏
  if (avatar) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <motion.div
          className={`
            w-10 h-10 ${baseClasses} ${variantClasses.circular} ${getAnimationClasses()}
          `}
          {...(animation === 'wave' ? shimmerAnimation : {})}
        />
        <div className="flex-1 space-y-2">
          <motion.div
            className={`
              h-4 ${baseClasses} ${variantClasses.rounded} ${getAnimationClasses()}
            `}
            style={{ width: '60%' }}
            {...(animation === 'wave' ? shimmerAnimation : {})}
          />
          <motion.div
            className={`
              h-3 ${baseClasses} ${variantClasses.rounded} ${getAnimationClasses()}
            `}
            style={{ width: '40%' }}
            {...(animation === 'wave' ? shimmerAnimation : {})}
          />
        </div>
      </div>
    )
  }

  // 多行文本骨架屏
  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <motion.div
            key={index}
            className={`
              ${baseClasses} ${variantClasses[variant]} ${getAnimationClasses()}
            `}
            style={{
              height: height || '1em',
              width: index === lines - 1 ? '60%' : '100%'
            }}
            {...(animation === 'wave' ? shimmerAnimation : {})}
          />
        ))}
      </div>
    )
  }

  // 单个骨架屏
  return (
    <motion.div
      className={`
        ${baseClasses} ${variantClasses[variant]} ${getAnimationClasses()} ${className}
      `}
      style={{ ...getDefaultSize(), ...getSize() }}
      {...(animation === 'wave' ? shimmerAnimation : {})}
    />
  )
}

// 预定义的骨架屏组合
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border border-gray-200 rounded-ios-xl ${className}`}>
    <div className="space-y-3">
      <Skeleton height="12px" width="60%" />
      <Skeleton height="8px" lines={2} />
      <div className="flex justify-between items-center mt-4">
        <Skeleton height="8px" width="30%" />
        <Skeleton height="20px" width="60px" variant="rounded" />
      </div>
    </div>
  </div>
)

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 3, 
  className = '' 
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <Skeleton key={index} avatar />
    ))}
  </div>
)
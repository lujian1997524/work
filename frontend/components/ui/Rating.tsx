'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

export interface RatingProps {
  value?: number
  defaultValue?: number
  count?: number
  allowHalf?: boolean
  allowClear?: boolean
  disabled?: boolean
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: string
  character?: React.ReactNode
  tooltips?: string[]
  className?: string
  onChange?: (value: number) => void
  onHoverChange?: (value: number) => void
}

export const Rating: React.FC<RatingProps> = ({
  value,
  defaultValue = 0,
  count = 5,
  allowHalf = false,
  allowClear = true,
  disabled = false,
  readonly = false,
  size = 'md',
  color = '#FFD700',
  character,
  tooltips = [],
  className = '',
  onChange,
  onHoverChange
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [hoverValue, setHoverValue] = useState(0)
  
  // 生成稳定的组件ID
  const componentId = React.useId()

  const currentValue = value !== undefined ? value : internalValue
  const displayValue = hoverValue || currentValue

  const sizeClasses = {
    sm: { star: 'w-4 h-4', text: 'text-sm' },
    md: { star: 'w-6 h-6', text: 'text-base' },
    lg: { star: 'w-8 h-8', text: 'text-lg' }
  }

  const defaultStar = (filled: boolean, half: boolean = false, starIndex: number = 0) => {
    const gradientId = `half-${componentId}-${starIndex}`
    
    return (
      <svg
        className={`${sizeClasses[size].star} transition-all duration-200`}
        fill={filled || half ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : 2}
        viewBox="0 0 24 24"
      >
        {half ? (
          <defs>
            <linearGradient id={gradientId}>
              <stop offset="50%" stopColor={color} />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
        ) : null}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          fill={half ? `url(#${gradientId})` : undefined}
        />
      </svg>
    )
  }

  const handleStarClick = (starValue: number, isHalf: boolean = false) => {
    if (disabled || readonly) return

    const newValue = isHalf ? starValue - 0.5 : starValue
    
    // 如果允许清除且点击的是当前值，则清除
    if (allowClear && newValue === currentValue) {
      setInternalValue(0)
      onChange?.(0)
      return
    }

    setInternalValue(newValue)
    onChange?.(newValue)
  }

  const handleStarHover = (starValue: number, isHalf: boolean = false) => {
    if (disabled || readonly) return

    const newHoverValue = isHalf ? starValue - 0.5 : starValue
    setHoverValue(newHoverValue)
    onHoverChange?.(newHoverValue)
  }

  const handleMouseLeave = () => {
    if (disabled || readonly) return
    
    setHoverValue(0)
    onHoverChange?.(0)
  }

  const getStarStatus = (starIndex: number) => {
    const starValue = starIndex + 1
    
    if (displayValue >= starValue) {
      return { filled: true, half: false }
    }
    
    if (allowHalf && displayValue >= starValue - 0.5) {
      return { filled: false, half: true }
    }
    
    return { filled: false, half: false }
  }

  const renderStar = (starIndex: number) => {
    const starValue = starIndex + 1
    const { filled, half } = getStarStatus(starIndex)
    const tooltip = tooltips[starIndex]

    return (
      <motion.div
        key={starIndex}
        className={`
          relative inline-flex cursor-pointer
          ${disabled ? 'cursor-not-allowed opacity-50' : readonly ? 'cursor-default' : ''}
        `}
        whileHover={!disabled && !readonly ? { scale: 1.1 } : {}}
        whileTap={!disabled && !readonly ? { scale: 0.9 } : {}}
        title={tooltip}
        onMouseLeave={handleMouseLeave}
      >
        {/* 整星点击区域 */}
        <div
          className="relative"
          onMouseEnter={() => handleStarHover(starValue, false)}
          onClick={() => handleStarClick(starValue, false)}
        >
          {character ? (
            <span
              className={`${sizeClasses[size].text} transition-all duration-200`}
              style={{ color: filled || half ? color : '#e5e7eb' }}
            >
              {character}
            </span>
          ) : (
            defaultStar(filled, half, starIndex)
          )}
        </div>

        {/* 半星点击区域（仅在允许半星时显示） */}
        {allowHalf && !character && (
          <div
            className="absolute inset-0 w-1/2 cursor-pointer z-10"
            onMouseEnter={() => handleStarHover(starValue, true)}
            onClick={() => handleStarClick(starValue, true)}
          />
        )}
      </motion.div>
    )
  }

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      {/* 星星 */}
      <div className="flex items-center space-x-1">
        {Array.from({ length: count }, (_, index) => renderStar(index))}
      </div>

      {/* 数值显示 */}
      {displayValue > 0 && (
        <motion.span
          className={`ml-2 ${sizeClasses[size].text} text-gray-600 font-medium`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {displayValue}
        </motion.span>
      )}
    </div>
  )
}

// 预设组件
export const StarRating: React.FC<Omit<RatingProps, 'character'>> = (props) => (
  <Rating {...props} />
)

export const HeartRating: React.FC<Omit<RatingProps, 'character' | 'color'>> = (props) => (
  <Rating
    character="♥"
    color="#ef4444"
    {...props}
  />
)

export const ThumbRating: React.FC<Omit<RatingProps, 'character' | 'color' | 'count'>> = (props) => (
  <Rating
    character="👍"
    count={3}
    allowHalf={false}
    {...props}
  />
)

export const SimpleRating: React.FC<Omit<RatingProps, 'allowHalf' | 'allowClear'>> = (props) => (
  <Rating
    allowHalf={false}
    allowClear={false}
    {...props}
  />
)

// 评分显示组件（只读）
export const RatingDisplay: React.FC<Omit<RatingProps, 'readonly' | 'disabled'>> = (props) => (
  <Rating
    readonly
    disabled={false}
    {...props}
  />
)
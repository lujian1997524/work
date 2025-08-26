'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface ProgressBarProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'linear' | 'circular'
  color?: 'primary' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
  label?: string
  animated?: boolean
  striped?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'linear',
  color = 'primary',
  showLabel = false,
  label,
  animated = true,
  striped = false,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const colorClasses = {
    primary: 'bg-ios18-blue',
    success: 'bg-ios18-teal',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  }

  const sizeClasses = {
    sm: variant === 'linear' ? 'h-1' : 'w-8 h-8',
    md: variant === 'linear' ? 'h-2' : 'w-12 h-12',
    lg: variant === 'linear' ? 'h-3' : 'w-16 h-16'
  }

  if (variant === 'circular') {
    const circleSize = {
      sm: { size: 32, strokeWidth: 3 },
      md: { size: 48, strokeWidth: 4 },
      lg: { size: 64, strokeWidth: 5 }
    }
    
    const { size: circlePixelSize, strokeWidth } = circleSize[size]
    const radius = (circlePixelSize - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <svg
          className="transform -rotate-90"
          width={circlePixelSize}
          height={circlePixelSize}
        >
          {/* 背景圆环 */}
          <circle
            cx={circlePixelSize / 2}
            cy={circlePixelSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* 进度圆环 */}
          <motion.circle
            cx={circlePixelSize / 2}
            cy={circlePixelSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            className={colorClasses[color]}
            animate={{ strokeDashoffset }}
            transition={{ duration: animated ? 1 : 0, ease: "easeInOut" }}
          />
        </svg>
        {/* 中心文字 */}
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-text-primary">
              {label || `${Math.round(percentage)}%`}
            </span>
          </div>
        )}
      </div>
    )
  }

  // 线性进度条
  return (
    <div className={className}>
      {/* 标签 */}
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-text-secondary">
            {label || '进度'}
          </span>
          <span className="text-sm font-medium text-text-primary">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      {/* 进度条容器 */}
      <div className={`
        ${sizeClasses[size]}
        bg-gray-200 dark:bg-gray-700
        rounded-full overflow-hidden
        shadow-inner
      `}>
        {/* 进度条填充 */}
        <motion.div
          className={`
            h-full ${colorClasses[color]} rounded-full
            ${striped ? 'bg-stripes' : ''}
            ${animated && striped ? 'animate-stripes' : ''}
            shadow-sm
          `}
          style={{
            backgroundImage: striped ? 
              'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)' :
              undefined,
            backgroundSize: striped ? '1rem 1rem' : undefined
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: animated ? 1 : 0, ease: "easeInOut" }}
        />
      </div>
    </div>
  )
}

// 预定义的进度条组合
export const ProgressWithSteps: React.FC<{
  steps: Array<{ label: string; completed: boolean }>
  currentStep: number
  className?: string
}> = ({ steps, currentStep, className = '' }) => {
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className={className}>
      <ProgressBar 
        value={progress} 
        animated 
        showLabel 
        label={`步骤 ${currentStep + 1} / ${steps.length}`}
      />
      <div className="flex justify-between mt-2">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={`text-xs ${
              index <= currentStep ? 'text-ios18-blue font-medium' : 'text-gray-400'
            }`}
          >
            {step.label}
          </div>
        ))}
      </div>
    </div>
  )
}
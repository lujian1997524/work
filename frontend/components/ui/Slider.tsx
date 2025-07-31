'use client'

import React, { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

export interface SliderProps {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  showValue?: boolean
  showTicks?: boolean
  marks?: { [key: number]: string }
  formatValue?: (value: number) => string
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
  onChange?: (value: number) => void
  onChangeComplete?: (value: number) => void
}

export const Slider: React.FC<SliderProps> = ({
  value,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  showValue = false,
  showTicks = false,
  marks,
  formatValue,
  size = 'md',
  color = 'primary',
  className = '',
  onChange,
  onChangeComplete
}) => {
  const [internalValue, setInternalValue] = useState(value ?? defaultValue)
  const [isDragging, setIsDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  const currentValue = value ?? internalValue

  const colorClasses = {
    primary: 'bg-ios18-blue',
    success: 'bg-ios18-teal',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  }

  const sizeClasses = {
    sm: {
      track: 'h-1',
      thumb: 'w-4 h-4',
      thumbActive: 'w-5 h-5'
    },
    md: {
      track: 'h-2',
      thumb: 'w-5 h-5',
      thumbActive: 'w-6 h-6'
    },
    lg: {
      track: 'h-3',
      thumb: 'w-6 h-6',
      thumbActive: 'w-7 h-7'
    }
  }

  // 计算百分比
  const percentage = ((currentValue - min) / (max - min)) * 100

  // 处理值变化
  const handleValueChange = useCallback((newValue: number) => {
    const clampedValue = Math.max(min, Math.min(max, newValue))
    const steppedValue = Math.round(clampedValue / step) * step
    
    if (value === undefined) {
      setInternalValue(steppedValue)
    }
    onChange?.(steppedValue)
  }, [min, max, step, value, onChange])

  // 鼠标/触摸事件处理
  const handlePointerDown = (event: React.PointerEvent) => {
    if (disabled || !sliderRef.current) return

    setIsDragging(true)
    const rect = sliderRef.current.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    const newValue = min + percent * (max - min)
    handleValueChange(newValue)

    // 全局监听器
    const handlePointerMove = (e: PointerEvent) => {
      const percent = (e.clientX - rect.left) / rect.width
      const newValue = min + percent * (max - min)
      handleValueChange(newValue)
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      onChangeComplete?.(currentValue)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }

  // 键盘事件处理
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return

    let newValue = currentValue
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(min, currentValue - step)
        break
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(max, currentValue + step)
        break
      case 'Home':
        newValue = min
        break
      case 'End':
        newValue = max
        break
      case 'PageDown':
        newValue = Math.max(min, currentValue - step * 10)
        break
      case 'PageUp':
        newValue = Math.min(max, currentValue + step * 10)
        break
      default:
        return
    }

    event.preventDefault()
    handleValueChange(newValue)
    onChangeComplete?.(newValue)
  }

  // 生成刻度标记
  const generateTicks = () => {
    if (!showTicks && !marks) return null

    const ticks = []
    const tickStep = marks ? 1 : Math.max(1, Math.floor((max - min) / 10))

    for (let i = min; i <= max; i += tickStep) {
      const tickPercentage = ((i - min) / (max - min)) * 100
      const hasLabel = marks && marks[i]

      ticks.push(
        <div
          key={i}
          className="absolute transform -translate-x-1/2"
          style={{ left: `${tickPercentage}%` }}
        >
          {showTicks && (
            <div className={`w-0.5 bg-gray-300 ${size === 'sm' ? 'h-2' : size === 'lg' ? 'h-4' : 'h-3'}`} />
          )}
          {hasLabel && (
            <div className="mt-2 text-xs text-gray-600 whitespace-nowrap">
              {marks[i]}
            </div>
          )}
        </div>
      )
    }

    return ticks
  }

  return (
    <div className={`relative ${className}`}>
      {/* 值显示 */}
      {showValue && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            {formatValue ? formatValue(currentValue) : currentValue}
          </span>
          <span className="text-xs text-gray-500">
            {min} - {max}
          </span>
        </div>
      )}

      {/* 滑块容器 */}
      <div className="relative py-3">
        {/* 轨道 */}
        <div
          ref={sliderRef}
          className={`
            relative ${sizeClasses[size].track} 
            bg-gray-200 rounded-full cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onPointerDown={handlePointerDown}
        >
          {/* 激活轨道 */}
          <motion.div
            className={`
              absolute top-0 left-0 ${sizeClasses[size].track} 
              ${colorClasses[color]} rounded-full
            `}
            style={{ width: `${percentage}%` }}
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />

          {/* 滑块按钮 */}
          <motion.div
            className={`
              absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2
              ${isDragging ? sizeClasses[size].thumbActive : sizeClasses[size].thumb}
              ${colorClasses[color]} rounded-full shadow-ios-md
              cursor-grab active:cursor-grabbing
              ${disabled ? 'cursor-not-allowed' : ''}
            `}
            style={{ left: `${percentage}%` }}
            animate={{
              scale: isDragging ? 1.2 : 1,
              boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,0.15)' : '0 4px 15px rgba(0,0,0,0.1)'
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={handleKeyDown}
            role="slider"
            aria-valuenow={currentValue}
            aria-valuemin={min}
            aria-valuemax={max}
          >
            {/* 内部白点 */}
            <div className="absolute inset-0 m-0.5 bg-white rounded-full opacity-20" />
          </motion.div>
        </div>

        {/* 刻度和标记 */}
        {generateTicks()}
      </div>
    </div>
  )
}

// 范围滑块组件
export interface RangeSliderProps extends Omit<SliderProps, 'value' | 'defaultValue' | 'onChange'> {
  value?: [number, number]
  defaultValue?: [number, number]
  onChange?: (value: [number, number]) => void
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  value,
  defaultValue = [0, 100],
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  showValue = false,
  size = 'md',
  color = 'primary',
  className = '',
  onChange,
  onChangeComplete
}) => {
  const [internalValue, setInternalValue] = useState<[number, number]>(value ?? defaultValue)
  const [activeThumb, setActiveThumb] = useState<number | null>(null)

  const currentValue = value ?? internalValue
  const [minValue, maxValue] = currentValue

  const colorClasses = {
    primary: 'bg-ios18-blue',
    success: 'bg-ios18-teal',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  }

  const sizeClasses = {
    sm: { track: 'h-1', thumb: 'w-4 h-4' },
    md: { track: 'h-2', thumb: 'w-5 h-5' },
    lg: { track: 'h-3', thumb: 'w-6 h-6' }
  }

  const minPercentage = ((minValue - min) / (max - min)) * 100
  const maxPercentage = ((maxValue - min) / (max - min)) * 100

  return (
    <div className={`relative ${className}`}>
      {showValue && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            {minValue} - {maxValue}
          </span>
          <span className="text-xs text-gray-500">
            {min} - {max}
          </span>
        </div>
      )}

      <div className="relative py-3">
        <div className={`relative ${sizeClasses[size].track} bg-gray-200 rounded-full`}>
          {/* 激活范围 */}
          <motion.div
            className={`absolute top-0 ${sizeClasses[size].track} ${colorClasses[color]} rounded-full`}
            style={{
              left: `${minPercentage}%`,
              width: `${maxPercentage - minPercentage}%`
            }}
          />

          {/* 最小值滑块 */}
          <motion.div
            className={`
              absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2
              ${sizeClasses[size].thumb} ${colorClasses[color]} rounded-full shadow-ios-md
              cursor-grab active:cursor-grabbing z-10
            `}
            style={{ left: `${minPercentage}%` }}
            animate={{ scale: activeThumb === 0 ? 1.2 : 1 }}
          />

          {/* 最大值滑块 */}  
          <motion.div
            className={`
              absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2
              ${sizeClasses[size].thumb} ${colorClasses[color]} rounded-full shadow-ios-md
              cursor-grab active:cursor-grabbing z-10
            `}
            style={{ left: `${maxPercentage}%` }}
            animate={{ scale: activeThumb === 1 ? 1.2 : 1 }}
          />
        </div>
      </div>
    </div>
  )
}
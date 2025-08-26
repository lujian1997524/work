'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface DatePickerProps {
  value?: Date
  defaultValue?: Date
  onChange?: (date: Date | null) => void
  format?: string
  placeholder?: string
  disabled?: boolean
  disabledDates?: (date: Date) => boolean
  minDate?: Date
  maxDate?: Date
  showToday?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  defaultValue,
  onChange,
  format = 'YYYY-MM-DD',
  placeholder = '选择日期',
  disabled = false,
  disabledDates,
  minDate,
  maxDate,
  showToday = true,
  size = 'md',
  className = ''
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || defaultValue || null)
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const inputRef = useRef<HTMLInputElement>(null)

  const currentDate = value || selectedDate

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg'
  }

  // 格式化日期
  const formatDate = (date: Date | null) => {
    if (!date) return ''
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
  }

  // 生成日历
  const generateCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const calendar = []
    const today = new Date()
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      const isCurrentMonth = date.getMonth() === month
      const isToday = date.toDateString() === today.toDateString()
      const isSelected = currentDate && date.toDateString() === currentDate.toDateString()
      const isDisabled = disabled || 
        (minDate && date < minDate) ||
        (maxDate && date > maxDate) ||
        (disabledDates && disabledDates(date))
      
      calendar.push({
        date,
        day: date.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        isDisabled
      })
    }
    
    return calendar
  }

  // 处理日期选择
  const handleDateSelect = (date: Date) => {
    if (disabled) return
    
    const newDate = new Date(date)
    setSelectedDate(newDate)
    onChange?.(newDate)
    setIsOpen(false)
  }

  // 处理月份切换
  const handleMonthChange = (increment: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + increment)
    setCurrentMonth(newMonth)
  }

  // 处理今天按钮
  const handleToday = () => {
    const today = new Date()
    handleDateSelect(today)
    setCurrentMonth(today)
  }

  // 清空日期
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDate(null)
    onChange?.(null)
  }

  const calendar = generateCalendar()
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ]
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className={`relative ${className}`}>
      {/* 输入框 */}
      <div
        className={`
          ${sizeClasses[size]}
          w-full bg-white border border-gray-200 rounded-ios-lg
          flex items-center justify-between cursor-pointer
          transition-all duration-200
          ${isOpen ? 'border-ios18-blue shadow-ios-sm' : 'hover:border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <input
          ref={inputRef}
          type="text"
          value={formatDate(currentDate)}
          placeholder={placeholder}
          readOnly
          className="flex-1 bg-transparent outline-none cursor-pointer"
          disabled={disabled}
        />
        
        <div className="flex items-center space-x-2">
          {currentDate && (
            <motion.button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}
          
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      {/* 日历弹出层 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-ios-xl shadow-ios-lg p-4 min-w-80"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between mb-4">
              <motion.button
                onClick={() => handleMonthChange(-1)}
                className="p-2 hover:bg-gray-100 rounded-ios-lg transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              
              <h3 className="font-semibold text-gray-900">
                {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
              </h3>
              
              <motion.button
                onClick={() => handleMonthChange(1)}
                className="p-2 hover:bg-gray-100 rounded-ios-lg transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-1">
              {calendar.map((item, index) => (
                <motion.button
                  key={index}
                  onClick={() => !item.isDisabled && handleDateSelect(item.date)}
                  className={`
                    h-8 w-8 text-sm rounded-ios-lg transition-all duration-150
                    ${item.isCurrentMonth 
                      ? 'text-gray-900' 
                      : 'text-gray-400'
                    }
                    ${item.isSelected 
                      ? 'bg-ios18-blue text-white font-medium' 
                      : item.isToday 
                        ? 'bg-ios18-blue/10 text-ios18-blue font-medium' 
                        : 'hover:bg-gray-100'
                    }
                    ${item.isDisabled 
                      ? 'opacity-50 cursor-not-allowed hover:bg-transparent' 
                      : 'cursor-pointer'
                    }
                  `}
                  whileHover={item.isDisabled ? {} : { scale: 1.1 }}
                  whileTap={item.isDisabled ? {} : { scale: 0.9 }}
                  disabled={item.isDisabled}
                >
                  {item.day}
                </motion.button>
              ))}
            </div>

            {/* 底部按钮 */}
            {showToday && (
              <div className="flex justify-center mt-4 pt-3 border-t border-gray-200">
                <motion.button
                  onClick={handleToday}
                  className="px-4 py-2 text-ios18-blue hover:bg-ios18-blue/10 rounded-ios-lg transition-colors text-sm font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  今天
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
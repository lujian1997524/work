'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface DropdownOption {
  label: string
  value: string | number
  disabled?: boolean
  icon?: React.ReactNode
  description?: string
}

export interface DropdownProps {
  options: DropdownOption[]
  value?: string | number
  placeholder?: string
  disabled?: boolean
  searchable?: boolean
  clearable?: boolean
  multiple?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onChange?: (value: string | number | (string | number)[]) => void
  onSearch?: (searchTerm: string) => void
}

export const Dropdown: React.FC<DropdownProps> = ({
  options = [], // 默认为空数组
  value,
  placeholder = '请选择...',
  disabled = false,
  searchable = false,
  clearable = false,
  multiple = false,
  size = 'md',
  className = '',
  onChange,
  onSearch
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedValues, setSelectedValues] = useState<(string | number)[]>(
    multiple 
      ? (Array.isArray(value) ? value : (value !== undefined ? [value] : []))
      : (value !== undefined ? [value] : [])
  )
  const dropdownRef = useRef<HTMLDivElement>(null)

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg'
  }

  // 过滤选项
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options

  // 获取显示文本
  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder
    
    if (multiple) {
      if (selectedValues.length === 1) {
        const option = options.find(opt => opt.value === selectedValues[0])
        return option?.label || ''
      }
      return `已选择 ${selectedValues.length} 项`
    }
    
    const option = options.find(opt => opt.value === selectedValues[0])
    return option?.label || ''
  }

  // 处理选择
  const handleSelect = (optionValue: string | number) => {
    let newValues: (string | number)[]
    
    if (multiple) {
      if (selectedValues.includes(optionValue)) {
        newValues = selectedValues.filter(v => v !== optionValue)
      } else {
        newValues = [...selectedValues, optionValue]
      }
      setSelectedValues(newValues)
      onChange?.(newValues)
    } else {
      newValues = [optionValue]
      setSelectedValues(newValues)
      onChange?.(optionValue)
      setIsOpen(false)
    }
  }

  // 清空选择
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedValues([])
    onChange?.(multiple ? [] : '')
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 搜索处理
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)
    onSearch?.(term)
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* 触发器 */}
      <motion.div
        className={`
          ${sizeClasses[size]}
          w-full bg-white border border-gray-200 rounded-ios-lg
          flex items-center justify-between cursor-pointer
          transition-all duration-200
          ${isOpen ? 'border-ios18-blue shadow-ios-sm' : 'hover:border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        whileTap={disabled ? {} : { scale: 0.98 }}
      >
        <span className={`truncate ${selectedValues.length === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
          {getDisplayText()}
        </span>
        
        <div className="flex items-center space-x-2">
          {clearable && selectedValues.length > 0 && (
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
          
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </motion.div>

      {/* 下拉菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-ios-lg shadow-ios-lg max-h-60 overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* 搜索框 */}
            {searchable && (
              <div className="p-3 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="搜索选项..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-ios-md text-sm focus:outline-none focus:ring-2 focus:ring-ios18-blue focus:border-transparent"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            
            {/* 选项列表 */}
            <div className="py-2 max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-gray-500 text-center text-sm">
                  {searchTerm ? '未找到匹配选项' : '暂无选项'}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value)
                  
                  return (
                    <motion.div
                      key={option.value}
                      className={`
                        px-4 py-3 cursor-pointer flex items-center space-x-3
                        transition-colors duration-150
                        ${isSelected 
                          ? 'bg-ios18-blue/10 text-ios18-blue' 
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                        ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      onClick={() => !option.disabled && handleSelect(option.value)}
                      whileHover={option.disabled ? {} : { backgroundColor: 'rgba(0,0,0,0.02)' }}
                    >
                      {multiple && (
                        <div className={`
                          w-4 h-4 border-2 rounded flex items-center justify-center
                          ${isSelected 
                            ? 'bg-ios18-blue border-ios18-blue' 
                            : 'border-gray-300'
                          }
                        `}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      )}
                      
                      {option.icon && (
                        <span className="flex-shrink-0">
                          {option.icon}
                        </span>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                      
                      {!multiple && isSelected && (
                        <svg className="w-4 h-4 text-ios18-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
'use client'

import React, { forwardRef, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

// 可搜索选择框选项接口
export interface SearchableSelectOption {
  value: string | number
  label: string
  description?: string
  disabled?: boolean
}

// 可搜索选择框组件接口
export interface SearchableSelectProps {
  // 基础属性
  value?: string | number
  onChange?: (value: string | number) => void
  
  // 选项数据
  options: SearchableSelectOption[]
  
  // 样式和行为
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  clearable?: boolean
  
  // 显示配置
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'glass'
  width?: string | number
  
  // 下拉配置
  maxHeight?: number
  
  // 错误和提示
  error?: string
  hint?: string
  
  // HTML 属性
  className?: string
  name?: string
  required?: boolean
}

// 可搜索选择框组件
export const SearchableSelect = forwardRef<HTMLDivElement, SearchableSelectProps>(({
  value,
  onChange,
  options = [],
  placeholder = '请选择...',
  disabled = false,
  loading = false,
  clearable = false,
  size = 'md',
  variant = 'default',
  width,
  maxHeight = 200,
  error,
  hint,
  className = '',
  name,
  required = false,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [internalValue, setInternalValue] = useState(value || '')
  const selectRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 同步外部 value
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value)
      // 当有值时，显示对应的标签
      const selectedOption = options.find(option => option.value === value)
      if (selectedOption) {
        setSearchTerm(selectedOption.label)
      } else if (value === '' || value === null) {
        setSearchTerm('')
      }
    }
  }, [value, options])

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        handleBlur()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 过滤选项
  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true
    return option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
           option.description?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // 获取选中的选项
  const getSelectedOption = (): SearchableSelectOption | undefined => {
    return options.find(option => option.value === internalValue)
  }

  // 处理输入框点击
  const handleInputClick = () => {
    if (disabled) return
    setIsOpen(true)
    // 如果有选中值，清空搜索词以显示所有选项
    if (internalValue) {
      setSearchTerm('')
    }
  }

  // 处理输入框输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value
    setSearchTerm(newSearchTerm)
    setIsOpen(true)
    
    // 如果输入为空，清空选中值
    if (!newSearchTerm) {
      setInternalValue('')
      onChange?.('')
    }
  }

  // 处理选项选择
  const handleOptionSelect = (option: SearchableSelectOption) => {
    if (option.disabled) return

    setInternalValue(option.value)
    setSearchTerm(option.label)
    setIsOpen(false)
    onChange?.(option.value)
  }

  // 处理失去焦点
  const handleBlur = () => {
    setIsOpen(false)
    
    // 如果有选中值，恢复显示标签
    const selectedOption = getSelectedOption()
    if (selectedOption) {
      setSearchTerm(selectedOption.label)
    } else if (searchTerm && filteredOptions.length > 0) {
      // 如果输入的内容与某个选项匹配，自动选择第一个匹配项
      const exactMatch = filteredOptions.find(option => 
        option.label.toLowerCase() === searchTerm.toLowerCase()
      )
      if (exactMatch) {
        handleOptionSelect(exactMatch)
      } else {
        // 否则清空输入
        setSearchTerm('')
        setInternalValue('')
        onChange?.('')
      }
    } else {
      // 没有匹配项时清空
      setSearchTerm('')
      if (internalValue) {
        setInternalValue('')
        onChange?.('')
      }
    }
  }

  // 处理清空
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setInternalValue('')
    setSearchTerm('')
    onChange?.('')
    inputRef.current?.focus()
  }

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      }
      // TODO: 可以添加键盘导航逻辑
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions.length > 0 && isOpen) {
        handleOptionSelect(filteredOptions[0])
      }
    } else if (e.key === 'Escape') {
      handleBlur()
    }
  }

  // 样式类
  const sizeClasses = {
    sm: 'text-sm px-3 py-2 min-h-[32px]',
    md: 'text-base px-4 py-3 min-h-[40px]',
    lg: 'text-lg px-5 py-4 min-h-[48px]'
  }

  const variantClasses = {
    default: `
      bg-white border-macos15-separator
      focus-within:border-ios18-blue focus-within:bg-white
      hover:border-ios18-blue hover:border-opacity-50
    `,
    filled: `
      bg-macos15-control border-transparent
      focus-within:border-ios18-blue focus-within:bg-white
      hover:bg-opacity-80
    `,
    glass: `
      bg-bg-glass backdrop-blur-glass border-white border-opacity-20
      focus-within:border-ios18-blue focus-within:bg-white focus-within:bg-opacity-90
      hover:bg-white hover:bg-opacity-30
    `
  }

  const selectedOption = getSelectedOption()
  const hasValue = Boolean(internalValue)

  const containerStyle = width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined

  return (
    <div className="relative w-full" style={containerStyle}>
      <div
        ref={selectRef}
        className={`
          relative w-full rounded-ios-lg border transition-all duration-200 cursor-text
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${error ? 'border-status-error focus-within:ring-status-error' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        {...props}
      >
        {/* 隐藏的原生 input 用于表单提交 */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={String(internalValue)}
            required={required}
          />
        )}

        {/* 输入框 */}
        <div className="flex items-center justify-between gap-2">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-text-tertiary"
            onClick={handleInputClick}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />

          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            {clearable && hasValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="w-5 h-5 rounded-sm hover:bg-gray-200 flex items-center justify-center"
              >
                <XMarkIcon className="w-4 h-4 text-text-secondary" />
              </button>
            )}
            
            {loading ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-ios18-blue" />
            ) : (
              <ChevronDownIcon 
                className={`w-5 h-5 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              />
            )}
          </div>
        </div>

        {/* 下拉选项 */}
        <AnimatePresence>
          {isOpen && filteredOptions.length > 0 && (
            <motion.div
              ref={dropdownRef}
              className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-ios-lg shadow-ios-lg z-50"
              style={{ maxHeight }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* 选项列表 */}
              <div className="max-h-40 overflow-y-auto">
                {filteredOptions.map(option => {
                  const isSelected = internalValue === option.value

                  return (
                    <motion.div
                      key={option.value}
                      className={`
                        px-3 py-2 cursor-pointer transition-colors flex items-center justify-between
                        ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
                        ${isSelected ? 'bg-ios18-blue/10 text-ios18-blue' : ''}
                      `}
                      onClick={() => handleOptionSelect(option)}
                      whileHover={!option.disabled ? { backgroundColor: 'rgba(10, 132, 255, 0.05)' } : {}}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1">
                          <div className="text-sm">{option.label}</div>
                          {option.description && (
                            <div className="text-xs text-text-secondary">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <CheckIcon className="w-4 h-4 text-ios18-blue flex-shrink-0" />
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 错误信息 */}
      {error && (
        <motion.p 
          className="mt-2 text-sm text-status-error"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {error}
        </motion.p>
      )}
      
      {/* 提示信息 */}
      {hint && !error && (
        <motion.p 
          className="mt-2 text-sm text-text-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {hint}
        </motion.p>
      )}
    </div>
  )
})

SearchableSelect.displayName = 'SearchableSelect'
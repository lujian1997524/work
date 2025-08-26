'use client'

import React, { forwardRef, useState, useRef, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

// Select 选项接口
export interface SelectOption {
  value: string | number
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
  group?: string
}

// Select 组件接口
export interface SelectProps {
  // 基础属性
  value?: string | number | (string | number)[]
  defaultValue?: string | number | (string | number)[]
  onChange?: (value: string | number | (string | number)[]) => void
  onSearch?: (searchTerm: string) => void
  
  // 选项数据
  options: SelectOption[]
  
  // 样式和行为
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  clearable?: boolean
  searchable?: boolean
  multiple?: boolean
  
  // 显示配置
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'glass'
  width?: string | number
  
  // 下拉配置
  maxHeight?: number
  placement?: 'bottom' | 'top' | 'auto'
  
  // 自定义渲染
  renderOption?: (option: SelectOption) => ReactNode
  renderValue?: (option: SelectOption | SelectOption[]) => ReactNode
  
  // 错误和提示
  error?: string
  hint?: string
  
  // HTML 属性
  className?: string
  name?: string
  required?: boolean
}

// MultiSelect 标签组件
const SelectTag: React.FC<{
  option: SelectOption
  onRemove: () => void
  size: 'sm' | 'md' | 'lg'
}> = ({ option, onRemove, size }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1'
  }

  return (
    <motion.span
      className={`
        inline-flex items-center gap-1 bg-ios18-blue/10 text-ios18-blue rounded-md
        ${sizeClasses[size]}
      `}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      {option.icon && <span className="w-4 h-4">{option.icon}</span>}
      <span>{option.label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="w-4 h-4 rounded-sm hover:bg-ios18-blue/20 flex items-center justify-center"
      >
        <XMarkIcon className="w-3 h-3" />
      </button>
    </motion.span>
  )
}

// Select 组件
export const Select = forwardRef<HTMLDivElement, SelectProps>(({
  value,
  defaultValue,
  onChange,
  onSearch,
  options = [],
  placeholder = '请选择...',
  disabled = false,
  loading = false,
  clearable = false,
  searchable = false,
  multiple = false,
  size = 'md',
  variant = 'default',
  width,
  maxHeight = 200,
  placement = 'auto',
  renderOption,
  renderValue,
  error,
  hint,
  className = '',
  name,
  required = false,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [internalValue, setInternalValue] = useState(value || defaultValue || (multiple ? [] : ''))
  const selectRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 同步外部 value
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value)
    }
  }, [value])

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 自动聚焦搜索框
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  // 过滤选项
  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true
    return option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
           option.description?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // 分组选项
  const groupedOptions = filteredOptions.reduce((groups, option) => {
    const group = option.group || 'default'
    if (!groups[group]) groups[group] = []
    groups[group].push(option)
    return groups
  }, {} as Record<string, SelectOption[]>)

  // 获取选中的选项
  const getSelectedOptions = (): SelectOption[] => {
    if (multiple) {
      const values = Array.isArray(internalValue) ? internalValue : []
      return options.filter(option => values.includes(option.value))
    }
    return options.filter(option => option.value === internalValue)
  }

  // 处理选项选择
  const handleOptionSelect = (option: SelectOption) => {
    if (option.disabled) return

    let newValue: string | number | (string | number)[]

    if (multiple) {
      const currentValues = Array.isArray(internalValue) ? internalValue : []
      if (currentValues.includes(option.value)) {
        newValue = currentValues.filter(v => v !== option.value)
      } else {
        newValue = [...currentValues, option.value]
      }
    } else {
      newValue = option.value
      setIsOpen(false)
      setSearchTerm('')
    }

    setInternalValue(newValue)
    onChange?.(newValue)
  }

  // 处理清空
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newValue = multiple ? [] : ''
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  // 处理搜索
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    onSearch?.(term)
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

  const selectedOptions = getSelectedOptions()
  const hasValue = multiple ? selectedOptions.length > 0 : selectedOptions.length > 0

  const containerStyle = width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined

  return (
    <div className="relative w-full" style={containerStyle}>
      <div
        ref={selectRef}
        className={`
          relative w-full rounded-ios-lg border transition-all duration-200 cursor-pointer
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${error ? 'border-status-error focus-within:ring-status-error' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        {...props}
      >
        {/* 隐藏的原生 input 用于表单提交 */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={multiple ? JSON.stringify(internalValue) : String(internalValue)}
            required={required}
          />
        )}

        {/* 显示区域 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            {hasValue ? (
              multiple ? (
                <div className="flex flex-wrap gap-1 max-w-full">
                  <AnimatePresence>
                    {selectedOptions.map(option => (
                      <SelectTag
                        key={option.value}
                        option={option}
                        size={size}
                        onRemove={() => handleOptionSelect(option)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                renderValue ? renderValue(selectedOptions[0]) : (
                  <div className="flex items-center gap-2">
                    {selectedOptions[0].icon && (
                      <span className="w-4 h-4 flex-shrink-0">
                        {selectedOptions[0].icon}
                      </span>
                    )}
                    <span className="truncate">{selectedOptions[0].label}</span>
                  </div>
                )
              )
            ) : (
              <span className="text-text-tertiary truncate">{placeholder}</span>
            )}
          </div>

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
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              className={`
                absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-ios-lg shadow-ios-lg z-50
                ${placement === 'top' ? 'bottom-full mb-1 mt-0' : ''}
              `}
              style={{ maxHeight }}
              initial={{ opacity: 0, y: placement === 'top' ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: placement === 'top' ? 10 : -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* 搜索框 */}
              {searchable && (
                <div className="p-2 border-b border-gray-200">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="搜索选项..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ios18-blue focus:ring-opacity-50"
                  />
                </div>
              )}

              {/* 选项列表 */}
              <div className="max-h-40 overflow-y-auto">
                {Object.keys(groupedOptions).length === 0 ? (
                  <div className="px-3 py-2 text-sm text-text-secondary text-center">
                    {searchTerm ? '无匹配结果' : '暂无选项'}
                  </div>
                ) : (
                  Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                    <div key={groupName}>
                      {groupName !== 'default' && (
                        <div className="px-3 py-2 text-xs font-medium text-text-secondary bg-gray-50">
                          {groupName}
                        </div>
                      )}
                      {groupOptions.map(option => {
                        const isSelected = multiple 
                          ? Array.isArray(internalValue) && internalValue.includes(option.value)
                          : internalValue === option.value

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
                              {option.icon && (
                                <span className="w-4 h-4 flex-shrink-0">
                                  {option.icon}
                                </span>
                              )}
                              <div className="flex-1">
                                {renderOption ? renderOption(option) : (
                                  <>
                                    <div className="text-sm">{option.label}</div>
                                    {option.description && (
                                      <div className="text-xs text-text-secondary">
                                        {option.description}
                                      </div>
                                    )}
                                  </>
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
                  ))
                )}
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

Select.displayName = 'Select'
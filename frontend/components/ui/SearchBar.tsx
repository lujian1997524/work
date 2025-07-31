'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SearchSuggestion {
  id: string
  label: string
  value: string
  category?: string
  icon?: React.ReactNode
  description?: string
}

export interface SearchBarProps {
  value?: string
  placeholder?: string
  suggestions?: SearchSuggestion[]
  recentSearches?: string[]
  maxSuggestions?: number
  showHistory?: boolean
  clearable?: boolean
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  onFocus?: () => void
  onBlur?: () => void
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value = '',
  placeholder = '搜索...',
  suggestions = [],
  recentSearches = [],
  maxSuggestions = 8,
  showHistory = true,
  clearable = true,
  loading = false,
  size = 'md',
  className = '',
  onChange,
  onSearch,
  onSuggestionSelect,
  onFocus,
  onBlur
}) => {
  const [internalValue, setInternalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentValue = value !== undefined ? value : internalValue

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm h-9',
    md: 'px-4 py-3 text-base h-12',
    lg: 'px-5 py-4 text-lg h-14'
  }

  // 过滤建议
  const filteredSuggestions = suggestions
    .filter(suggestion => 
      suggestion.label.toLowerCase().includes(currentValue.toLowerCase()) ||
      suggestion.value.toLowerCase().includes(currentValue.toLowerCase())
    )
    .slice(0, maxSuggestions)

  // 显示的历史搜索
  const displayHistory = showHistory && currentValue.length === 0 
    ? recentSearches.slice(0, 5)
    : []

  // 所有选项（建议 + 历史）
  const allOptions = [
    ...filteredSuggestions.map(s => ({ ...s, type: 'suggestion' as const })),
    ...displayHistory.map(h => ({ 
      id: h, 
      label: h, 
      value: h, 
      type: 'history' as const 
    }))
  ]

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onChange?.(newValue)
    setSelectedIndex(-1)
  }

  // 处理搜索
  const handleSearch = (searchValue = currentValue) => {
    if (searchValue.trim()) {
      onSearch?.(searchValue.trim())
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  // 处理建议选择
  const handleSuggestionSelect = (option: any) => {
    if (option.type === 'suggestion') {
      onSuggestionSelect?.(option)
    }
    setInternalValue(option.value)
    onChange?.(option.value)
    handleSearch(option.value)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < allOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && allOptions[selectedIndex]) {
          handleSuggestionSelect(allOptions[selectedIndex])
        } else {
          handleSearch()
        }
        break
      case 'Escape':
        setIsFocused(false)
        inputRef.current?.blur()
        break
    }
  }

  // 处理焦点
  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }

  const handleBlur = () => {
    // 延迟关闭以允许点击建议
    setTimeout(() => {
      setIsFocused(false)
      onBlur?.()
    }, 200)
  }

  // 清空搜索
  const handleClear = () => {
    setInternalValue('')
    onChange?.('')
    inputRef.current?.focus()
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 搜索输入框 */}
      <div className={`
        relative flex items-center
        ${sizeClasses[size]}
        bg-white border border-gray-200 rounded-ios-xl
        transition-all duration-200
        ${isFocused ? 'border-ios18-blue shadow-ios-sm' : 'hover:border-gray-300'}
      `}>
        {/* 搜索图标 */}
        <svg 
          className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        {/* 输入框 */}
        <input
          ref={inputRef}
          type="text"
          value={currentValue}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {/* 右侧按钮 */}
        <div className="flex items-center space-x-2 ml-3">
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-ios18-blue border-t-transparent" />
          )}
          
          {clearable && currentValue && !loading && (
            <motion.button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}

          <motion.button
            onClick={() => handleSearch()}
            className="p-1 text-ios18-blue hover:bg-ios18-blue/10 rounded-full"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* 建议下拉框 */}
      <AnimatePresence>
        {isFocused && allOptions.length > 0 && (
          <motion.div
            className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-ios-xl shadow-ios-lg max-h-64 overflow-y-auto"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* 历史搜索标题 */}
            {displayHistory.length > 0 && (
              <div className="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                最近搜索
              </div>
            )}

            {/* 选项列表 */}
            <div className="py-2">
              {allOptions.map((option, index) => (
                <motion.div
                  key={option.id}
                  onClick={() => handleSuggestionSelect(option)}
                  className={`
                    px-4 py-3 cursor-pointer flex items-center space-x-3
                    transition-colors duration-150
                    ${index === selectedIndex 
                      ? 'bg-ios18-blue/10 text-ios18-blue' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                >
                  {/* 图标 */}
                  <div className="flex-shrink-0">
                    {option.type === 'history' ? (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : option.icon ? (
                      option.icon
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {option.label}
                    </div>
                    {'description' in option && option.description && (
                      <div className="text-xs text-gray-500 truncate">
                        {'description' in option ? option.description : ''}
                      </div>
                    )}
                  </div>

                  {/* 分类标签 */}
                  {'category' in option && option.category && (
                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {'category' in option ? option.category : ''}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface PaginationProps {
  current: number
  total: number
  pageSize?: number
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: boolean | ((total: number, range: [number, number]) => string)
  size?: 'sm' | 'md' | 'lg'
  simple?: boolean
  disabled?: boolean
  hideOnSinglePage?: boolean
  pageSizeOptions?: number[]
  className?: string
  onChange?: (page: number, pageSize: number) => void
  onShowSizeChange?: (current: number, size: number) => void
}

export const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  pageSize = 10,
  showSizeChanger = false,
  showQuickJumper = false,
  showTotal = false,
  size = 'md',
  simple = false,
  disabled = false,
  hideOnSinglePage = false,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
  onChange,
  onShowSizeChange
}) => {
  const totalPages = Math.ceil(total / pageSize)
  const startItem = (current - 1) * pageSize + 1
  const endItem = Math.min(current * pageSize, total)

  // 如果只有一页且设置了隐藏，则不显示
  if (hideOnSinglePage && totalPages <= 1) {
    return null
  }

  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs min-w-8 h-8',
      input: 'px-2 py-1 text-xs h-8 w-16',
      select: 'px-2 py-1 text-xs h-8',
      text: 'text-xs'
    },
    md: {
      button: 'px-3 py-2 text-sm min-w-10 h-10',
      input: 'px-3 py-2 text-sm h-10 w-20',
      select: 'px-3 py-2 text-sm h-10',
      text: 'text-sm'
    },
    lg: {
      button: 'px-4 py-3 text-base min-w-12 h-12',
      input: 'px-4 py-3 text-base h-12 w-24',
      select: 'px-4 py-3 text-base h-12',
      text: 'text-base'
    }
  }

  const handlePageChange = (page: number) => {
    if (page === current || disabled || page < 1 || page > totalPages) return
    onChange?.(page, pageSize)
  }

  const handleSizeChange = (newSize: number) => {
    if (disabled) return
    const newPage = Math.ceil((current - 1) * pageSize / newSize) + 1
    onShowSizeChange?.(Math.min(newPage, Math.ceil(total / newSize)), newSize)
  }

  const handleQuickJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt((e.target as HTMLInputElement).value)
      if (page && page >= 1 && page <= totalPages) {
        handlePageChange(page)
        ;(e.target as HTMLInputElement).value = ''
      }
    }
  }

  // 计算显示的页码
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = simple ? 0 : 7

    if (totalPages <= maxVisible) {
      // 总页数少于最大显示数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 总页数多于最大显示数，使用省略号
      if (current <= 4) {
        // 当前页在前面
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (current >= totalPages - 3) {
        // 当前页在后面
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // 当前页在中间
        pages.push(1)
        pages.push('...')
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  const renderButton = (
    content: React.ReactNode,
    onClick: () => void,
    isActive: boolean = false,
    disabled: boolean = false
  ) => (
    <motion.button
      className={`
        ${sizeClasses[size].button} rounded-ios-lg border font-medium
        transition-all duration-200 flex items-center justify-center
        ${isActive
          ? 'bg-ios18-blue text-white border-ios18-blue shadow-ios-sm'
          : disabled
          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          : 'bg-white text-gray-700 border-gray-200 hover:border-ios18-blue hover:text-ios18-blue hover:shadow-ios-sm'
        }
      `}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled && !isActive ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isActive ? { scale: 0.98 } : {}}
    >
      {content}
    </motion.button>
  )

  const renderTotal = () => {
    if (!showTotal) return null

    const totalText = typeof showTotal === 'function' 
      ? showTotal(total, [startItem, endItem])
      : `共 ${total} 条，第 ${startItem}-${endItem} 条`

    return (
      <div className={`${sizeClasses[size].text} text-gray-600`}>
        {totalText}
      </div>
    )
  }

  // 简单模式
  if (simple) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {renderTotal()}
        <div className="flex items-center space-x-2">
          {renderButton(
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>,
            () => handlePageChange(current - 1),
            false,
            current <= 1 || disabled
          )}
          <span className={`${sizeClasses[size].text} text-gray-600 mx-3`}>
            {current} / {totalPages}
          </span>
          {renderButton(
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>,
            () => handlePageChange(current + 1),
            false,
            current >= totalPages || disabled
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {/* 总数显示 */}
      {renderTotal()}

      {/* 分页控件 */}
      <div className="flex items-center space-x-2">
        {/* 上一页 */}
        <motion.button
          key="prev-button"
          className={`
            ${sizeClasses[size].button} rounded-ios-lg border font-medium
            transition-all duration-200 flex items-center justify-center
            ${current <= 1 || disabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-700 border-gray-200 hover:border-ios18-blue hover:text-ios18-blue hover:shadow-ios-sm'
            }
          `}
          onClick={() => handlePageChange(current - 1)}
          disabled={current <= 1 || disabled}
          whileHover={current > 1 && !disabled ? { scale: 1.02 } : {}}
          whileTap={current > 1 && !disabled ? { scale: 0.98 } : {}}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>

        {/* 页码 */}
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className={`${sizeClasses[size].text} text-gray-400 px-2`}>
                •••
              </span>
            )
          }

          return (
            <motion.button
              key={`page-${page}`}
              className={`
                ${sizeClasses[size].button} rounded-ios-lg border font-medium
                transition-all duration-200 flex items-center justify-center
                ${page === current
                  ? 'bg-ios18-blue text-white border-ios18-blue shadow-ios-sm'
                  : disabled
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-ios18-blue hover:text-ios18-blue hover:shadow-ios-sm'
                }
              `}
              onClick={() => handlePageChange(page as number)}
              disabled={disabled}
              whileHover={!disabled && page !== current ? { scale: 1.02 } : {}}
              whileTap={!disabled && page !== current ? { scale: 0.98 } : {}}
            >
              {page}
            </motion.button>
          )
        })}

        {/* 下一页 */}
        <motion.button
          key="next-button"
          className={`
            ${sizeClasses[size].button} rounded-ios-lg border font-medium
            transition-all duration-200 flex items-center justify-center
            ${current >= totalPages || disabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-700 border-gray-200 hover:border-ios18-blue hover:text-ios18-blue hover:shadow-ios-sm'
            }
          `}
          onClick={() => handlePageChange(current + 1)}
          disabled={current >= totalPages || disabled}
          whileHover={current < totalPages && !disabled ? { scale: 1.02 } : {}}
          whileTap={current < totalPages && !disabled ? { scale: 0.98 } : {}}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>

      {/* 页面大小选择器 */}
      {showSizeChanger && (
        <div className="flex items-center space-x-2">
          <span className={`${sizeClasses[size].text} text-gray-600`}>每页</span>
          <select
            className={`
              ${sizeClasses[size].select} border border-gray-200 rounded-ios-lg
              bg-white text-gray-700 focus:border-ios18-blue focus:outline-none
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            value={pageSize}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            disabled={disabled}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className={`${sizeClasses[size].text} text-gray-600`}>条</span>
        </div>
      )}

      {/* 快速跳转 */}
      {showQuickJumper && (
        <div className="flex items-center space-x-2">
          <span className={`${sizeClasses[size].text} text-gray-600`}>跳至</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            className={`
              ${sizeClasses[size].input} border border-gray-200 rounded-ios-lg
              text-center focus:border-ios18-blue focus:outline-none
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            placeholder="页码"
            onKeyDown={handleQuickJump}
            disabled={disabled}
          />
          <span className={`${sizeClasses[size].text} text-gray-600`}>页</span>
        </div>
      )}
    </div>
  )
}

// 预设组件
export const SimplePagination: React.FC<Omit<PaginationProps, 'simple'>> = (props) => (
  <Pagination simple {...props} />
)

export const MiniPagination: React.FC<Omit<PaginationProps, 'size' | 'showSizeChanger' | 'showQuickJumper'>> = (props) => (
  <Pagination
    size="sm"
    showSizeChanger={false}
    showQuickJumper={false}
    {...props}
  />
)

export const FullPagination: React.FC<Omit<PaginationProps, 'showSizeChanger' | 'showQuickJumper' | 'showTotal'>> = (props) => (
  <Pagination
    showSizeChanger
    showQuickJumper
    showTotal
    {...props}
  />
)
'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface BreadcrumbItem {
  id: string
  label: string
  href?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode | string
  maxItems?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: (item: BreadcrumbItem, index: number) => void
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = '/',
  maxItems,
  size = 'md',
  className = '',
  onClick
}) => {
  const sizeClasses = {
    sm: {
      text: 'text-sm',
      separator: 'text-xs',
      padding: 'px-2 py-1'
    },
    md: {
      text: 'text-base',
      separator: 'text-sm',
      padding: 'px-3 py-2'
    },
    lg: {
      text: 'text-lg',
      separator: 'text-base',
      padding: 'px-4 py-3'
    }
  }

  // 处理超出最大显示数量的项目
  const processedItems = React.useMemo(() => {
    if (!maxItems || items.length <= maxItems) {
      return items
    }

    if (maxItems <= 2) {
      return [items[0], items[items.length - 1]]
    }

    const firstItem = items[0]
    const lastItems = items.slice(-(maxItems - 2))
    
    return [
      firstItem,
      { id: 'ellipsis', label: '...', disabled: true },
      ...lastItems
    ]
  }, [items, maxItems])

  const handleItemClick = (item: BreadcrumbItem, index: number) => {
    if (!item.disabled && onClick) {
      onClick(item, index)
    }
  }

  const defaultSeparator = (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )

  return (
    <nav className={`flex items-center space-x-1 ${className}`} aria-label="面包屑导航">
      {processedItems.map((item, index) => {
        const isLast = index === processedItems.length - 1
        const isClickable = !item.disabled && (item.href || onClick)
        const isEllipsis = item.id === 'ellipsis'

        return (
          <React.Fragment key={item.id}>
            {/* 面包屑项 */}
            <motion.div
              className={`
                flex items-center space-x-2 rounded-ios-lg transition-all duration-200
                ${sizeClasses[size].padding}
                ${isClickable ? sizeClasses[size].text : sizeClasses[size].text}
                ${isLast 
                  ? 'text-gray-900 font-medium' 
                  : isClickable 
                    ? 'text-ios18-blue hover:text-ios18-blue/80 hover:bg-ios18-blue/5 cursor-pointer' 
                    : 'text-gray-500'
                }
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => handleItemClick(item, index)}
              whileHover={isClickable ? { scale: 1.02 } : {}}
              whileTap={isClickable ? { scale: 0.98 } : {}}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* 图标 */}
              {item.icon && !isEllipsis && (
                <motion.div
                  className="flex-shrink-0"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.1 }}
                >
                  {item.icon}
                </motion.div>
              )}

              {/* 文本 */}
              <span className={`
                ${isEllipsis ? 'select-none' : ''}
                ${isLast ? 'font-medium' : ''}
                truncate max-w-32
              `}>
                {item.label}
              </span>
            </motion.div>

            {/* 分隔符 */}
            {!isLast && (
              <motion.div
                className={`flex-shrink-0 ${sizeClasses[size].separator} text-gray-400`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                {typeof separator === 'string' ? (
                  <span>{separator}</span>
                ) : separator || defaultSeparator}
              </motion.div>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

// 预设分隔符
export const BreadcrumbSeparators = {
  arrow: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  slash: <span>/</span>,
  dot: <span>•</span>,
  line: <span>|</span>,
  doubleArrow: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  )
}

// 预设组件
export const SimpleBreadcrumb: React.FC<Omit<BreadcrumbProps, 'separator'>> = (props) => (
  <Breadcrumb separator="/" {...props} />
)

export const ArrowBreadcrumb: React.FC<Omit<BreadcrumbProps, 'separator'>> = (props) => (
  <Breadcrumb separator={BreadcrumbSeparators.arrow} {...props} />
)

export const DotBreadcrumb: React.FC<Omit<BreadcrumbProps, 'separator'>> = (props) => (
  <Breadcrumb separator={BreadcrumbSeparators.dot} {...props} />
)
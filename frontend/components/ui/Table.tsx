'use client'

import React, { forwardRef, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'

// Table 根组件接口
export interface TableProps {
  children: ReactNode
  className?: string
  // 拖拽排序支持
  sortable?: boolean
  onDragEnd?: (event: any) => void
  sortableItems?: (string | number)[]
  // 空状态支持
  emptyState?: {
    icon?: ReactNode
    title?: string
    description?: string
  }
  // 加载状态
  loading?: boolean
  loadingText?: string
}

// TableHeader 接口
export interface TableHeaderProps {
  children: ReactNode
  className?: string
  sticky?: boolean
}

// TableBody 接口
export interface TableBodyProps {
  children: ReactNode
  className?: string
  sortable?: boolean
  sortableItems?: (string | number)[]
}

// TableRow 接口
export interface TableRowProps {
  children: ReactNode
  className?: string
  hover?: boolean
  // 动画支持
  animate?: boolean
  index?: number
  // 拖拽支持
  sortable?: boolean
  sortableId?: string | number
}

// TableCell 接口
export interface TableCellProps {
  children: ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
  // 特殊单元格类型
  type?: 'header' | 'data'
  // 固定列支持
  sticky?: 'left' | 'right'
  width?: string | number
}

// Table 根组件
export const Table = forwardRef<HTMLTableElement, TableProps>(({
  children,
  className = '',
  sortable = false,
  onDragEnd,
  sortableItems = [],
  emptyState,
  loading = false,
  loadingText = '加载中...',
  ...props
}, ref) => {
  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const tableContent = (
    <motion.table
      ref={ref}
      className={`w-full ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.table>
  )

  // 如果支持拖拽排序，包装在 DndContext 中
  if (sortable && onDragEnd) {
    return (
      <div className="relative">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          {tableContent}
        </DndContext>
        
        {/* 加载状态覆盖层 */}
        {loading && (
          <motion.div
            className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ios18-blue"></div>
              <span className="text-text-secondary text-sm">{loadingText}</span>
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      {tableContent}
      
      {/* 加载状态覆盖层 */}
      {loading && (
        <motion.div
          className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ios18-blue"></div>
            <span className="text-text-secondary text-sm">{loadingText}</span>
          </div>
        </motion.div>
      )}
    </div>
  )
})

// TableHeader 组件
export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(({
  children,
  className = '',
  sticky = true,
  ...props
}, ref) => {
  return (
    <thead
      ref={ref}
      className={`
        ${sticky ? 'sticky top-0 z-10' : ''}
        bg-gray-50/80 backdrop-blur-sm
        ${className}
      `}
      {...props}
    >
      {children}
    </thead>
  )
})

// TableBody 组件
export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(({
  children,
  className = '',
  sortable = false,
  sortableItems = [],
  ...props
}, ref) => {
  if (sortable && sortableItems.length > 0) {
    return (
      <SortableContext 
        items={sortableItems} 
        strategy={verticalListSortingStrategy}
      >
        <tbody
          ref={ref}
          className={`divide-y divide-gray-200 ${className}`}
          {...props}
        >
          {children}
        </tbody>
      </SortableContext>
    )
  }

  return (
    <tbody
      ref={ref}
      className={`divide-y divide-gray-200 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  )
})

// TableRow 组件
export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(({
  children,
  className = '',
  hover = true,
  animate = true,
  index = 0,
  sortable = false,
  sortableId,
  ...props
}, ref) => {
  const baseClasses = `
    ${hover ? 'hover:bg-gray-50/50 transition-colors' : ''}
    ${className}
  `

  if (animate) {
    return (
      <motion.tr
        ref={ref}
        className={baseClasses}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        {...props}
      >
        {children}
      </motion.tr>
    )
  }

  return (
    <tr
      ref={ref}
      className={baseClasses}
      {...props}
    >
      {children}
    </tr>
  )
})

// TableCell 组件
export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(({
  children,
  className = '',
  align = 'left',
  type = 'data',
  sticky,
  width,
  ...props
}, ref) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }

  const stickyClasses = sticky ? {
    left: 'sticky left-0 bg-white z-20',
    right: 'sticky right-0 bg-white z-20'
  }[sticky] : ''

  const baseClasses = type === 'header' 
    ? `px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${alignClasses[align]}`
    : `px-4 py-4 text-sm ${alignClasses[align]}`

  const style = width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined

  if (type === 'header') {
    return (
      <th
        ref={ref as any}
        className={`${baseClasses} ${stickyClasses} ${className}`}
        style={style}
        {...(props as any)}
      >
        {children}
      </th>
    )
  }

  return (
    <td
      ref={ref as any}
      className={`${baseClasses} ${stickyClasses} ${className}`}
      style={style}
      {...(props as any)}
    >
      {children}
    </td>
  )
})

// TableContainer 组件 - 提供表格外层容器样式
export interface TableContainerProps {
  children?: ReactNode
  className?: string
  title?: string
  description?: string
  actions?: ReactNode
  emptyState?: {
    icon?: ReactNode
    title?: string
    description?: string
  }
  showEmptyState?: boolean
}

export const TableContainer = forwardRef<HTMLDivElement, TableContainerProps>(({
  children,
  className = '',
  title,
  description,
  actions,
  emptyState,
  showEmptyState = false,
  ...props
}, ref) => {
  return (
    <div 
      ref={ref}
      className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col ${className}`}
      {...props}
    >
      {/* 标题栏 */}
      {(title || description || actions) && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-xl font-semibold text-text-primary">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-text-secondary text-sm mt-1">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 表格内容区域 */}
      <div className="flex-1 overflow-auto">
        {showEmptyState && emptyState ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              {emptyState.icon || (
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )}
              <p className="text-gray-500 text-lg">
                {emptyState.title || '暂无数据'}
              </p>
              {emptyState.description && (
                <p className="text-gray-400 text-sm mt-2">
                  {emptyState.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
})

// 导出组件名称设置
Table.displayName = 'Table'
TableHeader.displayName = 'TableHeader'
TableBody.displayName = 'TableBody'
TableRow.displayName = 'TableRow'
TableCell.displayName = 'TableCell'
TableContainer.displayName = 'TableContainer'
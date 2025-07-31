'use client'

import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TableRow, type TableRowProps } from './Table'

export interface SortableTableRowProps extends Omit<TableRowProps, 'sortable' | 'sortableId'> {
  id: string | number
  // 拖拽手柄配置
  dragHandle?: {
    icon?: React.ReactNode
    position?: 'left' | 'right'
    title?: string
  }
  // 拖拽状态样式
  draggingStyle?: string
}

export const SortableTableRow = forwardRef<HTMLTableRowElement, SortableTableRowProps>(({
  id,
  children,
  className = '',
  dragHandle,
  draggingStyle = 'opacity-50 z-50',
  ...props
}, ref) => {
  const [isMounted, setIsMounted] = React.useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  // 确保只在客户端挂载后才添加拖拽属性
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // 默认拖拽图标
  const defaultDragIcon = (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h.01M8 10h.01M8 14h.01M8 18h.01M16 6h.01M16 10h.01M16 14h.01M16 18h.01" />
    </svg>
  )

  // 合并引用
  const combinedRef = (node: HTMLTableRowElement) => {
    setNodeRef(node)
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }

  // 确保水合一致性：避免客户端和服务端的属性差异
  const rowProps = React.useMemo(() => {
    const baseProps = {
      ref: combinedRef,
      style,
      className: `${className} ${isDragging ? draggingStyle : ''}`.trim(),
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3 },
      ...props
    }

    // 只在客户端挂载后添加拖拽属性
    if (isMounted) {
      return { ...baseProps, ...attributes }
    }

    return baseProps
  }, [combinedRef, style, className, isDragging, draggingStyle, props, attributes, isMounted])

  return (
    <motion.tr {...rowProps}>
      {/* 如果有拖拽手柄配置，渲染拖拽手柄 */}
      {dragHandle && (
        <td className="px-4 py-4">
          <div className="flex items-center space-x-2">
            <div 
              {...(isMounted ? listeners : {})}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
              title={dragHandle.title || '拖拽排序'}
            >
              {dragHandle.icon || defaultDragIcon}
            </div>
          </div>
        </td>
      )}
      
      {children}
    </motion.tr>
  )
})

SortableTableRow.displayName = 'SortableTableRow'
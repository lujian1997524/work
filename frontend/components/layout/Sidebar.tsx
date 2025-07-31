'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../ui'

export interface SidebarItem {
  id: string
  label: string
  icon?: React.ReactNode
  active?: boolean
  onClick?: () => void
  children?: SidebarItem[]
}

export interface SidebarProps {
  items: SidebarItem[]
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  collapsed = false,
  onToggleCollapse,
  className = ''
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const paddingLeft = collapsed ? 'pl-3' : `pl-${3 + level * 4}`

    return (
      <div key={item.id} className="mb-1">
        <motion.div
          className={`
            flex items-center ${paddingLeft} pr-3 py-2 rounded-ios-md
            transition-all duration-200 cursor-pointer
            ${item.active 
              ? 'bg-ios18-blue text-white shadow-ios-sm' 
              : 'text-text-primary hover:bg-macos15-control'
            }
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id)
            }
            item.onClick?.()
          }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          {item.icon && (
            <div className="w-5 h-5 mr-3 flex-shrink-0">
              {item.icon}
            </div>
          )}
          
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                className="flex-1 text-sm font-medium"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          
          {hasChildren && !collapsed && (
            <motion.div
              className="w-4 h-4 flex-shrink-0"
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▶
            </motion.div>
          )}
        </motion.div>

        {/* 子项目 */}
        <AnimatePresence>
          {hasChildren && isExpanded && !collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-2 border-l border-macos15-separator"
            >
              {item.children?.map(child => renderSidebarItem(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <motion.div
      className={`${className}`}
      animate={{ width: collapsed ? '64px' : '150px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <Card className="h-full" padding="md" glass={true}>
        {/* 折叠按钮 */}
        {onToggleCollapse && (
          <motion.button
            className="w-full mb-4 p-2 rounded-ios-md hover:bg-macos15-control transition-colors"
            onClick={onToggleCollapse}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="w-5 h-5 mx-auto text-text-secondary"
            >
              ◀
            </motion.div>
          </motion.button>
        )}

        {/* 侧边栏项目 */}
        <div className="space-y-1">
          {items.map(item => renderSidebarItem(item))}
        </div>
      </Card>
    </motion.div>
  )
}
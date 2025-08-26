'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface TreeNode {
  id: string
  label: string
  icon?: React.ReactNode
  children?: TreeNode[]
  disabled?: boolean
  selectable?: boolean
  checkable?: boolean
  checked?: boolean
  expanded?: boolean
  data?: any
}

export interface TreeProps {
  data: TreeNode[]
  selectable?: boolean
  checkable?: boolean
  showLine?: boolean
  showIcon?: boolean
  defaultExpandAll?: boolean
  defaultCheckedKeys?: string[]
  defaultSelectedKeys?: string[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onSelect?: (keys: string[], node: TreeNode) => void
  onCheck?: (keys: string[], node: TreeNode) => void
  onExpand?: (keys: string[], node: TreeNode) => void
}

export const Tree: React.FC<TreeProps> = ({
  data,
  selectable = true,
  checkable = false,
  showLine = true,
  showIcon = true,
  defaultExpandAll = false,
  defaultCheckedKeys = [],
  defaultSelectedKeys = [],
  size = 'md',
  className = '',
  onSelect,
  onCheck,
  onExpand
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    if (defaultExpandAll) {
      const keys = new Set<string>()
      const collectAllKeys = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            keys.add(node.id)
            collectAllKeys(node.children)
          }
        })
      }
      collectAllKeys(data)
      return keys
    }
    return new Set()
  })

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(defaultSelectedKeys)
  )
  
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(
    new Set(defaultCheckedKeys)
  )

  const sizeClasses = {
    sm: {
      text: 'text-sm',
      icon: 'w-4 h-4',
      checkbox: 'w-3 h-3',
      padding: 'py-1 px-2',
      indent: 'ml-4'
    },
    md: {
      text: 'text-base',
      icon: 'w-5 h-5',
      checkbox: 'w-4 h-4',
      padding: 'py-2 px-3',
      indent: 'ml-6'
    },
    lg: {
      text: 'text-lg',
      icon: 'w-6 h-6',
      checkbox: 'w-5 h-5',
      padding: 'py-3 px-4',
      indent: 'ml-8'
    }
  }

  const handleExpand = (node: TreeNode) => {
    const newExpandedKeys = new Set(expandedKeys)
    if (expandedKeys.has(node.id)) {
      newExpandedKeys.delete(node.id)
    } else {
      newExpandedKeys.add(node.id)
    }
    setExpandedKeys(newExpandedKeys)
    onExpand?.(Array.from(newExpandedKeys), node)
  }

  const handleSelect = (node: TreeNode) => {
    if (!selectable || node.disabled || !node.selectable) return
    
    const newSelectedKeys = new Set([node.id])
    setSelectedKeys(newSelectedKeys)
    onSelect?.(Array.from(newSelectedKeys), node)
  }

  const handleCheck = (node: TreeNode) => {
    if (!checkable || node.disabled) return
    
    const newCheckedKeys = new Set(checkedKeys)
    if (checkedKeys.has(node.id)) {
      newCheckedKeys.delete(node.id)
    } else {
      newCheckedKeys.add(node.id)
    }
    setCheckedKeys(newCheckedKeys)
    onCheck?.(Array.from(newCheckedKeys), node)
  }

  const defaultFolderIcon = (expanded: boolean) => (
    <svg className={sizeClasses[size].icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {expanded ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      )}
    </svg>
  )

  const defaultFileIcon = (
    <svg className={sizeClasses[size].icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedKeys.has(node.id)
    const isSelected = selectedKeys.has(node.id)
    const isChecked = checkedKeys.has(node.id)

    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* 节点内容 */}
        <div
          className={`
            flex items-center ${sizeClasses[size].padding} rounded-ios-lg
            transition-all duration-200 cursor-pointer
            ${isSelected ? 'bg-ios18-blue/10 text-ios18-blue' : 'hover:bg-gray-50 text-gray-700'}
            ${node.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
          onClick={() => handleSelect(node)}
        >
          {/* 展开/收起按钮 */}
          {hasChildren ? (
            <motion.button
              className="mr-2 p-1 hover:bg-gray-200 rounded"
              onClick={(e) => {
                e.stopPropagation()
                handleExpand(node)
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </motion.svg>
            </motion.button>
          ) : (
            <div className="w-6 h-6 mr-2" />
          )}

          {/* 复选框 */}
          {checkable && (
            <motion.button
              className={`
                mr-3 flex items-center justify-center border-2 rounded
                ${sizeClasses[size].checkbox}
                ${isChecked 
                  ? 'bg-ios18-blue border-ios18-blue text-white' 
                  : 'border-gray-300 hover:border-ios18-blue'
                }
              `}
              onClick={(e) => {
                e.stopPropagation()
                handleCheck(node)
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isChecked && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </motion.button>
          )}

          {/* 图标 */}
          {showIcon && (
            <div className="mr-3 text-gray-500">
              {node.icon 
                ? node.icon 
                : hasChildren 
                  ? defaultFolderIcon(isExpanded)
                  : defaultFileIcon
              }
            </div>
          )}

          {/* 标签 */}
          <span className={`${sizeClasses[size].text} font-medium truncate`}>
            {node.label}
          </span>
        </div>

        {/* 子节点 */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* 连接线 */}
              {showLine && level >= 0 && (
                <div 
                  className="border-l border-gray-200 ml-3"
                  style={{ marginLeft: `${level * 24 + 24}px` }}
                >
                  {node.children!.map(child => (
                    <div key={child.id} className="relative">
                      {renderNode(child, level + 1)}
                    </div>
                  ))}
                </div>
              )}
              {!showLine && (
                <>
                  {node.children!.map(child => renderNode(child, level + 1))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <div className={`tree-component ${className}`}>
      {data.map(node => renderNode(node))}
    </div>
  )
}

// 预设组件
export const FileTree: React.FC<Omit<TreeProps, 'checkable' | 'showIcon'>> = (props) => (
  <Tree checkable={false} showIcon={true} {...props} />
)

export const CheckableTree: React.FC<Omit<TreeProps, 'checkable'>> = (props) => (
  <Tree checkable={true} {...props} />
)

export const SimpleTree: React.FC<Omit<TreeProps, 'showLine' | 'showIcon'>> = (props) => (
  <Tree showLine={false} showIcon={false} {...props} />
)
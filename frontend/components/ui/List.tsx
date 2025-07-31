'use client'

import React, { forwardRef, ReactNode, HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

// List 根组件接口
export interface ListProps {
  children: ReactNode
  className?: string
  // 列表样式
  variant?: 'default' | 'bordered' | 'divider' | 'card'
  size?: 'sm' | 'md' | 'lg'
  // 列表布局
  direction?: 'vertical' | 'horizontal'
  // 动画
  animate?: boolean
  staggerChildren?: number
  // 基础HTML属性
  id?: string
  role?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

// ListItem 组件接口
export interface ListItemProps {
  children?: ReactNode
  className?: string
  // 项目内容
  title?: string
  subtitle?: string
  description?: string
  // 项目图标和缩略图
  icon?: ReactNode
  avatar?: ReactNode
  thumbnail?: ReactNode
  // 项目状态
  disabled?: boolean
  active?: boolean
  // 项目操作
  clickable?: boolean
  href?: string
  target?: string
  onClick?: () => void
  // 右侧内容
  extra?: ReactNode
  arrow?: boolean
  // 动画
  index?: number
  // 基础HTML属性
  id?: string
  role?: string
  'aria-label'?: string
}

// ListGroup 组件接口
export interface ListGroupProps {
  children: ReactNode
  className?: string
  title?: string
  description?: string
  // 分组样式
  collapsible?: boolean
  defaultCollapsed?: boolean
}

// ListAction 组件接口
export interface ListActionProps {
  children: ReactNode
  className?: string
  // 操作样式
  variant?: 'default' | 'primary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  // 操作行为
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
}

// List 根组件
export const List = forwardRef<HTMLUListElement, ListProps>(({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  direction = 'vertical',
  animate = true,
  staggerChildren = 0.05,
  id,
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}, ref) => {
  const variantClasses = {
    default: '',
    bordered: 'border border-gray-200 rounded-ios-lg overflow-hidden',
    divider: 'divide-y divide-gray-200',
    card: 'bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg overflow-hidden'
  }

  const directionClasses = {
    vertical: 'space-y-0',
    horizontal: 'flex flex-wrap gap-4'
  }

  // 分离motion属性和html属性
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: animate ? staggerChildren : 0
      }
    }
  }

  // 安全的HTML属性
  const htmlProps = {
    id,
    role,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
  }

  if (animate) {
    return (
      <motion.ul
        ref={ref}
        className={`
          ${variantClasses[variant]}
          ${directionClasses[direction]}
          ${className}
        `}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        {...htmlProps}
      >
        {children}
      </motion.ul>
    )
  }

  return (
    <ul
      ref={ref}
      className={`
        ${variantClasses[variant]}
        ${directionClasses[direction]}
        ${className}
      `}
      {...htmlProps}
    >
      {children}
    </ul>
  )
})

// ListItem 组件
export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(({
  children,
  className = '',
  title,
  subtitle,
  description,
  icon,
  avatar,
  thumbnail,
  disabled = false,
  active = false,
  clickable = false,
  href,
  target,
  onClick,
  extra,
  arrow = false,
  index = 0,
  ...props
}, ref) => {
  const isInteractive = clickable || href || onClick
  const Component = href ? 'a' : 'li'

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  const baseClasses = `
    flex items-center gap-3 px-4 py-3 transition-all duration-200
    ${isInteractive && !disabled ? 'cursor-pointer hover:bg-gray-50/50' : ''}
    ${active ? 'bg-ios18-blue/10 border-l-4 border-ios18-blue' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
    }
  }

  const renderContent = () => (
    <>
      {/* 左侧图标/头像/缩略图 */}
      {(icon || avatar || thumbnail) && (
        <div className="flex-shrink-0">
          {avatar && (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {avatar}
            </div>
          )}
          {thumbnail && (
            <div className="w-12 h-12 rounded-ios-md overflow-hidden bg-gray-200 flex items-center justify-center">
              {thumbnail}
            </div>
          )}
          {icon && !avatar && !thumbnail && (
            <div className="w-6 h-6 flex items-center justify-center text-text-secondary">
              {icon}
            </div>
          )}
        </div>
      )}

      {/* 主要内容 */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="text-sm font-medium text-text-primary truncate">
            {title}
          </div>
        )}
        {subtitle && (
          <div className="text-xs text-text-secondary truncate mt-1">
            {subtitle}
          </div>
        )}
        {description && (
          <div className="text-xs text-text-tertiary mt-1 line-clamp-2">
            {description}
          </div>
        )}
        {!title && !subtitle && !description && children}
      </div>

      {/* 右侧额外内容 */}
      {(extra || arrow) && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {extra}
          {arrow && (
            <ChevronRightIcon className="w-4 h-4 text-text-tertiary" />
          )}
        </div>
      )}
    </>
  )

  return (
    <motion.li
      variants={itemVariants}
      className={baseClasses}
      onClick={handleClick}
      {...(href ? { as: 'a', href, target } : {})}
      {...props}
      ref={ref as any}
    >
      {renderContent()}
    </motion.li>
  )
})

// ListGroup 组件
export const ListGroup = forwardRef<HTMLDivElement, ListGroupProps>(({
  children,
  className = '',
  title,
  description,
  collapsible = false,
  defaultCollapsed = false,
  ...props
}, ref) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  return (
    <div
      ref={ref}
      className={`space-y-2 ${className}`}
      {...props}
    >
      {/* 分组标题 */}
      {(title || description) && (
        <div
          className={`px-4 py-2 ${collapsible ? 'cursor-pointer' : ''}`}
          onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-sm font-medium text-text-primary">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-text-secondary mt-1">
                  {description}
                </p>
              )}
            </div>
            {collapsible && (
              <ChevronRightIcon 
                className={`w-4 h-4 text-text-secondary transition-transform ${
                  isCollapsed ? '' : 'rotate-90'
                }`} 
              />
            )}
          </div>
        </div>
      )}

      {/* 分组内容 */}
      {(!collapsible || !isCollapsed) && (
        <motion.div
          initial={collapsible ? { height: 0, opacity: 0 } : undefined}
          animate={collapsible ? { height: 'auto', opacity: 1 } : undefined}
          exit={collapsible ? { height: 0, opacity: 0 } : undefined}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}
    </div>
  )
})

// ListAction 组件
export const ListAction = forwardRef<HTMLButtonElement, ListActionProps>(({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  ...props
}, ref) => {
  const variantClasses = {
    default: 'text-text-secondary hover:text-text-primary',
    primary: 'text-ios18-blue hover:text-blue-600',
    danger: 'text-status-error hover:text-red-600'
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }

  return (
    <button
      ref={ref}
      className={`
        transition-colors duration-200 rounded-ios-sm
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-current" />
          {children}
        </div>
      ) : (
        children
      )}
    </button>
  )
})

// ListContainer 组件 - 提供列表外层容器样式
export interface ListContainerProps {
  children: ReactNode
  className?: string
  title?: string
  description?: string
  actions?: ReactNode
  // 容器样式
  variant?: 'card' | 'plain' | 'glass'
  // 空状态
  emptyState?: {
    icon?: ReactNode
    title?: string
    description?: string
    action?: ReactNode
  }
  showEmptyState?: boolean
}

export const ListContainer = forwardRef<HTMLDivElement, ListContainerProps>(({
  children,
  className = '',
  title,
  description,
  actions,
  variant = 'card',
  emptyState,
  showEmptyState = false,
  ...props
}, ref) => {
  const variantClasses = {
    card: 'bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg overflow-hidden',
    plain: 'bg-transparent',
    glass: 'bg-bg-glass backdrop-blur-glass border border-white border-opacity-20 rounded-2xl overflow-hidden'
  }

  return (
    <div 
      ref={ref}
      className={`${variantClasses[variant]} ${className}`}
      {...props}
    >
      {/* 列表标题栏 */}
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

      {/* 列表内容区域 */}
      {showEmptyState && emptyState ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            {emptyState.icon || (
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )}
            <p className="text-gray-500 text-lg mb-2">
              {emptyState.title || '暂无数据'}
            </p>
            {emptyState.description && (
              <p className="text-gray-400 text-sm mb-4">
                {emptyState.description}
              </p>
            )}
            {emptyState.action}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  )
})

// 导出组件名称设置
List.displayName = 'List'
ListItem.displayName = 'ListItem'
ListGroup.displayName = 'ListGroup'
ListAction.displayName = 'ListAction'
ListContainer.displayName = 'ListContainer'
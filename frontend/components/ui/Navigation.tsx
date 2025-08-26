'use client'

import React, { forwardRef, ReactNode, HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

// Navigation 根组件接口
export interface NavigationProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  className?: string
  // 导航样式
  variant?: 'sidebar' | 'horizontal' | 'breadcrumb' | 'tabs'
  size?: 'sm' | 'md' | 'lg'
  // 导航行为
  collapsible?: boolean
  defaultCollapsed?: boolean
}

// NavigationItem 组件接口
export interface NavigationItemProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode
  className?: string
  // 项目内容
  title: string
  subtitle?: string
  icon?: ReactNode
  badge?: ReactNode
  // 项目状态
  active?: boolean
  disabled?: boolean
  // 项目行为
  href?: string
  target?: string
  onClick?: () => void
  // 子导航
  hasChildren?: boolean
  defaultExpanded?: boolean
  // 动画
  index?: number
}

// NavigationGroup 组件接口
export interface NavigationGroupProps {
  children: ReactNode
  className?: string
  title?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
}

// NavigationDivider 组件接口
export interface NavigationDividerProps {
  className?: string
  title?: string
}

// Navigation 根组件
export const Navigation = forwardRef<HTMLElement, NavigationProps>(({
  children,
  className = '',
  variant = 'sidebar',
  size = 'md',
  collapsible = false,
  defaultCollapsed = false,
  ...props
}, ref) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  const variantClasses = {
    sidebar: 'flex flex-col space-y-1',
    horizontal: 'flex flex-row space-x-1',
    breadcrumb: 'flex flex-row items-center space-x-2',
    tabs: 'flex flex-row border-b border-gray-200'
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <nav
      ref={ref}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isCollapsed ? 'collapsed' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </nav>
  )
})

// NavigationItem 组件
export const NavigationItem = forwardRef<HTMLElement, NavigationItemProps>(({
  children,
  className = '',
  title,
  subtitle,
  icon,
  badge,
  active = false,
  disabled = false,
  href,
  target,
  onClick,
  hasChildren = false,
  defaultExpanded = false,
  index = 0,
  ...props
}, ref) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  const Component = href ? 'a' : 'div'

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, delay: index * 0.05 }
    }
  }

  const handleClick = () => {
    if (disabled) return
    
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
    
    if (onClick) {
      onClick()
    }
  }

  const baseClasses = `
    flex items-center justify-between px-3 py-2 rounded-ios-md transition-all duration-200 cursor-pointer
    ${active ? 'bg-ios18-blue text-white shadow-md' : 'text-text-primary hover:bg-gray-100'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="space-y-1"
    >
      <Component
        ref={ref as any}
        className={baseClasses}
        onClick={handleClick}
        {...(href ? { href, target } : {})}
        {...props}
      >
        {/* 左侧内容 */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <span className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-text-secondary'}`}>
              {icon}
            </span>
          )}
          
          <div className="flex-1 min-w-0">
            <div className={`font-medium truncate ${active ? 'text-white' : 'text-text-primary'}`}>
              {title}
            </div>
            {subtitle && (
              <div className={`text-xs truncate mt-1 ${active ? 'text-white/80' : 'text-text-secondary'}`}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex items-center gap-2">
          {badge && (
            <span className="flex-shrink-0">
              {badge}
            </span>
          )}
          
          {hasChildren && (
            <ChevronRightIcon 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''} ${
                active ? 'text-white' : 'text-text-secondary'
              }`}
            />
          )}
        </div>
      </Component>

      {/* 子导航 */}
      {hasChildren && children && (
        <motion.div
          initial={false}
          animate={{ 
            height: isExpanded ? 'auto' : 0,
            opacity: isExpanded ? 1 : 0
          }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="ml-8 space-y-1 border-l border-gray-200 pl-4">
            {children}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
})

// NavigationGroup 组件
export const NavigationGroup = forwardRef<HTMLDivElement, NavigationGroupProps>(({
  children,
  className = '',
  title,
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
      {title && (
        <div
          className={`px-3 py-2 flex items-center justify-between ${
            collapsible ? 'cursor-pointer hover:bg-gray-50 rounded-ios-md' : ''
          }`}
          onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        >
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {title}
          </h3>
          {collapsible && (
            <ChevronDownIcon 
              className={`w-4 h-4 text-text-secondary transition-transform ${
                isCollapsed ? '-rotate-90' : ''
              }`}
            />
          )}
        </div>
      )}

      {/* 分组内容 */}
      {(!collapsible || !isCollapsed) && (
        <motion.div
          initial={collapsible ? { height: 0, opacity: 0 } : undefined}
          animate={collapsible ? { height: 'auto', opacity: 1 } : undefined}
          exit={collapsible ? { height: 0, opacity: 0 } : undefined}
          transition={{ duration: 0.3 }}
          className="space-y-1"
        >
          {children}
        </motion.div>
      )}
    </div>
  )
})

// NavigationDivider 组件
export const NavigationDivider = forwardRef<HTMLDivElement, NavigationDividerProps>(({
  className = '',
  title,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`my-3 ${className}`}
      {...props}
    >
      {title ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs font-medium text-text-secondary px-2">
            {title}
          </span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>
      ) : (
        <div className="h-px bg-gray-200"></div>
      )}
    </div>
  )
})

// Tab 导航组件
export interface TabNavigationProps {
  items: Array<{
    key: string
    title: string
    icon?: ReactNode
    badge?: ReactNode
    disabled?: boolean
  }>
  activeKey?: string
  onChange?: (key: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const TabNavigation = forwardRef<HTMLDivElement, TabNavigationProps>(({
  items,
  activeKey,
  onChange,
  className = '',
  size = 'md',
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'text-sm px-3 py-2',
    md: 'text-base px-4 py-3',
    lg: 'text-lg px-5 py-4'
  }

  return (
    <div
      ref={ref}
      className={`flex border-b border-gray-200 ${className}`}
      {...props}
    >
      {items.map(item => (
        <button
          key={item.key}
          className={`
            flex items-center gap-2 border-b-2 transition-all duration-200
            ${sizeClasses[size]}
            ${activeKey === item.key 
              ? 'border-ios18-blue text-ios18-blue' 
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
            }
            ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => !item.disabled && onChange?.(item.key)}
          disabled={item.disabled}
        >
          {item.icon && (
            <span className="w-4 h-4">
              {item.icon}
            </span>
          )}
          {item.title}
          {item.badge && (
            <span className="ml-1">
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
})

// 导出组件名称设置
Navigation.displayName = 'Navigation'
NavigationItem.displayName = 'NavigationItem'
NavigationGroup.displayName = 'NavigationGroup'
NavigationDivider.displayName = 'NavigationDivider'
TabNavigation.displayName = 'TabNavigation'
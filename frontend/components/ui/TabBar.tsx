'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  badge?: number
  content?: React.ReactNode
}

export interface TabBarProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline' | 'cards'
  size?: 'sm' | 'md' | 'lg'
  centered?: boolean
  fullWidth?: boolean
  className?: string
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  centered = false,
  fullWidth = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  }

  const renderTab = (tab: TabItem, index: number) => {
    const isActive = tab.id === activeTab
    
    const handleClick = () => {
      if (!tab.disabled) {
        onChange(tab.id)
      }
    }

    // 默认样式
    if (variant === 'default') {
      return (
        <motion.button
          key={tab.id}
          onClick={handleClick}
          className={`
            ${sizeClasses[size]} relative
            font-medium transition-all duration-200
            ${fullWidth ? 'flex-1' : ''}
            ${isActive 
              ? 'text-ios18-blue' 
              : tab.disabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-900'
            }
          `}
          whileHover={tab.disabled ? {} : { scale: 1.02 }}
          whileTap={tab.disabled ? {} : { scale: 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {tab.icon && (
              <span className={size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
          
          {/* 下划线指示器 */}
          {isActive && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-ios18-blue rounded-full"
              layoutId="activeIndicator"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </motion.button>
      )
    }

    // 药丸样式
    if (variant === 'pills') {
      return (
        <motion.button
          key={tab.id}
          onClick={handleClick}
          className={`
            ${sizeClasses[size]} relative
            font-medium rounded-ios-xl transition-all duration-200
            ${fullWidth ? 'flex-1' : ''}
            ${isActive 
              ? 'text-white bg-ios18-blue shadow-ios-md' 
              : tab.disabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }
          `}
          whileHover={tab.disabled ? {} : { scale: 1.02 }}
          whileTap={tab.disabled ? {} : { scale: 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
              }`}>
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
        </motion.button>
      )
    }

    // 下划线样式
    if (variant === 'underline') {
      return (
        <motion.button
          key={tab.id}
          onClick={handleClick}
          className={`
            ${sizeClasses[size]} relative
            font-medium transition-all duration-200
            border-b-2 border-transparent
            ${fullWidth ? 'flex-1' : ''}
            ${isActive 
              ? 'text-ios18-blue border-ios18-blue' 
              : tab.disabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }
          `}
          whileHover={tab.disabled ? {} : { y: -1 }}
          whileTap={tab.disabled ? {} : { y: 0 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
        </motion.button>
      )
    }

    // 卡片样式
    if (variant === 'cards') {
      return (
        <motion.button
          key={tab.id}
          onClick={handleClick}
          className={`
            ${sizeClasses[size]} relative
            font-medium rounded-ios-lg transition-all duration-200
            border
            ${fullWidth ? 'flex-1' : ''}
            ${isActive 
              ? 'text-ios18-blue bg-ios18-blue/10 border-ios18-blue shadow-ios-sm' 
              : tab.disabled 
                ? 'text-gray-400 cursor-not-allowed border-gray-200' 
                : 'text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }
          `}
          whileHover={tab.disabled ? {} : { scale: 1.02 }}
          whileTap={tab.disabled ? {} : { scale: 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
        </motion.button>
      )
    }

    return null
  }

  return (
    <div className={className}>
      {/* 标签栏 */}
      <div className={`
        flex border-b border-gray-200
        ${centered ? 'justify-center' : ''}
        ${fullWidth ? 'w-full' : ''}
        ${variant === 'pills' || variant === 'cards' ? 'space-x-2 border-b-0 p-1 bg-gray-100 rounded-ios-xl' : ''}
      `}>
        {tabs.map(renderTab)}
      </div>
    </div>
  )
}

// 带内容的 Tabs 组件
export interface TabsProps extends TabBarProps {
  children?: React.ReactNode
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  children,
  ...tabBarProps
}) => {
  const activeTabData = tabs.find(tab => tab.id === activeTab)

  return (
    <div className={tabBarProps.className}>
      <TabBar 
        {...tabBarProps}
        tabs={tabs}
        activeTab={activeTab}
        onChange={onChange}
        className=""
      />
      
      {/* 内容区域 */}
      <motion.div
        key={activeTab}
        className="mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTabData?.content || children}
      </motion.div>
    </div>
  )
}
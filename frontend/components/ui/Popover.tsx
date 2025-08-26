'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

export interface PopoverProps {
  children: React.ReactNode
  content: React.ReactNode
  title?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
  trigger?: 'hover' | 'click' | 'focus' | 'manual'
  visible?: boolean
  onVisibleChange?: (visible: boolean) => void
  width?: number | string
  className?: string
  overlayClassName?: string
  arrow?: boolean
  closable?: boolean
}

export const Popover: React.FC<PopoverProps> = ({
  children,
  content,
  title,
  placement = 'bottom',
  trigger = 'click',
  visible,
  onVisibleChange,
  width = 'auto',
  className = '',
  overlayClassName = '',
  arrow = true,
  closable = true
}) => {
  const [internalVisible, setInternalVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const isVisible = visible !== undefined ? visible : internalVisible

  // 计算弹出框位置
  const calculatePosition = () => {
    if (!triggerRef.current || !popoverRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const popoverRect = popoverRef.current.getBoundingClientRect()
    const scrollX = window.pageXOffset
    const scrollY = window.pageYOffset

    let x = 0
    let y = 0

    switch (placement) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2
        y = triggerRect.top - popoverRect.height - 12
        break
      case 'top-start':
        x = triggerRect.left
        y = triggerRect.top - popoverRect.height - 12
        break
      case 'top-end':
        x = triggerRect.right - popoverRect.width
        y = triggerRect.top - popoverRect.height - 12
        break
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2
        y = triggerRect.bottom + 12
        break
      case 'bottom-start':
        x = triggerRect.left
        y = triggerRect.bottom + 12
        break
      case 'bottom-end':
        x = triggerRect.right - popoverRect.width
        y = triggerRect.bottom + 12
        break
      case 'left':
        x = triggerRect.left - popoverRect.width - 12
        y = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2
        break
      case 'right':
        x = triggerRect.right + 12
        y = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2
        break
    }

    // 边界检测
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (x < 8) x = 8
    if (x + popoverRect.width > viewportWidth - 8) x = viewportWidth - popoverRect.width - 8
    if (y < 8) y = 8
    if (y + popoverRect.height > viewportHeight - 8) y = viewportHeight - popoverRect.height - 8

    setPosition({ x: x + scrollX, y: y + scrollY })
  }

  // 显示弹出框
  const showPopover = () => {
    setInternalVisible(true)
    onVisibleChange?.(true)
  }

  // 隐藏弹出框
  const hidePopover = () => {
    setInternalVisible(false)
    onVisibleChange?.(false)
  }

  // 事件处理
  const handleMouseEnter = () => {
    if (trigger === 'hover') showPopover()
  }

  const handleMouseLeave = () => {
    if (trigger === 'hover') hidePopover()
  }

  const handleClick = () => {
    if (trigger === 'click') {
      if (isVisible) {
        hidePopover()
      } else {
        showPopover()
      }
    }
  }

  const handleFocus = () => {
    if (trigger === 'focus') showPopover()
  }

  const handleBlur = () => {
    if (trigger === 'focus') hidePopover()
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isVisible &&
        popoverRef.current &&
        triggerRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        hidePopover()
      }
    }

    if (trigger === 'click' || trigger === 'focus') {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible, trigger])

  // 位置更新
  useEffect(() => {
    if (isVisible) {
      calculatePosition()
      
      const handleResize = () => calculatePosition()
      const handleScroll = () => calculatePosition()
      
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [isVisible, placement])

  // 获取箭头样式
  const getArrowStyle = () => {
    if (!arrow) return null

    const arrowClasses = `absolute w-3 h-3 bg-white border border-gray-200 transform rotate-45`
    
    switch (placement) {
      case 'top':
      case 'top-start':
      case 'top-end':
        return `${arrowClasses} top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-t-0 border-l-0`
      case 'bottom':
      case 'bottom-start':
      case 'bottom-end':
        return `${arrowClasses} bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-b-0 border-r-0`
      case 'left':
        return `${arrowClasses} left-full top-1/2 -translate-x-1/2 -translate-y-1/2 border-l-0 border-b-0`
      case 'right':
        return `${arrowClasses} right-full top-1/2 translate-x-1/2 -translate-y-1/2 border-r-0 border-t-0`
      default:
        return ''
    }
  }

  if (typeof window === 'undefined') {
    return <div className={`inline-block ${className}`}>{children}</div>
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {children}
      </div>

      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              ref={popoverRef}
              className={`
                fixed z-50 bg-white border border-gray-200 rounded-ios-xl shadow-ios-lg
                ${overlayClassName}
              `}
              style={{
                left: position.x,
                top: position.y,
                width: typeof width === 'number' ? `${width}px` : width
              }}
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ duration: 0.2 }}
              onMouseEnter={() => trigger === 'hover' && showPopover()}
              onMouseLeave={() => trigger === 'hover' && hidePopover()}
            >
              {/* 标题栏 */}
              {(title || closable) && (
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  {title && (
                    <h4 className="font-semibold text-gray-900">
                      {title}
                    </h4>
                  )}
                  {closable && (
                    <motion.button
                      onClick={hidePopover}
                      className="p-1 hover:bg-gray-100 rounded-ios-md transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  )}
                </div>
              )}
              
              {/* 内容区域 */}
              <div className="p-4">
                {content}
              </div>
              
              {/* 箭头 */}
              {arrow && <div className={getArrowStyle() || ''} />}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
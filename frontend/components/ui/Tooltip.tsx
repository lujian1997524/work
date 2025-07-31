'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

export interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
  trigger?: 'hover' | 'click' | 'focus' | 'manual'
  delay?: number
  disabled?: boolean
  className?: string
  visible?: boolean
  onVisibleChange?: (visible: boolean) => void
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  placement = 'top',
  trigger = 'hover',
  delay = 100,
  disabled = false,
  className = '',
  visible,
  onVisibleChange
}) => {
  const [internalVisible, setInternalVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // 确保只在客户端挂载后才添加交互属性
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isVisible = visible !== undefined ? visible : internalVisible

  // 计算工具提示位置
  const calculatePosition = () => {
    if (!triggerRef.current) return { x: 0, y: 0 }

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop

    let x = 0
    let y = 0

    // 简化位置计算
    switch (placement) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2
        y = triggerRect.top - 8
        break
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2
        y = triggerRect.bottom + 8
        break
      case 'left':
        x = triggerRect.left - 8
        y = triggerRect.top + triggerRect.height / 2
        break
      case 'right':
        x = triggerRect.right + 8
        y = triggerRect.top + triggerRect.height / 2
        break
      default:
        x = triggerRect.left + triggerRect.width / 2
        y = triggerRect.top - 8
    }

    return { x: x + scrollX, y: y + scrollY }
  }

  // 显示工具提示
  const showTooltip = () => {
    if (disabled) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setInternalVisible(true)
        onVisibleChange?.(true)
      }, delay)
    } else {
      setInternalVisible(true)
      onVisibleChange?.(true)
    }
  }

  // 隐藏工具提示
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setInternalVisible(false)
    onVisibleChange?.(false)
  }

  // 事件处理
  const handleMouseEnter = () => {
    if (trigger === 'hover') showTooltip()
  }

  const handleMouseLeave = () => {
    if (trigger === 'hover') hideTooltip()
  }

  const handleClick = () => {
    if (trigger === 'click') {
      if (isVisible) {
        hideTooltip()
      } else {
        showTooltip()
      }
    }
  }

  const handleFocus = () => {
    if (trigger === 'focus') showTooltip()
  }

  const handleBlur = () => {
    if (trigger === 'focus') hideTooltip()
  }

  // 位置更新
  useEffect(() => {
    if (isVisible && triggerRef.current) {
      // 立即计算位置
      const newPosition = calculatePosition()
      setPosition(newPosition)
      
      const handleResize = () => {
        const newPosition = calculatePosition()
        setPosition(newPosition)
      }
      const handleScroll = () => {
        const newPosition = calculatePosition()
        setPosition(newPosition)
      }
      
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [isVisible, placement])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // 获取箭头样式 - 简化版本
  const getArrowStyle = (): React.CSSProperties => {
    return {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
      borderWidth: '4px',
      borderColor: 'transparent',
      display: 'none' // 暂时隐藏箭头，先确保tooltip本身工作
    }
  }

  // 避免水合不匹配：确保服务端和客户端的属性保持一致
  const triggerProps = React.useMemo(() => {
    const props: any = {
      ref: triggerRef,
      className: `inline-block ${className}`,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
      onFocus: handleFocus,
      onBlur: handleBlur
    }

    // 只在客户端挂载后添加交互属性，避免SSR不匹配
    if (isMounted) {
      if (trigger === 'focus') {
        props.tabIndex = 0
      }
      if (trigger === 'click') {
        props.role = 'button'
      }
    }

    return props
  }, [trigger, className, handleMouseEnter, handleMouseLeave, handleClick, handleFocus, handleBlur, isMounted])

  if (typeof window === 'undefined') {
    return <div className={`inline-block ${className}`}>{children}</div>
  }

  return (
    <>
      <div {...triggerProps}>
        {children}
      </div>

      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              ref={tooltipRef}
              className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-ios-lg shadow-ios-lg max-w-xs break-words"
              style={{
                left: position.x,
                top: position.y
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              {content}
              <div style={getArrowStyle()} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
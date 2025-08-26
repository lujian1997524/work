// Toast可访问性和用户体验优化模块
// 提供完整的无障碍访问支持和用户体验优化

import React, { useEffect, useRef, useCallback, useState } from 'react'

// 可访问性配置接口
export interface ToastAccessibilityConfig {
  // ARIA属性
  ariaLive: 'off' | 'polite' | 'assertive'
  ariaAtomic: boolean
  role: string
  
  // 键盘导航
  enableKeyboardNavigation: boolean
  focusManagement: 'auto' | 'manual' | 'none'
  
  // 屏幕阅读器支持
  announceToScreenReader: boolean
  includeDetailedDescription: boolean
  
  // 用户偏好
  respectReducedMotion: boolean
  respectHighContrast: boolean
  respectForcedColors: boolean
  
  // 持续时间控制
  allowUserControlledDuration: boolean
  pauseOnHover: boolean
  pauseOnFocus: boolean
}

// 默认可访问性配置
export const DEFAULT_ACCESSIBILITY_CONFIG: ToastAccessibilityConfig = {
  ariaLive: 'polite',
  ariaAtomic: true,
  role: 'status',
  enableKeyboardNavigation: true,
  focusManagement: 'auto',
  announceToScreenReader: true,
  includeDetailedDescription: true,
  respectReducedMotion: true,
  respectHighContrast: true,
  respectForcedColors: true,
  allowUserControlledDuration: true,
  pauseOnHover: true,
  pauseOnFocus: true
}

// 用户偏好检测
export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersDarkMode: false,
    prefersLargerText: false
  })

  useEffect(() => {
    // 检测用户偏好
    const detectPreferences = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      const prefersLargerText = window.matchMedia('(prefers-reduced-data: no-preference)').matches

      setPreferences({
        prefersReducedMotion,
        prefersHighContrast,
        prefersDarkMode,
        prefersLargerText
      })
    }

    detectPreferences()

    // 监听偏好变化
    const mediaQueries = [
      '(prefers-reduced-motion: reduce)',
      '(prefers-contrast: high)',
      '(prefers-color-scheme: dark)'
    ]

    const listeners = mediaQueries.map(query => {
      const mediaQuery = window.matchMedia(query)
      const listener = () => detectPreferences()
      mediaQuery.addListener(listener)
      return { mediaQuery, listener }
    })

    return () => {
      listeners.forEach(({ mediaQuery, listener }) => {
        mediaQuery.removeListener(listener)
      })
    }
  }, [])

  return preferences
}

// 屏幕阅读器支持
export class ScreenReaderSupport {
  private static instance: ScreenReaderSupport | null = null
  private announceRegion: HTMLElement | null = null

  private constructor() {
    this.setupAnnounceRegion()
  }

  static getInstance(): ScreenReaderSupport {
    if (!ScreenReaderSupport.instance) {
      ScreenReaderSupport.instance = new ScreenReaderSupport()
    }
    return ScreenReaderSupport.instance
  }

  // 设置通知区域
  private setupAnnounceRegion() {
    if (typeof window === 'undefined') return

    this.announceRegion = document.createElement('div')
    this.announceRegion.id = 'toast-announce-region'
    this.announceRegion.setAttribute('aria-live', 'polite')
    this.announceRegion.setAttribute('aria-atomic', 'true')
    this.announceRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `
    document.body.appendChild(this.announceRegion)
  }

  // 向屏幕阅读器通知
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.announceRegion) return

    this.announceRegion.setAttribute('aria-live', priority)
    this.announceRegion.textContent = message

    // 清理之前的消息
    setTimeout(() => {
      if (this.announceRegion) {
        this.announceRegion.textContent = ''
      }
    }, 1000)
  }

  // 构建可访问的消息
  buildAccessibleMessage(
    type: string,
    message: string,
    details?: string,
    actions?: string[]
  ): string {
    let accessibleMessage = `${this.getTypeAnnouncement(type)} ${message}`
    
    if (details) {
      accessibleMessage += `. 详细信息: ${details}`
    }
    
    if (actions && actions.length > 0) {
      accessibleMessage += `. 可用操作: ${actions.join(', ')}`
    }
    
    return accessibleMessage
  }

  // 获取类型通知文本
  private getTypeAnnouncement(type: string): string {
    const typeAnnouncements: Record<string, string> = {
      'success': '成功通知',
      'error': '错误警告',
      'warning': '警告提示',
      'info': '信息通知',
      'project-created': '项目创建通知',
      'material-changed': '材料状态变更',
      'batch-operation': '批量操作结果',
      'smart-suggestion': '智能建议'
    }
    
    return typeAnnouncements[type] || '系统通知'
  }
}

// 键盘导航支持
export class ToastKeyboardNavigation {
  private toastElements: Map<string, HTMLElement> = new Map()
  private currentFocusIndex = -1
  private isNavigating = false

  constructor() {
    this.setupKeyboardListeners()
  }

  // 设置键盘监听器
  private setupKeyboardListeners() {
    if (typeof window === 'undefined') return

    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  // 处理键盘事件
  private handleKeyDown(event: KeyboardEvent) {
    if (!this.isNavigating) return

    const toasts = Array.from(this.toastElements.values())
    if (toasts.length === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.focusNext(toasts)
        break
      case 'ArrowUp':
        event.preventDefault()
        this.focusPrevious(toasts)
        break
      case 'Escape':
        event.preventDefault()
        this.exitNavigation()
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        this.activateCurrentToast()
        break
    }
  }

  // 聚焦下一个Toast
  private focusNext(toasts: HTMLElement[]) {
    this.currentFocusIndex = (this.currentFocusIndex + 1) % toasts.length
    this.focusToast(toasts[this.currentFocusIndex])
  }

  // 聚焦上一个Toast
  private focusPrevious(toasts: HTMLElement[]) {
    this.currentFocusIndex = this.currentFocusIndex <= 0 ? toasts.length - 1 : this.currentFocusIndex - 1
    this.focusToast(toasts[this.currentFocusIndex])
  }

  // 聚焦指定Toast
  private focusToast(toastElement: HTMLElement) {
    toastElement.focus()
    toastElement.setAttribute('aria-selected', 'true')
    
    // 清除其他Toast的选中状态
    this.toastElements.forEach((element, id) => {
      if (element !== toastElement) {
        element.setAttribute('aria-selected', 'false')
      }
    })
  }

  // 激活当前Toast
  private activateCurrentToast() {
    const toasts = Array.from(this.toastElements.values())
    const currentToast = toasts[this.currentFocusIndex]
    
    if (currentToast) {
      // 查找并触发主要按钮
      const primaryButton = currentToast.querySelector('[data-primary-action]') as HTMLButtonElement
      if (primaryButton) {
        primaryButton.click()
      }
    }
  }

  // 退出导航模式
  private exitNavigation() {
    this.isNavigating = false
    this.currentFocusIndex = -1
    
    // 移除所有Toast的选中状态
    this.toastElements.forEach(element => {
      element.setAttribute('aria-selected', 'false')
      element.blur()
    })
  }

  // 注册Toast元素
  registerToast(id: string, element: HTMLElement) {
    this.toastElements.set(id, element)
    
    // 设置可访问性属性
    element.setAttribute('tabindex', '0')
    element.setAttribute('role', 'dialog')
    element.setAttribute('aria-selected', 'false')
  }

  // 注销Toast元素
  unregisterToast(id: string) {
    this.toastElements.delete(id)
    
    // 如果当前聚焦的Toast被移除，调整焦点
    if (this.isNavigating) {
      const remainingToasts = Array.from(this.toastElements.values())
      if (remainingToasts.length === 0) {
        this.exitNavigation()
      } else if (this.currentFocusIndex >= remainingToasts.length) {
        this.currentFocusIndex = remainingToasts.length - 1
        this.focusToast(remainingToasts[this.currentFocusIndex])
      }
    }
  }

  // 开始键盘导航
  startNavigation() {
    this.isNavigating = true
    const toasts = Array.from(this.toastElements.values())
    
    if (toasts.length > 0) {
      this.currentFocusIndex = 0
      this.focusToast(toasts[0])
    }
  }
}

// 全局键盘导航实例
export const toastKeyboardNavigation = new ToastKeyboardNavigation()

// 颜色对比度检查
export const checkColorContrast = (foreground: string, background: string): number => {
  // 简化的对比度计算（WCAG 2.1标准）
  const getLuminance = (color: string): number => {
    // 简化实现，实际项目中应使用更完整的颜色解析
    const rgb = color.match(/\d+/g)
    if (!rgb) return 0
    
    const [r, g, b] = rgb.map(c => {
      const val = parseInt(c) / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  
  const luminance1 = getLuminance(foreground)
  const luminance2 = getLuminance(background)
  
  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

// Toast持续时间管理
export class ToastDurationManager {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private pausedTimers: Map<string, { remaining: number; paused: number }> = new Map()

  // 设置Toast定时器
  setTimer(id: string, duration: number, callback: () => void) {
    this.clearTimer(id)
    
    const timer = setTimeout(() => {
      callback()
      this.timers.delete(id)
    }, duration)
    
    this.timers.set(id, timer)
  }

  // 暂停Timer
  pauseTimer(id: string) {
    const timer = this.timers.get(id)
    if (!timer) return
    
    const startTime = this.pausedTimers.get(id)?.paused || Date.now()
    
    clearTimeout(timer)
    this.timers.delete(id)
    
    // 计算剩余时间（简化实现）
    this.pausedTimers.set(id, {
      remaining: 3000, // 简化，实际应该计算真实剩余时间
      paused: Date.now()
    })
  }

  // 恢复Timer
  resumeTimer(id: string, callback: () => void) {
    const pausedTimer = this.pausedTimers.get(id)
    if (!pausedTimer) return
    
    this.pausedTimers.delete(id)
    
    const timer = setTimeout(() => {
      callback()
      this.timers.delete(id)
    }, pausedTimer.remaining)
    
    this.timers.set(id, timer)
  }

  // 清除Timer
  clearTimer(id: string) {
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }
    this.pausedTimers.delete(id)
  }

  // 清理所有Timer
  clearAllTimers() {
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    this.pausedTimers.clear()
  }
}

// 全局持续时间管理器
export const toastDurationManager = new ToastDurationManager()

// React钩子：可访问性支持
export const useToastAccessibility = (
  id: string,
  config: Partial<ToastAccessibilityConfig> = {}
) => {
  const fullConfig = { ...DEFAULT_ACCESSIBILITY_CONFIG, ...config }
  const elementRef = useRef<HTMLElement>(null)
  const userPreferences = useUserPreferences()
  const screenReader = ScreenReaderSupport.getInstance()

  // 注册/注销Toast元素
  useEffect(() => {
    if (elementRef.current && fullConfig.enableKeyboardNavigation) {
      toastKeyboardNavigation.registerToast(id, elementRef.current)
      
      return () => {
        toastKeyboardNavigation.unregisterToast(id)
      }
    }
  }, [id, fullConfig.enableKeyboardNavigation])

  // 屏幕阅读器通知
  const announceToScreenReader = useCallback((
    message: string,
    type: string,
    details?: string,
    actions?: string[]
  ) => {
    if (fullConfig.announceToScreenReader) {
      const accessibleMessage = screenReader.buildAccessibleMessage(type, message, details, actions)
      const priority = type === 'error' ? 'assertive' : 'polite'
      screenReader.announce(accessibleMessage, priority)
    }
  }, [fullConfig.announceToScreenReader, screenReader])

  // 暂停/恢复计时器
  const pauseTimer = useCallback(() => {
    if (fullConfig.pauseOnHover || fullConfig.pauseOnFocus) {
      toastDurationManager.pauseTimer(id)
    }
  }, [id, fullConfig.pauseOnHover, fullConfig.pauseOnFocus])

  const resumeTimer = useCallback((callback: () => void) => {
    if (fullConfig.pauseOnHover || fullConfig.pauseOnFocus) {
      toastDurationManager.resumeTimer(id, callback)
    }
  }, [id, fullConfig.pauseOnHover, fullConfig.pauseOnFocus])

  // 获取可访问性属性
  const getAccessibilityProps = useCallback(() => {
    const props: Record<string, any> = {
      ref: elementRef,
      role: fullConfig.role,
      'aria-live': fullConfig.ariaLive,
      'aria-atomic': fullConfig.ariaAtomic,
      tabIndex: fullConfig.enableKeyboardNavigation ? 0 : undefined
    }

    // 根据用户偏好调整
    if (userPreferences.prefersReducedMotion && fullConfig.respectReducedMotion) {
      props['data-reduced-motion'] = true
    }

    if (userPreferences.prefersHighContrast && fullConfig.respectHighContrast) {
      props['data-high-contrast'] = true
    }

    return props
  }, [fullConfig, userPreferences])

  return {
    elementRef,
    announceToScreenReader,
    pauseTimer,
    resumeTimer,
    getAccessibilityProps,
    userPreferences,
    config: fullConfig
  }
}

// 全局可访问性设置
export const globalAccessibilitySettings = {
  enableKeyboardNavigation: true,
  enableScreenReaderSupport: true,
  respectUserPreferences: true,
  
  // 设置全局配置
  configure(settings: Partial<ToastAccessibilityConfig>) {
    Object.assign(DEFAULT_ACCESSIBILITY_CONFIG, settings)
  },
  
  // 开始键盘导航
  startKeyboardNavigation() {
    toastKeyboardNavigation.startNavigation()
  }
}
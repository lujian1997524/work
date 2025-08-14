// Toast动画和性能优化模块
// 提供高性能的动画效果和性能优化工具

import { MotionValue, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useCallback, useMemo, useRef, useEffect, useState } from 'react'

// 动画预设配置
export const TOAST_ANIMATIONS = {
  // 入场动画
  enter: {
    slide: {
      initial: { x: 300, opacity: 0, scale: 0.9 },
      animate: { x: 0, opacity: 1, scale: 1 },
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 25,
        mass: 0.8
      }
    },
    
    fade: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      transition: { 
        type: "tween", 
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    
    bounce: {
      initial: { scale: 0, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 15,
        mass: 1
      }
    },
    
    slideUp: {
      initial: { y: 100, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  },
  
  // 退场动画
  exit: {
    slide: {
      animate: { x: 300, opacity: 0, scale: 0.9 },
      transition: { 
        type: "tween", 
        duration: 0.2,
        ease: [0.55, 0.085, 0.68, 0.53]
      }
    },
    
    fade: {
      animate: { opacity: 0, y: -20 },
      transition: { 
        type: "tween", 
        duration: 0.2
      }
    },
    
    bounce: {
      animate: { scale: 0, opacity: 0 },
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20
      }
    },
    
    slideUp: {
      animate: { y: -100, opacity: 0 },
      transition: {
        type: "tween",
        duration: 0.2
      }
    }
  },
  
  // 悬停动画
  hover: {
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  
  // 点击动画
  tap: {
    scale: 0.98,
    transition: {
      type: "spring",
      stiffness: 600,
      damping: 25
    }
  }
}

// Toast动画类型
export type ToastAnimationType = 'slide' | 'fade' | 'bounce' | 'slideUp'

// 动画配置接口
export interface ToastAnimationConfig {
  enter: ToastAnimationType
  exit: ToastAnimationType
  duration?: number
  stiffness?: number
  damping?: number
  enableHover?: boolean
  enableTap?: boolean
}

// 默认动画配置
export const DEFAULT_ANIMATION_CONFIG: ToastAnimationConfig = {
  enter: 'slide',
  exit: 'slide',
  duration: 0.3,
  stiffness: 400,
  damping: 25,
  enableHover: true,
  enableTap: true
}

// 获取动画配置
export const getAnimationConfig = (
  type: ToastAnimationType, 
  phase: 'enter' | 'exit',
  customConfig?: Partial<ToastAnimationConfig>
) => {
  const config = { ...DEFAULT_ANIMATION_CONFIG, ...customConfig }
  const animation = TOAST_ANIMATIONS[phase][type]
  
  // 应用自定义配置
  if (animation.transition) {
    animation.transition = {
      ...animation.transition,
      duration: config.duration,
      stiffness: config.stiffness || 100,
      damping: config.damping || 10
    }
  }
  
  return animation
}

// 性能优化钩子
export const useToastPerformance = () => {
  const renderCount = useRef(0)
  const startTime = useRef(Date.now())
  
  // 渲染计数
  useEffect(() => {
    renderCount.current++
  })
  
  // 性能指标
  const getPerformanceMetrics = useCallback(() => {
    const currentTime = Date.now()
    const runtime = currentTime - startTime.current
    
    return {
      renderCount: renderCount.current,
      runtime,
      averageRenderTime: runtime / renderCount.current
    }
  }, [])
  
  return { getPerformanceMetrics }
}

// Toast队列管理器（性能优化）
export class ToastQueueManager {
  private queue: Array<{ id: string; priority: number; timestamp: number }> = []
  private maxVisible = 5 // 最大可见Toast数量
  private processingInterval: NodeJS.Timeout | null = null
  
  constructor(maxVisible = 5) {
    this.maxVisible = maxVisible
  }
  
  // 添加Toast到队列
  addToQueue(id: string, priority: number = 0) {
    this.queue.push({
      id,
      priority,
      timestamp: Date.now()
    })
    
    // 按优先级和时间排序
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority // 高优先级在前
      }
      return a.timestamp - b.timestamp // 早添加的在前
    })
    
    this.processQueue()
  }
  
  // 从队列移除Toast
  removeFromQueue(id: string) {
    this.queue = this.queue.filter(item => item.id !== id)
  }
  
  // 处理队列
  private processQueue() {
    if (this.processingInterval) {
      clearTimeout(this.processingInterval)
    }
    
    this.processingInterval = setTimeout(() => {
      const visibleToasts = this.queue.slice(0, this.maxVisible)
      const hiddenToasts = this.queue.slice(this.maxVisible)
      
      // 触发显示/隐藏事件
      window.dispatchEvent(new CustomEvent('toast-queue-update', {
        detail: { visible: visibleToasts, hidden: hiddenToasts }
      }))
    }, 50) // 批量处理，避免频繁更新
  }
  
  // 获取队列状态
  getQueueStatus() {
    return {
      total: this.queue.length,
      visible: Math.min(this.queue.length, this.maxVisible),
      hidden: Math.max(0, this.queue.length - this.maxVisible)
    }
  }
  
  // 清理队列
  clearQueue() {
    this.queue = []
    if (this.processingInterval) {
      clearTimeout(this.processingInterval)
      this.processingInterval = null
    }
  }
}

// 全局队列管理器实例
export const toastQueueManager = new ToastQueueManager()

// 动画性能监控
export class ToastAnimationProfiler {
  private animationTimes: Map<string, number> = new Map()
  private frameRates: number[] = []
  private lastFrameTime = 0
  
  // 开始动画性能监控
  startAnimation(toastId: string) {
    this.animationTimes.set(toastId, performance.now())
    this.startFrameRateMonitoring()
  }
  
  // 结束动画性能监控
  endAnimation(toastId: string) {
    const startTime = this.animationTimes.get(toastId)
    if (startTime) {
      const duration = performance.now() - startTime
      this.animationTimes.delete(toastId)
      
      return {
        duration,
        averageFrameRate: this.getAverageFrameRate()
      }
    }
  }
  
  // 监控帧率
  private startFrameRateMonitoring() {
    this.lastFrameTime = performance.now()
    this.frameRates = []
    
    const measureFrame = () => {
      const currentTime = performance.now()
      const frameTime = currentTime - this.lastFrameTime
      const fps = 1000 / frameTime
      
      this.frameRates.push(fps)
      this.lastFrameTime = currentTime
      
      if (this.frameRates.length < 60) { // 监控60帧
        requestAnimationFrame(measureFrame)
      }
    }
    
    requestAnimationFrame(measureFrame)
  }
  
  // 获取平均帧率
  private getAverageFrameRate() {
    if (this.frameRates.length === 0) return 0
    
    const sum = this.frameRates.reduce((acc, fps) => acc + fps, 0)
    return sum / this.frameRates.length
  }
  
  // 获取性能报告
  getPerformanceReport() {
    return {
      activeAnimations: this.animationTimes.size,
      averageFrameRate: this.getAverageFrameRate(),
      frameDrops: this.frameRates.filter(fps => fps < 55).length
    }
  }
}

// 全局动画性能监控器
export const toastAnimationProfiler = new ToastAnimationProfiler()

// 内存优化：Toast池
export class ToastPool {
  private pool: HTMLElement[] = []
  private maxPoolSize = 10
  
  // 获取Toast元素
  getToast(): HTMLElement {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    
    // 创建新的Toast元素
    const toastElement = document.createElement('div')
    toastElement.className = 'toast-pooled'
    return toastElement
  }
  
  // 归还Toast元素
  returnToast(element: HTMLElement) {
    if (this.pool.length < this.maxPoolSize) {
      // 清理元素状态
      element.className = 'toast-pooled'
      element.innerHTML = ''
      element.removeAttribute('style')
      
      this.pool.push(element)
    }
  }
  
  // 清理池
  clearPool() {
    this.pool = []
  }
  
  // 获取池状态
  getPoolStatus() {
    return {
      available: this.pool.length,
      maxSize: this.maxPoolSize
    }
  }
}

// 全局Toast池
export const toastPool = new ToastPool()

// React钩子：优化版Toast动画
export const useOptimizedToastAnimation = (
  animationConfig: Partial<ToastAnimationConfig> = {}
) => {
  const config = useMemo(() => ({
    ...DEFAULT_ANIMATION_CONFIG,
    ...animationConfig
  }), [animationConfig])
  
  // 动画值
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const opacity = useSpring(0, { stiffness: 400, damping: 25 })
  const scale = useSpring(1, { stiffness: 400, damping: 25 })
  
  // 变换值
  const rotate = useTransform(x, [-100, 100], [-5, 5])
  const boxShadow = useTransform(
    opacity,
    [0, 1],
    ['0px 0px 0px rgba(0,0,0,0)', '0px 10px 25px rgba(0,0,0,0.1)']
  )
  
  // 动画控制函数
  const animateIn = useCallback(() => {
    opacity.set(1)
    scale.set(1)
    x.set(0)
    y.set(0)
  }, [opacity, scale, x, y])
  
  const animateOut = useCallback(() => {
    opacity.set(0)
    scale.set(0.9)
    x.set(300)
  }, [opacity, scale, x])
  
  const animateHover = useCallback(() => {
    if (config.enableHover) {
      scale.set(1.02)
    }
  }, [scale, config.enableHover])
  
  const animateLeave = useCallback(() => {
    scale.set(1)
  }, [scale])
  
  return {
    motionValues: { x, y, opacity, scale, rotate, boxShadow },
    animations: { animateIn, animateOut, animateHover, animateLeave },
    config
  }
}

// 性能监控钩子
export const useToastPerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    animationFPS: 0,
    memoryUsage: 0,
    activeToasts: 0
  })
  
  useEffect(() => {
    const updateMetrics = () => {
      const performanceReport = toastAnimationProfiler.getPerformanceReport()
      const queueStatus = toastQueueManager.getQueueStatus()
      const poolStatus = toastPool.getPoolStatus()
      
      setMetrics({
        renderTime: performance.now(),
        animationFPS: performanceReport.averageFrameRate,
        memoryUsage: poolStatus.available,
        activeToasts: queueStatus.visible
      })
    }
    
    const interval = setInterval(updateMetrics, 1000)
    return () => clearInterval(interval)
  }, [])
  
  return metrics
}
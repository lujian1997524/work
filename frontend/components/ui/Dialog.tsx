'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  XMarkIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  CheckCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline'
import { Button } from './Button'

// Dialog 类型
export type DialogType = 'default' | 'confirm' | 'alert' | 'prompt'

// Dialog 变体
export type DialogVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

// 按钮配置
export interface DialogButton {
  text: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
  disabled?: boolean
  onClick?: (value?: string) => Promise<void> | void
}

// Dialog 配置
export interface DialogConfig {
  type?: DialogType
  variant?: DialogVariant
  title?: string
  message?: React.ReactNode
  placeholder?: string // 仅用于 prompt 类型
  defaultValue?: string // prompt 的默认值
  maxLength?: number // prompt 输入框最大长度
  confirmText?: string
  cancelText?: string
  closeOnClickOutside?: boolean
  closeOnEsc?: boolean
  showCloseButton?: boolean
  width?: string | number
  buttons?: DialogButton[]
  icon?: React.ReactNode
}

// 内置图标映射
const iconMap = {
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon
}

// 样式映射
const variantStyles = {
  default: {
    icon: 'text-gray-500',
    accent: 'text-gray-600'
  },
  success: {
    icon: 'text-green-500',
    accent: 'text-green-600'
  },
  warning: {
    icon: 'text-yellow-500',
    accent: 'text-yellow-600'
  },
  error: {
    icon: 'text-red-500',
    accent: 'text-red-600'
  },
  info: {
    icon: 'text-blue-500',
    accent: 'text-blue-600'
  }
}

// Dialog 组件主体
interface DialogProps extends DialogConfig {
  isOpen: boolean
  onClose: () => void
  onConfirm?: (value?: string) => Promise<void> | void
  onCancel?: () => void
  children?: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  type = 'default',
  variant = 'default',
  title,
  message,
  placeholder,
  defaultValue = '',
  maxLength,
  confirmText = '确认',
  cancelText = '取消',
  closeOnClickOutside = true,
  closeOnEsc = true,
  showCloseButton = true,
  width = 420,
  buttons,
  icon,
  children
}) => {
  const [inputValue, setInputValue] = useState(defaultValue)
  const [isLoading, setIsLoading] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const styles = variantStyles[variant]
  const IconComponent = variant !== 'default' ? iconMap[variant] : null

  const handleConfirm = async () => {
    if (isLoading) return

    try {
      setIsLoading(true)
      const value = type === 'prompt' ? inputValue : undefined
      await onConfirm?.(value)
      onClose()
    } catch (error) {
      console.error('Dialog confirm error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isLoading) return
    onCancel?.()
    onClose()
  }

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnClickOutside && event.target === event.currentTarget) {
      handleCancel()
    }
  }

  // 键盘事件处理
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEsc) {
        handleCancel()
      } else if (event.key === 'Enter' && type !== 'prompt') {
        handleConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeOnEsc, type, handleCancel, handleConfirm])

  // 自动聚焦输入框
  useEffect(() => {
    if (isOpen && type === 'prompt' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, type])

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue)
      setIsLoading(false)
    }
  }, [isOpen, defaultValue])

  const handleButtonClick = async (button: DialogButton) => {
    if (button.disabled || button.loading || isLoading) return

    try {
      setIsLoading(true)
      const value = type === 'prompt' ? inputValue : undefined
      await button.onClick?.(value)
      onClose()
    } catch (error) {
      console.error('Dialog button click error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderDefaultButtons = () => {
    if (type === 'alert') {
      return (
        <Button
          onClick={handleConfirm}
          loading={isLoading}
          className="min-w-[80px]"
        >
          {confirmText}
        </Button>
      )
    }

    return (
      <>
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={isLoading}
          className="min-w-[80px]"
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          loading={isLoading}
          className="min-w-[80px]"
        >
          {confirmText}
        </Button>
      </>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Dialog 内容 */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full bg-white rounded-ios-lg shadow-xl border border-gray-200/50"
            style={{ maxWidth: typeof width === 'number' ? `${width}px` : width }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="relative px-6 py-4 border-b border-gray-100">
              {/* 关闭按钮 */}
              {showCloseButton && (
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}

              {/* 标题和图标 */}
              <div className="flex items-center space-x-3 pr-8">
                {(icon || IconComponent) && (
                  <div className={`flex-shrink-0 ${styles.icon}`}>
                    {icon || (IconComponent && <IconComponent className="w-6 h-6" />)}
                  </div>
                )}
                {title && (
                  <h3 className="text-lg font-semibold text-gray-900">
                    {title}
                  </h3>
                )}
              </div>
            </div>

            {/* 内容区域 */}
            <div className="px-6 py-6">
              {/* 消息内容 */}
              {message && (
                <div className="text-gray-700 leading-relaxed mb-4">
                  {message}
                </div>
              )}

              {/* 自定义内容 */}
              {children}

              {/* Prompt 输入框 */}
              {type === 'prompt' && (
                <div className="mt-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    disabled={isLoading}
                    className="
                      w-full px-4 py-3 
                      border border-gray-200 rounded-ios-lg 
                      focus:outline-none focus:ring-2 focus:ring-ios18-blue/30 focus:border-ios18-blue
                      disabled:bg-gray-50 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  />
                  {maxLength && (
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {inputValue.length}/{maxLength}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
              {buttons ? (
                buttons.map((button, index) => (
                  <Button
                    key={index}
                    variant={button.variant || 'primary'}
                    loading={button.loading || (isLoading && index === buttons.length - 1)}
                    disabled={button.disabled || isLoading}
                    onClick={() => handleButtonClick(button)}
                    className="min-w-[80px]"
                  >
                    {button.text}
                  </Button>
                ))
              ) : (
                renderDefaultButtons()
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// 便捷的 Dialog Hook
export const useDialog = () => {
  const [dialogs, setDialogs] = useState<Array<DialogConfig & { 
    id: string
    isOpen: boolean
    resolve?: (value?: string | boolean) => void
  }>>([])

  const openDialog = (config: DialogConfig): Promise<string | boolean | undefined> => {
    return new Promise((resolve) => {
      const id = `dialog-${Date.now()}-${Math.random()}`
      const dialog = {
        ...config,
        id,
        isOpen: true,
        resolve
      }
      
      setDialogs(prev => [...prev, dialog])
    })
  }

  const closeDialog = (id: string, value?: string | boolean) => {
    setDialogs(prev => {
      const dialog = prev.find(d => d.id === id)
      if (dialog?.resolve) {
        dialog.resolve(value)
      }
      return prev.filter(d => d.id !== id)
    })
  }

  // 便捷方法
  const alert = (message: React.ReactNode, options?: Partial<DialogConfig>): Promise<boolean> => {
    return openDialog({
      type: 'alert',
      title: '提示',
      message,
      ...options
    }) as Promise<boolean>
  }

  const confirm = (message: React.ReactNode, options?: Partial<DialogConfig>): Promise<boolean> => {
    return openDialog({
      type: 'confirm',
      title: '确认',
      message,
      ...options
    }) as Promise<boolean>
  }

  const prompt = (message: React.ReactNode, options?: Partial<DialogConfig>): Promise<string | undefined> => {
    return openDialog({
      type: 'prompt',
      title: '输入',
      message,
      placeholder: '请输入...',
      ...options
    }) as Promise<string | undefined>
  }

  const success = (message: React.ReactNode, options?: Partial<DialogConfig>): Promise<boolean> => {
    return alert(message, {
      variant: 'success',
      title: '成功',
      ...options
    })
  }

  const error = (message: React.ReactNode, options?: Partial<DialogConfig>): Promise<boolean> => {
    return alert(message, {
      variant: 'error',
      title: '错误',
      ...options
    })
  }

  const warning = (message: React.ReactNode, options?: Partial<DialogConfig>): Promise<boolean> => {
    return alert(message, {
      variant: 'warning',
      title: '警告',
      ...options
    })
  }

  const info = (message: React.ReactNode, options?: Partial<DialogConfig>): Promise<boolean> => {
    return alert(message, {
      variant: 'info',
      title: '信息',
      ...options
    })
  }

  return {
    dialogs,
    openDialog,
    closeDialog,
    alert,
    confirm,
    prompt,
    success,
    error,
    warning,
    info,
    // Dialog 组件渲染器
    DialogRenderer: () => (
      <>
        {dialogs.map((dialog) => (
          <Dialog
            key={dialog.id}
            {...dialog}
            onClose={() => closeDialog(dialog.id, false)}
            onConfirm={(value) => closeDialog(dialog.id, value || true)}
            onCancel={() => closeDialog(dialog.id, false)}
          />
        ))}
      </>
    )
  }
}

// 兼容性导出 - 保持与旧版本的兼容
export const dialogManager = {
  alert: (message: string, title?: string) => {
    const hook = { current: null as any }
    return new Promise<boolean>((resolve) => {
      // 简化的兼容实现
      const confirmed = window.confirm(title ? `${title}\n\n${message}` : message)
      resolve(confirmed)
    })
  },
  confirm: (message: string, title?: string) => {
    return new Promise<boolean>((resolve) => {
      const confirmed = window.confirm(title ? `${title}\n\n${message}` : message)
      resolve(confirmed)
    })
  },
  prompt: (message: string, defaultValue?: string, title?: string) => {
    return new Promise<string>((resolve) => {
      const result = window.prompt(title ? `${title}\n\n${message}` : message, defaultValue || '')
      resolve(result || '')
    })
  }
}

export const alert = dialogManager.alert
export const confirm = dialogManager.confirm
export const prompt = dialogManager.prompt

export const DialogRenderer = () => null // 兼容性组件
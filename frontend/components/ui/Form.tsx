'use client'

import React, { forwardRef, ReactNode, FormHTMLAttributes, createContext, useContext } from 'react'
import { motion } from 'framer-motion'

// Form 上下文类型
interface FormContextType {
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'glass'
}

// 创建 Form 上下文
const FormContext = createContext<FormContextType>({})

// 使用 Form 上下文的 Hook
export const useFormContext = () => useContext(FormContext)

// Form 根组件接口
export interface FormProps {
  children: ReactNode
  className?: string
  // 表单状态
  disabled?: boolean
  loading?: boolean
  // 表单样式
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'glass'
  // 表单布局
  layout?: 'vertical' | 'horizontal' | 'inline'
  // 表单提交
  onSubmit?: (data: FormData) => void | Promise<void>
  // 表单验证
  noValidate?: boolean
  // 基础HTML属性
  id?: string
  name?: string
  autoComplete?: string
  encType?: string
  method?: string
  target?: string
  acceptCharset?: string
}

// FormGroup 组件接口
export interface FormGroupProps {
  children: ReactNode
  className?: string
  // 分组标题
  title?: string
  description?: string
  // 布局
  inline?: boolean
  // 间距
  spacing?: 'sm' | 'md' | 'lg'
}

// FormField 组件接口
export interface FormFieldProps {
  children: ReactNode
  className?: string
  // 字段标签
  label?: string
  labelPosition?: 'top' | 'left' | 'right'
  // 字段状态
  required?: boolean
  error?: string
  hint?: string
  // 字段布局
  inline?: boolean
  // 字段宽度
  width?: string | number
}

// FormActions 组件接口
export interface FormActionsProps {
  children: ReactNode
  className?: string
  // 操作布局
  align?: 'left' | 'center' | 'right' | 'space-between'
  // 按钮间距
  spacing?: 'sm' | 'md' | 'lg'
  // 固定位置
  sticky?: boolean
}

// Form 根组件
export const Form = forwardRef<HTMLFormElement, FormProps>(({
  children,
  className = '',
  disabled = false,
  loading = false,
  size = 'md',
  variant = 'default',
  layout = 'vertical',
  onSubmit,
  noValidate = true,
  id,
  name,
  autoComplete,
  encType,
  method,
  target,
  acceptCharset,
}, ref) => {
  // 处理表单提交
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (loading || disabled) return
    
    if (onSubmit) {
      const formData = new FormData(event.currentTarget)
      await onSubmit(formData)
    }
  }

  const layoutClasses = {
    vertical: 'space-y-6',
    horizontal: 'space-y-4',
    inline: 'flex flex-wrap gap-4 items-end'
  }

  const contextValue: FormContextType = {
    disabled: disabled || loading,
    size,
    variant
  }

  // Motion动画属性
  const motionProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  }

  // 安全的HTML属性
  const htmlProps = {
    id,
    name,
    autoComplete,
    encType,
    method,
    target,
    acceptCharset,
  }

  return (
    <FormContext.Provider value={contextValue}>
      <motion.form
        ref={ref}
        className={`
          ${layoutClasses[layout]}
          ${disabled || loading ? 'opacity-60 pointer-events-none' : ''}
          ${className}
        `}
        onSubmit={handleSubmit}
        noValidate={noValidate}
        {...motionProps}
        {...htmlProps}
      >
        {children}
        
        {/* 加载状态覆盖层 */}
        {loading && (
          <motion.div
            className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-2xl z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ios18-blue"></div>
              <span className="text-text-secondary text-sm">处理中...</span>
            </div>
          </motion.div>
        )}
      </motion.form>
    </FormContext.Provider>
  )
})

// FormGroup 组件
export const FormGroup = forwardRef<HTMLDivElement, FormGroupProps>(({
  children,
  className = '',
  title,
  description,
  inline = false,
  spacing = 'md',
  ...props
}, ref) => {
  const spacingClasses = {
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-6'
  }

  return (
    <div
      ref={ref}
      className={`
        ${inline ? 'flex flex-wrap gap-4 items-start' : spacingClasses[spacing]}
        ${className}
      `}
      {...props}
    >
      {/* 分组标题和描述 */}
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-medium text-text-primary mb-1">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-text-secondary">
              {description}
            </p>
          )}
        </div>
      )}
      
      {children}
    </div>
  )
})

// FormField 组件
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(({
  children,
  className = '',
  label,
  labelPosition = 'top',
  required = false,
  error,
  hint,
  inline = false,
  width,
  ...props
}, ref) => {
  const { size } = useFormContext()

  const labelClasses = {
    sm: 'text-xs font-medium',
    md: 'text-sm font-medium',
    lg: 'text-base font-medium'
  }

  const containerClasses = inline || labelPosition !== 'top' 
    ? 'flex items-center gap-3' 
    : 'space-y-2'

  const style = width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined

  const renderLabel = () => {
    if (!label) return null
    
    return (
      <label className={`
        ${labelClasses[size || 'md']} 
        text-text-primary
        ${labelPosition === 'top' ? 'block' : ''}
        ${labelPosition === 'right' ? 'order-2' : ''}
      `}>
        {label}
        {required && <span className="text-status-error ml-1">*</span>}
      </label>
    )
  }

  return (
    <div
      ref={ref}
      className={`${containerClasses} ${className}`}
      style={style}
      {...props}
    >
      {labelPosition !== 'right' && renderLabel()}
      
      <div className="flex-1">
        {children}
        
        {/* 错误信息 */}
        {error && (
          <motion.p 
            className="mt-2 text-sm text-status-error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
        
        {/* 提示信息 */}
        {hint && !error && (
          <motion.p 
            className="mt-2 text-sm text-text-secondary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            {hint}
          </motion.p>
        )}
      </div>
      
      {labelPosition === 'right' && renderLabel()}
    </div>
  )
})

// FormActions 组件
export const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(({
  children,
  className = '',
  align = 'right',
  spacing = 'md',
  sticky = false,
  ...props
}, ref) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'space-between': 'justify-between'
  }

  const spacingClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  }

  return (
    <div
      ref={ref}
      className={`
        flex items-center flex-wrap
        ${alignClasses[align]}
        ${spacingClasses[spacing]}
        ${sticky ? 'sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 py-4 -mx-6 px-6 mt-6' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
})

// FormContainer 组件 - 提供表单外层容器样式
export interface FormContainerProps {
  children: ReactNode
  className?: string
  title?: string
  description?: string
  actions?: ReactNode
  // 容器样式
  variant?: 'card' | 'plain' | 'glass'
  // 容器大小
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export const FormContainer = forwardRef<HTMLDivElement, FormContainerProps>(({
  children,
  className = '',
  title,
  description,
  actions,
  variant = 'card',
  maxWidth = 'md',
  ...props
}, ref) => {
  const variantClasses = {
    card: 'bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg p-6',
    plain: 'bg-transparent',
    glass: 'bg-bg-glass backdrop-blur-glass border border-white border-opacity-20 rounded-2xl p-6'
  }

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'w-full'
  }

  return (
    <div 
      ref={ref}
      className={`
        ${variantClasses[variant]}
        ${maxWidthClasses[maxWidth]}
        mx-auto
        ${className}
      `}
      {...props}
    >
      {/* 表单标题栏 */}
      {(title || description || actions) && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {title && (
              <h2 className="text-xl font-semibold text-text-primary">
                {title}
              </h2>
            )}
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
          {description && (
            <p className="text-text-secondary text-sm">
              {description}
            </p>
          )}
        </div>
      )}

      {children}
    </div>
  )
})

// 导出组件名称设置
Form.displayName = 'Form'
FormGroup.displayName = 'FormGroup'
FormField.displayName = 'FormField'
FormActions.displayName = 'FormActions'
FormContainer.displayName = 'FormContainer'
import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'borderless';
  error?: boolean;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
  helpText?: string;
  errorText?: string;
  label?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className,
  size = 'md',
  variant = 'default', 
  error = false,
  resize = 'vertical',
  helpText,
  errorText,
  label,
  required = false,
  disabled = false,
  placeholder,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'px-2 py-1.5 text-sm min-h-[60px]',
    md: 'px-3 py-2 text-sm min-h-[80px]', 
    lg: 'px-4 py-3 text-base min-h-[100px]'
  };

  const variantClasses = {
    default: 'border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    filled: 'border border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white',
    borderless: 'border-0 bg-transparent focus:ring-1 focus:ring-blue-500'
  };

  const resizeClasses = {
    none: 'resize-none',
    both: 'resize',
    horizontal: 'resize-x', 
    vertical: 'resize-y'
  };

  const textareaClasses = cn(
    // 基础样式
    'w-full rounded-lg transition-all duration-200 outline-none',
    'placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
    
    // 尺寸
    sizeClasses[size],
    
    // 变体
    variantClasses[variant],
    
    // 拖拽调整尺寸
    resizeClasses[resize],
    
    // 错误状态
    error 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : '',
    
    // 禁用状态
    disabled
      ? 'bg-gray-100 border-gray-200 text-gray-500'
      : '',
      
    className
  );

  return (
    <div className="space-y-1">
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* 文本框 */}
      <textarea
        ref={ref}
        className={textareaClasses}
        disabled={disabled}
        placeholder={placeholder}
        {...props}
      />
      
      {/* 帮助文字或错误信息 */}
      {(helpText || errorText) && (
        <div className="text-sm">
          {error && errorText ? (
            <span className="text-red-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errorText}
            </span>
          ) : helpText ? (
            <span className="text-gray-500">{helpText}</span>
          ) : null}
        </div>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
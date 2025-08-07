import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<{ className?: string }>;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'filled' | 'outlined';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  shape?: 'square' | 'circle';
  tooltip?: string;
  isActive?: boolean;
}

const sizeClasses = {
  xs: {
    button: 'p-1',
    icon: 'w-3 h-3'
  },
  sm: {
    button: 'p-1.5',
    icon: 'w-4 h-4'
  },
  md: {
    button: 'p-2',
    icon: 'w-5 h-5'
  },
  lg: {
    button: 'p-3',
    icon: 'w-6 h-6'
  }
};

const colorVariants = {
  ghost: {
    primary: 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100',
    secondary: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200',
    success: 'text-gray-600 hover:text-green-600 hover:bg-green-50 active:bg-green-100',
    warning: 'text-gray-600 hover:text-orange-600 hover:bg-orange-50 active:bg-orange-100',
    danger: 'text-gray-600 hover:text-red-600 hover:bg-red-50 active:bg-red-100'
  },
  filled: {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600 active:bg-gray-700',
    success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700',
    warning: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700'
  },
  outlined: {
    primary: 'border border-blue-500 text-blue-600 hover:bg-blue-50 active:bg-blue-100',
    secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
    success: 'border border-green-500 text-green-600 hover:bg-green-50 active:bg-green-100',
    warning: 'border border-orange-500 text-orange-600 hover:bg-orange-50 active:bg-orange-100',
    danger: 'border border-red-500 text-red-600 hover:bg-red-50 active:bg-red-100'
  }
};

const activeVariants = {
  ghost: {
    primary: 'bg-blue-100 text-blue-700',
    secondary: 'bg-gray-200 text-gray-800',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-700',
    danger: 'bg-red-100 text-red-700'
  },
  filled: {
    primary: 'bg-blue-700',
    secondary: 'bg-gray-700',
    success: 'bg-green-700',
    warning: 'bg-orange-700',
    danger: 'bg-red-700'
  },
  outlined: {
    primary: 'bg-blue-100 border-blue-600',
    secondary: 'bg-gray-100 border-gray-400',
    success: 'bg-green-100 border-green-600',
    warning: 'bg-orange-100 border-orange-600',
    danger: 'bg-red-100 border-red-600'
  }
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon: Icon,
  size = 'md',
  variant = 'ghost',
  color = 'secondary',
  shape = 'square',
  tooltip,
  isActive = false,
  className,
  disabled = false,
  ...props
}, ref) => {
  const sizes = sizeClasses[size];
  
  const buttonClasses = cn(
    // 基础样式
    'inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
    
    // 尺寸
    sizes.button,
    
    // 形状
    shape === 'circle' ? 'rounded-full' : 'rounded-lg',
    
    // 颜色和变体
    isActive && !disabled
      ? activeVariants[variant][color]
      : colorVariants[variant][color],
    
    // 禁用状态
    disabled 
      ? 'opacity-50 cursor-not-allowed pointer-events-none'
      : 'cursor-pointer',
      
    // Focus ring 颜色
    color === 'primary' ? 'focus:ring-blue-500' :
    color === 'success' ? 'focus:ring-green-500' :
    color === 'warning' ? 'focus:ring-orange-500' :
    color === 'danger' ? 'focus:ring-red-500' :
    'focus:ring-gray-500',
    
    className
  );

  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={disabled}
      title={tooltip}
      {...props}
    >
      <Icon className={sizes.icon} />
    </button>
  );
});

IconButton.displayName = 'IconButton';
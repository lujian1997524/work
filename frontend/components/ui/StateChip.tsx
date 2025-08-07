import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, PlayIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

export interface StateChipProps {
  status: 'completed' | 'in_progress' | 'pending' | 'warning' | 'error';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outlined' | 'subtle';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  completed: {
    icon: CheckCircleIcon,
    colors: {
      filled: 'bg-green-500 text-white',
      outlined: 'border-green-500 text-green-700 bg-white',
      subtle: 'bg-green-100 text-green-800'
    },
    defaultText: '已完成'
  },
  in_progress: {
    icon: PlayIcon,
    colors: {
      filled: 'bg-blue-500 text-white',
      outlined: 'border-blue-500 text-blue-700 bg-white',
      subtle: 'bg-blue-100 text-blue-800'
    },
    defaultText: '进行中'
  },
  pending: {
    icon: ClockIcon,
    colors: {
      filled: 'bg-gray-500 text-white',
      outlined: 'border-gray-500 text-gray-700 bg-white',
      subtle: 'bg-gray-100 text-gray-800'
    },
    defaultText: '待处理'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    colors: {
      filled: 'bg-orange-500 text-white',
      outlined: 'border-orange-500 text-orange-700 bg-white',
      subtle: 'bg-orange-100 text-orange-800'
    },
    defaultText: '警告'
  },
  error: {
    icon: ExclamationTriangleIcon,
    colors: {
      filled: 'bg-red-500 text-white',
      outlined: 'border-red-500 text-red-700 bg-white',
      subtle: 'bg-red-100 text-red-800'
    },
    defaultText: '错误'
  }
};

const sizeClasses = {
  sm: {
    container: 'px-2 py-0.5 text-xs',
    icon: 'w-3 h-3'
  },
  md: {
    container: 'px-2 py-1 text-sm',
    icon: 'w-4 h-4'
  },
  lg: {
    container: 'px-3 py-1.5 text-base',
    icon: 'w-5 h-5'
  }
};

export const StateChip: React.FC<StateChipProps> = ({
  status,
  text,
  size = 'md',
  variant = 'subtle',
  showIcon = true,
  className
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayText = text || config.defaultText;

  const chipClasses = cn(
    // 基础样式
    'inline-flex items-center rounded-full font-medium transition-colors',
    
    // 尺寸
    sizeClasses[size].container,
    
    // 颜色和变体
    config.colors[variant],
    
    // 边框（仅 outlined 变体）
    variant === 'outlined' ? 'border' : '',
    
    className
  );

  return (
    <span className={chipClasses}>
      {showIcon && (
        <Icon className={cn(sizeClasses[size].icon, text ? 'mr-1' : '')} />
      )}
      {text && displayText}
    </span>
  );
};
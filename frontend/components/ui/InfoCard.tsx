import React from 'react';
import { Card, CardProps } from './Card';
import { cn } from '@/utils/cn';

export interface InfoCardProps extends Omit<CardProps, 'children'> {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

const colorClasses = {
  blue: {
    background: 'bg-blue-50',
    title: 'text-blue-900',
    value: 'text-blue-900',
    subtitle: 'text-blue-700',
    description: 'text-blue-600',
    iconBg: 'bg-blue-100',
    icon: 'text-blue-600'
  },
  green: {
    background: 'bg-green-50',
    title: 'text-green-900',
    value: 'text-green-900',
    subtitle: 'text-green-700',
    description: 'text-green-600',
    iconBg: 'bg-green-100',
    icon: 'text-green-600'
  },
  orange: {
    background: 'bg-orange-50',
    title: 'text-orange-900',
    value: 'text-orange-900',
    subtitle: 'text-orange-700',
    description: 'text-orange-600',
    iconBg: 'bg-orange-100',
    icon: 'text-orange-600'
  },
  red: {
    background: 'bg-red-50',
    title: 'text-red-900',
    value: 'text-red-900',
    subtitle: 'text-red-700',
    description: 'text-red-600',
    iconBg: 'bg-red-100',
    icon: 'text-red-600'
  },
  gray: {
    background: 'bg-gray-50',
    title: 'text-gray-900',
    value: 'text-gray-900',
    subtitle: 'text-gray-700',
    description: 'text-gray-600',
    iconBg: 'bg-gray-100',
    icon: 'text-gray-600'
  }
};

const sizeClasses = {
  sm: {
    container: 'p-3',
    title: 'text-sm',
    value: 'text-lg font-bold',
    subtitle: 'text-xs',
    description: 'text-xs',
    icon: 'w-4 h-4',
    iconContainer: 'w-8 h-8'
  },
  md: {
    container: 'p-4',
    title: 'text-base',
    value: 'text-2xl font-bold',
    subtitle: 'text-sm',
    description: 'text-sm',
    icon: 'w-5 h-5',
    iconContainer: 'w-10 h-10'
  },
  lg: {
    container: 'p-6',
    title: 'text-lg',
    value: 'text-3xl font-bold',
    subtitle: 'text-base',
    description: 'text-base',
    icon: 'w-6 h-6',
    iconContainer: 'w-12 h-12'
  }
};

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  value,
  subtitle,
  description,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  size = 'md',
  className,
  ...cardProps
}) => {
  const colors = colorClasses[color];
  const sizes = sizeClasses[size];

  return (
    <Card 
      className={cn(colors.background, sizes.container, className)}
      {...cardProps}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 标题 */}
          <h3 className={cn(sizes.title, colors.title, 'font-medium mb-1')}>
            {title}
          </h3>
          
          {/* 主要数值 */}
          <div className={cn(sizes.value, colors.value, 'mb-1')}>
            {value}
          </div>
          
          {/* 副标题 */}
          {subtitle && (
            <p className={cn(sizes.subtitle, colors.subtitle, 'mb-1')}>
              {subtitle}
            </p>
          )}
          
          {/* 趋势显示 */}
          {trend && trendValue && (
            <div className={cn(sizes.subtitle, 'flex items-center space-x-1')}>
              {trend === 'up' && (
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {trend === 'down' && (
                <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {trend === 'stable' && (
                <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}>
                {trendValue}
              </span>
            </div>
          )}
          
          {/* 描述信息 */}
          {description && (
            <p className={cn(sizes.description, colors.description, 'mt-2')}>
              {description}
            </p>
          )}
        </div>
        
        {/* 图标 */}
        {Icon && (
          <div className={cn(
            sizes.iconContainer,
            colors.iconBg,
            'rounded-lg flex items-center justify-center flex-shrink-0'
          )}>
            <Icon className={cn(sizes.icon, colors.icon)} />
          </div>
        )}
      </div>
    </Card>
  );
};
import { useState, useEffect } from 'react';

// 响应式设计系统配置
export const breakpoints = {
  xs: '480px',   // 小屏手机
  sm: '640px',   // 大屏手机  
  md: '768px',   // 平板
  lg: '1024px',  // 小桌面
  xl: '1280px',  // 大桌面
  '2xl': '1536px' // 超大屏
} as const;

export const deviceQueries = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)', 
  desktop: '(min-width: 1024px)',
  touch: '(hover: none) and (pointer: coarse)',
  pointer: '(hover: hover) and (pointer: fine)',
  landscape: '(orientation: landscape)',
  portrait: '(orientation: portrait)'
} as const;

// 响应式间距系统
export const spacing = {
  xs: {
    padding: 'p-2',
    margin: 'm-2',
    gap: 'gap-2'
  },
  sm: {
    padding: 'p-3',
    margin: 'm-3', 
    gap: 'gap-3'
  },
  md: {
    padding: 'p-4',
    margin: 'm-4',
    gap: 'gap-4'
  },
  lg: {
    padding: 'p-6',
    margin: 'm-6',
    gap: 'gap-6'
  },
  xl: {
    padding: 'p-8',
    margin: 'm-8',
    gap: 'gap-8'
  }
} as const;

// 响应式文本大小
export const textSizes = {
  mobile: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl'
  },
  desktop: {
    xs: 'text-sm',
    sm: 'text-base', 
    base: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
    '2xl': 'text-3xl'
  }
} as const;

// 触摸目标最小尺寸 (44px - Apple HIG)
export const touchTargets = {
  min: 'min-h-[44px] min-w-[44px]',
  comfortable: 'min-h-[48px] min-w-[48px]',
  large: 'min-h-[56px] min-w-[56px]'
} as const;

// 响应式组件变体
export interface ResponsiveVariant {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}

export const getResponsiveClasses = (variant: ResponsiveVariant): string => {
  return [
    variant.mobile || '',
    variant.tablet ? `md:${variant.tablet}` : '',
    variant.desktop ? `lg:${variant.desktop}` : ''
  ].filter(Boolean).join(' ');
};

// 设备检测 Hook
export const useDeviceDetection = () => {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  useEffect(() => {
    const updateDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDevice('mobile');
      } else if (width < 1024) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }

      setIsTouchDevice(window.matchMedia(deviceQueries.touch).matches);
      setOrientation(window.matchMedia(deviceQueries.portrait).matches ? 'portrait' : 'landscape');
    };

    updateDevice();
    window.addEventListener('resize', updateDevice);
    window.addEventListener('orientationchange', updateDevice);

    return () => {
      window.removeEventListener('resize', updateDevice);
      window.removeEventListener('orientationchange', updateDevice);
    };
  }, []);

  return { device, isTouchDevice, orientation };
};
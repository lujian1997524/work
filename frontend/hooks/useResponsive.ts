'use client';

import { useEffect, useState } from 'react';

// 响应式 Hook
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });
      
      // 设备类型判断
      if (width < 768) {
        setDevice('mobile');
      } else if (width < 1024) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }

      // 触摸设备检测
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
      
      // 方向检测
      setOrientation(height > width ? 'portrait' : 'landscape');
    };

    handleResize();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    windowSize,
    device,
    isTouchDevice,
    orientation,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet', 
    isDesktop: device === 'desktop',
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape'
  };
};

// 断点检测 Hook
export const useBreakpoint = (breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl') => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const breakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536
    };

    const checkBreakpoint = () => {
      setMatches(window.innerWidth >= breakpoints[breakpoint]);
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);

    return () => window.removeEventListener('resize', checkBreakpoint);
  }, [breakpoint]);

  return matches;
};

// 媒体查询 Hook
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    const updateMatch = () => setMatches(media.matches);
    updateMatch();
    
    media.addEventListener('change', updateMatch);
    return () => media.removeEventListener('change', updateMatch);
  }, [query]);

  return matches;
};
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import DxfFontCache from '@/utils/dxfFontCache';

/**
 * DXF 字体预加载组件
 * 在应用启动时预加载字体，避免每次打开图纸都要加载
 * 公共队列页面不预加载，提升页面加载速度
 */
export const DxfFontPreloader: React.FC = () => {
  const pathname = usePathname();

  useEffect(() => {
    // 检查是否为公共队列页面，如果是则不预加载字体
    const isPublicQueuePage = pathname === '/queue/laser_queue_2025_public';
    
    if (isPublicQueuePage) {
      console.log('公共队列页面，跳过DXF字体预加载');
      return;
    }

    // 检查字体是否已经预加载过
    const fontCache = DxfFontCache.getInstance();
    if (fontCache.isPreloaded()) {
      console.log('DXF字体已预加载，跳过');
      return;
    }

    // 在空闲时预加载字体
    const preloadFonts = async () => {
      // 使用 requestIdleCallback 在浏览器空闲时加载
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(async () => {
          await fontCache.preloadFonts();
        }, { timeout: 5000 });
      } else {
        // 降级方案
        setTimeout(async () => {
          await fontCache.preloadFonts();
        }, 1000);
      }
    };

    preloadFonts();
  }, [pathname]);

  // 这个组件不渲染任何内容
  return null;
};
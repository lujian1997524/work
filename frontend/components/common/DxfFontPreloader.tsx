'use client';

import { useEffect } from 'react';
import DxfFontCache from '@/utils/dxfFontCache';

/**
 * DXF 字体预加载组件
 * 在应用启动时预加载字体，避免每次打开图纸都要加载
 */
export const DxfFontPreloader: React.FC = () => {
  useEffect(() => {
    // 在空闲时预加载字体
    const preloadFonts = async () => {
      const fontCache = DxfFontCache.getInstance();
      
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
  }, []);

  // 这个组件不渲染任何内容
  return null;
};
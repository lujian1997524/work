'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useResponsive } from './useResponsive';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  networkRequests: number;
  cacheHitRate: number;
}

export const usePerformance = () => {
  const { isMobile } = useResponsive();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    networkRequests: 0,
    cacheHitRate: 0
  });
  const [isLowPerformanceMode, setIsLowPerformanceMode] = useState(false);

  // 检测设备性能
  useEffect(() => {
    const checkDevicePerformance = () => {
      // 基于设备和网络状况判断是否启用低性能模式
      const connection = (navigator as any).connection;
      const isSlowConnection = connection && (
        connection.effectiveType === 'slow-2g' || 
        connection.effectiveType === '2g' ||
        connection.saveData
      );
      
      const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
      const hasLimitedRAM = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
      
      if (isMobile && (isSlowConnection || isLowEndDevice || hasLimitedRAM)) {
        setIsLowPerformanceMode(true);
      }
    };

    checkDevicePerformance();
  }, [isMobile]);

  // 性能监控
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          setMetrics(prev => ({
            ...prev,
            renderTime: navEntry.loadEventEnd - navEntry.loadEventStart
          }));
        }
        
        if (entry.entryType === 'resource') {
          setMetrics(prev => ({
            ...prev,
            networkRequests: prev.networkRequests + 1
          }));
        }
      }
    });

    try {
      observer.observe({ type: 'navigation', buffered: true });
      observer.observe({ type: 'resource', buffered: true });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }

    return () => observer.disconnect();
  }, []);

  // 内存使用监控
  useEffect(() => {
    const checkMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
        }));
      }
    };

    const interval = setInterval(checkMemoryUsage, 10000); // 10秒检查一次
    checkMemoryUsage();

    return () => clearInterval(interval);
  }, []);

  // 优化建议
  const optimizationSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    
    if (metrics.renderTime > 3000) {
      suggestions.push('页面加载时间过长，建议启用低性能模式');
    }
    
    if (metrics.memoryUsage && metrics.memoryUsage > 100) {
      suggestions.push('内存使用过高，建议刷新页面释放内存');
    }
    
    if (metrics.networkRequests > 50) {
      suggestions.push('网络请求过多，建议启用离线模式');
    }
    
    return suggestions;
  }, [metrics]);

  // 强制低性能模式
  const enableLowPerformanceMode = useCallback(() => {
    setIsLowPerformanceMode(true);
    localStorage.setItem('low-performance-mode', 'true');
  }, []);

  const disableLowPerformanceMode = useCallback(() => {
    setIsLowPerformanceMode(false);
    localStorage.setItem('low-performance-mode', 'false');
  }, []);

  // 清理内存
  const clearMemory = useCallback(() => {
    if ('gc' in window) {
      (window as any).gc();
    }
    // 清理本地缓存
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('dynamic')) {
            caches.delete(name);
          }
        });
      });
    }
  }, []);

  return {
    metrics,
    isLowPerformanceMode,
    optimizationSuggestions,
    enableLowPerformanceMode,
    disableLowPerformanceMode,
    clearMemory
  };
};
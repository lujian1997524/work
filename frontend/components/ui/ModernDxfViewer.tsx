'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  MagnifyingGlassPlusIcon, 
  MagnifyingGlassMinusIcon, 
  HomeIcon,
  ArrowsPointingOutIcon,
  DocumentTextIcon,
  CogIcon,
  EyeIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { apiRequest } from '@/utils/api';
import { DxfFontManager, FontPerformanceMonitor } from '@/utils/fontConfig';
import DxfFontCache from '@/utils/dxfFontCache';

// DXF-Viewer类型声明
declare global {
  interface Window {
    DxfViewer: any;
  }
}

interface Drawing {
  id: number;
  filename: string;
  originalName?: string;
  version: string;
  uploadTime?: string;
  fileSize?: number;
}

interface ModernDxfViewerProps {
  drawing: Drawing | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ViewerStats {
  entities: number;
  layers: number;
  bounds: { width: number; height: number } | null;
  loadTime: number;
  fileSize: string;
}

/**
 * 现代化DXF查看器 - 基于dxf-viewer库，优化字体和UI
 */
export const ModernDxfViewer: React.FC<ModernDxfViewerProps> = ({
  drawing,
  isOpen,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dxfViewerRef = useRef<any>(null);
  const loadStartTime = useRef<number>(0);
  const fontManagerRef = useRef<DxfFontManager>(DxfFontManager.getInstance());
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [viewerStats, setViewerStats] = useState<ViewerStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [fontStats, setFontStats] = useState<{ loaded: number; total: number } | null>(null);
  
  const toast = useToast();

  /**
   * 初始化字体管理器
   */
  const initializeFontManager = useCallback(async () => {
    if (!fontManagerRef.current) {
      fontManagerRef.current = DxfFontManager.getInstance();
    }
    
    try {
      setLoadingPhase('正在预加载字体...');
      await fontManagerRef.current.preloadCriticalFonts();
      
      const stats = fontManagerRef.current.getFontStats();
      setFontStats(stats);
      
      console.log('字体预加载完成:', stats);
    } catch (error) {
      console.warn('字体预加载部分失败:', error);
    }
  }, []);

  /**
   * 优化的字体配置 - 使用字体缓存
   */
  const getOptimizedFonts = useCallback(() => {
    // 使用字体缓存获取字体URLs
    const fontCache = DxfFontCache.getInstance();
    const cacheStats = fontCache.getCacheStats();
    
    console.log(`🎨 字体缓存状态: ${cacheStats.cachedFonts}/${cacheStats.totalFonts} 已缓存 (${cacheStats.cacheSize})`);
    
    return fontCache.getFontUrls();
  }, []);

  /**
   * 动态加载dxf-viewer库
   */
  const loadDxfViewer = useCallback(async () => {
    if (window.DxfViewer) return window.DxfViewer;
    
    try {
      // 动态导入dxf-viewer
      const module = await import('dxf-viewer');
      window.DxfViewer = module.DxfViewer;
      return module.DxfViewer;
    } catch (error) {
      console.error('加载dxf-viewer失败:', error);
      throw new Error('无法加载DXF查看器组件');
    }
  }, []);

  /**
   * 进度回调处理
   */
  const handleProgress = useCallback((phase: string, loaded: number, total: number) => {
    const phaseMap: Record<string, string> = {
      'fetch': '正在获取文件...',
      'font': '正在加载字体...',
      'parse': '正在解析DXF...',
      'render': '正在渲染图形...',
    };

    setLoadingPhase(phaseMap[phase] || phase);
    
    if (total > 0) {
      const progress = Math.round((loaded / total) * 100);
      setLoadingProgress(progress);
    }

    console.log(`DXF加载进度: ${phase} - ${loaded}/${total}`);
  }, []);

  /**
   * 加载DXF文件
   */
  const loadDxfFile = useCallback(async () => {
    if (!drawing || !containerRef.current) return;

    setLoading(true);
    setError('');
    setLoadingProgress(0);
    setViewerStats(null);
    loadStartTime.current = performance.now();

    try {
      // 1. 初始化字体管理器
      await initializeFontManager();

      // 2. 加载dxf-viewer库
      setLoadingPhase('正在初始化查看器...');
      const DxfViewer = await loadDxfViewer();

      // 3. 清理旧的查看器
      if (dxfViewerRef.current) {
        try {
          dxfViewerRef.current.Dispose();
        } catch (e) {
          console.warn('清理旧查看器时出错:', e);
        }
      }

      // 4. 创建新的查看器实例
      const viewer = new DxfViewer(containerRef.current, {
        clearColor: '#1a1a1a',           // 深色背景
        colorCorrection: true,           // 颜色校正
        blackWhiteInversion: false,      // 不反转黑白
        antialias: true,                 // 抗锯齿
        alpha: true,                     // 透明度支持
        preserveDrawingBuffer: true      // 保持绘图缓冲
      });

      dxfViewerRef.current = viewer;

      // 5. 获取DXF文件内容
      setLoadingPhase('正在获取DXF文件...');
      const response = await apiRequest(`/api/drawings/${drawing.id}/content`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 无法获取文件内容`);
      }

      const dxfContent = await response.text();
      if (!dxfContent) {
        throw new Error('DXF文件内容为空');
      }

      // 6. 配置并加载DXF - 使用优化的字体配置
      const optimizedFonts = getOptimizedFonts();
      await viewer.Load({
        url: `data:application/dxf;base64,${btoa(unescape(encodeURIComponent(dxfContent)))}`,
        fonts: optimizedFonts,
        progressCbk: handleProgress,
        // 添加WebWorker支持以提高性能
        workerFactory: () => new Worker(new URL('dxf-viewer/lib/DxfWorker.js', import.meta.url))
      });

      // 7. 渲染和适应视图
      setLoadingPhase('正在渲染图形...');
      viewer.Render();
      
      setTimeout(() => {
        viewer.ZoomToFit();
      }, 100);

      // 8. 收集统计信息
      const loadTime = performance.now() - loadStartTime.current;
      const stats: ViewerStats = {
        entities: viewer.GetEntitiesCount?.() || 0,
        layers: viewer.GetLayersCount?.() || 0,
        bounds: viewer.GetBounds?.() || null,
        loadTime: Math.round(loadTime),
        fileSize: drawing.fileSize ? `${(drawing.fileSize / 1024).toFixed(1)} KB` : '未知'
      };
      
      setViewerStats(stats);

      // 9. 更新字体统计
      if (fontManagerRef.current) {
        const fontStats = fontManagerRef.current.getFontStats();
        setFontStats(fontStats);
      }

      toast.addToast({
        type: 'success',
        message: `DXF文件加载成功！${stats.entities} 个实体，用时 ${stats.loadTime}ms`
      });

      console.log('DXF加载完成:', stats);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('DXF加载失败:', err);
      setError(errorMessage);
      
      toast.addToast({
        type: 'error',
        message: `DXF加载失败: ${errorMessage}`
      });
    } finally {
      setLoading(false);
      setLoadingPhase('');
      setLoadingProgress(0);
    }
  }, [drawing, initializeFontManager, loadDxfViewer, getOptimizedFonts, handleProgress, toast]);

  /**
   * 查看器控制功能
   */
  const handleZoomIn = useCallback(() => {
    if (dxfViewerRef.current?.ZoomIn) {
      dxfViewerRef.current.ZoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (dxfViewerRef.current?.ZoomOut) {
      dxfViewerRef.current.ZoomOut();
    }
  }, []);

  const handleZoomToFit = useCallback(() => {
    if (dxfViewerRef.current?.ZoomToFit) {
      dxfViewerRef.current.ZoomToFit();
    }
  }, []);

  const handleFullscreen = useCallback(() => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    if (isOpen && drawing) {
      loadDxfFile();
    }
  }, [isOpen, drawing?.id, loadDxfFile]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (dxfViewerRef.current) {
        try {
          dxfViewerRef.current.Dispose();
        } catch (e) {
          console.warn('清理查看器时出错:', e);
        }
        dxfViewerRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
      >
        <div className="h-full flex flex-col">
          {/* 顶部工具栏 - iOS 18风格 */}
          <div className="bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <DocumentTextIcon className="w-7 h-7 text-orange-500" />
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {drawing?.originalName || drawing?.filename || 'DXF文件'}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-white/70">
                    <span>版本 {drawing?.version || '1'}</span>
                    {viewerStats && (
                      <>
                        <span>• {viewerStats.entities} 个实体</span>
                        <span>• {viewerStats.fileSize}</span>
                        <span>• {viewerStats.loadTime}ms</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStats(!showStats)}
                  className="text-white hover:bg-white/10"
                >
                  <EyeIcon className="w-5 h-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/10"
                >
                  <XMarkIcon className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex relative">
            {/* 左侧工具栏 */}
            <div className="w-16 bg-black/60 backdrop-blur-xl border-r border-white/10 flex flex-col items-center py-4 space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="w-12 h-12 text-white hover:bg-white/10 rounded-xl"
                title="放大"
                disabled={loading}
              >
                <MagnifyingGlassPlusIcon className="w-6 h-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="w-12 h-12 text-white hover:bg-white/10 rounded-xl"
                title="缩小"
                disabled={loading}
              >
                <MagnifyingGlassMinusIcon className="w-6 h-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomToFit}
                className="w-12 h-12 text-white hover:bg-white/10 rounded-xl"
                title="适应窗口"
                disabled={loading}
              >
                <HomeIcon className="w-6 h-6" />
              </Button>
              
              <div className="w-8 h-px bg-white/20 my-2" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreen}
                className="w-12 h-12 text-white hover:bg-white/10 rounded-xl"
                title="全屏"
                disabled={loading}
              >
                <ArrowsPointingOutIcon className="w-6 h-6" />
              </Button>
            </div>

            {/* 主显示区域 */}
            <div className="flex-1 relative bg-gradient-to-br from-gray-900 to-black">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {loadingPhase || '正在加载...'}
                    </h3>
                    {loadingProgress > 0 && (
                      <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${loadingProgress}%` }}
                        />
                      </div>
                    )}
                    <p className="text-white/70">
                      使用WebCache.cn优化字体加载，提升中文显示效果
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <PhotoIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-red-400 mb-2">加载失败</h3>
                    <p className="text-white/70 mb-6">{error}</p>
                    <Button 
                      onClick={loadDxfFile} 
                      variant="primary"
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      重新加载
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  ref={containerRef}
                  className="w-full h-full"
                  style={{ minHeight: '400px' }}
                />
              )}
            </div>

            {/* 统计信息侧边栏 */}
            {showStats && viewerStats && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                className="w-80 bg-black/80 backdrop-blur-xl border-l border-white/10 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">文件信息</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowStats(false)}
                    className="text-white/70 hover:text-white"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-white/70 mb-1">实体数量</div>
                    <div className="text-2xl font-bold text-orange-400">{viewerStats.entities}</div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-white/70 mb-1">图层数量</div>
                    <div className="text-2xl font-bold text-orange-400">{viewerStats.layers}</div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-white/70 mb-1">文件大小</div>
                    <div className="text-lg font-semibold text-white">{viewerStats.fileSize}</div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-white/70 mb-1">加载时间</div>
                    <div className="text-lg font-semibold text-white">{viewerStats.loadTime}ms</div>
                  </div>
                  
                  {fontStats && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-white/70 mb-2">字体状态</div>
                      <div className="text-sm text-white mb-1">
                        已加载: {fontStats.loaded}/{fontStats.total}
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(fontStats.loaded / fontStats.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {viewerStats.bounds && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-white/70 mb-1">图形边界</div>
                      <div className="text-sm text-white">
                        {viewerStats.bounds.width.toFixed(1)} × {viewerStats.bounds.height.toFixed(1)}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* 底部状态栏 */}
          <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 px-6 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6 text-white/70">
                <span>DXF查看器 v2.0</span>
                <span>WebCache.cn字体加速</span>
                {viewerStats && <span>渲染完成</span>}
              </div>
              <div className="text-white/50">
                右键拖拽平移 • 滚轮缩放 • ESC关闭
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModernDxfViewer;
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { Modal, Button, Loading } from '@/components/ui';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
interface Drawing {
  id: number;
  projectId: number;
  filename: string;
  originalFilename?: string;
  filePath: string;
  version: string;
  createdAt: string;
  uploader?: { id: number; name: string };
}

interface DxfPreviewModalProps {
  drawing: Drawing | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DxfPreviewModal: React.FC<DxfPreviewModalProps> = ({
  drawing,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerInstance, setViewerInstance] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const { token } = useAuth();
  
  // DXF内容缓存Key
  const getCacheKey = (drawingId: number) => `dxf-content-${drawingId}`;
  
  // 获取缓存的DXF内容
  const getCachedContent = (drawingId: number): string | null => {
    try {
      const cached = sessionStorage.getItem(getCacheKey(drawingId));
      return cached;
    } catch {
      return null;
    }
  };
  
  // 缓存DXF内容
  const setCachedContent = (drawingId: number, content: string) => {
    try {
      sessionStorage.setItem(getCacheKey(drawingId), content);
    } catch {
      // sessionStorage满了或不可用，忽略缓存
    }
  };

  // 等待DOM挂载
  useEffect(() => {
    setMounted(true);
    
    // 全局优化：为可能的滚动事件添加被动监听器
    const addPassiveListeners = () => {
      const events = ['wheel', 'touchstart', 'touchmove', 'touchend'];
      events.forEach(event => {
        document.addEventListener(event, () => {}, { passive: true });
      });
    };
    
    addPassiveListeners();
    
    return () => setMounted(false);
  }, []);

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen && mounted) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, mounted]);

  // DXF加载逻辑
  useEffect(() => {
    // 重置初始化标记
    initRef.current = false;
    
    if (!isOpen || !drawing || !mounted || !token) {
      setLoading(true);
      setError(null);
      return;
    }

    // 直接加载，移除不必要的延迟
    if (!initRef.current) {
      initRef.current = true;
      loadDxfViewer();
    }

    return () => {
      cleanupViewer();
    };
  }, [isOpen, drawing, mounted, token]);

  const loadDxfViewer = async () => {
    try {
      setLoading(true);
      setError(null);

      // 检查容器是否存在，简化等待逻辑
      if (!containerRef.current) {
        throw new Error('预览容器初始化失败');
      }

      // 使用 requestIdleCallback 在空闲时执行重型操作
      const performHeavyWork = () => {
        return new Promise<void>((resolve) => {
          const callback = () => {
            // 分批处理，避免阻塞UI
            requestAnimationFrame(() => {
              resolve();
            });
          };
          
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(callback, { timeout: 100 });
          } else {
            setTimeout(callback, 0);
          }
        });
      };

      await performHeavyWork();

      // 动态导入dxf-viewer
      const { DxfViewer } = await import('dxf-viewer');
      
      // 清理容器
      containerRef.current.innerHTML = '';

      // 创建查看器
      const viewer = new DxfViewer(containerRef.current, {
        autoResize: true,
        colorCorrection: true
        // 移除不支持的canvasOptions
      });

      // 为 dxf-viewer 添加被动事件监听器支持
      const originalAddEventListener = containerRef.current.addEventListener;
      if (originalAddEventListener) {
        containerRef.current.addEventListener = function(type: string, listener: any, options?: any) {
          // 将滚动相关事件设为被动监听
          if (typeof type === 'string' && (type.includes('scroll') || type.includes('wheel') || type.includes('touch'))) {
            const passiveOptions = typeof options === 'object' 
              ? { ...options, passive: true }
              : { passive: true };
            return originalAddEventListener.call(this, type, listener, passiveOptions);
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
      }

      setViewerInstance(viewer);

      // 检查缓存的DXF内容
      let dxfContent = getCachedContent(drawing?.id || 0);
      
      if (!dxfContent) {
        // 获取DXF内容
        const response = await apiRequest(`/api/drawings/${drawing?.id}/content`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('认证失败，请重新登录');
          }
          throw new Error(`获取图纸内容失败: ${response.status}`);
        }

        dxfContent = await response.text();
        
        // 缓存内容
        setCachedContent(drawing?.id || 0, dxfContent);
      }

      // 在下一个帧中加载到查看器，避免阻塞
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // 加载到查看器
      await viewer.Load({
        url: `data:application/dxf;charset=utf-8,${encodeURIComponent(dxfContent)}`,
        // 使用原版字体，确保稳定性
        fonts: [
          '/fonts/NotoSansSC-Thin.ttf'                      // 原版 10MB，稳定可靠
        ],
        progressCbk: (phase: string, receivedBytes: number, totalBytes: number) => {
          // 进度回调 - 可以在这里添加进度显示
        },
        workerFactory: undefined
      } as any);

      setLoading(false);

    } catch (err) {
      let errorMessage = '加载DXF失败';
      
      if (err instanceof Error) {
        if (err.message.includes('认证失败')) {
          errorMessage = '认证失败，请重新登录';
        } else if (err.message.includes('获取图纸内容失败')) {
          errorMessage = '网络连接问题，无法获取图纸内容';
        } else if (err.message.includes('预览容器初始化失败')) {
          errorMessage = '预览组件初始化失败，请刷新页面重试';
        } else if (err.message.includes('Load')) {
          errorMessage = 'DXF文件格式可能有问题，无法正常显示';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
      
      // 清理可能有问题的缓存
      if (drawing?.id) {
        try {
          sessionStorage.removeItem(getCacheKey(drawing.id));
        } catch {}
      }
    }
  };

  const cleanupViewer = () => {
    if (viewerInstance && viewerInstance.Dispose) {
      try {
        viewerInstance.Dispose();
        setViewerInstance(null);
      } catch (error) {
      }
    }
  };

  const handleClose = () => {
    cleanupViewer();
    onClose();
  };

  // 工具栏已移除
  const renderToolbar = () => {
    return null;
  };

  if (!mounted || !drawing) return null;

  const fileName = drawing.originalFilename || drawing.filename;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{fileName}</h2>
                  <p className="text-xs text-gray-500">
                    版本 {drawing.version} • {drawing.uploader?.name || '未知'} • {new Date(drawing.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                
              >
                <XMarkIcon className="w-6 h-6 text-gray-500 group-hover:text-gray-700" />
              </button>
            </div>

            {/* 预览内容 */}
            <div className="flex-1 relative overflow-hidden bg-gray-50">
              {renderToolbar()}
              
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <Loading text="加载图纸预览中..." size="lg" />
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                  <div className="text-center">
                    <div className="text-red-500 mb-4">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <p className="text-lg text-red-600 mb-4">{error}</p>
                    <button
                      onClick={() => {
                        setError(null);
                        // 清理可能有问题的缓存
                        if (drawing?.id) {
                          try {
                            sessionStorage.removeItem(getCacheKey(drawing.id));
                          } catch {}
                        }
                        if (!initRef.current) {
                          initRef.current = true;
                          loadDxfViewer();
                        }
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      重试
                    </button>
                  </div>
                </div>
              )}

              <div 
                ref={containerRef} 
                className="w-full h-full dxf-viewer-container"
                style={{ background: '#ffffff' }}
              />
            </div>

            {/* 底部操作栏 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-gray-700">
                    专业图纸预览
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => window.open(`/api/drawings/${drawing.id}/download`, '_blank')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>下载文件</span>
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    关闭预览
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
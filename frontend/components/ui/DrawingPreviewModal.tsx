'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CADPreview } from './CADPreview';

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

interface DrawingPreviewModalProps {
  drawing: Drawing | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DrawingPreviewModal: React.FC<DrawingPreviewModalProps> = ({
  drawing,
  isOpen,
  onClose
}) => {
  const [showCADPreview, setShowCADPreview] = useState(false);

  // 简化CAD预览组件显示，减少延迟和时序冲突
  useEffect(() => {
    if (isOpen && drawing) {
      setShowCADPreview(true);
    } else {
      setShowCADPreview(false);
    }
  }, [isOpen, drawing]);
  
  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 禁止页面滚动
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!drawing) return null;

  const fileName = drawing.originalFilename || drawing.filename;
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  const isDXF = fileExtension === 'dxf';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 - 全屏 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-stretch justify-stretch p-0"
          >
              {/* 弹窗内容 - 全屏模式 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl w-full h-full max-w-none max-h-none overflow-hidden flex flex-col"
            >
              {/* 标题栏 - 精简版 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex-1">
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
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                  title="关闭预览 (ESC)"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-500 group-hover:text-gray-700" />
                </button>
              </div>

              {/* 预览内容 - 全屏 */}
              <div className="flex-1 overflow-hidden">
                {isDXF ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    {showCADPreview ? (
                      <CADPreview
                        drawing={drawing} // 直接传递完整的图纸信息
                        width={window.innerWidth - 40} // 全屏宽度减去边距
                        height={window.innerHeight - 200} // 全屏高度减去标题栏和底栏
                        className="rounded-lg border border-gray-200 shadow-lg"
                        enableInteraction={false} // 禁用交互功能
                        showToolbar={false} // 隐藏工具栏
                        onError={(error) => {
                          console.error('DXF预览失败:', error);
                        }}
                        onLoad={() => {
                          // DXF预览加载成功
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center" style={{ width: window.innerWidth - 40, height: window.innerHeight - 200 }}>
                        <div className="flex flex-col items-center space-y-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-blue-500"></div>
                          <span className="text-lg text-gray-600">准备图纸预览中...</span>
                          <span className="text-sm text-gray-400">专业图纸查看</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-24">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-medium text-gray-900 mb-4">无法预览此文件</h3>
                    <p className="text-gray-600 mb-8 text-lg">
                      仅支持DXF格式的图纸预览，其他格式请下载到本地查看
                    </p>
                    <button
                      onClick={() => window.open(`/api/drawings/${drawing.id}/download`, '_blank')}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-lg"
                    >
                      下载文件
                    </button>
                  </div>
                )}
              </div>

              {/* 底部操作栏 - 增强版 */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium text-gray-700">
                      {isDXF ? '专业图纸预览' : '文件信息预览'}
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
                      onClick={onClose}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                    >
                      <span>关闭预览</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
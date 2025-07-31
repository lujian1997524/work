'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CADPreview } from './CADPreview';
import cadFileHandler from '@/utils/cadFileHandler';

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

interface DrawingHoverCardProps {
  drawings: Drawing[];
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onOpenDrawing?: (drawing: Drawing) => void;
}

export const DrawingHoverCard: React.FC<DrawingHoverCardProps> = ({
  drawings,
  isVisible,
  position,
  onClose,
  onOpenDrawing
}) => {
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);

  useEffect(() => {
    if (drawings.length > 0) {
      // 默认选择第一个图纸进行预览
      setSelectedDrawing(drawings[0]);
    }
  }, [drawings]);

  const handleOpenDrawing = async (drawing: Drawing) => {
    if (onOpenDrawing) {
      onOpenDrawing(drawing);
    } else {
      // 使用默认的CAD文件打开逻辑
      try {
        const fileName = drawing.originalFilename || drawing.filename;
        const cadCheck = await cadFileHandler.isCADFile(fileName);
        
        if (cadCheck.isCADFile) {
          // 使用CAD软件打开
          const result = await cadFileHandler.openCADFile(drawing.filePath);
          if (result.success) {
            console.log(`图纸已用 ${result.software} 打开`);
          } else {
            alert(`打开图纸失败: ${result.error}`);
          }
        } else {
          // 非CAD文件，使用默认方式打开
          if (cadFileHandler.isElectronEnvironment() && window.electronAPI && window.electronAPI.openFile) {
            await window.electronAPI.openFile(drawing.filePath);
          } else {
            // 网页环境下载文件
            window.open(`/api/drawings/${drawing.id}/download`, '_blank');
          }
        }
      } catch (error) {
        console.error('打开图纸失败:', error);
        alert('打开图纸失败');
      }
    }
  };

  if (!isVisible || drawings.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* 预览卡片 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
            style={{
              left: Math.min(position.x, window.innerWidth - 420), // 防止超出右边界
              top: Math.min(position.y, window.innerHeight - 480), // 防止超出下边界
              width: 400,
              maxHeight: 460
            }}
          >
            {/* 卡片头部 */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">图纸预览</h3>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">{drawings.length}个图纸文件</p>
            </div>

            {/* DXF预览区域 */}
            <div className="p-4">
              {selectedDrawing && (
                <CADPreview
                  drawingId={selectedDrawing.id}
                  width={368}
                  height={200}
                  className="mb-4"
                  onError={(error) => console.warn('DXF预览失败:', error)}
                />
              )}
            </div>

            {/* 图纸列表 */}
            <div className="border-t border-gray-200 max-h-32 overflow-y-auto">
              {drawings.map((drawing, index) => {
                const fileName = drawing.originalFilename || drawing.filename;
                const isDXF = fileName.toLowerCase().endsWith('.dxf');
                const isSelected = selectedDrawing?.id === drawing.id;
                
                return (
                  <div
                    key={drawing.id}
                    className={`flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedDrawing(drawing)}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {isDXF ? (
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate text-sm">
                          {fileName}
                        </div>
                        <div className="text-xs text-gray-500">
                          版本 {drawing.version} • {drawing.uploader?.name || '未知'} • {new Date(drawing.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      
                      {isDXF && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                          DXF
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 操作按钮 */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                <button
                  onClick={() => selectedDrawing && handleOpenDrawing(selectedDrawing)}
                  disabled={!selectedDrawing}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  打开图纸
                </button>
                <button
                  onClick={() => selectedDrawing && window.open(`/api/drawings/${selectedDrawing.id}/download`, '_blank')}
                  disabled={!selectedDrawing}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  下载
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
// 企业级DXF预览主组件 - 基于dxf-viewer库重构
// frontend/components/ui/EnterpriseDxfViewer.tsx

'use client';

import React from 'react';
import ModernDxfViewer from './ModernDxfViewer';

interface Drawing {
  id: number;
  filename: string;
  originalName: string;
  filePath: string;
  version: string;
  createdAt: string;
  uploadTime?: string;
  fileSize?: number;
}

interface EnterpriseDxfViewerProps {
  drawing: Drawing | null;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * 企业级DXF查看器 - 基于优化的dxf-viewer实现
 */
export const EnterpriseDxfViewer: React.FC<EnterpriseDxfViewerProps> = ({
  drawing,
  isOpen,
  onClose,
  className = ''
}) => {
  if (!isOpen || !drawing) return null;

  // 转换数据格式以匹配ModernDxfViewer组件
  const modernDrawingFormat = {
    id: drawing.id,
    filename: drawing.filename,
    originalName: drawing.originalName || drawing.filename,
    version: drawing.version || '1',
    uploadTime: drawing.uploadTime || drawing.createdAt,
    fileSize: drawing.fileSize || 0
  };

  return (
    <ModernDxfViewer
      drawing={modernDrawingFormat}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};

export default EnterpriseDxfViewer;
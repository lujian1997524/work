'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Badge, Tooltip } from '@/components/ui';
import { FireIcon } from '@heroicons/react/24/outline';
import { Drawing } from './DrawingLibrary';
import { DrawingActionButton, DrawingAdvancedActions } from './DrawingActionButton';
import { useResponsive } from '@/hooks/useResponsive';

export interface DrawingCardProps {
  drawing: Drawing;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onPreview?: () => void;
  onAdvancedPreview?: () => void;
  onOpen?: () => void;
  className?: string;
}

export const DrawingCard: React.FC<DrawingCardProps> = ({
  drawing,
  selected = false,
  onSelect,
  onDelete,
  onEdit,
  onPreview,
  onAdvancedPreview,
  onOpen,
  className = ''
}) => {
  const { isMobile } = useResponsive();
  
  // 防抖处理，避免重复点击
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isAdvancedProcessing, setIsAdvancedProcessing] = React.useState(false);
  
  // 异步处理预览点击
  const handlePreviewClick = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // 使用 requestAnimationFrame 延迟执行重型操作
      await new Promise(resolve => requestAnimationFrame(resolve));
      onPreview?.();
    } finally {
      // 短暂延迟后重置状态，避免连续点击
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  // 异步处理高级预览点击
  const handleAdvancedPreviewClick = async () => {
    if (isAdvancedProcessing) return;
    
    setIsAdvancedProcessing(true);
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      onAdvancedPreview?.();
    } finally {
      setTimeout(() => setIsAdvancedProcessing(false), 500);
    }
  };
  // 获取文件类型图标 - 只支持DXF
  const getFileTypeIcon = (fileType: string) => {
    // 只支持DXF文件，显示CAD图标
    return (
      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 获取状态样式变体
  const getStatusVariant = (status: string) => {
    switch (status) {
      case '可用':
        return 'success';
      case '已废弃':
        return 'danger';
      case '已归档':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
      onClick={() => onSelect?.(!selected)}
    >
      <Card
        padding="md"
        className={`relative cursor-pointer transition-all duration-200 ${
          selected 
            ? 'ring-2 ring-ios18-blue bg-blue-50' 
            : 'hover:shadow-lg hover:shadow-gray-200/50'
        }`}
      >
        {/* 选择框 */}
        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-ios18-blue text-white rounded-full flex items-center justify-center text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* 文件信息区域 - 移除图标，简化设计 */}
        <div className="space-y-3">
          {/* 文件名 */}
          <Tooltip content={drawing.originalName}>
            <h3 className="font-medium text-base text-gray-900 truncate">
              {drawing.originalName}
            </h3>
          </Tooltip>

          {/* 版本和状态 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              版本 {drawing.version}
            </span>
            <Badge
              variant={getStatusVariant(drawing.status)}
              size="sm"
            >
              {drawing.status}
            </Badge>
          </div>

          {/* 文件信息 */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>DXF 文件</span>
            <span>{formatFileSize(drawing.fileSize)}</span>
          </div>

          {/* 项目关联信息 */}
          {drawing.project ? (
            <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
              关联：{drawing.project.name}
            </div>
          ) : drawing.projectIds && drawing.projectIds.length > 0 ? (
            <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
              关联 {drawing.projectIds.length} 个项目
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              未关联项目
            </div>
          )}

          {/* 描述（如果有） */}
          {drawing.description && (
            <Tooltip content={drawing.description}>
              <p className="text-sm text-gray-600 truncate bg-gray-50 px-2 py-1 rounded">
                {drawing.description}
              </p>
            </Tooltip>
          )}

          {/* 时间信息 */}
          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            {new Date(drawing.updatedAt).toLocaleDateString('zh-CN')}
          </div>
        </div>

        {/* 操作按钮 - 移动端始终显示，桌面端悬停显示 */}
        <motion.div
          className={`absolute inset-0 ${
            isMobile 
              ? 'bg-transparent' 
              : 'bg-black/10 opacity-0 hover:opacity-100 transition-opacity'
          } flex items-center justify-center gap-2`}
          onClick={(e) => e.stopPropagation()} // 防止触发卡片选择
        >
          {/* 高级预览按钮 */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAdvancedPreviewClick}
            disabled={isAdvancedProcessing}
            className={
              isMobile
                ? `bg-orange-50 shadow-lg border border-orange-200 text-orange-600 hover:bg-orange-100 ${isAdvancedProcessing ? 'opacity-50' : ''}`
                : `bg-orange-50/90 hover:bg-orange-100 text-orange-600 border border-orange-200 ${isAdvancedProcessing ? 'opacity-50' : ''}`
            }
          >
            {isAdvancedProcessing ? (
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FireIcon className="w-4 h-4" />
            )}
          </Button>

          {/* 预览按钮 */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePreviewClick}
            disabled={isProcessing}
            className={
              isMobile
                ? `bg-white shadow-lg border border-gray-200 ${isProcessing ? 'opacity-50' : ''}`
                : `bg-white/90 hover:bg-white ${isProcessing ? 'opacity-50' : ''}`
            }
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </Button>

          {/* 主要操作按钮 - 使用新的统一接口 */}
          <DrawingActionButton 
            drawing={{
              id: drawing.id,
              filename: drawing.filename,
              version: drawing.version,
              filePath: drawing.filePath,
              projectId: drawing.project?.id || 0
            }}
            variant="secondary"
            size="sm"
            showText={false}
          />

          {/* 编辑按钮 */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit?.()}
            className={
              isMobile
                ? "bg-white shadow-lg border border-gray-200"
                : "bg-white/90 hover:bg-white"
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>

          {/* 删除按钮 */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDelete?.()}
            className={
              isMobile
                ? "bg-white shadow-lg border border-gray-200 text-red-600 hover:text-red-700"
                : "bg-white/90 hover:bg-white text-red-600 hover:text-red-700"
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>

          {/* 桌面端高级操作 - 仅在非移动端显示 */}
          {!isMobile && (
            <DrawingAdvancedActions 
              drawing={{
                id: drawing.id,
                filename: drawing.filename,
                version: drawing.version,
                filePath: drawing.filePath,
                projectId: drawing.project?.id || 0
              }}
            />
          )}
        </motion.div>
      </Card>
    </motion.div>
  );
};
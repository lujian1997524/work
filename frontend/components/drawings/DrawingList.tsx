'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Tooltip } from '@/components/ui';
import { Drawing } from './DrawingLibrary';

export interface DrawingListProps {
  drawings: Drawing[];
  selectedDrawings: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  onDelete: (drawing: Drawing) => void;
  onEdit: (drawing: Drawing) => void;
  onPreview: (drawing: Drawing) => void;
  onOpen?: (drawing: Drawing) => void;
  className?: string;
}

export const DrawingList: React.FC<DrawingListProps> = ({
  drawings,
  selectedDrawings,
  onSelectionChange,
  onDelete,
  onEdit,
  onPreview,
  onOpen,
  className = ''
}) => {
  // 处理单个图纸选择
  const handleDrawingSelect = (drawingId: number, selected: boolean) => {
    if (selected) {
      onSelectionChange([...selectedDrawings, drawingId]);
    } else {
      onSelectionChange(selectedDrawings.filter(id => id !== drawingId));
    }
  };

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectedDrawings.length === drawings.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(drawings.map(d => d.id));
    }
  };

  // 获取文件类型图标 - 只支持DXF
  const getFileTypeIcon = (fileType: string) => {
    // 只支持DXF文件，显示CAD图标
    return (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className={`overflow-hidden flex flex-col h-full ${className}`}>
      <Card padding="none" className="flex-1 overflow-hidden">
        {/* 表头 */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-700">
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={selectedDrawings.length === drawings.length && drawings.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-ios18-blue bg-gray-100 border-gray-300 rounded focus:ring-ios18-blue focus:ring-2"
              />
            </div>
            <div className="col-span-4">文件名</div>
            <div className="col-span-1">类型</div>
            <div className="col-span-1">版本</div>
            <div className="col-span-1">大小</div>
            <div className="col-span-2">修改时间</div>
            <div className="col-span-1">状态</div>
            <div className="col-span-1">操作</div>
          </div>
        </div>

        {/* 表格内容 */}
        <div className="overflow-auto flex-1">
          <AnimatePresence mode="popLayout">
            {drawings.map((drawing, index) => (
              <motion.div
                key={drawing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className={`border-b border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  selectedDrawings.includes(drawing.id) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="grid grid-cols-12 gap-4 items-center text-sm">
                  {/* 选择框 */}
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedDrawings.includes(drawing.id)}
                      onChange={(e) => handleDrawingSelect(drawing.id, e.target.checked)}
                      className="w-4 h-4 text-ios18-blue bg-gray-100 border-gray-300 rounded focus:ring-ios18-blue focus:ring-2"
                    />
                  </div>

                  {/* 文件名 */}
                  <div className="col-span-4 flex items-center gap-3">
                    {getFileTypeIcon(drawing.fileType)}
                    <div className="min-w-0 flex-1">
                      <Tooltip content={drawing.originalName}>
                        <div className="font-medium text-gray-900 truncate">
                          {drawing.originalName}
                        </div>
                      </Tooltip>
                      {drawing.description && (
                        <Tooltip content={drawing.description}>
                          <div className="text-gray-500 text-xs truncate">
                            {drawing.description}
                          </div>
                        </Tooltip>
                      )}
                      {/* 标签 */}
                      {drawing.tags && drawing.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {drawing.tags.slice(0, 2).map((tag, tagIndex) => (
                            <Badge
                              key={tagIndex}
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {drawing.tags.length > 2 && (
                            <Badge variant="secondary" size="sm" className="text-xs">
                              +{drawing.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 文件类型 */}
                  <div className="col-span-1">
                    <Badge variant="secondary" size="sm">
                      {drawing.fileType}
                    </Badge>
                  </div>

                  {/* 版本 */}
                  <div className="col-span-1 text-gray-600">
                    v{drawing.version}
                  </div>

                  {/* 文件大小 */}
                  <div className="col-span-1 text-gray-600">
                    {formatFileSize(drawing.fileSize)}
                  </div>

                  {/* 修改时间 */}
                  <div className="col-span-2 text-gray-600">
                    <div>{new Date(drawing.updatedAt).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(drawing.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* 状态 */}
                  <div className="col-span-1">
                    <Badge
                      variant={getStatusVariant(drawing.status)}
                      size="sm"
                    >
                      {drawing.status}
                    </Badge>
                  </div>

                  {/* 操作按钮 */}
                  <div className="col-span-1 flex items-center gap-1">
                    <Tooltip content="预览">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPreview(drawing)}
                        className="p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Button>
                    </Tooltip>

                    {onOpen && (
                      <Tooltip content="打开">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpen(drawing)}
                          className="p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Button>
                      </Tooltip>
                    )}

                    <Tooltip content="编辑">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(drawing)}
                        className="p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    </Tooltip>

                    <Tooltip content="删除">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(drawing)}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </Tooltip>
                  </div>
                </div>

                {/* 项目关联信息 */}
                {drawing.projectIds && drawing.projectIds.length > 0 && (
                  <div className="mt-2 text-xs text-blue-600">
                    关联项目: {drawing.projectIds.length} 个
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
};
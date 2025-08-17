'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Drawing } from './DrawingLibrary';
import { 
  DocumentIcon, 
  EyeIcon, 
  ArrowDownTrayIcon, 
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import { Button, Input, Select } from '@/components/ui';
import { downloadDrawingWeb } from '@/utils/drawingHandlersPure';

export interface DrawingTableViewProps {
  drawings: Drawing[];
  selectedDrawings?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  onDelete: (drawing: Drawing) => void;
  onEdit: (drawing: Drawing) => void;
  onPreview: (drawing: Drawing) => void;
  onOpen?: (drawing: Drawing) => void;
  className?: string;
  showProjectColumn?: boolean;
}

type SortField = 'originalName' | 'status' | 'version' | 'fileSize' | 'createdAt' | 'uploadedBy';

export const DrawingTableView: React.FC<DrawingTableViewProps> = ({
  drawings,
  selectedDrawings = [],
  onSelectionChange,
  onDelete,
  onEdit,
  onPreview,
  onOpen,
  className = '',
  showProjectColumn = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 处理排序
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 处理下载
  const handleDownload = async (drawing: Drawing) => {
    try {
      // 转换为 drawingHandlersPure 需要的格式
      const drawingForDownload = {
        id: drawing.id,
        filename: drawing.filename,
        version: drawing.version,
        filePath: drawing.filePath,
        projectId: 0 // 图纸库中的图纸没有关联项目
      };
      await downloadDrawingWeb(drawingForDownload);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '可用': return 'bg-green-100 text-green-800';
      case '已废弃': return 'bg-red-100 text-red-800';
      case '已归档': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  // 过滤和排序逻辑
  const filteredAndSortedDrawings = drawings
    .filter(drawing => {
      const matchesSearch = !searchTerm || 
        drawing.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drawing.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (drawing.description && drawing.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || drawing.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === undefined || bValue === undefined) return 0;
      
      let result = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        result = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue));
      }
      
      return sortDirection === 'asc' ? result : -result;
    });

  const statuses = ['可用', '已废弃', '已归档'];

  // 桌面端表格视图
  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('originalName')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>图纸名称</span>
                <ArrowsUpDownIcon className="w-4 h-4" />
              </button>
            </th>
            
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('status')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>状态</span>
                <ArrowsUpDownIcon className="w-4 h-4" />
              </button>
            </th>
            
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('version')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>版本</span>
                <ArrowsUpDownIcon className="w-4 h-4" />
              </button>
            </th>
            
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('fileSize')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>文件大小</span>
                <ArrowsUpDownIcon className="w-4 h-4" />
              </button>
            </th>
            
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('createdAt')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>上传时间</span>
                <ArrowsUpDownIcon className="w-4 h-4" />
              </button>
            </th>
            
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAndSortedDrawings.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center">
                <div className="text-gray-400">
                  <DocumentIcon className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm || filterStatus !== 'all' ? '没有找到匹配的图纸' : '暂无图纸'}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            filteredAndSortedDrawings.map((drawing, index) => (
              <motion.tr 
                key={drawing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DocumentIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {drawing.originalName}
                      </div>
                      {drawing.description && (
                        <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                          {drawing.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(drawing.status)}`}>
                    {drawing.status}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    v{drawing.version}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatFileSize(drawing.fileSize)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(drawing.createdAt)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onPreview(drawing)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                      title="预览"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(drawing)}
                      className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50"
                      title="下载"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(drawing)}
                      className="text-yellow-600 hover:text-yellow-900 p-1 rounded-md hover:bg-yellow-50"
                      title="编辑"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(drawing)}
                      className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                      title="删除"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // 移动端列表视图
  const renderMobileView = () => (
    <div className="space-y-3">
      {filteredAndSortedDrawings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400">
            <DocumentIcon className="w-12 h-12 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all' ? '没有找到匹配的图纸' : '暂无图纸'}
            </p>
          </div>
        </div>
      ) : (
        filteredAndSortedDrawings.map((drawing, index) => (
          <motion.div
            key={drawing.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1 min-w-0">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DocumentIcon className="w-5 h-5 text-blue-600" />
                </div>
                
                <div className="ml-3 flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {drawing.originalName}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(drawing.status)}`}>
                      {drawing.status}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      v{drawing.version}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatFileSize(drawing.fileSize)} • {formatDate(drawing.createdAt)}
                  </div>
                  {drawing.description && (
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {drawing.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => onPreview(drawing)}
                className="flex items-center space-x-1 px-2 py-1 text-blue-600 bg-blue-50 rounded text-sm font-medium hover:bg-blue-100"
              >
                <EyeIcon className="w-4 h-4" />
                <span>预览</span>
              </button>
              
              <button
                onClick={() => handleDownload(drawing)}
                className="flex items-center space-x-1 px-2 py-1 text-green-600 bg-green-50 rounded text-sm font-medium hover:bg-green-100"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>下载</span>
              </button>
              
              <button
                onClick={() => onEdit(drawing)}
                className="flex items-center space-x-1 px-2 py-1 text-yellow-600 bg-yellow-50 rounded text-sm font-medium hover:bg-yellow-100"
              >
                <PencilIcon className="w-4 h-4" />
                <span>编辑</span>
              </button>
              
              <button
                onClick={() => onDelete(drawing)}
                className="flex items-center space-x-1 px-2 py-1 text-red-600 bg-red-50 rounded text-sm font-medium hover:bg-red-100"
              >
                <TrashIcon className="w-4 h-4" />
                <span>删除</span>
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* 工具栏 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              图纸列表
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredAndSortedDrawings.length} 个图纸)
              </span>
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 搜索框 */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索图纸..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            
            {/* 状态筛选 */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Select
                options={[
                  { label: '全部状态', value: 'all' },
                  ...statuses.map(status => ({ label: status, value: status }))
                ]}
                value={filterStatus}
                onChange={(value) => setFilterStatus(value as string)}
                className="pl-10 w-full sm:w-32"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 桌面端显示表格，移动端显示列表 */}
        <div className="hidden md:block">
          {renderTableView()}
        </div>
        <div className="block md:hidden">
          {renderMobileView()}
        </div>
      </div>
    </div>
  );
};
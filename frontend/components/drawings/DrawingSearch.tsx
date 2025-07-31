'use client';

import React, { useState } from 'react';
import { Button, Input, Dropdown, DatePicker, Slider } from '@/components/ui';

export interface DrawingSearchFilters {
  fileTypes: string[];
  sizeRange: [number, number]; // MB
  dateRange: [Date | null, Date | null];
  status: string[];
  tags: string[];
  projectAssociation: 'all' | 'associated' | 'unassociated';
}

export interface DrawingSearchProps {
  onSearch: (filters: DrawingSearchFilters) => void;
  onReset: () => void;
  className?: string;
}

export const DrawingSearch: React.FC<DrawingSearchProps> = ({
  onSearch,
  onReset,
  className = ''
}) => {
  const [filters, setFilters] = useState<DrawingSearchFilters>({
    fileTypes: [],
    sizeRange: [0, 100],
    dateRange: [null, null],
    status: [],
    tags: [],
    projectAssociation: 'all'
  });

  const [tagInput, setTagInput] = useState('');

  // 文件类型选项 - 只支持DXF
  const fileTypeOptions = [
    { label: 'DXF文件', value: 'DXF' }
  ];

  // 状态选项
  const statusOptions = [
    { label: '可用', value: '可用' },
    { label: '维护中', value: '维护中' },
    { label: '已废弃', value: '已废弃' }
  ];

  // 项目关联选项
  const associationOptions = [
    { label: '全部', value: 'all' },
    { label: '已关联', value: 'associated' },
    { label: '未关联', value: 'unassociated' }
  ];

  // 处理文件类型选择
  const handleFileTypeChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      fileTypes: prev.fileTypes.includes(value)
        ? prev.fileTypes.filter(t => t !== value)
        : [...prev.fileTypes, value]
    }));
  };

  // 处理状态选择
  const handleStatusChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(value)
        ? prev.status.filter(s => s !== value)
        : [...prev.status, value]
    }));
  };

  // 添加标签
  const addTag = () => {
    if (tagInput.trim() && !filters.tags.includes(tagInput.trim())) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // 移除标签
  const removeTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  // 重置筛选器
  const handleReset = () => {
    setFilters({
      fileTypes: [],
      sizeRange: [0, 100],
      dateRange: [null, null],
      status: [],
      tags: [],
      projectAssociation: 'all'
    });
    setTagInput('');
    onReset();
  };

  // 应用筛选
  const handleSearch = () => {
    onSearch(filters);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 文件类型筛选 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          文件类型
        </label>
        <div className="flex flex-wrap gap-2">
          {fileTypeOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.fileTypes.includes(option.value)}
                onChange={() => handleFileTypeChange(option.value)}
                className="w-4 h-4 text-ios18-blue bg-gray-100 border-gray-300 rounded focus:ring-ios18-blue focus:ring-2"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 文件大小范围 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          文件大小范围 (MB)
        </label>
        <div className="px-2">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 min-w-[60px]">最小值:</label>
              <Slider
                min={0}
                max={100}
                value={filters.sizeRange[0]}
                onChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  sizeRange: [value as number, prev.sizeRange[1]] 
                }))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 min-w-[40px]">{filters.sizeRange[0]} MB</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 min-w-[60px]">最大值:</label>
              <Slider
                min={0}
                max={100}
                value={filters.sizeRange[1]}
                onChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  sizeRange: [prev.sizeRange[0], value as number] 
                }))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 min-w-[40px]">{filters.sizeRange[1]} MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* 日期范围 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            开始日期
          </label>
          <DatePicker
            value={filters.dateRange[0] || undefined}
            onChange={(date) => setFilters(prev => ({ 
              ...prev, 
              dateRange: [date, prev.dateRange[1]] 
            }))}
            placeholder="选择开始日期"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            结束日期
          </label>
          <DatePicker
            value={filters.dateRange[1] || undefined}
            onChange={(date) => setFilters(prev => ({ 
              ...prev, 
              dateRange: [prev.dateRange[0], date] 
            }))}
            placeholder="选择结束日期"
          />
        </div>
      </div>

      {/* 状态筛选 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          状态
        </label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.status.includes(option.value)}
                onChange={() => handleStatusChange(option.value)}
                className="w-4 h-4 text-ios18-blue bg-gray-100 border-gray-300 rounded focus:ring-ios18-blue focus:ring-2"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 项目关联 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          项目关联
        </label>
        <Dropdown
          options={associationOptions}
          value={filters.projectAssociation}
          onChange={(value) => setFilters(prev => ({ 
            ...prev, 
            projectAssociation: value as 'all' | 'associated' | 'unassociated' 
          }))}
          className="w-full"
        />
      </div>

      {/* 标签筛选 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          标签
        </label>
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="输入标签名称..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            className="flex-1"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={addTag}
            disabled={!tagInput.trim()}
          >
            添加
          </Button>
        </div>
        
        {/* 已选择的标签 */}
        {filters.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="hover:text-blue-600"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={handleReset}
        >
          重置
        </Button>
        <Button
          variant="primary"
          onClick={handleSearch}
        >
          应用筛选
        </Button>
      </div>
    </div>
  );
};
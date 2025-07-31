'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { ChevronDownIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface AdvancedFiltersProps {
  onFilterChange: (filters: any) => void;
  className?: string;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  onFilterChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    status: '',
    priority: '',
    department: '',
    dateFrom: '',
    dateTo: '',
    sort: 'relevance'
  });

  // 定义选项数据
  const typeOptions: SelectOption[] = [
    { value: 'all', label: '全部类型' },
    { value: 'projects', label: '项目' },
    { value: 'workers', label: '工人' },
    { value: 'drawings', label: '图纸' }
  ];

  const statusOptions: SelectOption[] = [
    { value: '', label: '所有状态' },
    { value: 'pending', label: '待处理' },
    { value: 'in_progress', label: '进行中' },
    { value: 'completed', label: '已完成' }
  ];

  const priorityOptions: SelectOption[] = [
    { value: '', label: '所有优先级' },
    { value: 'high', label: '高优先级' },
    { value: 'medium', label: '中优先级' },
    { value: 'low', label: '低优先级' }
  ];

  const departmentOptions: SelectOption[] = [
    { value: '', label: '所有部门' },
    { value: '激光切割部', label: '激光切割部' },
    { value: '焊接部', label: '焊接部' },
    { value: '质检部', label: '质检部' },
    { value: '包装部', label: '包装部' }
  ];

  const sortOptions: SelectOption[] = [
    { value: 'relevance', label: '相关度' },
    { value: 'date_desc', label: '创建时间 (新→旧)' },
    { value: 'date_asc', label: '创建时间 (旧→新)' },
    { value: 'name', label: '名称排序' }
  ];

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      type: 'all',
      status: '',
      priority: '',
      department: '',
      dateFrom: '',
      dateTo: '',
      sort: 'relevance'
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value && value !== 'all' && value !== 'relevance'
  ).length;

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="secondary"
        size="md"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-xl text-text-primary hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <AdjustmentsHorizontalIcon className="w-5 h-5" />
          <span>高级筛选</span>
          {activeFiltersCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center"
            >
              {activeFiltersCount}
            </motion.span>
          )}
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-text-tertiary"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </motion.span>
        </div>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 right-0 w-80 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-lg p-6 z-40"
          >
            <div className="space-y-6">
              {/* 标题 */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-text-primary">筛选条件</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-700"
                >
                  清除全部
                </Button>
              </div>

              {/* 搜索类型 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  搜索类型
                </label>
                <Select
                  value={filters.type}
                  onChange={(value) => handleFilterChange('type', value as string)}
                  options={typeOptions}
                  variant="default"
                />
              </div>

              {/* 状态筛选 */}
              {(filters.type === 'all' || filters.type === 'projects') && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    项目状态
                  </label>
                  <Select
                    value={filters.status}
                    onChange={(value) => handleFilterChange('status', value as string)}
                    options={statusOptions}
                    variant="default"
                  />
                </div>
              )}

              {/* 优先级筛选 */}
              {(filters.type === 'all' || filters.type === 'projects') && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    优先级
                  </label>
                  <Select
                    value={filters.priority}
                    onChange={(value) => handleFilterChange('priority', value as string)}
                    options={priorityOptions}
                    variant="default"
                  />
                </div>
              )}

              {/* 部门筛选 */}
              {(filters.type === 'all' || filters.type === 'workers') && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    部门
                  </label>
                  <Select
                    value={filters.department}
                    onChange={(value) => handleFilterChange('department', value as string)}
                    options={departmentOptions}
                    variant="default"
                  />
                </div>
              )}

              {/* 日期范围 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  创建日期
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    placeholder="开始日期"
                    variant="default"
                  />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    placeholder="结束日期"
                    variant="default"
                  />
                </div>
              </div>

              {/* 排序方式 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  排序方式
                </label>
                <Select
                  value={filters.sort}
                  onChange={(value) => handleFilterChange('sort', value as string)}
                  options={sortOptions}
                  variant="default"
                />
              </div>

              {/* 应用按钮 */}
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  应用筛选
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
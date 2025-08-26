'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Select, SelectOption } from '@/components/ui';
import { ChevronDownIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { PROJECT_STATUS_OPTIONS, PROJECT_PRIORITY_OPTIONS } from '@/constants/projectEnums';

interface AdvancedFiltersProps {
  onFilterChange: (filters: any) => void;
  className?: string;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  onFilterChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const { token } = useAuth();
  
  const [filters, setFilters] = useState({
    type: 'all',
    status: '',
    priority: '',
    department: '',
    dateFrom: '',
    dateTo: '',
    sort: 'relevance'
  });

  // 获取部门数据
  const fetchDepartments = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/workers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const workers = data.workers || [];
        // 提取唯一的部门名称
        const uniqueDepartments = [...new Set(
          workers
            .map((worker: any) => worker.department)
            .filter((dept: string) => dept && dept.trim())
        )].sort() as string[];
        setDepartments(uniqueDepartments);
      }
    } catch (error) {
      // 获取部门列表失败，忽略错误日志
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [token]);

  // 定义选项数据
  const typeOptions: SelectOption[] = [
    { value: 'all', label: '全部类型' },
    { value: 'projects', label: '项目' },
    { value: 'workers', label: '工人' },
    { value: 'drawings', label: '图纸' }
  ];

  const statusOptions: SelectOption[] = [
    { value: '', label: '所有状态' },
    ...PROJECT_STATUS_OPTIONS
  ];

  const priorityOptions: SelectOption[] = [
    { value: '', label: '所有优先级' },
    ...PROJECT_PRIORITY_OPTIONS
  ];

  const departmentOptions: SelectOption[] = [
    { value: '', label: '所有部门' },
    ...departments.map(dept => ({ value: dept, label: dept }))
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
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDownIcon, 
  FireIcon, 
  FolderIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Badge, Loading } from '@/components/ui';
import { useMaterialTypeStats } from '@/hooks/useMaterialTypeStats';
import type { MaterialFilter, FilterOption } from '@/types/materialStats';

interface OptimizedThicknessFilterProps {
  currentFilter: MaterialFilter;
  onFilterChange: (filter: MaterialFilter) => void;
  className?: string;
  compact?: boolean;
}

export const OptimizedThicknessFilter: React.FC<OptimizedThicknessFilterProps> = ({
  currentFilter,
  onFilterChange,
  className = '',
  compact = false
}) => {
  const [showCarbonDetails, setShowCarbonDetails] = useState(true);
  const [showSpecialDetails, setShowSpecialDetails] = useState(false);
  const { data, loading, error } = useMaterialTypeStats();

  if (loading) {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <Loading text="加载筛选数据..." size="sm" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="text-sm text-red-600">
          {error || '筛选数据加载失败'}
        </div>
      </div>
    );
  }

  // 获取状态图标和颜色
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-3 h-3 text-green-600" />;
      case 'in_progress':
        return <PlayIcon className="w-3 h-3 text-blue-600" />;
      case 'pending':
        return <ClockIcon className="w-3 h-3 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // 处理厚度规格选择
  const handleThicknessToggle = (thicknessSpecId: number) => {
    const currentIds = currentFilter.thicknessSpecIds || [];
    const newIds = currentIds.includes(thicknessSpecId)
      ? currentIds.filter(id => id !== thicknessSpecId)
      : [...currentIds, thicknessSpecId];
    
    onFilterChange({
      ...currentFilter,
      thicknessSpecIds: newIds.length > 0 ? newIds : undefined
    });
  };

  // 处理材料类型快速筛选
  const handleMaterialTypeFilter = (type: 'all' | 'carbon' | 'special') => {
    onFilterChange({
      ...currentFilter,
      materialType: type,
      thicknessSpecIds: undefined // 清除厚度筛选
    });
  };

  // 处理状态筛选
  const handleStatusFilter = (status: 'all' | 'pending' | 'in_progress' | 'completed') => {
    onFilterChange({
      ...currentFilter,
      status: status
    });
  };

  // 清除所有筛选
  const clearAllFilters = () => {
    onFilterChange({
      materialType: 'all',
      status: 'all',
      thicknessSpecIds: undefined,
      hasProjects: undefined
    });
  };

  const selectedThicknessIds = currentFilter.thicknessSpecIds || [];
  const hasActiveFilters = currentFilter.materialType !== 'all' || 
                          currentFilter.status !== 'all' || 
                          selectedThicknessIds.length > 0;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* 筛选器标题栏 */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-gray-900">材料类型筛选</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-700"
            >
              <XMarkIcon className="w-3 h-3" />
              <span>清除筛选</span>
            </button>
          )}
        </div>
      </div>

      {/* 快速筛选按钮 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex space-x-2">
          {[
            { value: 'all', label: '所有材料', count: data.summary.totalMaterials },
            { value: 'carbon', label: '碳板', count: data.summary.carbonMaterials.totalMaterials },
            ...(data.summary.specialMaterials.totalMaterials > 0 ? [
              { value: 'special', label: '特殊材料', count: data.summary.specialMaterials.totalMaterials }
            ] : [])
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleMaterialTypeFilter(option.value as any)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                currentFilter.materialType === option.value
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
              }`}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      </div>

      {/* 状态筛选 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="text-xs font-medium text-gray-700 mb-2">按状态筛选</div>
        <div className="flex space-x-2">
          {[
            { value: 'all', label: '全部', icon: null },
            { value: 'pending', label: '待处理', icon: 'pending' },
            { value: 'in_progress', label: '进行中', icon: 'in_progress' },
            { value: 'completed', label: '已完成', icon: 'completed' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusFilter(option.value as any)}
              className={`flex items-center space-x-1 px-2 py-1 text-xs rounded border transition-colors ${
                currentFilter.status === option.value
                  ? getStatusColor(option.icon || 'default').replace('100', '200')
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {option.icon && getStatusIcon(option.icon)}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 碳板材料详细筛选 */}
      {data.carbonMaterials.length > 0 && currentFilter.materialType !== 'special' && (
        <div className="border-b border-gray-100">
          <button
            onClick={() => setShowCarbonDetails(!showCarbonDetails)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <FireIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">碳板材料</span>
              <Badge variant="primary" className="text-xs">
                {data.summary.carbonMaterials.percentage}%
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {selectedThicknessIds.filter(id => 
                  data.carbonMaterials.some(m => m.thicknessSpecId === id)
                ).length}/{data.carbonMaterials.length} 已选
              </span>
              <ChevronDownIcon 
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  showCarbonDetails ? 'rotate-180' : ''
                }`} 
              />
            </div>
          </button>
          
          <AnimatePresence>
            {showCarbonDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    {data.carbonMaterials.map((material) => {
                      const isSelected = selectedThicknessIds.includes(material.thicknessSpecId);
                      return (
                        <button
                          key={material.thicknessSpecId}
                          onClick={() => handleThicknessToggle(material.thicknessSpecId)}
                          className={`p-2 text-left rounded border transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {material.thickness}{material.unit}
                            </span>
                            <span className="text-xs text-gray-500">
                              {material.stats.totalMaterials}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <div className={`w-2 h-2 rounded-full ${
                              material.stats.completionRate >= 80 ? 'bg-green-500' :
                              material.stats.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <span className="text-xs text-gray-500">
                              {material.stats.completionRate}% 完成
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 特殊材料详细筛选 */}
      {data.specialMaterials.length > 0 && currentFilter.materialType !== 'carbon' && (
        <div>
          <button
            onClick={() => setShowSpecialDetails(!showSpecialDetails)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <FolderIcon className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-900">特殊材料</span>
              <Badge variant="secondary" className="text-xs">
                {data.summary.specialMaterials.percentage}%
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {selectedThicknessIds.filter(id => 
                  data.specialMaterials.some(m => m.thicknessSpecId === id)
                ).length}/{data.specialMaterials.length} 已选
              </span>
              <ChevronDownIcon 
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  showSpecialDetails ? 'rotate-180' : ''
                }`} 
              />
            </div>
          </button>
          
          <AnimatePresence>
            {showSpecialDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    {data.specialMaterials.map((material) => {
                      const isSelected = selectedThicknessIds.includes(material.thicknessSpecId);
                      return (
                        <button
                          key={material.thicknessSpecId}
                          onClick={() => handleThicknessToggle(material.thicknessSpecId)}
                          className={`p-2 text-left rounded border transition-colors ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 text-orange-900'
                              : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium">
                                {material.thickness}{material.unit}
                              </div>
                              <div className="text-xs text-gray-500">
                                {material.materialType}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {material.stats.totalMaterials}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <div className={`w-2 h-2 rounded-full ${
                              material.stats.completionRate >= 80 ? 'bg-green-500' :
                              material.stats.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <span className="text-xs text-gray-500">
                              {material.stats.completionRate}% 完成
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 筛选统计 */}
      {hasActiveFilters && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="text-xs text-blue-700">
            已应用 {[
              currentFilter.materialType !== 'all' && '材料类型',
              currentFilter.status !== 'all' && '状态',
              selectedThicknessIds.length > 0 && '厚度规格'
            ].filter(Boolean).join('、')} 筛选
          </div>
        </div>
      )}
    </div>
  );
};
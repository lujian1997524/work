'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SpecialMaterialData {
  id: number;
  name: string;
  materialType: string;
  thickness: string;
  unit: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedBy?: { id: number; name: string };
  startDate?: string;
  completedDate?: string;
  notes?: string;
}

interface SpecialMaterialsSectionProps {
  materials: SpecialMaterialData[];
  title?: string;
  variant?: 'default' | 'compact' | 'detailed';
  defaultExpanded?: boolean;
  showEmptyState?: boolean;
  onMaterialClick?: (materialId: number) => void;
  onMaterialStatusChange?: (materialId: number, newStatus: 'pending' | 'in_progress' | 'completed') => void;
  className?: string;
}

export const SpecialMaterialsSection: React.FC<SpecialMaterialsSectionProps> = ({
  materials,
  title = "特殊材料",
  variant = 'default',
  defaultExpanded = false,
  showEmptyState = true,
  onMaterialClick,
  onMaterialStatusChange,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // 计算统计数据
  const totalMaterials = materials.length;
  const completedMaterials = materials.filter(m => m.status === 'completed').length;
  const inProgressMaterials = materials.filter(m => m.status === 'in_progress').length;
  const completionRate = totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0;

  // 按材料类型分组
  const materialsByType = materials.reduce((acc, material) => {
    const type = material.materialType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(material);
    return acc;
  }, {} as Record<string, SpecialMaterialData[]>);

  // 状态配置
  const statusConfig = {
    pending: { label: '待处理', color: 'bg-gray-200', textColor: 'text-gray-600', borderColor: 'border-gray-300' },
    in_progress: { label: '进行中', color: 'bg-blue-200', textColor: 'text-blue-600', borderColor: 'border-blue-300' },
    completed: { label: '已完成', color: 'bg-green-200', textColor: 'text-green-600', borderColor: 'border-green-300' }
  };

  // 状态切换逻辑
  const getNextStatus = (currentStatus: string): 'pending' | 'in_progress' | 'completed' => {
    switch (currentStatus) {
      case 'pending': return 'in_progress';
      case 'in_progress': return 'completed';
      case 'completed': return 'pending';
      default: return 'pending';
    }
  };

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未设置';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 如果没有特殊材料且不显示空状态，则不渲染
  if (totalMaterials === 0 && !showEmptyState) {
    return null;
  }

  // 紧凑模式
  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200 ${className}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-2 flex items-center justify-between hover:bg-orange-100 transition-colors rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">{title}</span>
            <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
              {totalMaterials}种
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-orange-700">{completionRate}%</span>
            {isExpanded ? (
              <ChevronDownIcon className="w-3 h-3 text-orange-600" />
            ) : (
              <ChevronRightIcon className="w-3 h-3 text-orange-600" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-2 pb-2 space-y-1">
                {totalMaterials === 0 ? (
                  <div className="text-xs text-orange-500 text-center py-2">
                    暂无特殊材料
                  </div>
                ) : (
                  materials.map((material) => (
                    <div key={material.id} className="flex items-center justify-between bg-white bg-opacity-50 rounded px-2 py-1 text-xs">
                      <span className="text-orange-700">{material.thickness}{material.unit} {material.materialType}</span>
                      <span className={`px-1 py-0.5 rounded text-xs ${statusConfig[material.status].color} ${statusConfig[material.status].textColor}`}>
                        {statusConfig[material.status].label}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 详细模式
  if (variant === 'detailed') {
    return (
      <div className={`bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200 ${className}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-orange-100 transition-colors rounded-t-lg"
        >
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
            <div className="text-left">
              <div className="text-sm font-semibold text-orange-800">{title}</div>
              <div className="text-xs text-orange-600">
                {completedMaterials}/{totalMaterials} 已完成 ({completionRate}%)
                {inProgressMaterials > 0 && ` · ${inProgressMaterials} 进行中`}
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-orange-600" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-orange-600" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                {totalMaterials === 0 ? (
                  <div className="text-center py-6 text-orange-500">
                    <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无特殊材料</p>
                    <p className="text-xs opacity-75">该项目完全使用碳板材料</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 进度条 */}
                    <div className="bg-white bg-opacity-60 rounded p-3">
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="text-orange-700 font-medium">完成进度</span>
                        <span className="text-orange-600">{completedMaterials}/{totalMaterials}</span>
                      </div>
                      <div className="w-full bg-orange-200 rounded-full h-2">
                        <motion.div 
                          className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${completionRate}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    {/* 按材料类型分组显示 */}
                    {Object.entries(materialsByType).map(([materialType, typeMaterials]) => (
                      <div key={materialType} className="bg-white bg-opacity-40 rounded p-3">
                        <div className="text-sm font-medium text-orange-800 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-orange-500 rounded mr-2"></span>
                          {materialType} ({typeMaterials.length}种)
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {typeMaterials.map((material) => (
                            <button
                              key={material.id}
                              className={`p-2 rounded text-xs font-medium transition-all hover:scale-105 ${statusConfig[material.status].color} ${statusConfig[material.status].textColor} hover:opacity-80 border border-transparent hover:${statusConfig[material.status].borderColor}`}
                              onClick={() => {
                                if (onMaterialClick) {
                                  onMaterialClick(material.id);
                                } else if (onMaterialStatusChange) {
                                  const nextStatus = getNextStatus(material.status);
                                  onMaterialStatusChange(material.id, nextStatus);
                                }
                              }}
                              title={`${material.thickness}${material.unit} ${material.materialType}${material.notes ? `\n备注: ${material.notes}` : ''}${material.startDate ? `\n开始: ${formatDate(material.startDate)}` : ''}${material.completedDate ? `\n完成: ${formatDate(material.completedDate)}` : ''}`}
                            >
                              <div>{material.thickness}{material.unit}</div>
                              <div className="text-xs opacity-75">{material.materialType}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 默认模式
  return (
    <div className={`bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-orange-100 transition-colors rounded-lg"
      >
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-medium text-orange-800">{title}</span>
          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
            {totalMaterials}种
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-orange-700">{completionRate}%</span>
          <span className="text-xs text-orange-600">({completedMaterials}/{totalMaterials})</span>
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-orange-600" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-orange-600" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {totalMaterials === 0 ? (
                <div className="text-center py-4 text-orange-500">
                  <div className="text-sm">暂无特殊材料</div>
                  <div className="text-xs opacity-75">该项目完全使用碳板材料</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 简单进度条 */}
                  <div className="w-full bg-orange-200 rounded-full h-1.5">
                    <motion.div 
                      className="bg-orange-600 h-1.5 rounded-full transition-all duration-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>

                  {/* 材料网格 */}
                  <div className="grid grid-cols-4 gap-1">
                    {materials.map((material) => (
                      <button
                        key={material.id}
                        className={`py-1.5 rounded text-xs font-medium transition-all hover:scale-105 ${statusConfig[material.status].color} ${statusConfig[material.status].textColor} hover:opacity-80 border border-transparent hover:border-gray-300`}
                        onClick={() => {
                          if (onMaterialClick) {
                            onMaterialClick(material.id);
                          } else if (onMaterialStatusChange) {
                            const nextStatus = getNextStatus(material.status);
                            onMaterialStatusChange(material.id, nextStatus);
                          }
                        }}
                        title={`${material.thickness}${material.unit} ${material.materialType}${material.notes ? `\n备注: ${material.notes}` : ''}${material.startDate ? `\n开始: ${formatDate(material.startDate)}` : ''}${material.completedDate ? `\n完成: ${formatDate(material.completedDate)}` : ''}`}
                      >
                        <div>{material.thickness}mm</div>
                        <div className="text-xs opacity-60">{material.materialType}</div>
                      </button>
                    ))}
                  </div>

                  {inProgressMaterials > 0 && (
                    <div className="text-xs text-orange-600 text-center bg-amber-100 rounded px-2 py-1">
                      {inProgressMaterials} 种特殊材料正在加工中
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
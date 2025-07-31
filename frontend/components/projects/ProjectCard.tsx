'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import type { StatusType } from '@/components/ui';
import { 
  EyeIcon, 
  PencilIcon, 
  ChevronDownIcon,
  ChevronRightIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

// 类型定义
interface ThicknessSpec {
  id: number;
  thickness: string;
  unit: string;
  materialType: string;
  isActive: boolean;
  sortOrder: number;
}

interface Material {
  id: number;
  projectId: number;
  thicknessSpecId: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedBy?: { id: number; name: string };
  startDate?: string;
  completedDate?: string;
  notes?: string;
  thicknessSpec: ThicknessSpec;
}

interface ProjectCardData {
  id: number;
  name: string;
  status: string;
  priority: string;
  assignedWorker?: { id: number; name: string };
  materials: Material[];
  drawings?: any[];
  createdAt?: string;
  movedToPastAt?: string;
  isPastProject?: boolean;
  description?: string; // 项目描述/备注
}

// 状态配置
const statusConfig = {
  pending: { label: '待处理', color: 'bg-gray-200', textColor: 'text-gray-600' },
  in_progress: { label: '进行中', color: 'bg-blue-200', textColor: 'text-blue-600' },
  completed: { label: '已完成', color: 'bg-green-200', textColor: 'text-green-600' },
  cancelled: { label: '已取消', color: 'bg-red-200', textColor: 'text-red-600' }
};

// 优先级配置
const priorityConfig = {
  low: { label: '低', color: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-300' },
  medium: { label: '中', color: 'bg-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-300' },
  high: { label: '高', color: 'bg-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-300' },
  urgent: { label: '紧急', color: 'bg-red-100', textColor: 'text-red-700', borderColor: 'border-red-300' }
};

// 活跃项目卡片
interface ActiveProjectCardProps {
  project: ProjectCardData;
  onEdit?: (projectId: number) => void;
  onMaterialStatusChange?: (materialId: number, newStatus: StatusType) => void;
  onMoveToPast?: (projectId: number) => void;
  movingToPast?: boolean;
}

export const ActiveProjectCard: React.FC<ActiveProjectCardProps> = ({
  project,
  onEdit,
  onMaterialStatusChange,
  onMoveToPast,
  movingToPast = false
}) => {

  const getCompletionStats = () => {
    const completed = project.materials.filter(m => m.status === 'completed').length;
    return `${completed}/${project.materials.length}`;
  };

  // 将材料按厚度排序
  const sortedMaterials = [...project.materials].sort((a, b) => 
    parseFloat(a.thicknessSpec.thickness) - parseFloat(b.thicknessSpec.thickness)
  );

  // 状态切换逻辑：pending → in_progress → completed → pending (移除empty状态)
  const getNextStatus = (currentStatus: string): StatusType => {
    switch (currentStatus) {
      case 'pending': return 'in_progress';
      case 'in_progress': return 'completed';
      case 'completed': return 'pending';
      default: return 'pending';
    }
  };

  // 格式化日期显示
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未设置';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 获取项目的时间范围信息
  const getProjectTimeInfo = () => {
    const materialStartDates = project.materials
      .map(m => m.startDate)
      .filter(Boolean)
      .sort();
    const materialCompletedDates = project.materials
      .map(m => m.completedDate)
      .filter(Boolean)
      .sort();

    const actualStartDate = materialStartDates[0]; // 最早的材料开始时间
    const actualCompletedDate = materialCompletedDates[materialCompletedDates.length - 1]; // 最晚的材料完成时间

    return {
      actualStartDate,
      actualCompletedDate
    };
  };

  const timeInfo = getProjectTimeInfo();

  return (
    <motion.div
      className="relative border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* 项目头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 
              className="font-semibold text-base truncate cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onEdit?.(project.id)}
            >
              {project.name}
            </h4>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-400">
                {formatDate(project.createdAt)}
              </span>
              {/* 编辑按钮 */}
              {onEdit && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1"
                  onClick={() => onEdit(project.id)}
                >
                  <PencilIcon className="w-3 h-3" />
                </Button>
              )}
              
              {/* 移至过往按钮 - 只在项目已完成时显示 */}
              {project.status === 'completed' && onMoveToPast && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={() => onMoveToPast(project.id)}
                  disabled={movingToPast}
                  title="移至过往项目"
                >
                  <ArchiveBoxIcon className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span>{project.assignedWorker?.name || '未分配'}</span>
              {/* 项目状态标签 */}
              <span className={`px-2 py-0.5 rounded text-xs ${statusConfig[project.status as keyof typeof statusConfig]?.color || statusConfig.pending.color} ${statusConfig[project.status as keyof typeof statusConfig]?.textColor || statusConfig.pending.textColor}`}>
                {statusConfig[project.status as keyof typeof statusConfig]?.label || project.status}
              </span>
            </div>
            {/* 优先级标签 - 靠右对齐 */}
            <span className={`px-2 py-0.5 rounded text-xs border flex-shrink-0 ${priorityConfig[project.priority as keyof typeof priorityConfig]?.color || priorityConfig.medium.color} ${priorityConfig[project.priority as keyof typeof priorityConfig]?.textColor || priorityConfig.medium.textColor} ${priorityConfig[project.priority as keyof typeof priorityConfig]?.borderColor || priorityConfig.medium.borderColor}`}>
              {priorityConfig[project.priority as keyof typeof priorityConfig]?.label || project.priority}
            </span>
          </div>
        </div>
      </div>

      {/* 项目描述/备注 - 如果有的话 */}
      {(project as any).description && (
        <div className="text-xs text-gray-600 mb-3 bg-gray-50 rounded p-2">
          <span className="font-medium">备注：</span>
          {(project as any).description}
        </div>
      )}
      
      {/* 厚度网格 - 可点击切换状态，完全匹配演示页面 */}
      <div className="grid grid-cols-5 gap-1 flex-1">
        {sortedMaterials.map((material) => (
          <div key={material.id} className="text-center">
            <button 
              className={`w-full py-1.5 rounded text-xs font-medium ${statusConfig[material.status as keyof typeof statusConfig]?.color || statusConfig.pending.color} ${statusConfig[material.status as keyof typeof statusConfig]?.textColor || statusConfig.pending.textColor} hover:opacity-80 transition-all hover:scale-105 border border-transparent hover:border-gray-300`}
              onClick={() => {
                const nextStatus = getNextStatus(material.status);
                onMaterialStatusChange?.(material.id, nextStatus);
              }}
              title={`${material.thicknessSpec.thickness}${material.thicknessSpec.unit}${material.notes ? `\n备注: ${material.notes}` : ''}${material.startDate ? `\n开始: ${formatDate(material.startDate)}` : ''}${material.completedDate ? `\n完成: ${formatDate(material.completedDate)}` : ''}`}
            >
              {material.thicknessSpec.thickness}
            </button>
          </div>
        ))}
      </div>
      
      {/* 时间信息和进度统计 - 固定在底部 */}
      <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
        {/* 时间信息 */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>开始: {formatDate(timeInfo.actualStartDate)}</span>
          <span>完成: {formatDate(timeInfo.actualCompletedDate)}</span>
        </div>
        {/* 进度统计 */}
        <div className="text-xs text-gray-500 text-center font-medium">
          {getCompletionStats()} 已完成
        </div>
      </div>
    </motion.div>
  );
};

// 过往项目卡片
interface PastProjectCardProps {
  project: ProjectCardData;
  onView?: (projectId: number) => void;
}

export const PastProjectCard: React.FC<PastProjectCardProps> = ({
  project,
  onView
}) => {
  // 将材料按厚度排序
  const sortedMaterials = [...project.materials].sort((a, b) => 
    parseFloat(a.thicknessSpec.thickness) - parseFloat(b.thicknessSpec.thickness)
  );

  const getProjectStats = () => {
    const completed = project.materials.filter(m => m.status === 'completed').length;
    return {
      totalMaterials: project.materials.length,
      completedMaterials: completed,
      completionRate: Math.round((completed / project.materials.length) * 100)
    };
  };

  const stats = getProjectStats();

  return (
    <motion.div
      className="border rounded-lg p-5 bg-gradient-to-br from-green-50 to-white shadow-sm"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {/* 项目头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 
            className="font-semibold text-lg text-green-800 cursor-pointer hover:text-green-600 transition-colors"
            onClick={() => onView?.(project.id)}
          >
            {project.name}
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>负责工人：{project.assignedWorker?.name || '未分配'}</div>
            <div>完成时间：{project.movedToPastAt ? new Date(project.movedToPastAt).toLocaleDateString('zh-CN') : '未知'}</div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">已归档</span>
              {/* 优先级标签 */}
              <span className={`px-2 py-0.5 rounded text-xs border ${priorityConfig[project.priority as keyof typeof priorityConfig]?.color || priorityConfig.medium.color} ${priorityConfig[project.priority as keyof typeof priorityConfig]?.textColor || priorityConfig.medium.textColor} ${priorityConfig[project.priority as keyof typeof priorityConfig]?.borderColor || priorityConfig.medium.borderColor}`}>
                {priorityConfig[project.priority as keyof typeof priorityConfig]?.label || project.priority}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-1">
          {onView && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onView(project.id)}
            >
              <EyeIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* 厚度网格 - 只读展示 */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">使用板材规格：</div>
        <div className="grid grid-cols-6 gap-2">
          {sortedMaterials.map((material) => (
            <div key={material.id} className="text-center">
              <div className={`py-2 rounded text-xs border ${
                material.status === 'completed' 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {material.thicknessSpec.thickness}mm
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 项目统计 */}
      <div className="bg-white/60 rounded p-3">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="font-semibold text-gray-800">{stats.totalMaterials}</div>
            <div className="text-gray-500">板材种类</div>
          </div>
          <div>
            <div className="font-semibold text-green-600">{stats.completedMaterials}</div>
            <div className="text-gray-500">已完成</div>
          </div>
          <div>
            <div className="font-semibold text-blue-600">{stats.completionRate}%</div>
            <div className="text-gray-500">完成率</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// 项目详情卡片（用于单个项目展示）
interface ProjectDetailCardProps {
  project: ProjectCardData;
  onEdit?: () => void;
  onManageDrawings?: () => void;
  onMaterialStatusChange?: (materialId: number, newStatus: StatusType) => void;
}

export const ProjectDetailCard: React.FC<ProjectDetailCardProps> = ({
  project,
  onEdit,
  onManageDrawings,
  onMaterialStatusChange
}) => {
  // 将材料按厚度排序
  const sortedMaterials = [...project.materials].sort((a, b) => 
    parseFloat(a.thicknessSpec.thickness) - parseFloat(b.thicknessSpec.thickness)
  );

  const getCompletionRate = () => {
    const completed = project.materials.filter(m => m.status === 'completed').length;
    return (completed / project.materials.length) * 100;
  };

  return (
    <div className="w-full space-y-6">
      {/* 项目基本信息卡片 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
            <div className="flex items-center space-x-4 mt-2 text-gray-600">
              <span>负责工人：{project.assignedWorker?.name || '未分配'}</span>
              <span className={`px-3 py-1 rounded ${statusConfig[project.status as keyof typeof statusConfig]?.color || statusConfig.pending.color} ${statusConfig[project.status as keyof typeof statusConfig]?.textColor || statusConfig.pending.textColor}`}>
                {statusConfig[project.status as keyof typeof statusConfig]?.label || project.status}
              </span>
              {/* 优先级标签 */}
              <span className={`px-2 py-0.5 rounded text-xs border ${priorityConfig[project.priority as keyof typeof priorityConfig]?.color || priorityConfig.medium.color} ${priorityConfig[project.priority as keyof typeof priorityConfig]?.textColor || priorityConfig.medium.textColor} ${priorityConfig[project.priority as keyof typeof priorityConfig]?.borderColor || priorityConfig.medium.borderColor}`}>
                {priorityConfig[project.priority as keyof typeof priorityConfig]?.label || project.priority}
              </span>
              <span>创建时间：{project.createdAt ? new Date(project.createdAt).toLocaleDateString('zh-CN') : '未知'}</span>
            </div>
          </div>
        </div>
        
        {/* 进度概览 */}
        <div className="bg-gray-50 rounded p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">整体进度</span>
            <span className="text-sm text-gray-600">
              {project.materials.filter(m => m.status === 'completed').length}/{project.materials.length} 已完成
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${getCompletionRate()}%` }}
            />
          </div>
        </div>
      </div>

      {/* 板材详情网格 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">板材加工详情</h3>
        <div className="grid gap-3 w-full" style={{ gridTemplateColumns: `repeat(${sortedMaterials.length}, 1fr)` }}>
          {sortedMaterials.map((material) => {
            // 状态切换逻辑：pending → in_progress → completed → pending
            const getNextStatus = (currentStatus: string): StatusType => {
              switch (currentStatus) {
                case 'pending': return 'in_progress';
                case 'in_progress': return 'completed';
                case 'completed': return 'pending';
                default: return 'pending';
              }
            };

            // 格式化日期显示
            const formatDate = (dateString?: string) => {
              if (!dateString) return '未设置';
              return new Date(dateString).toLocaleDateString('zh-CN', {
                month: '2-digit',
                day: '2-digit'
              });
            };
            
            return (
              <div key={material.id} className="text-center">
                <button 
                  className={`w-full py-1.5 rounded text-xs font-medium ${statusConfig[material.status as keyof typeof statusConfig]?.color || statusConfig.pending.color} ${statusConfig[material.status as keyof typeof statusConfig]?.textColor || statusConfig.pending.textColor} hover:opacity-80 transition-all hover:scale-105 border border-transparent hover:border-gray-300`}
                  onClick={() => {
                    const nextStatus = getNextStatus(material.status);
                    onMaterialStatusChange?.(material.id, nextStatus);
                  }}
                  title={`${material.thicknessSpec.thickness}${material.thicknessSpec.unit}${material.notes ? `\n备注: ${material.notes}` : ''}${material.startDate ? `\n开始: ${formatDate(material.startDate)}` : ''}${material.completedDate ? `\n完成: ${formatDate(material.completedDate)}` : ''}`}
                >
                  {material.thicknessSpec.thickness}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
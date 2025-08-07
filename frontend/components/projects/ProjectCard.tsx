'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Badge } from '@/components/ui';
import { MaterialStatusManager } from '@/components/ui/MaterialStatusManager';
import type { StatusType } from '@/components/ui';
import type { MaterialInfo, MaterialStatusType } from '@/components/ui/MaterialStatusManager';
import { 
  EyeIcon, 
  PencilIcon, 
  ChevronDownIcon,
  ChevronRightIcon,
  ArchiveBoxIcon,
  CogIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { MaterialAllocationModal } from '@/components/materials/MaterialAllocationModal';
import { MaterialRequirementManager } from '@/components/materials/MaterialRequirementManager';
import { ProjectBorrowingDetails } from '@/components/materials/ProjectBorrowingDetails';
import { audioManager } from '@/utils/audioManager';

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
  onViewDetail?: (projectId: number) => void; // 新增：查看项目详情回调
  onMaterialStatusChange?: (materialId: number, newStatus: StatusType) => void;
  onMoveToPast?: (projectId: number) => void;
  onManageMaterials?: () => void; // 新增：管理板材回调
  movingToPast?: boolean;
}

export const ActiveProjectCard: React.FC<ActiveProjectCardProps> = ({
  project,
  onEdit,
  onViewDetail,
  onMaterialStatusChange,
  onMoveToPast,
  onManageMaterials,
  movingToPast = false
}) => {
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // 计算碳板优先进度（95/5策略重点显示）
  const getCarbonPriorityProgress = () => {
    const carbonMaterials = sortedMaterials.filter(m => 
      !m.thicknessSpec?.materialType || m.thicknessSpec.materialType === '碳板'
    );
    const specialMaterials = sortedMaterials.filter(m => 
      m.thicknessSpec?.materialType && m.thicknessSpec.materialType !== '碳板'
    );
    
    const carbonCompleted = carbonMaterials.filter(m => m.status === 'completed').length;
    const carbonInProgress = carbonMaterials.filter(m => m.status === 'in_progress').length;
    const specialCompleted = specialMaterials.filter(m => m.status === 'completed').length;
    const specialInProgress = specialMaterials.filter(m => m.status === 'in_progress').length;
    
    return {
      carbon: {
        total: carbonMaterials.length,
        completed: carbonCompleted,
        inProgress: carbonInProgress,
        rate: carbonMaterials.length > 0 ? Math.round((carbonCompleted / carbonMaterials.length) * 100) : 0
      },
      special: {
        total: specialMaterials.length,
        completed: specialCompleted,
        inProgress: specialInProgress,
        rate: specialMaterials.length > 0 ? Math.round((specialCompleted / specialMaterials.length) * 100) : 0
      }
    };
  };

  // 转换材料数据为MaterialStatusManager格式
  const convertMaterialsToManagerFormat = (): MaterialInfo[] => {
    return sortedMaterials.map(material => ({
      id: material.id,
      projectId: project.id,
      projectName: project.name,
      thicknessSpecId: material.thicknessSpecId,
      materialType: material.thicknessSpec.materialType || '碳板',
      thickness: material.thicknessSpec.thickness,
      unit: material.thicknessSpec.unit,
      status: material.status as MaterialStatusType,
      quantity: material.quantity || 1,
      assignedWorker: project.assignedWorker,
      startDate: material.startDate,
      completedDate: material.completedDate,
      completedBy: material.completedBy,
      notes: material.notes,
      priority: (project.priority === 'urgent' ? 'urgent' : 
                project.priority === 'high' ? 'high' : 
                project.priority === 'medium' ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'urgent'
    }));
  };

  // 处理MaterialStatusManager的状态变更
  const handleMaterialManagerStatusChange = (materialId: number, newStatus: MaterialStatusType) => {
    const statusTypeMap: Record<MaterialStatusType, StatusType> = {
      'pending': 'pending',
      'in_progress': 'in_progress', 
      'completed': 'completed'
    };
    
    // 调用原有的状态变更回调
    // MaterialStatusManager中的共享逻辑会处理音效，这里不需要重复播放
    onMaterialStatusChange?.(materialId, statusTypeMap[newStatus]);
  };

  // 状态切换逻辑：pending → in_progress → completed → pending (移除empty状态)
  const getNextStatus = (currentStatus: string): StatusType => {
    switch (currentStatus) {
      case 'pending': return 'in_progress';
      case 'in_progress': return 'completed';
      case 'completed': return 'pending';
      default: return 'pending';
    }
  };

  const getCompletionStats = () => {
    const completed = project.materials.filter(m => m.status === 'completed').length;
    return `${completed}/${project.materials.length}`;
  };

  // 按照碳板优先策略排序材料（95/5策略）
  const sortedMaterials = [...project.materials].sort((a, b) => {
    const aType = a.thicknessSpec.materialType || '碳板';
    const bType = b.thicknessSpec.materialType || '碳板';
    
    // 碳板优先排序
    if (aType === '碳板' && bType !== '碳板') return -1;
    if (aType !== '碳板' && bType === '碳板') return 1;
    
    // 同材质类型内按厚度排序
    return parseFloat(a.thicknessSpec.thickness) - parseFloat(b.thicknessSpec.thickness);
  });

  // 材料代码映射函数
  const getMaterialCode = (materialType?: string) => {
    const typeMap: { [key: string]: string } = {
      '碳板': 'T',     // T = 碳板
      '不锈钢': 'B',   // B = 不锈钢  
      '锰板': 'M',     // M = 锰板
      '钢板': 'S'      // S = 钢板
    };
    return typeMap[materialType || '碳板'] || 'T';
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
  const carbonProgress = getCarbonPriorityProgress();

  // 处理板材分配
  const handleMaterialAllocation = (material: Material) => {
    setSelectedMaterial(material);
    setShowAllocationModal(true);
  };

  // 处理分配成功
  const handleAllocationSuccess = () => {
    // 触发父组件刷新
    window.dispatchEvent(new CustomEvent('materials-updated'));
    window.dispatchEvent(new CustomEvent('projects-updated'));
  };

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
              onClick={() => onViewDetail?.(project.id)}
              title="点击查看项目详情"
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
              
              {/* 管理板材按钮 */}
              {onManageMaterials && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  onClick={onManageMaterials}
                  title="管理板材"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
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
              <Badge
                variant={
                  project.status === 'completed' ? 'success' :
                  project.status === 'in_progress' ? 'info' :
                  project.status === 'pending' ? 'warning' :
                  'secondary'
                }
                size="sm"
              >
                {statusConfig[project.status as keyof typeof statusConfig]?.label || project.status}
              </Badge>
            </div>
            {/* 优先级标签 - 靠右对齐 */}
            <Badge
              variant={
                project.priority === 'urgent' ? 'destructive' :
                project.priority === 'high' ? 'warning' :
                project.priority === 'medium' ? 'info' :
                'secondary'
              }
              size="sm"
              className="flex-shrink-0"
            >
              {priorityConfig[project.priority as keyof typeof priorityConfig]?.label || project.priority}
            </Badge>
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

      {/* 碳板优先进度显示区域 - 新增重点区域 */}
      {carbonProgress.carbon.total > 0 && (
        <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-xs font-semibold text-blue-800 mb-2 flex items-center">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
            碳板进度
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-blue-700 font-medium">{carbonProgress.carbon.rate}%</span>
                <span className="text-blue-600">({carbonProgress.carbon.completed}/{carbonProgress.carbon.total})</span>
                {carbonProgress.carbon.inProgress > 0 && (
                  <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded text-xs">
                    {carbonProgress.carbon.inProgress}进行中
                  </span>
                )}
              </div>
              <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${carbonProgress.carbon.rate}%` }}
                />
              </div>
            </div>
            {carbonProgress.special.total > 0 && (
              <div className="ml-3 text-xs text-gray-600">
                特殊: {carbonProgress.special.rate}%
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 厚度网格 */}
      <div className="flex-1">
        <div className="grid grid-cols-6 gap-2">
          {sortedMaterials.map((material) => (
            <div key={material.id} className="text-center">
              <button
                className={`w-full py-2 rounded text-xs font-medium transition-colors ${statusConfig[material.status as keyof typeof statusConfig]?.color || statusConfig.pending.color} ${statusConfig[material.status as keyof typeof statusConfig]?.textColor || statusConfig.pending.textColor} hover:opacity-80`}
                onClick={() => handleMaterialManagerStatusChange(material.id, getNextStatus(material.status) as MaterialStatusType)}
                title={`${material.thicknessSpec.thickness}${material.thicknessSpec.unit} ${material.thicknessSpec.materialType || '碳板'} - ${statusConfig[material.status as keyof typeof statusConfig]?.label || material.status}\n点击切换状态`}
              >
                {getMaterialCode(material.thicknessSpec.materialType)}{parseFloat(material.thicknessSpec.thickness)}
              </button>
            </div>
          ))}
        </div>
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
      
      {/* 板材分配模态框 */}
      {showAllocationModal && selectedMaterial && (
        <MaterialAllocationModal
          isOpen={showAllocationModal}
          onClose={() => {
            setShowAllocationModal(false);
            setSelectedMaterial(null);
          }}
          onSuccess={handleAllocationSuccess}
          projectMaterial={{
            id: selectedMaterial.id,
            projectId: project.id,
            projectName: project.name,
            thicknessSpecId: selectedMaterial.thicknessSpecId,
            materialType: selectedMaterial.thicknessSpec.materialType || '碳板',
            thickness: selectedMaterial.thicknessSpec.thickness,
            unit: selectedMaterial.thicknessSpec.unit,
            currentQuantity: selectedMaterial.quantity || 0,
            assignedWorkerName: project.assignedWorker?.name
          }}
        />
      )}
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
  // 按照碳板优先策略排序材料（95/5策略）
  const sortedMaterials = [...project.materials].sort((a, b) => {
    const aType = a.thicknessSpec.materialType || '碳板';
    const bType = b.thicknessSpec.materialType || '碳板';
    
    // 碳板优先排序
    if (aType === '碳板' && bType !== '碳板') return -1;
    if (aType !== '碳板' && bType === '碳板') return 1;
    
    // 同材质类型内按厚度排序
    return parseFloat(a.thicknessSpec.thickness) - parseFloat(b.thicknessSpec.thickness);
  });

  // 转换材料数据为MaterialStatusManager格式
  const convertMaterialsToManagerFormat = (): MaterialInfo[] => {
    return sortedMaterials.map(material => ({
      id: material.id,
      projectId: project.id,
      projectName: project.name,
      thicknessSpecId: material.thicknessSpecId,
      materialType: material.thicknessSpec.materialType || '碳板',
      thickness: material.thicknessSpec.thickness,
      unit: material.thicknessSpec.unit,
      status: material.status as MaterialStatusType,
      quantity: material.quantity || 1,
      assignedWorker: project.assignedWorker,
      startDate: material.startDate,
      completedDate: material.completedDate,
      completedBy: material.completedBy,
      notes: material.notes,
      priority: (project.priority === 'urgent' ? 'urgent' : 
                project.priority === 'high' ? 'high' : 
                project.priority === 'medium' ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'urgent'
    }));
  };

  // 计算碳板使用统计（重点显示）
  const getCarbonUsageStats = () => {
    const carbonMaterials = sortedMaterials.filter(m => 
      !m.thicknessSpec?.materialType || m.thicknessSpec.materialType === '碳板'
    );
    const specialMaterials = sortedMaterials.filter(m => 
      m.thicknessSpec?.materialType && m.thicknessSpec.materialType !== '碳板'
    );
    
    const carbonCompleted = carbonMaterials.filter(m => m.status === 'completed').length;
    const specialCompleted = specialMaterials.filter(m => m.status === 'completed').length;
    
    // 按厚度分组统计碳板使用情况
    const carbonByThickness = carbonMaterials.reduce((acc, material) => {
      const thickness = material.thicknessSpec.thickness;
      if (!acc[thickness]) {
        acc[thickness] = { total: 0, completed: 0 };
      }
      acc[thickness].total++;
      if (material.status === 'completed') {
        acc[thickness].completed++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number; }>);
    
    return {
      carbon: {
        total: carbonMaterials.length,
        completed: carbonCompleted,
        rate: carbonMaterials.length > 0 ? Math.round((carbonCompleted / carbonMaterials.length) * 100) : 0,
        byThickness: carbonByThickness
      },
      special: {
        total: specialMaterials.length,
        completed: specialCompleted,
        rate: specialMaterials.length > 0 ? Math.round((specialCompleted / specialMaterials.length) * 100) : 0
      },
      overall: {
        carbonPercentage: Math.round((carbonMaterials.length / (carbonMaterials.length + specialMaterials.length)) * 100) || 0,
        specialPercentage: Math.round((specialMaterials.length / (carbonMaterials.length + specialMaterials.length)) * 100) || 0
      }
    };
  };

  const getProjectStats = () => {
    const completed = project.materials.filter(m => m.status === 'completed').length;
    return {
      totalMaterials: project.materials.length,
      completedMaterials: completed,
      completionRate: Math.round((completed / project.materials.length) * 100)
    };
  };

  const stats = getProjectStats();
  const carbonStats = getCarbonUsageStats();

  return (
    <motion.div
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {/* 项目头部 - 重新设计 */}
      <div className="relative p-6 bg-gradient-to-br from-slate-50 to-gray-50 border-b border-gray-100">
        {/* 归档标识 */}
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" size="sm" className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <ArchiveBoxIcon className="w-3 h-3 mr-1" />
              已归档
            </Badge>
            <Badge
              variant={
                project.priority === 'urgent' ? 'destructive' :
                project.priority === 'high' ? 'warning' :
                project.priority === 'medium' ? 'info' :
                'secondary'
              }
              size="sm"
            >
              {priorityConfig[project.priority as keyof typeof priorityConfig]?.label || project.priority}
            </Badge>
          </div>
        </div>

        <div className="pr-24">
          <h4 
            className="font-bold text-xl text-gray-900 cursor-pointer hover:text-blue-600 transition-colors mb-2"
            onClick={() => onView?.(project.id)}
          >
            {project.name}
          </h4>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <UsersIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                <span>负责工人：{project.assignedWorker?.name || '未分配'}</span>
              </div>
              <div className="flex items-center">
                <ArchiveBoxIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                <span>归档时间：{project.movedToPastAt ? new Date(project.movedToPastAt).toLocaleDateString('zh-CN') : '未知'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 项目统计概览 - 重新设计 */}
      <div className="p-6 bg-white">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{stats.totalMaterials}</div>
            <div className="text-xs text-blue-500 mt-1">板材种类</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="text-2xl font-bold text-green-600">{stats.completedMaterials}</div>
            <div className="text-xs text-green-500 mt-1">已完成</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="text-2xl font-bold text-emerald-600">{stats.completionRate}%</div>
            <div className="text-xs text-emerald-500 mt-1">完成率</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="text-2xl font-bold text-indigo-600">{project.drawings?.length || 0}</div>
            <div className="text-xs text-indigo-500 mt-1">图纸数量</div>
          </div>
        </div>
        
        {/* 碳板使用分析 - 优化设计 */}
        <div className="mb-4 p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            碳板使用分析
          </h4>
          
          {/* 材料类型占比 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white/80 rounded-lg p-3 text-center border border-slate-100">
              <div className="text-lg font-bold text-blue-600">{carbonStats.overall.carbonPercentage}%</div>
              <div className="text-xs text-slate-600">碳板占比</div>
            </div>
            <div className="bg-white/80 rounded-lg p-3 text-center border border-slate-100">
              <div className="text-lg font-bold text-orange-600">{carbonStats.overall.specialPercentage}%</div>
              <div className="text-xs text-slate-600">特殊材料</div>
            </div>
          </div>
          
          {/* 完成情况进度条 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700 font-medium">碳板完成进度</span>
              <span className="text-slate-600">{carbonStats.carbon.completed}/{carbonStats.carbon.total}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${carbonStats.carbon.rate}%` }}
              />
            </div>
            
            {carbonStats.special.total > 0 && (
              <>
                <div className="flex items-center justify-between text-sm mt-3">
                  <span className="text-slate-700 font-medium">特殊材料完成进度</span>
                  <span className="text-slate-600">{carbonStats.special.completed}/{carbonStats.special.total}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${carbonStats.special.rate}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 板材详情 - 简化展示 */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <CogIcon className="w-4 h-4 mr-1.5" />
            板材使用详情
          </div>
          <MaterialStatusManager
            materials={convertMaterialsToManagerFormat()}
            onStatusChange={() => {}} // 过往项目不允许状态变更
            displayMode="compact"
            showAddButton={false}
            enableBatchOperations={false}
            enableSoundFeedback={false}
            className="bg-gray-50 border border-gray-200 rounded-lg"
          />
        </div>
      </div>
      
      {/* 底部操作区域 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            项目ID: {project.id} • 创建于 {project.createdAt ? new Date(project.createdAt).toLocaleDateString('zh-CN') : '未知'}
          </div>
          {onView && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onView(project.id)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              查看详情
            </Button>
          )}
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
  // 现有状态
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  
  // 新增状态
  const [showRequirementManager, setShowRequirementManager] = useState(false);
  const [selectedMaterialForRequirement, setSelectedMaterialForRequirement] = useState<Material | null>(null);
  const [showBorrowingDetails, setShowBorrowingDetails] = useState(false);
  
  // 按照碳板优先策略排序材料（95/5策略）
  const sortedMaterials = [...project.materials].sort((a, b) => {
    const aType = a.thicknessSpec.materialType || '碳板';
    const bType = b.thicknessSpec.materialType || '碳板';
    
    // 碳板优先排序
    if (aType === '碳板' && bType !== '碳板') return -1;
    if (aType !== '碳板' && bType === '碳板') return 1;
    
    // 同材质类型内按厚度排序
    return parseFloat(a.thicknessSpec.thickness) - parseFloat(b.thicknessSpec.thickness);
  });

  // 转换材料数据为MaterialStatusManager格式
  const convertMaterialsToManagerFormat = (): MaterialInfo[] => {
    return sortedMaterials.map(material => ({
      id: material.id,
      projectId: project.id,
      projectName: project.name,
      thicknessSpecId: material.thicknessSpecId,
      materialType: material.thicknessSpec.materialType || '碳板',
      thickness: material.thicknessSpec.thickness,
      unit: material.thicknessSpec.unit,
      status: material.status as MaterialStatusType,
      quantity: material.quantity || 1,
      assignedWorker: project.assignedWorker,
      startDate: material.startDate,
      completedDate: material.completedDate,
      completedBy: material.completedBy,
      notes: material.notes,
      priority: (project.priority === 'urgent' ? 'urgent' : 
                project.priority === 'high' ? 'high' : 
                project.priority === 'medium' ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'urgent'
    }));
  };

  // 处理MaterialStatusManager的状态变更
  const handleMaterialManagerStatusChange = (materialId: number, newStatus: MaterialStatusType) => {
    const statusTypeMap: Record<MaterialStatusType, StatusType> = {
      'pending': 'pending',
      'in_progress': 'in_progress', 
      'completed': 'completed'
    };
    onMaterialStatusChange?.(materialId, statusTypeMap[newStatus]);
  };

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
              <Badge
                variant={
                  project.status === 'completed' ? 'success' :
                  project.status === 'in_progress' ? 'info' :
                  project.status === 'pending' ? 'warning' :
                  'secondary'
                }
                size="sm"
              >
                {statusConfig[project.status as keyof typeof statusConfig]?.label || project.status}
              </Badge>
              {/* 优先级标签 */}
              <Badge
                variant={
                  project.priority === 'urgent' ? 'destructive' :
                  project.priority === 'high' ? 'warning' :
                  project.priority === 'medium' ? 'info' :
                  'secondary'
                }
                size="sm"
              >
                {priorityConfig[project.priority as keyof typeof priorityConfig]?.label || project.priority}
              </Badge>
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

      {/* 板材详情网格 - 使用MaterialStatusManager */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">板材加工详情</h3>
        <MaterialStatusManager
          materials={convertMaterialsToManagerFormat()}
          onStatusChange={handleMaterialManagerStatusChange}
          displayMode="grid"
          groupBy="material_type"
          enableBatchOperations={true}
          enableSoundFeedback={true}
          className="border-0 bg-transparent"
        />
      </div>

      {/* 借用管理区域 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-gray-900">板材借用管理</h4>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowBorrowingDetails(true)}
            className="flex items-center space-x-1"
          >
            <UsersIcon className="w-4 h-4" />
            <span>查看借用详情</span>
          </Button>
        </div>
      </div>

      {/* 材料需求管理弹窗 */}
      {showRequirementManager && selectedMaterialForRequirement && (
        <MaterialRequirementManager
          projectId={project.id}
          materialId={selectedMaterialForRequirement.id}
          materialType={selectedMaterialForRequirement.thicknessSpec.materialType || '碳板'}
          thickness={selectedMaterialForRequirement.thicknessSpec.thickness}
          projectWorker={project.assignedWorker}
          onClose={() => {
            setShowRequirementManager(false);
            setSelectedMaterialForRequirement(null);
          }}
          onUpdate={() => {
            // 触发项目数据更新
            window.dispatchEvent(new CustomEvent('materials-updated'));
          }}
        />
      )}

      {/* 借用详情弹窗 */}
      <ProjectBorrowingDetails
        projectId={project.id}
        projectName={project.name}
        isOpen={showBorrowingDetails}
        onClose={() => setShowBorrowingDetails(false)}
      />

      {/* 原有的分配弹窗 */}
      {showAllocationModal && selectedMaterial && (
        <MaterialAllocationModal
          material={selectedMaterial}
          onClose={() => {
            setShowAllocationModal(false);
            setSelectedMaterial(null);
          }}
          onUpdate={() => {
            // 处理更新逻辑
          }}
        />
      )}
    </div>
  );
};
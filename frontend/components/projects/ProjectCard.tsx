'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Badge } from '@/components/ui';
import { MaterialStatusManager } from '@/components/ui/MaterialStatusManager';
import { useAuth } from '@/contexts/AuthContext'; // 添加 useAuth 导入
import type { StatusType } from '@/components/ui';
import type { MaterialInfo, MaterialStatusType } from '@/components/ui/MaterialStatusManager';
import type { Material, ThicknessSpec } from '@/types/project';
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
      quantity: 1,
      assignedWorker: project.assignedWorker,
      startDate: material.startDate,
      completedDate: material.completedDate,
      completedBy: material.completedByUser,
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
                project.priority === 'urgent' ? 'danger' :
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
            currentQuantity: 0,
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
  onRestore?: (projectId: number) => void; // 新增恢复回调
  onDelete?: (projectId: number) => void; // 新增删除回调
}

export const PastProjectCard: React.FC<PastProjectCardProps> = ({
  project,
  onView,
  onRestore,
  onDelete
}) => {
  // 获取用户权限信息
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
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
      quantity: 1,
      assignedWorker: project.assignedWorker,
      startDate: material.startDate,
      completedDate: material.completedDate,
      completedBy: material.completedByUser,
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

  // 材料代码映射函数（与活跃项目保持一致）
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
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="relative border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      {/* 项目头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 
              className="font-semibold text-base truncate cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onView?.(project.id)}
            >
              {project.name}
            </h4>
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" size="sm">
                已归档
              </Badge>
              {/* 恢复到活跃项目按钮 */}
              {onRestore && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => onRestore(project.id)}
                  title="恢复到活跃项目"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>
              )}
              {/* 删除按钮 - 仅管理员可见 */}
              {onDelete && isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(project.id)}
                  title="删除项目"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              )}
              {onView && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1"
                  onClick={() => onView(project.id)}
                >
                  <EyeIcon className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span>{project.assignedWorker?.name || '未分配'}</span>
              <Badge variant="success" size="sm">
                {statusConfig[project.status as keyof typeof statusConfig]?.label || project.status}
              </Badge>
            </div>
            <Badge
              variant={
                project.priority === 'urgent' ? 'danger' :
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

      {/* 完成情况概览 */}
      <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-100 rounded-lg border border-green-200">
        <div className="text-xs font-semibold text-green-800 mb-2 flex items-center">
          <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
          项目完成情况
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-green-700 font-medium">{stats.completionRate}%</span>
              <span className="text-green-600">({stats.completedMaterials}/{stats.totalMaterials})</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-1.5 mt-1">
              <div 
                className="bg-green-600 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
          {project.drawings && project.drawings.length > 0 && (
            <div className="ml-3 text-xs text-gray-600">
              图纸: {project.drawings.length}个
            </div>
          )}
        </div>
      </div>
      
      {/* 板材网格（与活跃项目保持一致的风格） */}
      <div className="flex-1">
        <div className="grid grid-cols-6 gap-2">
          {sortedMaterials.map((material) => (
            <div key={material.id} className="text-center">
              <div
                className={`w-full py-2 rounded text-xs font-medium ${statusConfig[material.status as keyof typeof statusConfig]?.color || statusConfig.pending.color} ${statusConfig[material.status as keyof typeof statusConfig]?.textColor || statusConfig.pending.textColor}`}
              >
                {getMaterialCode(material.thicknessSpec.materialType)}{parseFloat(material.thicknessSpec.thickness)}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 时间信息和统计 - 固定在底部 */}
      <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>归档: {formatDate(project.movedToPastAt)}</span>
          <span>创建: {formatDate(project.createdAt)}</span>
        </div>
        <div className="text-xs text-gray-500 text-center font-medium">
          {stats.completedMaterials}/{stats.totalMaterials} 已完成
        </div>
      </div>
    </div>
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
      quantity: 1,
      assignedWorker: project.assignedWorker,
      startDate: material.startDate,
      completedDate: material.completedDate,
      completedBy: material.completedByUser,
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
                  project.priority === 'urgent' ? 'danger' :
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
          projectWorker={project.assignedWorker as any}
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
          isOpen={showAllocationModal}
          projectMaterial={{
            id: selectedMaterial.id,
            projectId: selectedMaterial.projectId,
            projectName: project.name,
            thicknessSpecId: selectedMaterial.thicknessSpecId,
            materialType: selectedMaterial.thicknessSpec.materialType || '碳板',
            thickness: selectedMaterial.thicknessSpec.thickness,
            unit: selectedMaterial.thicknessSpec.unit,
            currentQuantity: 0,
            assignedWorkerName: project.assignedWorker?.name
          }}
          onClose={() => {
            setShowAllocationModal(false);
            setSelectedMaterial(null);
          }}
          onSuccess={() => {
            // 处理更新逻辑
            setShowAllocationModal(false);
            setSelectedMaterial(null);
          }}
        />
      )}
    </div>
  );
};
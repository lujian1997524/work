'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore } from '@/stores';
import { Loading, Empty, EmptyData, Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useProjectToastListener } from '@/utils/projectToastHelper';
import { batchOperationToastHelper, useBatchOperationTracker } from '@/utils/batchOperationToastHelper';
import { ActiveProjectCard } from '@/components/projects/ProjectCard';
import { StatusType } from '@/components/ui';
import { Material } from '@/types/project';
import { ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, ClockIcon, PlayIcon, FolderIcon, CubeIcon, CheckIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface ActiveProject {
  id: number;
  name: string;
  status: string;
  priority: string;
  createdAt?: string;
  created_at?: string;
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
  materials?: Material[];
  drawings?: any[];
  description?: string;
}

interface ActiveProjectsCardViewProps {
  onProjectSelect: (projectId: number | null) => void;
  selectedProjectId: number | null;
  onProjectEdit?: (projectId: number) => void;
  onMaterialStatusChange?: (materialId: number, newStatus: StatusType) => void;
  onProjectMoveToPast?: (projectId: number) => void;
  onJumpToMaterials?: (projectId: number, workerId?: number) => void; // 新增：跳转到板材管理
  onRefresh?: () => void;
  className?: string;
  // 批量操作相关
  enableBatchOperations?: boolean;
  onBatchStatusUpdate?: (projectIds: number[], newStatus: string) => Promise<void>;
  onBatchAssignWorker?: (projectIds: number[], workerId: number) => Promise<void>;
  onBatchDelete?: (projectIds: number[]) => Promise<void>;
}

export const ActiveProjectsCardView: React.FC<ActiveProjectsCardViewProps> = ({
  onProjectSelect,
  selectedProjectId,
  onProjectEdit,
  onMaterialStatusChange,
  onProjectMoveToPast,
  onJumpToMaterials,
  onRefresh,
  className = '',
  // 批量操作相关
  enableBatchOperations = false,
  onBatchStatusUpdate,
  onBatchAssignWorker,
  onBatchDelete
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['pending', 'in_progress']));
  const [movingToPastIds, setMovingToPastIds] = useState<Set<number>>(new Set());
  
  // 批量操作相关状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  
  const { user } = useAuth();
  const toast = useToast();
  const { createTracker } = useBatchOperationTracker();
  
  // 监听项目Toast事件
  useProjectToastListener(toast);
  
  const { 
    projects, 
    loading, 
    fetchProjects,
    moveToPastProject
  } = useProjectStore();

  // 初始化数据 - 只在组件挂载时执行一次
  useEffect(() => {
    fetchProjects();
  }, []); // 移除依赖项，只在组件挂载时执行一次

  // 按状态分组项目
  const groupProjectsByStatus = () => {
    const groups = {
      pending: projects.filter(p => p.status === 'pending'),
      in_progress: projects.filter(p => p.status === 'in_progress'),
      completed: projects.filter(p => p.status === 'completed')
    };
    return groups;
  };

  // 切换分组展开状态
  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  // 处理编辑项目
  const handleEditProject = (projectId: number) => {
    onProjectEdit?.(projectId);
  };

  // 处理材料状态变更
  const handleMaterialStatusChange = (materialId: number, newStatus: StatusType) => {
    onMaterialStatusChange?.(materialId, newStatus);
  };

  // 处理跳转到板材管理
  const handleJumpToMaterials = (projectId: number, workerId?: number) => {
    onJumpToMaterials?.(projectId, workerId);
  };

  // 处理移至过往项目
  const handleMoveToPast = async (projectId: number) => {
    if (movingToPastIds.has(projectId)) return;

    // 查找项目名称用于Toast显示
    const project = projects.find(p => p.id === projectId);
    const projectName = project?.name || `项目${projectId}`;

    setMovingToPastIds(prev => new Set(prev).add(projectId));
    try {
      const success = await moveToPastProject(projectId);
      if (success) {
        // 显示项目归档成功Toast
        toast.projectArchived(projectName);
        
        onProjectMoveToPast?.(projectId);
        // 刷新项目列表
        fetchProjects();
      } else {
        // 显示失败Toast
        toast.addToast({
          type: 'error',
          message: `项目"${projectName}"移至过往库失败，请重试`
        });
      }
    } catch (error) {
      // 移至过往项目失败
      toast.addToast({
        type: 'error',
        message: `项目"${projectName}"移至过往库失败：${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setMovingToPastIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  };

  // 批量操作相关函数
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedProjectIds(new Set());
  };

  const handleSelectProject = (projectId: number) => {
    const newSelected = new Set(selectedProjectIds);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjectIds(newSelected);
  };

  const selectAllProjects = () => {
    const allProjectIds = new Set(projects.map(p => p.id));
    setSelectedProjectIds(allProjectIds);
  };

  const clearSelection = () => {
    setSelectedProjectIds(new Set());
  };

  // 批量状态更新
  const handleBatchStatusUpdate = async (newStatus: string) => {
    if (selectedProjectIds.size === 0) {
      toast.addToast({ type: 'warning', message: '请先选择要操作的项目' });
      return;
    }

    if (!onBatchStatusUpdate) {
      toast.addToast({ type: 'warning', message: '批量状态更新功能不可用' });
      return;
    }

    setBatchLoading(true);
    const tracker = createTracker('批量更新项目状态', selectedProjectIds.size, 'project-batch');
    
    try {
      await onBatchStatusUpdate(Array.from(selectedProjectIds), newStatus);
      tracker.complete();
      batchOperationToastHelper.projectBatchStatusChange(selectedProjectIds.size, selectedProjectIds.size, newStatus);
      
      fetchProjects();
      setBatchMode(false);
      setSelectedProjectIds(new Set());
    } catch (error) {
      tracker.fail(`批量状态更新失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // 批量分配工人
  const handleBatchAssignWorker = async (workerId: number, workerName: string) => {
    if (selectedProjectIds.size === 0) {
      toast.addToast({ type: 'warning', message: '请先选择要操作的项目' });
      return;
    }

    if (!onBatchAssignWorker) {
      toast.addToast({ type: 'warning', message: '批量分配工人功能不可用' });
      return;
    }

    setBatchLoading(true);
    const tracker = createTracker('批量分配工人', selectedProjectIds.size, 'project-batch');
    
    try {
      await onBatchAssignWorker(Array.from(selectedProjectIds), workerId);
      tracker.complete();
      batchOperationToastHelper.projectBatchAssign(selectedProjectIds.size, selectedProjectIds.size, workerName);
      
      fetchProjects();
      setBatchMode(false);
      setSelectedProjectIds(new Set());
    } catch (error) {
      tracker.fail(`批量分配工人失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // 批量删除项目
  const handleBatchDelete = async () => {
    if (selectedProjectIds.size === 0) {
      toast.addToast({ type: 'warning', message: '请先选择要操作的项目' });
      return;
    }

    if (!onBatchDelete) {
      toast.addToast({ type: 'warning', message: '批量删除功能不可用' });
      return;
    }

    setBatchLoading(true);
    const tracker = createTracker('批量删除项目', selectedProjectIds.size, 'project-batch');
    
    try {
      await onBatchDelete(Array.from(selectedProjectIds));
      tracker.complete();
      batchOperationToastHelper.projectBatchDelete(selectedProjectIds.size, selectedProjectIds.size);
      
      fetchProjects();
      setBatchMode(false);
      setSelectedProjectIds(new Set());
    } catch (error) {
      tracker.fail(`批量删除失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // 获取状态显示配置
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          title: '待处理项目',
          icon: <ClockIcon className="w-5 h-5 text-orange-600" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
          description: '等待开始的项目'
        };
      case 'in_progress':
        return {
          title: '进行中项目',
          icon: <PlayIcon className="w-5 h-5 text-blue-600" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          description: '正在进行的项目'
        };
      case 'completed':
        return {
          title: '已完成项目',
          icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          description: '已完成可归档的项目'
        };
      default:
        return {
          title: '其他项目',
          icon: <ClockIcon className="w-5 h-5 text-gray-600" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          description: '其他状态项目'
        };
    }
  };

  // 计算总体统计信息
  const getOverallStats = () => {
    const totalProjects = projects.length;
    const totalMaterials = projects.reduce((sum, project) => sum + (project.materials?.length || 0), 0);
    const completedMaterials = projects.reduce((sum, project) => 
      sum + (project.materials?.filter(m => m.status === 'completed').length || 0), 0
    );
    const inProgressMaterials = projects.reduce((sum, project) => 
      sum + (project.materials?.filter(m => m.status === 'in_progress').length || 0), 0
    );
    
    return {
      totalProjects,
      totalMaterials,
      completedMaterials,
      inProgressMaterials,
      pendingMaterials: totalMaterials - completedMaterials - inProgressMaterials,
      completionRate: totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyData 
        
        description="还没有正在进行的项目"
        className="py-12"
      />
    );
  }

  const groupedProjects = groupProjectsByStatus();
  const stats = getOverallStats();

  return (
    <div className={`h-full flex flex-col p-4 ${className}`}>
      {/* 现代化统计面板 */}
      <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4 mb-4 flex-shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <FolderIcon className="w-6 h-6 md:w-8 md:h-8 text-gray-600" />
            </div>
            <div className="min-w-0">
              <div className="text-lg md:text-xl font-bold text-gray-900">{stats.totalProjects}</div>
              <div className="text-xs md:text-sm text-gray-600 truncate">活跃项目</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-blue-50 rounded-lg">
            <div className="flex-shrink-0">
              <CubeIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-lg md:text-xl font-bold text-blue-600">{stats.totalMaterials}</div>
              <div className="text-xs md:text-sm text-gray-600 truncate">板材总数</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-green-50 rounded-lg">
            <div className="flex-shrink-0">
              <CheckIcon className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="text-lg md:text-xl font-bold text-green-600">{stats.completedMaterials}</div>
              <div className="text-xs md:text-sm text-gray-600 truncate">已完成</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-purple-50 rounded-lg">
            <div className="flex-shrink-0">
              <ChartBarIcon className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            </div>
            <div className="min-w-0">
              <div className="text-lg md:text-xl font-bold text-purple-600">{stats.completionRate}%</div>
              <div className="text-xs md:text-sm text-gray-600 truncate">完成率</div>
            </div>
          </div>
        </div>
      </div>

      {/* 按状态分组显示项目 */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pb-4">
          {Object.entries(groupedProjects).map(([status, statusProjects]) => {
            if (statusProjects.length === 0) return null;
            
            const config = getStatusConfig(status);
            
            return (
              <div key={status} className={`bg-white rounded-lg shadow-sm border overflow-hidden ${config.bgColor}`}>
                {/* 状态分组标题 */}
                <Button
                  variant="ghost"
                  onClick={() => toggleSection(status)}
                  className="w-full px-6 py-4 hover:bg-white hover:bg-opacity-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    {expandedSections.has(status) ? (
                      <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                    )}
                    {config.icon}
                    <div className="text-left">
                      <h3 className={`text-lg font-semibold ${config.color}`}>
                        {config.title}
                      </h3>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                    <span className="bg-white bg-opacity-70 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                      {statusProjects.length} 个项目
                    </span>
                  </div>
                </Button>

                {/* 状态分组下的项目卡片 */}
                <AnimatePresence>
                  {expandedSections.has(status) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden bg-white bg-opacity-50"
                    >
                      <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                          {statusProjects.map((project) => (
                            <ActiveProjectCard
                              key={project.id}
                              project={{
                                id: project.id,
                                name: project.name,
                                status: project.status,
                                priority: project.priority,
                                assignedWorker: project.assignedWorker,
                                materials: project.materials || [],
                                drawings: project.drawings || [],
                                createdAt: project.createdAt,
                                description: project.description
                              }}
                              onEdit={handleEditProject}
                              onViewDetail={(projectId) => onProjectSelect(projectId)} // 新增：查看项目详情
                              onMaterialStatusChange={handleMaterialStatusChange}
                              onMoveToPast={handleMoveToPast}
                              onManageMaterials={() => handleJumpToMaterials(project.id, project.assignedWorker?.id)}
                              movingToPast={movingToPastIds.has(project.id)}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
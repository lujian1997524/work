'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore } from '@/stores';
import { Loading, Empty, EmptyData, Button } from '@/components/ui';
import { ActiveProjectCard } from '@/components/projects/ProjectCard';
import { StatusType } from '@/components/ui';
import { Material } from '@/types/project';
import { ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, ClockIcon, PlayIcon } from '@heroicons/react/24/outline';

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
}

export const ActiveProjectsCardView: React.FC<ActiveProjectsCardViewProps> = ({
  onProjectSelect,
  selectedProjectId,
  onProjectEdit,
  onMaterialStatusChange,
  onProjectMoveToPast,
  onJumpToMaterials,
  onRefresh,
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['pending', 'in_progress']));
  const [movingToPastIds, setMovingToPastIds] = useState<Set<number>>(new Set());
  const { user } = useAuth();
  
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

    setMovingToPastIds(prev => new Set(prev).add(projectId));
    try {
      const success = await moveToPastProject(projectId);
      if (success) {
        onProjectMoveToPast?.(projectId);
        // 刷新项目列表
        fetchProjects();
      }
    } catch (error) {
      // 移至过往项目失败，忽略错误日志
    } finally {
      setMovingToPastIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
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

  // 计算碳板优先统计
  const getCarbonPriorityStats = () => {
    const allMaterials = projects.flatMap(project => project.materials || []);
    const carbonMaterials = allMaterials.filter(m => 
      !m.thicknessSpec?.materialType || m.thicknessSpec.materialType === '碳板'
    );
    const specialMaterials = allMaterials.filter(m => 
      m.thicknessSpec?.materialType && m.thicknessSpec.materialType !== '碳板'
    );
    
    const carbonCompleted = carbonMaterials.filter(m => m.status === 'completed').length;
    const specialCompleted = specialMaterials.filter(m => m.status === 'completed').length;
    
    return {
      carbonTotal: carbonMaterials.length,
      carbonCompleted,
      carbonRate: carbonMaterials.length > 0 ? Math.round((carbonCompleted / carbonMaterials.length) * 100) : 0,
      specialTotal: specialMaterials.length,
      specialCompleted,
      specialRate: specialMaterials.length > 0 ? Math.round((specialCompleted / specialMaterials.length) * 100) : 0
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
  const carbonStats = getCarbonPriorityStats();

  return (
    <div className={`h-full flex flex-col p-4 ${className}`}>
      {/* 总体统计 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-sm border p-6 mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">活跃项目统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
            <div className="text-sm text-gray-500">活跃项目</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalMaterials}</div>
            <div className="text-sm text-gray-500">板材总数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{stats.completedMaterials}</div>
            <div className="text-sm text-gray-500">已完成</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{stats.completionRate}%</div>
            <div className="text-sm text-gray-500">完成率</div>
          </div>
        </div>
        
        {/* 碳板优先统计 */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">碳板优先进度 (95/5策略)</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <div className="text-lg font-bold text-blue-800">{carbonStats.carbonRate}%</div>
              <div className="text-xs text-blue-600">碳板完成率 ({carbonStats.carbonCompleted}/{carbonStats.carbonTotal})</div>
            </div>
            <div className="bg-orange-100 rounded-lg p-3">
              <div className="text-lg font-bold text-orange-800">{carbonStats.specialRate}%</div>
              <div className="text-xs text-orange-600">特殊材料完成率 ({carbonStats.specialCompleted}/{carbonStats.specialTotal})</div>
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
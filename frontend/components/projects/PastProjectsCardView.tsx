'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore } from '@/stores';
import { Loading, Empty, EmptyData } from '@/components/ui';
import { PastProjectCard } from '@/components/projects/ProjectCard';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PastProject {
  id: number;
  name: string;
  status: string;
  priority: string;
  createdAt?: string;
  created_at?: string;
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
  materials?: any[];
  drawings?: any[];
  isPastProject?: boolean;
  movedToPastAt?: string;
  pastProjectMover?: { id: number; name: string };
}

interface PastProjectsCardViewProps {
  onProjectSelect: (projectId: number | null) => void;
  selectedProjectId: number | null;
  onRefresh?: () => void;
  onRestore?: (projectId: number) => void; // 新增恢复回调
  onDelete?: (projectId: number) => void; // 新增删除回调
  className?: string;
}

export const PastProjectsCardView: React.FC<PastProjectsCardViewProps> = ({
  onProjectSelect,
  selectedProjectId,
  onRefresh,
  onRestore,
  onDelete,
  className = ''
}) => {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { user, token } = useAuth();
  
  const { 
    pastProjects, 
    pastProjectsByMonth,
    loading, 
    error,
    fetchPastProjects
  } = useProjectStore();

  // 使用useCallback包装fetchPastProjects，确保引用稳定
  const stableFetchPastProjects = useCallback(() => {
    return fetchPastProjects();
  }, [fetchPastProjects]);

  // 初始化数据 - 只在组件挂载时执行一次
  useEffect(() => {
    // PastProjectsCardView: 组件挂载，开始获取过往项目数据
    // 只在组件挂载时获取一次数据
    stableFetchPastProjects().catch(error => {
      // fetchPastProjects 失败
    });
  }, [stableFetchPastProjects]);

  // 调试信息更新
  useEffect(() => {
    // PastProjectsCardView: 当前状态统计
  }, [pastProjects.length, loading, pastProjectsByMonth]);

  // 切换月份展开状态
  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  // 处理查看项目详情
  const handleViewProject = (projectId: number) => {
    onProjectSelect(projectId);
  };

  // 获取月份显示名称
  const getMonthDisplayName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${year}年${month}月`;
  };

  // 计算统计信息
  const getOverallStats = () => {
    const totalProjects = pastProjects.length;
    const totalMaterials = pastProjects.reduce((sum, project) => sum + (project.materials?.length || 0), 0);
    const completedMaterials = pastProjects.reduce((sum, project) => 
      sum + (project.materials?.filter(m => m.status === 'completed').length || 0), 0
    );
    
    return {
      totalProjects,
      totalMaterials,
      completedMaterials,
      completionRate: totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0
    };
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <Loading size="lg" />
          <p className="text-sm text-gray-500 mt-3">正在加载过往项目...</p>
          <p className="text-xs text-gray-400 mt-2">请检查网络连接</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <p className="text-sm text-gray-700 mb-3">加载过往项目失败</p>
          <p className="text-xs text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => stableFetchPastProjects()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (pastProjects.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <EmptyData 
            
            description="还没有已归档的项目"
          />
          <button 
            onClick={() => {
              // 手动刷新过往项目
              stableFetchPastProjects();
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            刷新数据
          </button>
        </div>
      </div>
    );
  }

  const stats = getOverallStats();

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 总体统计 - 移动端优化 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-sm border p-3 sm:p-6 m-3 sm:m-4 flex-shrink-0">
        <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">过往项目统计</h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center">
          <div className="bg-white/50 rounded-lg p-2 sm:p-4">
            <div className="text-base sm:text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
            <div className="text-xs sm:text-sm text-gray-500">归档项目</div>
          </div>
          <div className="bg-white/50 rounded-lg p-2 sm:p-4">
            <div className="text-base sm:text-2xl font-bold text-blue-600">{stats.totalMaterials}</div>
            <div className="text-xs sm:text-sm text-gray-500">板材总数</div>
          </div>
          <div className="bg-white/50 rounded-lg p-2 sm:p-4">
            <div className="text-base sm:text-2xl font-bold text-green-600">{stats.completedMaterials}</div>
            <div className="text-xs sm:text-sm text-gray-500">已完成</div>
          </div>
          <div className="bg-white/50 rounded-lg p-2 sm:p-4">
            <div className="text-base sm:text-2xl font-bold text-purple-600">{stats.completionRate}%</div>
            <div className="text-xs sm:text-sm text-gray-500">完成率</div>
          </div>
        </div>
      </div>

      {/* 按月份分组显示 - 移动端优化 */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4">
        <div className="space-y-3 sm:space-y-4 pb-4">
        {Object.entries(pastProjectsByMonth || {}).map(([monthKey, monthProjects]) => (
          <div key={monthKey} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* 月份标题 */}
            <button
              onClick={() => toggleMonth(monthKey)}
              className="w-full px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-2 sm:space-x-3">
                {expandedMonths.has(monthKey) ? (
                  <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                )}
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900">
                  {getMonthDisplayName(monthKey)}
                </h3>
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm">
                  {(monthProjects as any[]).length} 个
                </span>
              </div>
            </button>

            {/* 月份下的项目卡片 */}
            <AnimatePresence>
              {expandedMonths.has(monthKey) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-2 sm:p-6">
                    <div className="grid grid-cols-1 gap-3 sm:gap-6">
                      {(monthProjects as PastProject[]).map((project) => (
                        <PastProjectCard
                          key={project.id}
                          project={{
                            id: project.id,
                            name: project.name,
                            status: project.status,
                            priority: project.priority,
                            assignedWorker: project.assignedWorker,
                            materials: project.materials || [],
                            drawings: project.drawings || [],
                            movedToPastAt: project.movedToPastAt,
                            isPastProject: project.isPastProject
                          }}
                          onView={handleViewProject}
                          onRestore={onRestore}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        </div>
      </div>

      {/* 如果没有按月分组的数据，显示所有项目 - 移动端优化 */}
      {(!pastProjectsByMonth || Object.keys(pastProjectsByMonth).length === 0) && (
        <div className="flex-1 overflow-y-auto px-3 sm:px-4">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 pb-4">
            {pastProjects.map((project) => (
              <PastProjectCard
                key={project.id}
                project={{
                  id: project.id,
                  name: project.name,
                  status: project.status,
                  priority: project.priority,
                  assignedWorker: project.assignedWorker,
                  materials: project.materials || [],
                  drawings: project.drawings || [],
                  movedToPastAt: project.movedToPastAt,
                  isPastProject: project.isPastProject
                }}
                onView={handleViewProject}
                onRestore={onRestore}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
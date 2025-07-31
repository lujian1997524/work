'use client';

import React, { useState, useEffect } from 'react';
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
  className?: string;
}

export const PastProjectsCardView: React.FC<PastProjectsCardViewProps> = ({
  onProjectSelect,
  selectedProjectId,
  onRefresh,
  className = ''
}) => {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  
  const { 
    pastProjects, 
    pastProjectsByMonth,
    loading, 
    fetchPastProjects
  } = useProjectStore();

  // 初始化数据
  useEffect(() => {
    if (pastProjects.length === 0 && !loading) {
      fetchPastProjects();
    }
  }, [pastProjects.length, loading, fetchPastProjects]);

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
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  if (pastProjects.length === 0) {
    return (
      <EmptyData 
        title="暂无过往项目"
        description="还没有已归档的项目"
        className="py-12"
      />
    );
  }

  const stats = getOverallStats();

  return (
    <div className={`h-full flex flex-col p-4 ${className}`}>
      {/* 总体统计 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-sm border p-6 mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">过往项目统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
            <div className="text-sm text-gray-500">归档项目</div>
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
      </div>

      {/* 按月份分组显示 */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pb-4">
        {Object.entries(pastProjectsByMonth || {}).map(([monthKey, monthProjects]) => (
          <div key={monthKey} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* 月份标题 */}
            <button
              onClick={() => toggleMonth(monthKey)}
              className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                {expandedMonths.has(monthKey) ? (
                  <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {getMonthDisplayName(monthKey)}
                </h3>
                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm">
                  {(monthProjects as any[]).length} 个项目
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
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* 如果没有按月分组的数据，显示所有项目 */}
      {(!pastProjectsByMonth || Object.keys(pastProjectsByMonth).length === 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            />
          ))}
        </div>
      )}
    </div>
  );
};
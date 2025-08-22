'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore } from '@/stores';
import { useDialog, Button, Loading, BatchSortModal } from '@/components/ui';
import { ArrowsUpDownIcon } from '@heroicons/react/24/outline';

interface Project {
  id: number;
  name: string;
  status: string;
  priority: string;
  createdAt: string;
  created_at?: string; // 兼容后端字段名
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
}

interface ProjectTreeProps {
  onProjectSelect: (projectId: number | null) => void;
  selectedProjectId: number | null;
  onCreateProject?: () => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (projectId: number) => void;
  onRefresh?: () => void;
  refreshTrigger?: number;
  className?: string;
  // 筛选参数
  filteredProjects?: Project[];
  onMobileItemClick?: () => void;
  // 排序功能
  onBatchSort?: (reorderedItems: any[]) => Promise<void>;
  isSorting?: boolean;
}

export const ProjectTree: React.FC<ProjectTreeProps> = ({
  onProjectSelect,
  selectedProjectId,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onRefresh,
  refreshTrigger = 0,
  className = '',
  filteredProjects,
  onMobileItemClick,
  onBatchSort,
  isSorting = false
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all', 'pending']));
  const [showSortModal, setShowSortModal] = useState(false);
  
  // 排序功能处理
  const openSortModal = () => {
    setShowSortModal(true);
  };

  const closeSortModal = () => {
    setShowSortModal(false);
  };

  const handleBatchSort = async (reorderedItems: any[]) => {
    if (onBatchSort) {
      await onBatchSort(reorderedItems);
    }
  };
  
  // 使用Dialog组件 - 正确定位
  const { alert, confirm, DialogRenderer } = useDialog();
  
  // 使用Zustand Store（明确订阅完整状态）
  const { 
    projects: storeProjects, 
    loading, 
    fetchProjects: originalFetchProjects, 
    lastUpdated,
    deleteProject
  } = useProjectStore();

  // 获取用户权限
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // 使用传入的筛选项目或store中的项目
  const projects = filteredProjects || storeProjects;

  // 包装fetchProjects以避免依赖问题
  const fetchProjects = useCallback(() => {
    originalFetchProjects();
  }, [originalFetchProjects]);

  // 删除项目处理函数
  const handleDeleteProject = async (projectId: number) => {
    // 如果父组件提供了删除函数，优先使用父组件的
    if (onDeleteProject) {
      await onDeleteProject(projectId);
      return;
    }
    
    // 否则使用组件内部的删除逻辑
    const confirmed = await confirm('确定要删除这个项目吗？此操作不可撤销。');
    if (!confirmed) {
      return;
    }
    const success = await deleteProject(projectId);
    if (!success) {
      await alert('删除项目失败，请重试');
    }
  };

  // 获取项目列表（仅在refreshTrigger变化时）
  useEffect(() => {
    if (refreshTrigger > 0) { // 只有当refreshTrigger > 0时才刷新
      fetchProjects();
    }
  }, [refreshTrigger]);

  // 监听项目相关事件，确保项目树能及时更新
  useEffect(() => {
    const handleProjectCreated = (event: any) => {
      // 项目创建成功，刷新项目树
      fetchProjects();
    };

    const handleProjectUpdated = (event: any) => {
      // 项目更新成功，刷新项目树
      fetchProjects();
    };

    const handleProjectsUpdated = (event: any) => {
      // 项目列表更新，刷新项目树
      fetchProjects();
    };

    // 注册事件监听器
    window.addEventListener('project-created', handleProjectCreated);
    window.addEventListener('project-updated', handleProjectUpdated);
    window.addEventListener('projects-updated', handleProjectsUpdated);

    // 清理函数
    return () => {
      window.removeEventListener('project-created', handleProjectCreated);
      window.removeEventListener('project-updated', handleProjectUpdated);
      window.removeEventListener('projects-updated', handleProjectsUpdated);
    };
  }, [fetchProjects]); // 依赖fetchProjects，确保引用稳定

  // 按状态分组项目
  const groupedProjects = {
    all: projects,
    pending: projects.filter(p => p.status === 'pending'),
    in_progress: projects.filter(p => p.status === 'in_progress'),
    completed: projects.filter(p => p.status === 'completed'),
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2" fill="white" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'in_progress':
        return (
          <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2" fill="white" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'pending':
        return (
          <div className="w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
            <svg className="w-2 h-2" fill="white" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return <div className="w-3 h-3 bg-gray-300 rounded-full"></div>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'in_progress':
        return '进行中';
      case 'pending':
        return '待处理';
      default:
        return '未知';
    }
  };

  const groups = [
    { key: 'all', label: '全部项目', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ), projects: groupedProjects.all },
    { key: 'pending', label: '待处理', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), projects: groupedProjects.pending },
    { key: 'in_progress', label: '进行中', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a1.5 1.5 0 011.5 1.5v1.5m-3-6v6m-1 1v-1a7 7 0 1114 0v1" />
      </svg>
    ), projects: groupedProjects.in_progress },
    { key: 'completed', label: '已完成', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), projects: groupedProjects.completed },
  ];

  if (loading) {
    return (
      <div className={`bg-white/80 backdrop-blur-xl border-r border-gray-200 ${className}`}>
        <div className="p-4 text-center">
          <Loading size="md" text="加载中..." />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/80 backdrop-blur-xl border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* 标题区域 */}
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary text-sm">项目列表</h2>
          <div className="flex items-center space-x-2">
            {/* 排序按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={openSortModal}
              disabled={isSorting || !onBatchSort || (filteredProjects && filteredProjects.length === 0)}
              className="flex items-center space-x-1"
              
            >
              <ArrowsUpDownIcon className="w-3 h-3" />
              <span>{isSorting ? '处理中...' : '排序'}</span>
            </Button>
            
            {/* 新建项目按钮 */}
            <Button
              onClick={() => {
                onCreateProject?.();
                onMobileItemClick?.(); // 移动端自动收回侧边栏
              }}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              size="sm"
            >
              + 新建
            </Button>
          </div>
        </div>
      </div>

      {/* 项目树 */}
      <div className="flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.key} className="border-b border-gray-100 last:border-b-0">
            {/* 分组标题 */}
            <Button
              onClick={() => toggleGroup(group.key)}
              variant="ghost"
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors h-auto"
            >
              <div className="flex items-center space-x-2">
                <div className="text-ios18-blue">{group.icon}</div>
                <span className="font-medium text-text-primary text-sm">{group.label}</span>
                <span className="text-xs bg-gray-100 text-text-secondary px-2 py-1 rounded-full">
                  {group.projects.length}
                </span>
              </div>
              <motion.span
                animate={{ rotate: expandedGroups.has(group.key) ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-text-tertiary"
              >
                ▶
              </motion.span>
            </Button>

            {/* 项目列表 */}
            <AnimatePresence>
              {expandedGroups.has(group.key) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  {group.projects.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-text-tertiary text-center">
                      暂无项目
                    </div>
                  ) : (
                    <div className="space-y-1 pb-2">
                      {group.projects.map((project) => (
                        <motion.div
                          key={project.id}
                          onClick={() => {
                            onProjectSelect(project.id);
                            onMobileItemClick?.(); // 通知移动端关闭侧边栏
                          }}
                          className={`group w-full px-4 py-2 mx-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedProjectId === project.id
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'hover:bg-gray-100 text-text-primary'
                          }`}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {getStatusIcon(project.status)}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm">
                                  {project.name}
                                </div>
                                <div className={`text-xs truncate ${
                                  selectedProjectId === project.id
                                    ? 'text-blue-100' 
                                    : 'text-text-secondary'
                                }`}>
                                  {project.assignedWorker?.name || '未分配'} • {getStatusText(project.status)}
                                </div>
                              </div>
                            </div>
                            
                            {/* 项目操作按钮 */}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  onEditProject?.(project);
                                }}
                                variant="ghost"
                                size="sm"
                                className={`p-1 rounded hover:bg-black/10 h-auto ${
                                  selectedProjectId === project.id ? 'text-white' : 'text-text-tertiary'
                                }`}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                              {isAdmin && (
                                <Button
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    handleDeleteProject(project.id);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className={`p-1 rounded hover:bg-black/10 h-auto ${
                                    selectedProjectId === project.id ? 'text-white' : 'text-red-500'
                                  }`}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* 批量排序模态框 */}
      <BatchSortModal
        isOpen={showSortModal}
        onClose={closeSortModal}
        items={(filteredProjects || projects).map((project, index) => ({
          id: project.id,
          name: project.name,
          currentPosition: index + 1
        }))}
        onSave={handleBatchSort}
        
      />
    </div>
  );
};
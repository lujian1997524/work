'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ProjectTreeNode } from './ProjectTreeNode';

interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedWorker?: {
    id: number;
    name: string;
    department?: string;
  };
}

interface TreeNode {
  id: string;
  title: string;
  type: 'group' | 'project';
  project?: Project;
  children?: TreeNode[];
  isExpanded?: boolean;
}

interface ProjectTreeProps {
  projects: Project[];
  selectedProjectId?: number;
  onProjectSelect: (project: Project) => void;
  loading?: boolean;
  className?: string;
}

export function ProjectTree({
  projects,
  selectedProjectId,
  onProjectSelect,
  loading = false,
  className = ''
}: ProjectTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['status-groups', 'priority-groups']));
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'status' | 'priority'>('status');

  // 根据搜索词过滤项目
  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    
    const term = searchTerm.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(term) ||
      project.description?.toLowerCase().includes(term) ||
      project.assignedWorker?.name.toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  // 构建树形结构
  const treeNodes = useMemo(() => {
    if (viewMode === 'status') {
      // 按状态分组
      const statusGroups: { [key: string]: Project[] } = {
        'pending': [],
        'in_progress': [],
        'completed': [],
        'cancelled': []
      };

      filteredProjects.forEach(project => {
        statusGroups[project.status].push(project);
      });

      const statusLabels = {
        'pending': '待开始',
        'in_progress': '进行中',
        'completed': '已完成',
        'cancelled': '已取消'
      };

      return Object.entries(statusGroups)
        .filter(([_, projects]) => projects.length > 0)
        .map(([status, projects]) => ({
          id: `status-${status}`,
          title: statusLabels[status as keyof typeof statusLabels],
          type: 'group' as const,
          isExpanded: expandedNodes.has(`status-${status}`),
          children: projects
            .sort((a, b) => {
              // 优先级排序：urgent > high > medium > low
              const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
              return priorityOrder[b.priority] - priorityOrder[a.priority];
            })
            .map(project => ({
              id: `project-${project.id}`,
              title: project.name,
              type: 'project' as const,
              project
            }))
        }));
    } else {
      // 按优先级分组
      const priorityGroups: { [key: string]: Project[] } = {
        'urgent': [],
        'high': [],
        'medium': [],
        'low': []
      };

      filteredProjects.forEach(project => {
        priorityGroups[project.priority].push(project);
      });

      const priorityLabels = {
        'urgent': '紧急',
        'high': '高优先级',
        'medium': '中优先级',
        'low': '低优先级'
      };

      return Object.entries(priorityGroups)
        .filter(([_, projects]) => projects.length > 0)
        .map(([priority, projects]) => ({
          id: `priority-${priority}`,
          title: priorityLabels[priority as keyof typeof priorityLabels],
          type: 'group' as const,
          isExpanded: expandedNodes.has(`priority-${priority}`),
          children: projects
            .sort((a, b) => {
              // 状态排序：in_progress > pending > completed > cancelled
              const statusOrder = { in_progress: 4, pending: 3, completed: 2, cancelled: 1 };
              return statusOrder[b.status] - statusOrder[a.status];
            })
            .map(project => ({
              id: `project-${project.id}`,
              title: project.name,
              type: 'project' as const,
              project
            }))
        }));
    }
  }, [filteredProjects, viewMode, expandedNodes]);

  // 处理节点展开/折叠
  const handleToggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-ios-lg border border-macos15-separator ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-center py-8">
            <motion.div
              className="w-8 h-8 border-4 border-ios18-blue border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="ml-3 text-text-secondary">加载项目中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-ios-lg border border-macos15-separator ${className}`}>
      {/* 头部工具栏 */}
      <div className="p-3 border-b border-macos15-separator">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-primary">项目导航</h2>
          <div className="flex items-center space-x-1.5">
            {/* 视图切换 */}
            <div className="flex bg-macos15-control rounded-ios-md p-0.5">
              <button
                onClick={() => setViewMode('status')}
                className={`px-2.5 py-1 text-xs rounded-ios-sm transition-all ${
                  viewMode === 'status'
                    ? 'bg-white text-ios18-blue shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                状态
              </button>
              <button
                onClick={() => setViewMode('priority')}
                className={`px-2.5 py-1 text-xs rounded-ios-sm transition-all ${
                  viewMode === 'priority'
                    ? 'bg-white text-ios18-blue shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                优先级
              </button>
            </div>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索项目..."
            className="w-full pl-10 pr-10 py-2 text-sm border border-macos15-separator rounded-ios-md focus:border-ios18-blue focus:outline-none focus:ring-1 focus:ring-ios18-blue focus:ring-opacity-50"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 项目统计信息 */}
        <div className="text-xs text-text-secondary">
          共 {filteredProjects.length} 个项目
        </div>
      </div>

      {/* 树形内容 */}
      <div className="p-2 max-h-96 overflow-y-auto">
        {treeNodes.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-text-secondary">
              {searchTerm ? '未找到匹配的项目' : '暂无项目'}
            </p>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="mt-2 text-ios18-blue hover:underline text-sm"
              >
                清除搜索条件
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {treeNodes.map((node) => (
              <ProjectTreeNode
                key={node.id}
                node={node}
                selectedProjectId={selectedProjectId}
                onProjectSelect={onProjectSelect}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      {filteredProjects.length > 0 && (
        <div className="p-3 border-t border-macos15-separator bg-macos15-control rounded-b-ios-lg">
          <div className="flex justify-between items-center text-xs text-text-secondary">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-status-warning rounded-full"></div>
                <span>进行中: {filteredProjects.filter(p => p.status === 'in_progress').length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>待开始: {filteredProjects.filter(p => p.status === 'pending').length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-status-success rounded-full"></div>
                <span>已完成: {filteredProjects.filter(p => p.status === 'completed').length}</span>
              </div>
            </div>
            {selectedProjectId && (
              <div className="text-ios18-blue">
                已选择项目 #{selectedProjectId}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
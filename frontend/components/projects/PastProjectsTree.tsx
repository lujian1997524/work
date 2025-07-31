'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore } from '@/stores';
import { Loading } from '@/components/ui';

// 使用ProjectState类型，因为这与实际数据结构匹配
interface PastProject {
  id: number;
  name: string;
  status: string;
  priority: string;
  createdAt?: string;
  created_at?: string;
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
  // 过往项目特有字段（从API返回）
  isPastProject?: boolean;
  movedToPastAt?: string;
  pastProjectMover?: { id: number; name: string };
}

interface PastProjectsTreeProps {
  onProjectSelect: (projectId: number | null) => void;
  selectedProjectId: number | null;
  onRefresh?: () => void;
  className?: string;
  onMobileItemClick?: () => void;
}

export const PastProjectsTree: React.FC<PastProjectsTreeProps> = ({
  onProjectSelect,
  selectedProjectId,
  onRefresh,
  className = '',
  onMobileItemClick
}) => {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  
  // 使用Zustand Store
  const { 
    pastProjects, 
    pastProjectsByMonth,
    loading, 
    fetchPastProjects: originalFetchPastProjects, 
    lastUpdated
  } = useProjectStore();

  // 包装fetchPastProjects以避免依赖问题
  const fetchPastProjects = useCallback(() => {
    originalFetchPastProjects();
  }, [originalFetchPastProjects]);

  // 初始加载过往项目数据
  useEffect(() => {
    fetchPastProjects();
  }, [fetchPastProjects]);

  // 切换月份展开/折叠
  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  // 获取月份显示文本
  const getMonthDisplayText = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  // 获取项目状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-gray-500';
      default: return 'text-blue-600';
    }
  };

  // 获取项目状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      case 'in_progress': return '进行中';
      case 'pending': return '待处理';
      default: return status;
    }
  };

  // 格式化时间显示
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取按时间倒序排列的月份列表
  const sortedMonthKeys = Object.keys(pastProjectsByMonth).sort((a, b) => b.localeCompare(a));

  return (
    <div className={`h-full bg-white/80 backdrop-blur-xl border-r border-gray-200 flex flex-col ${className}`}>
      {/* 标题栏 */}
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              过往项目
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              按月份组织管理
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              fetchPastProjects();
              onRefresh?.();
            }}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="刷新过往项目"
          >
            <svg 
              className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* 项目树内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && pastProjects.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loading size="md" text="加载中..." />
          </div>
        ) : sortedMonthKeys.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p className="text-sm text-gray-500">暂无过往项目</p>
              <p className="text-xs text-gray-400 mt-1">已完成的项目移动到过往后会显示在这里</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedMonthKeys.map((monthKey) => {
              const monthProjects = pastProjectsByMonth[monthKey] || [];
              const isExpanded = expandedMonths.has(monthKey);

              return (
                <div key={monthKey} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* 月份标题 */}
                  <motion.button
                    whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                    onClick={() => toggleMonth(monthKey)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <motion.svg
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </motion.svg>
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-gray-800">
                        {getMonthDisplayText(monthKey)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                      {monthProjects.length}个项目
                    </span>
                  </motion.button>

                  {/* 项目列表 */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-200">
                          {monthProjects.map((project: any, index) => (
                            <motion.button
                              key={project.id}
                              whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                              onClick={() => {
                                onProjectSelect(project.id);
                                onMobileItemClick?.(); // 通知移动端关闭侧边栏
                              }}
                              className={`w-full flex items-center justify-between p-3 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                                selectedProjectId === project.id
                                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="font-medium text-gray-800 truncate">
                                    {project.name}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`text-xs ${getStatusColor(project.status)}`}>
                                    {getStatusText(project.status)}
                                  </span>
                                  {project.assignedWorker && (
                                    <>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-500">
                                        {project.assignedWorker.name}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {project.movedToPastAt && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {formatDateTime(project.movedToPastAt)} 移动到过往
                                  </div>
                                )}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部状态信息 */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="text-xs text-gray-500 text-center">
          {pastProjects.length > 0 ? (
            <span>共 {pastProjects.length} 个过往项目</span>
          ) : (
            <span>暂无过往项目</span>
          )}
        </div>
      </div>
    </div>
  );
};
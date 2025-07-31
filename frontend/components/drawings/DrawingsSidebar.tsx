'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import {
  FolderIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  PlusIcon,
  ArrowPathIcon,
  LinkIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DrawingsSidebarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onRefresh?: () => void;
  onUploadClick?: () => void;
  onMobileItemClick?: () => void;
  className?: string;
}

interface DrawingStats {
  all: number;
  'common-parts': number;
  'associated': number;
  'unassociated': number;
  available: number;
  archived: number;
}

export const DrawingsSidebar: React.FC<DrawingsSidebarProps> = ({
  selectedCategory,
  onCategoryChange,
  onRefresh,
  onUploadClick,
  onMobileItemClick,
  className = ''
}) => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<DrawingStats>({
    all: 0,
    'common-parts': 0,
    'associated': 0,
    'unassociated': 0,
    available: 0,
    archived: 0
  });
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['categories', 'association', 'status'])
  );

  // 获取图纸统计信息
  const fetchStats = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      // 获取所有图纸（包括归档）进行统计
      const response = await apiRequest('/api/drawings?limit=1000&includeArchived=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const drawings = data.drawings || [];
        
        const newStats: DrawingStats = {
          'all': drawings.length,
          'common-parts': drawings.filter((d: any) => d.isCommonPart).length,
          'associated': drawings.filter((d: any) => !d.isCommonPart && d.project && d.project.id).length,
          'unassociated': drawings.filter((d: any) => !d.isCommonPart && (!d.project || !d.project.id)).length,
          'available': drawings.filter((d: any) => d.status === '可用').length,
          'archived': drawings.filter((d: any) => d.status === '已归档').length
        };
        
        setStats(newStats);
      }
    } catch (error) {
      console.error('获取图纸统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  // 切换分组展开状态
  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // 处理刷新
  const handleRefresh = () => {
    fetchStats();
    onRefresh?.();
    onMobileItemClick?.(); // 移动端自动收回侧边栏
  };

  // 分类数据
  const categories = [
    {
      key: 'categories',
      label: '图纸分类',
      icon: <FolderIcon className="w-5 h-5" />,
      items: [
        { key: 'all', label: '全部图纸', count: stats.all, icon: <DocumentTextIcon className="w-4 h-4" /> },
        { key: 'common-parts', label: '常用零件', count: stats['common-parts'], icon: <ArchiveBoxIcon className="w-4 h-4" /> }
      ]
    },
    {
      key: 'association',
      label: '项目关联',
      icon: <LinkIcon className="w-5 h-5" />,
      items: [
        { key: 'associated', label: '关联项目', count: stats.associated, icon: <LinkIcon className="w-4 h-4" /> },
        { key: 'unassociated', label: '未关联项目', count: stats.unassociated, icon: <XMarkIcon className="w-4 h-4" /> }
      ]
    },
    {
      key: 'status',
      label: '状态分类',
      icon: <ArchiveBoxIcon className="w-5 h-5" />,
      items: [
        { key: 'available', label: '可用', count: stats.available, icon: <DocumentTextIcon className="w-4 h-4" /> },
        { key: 'archived', label: '已归档', count: stats.archived, icon: <ArchiveBoxIcon className="w-4 h-4" /> }
      ]
    }
  ];

  return (
    <div className={`bg-white/80 backdrop-blur-xl border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* 标题区域 */}
      <div className="px-3 py-2.5 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary text-sm">图纸库</h2>
          <div className="flex items-center space-x-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="p-1.5"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {user?.role === 'admin' && (
              <Button
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 p-1.5"
                size="sm"
                onClick={() => {
                  onUploadClick?.();
                  onMobileItemClick?.(); // 移动端自动收回侧边栏
                }}
              >
                <PlusIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 侧边栏树 */}
      <div className="flex-1 overflow-y-auto">
        {categories.map((group) => (
          <div key={group.key} className="border-b border-gray-100 last:border-b-0">
            {/* 分组标题 */}
            <Button
              onClick={() => toggleGroup(group.key)}
              variant="ghost"
              className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors h-auto"
            >
              <div className="flex items-center space-x-2">
                <div className="text-ios18-blue">{React.cloneElement(group.icon, { className: "w-4 h-4" })}</div>
                <span className="font-medium text-text-primary text-sm truncate">{group.label}</span>
                <span className="text-xs bg-gray-100 text-text-secondary px-1.5 py-0.5 rounded text-xs">
                  {group.items.length}
                </span>
              </div>
              <motion.span
                animate={{ rotate: expandedGroups.has(group.key) ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-text-tertiary text-sm"
              >
                ▶
              </motion.span>
            </Button>

            {/* 分组内容 */}
            <AnimatePresence>
              {expandedGroups.has(group.key) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="py-1">
                    {group.items.map((item) => (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative"
                      >
                        <Button
                          onClick={() => {
                            onCategoryChange(item.key);
                            onMobileItemClick?.(); // 通知移动端关闭侧边栏
                          }}
                          variant="ghost"
                          className={`w-full px-6 py-2 flex items-center justify-between text-left transition-colors hover:bg-gray-50 h-auto ${
                            selectedCategory === item.key 
                              ? 'bg-ios18-blue/10 text-ios18-blue border-r-2 border-ios18-blue' 
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className={selectedCategory === item.key ? 'text-ios18-blue' : 'text-text-tertiary'}>
                              {React.cloneElement(item.icon, { className: "w-4 h-4" })}
                            </div>
                            <span className="text-sm truncate">{item.label}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs bg-gray-100 text-text-secondary px-1.5 py-0.5 rounded text-xs">
                              {item.count}
                            </span>
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};
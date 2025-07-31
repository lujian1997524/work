'use client';

import React, { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Loading } from '@/components/ui';

export interface SidebarGroup {
  key: string;
  label: string;
  icon: ReactNode;
  items: SidebarItem[];
}

export interface SidebarItem {
  key: string;
  label: string;
  count?: number;
  icon: ReactNode;
  data?: any; // 额外数据，用于操作
}

interface UnifiedSidebarProps {
  title: string;
  groups: SidebarGroup[];
  selectedKey: string;
  onItemSelect: (key: string) => void;
  loading?: boolean;
  actions?: ReactNode; // 顶部操作按钮
  onItemAction?: (action: 'edit' | 'delete', item: SidebarItem) => void;
  showItemActions?: boolean;
  className?: string;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  title,
  groups,
  selectedKey,
  onItemSelect,
  loading = false,
  actions,
  onItemAction,
  showItemActions = false,
  className = ''
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(groups.map(group => group.key))
  );

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
    <div className={`bg-white/80 backdrop-blur-xl border-r border-gray-200 ${className}`}>
      {/* 标题区域 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary text-sm">{title}</h2>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* 侧边栏树 */}
      <div className="overflow-y-auto h-full">
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
                  {group.items.length}
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
                        className="group relative"
                      >
                        <Button
                          onClick={() => onItemSelect(item.key)}
                          variant="ghost"
                          className={`w-full px-8 py-2 flex items-center justify-between text-left transition-colors group-hover:bg-gray-50 h-auto ${
                            selectedKey === item.key 
                              ? 'bg-ios18-blue/10 text-ios18-blue border-r-2 border-ios18-blue' 
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className={selectedKey === item.key ? 'text-ios18-blue' : 'text-text-tertiary'}>
                              {item.icon}
                            </div>
                            <span className="text-sm truncate">{item.label}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {item.count !== undefined && (
                              <span className="text-xs bg-gray-100 text-text-secondary px-2 py-1 rounded-full">
                                {item.count}
                              </span>
                            )}
                          </div>
                        </Button>

                        {/* 操作按钮 */}
                        {showItemActions && onItemAction && item.data && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onItemAction('edit', item);
                                }}
                                className="p-1 rounded hover:bg-blue-100 text-blue-600"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onItemAction('delete', item);
                                }}
                                className="p-1 rounded hover:bg-red-100 text-red-600"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
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
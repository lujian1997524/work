'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Dropdown, Avatar, Badge } from '@/components/ui';
import { SearchBox } from '@/components/ui/SearchBox';
import type { SearchType, SearchResult } from '@/components/ui/SearchBox';

interface ResponsiveHeaderProps {
  onMenuClick?: () => void;
  onSearchResults?: (results: SearchResult[]) => void;
  searchClearTrigger?: number;
  className?: string;
  // 新增导航相关props
  viewType?: 'active' | 'completed' | 'drawings' | 'dashboard';
  onViewTypeChange?: (type: 'active' | 'completed' | 'drawings' | 'dashboard') => void;
  onShowWorkerManagement?: () => void;
  onShowDashboard?: () => void;
  onShowThicknessSpec?: () => void;
}

export const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({
  onMenuClick,
  onSearchResults,
  searchClearTrigger,
  className = '',
  // 新增导航相关props
  viewType = 'active',
  onViewTypeChange,
  onShowWorkerManagement,
  onShowDashboard,
  onShowThicknessSpec
}) => {
  const { user, logout } = useAuth();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // 桌面端完整头部
  if (isDesktop) {
    return (
      <header className={`bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-10 flex-shrink-0 ${className}`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-text-primary">
                  激光切割生产管理系统
                </h1>
                <Badge variant="secondary" size="sm">
                  v2.0
                </Badge>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                生产状态实时监控与协作管理平台
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* 搜索框 */}
              <div className="w-96">
                <SearchBox
                  placeholder="搜索项目、工人、图纸..."
                  onResults={onSearchResults}
                  clearTrigger={searchClearTrigger}
                />
              </div>

              {/* 用户信息 */}
              <div className="flex items-center space-x-3">
                <Avatar name={user?.name || ''} size="sm" />
                <div className="text-right">
                  <div className="text-sm font-medium text-text-primary">
                    {user?.name}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {user?.role === 'admin' ? '管理员' : '操作员'}
                  </div>
                </div>
                <Dropdown
                  trigger={
                    <Button variant="ghost" size="sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>
                  }
                  items={[
                    { label: '个人设置', onClick: () => {} },
                    { label: '系统设置', onClick: () => {} },
                    { type: 'separator' },
                    { label: '退出登录', onClick: logout }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* 导航栏 */}
          <div className="mt-4 flex items-center justify-between">
            {/* 主导航按钮 */}
            <div className="flex items-center space-x-2">
              <Button
                variant={viewType === 'active' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onViewTypeChange?.('active')}
              >
                活跃项目
              </Button>
              <Button
                variant={viewType === 'completed' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onViewTypeChange?.('completed')}
              >
                过往项目
              </Button>
              <Button
                variant={viewType === 'drawings' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onViewTypeChange?.('drawings')}
              >
                图纸库
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onShowDashboard?.()}
              >
                仪表盘
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onShowWorkerManagement?.()}
              >
                工人管理
              </Button>
            </div>

            {/* 功能按钮 */}
            <div className="flex items-center space-x-2">
              {user?.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShowThicknessSpec?.()}
                >
                  板材管理
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // 平板端精简头部
  if (isTablet) {
    return (
      <header className={`bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-10 flex-shrink-0 ${className}`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧 */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost" 
                size="sm"
                onClick={onMenuClick}
                className="min-h-[44px] min-w-[44px]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
              <div>
                <h1 className="text-lg font-bold text-text-primary">激光切割管理</h1>
                <p className="text-xs text-text-secondary">生产协作平台</p>
              </div>
            </div>

            {/* 右侧 */}
            <div className="flex items-center space-x-2">
              {/* 搜索按钮 */}
              <Button
                variant="ghost"
                size="sm" 
                onClick={() => setShowMobileSearch(true)}
                className="min-h-[44px] min-w-[44px]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </Button>

              {/* 用户菜单 */}
              <Dropdown
                trigger={
                  <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]">
                    <Avatar name={user?.name || ''} size="xs" />
                  </Button>
                }
                items={[
                  { label: user?.name || '', disabled: true },
                  { label: user?.role === 'admin' ? '管理员' : '操作员', disabled: true },
                  { type: 'separator' },
                  { label: '退出登录', onClick: logout }
                ]}
              />
            </div>
          </div>

          {/* 移动端搜索展开 */}
          <AnimatePresence>
            {showMobileSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 pt-3 border-t border-gray-200"
              >
                <SearchBox
                  placeholder="搜索项目、工人、图纸..."
                  onResults={(results) => {
                    onSearchResults?.(results);
                    setShowMobileSearch(false);
                  }}
                  clearTrigger={searchClearTrigger}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    );
  }

  // 移动端紧凑头部
  return (
    <header className={`bg-white/80 backdrop-blur-xl border-b border-gray-200 ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 左侧 */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="min-h-[44px] min-w-[44px] p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <div>
              <h1 className="text-base font-bold text-text-primary">激光切割</h1>
              <p className="text-xs text-text-secondary">生产管理</p>
            </div>
          </div>

          {/* 右侧 */}
          <div className="flex items-center space-x-1">
            {/* 搜索按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileSearch(true)}
              className="min-h-[44px] min-w-[44px] p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Button>

            {/* 用户头像 */}
            <Dropdown
              trigger={
                <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-2">
                  <Avatar name={user?.name || ''} size="xs" />
                </Button>
              }
              items={[
                { label: `${user?.name}`, disabled: true },
                { label: user?.role === 'admin' ? '管理员' : '操作员', disabled: true },
                { type: 'separator' },
                { label: '退出登录', onClick: logout }
              ]}
            />
          </div>
        </div>

        {/* 移动端搜索展开 */}
        <AnimatePresence>
          {showMobileSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-gray-200"
            >
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <SearchBox
                    placeholder="搜索..."
                    onResults={(results) => {
                      onSearchResults?.(results);
                      setShowMobileSearch(false);
                    }}
                    clearTrigger={searchClearTrigger}
                    autoFocus
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileSearch(false)}
                  className="min-h-[44px] min-w-[44px]"
                >
                  取消
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
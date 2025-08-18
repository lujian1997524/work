'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { ActivityBar } from './ActivityBar';
import { useResponsive } from '@/hooks/useResponsive';
import { MobileDrawer, BottomSheet, IconButton, ToastContainer, useToast } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useSSEToastMapping } from '@/utils/sseToastMapper';
import { useBatchOperationToastListener } from '@/utils/batchOperationToastHelper';
import { 
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface VSCodeLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  activeView: 'active' | 'completed' | 'drawings' | 'materials' | 'workers' | 'public-inventory' | 'attendance';
  onViewChange: (view: 'active' | 'completed' | 'drawings' | 'materials' | 'workers' | 'public-inventory' | 'attendance') => void;
  onSearchClick?: () => void;
  onSystemSettingsClick?: () => void;
  onProfileClick?: () => void;
  onMobileSidebarAutoClose?: () => void;
  className?: string;
}

export const VSCodeLayout: React.FC<VSCodeLayoutProps> = ({
  children,
  sidebar,
  activeView,
  onViewChange,
  onSearchClick,
  onSystemSettingsClick,
  onProfileClick,
  onMobileSidebarAutoClose,
  className = ''
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [showMobileSidebar, setShowMobileSidebar] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const { user, logout } = useAuth();

  // 初始化Toast系统 - 与MainLayout保持一致
  const toast = useToast();

  // 启用SSE到Toast自动映射
  useSSEToastMapping({
    autoStart: true,
    projectEvents: true,
    materialEvents: true,
    drawingEvents: true,
    workerEvents: true,
  });

  // 启用批量操作Toast监听器
  useBatchOperationToastListener(toast);

  // 桌面端布局 - VS Code风格
  if (isDesktop) {
    return (
      <div className={`h-screen bg-gray-50 flex overflow-hidden ${className}`}>
        {/* 活动栏 */}
        <ActivityBar
          activeView={activeView}
          onViewChange={onViewChange}
          onSearchClick={onSearchClick}
          onSystemSettingsClick={onSystemSettingsClick}
          onProfileClick={onProfileClick}
        />
        
        {/* 侧边栏 */}
        {sidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            className="w-55 bg-white/80 backdrop-blur-xl border-r border-gray-200 flex-shrink-0 h-full"
            style={{ width: '220px' }}
          >
            {sidebar}
          </motion.div>
        )}
        
        {/* 主内容区域 */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <main className="flex-1 p-4 overflow-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 平板端布局
  if (isTablet) {
    return (
      <div className={`min-h-screen bg-gray-50 flex ${className}`}>
        {/* 简化活动栏 */}
        <div className="w-16 bg-gray-100/80 backdrop-blur-xl border-r border-gray-200 flex-shrink-0">
          <div className="p-2 space-y-2">
            {['active', 'completed', 'drawings', 'materials', 'attendance'].map((view) => (
              <button
                key={view}
                onClick={() => onViewChange(view as any)}
                className={`
                  w-12 h-12 rounded-lg flex items-center justify-center text-xs font-medium
                  ${activeView === view 
                    ? 'bg-ios18-blue text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {view === 'active' ? '活跃' : 
                 view === 'completed' ? '过往' :
                 view === 'drawings' ? '图纸' : 
                 view === 'materials' ? '板材' :
                 view === 'attendance' ? '考勤' : '其他'}
              </button>
            ))}
          </div>
        </div>

        {/* 侧边栏 */}
        {sidebar && (
          <div className="bg-white/80 backdrop-blur-xl border-r border-gray-200 flex-shrink-0" style={{ width: '180px' }}>
            {sidebar}
          </div>
        )}
        
        {/* 主内容区域 */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // 移动端布局
  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${className}`}>
      {/* 移动端顶部栏 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <IconButton
            icon={Bars3Icon}
            onClick={() => setShowMobileSidebar(true)}
            size="md"
            variant="ghost"
            tooltip="打开菜单"
          />
          <h1 className="text-lg font-bold">激光切割管理</h1>
          
          {/* 用户头像和菜单 */}
          <div className="relative">
            {/* 自定义用户头像按钮 */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`
                w-10 h-10 rounded-lg bg-white/50 flex items-center justify-center group relative transition-all duration-200
                ${showUserMenu ? 'bg-ios18-blue/10 border border-ios18-blue/20' : 'hover:bg-gray-100'}
              `}
            >
              <div className="w-7 h-7 rounded-full bg-ios18-blue flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            </button>
            
            {/* 用户菜单下拉 - 使用Portal渲染到body */}
            {showUserMenu && typeof window !== 'undefined' && createPortal(
              <>
                {/* 遮罩层 */}
                <div 
                  className="fixed inset-0 z-50"
                  onClick={() => setShowUserMenu(false)}
                />
                {/* 菜单内容 */}
                <div 
                  className="fixed right-4 top-16 w-48 bg-white rounded-lg shadow-2xl border border-gray-200 z-50"
                  style={{ 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
                  }}
                >
                  {/* 用户信息头部 */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-ios18-blue flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {user?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate text-sm">
                          {user?.name || '用户'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user?.role === 'admin' ? '管理员' : '操作员'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        // 点击系统设置按钮
                        setShowUserMenu(false);
                        setTimeout(() => {
                          onSystemSettingsClick?.();
                        }, 150);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                      <span>系统设置</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // 点击退出登录按钮，执行logout
                        setShowUserMenu(false);
                        setTimeout(() => {
                          logout?.();
                        }, 150);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center space-x-2 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 - 为底部导航栏留出空间 */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="h-full">
          {children}
        </div>
      </main>

      {/* 底部导航 - 固定定位 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 p-2 z-40">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {[
            { key: 'active', label: '活跃', icon: ClipboardDocumentListIcon },
            { key: 'completed', label: '过往', icon: CheckCircleIcon },
            { key: 'search', label: '搜索', icon: MagnifyingGlassIcon, isSearch: true },
            { key: 'drawings', label: '图纸', icon: DocumentIcon },
            { key: 'materials', label: '板材', icon: ClipboardDocumentListIcon },
            { key: 'attendance', label: '考勤', icon: CalendarDaysIcon }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                if (item.isSearch) {
                  onSearchClick?.();
                } else {
                  onViewChange(item.key as any);
                }
              }}
              className={`
                flex flex-col items-center p-2 rounded-lg min-h-[44px] min-w-[44px] transition-all
                ${(activeView === item.key && !item.isSearch)
                  ? 'bg-ios18-blue text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 移动端侧边栏抽屉 */}
      <MobileDrawer
        isOpen={showMobileSidebar}
        onClose={() => setShowMobileSidebar(false)}
        
        position="left"
      >
        {sidebar && React.cloneElement(sidebar as React.ReactElement, {
          onMobileItemClick: () => {
            setShowMobileSidebar(false);
            onMobileSidebarAutoClose?.();
          },
          inMobileDrawer: true
        })}
      </MobileDrawer>

      {/* Toast容器 - 确保Toast能正常显示 */}
      <ToastContainer />
    </div>
  );
};
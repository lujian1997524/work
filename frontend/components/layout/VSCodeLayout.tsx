'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ActivityBar } from './ActivityBar';
import { useResponsive } from '@/hooks/useResponsive';
import { MobileDrawer, BottomSheet } from '@/components/ui/ResponsiveLayout';
import { 
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  DocumentIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface VSCodeLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  activeView: 'active' | 'completed' | 'drawings' | 'workers' | 'dashboard' | 'settings';
  onViewChange: (view: 'active' | 'completed' | 'drawings' | 'workers' | 'dashboard' | 'settings') => void;
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
            {['active', 'completed', 'drawings', 'workers'].map((view) => (
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
                 view === 'drawings' ? '图纸' : '工人'}
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
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">激光切割管理</h1>
          
          {/* 用户头像和菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <UserCircleIcon className="w-6 h-6" />
            </button>
            
            {/* 用户菜单下拉 */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onSystemSettingsClick?.();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>系统设置</span>
                  </button>
                  <button
                    onClick={() => {
                      onProfileClick?.();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>退出登录</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 - 为底部导航栏留出空间 */}
      <main className="flex-1 p-4 overflow-auto pb-20">
        {children}
      </main>

      {/* 底部导航 - 固定定位 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 p-2 z-40">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {[
            { key: 'active', label: '活跃', icon: ClipboardDocumentListIcon },
            { key: 'completed', label: '过往', icon: CheckCircleIcon },
            { key: 'search', label: '搜索', icon: MagnifyingGlassIcon, isSearch: true },
            { key: 'drawings', label: '图纸', icon: DocumentIcon },
            { key: 'workers', label: '工人', icon: UsersIcon }
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
        title="功能菜单"
        position="left"
      >
        {sidebar && React.cloneElement(sidebar as React.ReactElement, {
          onMobileItemClick: () => {
            setShowMobileSidebar(false);
            onMobileSidebarAutoClose?.();
          }
        })}
      </MobileDrawer>
      
      {/* 用户菜单遮罩 */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};
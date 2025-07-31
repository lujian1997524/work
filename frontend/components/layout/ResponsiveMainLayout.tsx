'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';
import { MobileDrawer, BottomSheet, ResponsiveContainer } from '@/components/ui/ResponsiveLayout';

interface ResponsiveMainLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header: React.ReactNode;
  bottomNavigation?: React.ReactNode;
  className?: string;
}

export const ResponsiveMainLayout: React.FC<ResponsiveMainLayoutProps> = ({
  children,
  sidebar,
  header,
  bottomNavigation,
  className = ''
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  // 桌面端布局
  if (isDesktop) {
    return (
      <div className={`h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col ${className}`}>
        {header}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧边栏 */}
          <div className="w-72 xl:w-80 flex-shrink-0 h-full">
            {sidebar}
          </div>
          {/* 主内容区 */}
          <div className="flex-1 p-6 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // 平板端布局
  if (isTablet) {
    return (
      <div className={`h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col ${className}`}>
        {header}
        <div className="flex flex-1 overflow-hidden">
          {/* 侧边栏抽屉 */}
          <MobileDrawer
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            title="项目列表"
            position="left"
          >
            {sidebar}
          </MobileDrawer>
          
          {/* 主内容区 */}
          <div className="flex-1 p-4 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // 移动端布局
  return (
    <ResponsiveContainer
      className={`h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col ${className}`}
      mobileClassName="pb-16" // 为底部导航留出空间
    >
      {/* 移动端头部 - 更紧凑 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-10 flex-shrink-0">
        {header}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* 侧边栏抽屉 */}
      <MobileDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        title="项目列表"
        position="left"
      >
        {sidebar}
      </MobileDrawer>

      {/* 底部表单/操作面板 */}
      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        title="快速操作"
        height="half"
      >
        {bottomNavigation}
      </BottomSheet>

      {/* 移动端底部导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 px-4 py-2 flex justify-around items-center z-20">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px]"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-xs text-gray-600">项目</span>
        </button>

        <button
          onClick={() => setIsBottomSheetOpen(true)}
          className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px]"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-xs text-gray-600">操作</span>
        </button>

        <button className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px]">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs text-gray-600">统计</span>
        </button>

        <button className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px]">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs text-gray-600">用户</span>
        </button>
      </div>
    </ResponsiveContainer>
  );
};
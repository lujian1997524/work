'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Header } from './Header'
import { Sidebar, SidebarItem } from './Sidebar'
import { NotificationContainer, SSEConnectionIndicator } from '@/components/ui/NotificationContainer'
import { AudioSettingsButton } from '@/components/ui/AudioSettingsButton'
import { Button } from '@/components/ui'
import { useNotificationStore } from '@/stores/notificationStore'
import { useProjectStore } from '@/stores'
import { sseManager } from '@/utils/sseManager'
import { useAuth } from '@/contexts/AuthContext'

export interface MainLayoutProps {
  children: React.ReactNode
  headerTitle?: string
  headerSubtitle?: string
  headerActions?: React.ReactNode
  sidebarItems?: SidebarItem[]
  showSidebar?: boolean
  className?: string
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  headerTitle,
  headerSubtitle,
  headerActions,
  sidebarItems = [],
  showSidebar = true,
  className = ''
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true) // 默认在移动端折叠
  const { connectSSE, disconnectSSE } = useNotificationStore()
  const { fetchProjects } = useProjectStore()
  const { token, isAuthenticated } = useAuth()

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // SSE连接管理
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('🔌 初始化SSE连接...')
      
      // 建立SSE连接
      connectSSE(token).then((success) => {
        if (success) {
          console.log('✅ SSE连接建立成功')
        } else {
          console.error('❌ SSE连接建立失败')
        }
      })

      // 添加项目相关的SSE事件监听器
      const handleProjectCreated = (data: any) => {
        console.log('📋 收到项目创建事件:', data)
        // 刷新项目列表
        fetchProjects()
      }

      const handleProjectUpdated = (data: any) => {
        console.log('🔄 收到项目更新事件:', data)
        // 刷新项目列表
        fetchProjects()
      }

      const handleProjectDeleted = (data: any) => {
        console.log('🗑️ 收到项目删除事件:', data)
        // 刷新项目列表
        fetchProjects()
      }

      const handleProjectStatusChanged = (data: any) => {
        console.log('📊 收到项目状态变更事件:', data)
        // 刷新项目列表
        fetchProjects()
      }

      // 注册事件监听器
      sseManager.addEventListener('project-created', handleProjectCreated)
      sseManager.addEventListener('project-updated', handleProjectUpdated)
      sseManager.addEventListener('project-deleted', handleProjectDeleted)
      sseManager.addEventListener('project-status-changed', handleProjectStatusChanged)

      // 清理函数
      return () => {
        console.log('🔌 清理SSE连接...')
        sseManager.removeEventListener('project-created', handleProjectCreated)
        sseManager.removeEventListener('project-updated', handleProjectUpdated)
        sseManager.removeEventListener('project-deleted', handleProjectDeleted)
        sseManager.removeEventListener('project-status-changed', handleProjectStatusChanged)
        disconnectSSE()
      }
    }
  }, [isAuthenticated, token, connectSSE, disconnectSSE, fetchProjects])

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 ${className}`}>
      <div className="flex min-h-screen">
        {/* 侧边栏 - 固定不滚动 */}
        {showSidebar && sidebarItems.length > 0 && (
          <motion.div
            className="flex-shrink-0 w-40 lg:w-44 xl:w-48 p-2 lg:p-4 hidden md:block fixed left-0 top-0 h-screen z-30 bg-white/80 backdrop-blur-xl border-r border-gray-200"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Sidebar
              items={sidebarItems}
              collapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              className="h-full pt-4"
            />
          </motion.div>
        )}

        {/* 主内容区域 - 为固定侧边栏留出空间 */}
        <motion.div
          className={`flex-1 flex flex-col min-h-screen overflow-hidden ${
            showSidebar && sidebarItems.length > 0 ? 'md:ml-40 lg:ml-44 xl:ml-48' : ''
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* 页面头部 - 紧凑优化 */}
          {(headerTitle || headerActions) && (
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
              <div className="p-2 lg:p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* 移动端菜单按钮 */}
                    {showSidebar && sidebarItems.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSidebar}
                        className="md:hidden bg-white/70 border border-gray-200/50 hover:bg-gray-50"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </Button>
                    )}
                    <div>
                      <Header
                        title={headerTitle}
                        subtitle={headerSubtitle}
                      />
                    </div>
                  </div>
                  <div>
                    {headerActions}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 页面内容 - 修复显示问题 */}
          <motion.main
            className="flex-1 p-2 lg:p-3 xl:p-4 pb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            style={{ minHeight: 0 }} // 确保可以收缩
          >
            <div className="w-full h-full">
              {children}
            </div>
          </motion.main>
        </motion.div>
      </div>

      {/* 移动端侧边栏覆盖层 */}
      {showSidebar && sidebarItems.length > 0 && (
        <motion.div
          className={`fixed inset-0 z-50 md:hidden ${
            sidebarCollapsed ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: sidebarCollapsed ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={toggleSidebar}
          />
          <motion.div
            className="absolute left-0 top-0 h-full w-40 bg-white shadow-2xl"
            initial={{ x: -160 }}
            animate={{ x: sidebarCollapsed ? -160 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-2 h-full">
              <Sidebar
                items={sidebarItems}
                collapsed={false}
                onToggleCollapse={toggleSidebar}
                className="h-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 通知容器 */}
      <NotificationContainer />
      
      {/* SSE连接状态指示器 */}
      <SSEConnectionIndicator />
      
      {/* 音频设置按钮 */}
      <AudioSettingsButton />
    </div>
  )
}
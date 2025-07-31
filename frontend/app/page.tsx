'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginModal from '@/components/auth/LoginModal';
import { ProjectTree } from '@/components/materials/ProjectTree';
import { PastProjectsTree } from '@/components/projects/PastProjectsTree';
import { MaterialsTable } from '@/components/materials/MaterialsTable';
import { MaterialsCardView } from '@/components/materials/MaterialsCardView';
import { PastProjectsCardView } from '@/components/projects/PastProjectsCardView';
import { WorkerManagement } from '@/components/workers/WorkerManagement';
import { WorkersSidebar } from '@/components/workers/WorkersSidebar';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { ProjectModal } from '@/components/materials/ProjectModal';
import { ThicknessSpecModal } from '@/components/materials/ThicknessSpecModal';
import { DrawingLibrary, DrawingsSidebar } from '@/components/drawings';
import { SearchModal } from '@/components/search/SearchModal';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { UserProfileModal } from '@/components/user/UserProfileModal';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore, useMaterialStore } from '@/stores';
import { NotificationContainer } from '@/components/ui/NotificationContainer';
import { useNotificationStore } from '@/stores/notificationStore';
import { Card, Button, useDialog } from '@/components/ui';
import { VSCodeLayout } from '@/components/layout/VSCodeLayout';
import { apiRequest } from '@/utils/api';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* 登录模态框 - 未登录时显示，强制模态 */}
      <LoginModal isOpen={!isAuthenticated} />
      
      {/* 主页面内容 - 始终渲染，未登录时显示模糊效果 */}
      <div className={!isAuthenticated ? 'filter blur-sm pointer-events-none' : ''}>
        <HomeContent />
      </div>
    </>
  );
}

function HomeContent() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [viewType, setViewType] = useState<'active' | 'completed' | 'drawings' | 'workers' | 'settings'>('active');
  const [workerNameFilter, setWorkerNameFilter] = useState('');
  const [thicknessFilter, setThicknessFilter] = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showThicknessSpecModal, setShowThicknessSpecModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [drawingCategory, setDrawingCategory] = useState('all');
  const [drawingStats, setDrawingStats] = useState<{[key: string]: number}>({});
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showDrawingUpload, setShowDrawingUpload] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  
  // 使用Dialog组件
  const { alert, confirm, DialogRenderer } = useDialog();
  
  // 认证信息
  const { token, isAuthenticated, user, logout } = useAuth();
  const { connectSSE, disconnectSSE } = useNotificationStore();
  
  // Zustand状态管理
  const { 
    createProject,
    updateProject,
    deleteProject,
    fetchProjects,
    setupSSEListeners
  } = useProjectStore();
  
  const { fetchMaterials } = useMaterialStore();

  // 获取图纸统计信息
  // 批量排序功能
  const handleBatchSort = async (reorderedItems: any[]) => {
    try {
      setIsSorting(true);
      const projectIds = reorderedItems.map(item => item.id);
      
      const response = await apiRequest('/api/projects/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ projectIds }),
      });

      if (!response.ok) {
        throw new Error('更新项目排序失败');
      }

      // 刷新项目数据
      await fetchProjects();
    } catch (error) {
      console.error('更新项目排序失败:', error);
      throw error;
    } finally {
      setIsSorting(false);
    }
  };

  // 获取图纸统计信息  
  const fetchDrawingStats = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/drawings?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const drawings = data.drawings || [];
        
        const stats: {[key: string]: number} = {
          'all': drawings.length,
          'project-drawings': drawings.filter((d: any) => !d.isCommonPart && d.projectIds?.length > 0).length,
          'common-parts': drawings.filter((d: any) => d.isCommonPart).length,
        };
        
        setDrawingStats(stats);
      }
    } catch (error) {
      console.error('获取图纸统计失败:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    console.log('🚀 初始化应用...');
    fetchProjects();
    fetchDrawingStats();
  }, []);

  // SSE连接管理
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('🔌 建立统一SSE连接...');
      connectSSE(token).then((success) => {
        if (success) {
          console.log('✅ SSE连接建立成功');
          setupSSEListeners();
        }
      });

      return () => {
        console.log('🔌 断开SSE连接...');
        disconnectSSE();
      };
    }
  }, [isAuthenticated, token]);

  // 处理视图切换
  const handleViewChange = (view: 'active' | 'completed' | 'drawings' | 'workers' | 'settings') => {
    console.log('🔄 切换视图:', view);
    
    // 特殊处理
    if (view === 'settings') {
      setShowThicknessSpecModal(true); // 板材厚度规格管理
    } else {
      setViewType(view);
      setSelectedProjectId(null);
    }
  };

  // 项目操作
  const handleCreateProject = async (projectData: any) => {
    const result = await createProject(projectData);
    if (result) {
      setShowProjectModal(false);
    } else {
      await alert('创建项目失败，请重试');
    }
  };

  const handleUpdateProject = async (projectData: any) => {
    if (!editingProject) return;
    const result = await updateProject(editingProject.id, projectData);
    if (result) {
      setShowProjectModal(false);
      setEditingProject(null);
    } else {
      await alert('更新项目失败，请重试');
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    const confirmed = await confirm('确定要删除这个项目吗？此操作不可撤销。');
    if (!confirmed) return;

    const success = await deleteProject(projectId);
    if (!success) {
      await alert('删除项目失败，请重试');
    }
  };

  const handleSelectProject = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const openEditModal = (project: any) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  // 静默刷新
  const silentRefresh = async (type: 'active' | 'completed') => {
    try {
      if (type === 'completed') {
        const { fetchPastProjects } = useProjectStore.getState();
        await fetchPastProjects();
      } else {
        await fetchProjects();
      }
    } catch (error) {
      console.error('静默刷新失败:', error);
    }
  };

  // 处理搜索结果导航
  const handleSearchNavigate = (result: any) => {
    switch (result.type) {
      case 'projects':
        // 跳转到对应项目视图
        setViewType(result.status === 'completed' ? 'completed' : 'active');
        setSelectedProjectId(result.id);
        break;
        
      case 'workers':
        // 跳转到工人管理，并筛选到对应部门
        setViewType('workers');
        setSelectedDepartment(result.department || 'all');
        break;
        
      case 'drawings':
        // 跳转到图纸库，并筛选到对应分类
        setViewType('drawings');
        setDrawingCategory(result.category || 'all');
        break;
        
      case 'departments':
        // 跳转到工人管理，选中该部门
        setViewType('workers');
        setSelectedDepartment(result.name);
        break;
    }
  };

  // 全局快捷键监听
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 或 Cmd+K 打开搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleSilentRefreshActive = () => silentRefresh('active');
  const handleSilentRefreshCompleted = () => silentRefresh('completed');

  // 处理用户个人信息点击
  const handleProfileClick = () => {
    setShowUserProfileModal(true);
  };

  // 处理系统设置点击
  const handleSystemSettingsClick = () => {
    setShowSettingsPage(true);
  };

  // 渲染侧边栏
  const renderSidebar = () => {
    switch (viewType) {
      case 'active':
        return (
          <ProjectTree
            selectedProjectId={selectedProjectId}
            onProjectSelect={handleSelectProject}
            onEditProject={openEditModal}
            onCreateProject={openCreateModal}
            onDeleteProject={handleDeleteProject}
            onMobileItemClick={() => {}} // 移动端点击项目时关闭侧边栏的占位
            onBatchSort={handleBatchSort}
            isSorting={isSorting}
            className="h-full"
          />
        );
      
      case 'completed':
        return (
          <PastProjectsTree
            selectedProjectId={selectedProjectId}
            onProjectSelect={handleSelectProject}
            onMobileItemClick={() => {}} // 移动端点击项目时关闭侧边栏的占位
            className="h-full"
          />
        );
      
      case 'drawings':
        return (
          <DrawingsSidebar
            selectedCategory={drawingCategory}
            onCategoryChange={setDrawingCategory}
            onRefresh={fetchDrawingStats}
            onUploadClick={() => setShowDrawingUpload(true)}
            onMobileItemClick={() => {}} // 移动端点击分类时关闭侧边栏的占位
            className="h-full"
          />
        );
      
      case 'workers':
        return (
          <WorkersSidebar
            selectedDepartment={selectedDepartment}
            onDepartmentChange={setSelectedDepartment}
            onMobileItemClick={() => {}} // 移动端点击部门时关闭侧边栏的占位
            onRefresh={() => {
              // 触发工人数据刷新事件
              window.dispatchEvent(new CustomEvent('refresh-workers'));
            }}
            className="h-full"
          />
        );
      
      default:
        // 默认显示活动项目侧边栏
        return (
          <ProjectTree
            selectedProjectId={selectedProjectId}
            onProjectSelect={handleSelectProject}
            onEditProject={openEditModal}
            onCreateProject={openCreateModal}
            className="h-full"
          />
        );
    }
  };

  return (
    <VSCodeLayout
      activeView={viewType}
      onViewChange={handleViewChange}
      onSearchClick={() => setShowSearchModal(true)}
      onSystemSettingsClick={handleSystemSettingsClick}
      onProfileClick={handleProfileClick}
      onMobileSidebarAutoClose={() => {
        // 移动端侧边栏自动关闭时的回调，可以在这里添加额外逻辑
        console.log('移动端侧边栏已自动关闭');
      }}
      sidebar={renderSidebar()}
    >
      {/* 主内容区域 */}
      <AnimatePresence mode="wait">
        {viewType === 'workers' ? (
          <motion.div
            key="worker-management"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <WorkerManagement 
              className="h-full" 
              selectedDepartment={selectedDepartment}
              onDepartmentChange={setSelectedDepartment}
            />
          </motion.div>
        ) : selectedProjectId && (viewType === 'active' || viewType === 'completed') ? (
          <motion.div
            key={`project-detail-${selectedProjectId}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ProjectDetail
              projectId={selectedProjectId}
              onBack={() => handleSelectProject(null)}
              className="h-full"
            />
          </motion.div>
        ) : viewType === 'drawings' ? (
          <motion.div
            key="drawing-library"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <DrawingLibrary
              className="h-full"
              selectedCategory={drawingCategory}
              onCategoryChange={setDrawingCategory}
              showUploadModal={showDrawingUpload}
              onUploadModalChange={setShowDrawingUpload}
            />
          </motion.div>
        ) : viewType === 'completed' ? (
          <motion.div
            key="past-projects-card-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <PastProjectsCardView
              selectedProjectId={selectedProjectId}
              onProjectSelect={handleSelectProject}
              className="h-full overflow-y-auto"
            />
          </motion.div>
        ) : viewType === 'active' ? (
          <motion.div
            key="active-projects-card-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <MaterialsCardView
              selectedProjectId={selectedProjectId}
              onProjectSelect={handleSelectProject}
              viewType="active"
              workerNameFilter={workerNameFilter}
              thicknessFilter={thicknessFilter}
              className="h-full overflow-y-auto"
            />
          </motion.div>
        ) : (
          <motion.div
            key={`fallback-view-${viewType}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-lg">页面加载中...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 模态框 */}
      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setEditingProject(null);
        }}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        project={editingProject}
        loading={false}
      />

      <ThicknessSpecModal
        isOpen={showThicknessSpecModal}
        onClose={() => setShowThicknessSpecModal(false)}
        onUpdate={() => {}}
      />

      
      {/* 搜索模态框 */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onNavigate={handleSearchNavigate}
      />

      {/* 设置页面 */}
      <SettingsPage
        isOpen={showSettingsPage}
        onClose={() => setShowSettingsPage(false)}
      />

      {/* 用户个人信息模态框 */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
      />

      {/* 通知容器 */}
      <NotificationContainer />

      {/* Dialog渲染器 */}
      <DialogRenderer />
    </VSCodeLayout>
  );
}
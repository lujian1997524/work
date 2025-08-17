'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginModal from '@/components/auth/LoginModal';
import { ProjectTree } from '@/components/materials/ProjectTree';
import { PastProjectsTree } from '@/components/projects/PastProjectsTree';
import { PastProjectsCardView } from '@/components/projects/PastProjectsCardView';
import { ActiveProjectsCardView } from '@/components/projects/ActiveProjectsCardView';
import { MaterialInventoryManagerNew as MaterialInventoryManager } from '@/components/materials/MaterialInventoryManagerNew';
import { MaterialsSidebar } from '@/components/materials/MaterialsSidebar';
import { ProjectDetailModern } from '@/components/projects/ProjectDetailModern';
import { ProjectWizardModal } from '@/components/materials/ProjectWizardModal';
import { DrawingLibrary, DrawingsSidebar } from '@/components/drawings';
import { SearchModal } from '@/components/search/SearchModal';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { UserProfileModal } from '@/components/user/UserProfileModal';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore, useMaterialStore, useGlobalSyncStore } from '@/stores';
import { updateMaterialStatusShared } from '@/utils/materialStatusManager';
import { NotificationContainer } from '@/components/ui';
import { useNotificationStore } from '@/stores/notificationStore';
import { Card, Button, useDialog } from '@/components/ui';
import { VSCodeLayout } from '@/components/layout/VSCodeLayout';
import { AttendanceManagement } from '@/components/attendance/AttendanceManagement';
import { apiRequest } from '@/utils/api';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  
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
  const [viewType, setViewType] = useState<'active' | 'completed' | 'drawings' | 'materials' | 'workers' | 'public-inventory' | 'settings' | 'attendance'>('active');
  const [workerNameFilter, setWorkerNameFilter] = useState('');
  const [thicknessFilter, setThicknessFilter] = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [drawingCategory, setDrawingCategory] = useState('all');
  const [drawingStats, setDrawingStats] = useState<{[key: string]: number}>({});
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showDrawingUpload, setShowDrawingUpload] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('all');
  const [workerIdFilter, setWorkerIdFilter] = useState<number | null>(null);
  const [materialThicknessFilter, setMaterialThicknessFilter] = useState<string>('all'); // 新增：厚度筛选
  const [materialInventoryTab, setMaterialInventoryTab] = useState<'inventory' | 'workers'>('inventory'); // 新增：板材库存Tab状态
  const [thicknessSpecs, setThicknessSpecs] = useState<any[]>([]); // 厚度规格数据
  
  // 使用Dialog组件
  const { alert, confirm, DialogRenderer } = useDialog();
  
  // 认证信息
  const { token, isAuthenticated, user, logout } = useAuth();
  const { connectSSE, disconnectSSE } = useNotificationStore();
  
  // Zustand状态管理
  const { 
    projects,
    createProject,
    updateProject,
    deleteProject,
    fetchProjects,
    setupSSEListeners
  } = useProjectStore();
  
  const { fetchMaterials } = useMaterialStore();
  
  // 全局同步管理
  const { startEventListeners, stopEventListeners } = useGlobalSyncStore();

  // 获取厚度规格数据
  const fetchThicknessSpecs = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/thickness-specs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setThicknessSpecs(data.thicknessSpecs || []);
      }
    } catch (error) {
      // 忽略获取厚度规格失败
    }
  };

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
      // 忽略更新项目排序失败
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
      // 忽略获取图纸统计失败
    }
  };

  // 初始加载 - 依赖认证状态
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchProjects();
      fetchThicknessSpecs();
      fetchDrawingStats();
    }
    
    // 启动全局事件监听器
    startEventListeners();
    
    return () => {
      // 清理事件监听器
      stopEventListeners();
    };
  }, [isAuthenticated, token]); // 添加认证状态依赖

  // SSE连接管理
  useEffect(() => {
    if (isAuthenticated && token) {
      connectSSE(token).then((success) => {
        if (success) {
          setupSSEListeners();
        }
      });

      return () => {
        disconnectSSE();
      };
    }
  }, [isAuthenticated, token]);

  // 处理视图切换
  const handleViewChange = (view: 'active' | 'completed' | 'drawings' | 'workers' | 'materials' | 'public-inventory' | 'settings' | 'attendance') => {
    // 特殊处理
    if (view === 'settings') {
      setShowSettingsPage(true); // 系统设置页面
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
      return result; // 返回创建的项目数据，包含项目ID
    } else {
      await alert('创建项目失败，请重试');
      return null;
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
    if (success) {
      // 删除成功后刷新过往项目列表
      if (viewType === 'completed') {
        const { fetchPastProjects } = useProjectStore.getState();
        await fetchPastProjects();
      }
      // 触发全局刷新事件
      window.dispatchEvent(new CustomEvent('projects-updated'));
    } else {
      await alert('删除项目失败，请重试');
    }
  };

  // 恢复过往项目到活跃状态
  const handleRestoreProject = async (projectId: number) => {
    const confirmed = await confirm('确定要将此项目恢复到活跃状态吗？');
    if (!confirmed) return;

    try {
      if (!token) {
        await alert('请先登录');
        return;
      }

      const response = await apiRequest(`/api/projects/${projectId}/restore-from-past`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // 刷新过往项目和活跃项目数据
        await useProjectStore.getState().fetchPastProjects();
        await useProjectStore.getState().fetchProjects();
        
        // 触发全局刷新事件
        window.dispatchEvent(new CustomEvent('projects-updated'));
        
        await alert('项目已成功恢复到活跃状态！');
      } else {
        const errorData = await response.json();
        await alert(`恢复项目失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      
      await alert(`恢复项目失败: ${error instanceof Error ? error.message : '网络错误'}`);
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
    // 如果传入的是projectId（数字），则根据ID查找项目
    if (typeof project === 'number') {
      const foundProject = projects.find(p => p.id === project);
      if (foundProject) {
        setEditingProject(foundProject);
      } else {
        // 如果在当前列表中没找到，可能是过往项目
        
        return;
      }
    } else {
      // 如果传入的是完整的项目对象
      setEditingProject(project);
    }
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
      // 忽略静默刷新失败
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
        // 跳转到板材库存页面，并筛选到对应工人
        setViewType('materials');
        setMaterialInventoryTab('workers'); // 切换到工人Tab
        setWorkerIdFilter(result.id); // 按工人ID筛选
        // 清除其他筛选条件，专注于该工人
        setWorkerNameFilter(result.name);
        setMaterialTypeFilter('all');
        setMaterialThicknessFilter('all');
        break;
        
      case 'departments':
        // 跳转到板材库存页面，并筛选到对应部门的工人
        setViewType('materials');
        setMaterialInventoryTab('workers');
        setSelectedDepartment(result.name);
        // 清除其他筛选
        setWorkerIdFilter(null);
        setWorkerNameFilter('');
        break;
        
      case 'drawings':
        // 跳转到图纸库，并筛选到对应分类
        setViewType('drawings');
        setDrawingCategory(result.category || 'all');
        break;
        
      case 'materials':
        // 跳转到板材库存页面，筛选到对应工人和厚度
        setViewType('materials');
        setMaterialInventoryTab('inventory'); // 切换到库存Tab
        if (result.worker?.id) {
          setWorkerIdFilter(result.worker.id);
          setWorkerNameFilter(result.worker.name || '');
        }
        // 根据厚度规格进行筛选
        if (result.thicknessSpec) {
          const thicknessValue = `${result.thicknessSpec.thickness}${result.thicknessSpec.unit}`;
          setMaterialThicknessFilter(thicknessValue);
          setMaterialTypeFilter(result.thicknessSpec.materialType || 'all');
        }
        break;
        
      case 'thicknessSpecs':
        // 跳转到板材库存页面，按厚度规格筛选
        setViewType('materials');
        setMaterialInventoryTab('inventory');
        // 设置厚度筛选
        const specThickness = `${result.thickness}${result.unit || 'mm'}`;
        setMaterialThicknessFilter(specThickness);
        setMaterialTypeFilter(result.materialType || 'all');
        // 清除工人筛选，显示所有工人的该厚度库存
        setWorkerIdFilter(null);
        setWorkerNameFilter('');
        break;
        
      case 'employees':
        // 跳转到考勤管理页面
        setViewType('attendance');
        // 可以在这里设置员工筛选，如果考勤组件支持的话
        break;
        
      case 'attendanceExceptions':
        // 跳转到考勤管理页面
        setViewType('attendance');
        // 可以在这里设置特定的考勤记录筛选
        break;
        
      default:
        // 忽略未处理的搜索结果类型
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

    // 监听工人筛选事件
    const handleSetWorkerFilter = (event: CustomEvent) => {
      setWorkerIdFilter(event.detail.workerId);
      // 切换到materials视图
      setViewType('materials');
      // 设置板材库存Tab为激活状态
      setMaterialInventoryTab('inventory');
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('set-worker-filter', handleSetWorkerFilter as EventListener);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('set-worker-filter', handleSetWorkerFilter as EventListener);
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
      
      case 'materials':
        return (
          <MaterialsSidebar
            activeTab={materialInventoryTab}
            onTabChange={setMaterialInventoryTab}
            onMaterialTypeFilter={setMaterialTypeFilter}
            onWorkerFilter={setWorkerIdFilter}
            onThicknessFilter={setMaterialThicknessFilter}
            onRefresh={() => {
              // 触发材料数据刷新事件
              window.dispatchEvent(new CustomEvent('refresh-materials'));
            }}
            className="h-full"
          />
        );
      
      case 'public-inventory':
        // 公共库存不需要特殊侧边栏，显示基础项目树
        return null;

      case 'attendance':
        // 考勤管理不需要侧边栏
        return null;
      
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
      }}
      sidebar={renderSidebar()}
    >
      {/* 主内容区域 */}
      <AnimatePresence mode="wait">
        {viewType === 'attendance' ? (
          <motion.div
            key="attendance-management"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <AttendanceManagement className="h-full" />
          </motion.div>
        ) : viewType === 'materials' ? (
          <motion.div
            key="material-inventory"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <MaterialInventoryManager 
              className="h-full" 
              materialTypeFilter={materialTypeFilter}
              workerIdFilter={workerIdFilter}
              thicknessFilter={materialThicknessFilter}
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
            <ProjectDetailModern
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
              onRestore={handleRestoreProject}
              onDelete={handleDeleteProject}
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
            <ActiveProjectsCardView
              selectedProjectId={selectedProjectId}
              onProjectSelect={handleSelectProject}
              onProjectEdit={openEditModal}
              onMaterialStatusChange={async (materialId: number, newStatus: any) => {
                // 找到材料对应的项目和厚度规格
                let targetProjectId: number | null = null;
                let targetThicknessSpecId: number | null = null;
                
                // 遍历项目查找对应的材料
                for (const project of projects) {
                  const material = project.materials?.find(m => m.id === materialId);
                  if (material) {
                    targetProjectId = project.id;
                    targetThicknessSpecId = material.thicknessSpecId;
                    break;
                  }
                }
                
                if (targetProjectId && targetThicknessSpecId) {
                  // 使用共享的材料状态管理逻辑
                  const success = await updateMaterialStatusShared(targetProjectId, targetThicknessSpecId, newStatus, {
                    projects: projects as any[],
                    thicknessSpecs: thicknessSpecs,
                    user,
                    updateProjectFn: updateProject as any,
                    fetchProjectsFn: fetchProjects
                  });
                  
                  if (!success) {
                    // 材料状态更新失败
                  }
                } else {
                  // 无法找到材料对应的项目信息
                }
              }}
              onJumpToMaterials={(projectId: number, workerId?: number) => {
                // 跳转到板材管理，并筛选对应的工人
                
                // 切换到材料管理视图
                setViewType('materials');
                
                // 设置工人筛选（如果有分配工人）
                if (workerId) {
                  setWorkerIdFilter(workerId);
                } else {
                  setWorkerIdFilter(null);
                }
                
                // 设置材料库存Tab为激活状态
                setMaterialInventoryTab('inventory');
                
                // 清空项目选择，显示材料管理界面
                setSelectedProjectId(null);
              }}
              onProjectMoveToPast={() => {
                // 项目移至过往后刷新数据
                fetchProjects();
              }}
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
      <ProjectWizardModal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setEditingProject(null);
        }}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        project={editingProject}
        loading={false}
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
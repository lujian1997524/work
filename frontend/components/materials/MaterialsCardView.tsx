'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useMaterialStore, useProjectStore, type ProjectState } from '@/stores';
import { Loading, Empty, EmptyData, useDialog } from '@/components/ui';
import type { StatusType } from '@/components/ui';
import { ActiveProjectCard } from '@/components/projects/ProjectCard';
import { apiRequest } from '@/utils/api';
import { 
  updateMaterialStatusShared, 
  getProjectMaterialStatus 
} from '@/utils/materialStatusManager';

interface MaterialsCardViewProps {
  selectedProjectId: number | null;
  onProjectSelect: (id: number | null) => void;
  viewType?: 'active' | 'completed';
  workerNameFilter?: string;
  thicknessFilter?: string;
  className?: string;
}

export const MaterialsCardView: React.FC<MaterialsCardViewProps> = ({ 
  selectedProjectId, 
  onProjectSelect, 
  viewType = 'active',
  workerNameFilter = '',
  thicknessFilter = '',
  className = '' 
}) => {
  const [loading, setLoading] = useState(false);
  const [thicknessSpecs, setThicknessSpecs] = useState<any[]>([]);
  const [movingToPast, setMovingToPast] = useState<number | null>(null);
  
  const { token, user } = useAuth();
  const { updateMaterialStatus } = useMaterialStore();
  const { projects, loading: projectsLoading, fetchProjects, updateProject, moveToPastProject } = useProjectStore();
  
  // Dialog组件
  const { confirm, DialogRenderer } = useDialog();


  // 根据筛选条件过滤项目
  const getFilteredProjects = (): ProjectState[] => {
    let projectList = projects;
    
    // 应用工人姓名筛选
    if (workerNameFilter) {
      projectList = projectList.filter(project => 
        project.assignedWorker?.name === workerNameFilter
      );
    }
    
    // 应用板材厚度筛选
    if (thicknessFilter) {
      projectList = projectList.filter(project => {
        return project.materials?.some(material => 
          material.thicknessSpec?.thickness === thicknessFilter
        ) || false;
      });
    }
    
    return projectList;
  };

  const filteredProjects = getFilteredProjects();


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
      console.error('获取厚度规格失败:', error);
    }
  };

  useEffect(() => {
    fetchThicknessSpecs();
  }, [token]);

  // 处理编辑项目
  const handleEditProject = (projectId: number) => {
    onProjectSelect(projectId);
  };

  // 处理移至过往
  const handleMoveToPast = async (projectId: number) => {
    const confirmed = await confirm('确定要将此项目移动到过往项目吗？此操作将把项目从活跃状态移动到过往项目管理中。');
    if (!confirmed) {
      return;
    }
    
    setMovingToPast(projectId);
    try {
      const success = await moveToPastProject(projectId);
      if (success) {
        // 移动成功，刷新项目列表
        await fetchProjects();
      }
    } catch (error) {
      console.error('移动项目到过往失败:', error);
    } finally {
      setMovingToPast(null);
    }
  };

  // 处理材料状态变更 - 乐观更新版本
  const handleMaterialStatusChange = async (materialId: number, newStatus: StatusType) => {
    if (!token || !user) return;

    // 找到对应的材料和项目
    let targetProject: ProjectState | null = null;
    let targetMaterial: any = null;
    let targetThicknessSpecId: number | null = null;
    
    for (const project of filteredProjects) {
      const material = project.materials?.find(m => m.id === materialId);
      if (material) {
        targetProject = project;
        targetMaterial = material;
        targetThicknessSpecId = material.thicknessSpecId;
        break;
      }
    }
    
    if (!targetProject || !targetMaterial || !targetThicknessSpecId) {
      console.error('无法找到材料对应的项目或材料信息');
      return;
    }

    // 保存原始状态，用于错误回滚
    const originalStatus = targetMaterial.status;
    const originalStartDate = targetMaterial.startDate;
    const originalCompletedDate = targetMaterial.completedDate;
    const originalCompletedBy = targetMaterial.completedBy;

    try {
      // 1. 乐观更新：立即更新UI状态（通过Zustand store）
      const { optimisticUpdateMaterialStatus, setOptimisticUpdating } = useProjectStore.getState();
      
      // 设置乐观更新标记
      setOptimisticUpdating(true);
      
      optimisticUpdateMaterialStatus(targetProject.id, materialId, newStatus, user);

      // 2. 后台同步：调用API更新服务器数据
      const success = await updateMaterialStatusShared(targetProject.id, targetThicknessSpecId, newStatus, {
        projects: filteredProjects as any[],
        thicknessSpecs: thicknessSpecs,
        user,
        updateProjectFn: updateProject,
        fetchProjectsFn: async () => {
          // 静默刷新，不显示loading状态
          console.log('🔄 MaterialsCardView静默同步项目数据...');
          await fetchProjects();
          // 清除乐观更新标记
          setOptimisticUpdating(false);
        },
        // 不设置loading状态，避免UI刷新感
      });
      
      if (!success) {
        throw new Error('服务器更新失败');
      }

      // 3. 成功后不再手动刷新，让事件系统处理
      // 清除乐观更新标记，让其他地方的事件监听器接管
      setTimeout(() => {
        setOptimisticUpdating(false);
        console.log('✅ 乐观更新完成，移交给事件系统');
      }, 1500);
      
    } catch (error) {
      console.error('更新材料状态失败:', error);
      
      // 4. 错误回滚：恢复原始状态（通过Zustand store）
      const { optimisticUpdateMaterialStatus, setOptimisticUpdating } = useProjectStore.getState();
      
      // 清除乐观更新标记
      setOptimisticUpdating(false);
      
      optimisticUpdateMaterialStatus(targetProject.id, materialId, originalStatus, 
        originalCompletedBy ? { id: originalCompletedBy, name: '未知用户' } : undefined);
      
      // 显示错误提示
      alert('更新失败，已恢复到之前的状态。请稍后重试。');
    }
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  if (filteredProjects.length === 0) {
    return (
      <EmptyData 
        title="暂无项目数据"
        description={
          workerNameFilter || thicknessFilter 
            ? "当前筛选条件下没有找到匹配的项目"
            : "还没有创建任何项目，点击上方按钮开始创建"
        }
        className="py-12"
      />
    );
  }

  return (
    <div className={`h-full flex flex-col p-4 ${className}`}>
      {/* 项目统计信息 */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{filteredProjects.length}</div>
            <div className="text-sm text-gray-500">项目总数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {filteredProjects.filter(p => p.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-500">进行中</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {filteredProjects.filter(p => p.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">已完成</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {filteredProjects.reduce((total, p) => total + (p.materials?.length || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">板材总数</div>
          </div>
        </div>
      </div>

      {/* 项目卡片网格 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
          {filteredProjects.map((project) => (
            <ActiveProjectCard
              key={project.id}
              project={{
                id: project.id,
                name: project.name,
                status: project.status,
                priority: project.priority,
                assignedWorker: project.assignedWorker,
                materials: project.materials || [],
                drawings: project.drawings || [],
                createdAt: project.createdAt,
                description: (project as any).description
              }}
              onEdit={handleEditProject}
              onMaterialStatusChange={handleMaterialStatusChange}
              onMoveToPast={handleMoveToPast}
              movingToPast={movingToPast === project.id}
            />
          ))}
        </div>
      </div>

      {/* 加载状态覆盖层 */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <Loading size="lg" />
            <div className="mt-2 text-center text-gray-600">更新中...</div>
          </div>
        </motion.div>
      )}
      {/* Dialog渲染器 */}
      <DialogRenderer />
    </div>
  );
};
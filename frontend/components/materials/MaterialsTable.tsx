'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableProjectRow } from './SortableProjectRow';
import { useAuth } from '@/contexts/AuthContext';
import { useMaterialStore, useProjectStore, type ProjectState } from '@/stores';
import { StatusToggle, DrawingHoverCard, Table, TableHeader, TableBody, TableRow, TableCell, TableContainer, Empty, EmptyData, useDialog } from '@/components/ui';
import type { StatusType } from '@/components/ui';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import cadFileHandler from '@/utils/cadFileHandler';
import { apiRequest } from '@/utils/api';
import { 
  updateMaterialStatusShared, 
  getProjectMaterialStatus 
} from '@/utils/materialStatusManager';
import { ResponsiveMaterialsTable } from './ResponsiveMaterialsTable';
import { useResponsive } from '@/hooks/useResponsive';

interface ThicknessSpec {
  id: number;
  thickness: string;
  unit: string;
  materialType: string;
  isActive: boolean;
  sortOrder: number;
}

interface Material {
  id: number;
  projectId: number;
  thicknessSpecId: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedBy?: { id: number; name: string };
  startDate?: string;
  completedDate?: string;
  notes?: string;
  thicknessSpec: ThicknessSpec;
}

interface Drawing {
  id: number;
  projectId: number;
  filename: string;
  originalFilename?: string;
  filePath: string;
  version: string;
  createdAt: string;
}

interface MaterialsTableProps {
  selectedProjectId: number | null;
  onProjectSelect: (id: number | null) => void;
  viewType?: 'active' | 'completed';
  workerNameFilter?: string;
  thicknessFilter?: string;
  className?: string;
}

export const MaterialsTable = ({ 
  selectedProjectId, 
  onProjectSelect, 
  viewType = 'active',
  workerNameFilter = '',
  thicknessFilter = '',
  className = '' 
}: MaterialsTableProps) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [thicknessSpecs, setThicknessSpecs] = useState<ThicknessSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNotes, setEditingNotes] = useState<{projectId: number, thicknessSpecId: number} | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [movingToPast, setMovingToPast] = useState<number | null>(null);
  const [restoringFromPast, setRestoringFromPast] = useState<number | null>(null);
  
  // 拖拽排序相关状态
  const [projectOrder, setProjectOrder] = useState<ProjectState[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  
  // 添加hover预览相关状态
  const [hoverCard, setHoverCard] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
    drawings: Drawing[];
  }>({
    isVisible: false,
    position: { x: 0, y: 0 },
    drawings: []
  });
  
  const { token, user } = useAuth();
  const { updateMaterialStatus } = useMaterialStore();
  const { projects, completedProjects, pastProjects, updateProject, fetchProjects, moveToPastProject, restoreFromPastProject } = useProjectStore();
  
  // Dialog组件
  const { alert, confirm, DialogRenderer } = useDialog();

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 根据视图类型获取对应的项目列表，并应用筛选
  const getProjectsList = (): ProjectState[] => {
    let projectList: ProjectState[];
    
    switch (viewType) {
      case 'completed':
        projectList = pastProjects; // 使用过往项目数据
        break;
      default:
        projectList = projects;
        break;
    }
    
    // 应用工人姓名筛选
    if (workerNameFilter) {
      projectList = projectList.filter(project => 
        project.assignedWorker?.name === workerNameFilter
      );
    }
    
    // 应用板材厚度筛选 - 只要项目包含指定厚度的板材就显示
    if (thicknessFilter) {
      projectList = projectList.filter(project => {
        // 检查项目是否有指定厚度的材料
        return project.materials?.some(material => 
          material.thicknessSpec?.thickness === thicknessFilter
        ) || false;
      });
    }
    
    return projectList;
  };

  // 同步项目排序状态
  useEffect(() => {
    const projectsList = getProjectsList();
    if (JSON.stringify(projectOrder) !== JSON.stringify(projectsList)) {
      setProjectOrder(projectsList);
    }
  }, [projects, pastProjects, workerNameFilter, thicknessFilter, viewType]);

  // 处理拖拽结束
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = projectOrder.findIndex(project => project.id === active.id);
      const newIndex = projectOrder.findIndex(project => project.id === over.id);
      
      const newOrder = arrayMove(projectOrder, oldIndex, newIndex);
      setProjectOrder(newOrder);

      // 发送排序更新到后端
      try {
        setIsReordering(true);
        const projectIds = newOrder.map(project => project.id);
        
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
        // 恢复原来的顺序
        setProjectOrder(getProjectsList());
      } finally {
        setIsReordering(false);
      }
    }
  };

  // 如果还没有加载厚度规格，先加载
  useEffect(() => {
    if (token && thicknessSpecs.length === 0) {
      fetchThicknessSpecs();
    }
  }, [token]);

  // 监听材料更新事件，刷新项目数据
  useEffect(() => {
    let debounceTimeout: NodeJS.Timeout | null = null;
    let lastProcessedTimestamp = 0;
    
    const handleMaterialsUpdate = (event: CustomEvent) => {
      const eventDetail = event.detail;
      const eventTimestamp = eventDetail?.timestamp || Date.now();
      
      // 如果事件来自SSE，则跳过处理（因为Store层已经处理了）
      if (eventDetail?.fromSSE) {
        console.log('⏭️ MaterialsTable跳过SSE事件（已由SSE处理器处理）');
        return;
      }
      
      // 防止重复处理相同的事件
      if (eventTimestamp <= lastProcessedTimestamp) {
        console.log('⏭️ MaterialsTable跳过重复事件');
        return;
      }
      
      lastProcessedTimestamp = eventTimestamp;
      
      // 清除之前的防抖定时器
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      
      // 防抖延迟刷新，避免与Store层冲突
      debounceTimeout = setTimeout(() => {
        console.log('🔄 MaterialsTable层刷新项目数据...');
        fetchProjects();
      }, 1000); // 更长的防抖时间，让Store层先处理
    };

    window.addEventListener('materials-updated', handleMaterialsUpdate as EventListener);
    
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      window.removeEventListener('materials-updated', handleMaterialsUpdate as EventListener);
    };
  }, [fetchProjects]);

  const fetchThicknessSpecs = async () => {
    if (!token) {
      console.log('Token not available, skipping thickness specs fetch');
      return;
    }
    
    try {
      const response = await apiRequest('/api/thickness-specs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setThicknessSpecs(data.thicknessSpecs || []);
      }
    } catch (error) {
      console.error('获取厚度规格失败:', error);
    }
  };

  // 更新材料状态 - 使用共享逻辑
  const updateMaterialStatusInTable = async (projectId: number, thicknessSpecId: number, newStatus: StatusType) => {
    const success = await updateMaterialStatusShared(projectId, thicknessSpecId, newStatus, {
      projects: getProjectsList() as any[],
      thicknessSpecs,
      user,
      updateProjectFn: updateProject,
      fetchProjectsFn: fetchProjects,
      setLoadingFn: setLoading,
    });
    
    if (!success) {
      console.error('材料状态更新失败');
    }
  };

  // 恢复项目从过往
  const handleRestoreFromPast = async (projectId: number) => {
    const confirmed = await confirm('确定要将此项目恢复到活跃状态吗？项目将重新回到活跃项目列表中。');
    if (!confirmed) {
      return;
    }
    
    setRestoringFromPast(projectId);
    try {
      const success = await restoreFromPastProject(projectId);
      if (success) {
        // 恢复成功，刷新项目列表
        await fetchProjects();
      }
    } finally {
      setRestoringFromPast(null);
    }
  };

  // 移动项目到过往
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
    } finally {
      setMovingToPast(null);
    }
  };

  // 获取项目的材料状态（根据厚度规格ID）- 使用共享逻辑
  const getProjectMaterialStatusForTable = (projectId: number, thicknessSpecId: number) => {
    return getProjectMaterialStatus(getProjectsList() as any[], projectId, thicknessSpecId);
  };

  // 获取项目的材料信息
  const getProjectMaterial = (projectId: number, thicknessSpecId: number) => {
    const proj = getProjectsList().find(p => p.id === projectId);
    if (!proj || !proj.materials) return null;
    return proj.materials.find(m => m.thicknessSpecId === thicknessSpecId) || null;
  };

  // 处理图纸hover预览
  const handleDrawingHover = (event: React.MouseEvent, drawings: Drawing[]) => {
    if (drawings.length === 0) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverCard({
      isVisible: true,
      position: {
        x: rect.right + 10,
        y: rect.top
      },
      drawings
    });
  };

  // 关闭hover预览
  const handleCloseHover = () => {
    setHoverCard({
      isVisible: false,
      position: { x: 0, y: 0 },
      drawings: []
    });
  };

  // 处理打开图纸
  const handleOpenDrawing = async (drawing: Drawing) => {
    try {
      const fileName = drawing.originalFilename || drawing.filename;
      const cadCheck = await cadFileHandler.isCADFile(fileName);
      
      if (cadCheck.isCADFile) {
        // 使用CAD软件打开
        const result = await cadFileHandler.openCADFile(drawing.filePath);
        if (!result.success) {
          alert(`打开图纸失败: ${result.error}`);
        }
      } else {
        // 非CAD文件，使用默认方式打开
        if (cadFileHandler.isElectronEnvironment() && window.electronAPI && window.electronAPI.openFile) {
          await window.electronAPI.openFile(drawing.filePath);
        } else {
          // 网页环境下载文件
          window.open(`/api/drawings/${drawing.id}/download`, '_blank');
        }
      }
      
      // 关闭预览卡片
      handleCloseHover();
    } catch (error) {
      console.error('打开图纸失败:', error);
      alert('打开图纸失败');
    }
  };

  // 显示项目列表（格式：序号-项目名-工人-2mm-3mm-4mm...-创建时间-开始时间-完成时间-图纸）
  const renderProjectsTable = () => {
    const projectsToShow = selectedProjectId ? projectOrder.filter(p => p.id === selectedProjectId) : projectOrder;
    
    return (
      <div className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col ${className}`}>
        {/* 项目表格 */}
        <div className="flex-1 overflow-auto">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <TableContainer 
              title={viewType === 'completed' ? '过往项目' : '活跃项目'}
              description={`显示${viewType === 'completed' ? '已完成的' : '进行中的'}项目信息`}
              showEmptyState={projectsToShow.length === 0}
              emptyState={{
                title: viewType === 'completed' ? '暂无过往项目' : '暂无活跃项目',
                description: viewType === 'active' ? '点击右上角"新建"按钮创建项目' : 
                           viewType === 'completed' ? '已完成的项目移动到过往后会显示在这里' : ''
              }}
            >
              <Table
                sortable
                sortableItems={projectsToShow.map(p => p.id)}
                onDragEnd={handleDragEnd}
              >
                <TableHeader>
                  <TableRow>
                    <TableCell type="header">序号</TableCell>
                    <TableCell type="header">项目名</TableCell>
                    {/* 厚度列 */}
                    {thicknessSpecs.map(spec => (
                      <TableCell key={spec.id} type="header" align="center">
                        {spec.thickness}{spec.unit}
                      </TableCell>
                    ))}
                    <TableCell type="header">创建时间</TableCell>
                    <TableCell type="header">开始时间</TableCell>
                    <TableCell type="header">完成时间</TableCell>
                    <TableCell type="header">图纸</TableCell>
                    <TableCell type="header">操作</TableCell>
                  </TableRow>
                </TableHeader>
                <SortableContext 
                  items={projectsToShow.map(p => p.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <TableBody sortable sortableItems={projectsToShow.map(p => p.id)}>
                    {projectsToShow.map((proj, index) => (
                      <SortableProjectRow
                        key={proj.id}
                        project={proj}
                        index={index}
                        thicknessSpecs={thicknessSpecs}
                        viewType={viewType}
                        movingToPast={movingToPast}
                        restoringFromPast={restoringFromPast}
                        getProjectMaterialStatusForTable={getProjectMaterialStatusForTable}
                        updateMaterialStatusInTable={updateMaterialStatusInTable}
                        handleDrawingHover={handleDrawingHover}
                        handleCloseHover={handleCloseHover}
                        onProjectSelect={onProjectSelect}
                        handleMoveToPast={handleMoveToPast}
                        handleRestoreFromPast={handleRestoreFromPast}
                        getStatusText={getStatusText}
                        getPriorityColorBadge={getPriorityColorBadge}
                        getPriorityText={getPriorityText}
                      />
                    ))}
                  </TableBody>
                </SortableContext>
              </Table>
            </TableContainer>
          </DndContext>
        </div>
        
        {/* 图纸预览卡片 */}
        <DrawingHoverCard
          drawings={hoverCard.drawings}
          isVisible={hoverCard.isVisible}
          position={hoverCard.position}
          onClose={handleCloseHover}
          onOpenDrawing={handleOpenDrawing}
        />
      </div>
    );
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-700 bg-red-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      case 'low': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getPriorityColorBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      {/* 根据设备类型渲染不同的表格 */}
      {(isMobile || isTablet) ? (
        <ResponsiveMaterialsTable
          projects={projectsToShow}
          thicknessSpecs={thicknessSpecs}
          viewType={viewType}
          movingToPast={movingToPast}
          restoringFromPast={restoringFromPast}
          getProjectMaterialStatusForTable={getProjectMaterialStatusForTable}
          updateMaterialStatusInTable={updateMaterialStatusInTable}
          handleDrawingHover={handleDrawingHover}
          handleCloseHover={handleCloseHover}
          onProjectSelect={onProjectSelect}
          handleMoveToPast={handleMoveToPast}
          handleRestoreFromPast={handleRestoreFromPast}
          getStatusText={getStatusText}
          getPriorityColorBadge={getPriorityColorBadge}
          getPriorityText={getPriorityText}
        />
      ) : (
        renderProjectsTable()
      )}
      <DialogRenderer />
    </>
  );
};
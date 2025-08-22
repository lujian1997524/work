'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore } from '@/stores';
import { Loading, Empty, EmptyData, Button, SearchableSelect, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useProjectToastListener } from '@/utils/projectToastHelper';
import { batchOperationToastHelper, useBatchOperationTracker } from '@/utils/batchOperationToastHelper';
import { ActiveProjectCard } from '@/components/projects/ProjectCard';
import { StatusType } from '@/components/ui';
import { Material } from '@/types/project';
import { ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, ClockIcon, PlayIcon, FolderIcon, CubeIcon, CheckIcon, ChartBarIcon, MagnifyingGlassIcon, DocumentArrowDownIcon, EllipsisVerticalIcon, BellAlertIcon, SpeakerWaveIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { exportActiveProjectsReport } from '@/utils/projectReportExporter';
import { apiRequest } from '@/utils/api';

// 拖拽排序相关导入
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 可拖拽的队列项目组件
const SortableQueueProjectItem: React.FC<{ 
  project: ActiveProject; 
  index: number;
}> = ({ project, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center justify-between bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg border-blue-300 z-50' : 'hover:shadow-sm border-gray-200'
      }`}
    >
      {/* 序号 */}
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
          {index + 1}
        </div>
        
        {/* 项目信息 */}
        <div className="flex items-center space-x-4">
          <h4 className="font-medium text-gray-900">{project.name}</h4>
          <span className={`px-2 py-1 rounded text-xs ${
            project.status === 'pending' ? 'bg-orange-100 text-orange-700' :
            project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {project.status === 'pending' ? '待处理' : 
             project.status === 'in_progress' ? '进行中' : '其他'}
          </span>
          {project.assignedWorker && (
            <span className="text-sm text-gray-600">
              工人: {project.assignedWorker.name}
            </span>
          )}
        </div>
      </div>
      
      {/* 右侧信息 */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {project.materials && (
          <span className="text-sm text-gray-500">
            {project.materials.length} 个板材
          </span>
        )}
        <div className={`px-2 py-1 rounded text-xs ${
          project.priority === 'urgent' ? 'bg-red-100 text-red-700' :
          project.priority === 'high' ? 'bg-orange-100 text-orange-700' :
          project.priority === 'normal' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {project.priority === 'urgent' ? '紧急' :
           project.priority === 'high' ? '高' :
           project.priority === 'normal' ? '普通' : '低'}
        </div>
        <Bars3Icon className="h-4 w-4 text-gray-400 ml-2" />
      </div>
    </div>
  );
};

interface ActiveProject {
  id: number;
  name: string;
  status: string;
  priority: string;
  createdAt?: string;
  created_at?: string;
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
  materials?: Material[];
  drawings?: any[];
  description?: string;
}

interface ActiveProjectsCardViewProps {
  onProjectSelect: (projectId: number | null) => void;
  selectedProjectId: number | null;
  onProjectEdit?: (projectId: number) => void;
  onMaterialStatusChange?: (materialId: number, newStatus: StatusType) => void;
  onProjectMoveToPast?: (projectId: number) => void;
  onJumpToMaterials?: (projectId: number, workerId?: number) => void; // 新增：跳转到板材管理
  onRefresh?: () => void;
  className?: string;
  // 批量操作相关
  enableBatchOperations?: boolean;
  onBatchStatusUpdate?: (projectIds: number[], newStatus: string) => Promise<void>;
  onBatchAssignWorker?: (projectIds: number[], workerId: number) => Promise<void>;
  onBatchDelete?: (projectIds: number[]) => Promise<void>;
}

export const ActiveProjectsCardView: React.FC<ActiveProjectsCardViewProps> = ({
  onProjectSelect,
  selectedProjectId,
  onProjectEdit,
  onMaterialStatusChange,
  onProjectMoveToPast,
  onJumpToMaterials,
  onRefresh,
  className = '',
  // 批量操作相关
  enableBatchOperations = false,
  onBatchStatusUpdate,
  onBatchAssignWorker,
  onBatchDelete
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['pending', 'in_progress']));
  const [movingToPastIds, setMovingToPastIds] = useState<Set<number>>(new Set());
  
  // 筛选相关状态
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedThickness, setSelectedThickness] = useState<string>('');
  
  // 批量操作相关状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  
  // 公共页面和公告相关状态
  const [showPublicLink, setShowPublicLink] = useState(false);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [showManageAnnouncements, setShowManageAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'general' as 'priority_change' | 'maintenance' | 'delay' | 'completion' | 'general'
  });
  
  // 队列排序相关状态
  const [showQueueSortModal, setShowQueueSortModal] = useState(false);
  const [queueProjects, setQueueProjects] = useState<ActiveProject[]>([]);
  const [queueSortLoading, setQueueSortLoading] = useState(false);
  
  const { user, token } = useAuth();
  const toast = useToast();
  const { createTracker } = useBatchOperationTracker();
  
  // 监听项目Toast事件
  useProjectToastListener();
  
  const { 
    projects, 
    loading, 
    fetchProjects,
    moveToPastProject
  } = useProjectStore();

  // 初始化数据 - 只在组件挂载时执行一次
  useEffect(() => {
    fetchProjects();
  }, []); // 移除依赖项，只在组件挂载时执行一次

  // 监听项目创建事件，确保新项目能及时显示
  useEffect(() => {
    const handleProjectCreated = (event: any) => {
      // 项目创建成功，刷新项目列表以确保新项目显示
      fetchProjects();
    };

    const handleProjectUpdated = (event: any) => {
      // 项目更新成功，刷新项目列表以确保状态同步
      fetchProjects();
    };

    const handleProjectsUpdated = (event: any) => {
      // 项目列表更新，刷新项目列表
      fetchProjects();
    };

    // 注册事件监听器
    window.addEventListener('project-created', handleProjectCreated);
    window.addEventListener('project-updated', handleProjectUpdated);
    window.addEventListener('projects-updated', handleProjectsUpdated);

    // 清理函数
    return () => {
      window.removeEventListener('project-created', handleProjectCreated);
      window.removeEventListener('project-updated', handleProjectUpdated);
      window.removeEventListener('projects-updated', handleProjectsUpdated);
    };
  }, [fetchProjects]); // 依赖fetchProjects，确保引用稳定

  // 按状态分组项目
  const groupProjectsByStatus = () => {
    const groups = {
      pending: projects.filter(p => p.status === 'pending'),
      in_progress: projects.filter(p => p.status === 'in_progress'),
      completed: projects.filter(p => p.status === 'completed')
    };
    return groups;
  };

  // 获取所有工人选项
  const getWorkerOptions = useMemo(() => {
    const workers = new Set<string>();
    projects.forEach(project => {
      if (project.assignedWorker?.name) {
        workers.add(project.assignedWorker.name);
      }
    });
    return Array.from(workers).sort();
  }, [projects]);

  // 获取所有厚度选项
  const getThicknessOptions = useMemo(() => {
    const thicknesses = new Set<string>();
    projects.forEach(project => {
      project.materials?.forEach(material => {
        if (material.thicknessSpec?.thickness) {
          thicknesses.add(material.thicknessSpec.thickness);
        }
      });
    });
    return Array.from(thicknesses).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [projects]);

  // 筛选项目
  const filterProjects = (projectsToFilter: ActiveProject[]) => {
    return projectsToFilter.filter(project => {
      // 工人筛选
      if (selectedWorker && selectedWorker !== 'all') {
        if (selectedWorker === 'unassigned') {
          // 筛选未分配的项目
          if (project.assignedWorker?.name) {
            return false;
          }
        } else {
          // 筛选特定工人的项目
          if (!project.assignedWorker?.name || project.assignedWorker.name !== selectedWorker) {
            return false;
          }
        }
      }

      // 厚度筛选
      if (selectedThickness && selectedThickness !== 'all') {
        const hasThickness = project.materials?.some(material => 
          material.thicknessSpec?.thickness === selectedThickness
        );
        if (!hasThickness) {
          return false;
        }
      }

      return true;
    });
  };

  // 应用筛选后按状态分组项目
  const getFilteredGroupedProjects = () => {
    const allGroups = groupProjectsByStatus();
    return {
      pending: filterProjects(allGroups.pending),
      in_progress: filterProjects(allGroups.in_progress),
      completed: filterProjects(allGroups.completed)
    };
  };

  // 切换分组展开状态
  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  // 处理编辑项目
  const handleEditProject = (projectId: number) => {
    onProjectEdit?.(projectId);
  };

  // 处理材料状态变更
  const handleMaterialStatusChange = (materialId: number, newStatus: StatusType) => {
    onMaterialStatusChange?.(materialId, newStatus);
  };

  // 处理跳转到板材管理
  const handleJumpToMaterials = (projectId: number, workerId?: number) => {
    onJumpToMaterials?.(projectId, workerId);
  };

  // 处理移至过往项目
  const handleMoveToPast = async (projectId: number) => {
    if (movingToPastIds.has(projectId)) return;

    // 查找项目名称用于Toast显示
    const project = projects.find(p => p.id === projectId);
    const projectName = project?.name || `项目${projectId}`;

    setMovingToPastIds(prev => new Set(prev).add(projectId));
    try {
      const success = await moveToPastProject(projectId);
      if (success) {
        // 显示项目归档成功Toast
        toast.addToast({
          type: 'success',
          message: `项目 "${projectName}" 已归档`
        });
        
        onProjectMoveToPast?.(projectId);
        // 刷新项目列表
        fetchProjects();
      } else {
        // 显示失败Toast
        toast.addToast({
          type: 'error',
          message: `项目"${projectName}"移至过往库失败，请重试`
        });
      }
    } catch (error) {
      // 移至过往项目失败
      toast.addToast({
        type: 'error',
        message: `项目"${projectName}"移至过往库失败：${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setMovingToPastIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  };

  // 批量操作相关函数
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedProjectIds(new Set());
  };

  const handleSelectProject = (projectId: number) => {
    const newSelected = new Set(selectedProjectIds);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjectIds(newSelected);
  };

  const selectAllProjects = () => {
    const allProjectIds = new Set(projects.map(p => p.id));
    setSelectedProjectIds(allProjectIds);
  };

  const clearSelection = () => {
    setSelectedProjectIds(new Set());
  };

  // 批量状态更新
  const handleBatchStatusUpdate = async (newStatus: string) => {
    if (selectedProjectIds.size === 0) {
      toast.addToast({ type: 'warning', message: '请先选择要操作的项目' });
      return;
    }

    if (!onBatchStatusUpdate) {
      toast.addToast({ type: 'warning', message: '批量状态更新功能不可用' });
      return;
    }

    setBatchLoading(true);
    const tracker = createTracker('批量更新项目状态', selectedProjectIds.size, 'project-batch');
    
    try {
      await onBatchStatusUpdate(Array.from(selectedProjectIds), newStatus);
      tracker.complete();
      batchOperationToastHelper.projectBatchStatusChange(selectedProjectIds.size, selectedProjectIds.size, newStatus);
      
      fetchProjects();
      setBatchMode(false);
      setSelectedProjectIds(new Set());
    } catch (error) {
      tracker.fail(`批量状态更新失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // 批量分配工人
  const handleBatchAssignWorker = async (workerId: number, workerName: string) => {
    if (selectedProjectIds.size === 0) {
      toast.addToast({ type: 'warning', message: '请先选择要操作的项目' });
      return;
    }

    if (!onBatchAssignWorker) {
      toast.addToast({ type: 'warning', message: '批量分配工人功能不可用' });
      return;
    }

    setBatchLoading(true);
    const tracker = createTracker('批量分配工人', selectedProjectIds.size, 'project-batch');
    
    try {
      await onBatchAssignWorker(Array.from(selectedProjectIds), workerId);
      tracker.complete();
      batchOperationToastHelper.projectBatchAssign(selectedProjectIds.size, selectedProjectIds.size, workerName);
      
      fetchProjects();
      setBatchMode(false);
      setSelectedProjectIds(new Set());
    } catch (error) {
      tracker.fail(`批量分配工人失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // 导出报表处理函数
  const handleExportToExcel = () => {
    try {
      exportActiveProjectsReport();
      toast.addToast({
        type: 'success',
        message: '活跃项目详细报表已导出为Excel格式'
      });
    } catch (error) {
      toast.addToast({
        type: 'error',
        message: '导出Excel报表失败，请重试'
      });
    }
  };

  // 批量删除项目
  const handleBatchDelete = async () => {
    if (selectedProjectIds.size === 0) {
      toast.addToast({ type: 'warning', message: '请先选择要操作的项目' });
      return;
    }

    if (!onBatchDelete) {
      toast.addToast({ type: 'warning', message: '批量删除功能不可用' });
      return;
    }

    setBatchLoading(true);
    const tracker = createTracker('批量删除项目', selectedProjectIds.size, 'project-batch');
    
    try {
      await onBatchDelete(Array.from(selectedProjectIds));
      tracker.complete();
      batchOperationToastHelper.projectBatchDelete(selectedProjectIds.size, selectedProjectIds.size);
      
      fetchProjects();
      setBatchMode(false);
      setSelectedProjectIds(new Set());
    } catch (error) {
      tracker.fail(`批量删除失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // 添加公告处理函数
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 自动设置24小时后过期
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const response = await apiRequest('/api/queue/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          type: newAnnouncement.type,
          expiresAt: expiresAt.toISOString()
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '发布失败');
      }
      
      setShowAddAnnouncement(false);
      setNewAnnouncement({ title: '', content: '', type: 'general' });
      
      toast.addToast({
        type: 'success',
        message: '公告发布成功'
      });
    } catch (error) {
      console.error('发布公告失败:', error);
      toast.addToast({
        type: 'error',
        message: '发布公告失败'
      });
    }
  };

  // 获取公告列表
  const fetchAnnouncements = async () => {
    try {
      const response = await apiRequest('/api/queue/announcements');
      const result = await response.json();
      
      if (response.ok) {
        setAnnouncements(result.announcements || []);
      }
    } catch (error) {
      console.error('获取公告列表失败:', error);
    }
  };

  // 删除公告
  const handleDeleteAnnouncement = async (announcementId: number, title: string) => {
    try {
      const response = await apiRequest(`/api/queue/announcements/${announcementId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.addToast({
          type: 'success',
          message: `公告"${title}"已删除`
        });
        fetchAnnouncements(); // 刷新公告列表
      } else {
        const result = await response.json();
        throw new Error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除公告失败:', error);
      toast.addToast({
        type: 'error',
        message: '删除公告失败'
      });
    }
  };

  // 编辑公告
  const handleEditAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    
    try {
      // 自动设置24小时后过期
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const response = await apiRequest(`/api/queue/announcements/${editingAnnouncement.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editingAnnouncement.title,
          content: editingAnnouncement.content,
          type: editingAnnouncement.type,
          expiresAt: expiresAt.toISOString()
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '编辑失败');
      }
      
      setEditingAnnouncement(null);
      fetchAnnouncements(); // 刷新公告列表
      
      toast.addToast({
        type: 'success',
        message: '公告编辑成功'
      });
    } catch (error) {
      console.error('编辑公告失败:', error);
      toast.addToast({
        type: 'error',
        message: '编辑公告失败'
      });
    }
  };

  // 打开公告管理时获取公告列表
  useEffect(() => {
    if (showManageAnnouncements) {
      fetchAnnouncements();
    }
  }, [showManageAnnouncements]);

  // 队列排序相关函数
  const fetchQueueProjects = async () => {
    try {
      setQueueSortLoading(true);
      // 获取活跃项目列表用于排序
      const activeProjects = projects.filter(p => 
        p.status === 'pending' || p.status === 'in_progress'
      );
      setQueueProjects(activeProjects);
    } catch (error) {
      console.error('获取队列项目失败:', error);
      toast.addToast({
        type: 'error',
        message: '获取队列项目失败'
      });
    } finally {
      setQueueSortLoading(false);
    }
  };

  // 保存队列排序
  const handleSaveQueueOrder = async () => {
    try {
      setQueueSortLoading(true);
      const projectIds = queueProjects.map(p => p.id);
      
      const response = await apiRequest('/api/queue/projects/laser_queue_2025_public/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectIds: projectIds
        })
      });
      
      if (response.ok) {
        toast.addToast({
          type: 'success',
          message: '队列排序已保存'
        });
        setShowQueueSortModal(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存排序失败');
      }
    } catch (error) {
      console.error('保存队列排序失败:', error);
      toast.addToast({
        type: 'error',
        message: '保存队列排序失败'
      });
    } finally {
      setQueueSortLoading(false);
    }
  };

  // 队列拖拽排序传感器 - 优化性能
  const queueSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // 减少激活距离
      },
    })
  );

  // 队列拖拽结束处理
  const handleQueueDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id === over?.id) return;

    const oldIndex = queueProjects.findIndex(item => item.id === active.id);
    const newIndex = queueProjects.findIndex(item => item.id === over.id);
    const newProjects = arrayMove(queueProjects, oldIndex, newIndex);
    setQueueProjects(newProjects);
  };

  // 打开排序模态框时获取项目列表
  useEffect(() => {
    if (showQueueSortModal) {
      fetchQueueProjects();
    }
  }, [showQueueSortModal, projects]);

  // 获取状态显示配置
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          title: '待处理项目',
          icon: <ClockIcon className="w-5 h-5 text-orange-600" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
          description: '等待开始的项目'
        };
      case 'in_progress':
        return {
          title: '进行中项目',
          icon: <PlayIcon className="w-5 h-5 text-blue-600" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          description: '正在进行的项目'
        };
      case 'completed':
        return {
          title: '已完成项目',
          icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          description: '已完成可归档的项目'
        };
      default:
        return {
          title: '其他项目',
          icon: <ClockIcon className="w-5 h-5 text-gray-600" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          description: '其他状态项目'
        };
    }
  };

  // 计算总体统计信息
  const getOverallStats = () => {
    const totalProjects = projects.length;
    const totalMaterials = projects.reduce((sum, project) => sum + (project.materials?.length || 0), 0);
    const completedMaterials = projects.reduce((sum, project) => 
      sum + (project.materials?.filter(m => m.status === 'completed').length || 0), 0
    );
    const inProgressMaterials = projects.reduce((sum, project) => 
      sum + (project.materials?.filter(m => m.status === 'in_progress').length || 0), 0
    );
    
    return {
      totalProjects,
      totalMaterials,
      completedMaterials,
      inProgressMaterials,
      pendingMaterials: totalMaterials - completedMaterials - inProgressMaterials,
      completionRate: totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyData 
        
        description="还没有正在进行的项目"
        className="py-12"
      />
    );
  }

  const groupedProjects = getFilteredGroupedProjects();
  const stats = getOverallStats();

  return (
    <div className={`h-full flex flex-col p-4 ${className}`}>
      {/* 现代化统计面板 */}
      <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4 mb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">项目统计概览</h3>
          
          {/* 功能按钮组 */}
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="px-3 py-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline ml-2">刷新</span>
              </Button>
            )}
            
            <Button
              onClick={() => setShowPublicLink(true)}
              variant="secondary"
              size="sm"
            >
              <BellAlertIcon className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">公共页面</span>
            </Button>
            
            <Button
              onClick={() => setShowAddAnnouncement(true)}
              variant="outline"
              size="sm"
            >
              <SpeakerWaveIcon className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">发布公告</span>
            </Button>
            
            <Button
              onClick={() => setShowManageAnnouncements(true)}
              variant="outline"
              size="sm"
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">管理公告</span>
            </Button>
            
            <Button
              onClick={() => setShowQueueSortModal(true)}
              variant="outline"
              size="sm"
            >
              <ChartBarIcon className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">队列排序</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToExcel}
              disabled={projects.length === 0}
              className="flex items-center space-x-1 px-3 py-2"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span className="hidden sm:inline">导出Excel</span>
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <FolderIcon className="w-6 h-6 md:w-8 md:h-8 text-gray-600" />
            </div>
            <div className="min-w-0">
              <div className="text-lg md:text-xl font-bold text-gray-900">{stats.totalProjects}</div>
              <div className="text-xs md:text-sm text-gray-600 truncate">活跃项目</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-blue-50 rounded-lg">
            <div className="flex-shrink-0">
              <CubeIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-lg md:text-xl font-bold text-blue-600">{stats.totalMaterials}</div>
              <div className="text-xs md:text-sm text-gray-600 truncate">板材总数</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-green-50 rounded-lg">
            <div className="flex-shrink-0">
              <CheckIcon className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="text-lg md:text-xl font-bold text-green-600">{stats.completedMaterials}</div>
              <div className="text-xs md:text-sm text-gray-600 truncate">已完成</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-purple-50 rounded-lg">
            <div className="flex-shrink-0">
              <ChartBarIcon className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
            </div>
            <div className="min-w-0">
              <div className="text-lg md:text-xl font-bold text-purple-600">{stats.completionRate}%</div>
              <div className="text-xs md:text-sm text-gray-600 truncate">完成率</div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选组件 */}
      <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4 mb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">筛选条件</h3>
          {(selectedWorker && selectedWorker !== 'all') || (selectedThickness && selectedThickness !== 'all') ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedWorker('');
                setSelectedThickness('');
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              清空筛选
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 工人筛选 */}
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">按工人筛选</label>
            <SearchableSelect
              value={selectedWorker}
              onChange={(value) => setSelectedWorker(value as string)}
              placeholder="输入名字搜索..."
              options={[
                { label: '未分配', value: 'unassigned' },
                ...getWorkerOptions.map(worker => ({
                  label: worker,
                  value: worker
                }))
              ]}
              clearable={true}
              className="w-full"
            />
          </div>

          {/* 厚度筛选 */}
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">按厚度筛选</label>
            <SearchableSelect
              value={selectedThickness}
              onChange={(value) => setSelectedThickness(value as string)}
              placeholder="输入厚度搜索..."
              options={getThicknessOptions.map(thickness => ({
                label: `${thickness}mm`,
                value: thickness
              }))}
              clearable={true}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 按状态分组显示项目 */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pb-4">
          {/* 按照指定顺序显示：进行中项目 → 待处理项目 → 已完成项目 */}
          {['in_progress', 'pending', 'completed'].map((status) => {
            const statusProjects = groupedProjects[status as keyof typeof groupedProjects];
            if (!statusProjects || statusProjects.length === 0) return null;
            
            const config = getStatusConfig(status);
            
            return (
              <div key={status} className={`bg-white rounded-lg shadow-sm border overflow-hidden ${config.bgColor}`}>
                {/* 状态分组标题 */}
                <Button
                  variant="ghost"
                  onClick={() => toggleSection(status)}
                  className="w-full px-6 py-4 hover:bg-white hover:bg-opacity-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    {expandedSections.has(status) ? (
                      <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                    )}
                    {config.icon}
                    <div className="text-left">
                      <h3 className={`text-lg font-semibold ${config.color}`}>
                        {config.title}
                      </h3>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                    <span className="bg-white bg-opacity-70 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                      {statusProjects.length} 个项目
                    </span>
                  </div>
                </Button>

                {/* 状态分组下的项目卡片 */}
                <AnimatePresence>
                  {expandedSections.has(status) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden bg-white bg-opacity-50"
                    >
                      <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                          {statusProjects.map((project) => (
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
                                description: project.description
                              }}
                              onEdit={handleEditProject}
                              onViewDetail={(projectId) => onProjectSelect(projectId)} // 新增：查看项目详情
                              onMaterialStatusChange={handleMaterialStatusChange}
                              onMoveToPast={handleMoveToPast}
                              onManageMaterials={() => handleJumpToMaterials(project.id, project.assignedWorker?.id)}
                              movingToPast={movingToPastIds.has(project.id)}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 公共页面链接模态框 */}
      <Modal 
        isOpen={showPublicLink} 
        onClose={() => setShowPublicLink(false)} 
        title="公共排队页面" 
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">扫描此链接或复制地址：</p>
            <div className="p-3 bg-white rounded-md border border-gray-200">
              <code className="text-xs font-mono text-gray-800 break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/queue/laser_queue_2025_public` : '/queue/laser_queue_2025_public'}
              </code>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(`${window.location.origin}/queue/laser_queue_2025_public`);
                  toast.addToast({
                    type: 'success',
                    message: '链接已复制到剪贴板'
                  });
                }
              }}
              variant="primary" 
              className="flex-1"
            >
              复制链接
            </Button>
            <Button 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.open('/queue/laser_queue_2025_public', '_blank');
                }
              }}
              variant="secondary" 
              className="flex-1"
            >
              预览页面
            </Button>
          </div>
        </div>
      </Modal>

      {/* 发布公告模态框 */}
      <Modal 
        isOpen={showAddAnnouncement} 
        onClose={() => setShowAddAnnouncement(false)} 
        title="发布公告" 
        size="xl"
      >
        <div className="space-y-6">
          <form onSubmit={handleAddAnnouncement} className="space-y-6">
            {/* 公告类型快速选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">公告类型</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { value: 'general', label: '通用公告', icon: SpeakerWaveIcon, color: 'blue' },
                  { value: 'priority_change', label: '优先级变更', icon: BellAlertIcon, color: 'yellow' },
                  { value: 'maintenance', label: '设备维护', icon: CubeIcon, color: 'orange' },
                  { value: 'delay', label: '延期通知', icon: ClockIcon, color: 'red' },
                  { value: 'completion', label: '完成通知', icon: CheckCircleIcon, color: 'green' }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNewAnnouncement({...newAnnouncement, type: type.value as any})}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      newAnnouncement.type === type.value
                        ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <type.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 标题输入 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">标题</label>
                <span className="text-xs text-gray-500">
                  {newAnnouncement.title.length}/100
                </span>
              </div>
              <input
                type="text"
                value={newAnnouncement.title}
                onChange={(e) => {
                  if (e.target.value.length <= 100) {
                    setNewAnnouncement({...newAnnouncement, title: e.target.value});
                  }
                }}
                required
                maxLength={100}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="请输入公告标题，简洁明了"
              />
            </div>
            
            {/* 内容输入 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">内容</label>
                <span className="text-xs text-gray-500">
                  {newAnnouncement.content.length}/500
                </span>
              </div>
              <textarea
                value={newAnnouncement.content}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setNewAnnouncement({...newAnnouncement, content: e.target.value});
                  }
                }}
                required
                maxLength={500}
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
                placeholder="请输入公告详细内容，清晰表达要传达的信息"
              />
              <div className="mt-2 text-xs text-gray-500">
                建议：使用简洁的语言，突出重点信息
              </div>
            </div>

            {/* 实时预览 */}
            {(newAnnouncement.title || newAnnouncement.content) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">预览效果</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 flex-1">
                        {newAnnouncement.title || '公告标题'}
                      </h4>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        newAnnouncement.type === 'general' ? 'bg-blue-100 text-blue-700' :
                        newAnnouncement.type === 'priority_change' ? 'bg-yellow-100 text-yellow-700' :
                        newAnnouncement.type === 'maintenance' ? 'bg-orange-100 text-orange-700' :
                        newAnnouncement.type === 'delay' ? 'bg-red-100 text-red-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {newAnnouncement.type === 'general' ? '通用' :
                         newAnnouncement.type === 'priority_change' ? '优先级' :
                         newAnnouncement.type === 'maintenance' ? '维护' :
                         newAnnouncement.type === 'delay' ? '延期' : '完成'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                      {newAnnouncement.content || '公告内容将在此处显示'}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        刚刚发布
                      </p>
                      <p className="text-xs text-gray-400">
                        24小时后过期
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 操作按钮 */}
            <div className="flex space-x-3 pt-6 border-t border-gray-200">
              <Button 
                type="submit" 
                variant="primary" 
                className="flex-1 py-3"
                disabled={!newAnnouncement.title.trim() || !newAnnouncement.content.trim()}
              >
                立即发布公告
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  setShowAddAnnouncement(false);
                  setNewAnnouncement({ title: '', content: '', type: 'general' });
                }} 
                variant="secondary" 
                className="flex-1 py-3"
              >
                取消
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* 管理公告模态框 */}
      <Modal 
        isOpen={showManageAnnouncements} 
        onClose={() => setShowManageAnnouncements(false)} 
        title="管理公告" 
        size="xl"
      >
        <div className="space-y-6">
          {/* 搜索和筛选栏 */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索公告标题或内容..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">所有类型</option>
                <option value="general">通用公告</option>
                <option value="priority_change">优先级变更</option>
                <option value="maintenance">设备维护</option>
                <option value="delay">延期通知</option>
                <option value="completion">完成通知</option>
              </select>
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新
              </Button>
            </div>
          </div>

          {/* 公告统计 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{announcements.length}</div>
              <div className="text-sm text-blue-600">总公告数</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-600">
                {announcements.filter(a => new Date(a.expiresAt) > new Date()).length}
              </div>
              <div className="text-sm text-green-600">有效公告</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-yellow-600">
                {announcements.filter(a => new Date(a.expiresAt) <= new Date()).length}
              </div>
              <div className="text-sm text-yellow-600">已过期</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-600">
                {announcements.filter(a => a.type === 'general').length}
              </div>
              <div className="text-sm text-purple-600">通用公告</div>
            </div>
          </div>

          {/* 公告列表 */}
          {announcements.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SpeakerWaveIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无公告</h3>
              <p className="text-gray-500 mb-4">还没有发布任何公告</p>
              <Button 
                onClick={() => {
                  setShowManageAnnouncements(false);
                  setShowAddAnnouncement(true);
                }}
                variant="primary"
                size="sm"
              >
                发布第一个公告
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {announcements.map((announcement) => {
                const isExpired = new Date(announcement.expiresAt) <= new Date();
                return (
                  <div 
                    key={announcement.id} 
                    className={`rounded-lg p-4 border transition-all duration-200 hover:shadow-md ${
                      isExpired ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-base font-semibold text-gray-900">
                            {announcement.title}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            announcement.type === 'general' ? 'bg-blue-100 text-blue-700' :
                            announcement.type === 'priority_change' ? 'bg-yellow-100 text-yellow-700' :
                            announcement.type === 'maintenance' ? 'bg-orange-100 text-orange-700' :
                            announcement.type === 'delay' ? 'bg-red-100 text-red-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {announcement.type === 'general' ? '通用' :
                             announcement.type === 'priority_change' ? '优先级' :
                             announcement.type === 'maintenance' ? '维护' :
                             announcement.type === 'delay' ? '延期' : '完成'}
                          </span>
                          {isExpired && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                              已过期
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                          {announcement.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-3 w-3" />
                            <span>发布: {new Date(announcement.created_at || announcement.createdAt).toLocaleString('zh-CN')}</span>
                          </div>
                          {announcement.expiresAt && (
                            <div className="flex items-center space-x-1">
                              <span className={isExpired ? 'text-red-500' : 'text-gray-500'}>
                                过期: {new Date(announcement.expiresAt).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <Button
                          onClick={() => setEditingAnnouncement(announcement)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          编辑
                        </Button>
                        <Button
                          onClick={() => handleDeleteAnnouncement(announcement.id, announcement.title)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:border-red-300"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* 底部操作栏 */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-200 gap-4">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => {
                  setShowManageAnnouncements(false);
                  setShowAddAnnouncement(true);
                }}
                variant="primary"
                size="sm"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                发布新公告
              </Button>
              {announcements.some(a => new Date(a.expiresAt) <= new Date()) && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="text-orange-600 hover:bg-orange-50"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  清理过期公告
                </Button>
              )}
            </div>
            <Button onClick={() => setShowManageAnnouncements(false)} variant="secondary">
              关闭
            </Button>
          </div>
        </div>
      </Modal>

      {/* 编辑公告模态框 */}
      <Modal 
        isOpen={!!editingAnnouncement} 
        onClose={() => setEditingAnnouncement(null)} 
        title="编辑公告" 
        size="lg"
      >
        {editingAnnouncement && (
          <form onSubmit={handleEditAnnouncement} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                type="text"
                value={editingAnnouncement.title}
                onChange={(e) => setEditingAnnouncement({...editingAnnouncement, title: e.target.value})}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入公告标题"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
              <textarea
                value={editingAnnouncement.content}
                onChange={(e) => setEditingAnnouncement({...editingAnnouncement, content: e.target.value})}
                required
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="输入公告内容"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">类型</label>
              <select
                value={editingAnnouncement.type}
                onChange={(e) => setEditingAnnouncement({...editingAnnouncement, type: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="general">通用公告</option>
                <option value="priority_change">优先级变更</option>
                <option value="maintenance">设备维护</option>
                <option value="delay">延期通知</option>
                <option value="completion">完成通知</option>
              </select>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button type="submit" variant="primary" className="flex-1">保存修改</Button>
              <Button type="button" onClick={() => setEditingAnnouncement(null)} variant="secondary" className="flex-1">取消</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 队列排序模态框 */}
      <Modal 
        isOpen={showQueueSortModal} 
        onClose={() => setShowQueueSortModal(false)} 
        title="管理队列排序" 
        size="full"
      >
        <div className="space-y-6">
          {/* 说明文本 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ChartBarIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">队列排序管理</h4>
                <p className="text-sm text-blue-700">
                  拖拽项目卡片可以调整在公共队列页面的显示顺序。序号越小的项目将显示在越前面的位置。
                </p>
              </div>
            </div>
          </div>

          {/* 队列统计 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-orange-600">
                {queueProjects.filter(p => p.status === 'pending').length}
              </div>
              <div className="text-sm text-orange-600">待处理</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-600">
                {queueProjects.filter(p => p.status === 'in_progress').length}
              </div>
              <div className="text-sm text-blue-600">进行中</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-gray-600">{queueProjects.length}</div>
              <div className="text-sm text-gray-600">总计</div>
            </div>
          </div>

          {/* 可拖拽排序的项目列表 */}
          {queueSortLoading ? (
            <div className="flex justify-center py-12">
              <Loading text="加载队列项目..." />
            </div>
          ) : queueProjects.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChartBarIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">队列为空</h3>
              <p className="text-gray-500 text-lg">当前没有活跃的项目需要排序</p>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-semibold text-gray-900">队列项目排序</h4>
                <div className="text-base text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
                  提示: 点击并拖拽整个卡片可调整顺序
                </div>
              </div>
              
              <DndContext
                sensors={queueSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleQueueDragEnd}
              >
                <SortableContext items={queueProjects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {queueProjects.map((project, index) => (
                      <SortableQueueProjectItem
                        key={project.id}
                        project={project}
                        index={index}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4">
            <Button
              onClick={() => setShowQueueSortModal(false)}
              variant="secondary"
              size="lg"
            >
              取消
            </Button>
            <Button
              onClick={handleSaveQueueOrder}
              variant="primary"
              size="lg"
              disabled={queueSortLoading || queueProjects.length === 0}
              loading={queueSortLoading}
            >
              保存新排序
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
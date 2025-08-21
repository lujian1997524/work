'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore } from '@/stores';
import { 
  Card, 
  Badge, 
  Loading, 
  StatusIndicator,
  StatusToggle,
  Button,
  Input,
  Textarea,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  useDialog,
  Timeline,
  Select,
  ResponsiveContainer,
  AdaptiveLayout,
  ResponsiveGrid,
  InfoCard,
  TabBar,
  Empty,
  Alert,
  Avatar,
  Tooltip,
  StateChip,
  ProgressBar,
  List,
  ListItem,
  Navigation,
  NavigationItem,
  IconButton
} from '@/components/ui';
import type { TimelineItem, StatusType } from '@/components/ui';

// 类型定义
interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  assignedWorker?: { id: number; name: string };
  materials: Material[];
  drawings: Drawing[];
  createdAt: string;
  updatedAt: string;
}

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
  status: StatusType;
  quantity?: number;
  notes?: string;
  startDate?: string;
  completedDate?: string;
  completedByUser?: { id: number; name: string };
  thicknessSpec?: ThicknessSpec;
  assignedFromWorkerMaterialId?: number; // 新增：来源工人材料ID
}

interface Drawing {
  id: number;
  projectId: number;
  filename: string;
  originalName: string;
  originalFilename?: string;
  filePath: string;
  version: string;
  createdAt: string;
  uploadTime?: string;
  uploader?: { id: number; name: string };
}

interface OperationHistory {
  id: number;
  action: string;
  operationType: string;
  operationDescription: string;
  description: string;
  created_at: string;
  createdAt: string;
  user?: { name: string };
  operator: { id: number; name: string };
  details?: Record<string, any>;
}
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  UserIcon, 
  CalendarIcon,
  DocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  PhotoIcon,
  CogIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  ChartBarIcon,
  TruckIcon,
  TagIcon,
  ArrowRightIcon,
  ExclamationCircleIcon,
  RectangleStackIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { updateMaterialStatusShared, getProjectMaterialStatus } from '@/utils/materialStatusManager';
import { formatDate, formatDateTime } from '@/utils/dateFormatter';
import { apiRequest } from '@/utils/api';
import { useResponsive } from '@/hooks/useResponsive';
import { DrawingUpload } from '@/components/drawings/DrawingUpload';
import { ProjectBorrowingDetails } from '@/components/materials/ProjectBorrowingDetails';
import AdvancedDxfModal from '@/components/ui/advanced-dxf/AdvancedDxfModal';

interface ProjectDetailModernProps {
  projectId: number;
  onBack: () => void;
  className?: string;
}

// 状态配置
const statusConfig = {
  pending: { 
    label: '待处理', 
    color: 'bg-gray-100 text-gray-800', 
    icon: ClockIcon,
    description: '项目已创建，等待开始处理'
  },
  in_progress: { 
    label: '进行中', 
    color: 'bg-blue-100 text-blue-800', 
    icon: PlayIcon,
    description: '项目正在进行中'
  },
  completed: { 
    label: '已完成', 
    color: 'bg-green-100 text-green-800', 
    icon: CheckCircleIcon,
    description: '项目已完成所有任务'
  }
};

// 优先级配置
const priorityConfig = {
  low: { label: '低', color: 'bg-gray-100 text-gray-800' },
  normal: { label: '普通', color: 'bg-blue-100 text-blue-800' },
  medium: { label: '中等', color: 'bg-blue-100 text-blue-800' }, // 添加medium支持
  high: { label: '高', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: '紧急', color: 'bg-red-100 text-red-800' }
};

export const ProjectDetailModern: React.FC<ProjectDetailModernProps> = ({
  projectId,
  onBack,
  className = ''
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [thicknessSpecs, setThicknessSpecs] = useState<ThicknessSpec[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'drawings' | 'history'>('overview');
  const [editingNotes, setEditingNotes] = useState(false);
  const [projectNotes, setProjectNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [operationHistory, setOperationHistory] = useState<OperationHistory[]>([]);
  // 图纸预览相关状态
  const [showAdvancedDxfPreview, setShowAdvancedDxfPreview] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);

  // 材料编辑相关状态
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialNotes, setMaterialNotes] = useState('');

  // 图纸上传相关状态
  const [showUploadModal, setShowUploadModal] = useState(false);


  const { token, user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const { projects, updateProject, fetchProjects } = useProjectStore();
  const { confirm, alert, DialogRenderer } = useDialog();

  // 获取项目详情
  const fetchProjectDetail = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await apiRequest(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setProjectNotes(data.project?.description || '');
      }
    } catch (error) {
      // 获取项目详情失败，忽略错误日志
    } finally {
      setLoading(false);
    }
  }, [projectId, token]);

  // 获取厚度规格
  const fetchThicknessSpecs = useCallback(async () => {
    if (!token) return;
    
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
      // 获取厚度规格失败，忽略错误日志
    }
  }, [token]);

  // 获取操作历史
  const fetchOperationHistory = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest(`/api/projects/${projectId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOperationHistory(data.history || []);
      }
    } catch (error) {
      // 获取操作历史失败，忽略错误日志
      // 如果API不存在，设置为空数组
      setOperationHistory([]);
    }
  }, [projectId, token]);

  // 初始化数据
  useEffect(() => {
    fetchProjectDetail();
    fetchThicknessSpecs();
    if (activeTab === 'history') {
      fetchOperationHistory();
    }
  }, [fetchProjectDetail, fetchThicknessSpecs, fetchOperationHistory, activeTab]);

  // 监听分配变化事件
  useEffect(() => {
    const handleAllocationChange = () => {
      fetchProjectDetail(); // 刷新项目详情
    };

    window.addEventListener('material-allocation-changed', handleAllocationChange);
    
    return () => {
      window.removeEventListener('material-allocation-changed', handleAllocationChange);
    };
  }, [fetchProjectDetail]);

  // 材料状态更新
  const handleMaterialStatusChange = async (thicknessSpecId: number, newStatus: StatusType) => {
    if (!project || !user) return;
    

    // 立即更新UI状态，提供即时视觉反馈
    setProject(prev => {
      if (!prev) return null;
      
      const updatedMaterials = [...(prev.materials || [])];
      const existingIndex = updatedMaterials.findIndex(m => m.thicknessSpecId === thicknessSpecId);
      
      if (existingIndex >= 0) {
        // 更新现有材料
        updatedMaterials[existingIndex] = {
          ...updatedMaterials[existingIndex],
          status: newStatus,
          startDate: newStatus === 'in_progress' ? new Date().toISOString() : updatedMaterials[existingIndex].startDate,
          completedDate: newStatus === 'completed' ? new Date().toISOString() : updatedMaterials[existingIndex].completedDate
        };
      } else {
        // 创建新材料记录
        const thicknessSpec = thicknessSpecs.find(ts => ts.id === thicknessSpecId);
        if (thicknessSpec) {
          updatedMaterials.push({
            id: -Date.now(), // 临时ID
            projectId: prev.id,
            thicknessSpecId: thicknessSpecId,
            status: newStatus,
            thicknessSpec: thicknessSpec,
            startDate: newStatus === 'in_progress' ? new Date().toISOString() : undefined,
            completedDate: newStatus === 'completed' ? new Date().toISOString() : undefined
          } as Material);
        }
      }
      
      return { ...prev, materials: updatedMaterials };
    });

    try {
      const success = await updateMaterialStatusShared(projectId, thicknessSpecId, newStatus, {
        projects: projects as any[],
        thicknessSpecs: thicknessSpecs,
        user,
        updateProjectFn: updateProject as any,
        fetchProjectsFn: fetchProjects,
        setLoadingFn: setLoading,
      });
      
      if (success) {
        // 后台刷新项目详情确保数据一致性
        await fetchProjectDetail();
        // 材料状态更新成功，无需日志输出
      } else {
        // 如果失败，恢复原状态
        await fetchProjectDetail();
      }
    } catch (error) {
      // 更新材料状态失败，忽略错误日志
      // 恢复原状态
      await fetchProjectDetail();
    }
  };

  // 保存项目备注
  const handleSaveNotes = async () => {
    if (!project) return;
    
    setSavingNotes(true);
    try {
      const response = await apiRequest(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: projectNotes,
        }),
      });

      if (response.ok) {
        setProject(prev => prev ? { ...prev, description: projectNotes } : null);
        setEditingNotes(false);
        fetchProjects();
      }
    } catch (error) {
      // 保存备注错误，忽略错误日志
    } finally {
      setSavingNotes(false);
    }
  };

  // 编辑材料备注
  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setMaterialNotes(material.notes || '');
    setShowMaterialModal(true);
  };

  // 保存材料备注
  const handleSaveMaterialNotes = async () => {
    if (!editingMaterial || !token) return;

    try {
      const response = await apiRequest(`/api/materials/${editingMaterial.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: materialNotes,
        }),
      });

      if (response.ok) {
        setShowMaterialModal(false);
        await fetchProjectDetail();
      }
    } catch (error) {
      // 保存材料备注失败，忽略错误日志
    }
  };

  // 图纸上传成功回调
  const handleDrawingUploadSuccess = () => {
    fetchProjectDetail(); // 刷新项目详情以获取新上传的图纸
  };
  
  // 预览图纸
  const handlePreviewDrawing = (drawing: Drawing) => {
    setSelectedDrawing(drawing);
    setShowAdvancedDxfPreview(true);
  };

  // 高级预览图纸（与基础预览相同）
  const handleAdvancedPreviewDrawing = (drawing: Drawing) => {
    setSelectedDrawing(drawing);
    setShowAdvancedDxfPreview(true);
  };


  // 删除图纸
  const handleDeleteDrawing = async (drawingId: number, filename: string) => {
    const confirmed = await confirm(`确定要删除图纸 "${filename}" 吗？此操作不可撤销。`);
    if (!confirmed) return;

    try {
      const response = await apiRequest(`/api/drawings/${drawingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchProjectDetail();
        await alert('图纸删除成功！');
      }
    } catch (error) {
      // 删除图纸失败，忽略错误日志
    }
  };

  // 计算材料进度
  const getMaterialProgress = () => {
    if (!project || !project.materials || project.materials.length === 0) return { total: 0, completed: 0, inProgress: 0, pending: 0 };

    const total = project.materials.length;
    const completed = project.materials.filter(m => m.status === 'completed').length;
    const inProgress = project.materials.filter(m => m.status === 'in_progress').length;
    const pending = project.materials.filter(m => m.status === 'pending').length;

    return { total, completed, inProgress, pending };
  };

  // 计算碳板进度（优先显示）
  const getCarbonProgress = () => {
    if (!project || !project.materials) return { carbon: { total: 0, completed: 0 }, special: { total: 0, completed: 0 } };

    const carbonMaterials = project.materials.filter(m => 
      m.thicknessSpec && (!m.thicknessSpec.materialType || m.thicknessSpec.materialType === '碳板')
    );
    const specialMaterials = project.materials.filter(m => 
      m.thicknessSpec && m.thicknessSpec.materialType && m.thicknessSpec.materialType !== '碳板'
    );

    return {
      carbon: {
        total: carbonMaterials.length,
        completed: carbonMaterials.filter(m => m.status === 'completed').length
      },
      special: {
        total: specialMaterials.length,
        completed: specialMaterials.filter(m => m.status === 'completed').length
      }
    };
  };

  // 获取项目工期统计
  const getProjectDuration = () => {
    if (!project || !project.materials || project.materials.length === 0) {
      return { startDate: null, endDate: null, duration: 0 };
    }

    const materialsWithDates = project.materials.filter(m => m.startDate || m.completedDate);
    if (materialsWithDates.length === 0) {
      return { startDate: null, endDate: null, duration: 0 };
    }

    const startDates = materialsWithDates.filter(m => m.startDate).map(m => new Date(m.startDate!));
    const endDates = materialsWithDates.filter(m => m.completedDate).map(m => new Date(m.completedDate!));

    const startDate = startDates.length > 0 ? new Date(Math.min(...startDates.map(d => d.getTime()))) : null;
    const endDate = endDates.length > 0 ? new Date(Math.max(...endDates.map(d => d.getTime()))) : null;
    
    let duration = 0;
    if (startDate && endDate) {
      duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return { startDate, endDate, duration };
  };

  if (loading) {
    return (
      <AdaptiveLayout direction="row" className={`items-center justify-center h-full ${className}`}>
        <Loading type="spinner" size="lg" />
      </AdaptiveLayout>
    );
  }

  if (!project) {
    return (
      <AdaptiveLayout direction="row" className={`items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-500">
          <p>项目不存在</p>
          <Button variant="secondary" onClick={onBack} className="mt-4">
            返回
          </Button>
        </div>
      </AdaptiveLayout>
    );
  }

  const { total, completed, inProgress, pending } = getMaterialProgress();
  const { carbon, special } = getCarbonProgress();
  const { startDate, endDate, duration } = getProjectDuration();
  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.pending;
  const priority = priorityConfig[project.priority as keyof typeof priorityConfig] || priorityConfig.normal;

  return (
    <ResponsiveContainer className={`h-full bg-gray-50 ${className}`} desktopClassName="flex flex-col">
      {/* 统一的项目头部区域 */}
      <Card padding="none" className="bg-white shadow-sm flex-shrink-0">
        {/* 返回按钮区域 */}
        <div className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'} border-b border-gray-100`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>{isMobile ? '返回' : '返回项目列表'}</span>
          </Button>
        </div>

        {/* 项目信息主体 */}
        <div className={isMobile ? 'px-4 py-4' : 'px-6 py-6'}>
          <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-col lg:flex-row lg:items-center lg:justify-between gap-4'}`}>
            {/* 左侧：项目基本信息 */}
            <div className="flex-1">
              {/* 移动端：标题独占一行 */}
              <div className={isMobile ? 'mb-3' : 'flex items-center gap-3 mb-3'}>
                <h1 className={`font-bold text-gray-900 ${isMobile ? "text-lg mb-2" : "text-2xl"} leading-tight`}>
                  {project.name}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge className={`${status.color} px-2 py-1`} size="sm">
                    {status.label}
                  </Badge>
                  <Badge className={`${priority.color} px-2 py-1`} size="sm" variant="outline">
                    {priority.label}
                  </Badge>
                </div>
              </div>
              
              {/* 项目元信息 - 移动端垂直显示 */}
              <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-4'} text-sm text-gray-600`}>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {formatDate(project.createdAt)}
                </span>
                {project.assignedWorker && (
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-4 h-4" />
                    {project.assignedWorker.name}
                  </span>
                )}
                {(project as any).creator && (
                  <span className="flex items-center gap-1">
                    <DocumentIcon className="w-4 h-4" />
                    {(project as any).creator.name}
                  </span>
                )}
              </div>
            </div>

            {/* 右侧：快速统计 - 移动端网格布局 */}
            <div className={`${isMobile ? 'grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100' : 'flex items-center gap-6'} text-sm`}>
              <div className="text-center">
                <div className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>{total}</div>
                <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>{isMobile ? '总数' : '板材总数'}</div>
              </div>
              <div className="text-center">
                <div className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-green-600`}>{completed}</div>
                <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>完成</div>
              </div>
              <div className="text-center">
                <div className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-blue-600`}>{inProgress}</div>
                <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>进行</div>
              </div>
              <div className="text-center">
                <div className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-yellow-600`}>{pending}</div>
                <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>待处理</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab导航区域 */}
        <div className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'} border-t border-gray-100 bg-gray-50`}>
          <TabBar
            tabs={[
              { 
                id: 'overview', 
                label: '概览', 
                icon: <DocumentTextIcon className="w-4 h-4" />
              },
              { 
                id: 'materials', 
                label: '板材', 
                icon: <CogIcon className="w-4 h-4" />,
                badge: total
              },
              { 
                id: 'drawings', 
                label: '图纸', 
                icon: <PhotoIcon className="w-4 h-4" />,
                badge: project.drawings.length
              },
              { 
                id: 'history', 
                label: '历史', 
                icon: <ClockIcon className="w-4 h-4" />
              }
            ]}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as any)}
            variant="modern"
            size={isMobile ? "sm" : "md"}
          />
        </div>
      </Card>

      {/* 主内容区 - 移动端适配 */}
      <ResponsiveContainer 
        className="overflow-auto mt-4 flex-1"
        mobileClassName="pb-20"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <OverviewSection 
              project={project}
              carbon={carbon}
              special={special}
              total={total}
              completed={completed}
              inProgress={inProgress}
              pending={pending}
              startDate={startDate}
              endDate={endDate}
              duration={duration}
              projectNotes={projectNotes}
              setProjectNotes={setProjectNotes}
              editingNotes={editingNotes}
              setEditingNotes={setEditingNotes}
              savingNotes={savingNotes}
              handleSaveNotes={handleSaveNotes}
            />
          )}

          {activeTab === 'materials' && (
            <MaterialsSection 
              project={project}
              thicknessSpecs={thicknessSpecs}
              onMaterialStatusChange={handleMaterialStatusChange}
              onEditMaterial={handleEditMaterial}
              token={token}
              fetchProjectDetail={fetchProjectDetail}
            />
          )}

          {activeTab === 'drawings' && (
            <DrawingsSection 
              project={project}
              onUploadClick={() => setShowUploadModal(true)}
              onDeleteDrawing={handleDeleteDrawing}
              onPreviewDrawing={handlePreviewDrawing}
              onAdvancedPreviewDrawing={handleAdvancedPreviewDrawing}
            />
          )}

          {activeTab === 'history' && (
            <HistorySection 
              projectId={projectId}
              operationHistory={operationHistory}
              onRefresh={fetchOperationHistory}
            />
          )}
        </AnimatePresence>
      </ResponsiveContainer>

      {/* 材料编辑模态框 */}
      <Modal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="备注"
            value={materialNotes}
            onChange={(e) => setMaterialNotes(e.target.value)}
            placeholder="添加材料备注..."
            size="md"
            resize="none"
            className="h-24"
          />
          <AdaptiveLayout direction="row" gap="sm" className="justify-end">
            <Button variant="secondary" onClick={() => setShowMaterialModal(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSaveMaterialNotes}>
              保存
            </Button>
          </AdaptiveLayout>
        </div>
      </Modal>

      {/* 图纸上传组件 - 使用统一的DrawingUpload组件，传递项目ID */}
      <DrawingUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleDrawingUploadSuccess}
        projectId={projectId}
      />

      
      {/* 高级DXF预览模态框 */}
      <AdvancedDxfModal
        drawing={selectedDrawing}
        isOpen={showAdvancedDxfPreview}
        onClose={() => {
          setShowAdvancedDxfPreview(false);
          setSelectedDrawing(null);
        }}
      />

      <DialogRenderer />
    </ResponsiveContainer>
  );
};

// 概览子组件
const OverviewSection = ({ 
  project, carbon, special, total, completed, inProgress, pending, 
  startDate, endDate, duration, projectNotes, setProjectNotes, 
  editingNotes, setEditingNotes, savingNotes, handleSaveNotes 
}: any) => {
  const { isMobile, isTablet } = useResponsive();
  
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={isMobile ? "p-4 space-y-4" : "p-6 space-y-6"}
    >
      {/* 项目概览卡片 - 移动端适配 */}
      <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : isTablet ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-4"}`}>
      {/* 项目基本信息 */}
      <Card className={isMobile ? "p-4" : "p-6"}>
        <AdaptiveLayout direction="row" gap="sm" className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-gray-900 mb-4 items-center`}>
          <UserIcon className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
          <span>项目信息</span>
        </AdaptiveLayout>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-500">创建者</span>
            <p className="font-medium">{project.creator?.name || '未知'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">负责工人</span>
            <p className="font-medium">{project.assignedWorker?.name || '未分配'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">更新时间</span>
            <p className="font-medium">{formatDate(project.updatedAt)}</p>
          </div>
        </div>
      </Card>

      {/* 碳板进度（优先显示） */}
      <Card className={isMobile ? "p-4" : "p-6"}>
        <h3 className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-gray-900 mb-4`}>碳板进度</h3>
        <div className="space-y-4">
          <div>
            <AdaptiveLayout direction="row" className="items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">碳板</span>
              <span className="text-sm text-gray-500">{carbon.completed}/{carbon.total}</span>
            </AdaptiveLayout>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${carbon.total > 0 ? (carbon.completed / carbon.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          {special.total > 0 && (
            <div>
              <AdaptiveLayout direction="row" className="items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">特殊材料</span>
                <span className="text-sm text-gray-500">{special.completed}/{special.total}</span>
              </AdaptiveLayout>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${special.total > 0 ? (special.completed / special.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 整体统计 */}
      <Card className={isMobile ? "p-4" : "p-6"}>
        <h3 className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-gray-900 mb-4`}>整体统计</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={`${isMobile ? "text-xl" : "text-2xl"} font-bold text-green-600`}>{completed}</div>
            <div className="text-xs text-gray-500">已完成</div>
          </div>
          <div className="text-center">
            <div className={`${isMobile ? "text-xl" : "text-2xl"} font-bold text-blue-600`}>{inProgress}</div>
            <div className="text-xs text-gray-500">进行中</div>
          </div>
          <div className="text-center">
            <div className={`${isMobile ? "text-xl" : "text-2xl"} font-bold text-yellow-600`}>{pending}</div>
            <div className="text-xs text-gray-500">待处理</div>
          </div>
          <div className="text-center">
            <div className={`${isMobile ? "text-xl" : "text-2xl"} font-bold text-gray-600`}>{total}</div>
            <div className="text-xs text-gray-500">总计</div>
          </div>
        </div>
      </Card>

      {/* 工期统计 */}
      <Card className={isMobile ? "p-4" : "p-6"}>
        <AdaptiveLayout direction="row" gap="sm" className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-gray-900 mb-4 items-center`}>
          <CalendarIcon className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
          <span>工期统计</span>
        </AdaptiveLayout>
        <div className="space-y-3">
          {startDate ? (
            <div>
              <span className="text-sm text-gray-500">开始日期</span>
              <p className="font-medium">{formatDate(startDate.toISOString())}</p>
            </div>
          ) : (
            <div>
              <span className="text-sm text-gray-500">开始日期</span>
              <p className="font-medium text-gray-400">未开始</p>
            </div>
          )}
          
          {endDate ? (
            <div>
              <span className="text-sm text-gray-500">完成日期</span>
              <p className="font-medium">{formatDate(endDate.toISOString())}</p>
            </div>
          ) : (
            <div>
              <span className="text-sm text-gray-500">完成日期</span>
              <p className="font-medium text-gray-400">未完成</p>
            </div>
          )}
          
          <div>
            <span className="text-sm text-gray-500">工期</span>
            <p className="font-medium">{duration > 0 ? `${duration} 天` : '计算中'}</p>
          </div>
        </div>
      </Card>
    </div>

    {/* 项目备注 */}
    <Card className={isMobile ? "p-4" : "p-6"}>
      <AdaptiveLayout direction="row" className="items-center justify-between mb-4">
        <h3 className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-gray-900`}>项目备注</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditingNotes(!editingNotes)}
        >
          <PencilIcon className="w-4 h-4 mr-2" />
          {editingNotes ? '取消' : '编辑'}
        </Button>
      </AdaptiveLayout>
      
      {editingNotes ? (
        <div className="space-y-4">
          <Textarea
            value={projectNotes}
            onChange={(e) => setProjectNotes(e.target.value)}
            placeholder="添加项目备注..."
            size="md"
            resize="none"
            className="h-32"
          />
          <AdaptiveLayout direction="row" gap="sm" className="justify-end">
            <Button variant="secondary" size="sm" onClick={() => setEditingNotes(false)}>
              取消
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? '保存中...' : '保存'}
            </Button>
          </AdaptiveLayout>
        </div>
      ) : (
        <div className="text-gray-700 whitespace-pre-wrap">
          {project.description || '暂无备注'}
        </div>
      )}
    </Card>
  </motion.div>
);
};

// 材料管理子组件 - 采用类似ActiveProjectCard的样式
const MaterialsSection: React.FC<{
  project: Project;
  thicknessSpecs: ThicknessSpec[];
  onMaterialStatusChange: (thicknessSpecId: number, newStatus: StatusType) => void;
  onEditMaterial: (material: Material) => void;
  token: string | null;
  fetchProjectDetail: () => Promise<void>;
}> = ({ project, thicknessSpecs, onMaterialStatusChange, onEditMaterial, token, fetchProjectDetail }) => {
  const { isMobile, isTablet } = useResponsive();


  // 状态配置（与ActiveProjectCard保持一致）
  const statusConfig = {
    pending: { 
      color: 'bg-gray-100 text-gray-800', 
      textColor: 'text-gray-800',
      label: '待处理' 
    },
    in_progress: { 
      color: 'bg-blue-100 text-blue-800', 
      textColor: 'text-blue-800',
      label: '进行中' 
    },
    completed: { 
      color: 'bg-green-100 text-green-800', 
      textColor: 'text-green-800',
      label: '已完成' 
    }
  };

  // 获取材料状态的辅助函数
  const getMaterialStatus = (thicknessSpecId: number): StatusType | null => {
    const material = project.materials.find(m => m.thicknessSpecId === thicknessSpecId);
    return material?.status || null;
  };

  // 获取材料代码
  const getMaterialCode = (materialType?: string) => {
    const typeMap: { [key: string]: string } = {
      '碳板': 'T',     // T = 碳板
      '不锈钢': 'B',   // B = 不锈钢  
      '锰板': 'M',     // M = 锰板
      '钢板': 'S'      // S = 钢板
    };
    return typeMap[materialType || '碳板'] || 'T'; // 默认返回T（碳板）
  };

  // 获取下一个状态（统一状态切换逻辑）
  const getNextStatus = (currentStatus: StatusType | null): StatusType => {
    switch (currentStatus) {
      case null:
      case 'pending':
        return 'in_progress';
      case 'in_progress':
        return 'completed';
      case 'completed':
        return 'pending';
      default:
        return 'pending';
    }
  };

  // 处理状态点击（统一的处理函数）
  const handleStatusClick = (specId: number, currentStatus: StatusType | null) => {
    const nextStatus = getNextStatus(currentStatus);
    onMaterialStatusChange(specId, nextStatus);
  };

  // 获取材料信息的辅助函数
  const getMaterial = (thicknessSpecId: number): Material | null => {
    return project.materials.find(m => m.thicknessSpecId === thicknessSpecId) || null;
  };

  // 排序材料（与ActiveProjectCard保持一致）
  const sortThicknessSpecs = (specs: ThicknessSpec[]) => {
    return specs.sort((a, b) => {
      // 首先按材料类型排序：碳板优先
      const aType = a.materialType || '碳板';
      const bType = b.materialType || '碳板';
      
      if (aType === '碳板' && bType !== '碳板') return -1;
      if (aType !== '碳板' && bType === '碳板') return 1;
      
      // 同类材料按厚度排序
      return parseFloat(a.thickness) - parseFloat(b.thickness);
    });
  };

  // 按材料类型分组并排序 - 只显示项目实际使用的板材厚度
  const projectMaterialSpecs = thicknessSpecs.filter(spec => 
    project.materials.some(material => material.thicknessSpecId === spec.id)
  );
  
  const carbonSpecs = sortThicknessSpecs(
    projectMaterialSpecs.filter(spec => 
      !spec.materialType || spec.materialType === '碳板'
    )
  );
  const specialSpecs = sortThicknessSpecs(
    projectMaterialSpecs.filter(spec => 
      spec.materialType && spec.materialType !== '碳板'
    )
  );

  // 格式化日期（与ActiveProjectCard保持一致）
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未设置';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 渲染厚度规格按钮
  const renderThicknessButton = (spec: ThicknessSpec) => {
    const status = getMaterialStatus(spec.id);
    const material = getMaterial(spec.id);
    
    // 如果没有状态，默认为pending
    const currentStatus = status || 'pending';
    const config = statusConfig[currentStatus];
    
    return (
      <div key={spec.id} className="flex flex-col items-center min-w-0">
        {/* 状态切换按钮 - 参考GitHub仓库设计 */}
        <button
          type="button"
          className={`w-full py-1 sm:py-1.5 rounded text-xs font-medium ${config.color} ${config.textColor} hover:opacity-80 transition-all hover:scale-105 border border-transparent hover:border-gray-300 cursor-pointer min-h-[28px] sm:min-h-[32px]`}
          onClick={() => handleStatusClick(spec.id, status)}
        >
          <span className="truncate block px-1">
            {getMaterialCode(spec.materialType)}{parseFloat(spec.thickness)}
          </span>
        </button>
        
        {/* 时间信息显示 - 当有时间数据时才显示 - 确保显示在按钮下方 */}
        {(material?.startDate || material?.completedDate || material?.completedByUser) && (
          <div className="w-full text-xs text-gray-500 text-center leading-tight mt-1">
            {material?.startDate && <div className="truncate">始: {formatDate(material.startDate)}</div>}
            {material?.completedDate && <div className="truncate">完: {formatDate(material.completedDate)}</div>}
            {material?.completedByUser && <div className="truncate">人: {material.completedByUser.name}</div>}
          </div>
        )}
      </div>
    );
  };

  // 计算各分组的进度统计
  const getCarbonStats = () => {
    const carbonMaterials = project.materials.filter(m => {
      const spec = thicknessSpecs.find(s => s.id === m.thicknessSpecId);
      return spec && (!spec.materialType || spec.materialType === '碳板');
    });
    return {
      total: carbonSpecs.length,
      started: carbonMaterials.length,
      completed: carbonMaterials.filter(m => m.status === 'completed').length,
      inProgress: carbonMaterials.filter(m => m.status === 'in_progress').length
    };
  };

  const getSpecialStats = () => {
    const specialMaterials = project.materials.filter(m => {
      const spec = thicknessSpecs.find(s => s.id === m.thicknessSpecId);
      return spec && spec.materialType && spec.materialType !== '碳板';
    });
    return {
      total: specialSpecs.length,
      started: specialMaterials.length,
      completed: specialMaterials.filter(m => m.status === 'completed').length,
      inProgress: specialMaterials.filter(m => m.status === 'in_progress').length
    };
  };

  const carbonStats = getCarbonStats();
  const specialStats = getSpecialStats();

  return (
    <motion.div
      key="materials"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={isMobile ? "p-4 space-y-4" : "p-6 space-y-6"}
    >
      {/* 碳板材料区域 */}
      {carbonSpecs.length > 0 && (
        <div>
          <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'} mb-4`}>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-blue-900`}>
              碳板材料 ({carbonSpecs.length}种)
            </h3>
            <div className={`${isMobile ? 'flex flex-wrap gap-1' : 'flex items-center gap-2'}`}>
              <Badge variant="primary" size="sm">
                {carbonStats.completed}/{carbonStats.total} 完成
              </Badge>
              <Badge variant="secondary" size="sm">
                {carbonStats.inProgress} 进行
              </Badge>
              <Badge variant="secondary" size="sm">
                {carbonStats.started}/{carbonStats.total} 开始
              </Badge>
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="mb-4">
            <div className={`flex justify-between ${isMobile ? 'text-xs' : 'text-sm'} text-blue-800 mb-1`}>
              <span>完成进度</span>
              <span>{carbonStats.total > 0 ? Math.round((carbonStats.completed / carbonStats.total) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${carbonStats.total > 0 ? (carbonStats.completed / carbonStats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 厚度规格按钮网格 - 移动端适配 */}
          <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10'}`}>
            {carbonSpecs.map(renderThicknessButton)}
          </div>
        </div>
      )}

      {/* 特殊材料区域 */}
      {specialSpecs.length > 0 && (
        <div>
          <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'} mb-4`}>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-orange-900`}>
              特殊材料 ({specialSpecs.length}种)
            </h3>
            <div className={`${isMobile ? 'flex flex-wrap gap-1' : 'flex items-center gap-2'}`}>
              <Badge variant="warning" size="sm">
                {specialStats.completed}/{specialStats.total} 完成
              </Badge>
              <Badge variant="secondary" size="sm">
                {specialStats.inProgress} 进行
              </Badge>
              <Badge variant="secondary" size="sm">
                {specialStats.started}/{specialStats.total} 开始
              </Badge>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mb-4">
            <div className={`flex justify-between ${isMobile ? 'text-xs' : 'text-sm'} text-orange-800 mb-1`}>
              <span>完成进度</span>
              <span>{specialStats.total > 0 ? Math.round((specialStats.completed / specialStats.total) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${specialStats.total > 0 ? (specialStats.completed / specialStats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 厚度规格按钮网格 - 移动端适配 */}
          <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'}`}>
            {specialSpecs.map(renderThicknessButton)}
          </div>
        </div>
      )}

      {carbonSpecs.length === 0 && specialSpecs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <CogIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className={isMobile ? 'text-sm' : 'text-base'}>该项目暂无板材</p>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} mt-2`}>项目还没有分配任何板材规格</p>
        </div>
      )}

      {/* 板材分配管理区域 - 移动端隐藏复杂表格 */}
      {!isMobile && (
        <AllocationTabsSection 
          project={project}
          thicknessSpecs={thicknessSpecs}
          onAllocationComplete={async () => {
            await fetchProjectDetail();
          }}
          fetchProjectDetail={fetchProjectDetail}
        />
      )}
      
      {/* 移动端简化提示 */}
      {isMobile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            💡 板材分配功能请在桌面端使用，获得更好的操作体验
          </p>
        </div>
      )}

      {/* 借用管理区域 - 移动端简化 */}
      <div className={`${isMobile ? 'mt-4 pt-4' : 'mt-6 pt-6'} border-t border-gray-200`}>
        <div className={`flex items-center mb-4 ${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900`}>
          <TruckIcon className="w-5 h-5 mr-2 text-blue-500" />
          板材借用详情
        </div>
        <ProjectBorrowingDetails
          projectId={project.id}
          projectName={project.name}
          isOpen={true}
          onClose={() => {}}
        />
      </div>
    </motion.div>
  );
};


// 图纸管理子组件
const DrawingsSection: React.FC<{
  project: Project;
  onUploadClick: () => void;
  onDeleteDrawing: (drawingId: number, filename: string) => void;
  onPreviewDrawing: (drawing: Drawing) => void;
  onAdvancedPreviewDrawing: (drawing: Drawing) => void;
}> = ({ project, onUploadClick, onDeleteDrawing, onPreviewDrawing, onAdvancedPreviewDrawing }) => {
  return (
    <motion.div
      key="drawings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      <AdaptiveLayout direction="row" className="items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">项目图纸</h3>
        <AdaptiveLayout direction="row" gap="sm" className="items-center space-x-3">
          <Badge variant="secondary">{project.drawings.length} 个文件</Badge>
          <Button variant="primary" size="sm" onClick={onUploadClick}>
            <CloudArrowUpIcon className="w-4 h-4 mr-2" />
            上传图纸
          </Button>
        </AdaptiveLayout>
      </AdaptiveLayout>

      {project.drawings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {project.drawings.map((drawing) => (
            <motion.div
              key={drawing.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <AdaptiveLayout direction="row" className="items-start justify-between mb-3">
                  <div style={{flex: 1}}>
                    <h4 className="font-medium text-gray-900 truncate" title={drawing.originalFilename}>
                      {drawing.originalFilename}
                    </h4>
                    <p className="text-sm text-gray-500">版本 {drawing.version}</p>
                  </div>
                  <AdaptiveLayout direction="row" gap="sm" className="items-center space-x-1 ml-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onPreviewDrawing(drawing)}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onAdvancedPreviewDrawing(drawing)}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <FireIcon className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDeleteDrawing(drawing.id, drawing.originalFilename || '')}
                      className="text-red-600 hover:text-red-700"
                      
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </AdaptiveLayout>
                </AdaptiveLayout>
                
                <div className="text-xs text-gray-500">
                  <div>上传者: {drawing.uploader?.name || '未知'}</div>
                  <div>时间: {formatDate(drawing.uploadTime)}</div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="mb-4">暂无图纸文件</p>
          <Button variant="primary" onClick={onUploadClick}>
            <CloudArrowUpIcon className="w-4 h-4 mr-2" />
            上传第一个图纸
          </Button>
        </div>
      )}
    </motion.div>
  );
};

// 历史记录子组件
const HistorySection: React.FC<{
  projectId: number;
  operationHistory: OperationHistory[];
  onRefresh: () => void;
}> = ({ projectId, operationHistory, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('all');

  // 状态翻译
  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': '待处理',
      'in_progress': '进行中', 
      'completed': '已完成',
      'cancelled': '已取消',
      'low': '低',
      'medium': '中',
      'high': '高',
      'urgent': '紧急'
    };
    return statusMap[status] || status;
  };

  // 获取业务友好的操作描述和图标
  const getBusinessDescription = (record: OperationHistory) => {
    const { operationType, operationDescription, operator, details } = record;
    
    switch (operationType) {
      case 'material_start':
        return {
          title: `${operator.name} 开始处理板材`,
          description: `项目：${details?.projectName || ''} | ${details?.materialType || ''} ${details?.thickness || ''}mm`,
          icon: <PlayIcon className="w-4 h-4 text-white" />,
          status: 'info' as const
        };
        
      case 'material_complete':
        const duration = details?.duration ? ` | 用时：${details.duration}` : '';
        return {
          title: `${operator.name} 完成板材加工`,
          description: `项目：${details?.projectName || ''} | ${details?.materialType || ''} ${details?.thickness || ''}mm${duration}`,
          icon: <CheckCircleIcon className="w-4 h-4 text-white" />,
          status: 'success' as const
        };
        
      case 'material_update':
        const oldStatus = translateStatus(details?.oldStatus || '');
        const newStatus = translateStatus(details?.newStatus || '');
        return {
          title: `${operator.name} 更新板材状态`,
          description: `${details?.materialType || ''} ${details?.thickness || ''}mm (${oldStatus} → ${newStatus})`,
          icon: <CogIcon className="w-4 h-4 text-white" />,
          status: 'info' as const
        };
        
      case 'material_transfer':
        return {
          title: `${operator.name} 转移板材`,
          description: `将 ${details?.quantity || ''}张 ${details?.materialType || ''} ${details?.thickness || ''}mm 转移给 ${details?.targetWorker || ''}`,
          icon: <ArrowRightIcon className="w-4 h-4 text-white" />,
          status: 'warning' as const
        };
        
      case 'requirement_add':
        return {
          title: `${operator.name} 添加材料需求`,
          description: `项目：${details?.projectName || ''} | 需求：${details?.materialType || ''} ${details?.thickness || ''}mm ${details?.dimensions || ''} ${details?.quantity || ''}张`,
          icon: <PlusIcon className="w-4 h-4 text-white" />,
          status: 'info' as const
        };
        
      case 'material_allocate':
        return {
          title: `${operator.name} 分配板材`,
          description: `为项目${details?.projectName || ''}分配了 ${details?.quantity || ''}张板材，来源：${details?.sources || ''}`,
          icon: <UserIcon className="w-4 h-4 text-white" />,
          status: 'success' as const
        };
        
      case 'drawing_upload':
        const isDelete = details?.action === 'delete';
        return {
          title: `${operator.name} ${isDelete ? '删除' : '上传'}图纸`,
          description: `项目：${details?.projectName || ''} | 文件：${details?.filename || operationDescription}`,
          icon: isDelete ? <TrashIcon className="w-4 h-4 text-white" /> : <PhotoIcon className="w-4 h-4 text-white" />,
          status: isDelete ? 'warning' as const : 'success' as const
        };
        
      case 'project_create':
        return {
          title: `${operator.name} 创建项目`,
          description: `项目名称：${details?.projectName || operationDescription}`,
          icon: <PlusIcon className="w-4 h-4 text-white" />,
          status: 'success' as const
        };
        
      case 'project_update':
        // 解析operationDescription中的状态信息
        let description = `项目：${details?.projectName || ''} | ${operationDescription}`;
        if (operationDescription && operationDescription.includes('→')) {
          // 如果描述中包含状态变更，翻译状态
          description = operationDescription.replace(/pending/g, '待处理')
            .replace(/in_progress/g, '进行中')
            .replace(/completed/g, '已完成')
            .replace(/cancelled/g, '已取消');
          description = `项目：${details?.projectName || ''} | ${description}`;
        }
        return {
          title: `${operator.name} 更新项目`,
          description: description,
          icon: <PencilIcon className="w-4 h-4 text-white" />,
          status: 'info' as const
        };
        
      case 'project_status_change':
        const fromStatus = translateStatus(details?.fromStatus || '');
        const toStatus = translateStatus(details?.toStatus || '');
        return {
          title: `${operator.name} 变更项目状态`,
          description: `项目：${details?.projectName || ''} | 状态：${fromStatus} → ${toStatus}`,
          icon: <ExclamationCircleIcon className="w-4 h-4 text-white" />,
          status: 'warning' as const
        };

      case 'worker_assign':
        return {
          title: `${operator.name} 分配工人`,
          description: `项目：${details?.projectName || ''} | 工人：${details?.oldWorkerName || '无'} → ${details?.newWorkerName || '无'}`,
          icon: <UserIcon className="w-4 h-4 text-white" />,
          status: 'info' as const
        };

      case 'project_milestone':
        return {
          title: `${operator.name} 达成里程碑`,
          description: `项目：${details?.projectName || ''} | 里程碑：${details?.milestone || ''}`,
          icon: <CheckCircleIcon className="w-4 h-4 text-white" />,
          status: 'success' as const
        };

      case 'priority_change':
        const oldPriority = translateStatus(details?.oldPriority || '');
        const newPriority = translateStatus(details?.newPriority || '');
        return {
          title: `${operator.name} 调整优先级`,
          description: `项目：${details?.projectName || ''} | 优先级：${oldPriority} → ${newPriority}`,
          icon: <TagIcon className="w-4 h-4 text-white" />,
          status: 'warning' as const
        };

      case 'project_delete':
        return {
          title: `${operator.name} 删除项目`,
          description: `项目名称：${details?.projectName || operationDescription}`,
          icon: <TrashIcon className="w-4 h-4 text-white" />,
          status: 'error' as const
        };
        
      default:
        // 对于未识别的操作类型，也尝试翻译描述中的状态
        let translatedDescription = operationDescription || '未知操作';
        if (translatedDescription.includes('→')) {
          translatedDescription = translatedDescription.replace(/pending/g, '待处理')
            .replace(/in_progress/g, '进行中')
            .replace(/completed/g, '已完成')
            .replace(/cancelled/g, '已取消');
        }
        return {
          title: translatedDescription,
          description: `操作者：${operator.name}`,
          icon: <DocumentTextIcon className="w-4 h-4 text-white" />,
          status: 'info' as const
        };
    }
  };

  // 筛选选项
  const filterOptions = [
    { value: 'all', label: '全部操作' },
    { value: 'material', label: '板材操作' },
    { value: 'project', label: '项目操作' },
    { value: 'drawing', label: '图纸操作' },
    { value: 'requirement', label: '需求管理' }
  ];

  // 筛选操作历史
  const filteredHistory = operationHistory.filter(record => {
    if (filterType === 'all') return true;
    
    switch (filterType) {
      case 'material':
        return ['material_start', 'material_complete', 'material_transfer', 'material_allocate', 'material_update'].includes(record.operationType);
      case 'project':
        return ['project_create', 'project_update', 'project_status_change', 'worker_assign', 'project_milestone', 'priority_change', 'project_delete'].includes(record.operationType);
      case 'drawing':
        return ['drawing_upload'].includes(record.operationType);
      case 'requirement':
        return ['requirement_add', 'requirement_allocate'].includes(record.operationType);
      default:
        return true;
    }
  });

  // 转换为Timeline所需的数据格式
  const timelineItems: TimelineItem[] = filteredHistory.map(record => {
    const businessInfo = getBusinessDescription(record);
    
    return {
      id: record.id.toString(),
      title: businessInfo.title,
      description: businessInfo.description,
      timestamp: new Date(record.created_at),
      icon: businessInfo.icon,
      status: businessInfo.status
    };
  });

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      {/* 标题和控制栏 */}
      <AdaptiveLayout direction="row" className="items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">项目操作记录</h3>
        <AdaptiveLayout direction="row" gap="sm" className="items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            刷新
          </Button>
        </AdaptiveLayout>
      </AdaptiveLayout>

      {/* 筛选控制 */}
      <AdaptiveLayout direction="row" className="items-center justify-between bg-gray-50 p-4 rounded-lg">
        <AdaptiveLayout direction="row" gap="sm" className="items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">筛选类型：</span>
          <Select
            value={filterType}
            onChange={(value) => setFilterType(value.toString())}
            options={filterOptions}
            className="w-32"
          />
        </AdaptiveLayout>
        <span className="text-xs text-gray-500">共 {filteredHistory.length} 条记录</span>
      </AdaptiveLayout>

      {/* 时间轴内容 */}
      {timelineItems.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Timeline
            items={timelineItems}
            mode="left"
            size="md"
            pending={"持续记录项目操作中..."}
          />
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <ClockIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">暂无操作记录</h4>
          <p className="text-gray-500">
            {filterType === 'all' ? '该项目还没有任何操作记录' : `没有找到「${filterOptions.find(opt => opt.value === filterType)?.label}」相关的操作记录`}
          </p>
          {filterType !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterType('all')}
              className="mt-3"
            >
              查看所有记录
            </Button>
          )}
        </div>
      )}

      {/* 说明信息 */}
      {timelineItems.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">操作记录说明</h4>
          <div className="text-xs text-blue-700 space-y-1">
            <AdaptiveLayout direction="row" gap="sm" className="items-center space-x-2">
              <PlayIcon className="w-3 h-3" />
              <span>开始处理 - 工人开始处理某项板材加工任务</span>
            </AdaptiveLayout>
            <AdaptiveLayout direction="row" gap="sm" className="items-center space-x-2">
              <CheckCircleIcon className="w-3 h-3" />
              <span>完成加工 - 工人完成板材加工并记录用时</span>
            </AdaptiveLayout>
            <AdaptiveLayout direction="row" gap="sm" className="items-center space-x-2">
              <ArrowRightIcon className="w-3 h-3" />
              <span>转移板材 - 工人之间的板材资源转移</span>
            </AdaptiveLayout>
            <AdaptiveLayout direction="row" gap="sm" className="items-center space-x-2">
              <UserIcon className="w-3 h-3" />
              <span>分配材料 - 为项目分配所需的板材资源</span>
            </AdaptiveLayout>
            <AdaptiveLayout direction="row" gap="sm" className="items-center space-x-2">
              <PlusIcon className="w-3 h-3" />
              <span>添加需求 - 项目新增材料需求或创建项目</span>
            </AdaptiveLayout>
          </div>
        </div>
      )}
    </motion.div>
  );
};


// 直接分配区域组件 - 一步到位的板材分配
const DirectAllocationSection: React.FC<{
  project: Project;
  thicknessSpecs: ThicknessSpec[];
  onAllocationComplete: () => Promise<void>;
  workers: any[];
  workerMaterials: any[];
  fetchWorkerMaterials: () => Promise<void>;
}> = ({ project, thicknessSpecs, onAllocationComplete, workers, workerMaterials, fetchWorkerMaterials }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // 为每个材料规格维护分配状态
  const [allocationStates, setAllocationStates] = useState<Record<number, {
    quantity: number;
    selectedWorkerId: number | null;
    selectedWorkerMaterialId: number | null;
    selectedDimensionId: number | null;
    availableQuantity: number;
  }>>({});

  // 初始化分配状态 - 只在项目材料变化时更新
  useEffect(() => {
    if (project.materials.length > 0) {
      const initialStates: Record<number, any> = {};
      project.materials.forEach(material => {
        if (material.thicknessSpec) {
          // 只有未分配的材料才初始化为1，已分配的使用实际数量
          const isAllocated = material.assignedFromWorkerMaterialId && (material.quantity || 0) > 0;
          initialStates[material.thicknessSpecId] = {
            quantity: isAllocated ? (material.quantity || 0) : 1, // 未分配的默认1张，已分配的用实际数量
            selectedWorkerId: null,
            selectedWorkerMaterialId: null,
            selectedDimensionId: null,
            availableQuantity: 0
          };
        }
      });
      setAllocationStates(initialStates);
    }
  }, [project.materials]);


  // 获取指定厚度规格的可用工人材料
  const getAvailableWorkerMaterials = (thicknessSpecId: number) => {
    return workerMaterials.filter(wm => 
      wm.thicknessSpecId === thicknessSpecId && 
      wm.quantity > 0
    );
  };

  // 获取指定工人材料的可用尺寸
  const getAvailableDimensions = (workerMaterialId: number) => {
    const workerMaterial = workerMaterials.find(wm => wm.id === workerMaterialId);
    if (!workerMaterial || !workerMaterial.dimensions) return [];
    
    const { dimensions, quantity: currentStock } = workerMaterial;
    
    // 计算所有尺寸的总量
    const totalDimensionQuantity = dimensions.reduce((sum: number, dim: any) => sum + dim.quantity, 0);
    
    // 数据一致性检查
    const isConsistent = totalDimensionQuantity === currentStock;
    
    // 如果数据一致，直接返回尺寸数据
    if (isConsistent) {
      return dimensions.filter((dim: any) => dim.quantity > 0);
    }
    
    // 如果数据不一致，使用比例计算作为兜底
    if (totalDimensionQuantity === 0 || currentStock === 0) return [];
    
    const ratio = currentStock / totalDimensionQuantity;
    
    return dimensions.map((dim: any) => {
      const actualAvailable = Math.floor(dim.quantity * ratio);
      
      return {
        ...dim,
        quantity: actualAvailable,
        originalQuantity: dim.quantity,
        isAdjusted: true
      };
    }).filter((dim: any) => dim.quantity > 0);
  };

  // 更新分配状态
  const updateAllocationState = (thicknessSpecId: number, updates: Partial<typeof allocationStates[0]>) => {
    setAllocationStates(prev => ({
      ...prev,
      [thicknessSpecId]: {
        ...prev[thicknessSpecId],
        ...updates
      }
    }));
  };

  // 处理工人选择变化
  const handleWorkerChange = (thicknessSpecId: number, workerId: number) => {
    const availableWorkerMaterials = getAvailableWorkerMaterials(thicknessSpecId).filter(wm => wm.workerId === workerId);
    const firstWorkerMaterial = availableWorkerMaterials[0];
    
    updateAllocationState(thicknessSpecId, {
      selectedWorkerId: workerId,
      selectedWorkerMaterialId: firstWorkerMaterial?.id || null,
      selectedDimensionId: null,
      availableQuantity: firstWorkerMaterial?.quantity || 0
    });
  };

  // 处理工人材料选择变化
  const handleWorkerMaterialChange = (thicknessSpecId: number, workerMaterialId: number) => {
    const workerMaterial = workerMaterials.find(wm => wm.id === workerMaterialId);
    
    updateAllocationState(thicknessSpecId, {
      selectedWorkerMaterialId: workerMaterialId,
      selectedDimensionId: null,
      availableQuantity: workerMaterial?.quantity || 0
    });
  };

  // 执行单个材料分配
  const handleSingleAllocation = async (thicknessSpecId: number) => {
    const state = allocationStates[thicknessSpecId];
    const material = project.materials.find(m => m.thicknessSpecId === thicknessSpecId);
    
    if (!state || !material || !state.selectedWorkerMaterialId) {
      return;
    }

    try {
      setLoading(true);

      const allocationData = {
        projectId: project.id,
        materialId: material.id,
        workerMaterialId: state.selectedWorkerMaterialId,
        allocateQuantity: state.quantity,
        dimensionId: state.selectedDimensionId,
        notes: `直接分配：${state.quantity}张给项目${project.name}`
      };

      const response = await apiRequest('/api/materials/allocate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(allocationData)
      });

      if (response.ok) {
        await onAllocationComplete();
        // 重新获取库存信息
        await fetchWorkerMaterials();
      }
    } catch (error) {
      console.error('分配失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 执行所有材料的一键分配
  const handleBatchAllocation = async () => {
    const validAllocations = unallocatedMaterials.filter(material => {
      const state = allocationStates[material.thicknessSpecId];
      return state && 
             state.selectedWorkerMaterialId && 
             state.quantity > 0 && 
             state.quantity <= state.availableQuantity;
    });
    
    if (validAllocations.length === 0) {
      return;
    }

    try {
      setLoading(true);

      // 并行执行所有分配
      const allocationPromises = validAllocations.map(async (material) => {
        const state = allocationStates[material.thicknessSpecId];
        
        const allocationData = {
          projectId: project.id,
          materialId: material.id,
          workerMaterialId: state.selectedWorkerMaterialId,
          allocateQuantity: state.quantity,
          dimensionId: state.selectedDimensionId,
          notes: `批量分配：${state.quantity}张给项目${project.name}`
        };
        
        return apiRequest('/api/materials/allocate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(allocationData)
        });
      });

      const results = await Promise.all(allocationPromises);
      
      // 检查所有结果
      const successCount = results.filter(res => res.ok).length;
      
      if (successCount > 0) {
        await onAllocationComplete();
        await fetchWorkerMaterials();
      }
      
    } catch (error) {
      console.error('批量分配失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取项目的未分配材料（只显示真正需要分配的材料）
  const getUnallocatedMaterials = () => {
    // 只返回没有真正分配的材料：没有assignedFromWorkerMaterialId或quantity为0
    return project.materials.filter(material => 
      !material.assignedFromWorkerMaterialId || (material.quantity || 0) <= 0
    );
  };

  const unallocatedMaterials = getUnallocatedMaterials();

  return (
    <div className="space-y-6">
      {/* 说明 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <h5 className="text-sm font-medium text-green-900 mb-1">🎯 一步到位分配</h5>
        <p className="text-sm text-green-700">
          为每个板材需求直接选择工人、数量和尺寸，一次性完成分配。分配后板材状态将变为"已分配"。
        </p>
      </div>

      {/* 材料分配列表 */}
      {unallocatedMaterials.length > 0 ? (
        <div className="space-y-4">
          <AdaptiveLayout direction="row" className="items-center justify-between">
            <h5 className="font-medium text-gray-900">待分配的板材需求</h5>
            
            {/* 一键分配所有按钮 */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleBatchAllocation}
              disabled={loading || unallocatedMaterials.every(material => {
                const state = allocationStates[material.thicknessSpecId];
                return !state || !state.selectedWorkerMaterialId || state.quantity > state.availableQuantity;
              })}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? '分配中...' : '一键分配所有板材'}
            </Button>
          </AdaptiveLayout>
          
          {/* 表格形式的分配界面 */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      板材信息
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分配数量
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      选择工人
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      库存批次
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      具体尺寸
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      库存状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unallocatedMaterials.map((material) => {
                    const spec = material.thicknessSpec;
                    const state = allocationStates[material.thicknessSpecId] || {};
                    const availableWorkerMaterials = getAvailableWorkerMaterials(material.thicknessSpecId);
                    const selectedWorkerMaterials = availableWorkerMaterials.filter(wm => 
                      !state.selectedWorkerId || wm.workerId === state.selectedWorkerId
                    );
                    const availableDimensions = state.selectedWorkerMaterialId 
                      ? getAvailableDimensions(state.selectedWorkerMaterialId)
                      : [];

                    return (
                      <tr key={material.id} className="hover:bg-gray-50">
                        {/* 板材信息 */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">
                              {spec?.materialType || '碳板'} {spec?.thickness}{spec?.unit}
                            </div>
                            <div className="text-xs text-gray-500">
                              {material.assignedFromWorkerMaterialId && (material.quantity || 0) > 0 
                                ? `已分配: ${material.quantity}张` 
                                : '待分配'}
                            </div>
                            <div className="flex items-center mt-1">
                              {material.assignedFromWorkerMaterialId ? (
                                <Badge variant="success" size="sm">有分配ID</Badge>
                              ) : (
                                <Badge variant="warning" size="sm">无分配ID</Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 分配数量 */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Input
                            type="number"
                            min="1"
                            max={state.availableQuantity || 999}
                            value={(state.quantity || 1).toString()}
                            onChange={(e) => updateAllocationState(material.thicknessSpecId, {
                              quantity: parseInt(e.target.value) || 1
                            })}
                            className="w-20"
                          />
                        </td>

                        {/* 选择工人 */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Select
                            value={state.selectedWorkerId?.toString() || ''}
                            onChange={(value) => handleWorkerChange(material.thicknessSpecId, parseInt(value as string))}
                            options={[
                              { value: '', label: '选择工人' },
                              ...workers
                                .filter(worker => availableWorkerMaterials.some(wm => wm.workerId === worker.id))
                                .map(worker => ({
                                  value: worker.id.toString(),
                                  label: worker.name
                                }))
                            ]}
                            className="w-32"
                            size="sm"
                          />
                        </td>

                        {/* 库存批次 */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Select
                            value={state.selectedWorkerMaterialId?.toString() || ''}
                            onChange={(value) => handleWorkerMaterialChange(material.thicknessSpecId, parseInt(value as string))}
                            disabled={!state.selectedWorkerId}
                            options={[
                              { value: '', label: '选择批次' },
                              ...selectedWorkerMaterials.map(wm => ({
                                value: wm.id.toString(),
                                label: `${wm.quantity}张${wm.notes ? ` (${wm.notes})` : ''}`
                              }))
                            ]}
                            className="w-36"
                            size="sm"
                          />
                        </td>

                        {/* 具体尺寸 */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Select
                            value={state.selectedDimensionId?.toString() || ''}
                            onChange={(value) => updateAllocationState(material.thicknessSpecId, {
                              selectedDimensionId: value ? parseInt(value as string) : null
                            })}
                            disabled={!state.selectedWorkerMaterialId}
                            options={[
                              { value: '', label: '通用分配' },
                              ...availableDimensions.map((dim: any) => ({
                                value: dim.id.toString(),
                                label: `${dim.width}×${dim.height}mm (${dim.quantity}张)`
                              }))
                            ]}
                            className="w-40"
                            size="sm"
                          />
                        </td>

                        {/* 库存状态 */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {state.selectedWorkerMaterialId ? (
                              <div className="space-y-1">
                                <span className={`font-medium ${state.quantity > state.availableQuantity ? 'text-red-600' : 'text-green-600'}`}>
                                  可用: {state.availableQuantity}张
                                </span>
                                {state.quantity > state.availableQuantity && (
                                  <div className="text-xs text-red-500">⚠️ 需求超过库存</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">请先选择批次</span>
                            )}
                          </div>
                        </td>

                        {/* 操作 */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSingleAllocation(material.thicknessSpecId)}
                            disabled={
                              loading || 
                              !state.selectedWorkerMaterialId || 
                              state.quantity > state.availableQuantity ||
                              state.quantity < 1
                            }
                          >
                            {loading ? '分配中...' : '确认分配'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-green-300" />
              <p className="text-lg font-medium">所有板材已分配完成</p>
              <p className="text-sm mt-2">当前项目的所有板材需求都已从工人库存中分配</p>
            </div>
          )}
    </div>
  );
};

// 板材分配管理Tab组件 - 统一管理单项目和多项目分配
const AllocationTabsSection: React.FC<{
  project: Project;
  thicknessSpecs: ThicknessSpec[];
  onAllocationComplete: () => Promise<void>;
  fetchProjectDetail: () => Promise<void>; // 添加刷新项目详情的函数
}> = ({ project, thicknessSpecs, onAllocationComplete, fetchProjectDetail }) => {
  const [activeTab, setActiveTab] = useState<'source' | 'single' | 'multi'>('single');
  const { token } = useAuth();

  // 共享的工人和材料数据
  const [workers, setWorkers] = useState<any[]>([]);
  const [workerMaterials, setWorkerMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取工人列表
  const fetchWorkers = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/workers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const workersData = data.workers || [];
        setWorkers(workersData);
      }
    } catch (error) {
      console.error('获取工人列表失败:', error);
    }
  };

  // 获取工人材料库存
  const fetchWorkerMaterials = async () => {
    if (!token) return;
    
    try {
      // 使用主 API 调用来获取包含 dimensions 的完整数据
      const response = await apiRequest('/api/worker-materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // 后端返回的数据结构是 { success: true, workers: [...], thicknessSpecs: [...] }
        // 我们需要展开workers数组中每个工人的materials，组成一个扁平的工人材料数组
        const allWorkerMaterials: any[] = [];
        if (data.workers && Array.isArray(data.workers)) {
          data.workers.forEach((workerData: any) => {
            // 遵循后端返回的数据结构
            const workerId = workerData.workerId;
            const workerName = workerData.workerName;
            
            // 遍历该工人的所有材料类型
            if (workerData.materials && typeof workerData.materials === 'object') {
              Object.entries(workerData.materials).forEach(([materialKey, materialInfo]: [string, any]) => {
                // 只处理有库存的材料（数量 > 0）
                if (materialInfo.quantity > 0 && materialInfo.id) {
                  // 从 materialKey 解析出 materialType 和 thickness
                  const [materialType, thicknessStr] = materialKey.split('_');
                  const thickness = thicknessStr.replace('mm', '');
                  
                  // 查找对应的 thicknessSpec
                  const thicknessSpec = data.thicknessSpecs?.find((spec: any) => 
                    (spec.materialType || '碳板') === materialType && 
                    spec.thickness === thickness
                  );
                  
                  if (thicknessSpec) {
                    allWorkerMaterials.push({
                      id: materialInfo.id,
                      workerId: workerId,
                      workerName: workerName,
                      thicknessSpecId: thicknessSpec.id,
                      quantity: materialInfo.quantity,
                      notes: materialInfo.notes,
                      dimensions: materialInfo.dimensions || [], // 这里包含了 dimensions 数据
                      thicknessSpec: thicknessSpec,
                      worker: {
                        id: workerId,
                        name: workerName
                      }
                    });
                  }
                }
              });
            }
          });
        }
        
        setWorkerMaterials(allWorkerMaterials);
        
      }
    } catch (error) {
      console.error('获取工人材料库存失败:', error);
    }
  };

  // 初始化数据获取
  useEffect(() => {
    fetchWorkers();
    fetchWorkerMaterials();
  }, [token]);

  const tabs = [
    { 
      key: 'source', 
      label: '来源追踪', 
      icon: UserIcon,
      description: '查看板材来源信息'
    },
    { 
      key: 'single', 
      label: '单项目分配', 
      icon: RectangleStackIcon,
      description: '为当前项目分配板材'
    },
    { 
      key: 'multi', 
      label: '多项目分配', 
      icon: ChartBarIcon,
      description: '多个项目共用板材分配'
    }
  ];

  return (
    <Card className="bg-white border border-gray-200" padding="lg">
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-4">
          板材分配管理
        </h4>
        
        {/* Tab 导航 - 使用预设TabBar组件 */}
        <TabBar
          tabs={tabs.map(tab => ({
            id: tab.key,
            label: tab.label,
            icon: React.createElement(tab.icon, { className: "w-4 h-4" })
          }))}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as any)}
          variant="modern"
          size="md"
          className="mb-4"
        />
        
        {/* Tab 描述 */}
        <div className="text-sm text-gray-600">
          {tabs.find(tab => tab.key === activeTab)?.description}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="mt-6">
        {activeTab === 'source' && (
          <MaterialSourceSection 
            project={project}
            token={token}
            fetchProjectDetail={fetchProjectDetail}
          />
        )}
        
        {activeTab === 'single' && (
          <DirectAllocationSection 
            project={project}
            thicknessSpecs={thicknessSpecs}
            onAllocationComplete={onAllocationComplete}
            workers={workers}
            workerMaterials={workerMaterials}
            fetchWorkerMaterials={fetchWorkerMaterials}
          />
        )}
        
        {activeTab === 'multi' && (
          <MultiProjectAllocationSection 
            project={project}
            thicknessSpecs={thicknessSpecs}
            onAllocationComplete={onAllocationComplete}
          />
        )}
      </div>
    </Card>
  );
};

// 材料来源信息组件 - 显示项目材料的工人来源
const MaterialSourceSection: React.FC<{
  project: Project;
  token: string | null;
  fetchProjectDetail: () => Promise<void>; // 添加刷新项目详情的函数
}> = ({ project, token, fetchProjectDetail }) => {
  const [workerMaterials, setWorkerMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取工人材料信息
  const fetchWorkerMaterials = async () => {
    if (!token || !project.materials || project.materials.length === 0) return;

    setLoading(true);
    try {
      // 获取所有有assignedFromWorkerMaterialId的材料的工人信息
      const materialIds = project.materials
        .filter(m => m.assignedFromWorkerMaterialId)
        .map(m => m.assignedFromWorkerMaterialId);

      if (materialIds.length === 0) {
        setWorkerMaterials([]);
        return;
      }

      // 获取工人材料详情
      const response = await apiRequest('/api/worker-materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        // 后端返回的数据结构是 { success: true, workers: [...], thicknessSpecs: [...] }
        // 我们需要展开workers数组中每个工人的materials，组成一个扁平的工人材料数组
        const allWorkerMaterials: any[] = [];
        if (data.workers && Array.isArray(data.workers)) {
          data.workers.forEach((workerData: any) => {
            const workerId = workerData.workerId;
            const workerName = workerData.workerName;
            
            // 遍历该工人的所有材料类型
            if (workerData.materials && typeof workerData.materials === 'object') {
              Object.entries(workerData.materials).forEach(([materialKey, materialInfo]: [string, any]) => {
                // 只处理有库存且有ID的材料
                if (materialInfo.quantity > 0 && materialInfo.id) {
                  allWorkerMaterials.push({
                    id: materialInfo.id,
                    workerId: workerId,
                    workerName: workerName,
                    quantity: materialInfo.quantity,
                    notes: materialInfo.notes,
                    dimensions: materialInfo.dimensions || [],
                    worker: {
                      id: workerId,
                      name: workerName
                    }
                  });
                }
              });
            }
          });
        }
        
        // 筛选出项目使用的工人材料
        const projectWorkerMaterials = allWorkerMaterials.filter(wm => 
          materialIds.includes(wm.id)
        );

        setWorkerMaterials(projectWorkerMaterials);
        console.log('MaterialSource: 获取到的工人材料数据:', projectWorkerMaterials);
      }
    } catch (error) {
      console.error('获取工人材料信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 撤销分配功能
  const handleUndoAllocation = async (materialId: number) => {
    if (!token) return;
    
    try {
      const confirmed = window.confirm('确定要撤销此板材的分配吗？这将恢复工人库存并清除分配记录。');
      if (!confirmed) return;
      
      setLoading(true);
      
      const response = await apiRequest(`/api/materials/${materialId}/undo-allocation`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // 刷新项目详情数据（这是关键！）
        await fetchProjectDetail();
        // 刷新工人材料数据
        await fetchWorkerMaterials();
        // 触发全局刷新事件
        window.dispatchEvent(new CustomEvent('material-allocation-changed'));
      } else {
        alert('撤销分配失败，请重试');
      }
    } catch (error) {
      console.error('撤销分配失败:', error);
      alert('撤销分配失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 当初始化时获取数据
  useEffect(() => {
    fetchWorkerMaterials();
  }, [project.materials, token]);

  // 获取材料的工人来源信息
  const getMaterialWorkerSource = (material: Material) => {
    // 必须同时有分配ID和数量大于0才算真正分配
    if (!material.assignedFromWorkerMaterialId || (material.quantity || 0) <= 0) return null;
    
    const workerMaterial = workerMaterials.find(wm => wm.id === material.assignedFromWorkerMaterialId);
    return workerMaterial;
  };

  // 统计已分配材料数量（修正逻辑：只有真正有工人来源的才算已分配）
  const allocatedMaterialsCount = project.materials.filter(m => {
    const workerSource = getMaterialWorkerSource(m);
    return workerSource && workerSource.worker; // 确保有工人来源信息
  }).length;
  const totalMaterialsCount = project.materials.length;

  if (totalMaterialsCount === 0) return null;

  return (
    <div className="space-y-4">
      {/* 摘要信息 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-sm text-green-700">
          📋 本项目共有 <strong>{totalMaterialsCount}</strong> 个板材需求，
          其中 <strong>{allocatedMaterialsCount}</strong> 个已从工人库存分配，
          <strong>{totalMaterialsCount - allocatedMaterialsCount}</strong> 个待分配。
        </p>
      </div>
      

      <div className="space-y-4">
          {loading ? (
            <AdaptiveLayout direction="row" className="items-center justify-center py-8">
              <Loading type="spinner" size="md" />
              <span className="ml-2 text-gray-500">加载材料来源信息...</span>
            </AdaptiveLayout>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        板材信息
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        分配状态
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        来源工人
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        库存信息
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        可用尺寸
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        分配时间
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {project.materials.map((material) => {
                      const workerSource = getMaterialWorkerSource(material);
                      const spec = material.thicknessSpec;
                      
                      return (
                        <tr key={material.id} className="hover:bg-gray-50">
                          {/* 板材信息 */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="text-sm font-medium text-gray-900">
                                {spec?.materialType || '碳板'} {spec?.thickness}{spec?.unit}
                              </div>
                              <div className="text-xs text-gray-500">
                                需求: {material.quantity || 1}张
                              </div>
                            </div>
                          </td>

                          {/* 分配状态 */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <Badge className={statusConfig[material.status].color} size="sm">
                                {statusConfig[material.status].label}
                              </Badge>
                              {workerSource && workerSource.worker ? (
                                <Badge variant="success" size="sm">已分配</Badge>
                              ) : (
                                <Badge variant="warning" size="sm">待分配</Badge>
                              )}
                            </div>
                          </td>

                          {/* 来源工人 */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            {workerSource && workerSource.worker ? (
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-green-600">
                                  {workerSource.worker.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ID: {workerSource.id}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">未分配</span>
                            )}
                          </td>

                          {/* 库存信息 */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            {workerSource ? (
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  库存: {workerSource.quantity || 0}张
                                </span>
                                {workerSource.dimensions && (
                                  <span className={`text-xs ${
                                    (workerSource.quantity || 0) === workerSource.dimensions.reduce((sum: number, dim: any) => sum + dim.quantity, 0)
                                      ? 'text-green-600' 
                                      : 'text-red-600'
                                  }`}>
                                    {(workerSource.quantity || 0) === workerSource.dimensions.reduce((sum: number, dim: any) => sum + dim.quantity, 0) 
                                      ? '✅ 数据一致' 
                                      : '⚠️ 数据不一致'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>

                          {/* 可用尺寸 */}
                          <td className="px-4 py-4">
                            {workerSource && workerSource.dimensions && workerSource.dimensions.length > 0 ? (
                              <div className="max-w-xs">
                                <div className="flex flex-wrap gap-1">
                                  {workerSource.dimensions
                                    .filter((dim: any) => dim.quantity > 0)
                                    .slice(0, 3)
                                    .map((dim: any, index: number) => (
                                      <Badge key={index} variant="outline" size="sm" className="text-xs">
                                        {dim.width}×{dim.height}mm ({dim.quantity})
                                      </Badge>
                                    ))}
                                  {workerSource.dimensions.filter((dim: any) => dim.quantity > 0).length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{workerSource.dimensions.filter((dim: any) => dim.quantity > 0).length - 3}个
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">无尺寸数据</span>
                            )}
                          </td>

                          {/* 分配时间 */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {material.startDate ? formatDate(material.startDate) : '未设置'}
                            </div>
                          </td>

                          {/* 操作 */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            {workerSource && workerSource.worker ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUndoAllocation(material.id)}
                                disabled={loading}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {loading ? '处理中...' : '撤销分配'}
                              </Button>
                            ) : (
                              <span className="text-xs text-blue-600">
                                💡 使用"单项目分配"进行分配
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

              {/* 统计摘要 */}
              {project.materials.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h5 className="font-medium text-gray-900 mb-3">分配来源统计</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-lg font-semibold text-green-600">{allocatedMaterialsCount}</div>
                      <div className="text-sm text-green-700">已分配材料</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-lg font-semibold text-yellow-600">{totalMaterialsCount - allocatedMaterialsCount}</div>
                      <div className="text-sm text-yellow-700">待分配材料</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-lg font-semibold text-blue-600">
                        {totalMaterialsCount > 0 ? Math.round((allocatedMaterialsCount / totalMaterialsCount) * 100) : 0}%
                      </div>
                      <div className="text-sm text-blue-700">分配完成度</div>
                    </div>
                  </div>
                </div>
              )}
      </div>
    </div>
  );
};

// 多项目分配区域组件 - 简化的多项目分配方案
const MultiProjectAllocationSection: React.FC<{
  project: Project;
  thicknessSpecs: ThicknessSpec[];
  onAllocationComplete: () => Promise<void>;
}> = ({ project, thicknessSpecs, onAllocationComplete }) => {
  const { token } = useAuth();
  
  // 基本状态
  const [selectedThicknessSpecId, setSelectedThicknessSpecId] = useState<number | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [totalQuantity, setTotalQuantity] = useState<number>(1);
  const [selectedDimensionId, setSelectedDimensionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 数据状态
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [workerInventory, setWorkerInventory] = useState<{
    projectWorkers: any[];
    publicWorkers: any[];
    otherWorkers: any[];
  }>({ projectWorkers: [], publicWorkers: [], otherWorkers: [] });
  const [availableDimensions, setAvailableDimensions] = useState<any[]>([]);

  // 获取当前项目的板材规格选项
  const getCurrentProjectThicknessSpecs = () => {
    // 只显示当前项目实际使用的板材规格
    const projectMaterialSpecs = project.materials
      .map(material => material.thicknessSpec)
      .filter(spec => spec) // 过滤掉空值
      .reduce((unique, spec) => {
        // 去重
        if (!unique.find(s => s!.id === spec!.id)) {
          unique.push(spec!);
        }
        return unique;
      }, [] as ThicknessSpec[]);

    return projectMaterialSpecs.map(spec => ({
      value: spec!.id,
      label: `${spec!.materialType || '碳板'} ${spec!.thickness}${spec!.unit}`
    }));
  };

  // 获取有相同规格需求的其他项目
  const fetchProjectsWithSameSpec = async (thicknessSpecId: number) => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allProjects = data.projects || [];
        
        // 筛选出有相同厚度规格需求的项目
        const projectsWithSameSpec = allProjects.filter((proj: Project) => 
          proj.id !== project.id && // 排除当前项目
          proj.materials.some((material: Material) => 
            material.thicknessSpecId === thicknessSpecId
          )
        );
        
        setAvailableProjects(projectsWithSameSpec);
        
        // 默认选择当前项目
        setSelectedProjects([project]);
      }
    } catch (error) {
      console.error('获取相同规格项目失败:', error);
    }
  };

  // 分类工人库存按优先级
  const classifyWorkerInventory = async (thicknessSpecId: number) => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/worker-materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allWorkerMaterials: any[] = [];
        
        // 解析工人材料数据
        if (data.workers && Array.isArray(data.workers)) {
          data.workers.forEach((workerData: any) => {
            const workerId = workerData.workerId;
            const workerName = workerData.workerName;
            
            if (workerData.materials && typeof workerData.materials === 'object') {
              Object.entries(workerData.materials).forEach(([materialKey, materialInfo]: [string, any]) => {
                if (materialInfo.quantity > 0 && materialInfo.id) {
                  const [materialType, thicknessStr] = materialKey.split('_');
                  const thickness = thicknessStr.replace('mm', '');
                  
                  const thicknessSpec = data.thicknessSpecs?.find((spec: any) => 
                    (spec.materialType || '碳板') === materialType && 
                    spec.thickness === thickness
                  );
                  
                  if (thicknessSpec && thicknessSpec.id === thicknessSpecId) {
                    allWorkerMaterials.push({
                      id: materialInfo.id,
                      workerId: workerId,
                      workerName: workerName,
                      thicknessSpecId: thicknessSpec.id,
                      quantity: materialInfo.quantity,
                      notes: materialInfo.notes,
                      dimensions: materialInfo.dimensions || [],
                      thicknessSpec: thicknessSpec,
                      worker: { id: workerId, name: workerName }
                    });
                  }
                }
              });
            }
          });
        }
        
        // 分类工人库存
        const projectWorkerIds = selectedProjects
          .map(proj => proj.assignedWorker?.id)
          .filter(id => id);
        
        const projectWorkers = allWorkerMaterials.filter(wm => 
          projectWorkerIds.includes(wm.workerId)
        );
        
        // 假设公共库存是没有分配给特定项目的工人
        const publicWorkers = allWorkerMaterials.filter(wm => 
          !projectWorkerIds.includes(wm.workerId) && 
          wm.workerName.includes('公共') // 简单的识别逻辑
        );
        
        const otherWorkers = allWorkerMaterials.filter(wm => 
          !projectWorkerIds.includes(wm.workerId) && 
          !wm.workerName.includes('公共')
        );
        
        setWorkerInventory({ projectWorkers, publicWorkers, otherWorkers });
        
        // 合并所有可用尺寸
        const allDimensions: any[] = [];
        allWorkerMaterials.forEach(wm => {
          if (wm.dimensions && wm.dimensions.length > 0) {
            const { dimensions, quantity: currentStock } = wm;
            const totalOriginalQuantity = dimensions.reduce((sum: number, dim: any) => sum + dim.quantity, 0);
            
            if (totalOriginalQuantity > 0 && currentStock > 0) {
              dimensions.forEach((dim: any) => {
                const ratio = dim.quantity / totalOriginalQuantity;
                const actualAvailable = Math.floor(ratio * currentStock);
                
                if (actualAvailable > 0) {
                  allDimensions.push({
                    ...dim,
                    quantity: actualAvailable,
                    originalQuantity: dim.quantity,
                    workerMaterialId: wm.id,
                    workerName: wm.workerName
                  });
                }
              });
            }
          }
        });
        
        setAvailableDimensions(allDimensions);
      }
    } catch (error) {
      console.error('获取工人库存失败:', error);
    }
  };

  // 处理厚度规格选择
  const handleThicknessSpecChange = (specId: number) => {
    setSelectedThicknessSpecId(specId);
    setSelectedProjects([project]); // 重置为只包含当前项目
    setSelectedDimensionId(null);
    
    // 获取相关数据
    fetchProjectsWithSameSpec(specId);
    classifyWorkerInventory(specId);
  };

  // 添加项目到选择列表
  const addProjectToSelection = (projectToAdd: Project) => {
    if (!selectedProjects.find(p => p.id === projectToAdd.id)) {
      const newSelectedProjects = [...selectedProjects, projectToAdd];
      setSelectedProjects(newSelectedProjects);
      
      // 重新分类工人库存（因为项目负责工人可能变化）
      if (selectedThicknessSpecId) {
        classifyWorkerInventory(selectedThicknessSpecId);
      }
    }
  };

  // 移除项目从选择列表
  const removeProjectFromSelection = (projectId: number) => {
    const newSelectedProjects = selectedProjects.filter(p => p.id !== projectId);
    setSelectedProjects(newSelectedProjects);
    
    // 重新分类工人库存
    if (selectedThicknessSpecId) {
      classifyWorkerInventory(selectedThicknessSpecId);
    }
  };

  // 计算总可用库存
  const getTotalAvailableStock = () => {
    const { projectWorkers, publicWorkers, otherWorkers } = workerInventory;
    return [...projectWorkers, ...publicWorkers, ...otherWorkers]
      .reduce((sum, wm) => sum + wm.quantity, 0);
  };

  // 执行多项目分配
  const handleMultiProjectAllocation = async () => {
    if (!selectedThicknessSpecId || selectedProjects.length === 0 || totalQuantity <= 0) {
      return;
    }

    const totalAvailable = getTotalAvailableStock();
    if (totalQuantity > totalAvailable) {
      alert(`需求数量 ${totalQuantity} 超过可用库存 ${totalAvailable}`);
      return;
    }

    try {
      setLoading(true);
      
      // 构建分配数据
      const allocationData = {
        selectedProjects: selectedProjects.map(p => p.id),
        thicknessSpecId: selectedThicknessSpecId,
        totalQuantity,
        dimensionId: selectedDimensionId,
        workerPriority: {
          projectWorkers: workerInventory.projectWorkers,
          publicWorkers: workerInventory.publicWorkers,  
          otherWorkers: workerInventory.otherWorkers
        }
      };
      
      console.log('多项目分配数据:', allocationData);
      
      // TODO: 调用后端API执行分配
      // const response = await apiRequest('/api/materials/multi-allocate', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(allocationData)
      // });
      
      await onAllocationComplete();
      
    } catch (error) {
      console.error('多项目分配失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const thicknessOptions = getCurrentProjectThicknessSpecs();
  const totalAvailable = getTotalAvailableStock();

  return (
    <div className="space-y-4">
      {/* 说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h5 className="text-sm font-medium text-blue-900 mb-1">🎯 多项目协作分配</h5>
        <p className="text-sm text-blue-700">
          选择本项目的板材规格，添加有相同规格需求的其他项目，系统将按优先级智能分配工人库存。
        </p>
      </div>

      {/* 主分配表格 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  板材规格
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  参与项目
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  需求数量
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  尺寸规格
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  库存来源
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                {/* 板材规格 */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <Select
                    value={selectedThicknessSpecId?.toString() || ''}
                    onChange={(value) => handleThicknessSpecChange(parseInt(value as string))}
                    options={[
                      { value: '', label: '请选择板材规格' },
                      ...thicknessOptions.map(opt => ({ 
                        value: opt.value.toString(), 
                        label: opt.label 
                      }))
                    ]}
                    className="w-full"
                    size="sm"
                  />
                </td>

                {/* 参与项目 */}
                <td className="px-4 py-4">
                  <div className="space-y-2">
                    <Select
                      value=""
                      onChange={(value) => {
                        if (value) {
                          const projectToAdd = availableProjects.find(p => p.id === parseInt(value as string));
                          if (projectToAdd) {
                            addProjectToSelection(projectToAdd);
                          }
                        }
                      }}
                      options={[
                        { 
                          value: '', 
                          label: availableProjects.length > 0 
                            ? '选择要添加的项目...' 
                            : '暂无其他相同规格项目'
                        },
                        ...availableProjects
                          .filter(proj => !selectedProjects.find(selected => selected.id === proj.id))
                          .map(proj => {
                            const materialCount = proj.materials.filter(m => m.thicknessSpecId === selectedThicknessSpecId).length;
                            return {
                              value: proj.id.toString(),
                              label: `${proj.name} (需要${materialCount}个板材)`
                            };
                          })
                      ]}
                      size="sm"
                      disabled={!selectedThicknessSpecId || availableProjects.length === 0}
                    />
                    
                    {/* 已选项目列表 */}
                    {selectedProjects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedProjects.map(proj => (
                          <div key={proj.id} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            <span>{proj.name}</span>
                            {proj.id !== project.id && (
                              <button
                                onClick={() => removeProjectFromSelection(proj.id)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                {/* 需求数量 */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <Input
                    type="number"
                    min="1"
                    max={totalAvailable}
                    value={totalQuantity.toString()}
                    onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 1)}
                    placeholder={`最多${totalAvailable}张`}
                    className="w-24"
                    disabled={!selectedThicknessSpecId}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    可用: {totalAvailable}张
                  </div>
                </td>

                {/* 尺寸规格 */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <Select
                    value={selectedDimensionId?.toString() || ''}
                    onChange={(value) => setSelectedDimensionId(value ? parseInt(value as string) : null)}
                    options={[
                      { value: '', label: '通用分配' },
                      ...availableDimensions.map(dim => ({
                        value: dim.id.toString(),
                        label: `${dim.width}×${dim.height}mm (${dim.quantity}张)`
                      }))
                    ]}
                    className="w-48"
                    size="sm"
                    disabled={!selectedThicknessSpecId}
                  />
                </td>

                {/* 库存来源 */}
                <td className="px-4 py-4">
                  <div className="space-y-1">
                    {selectedThicknessSpecId && (
                      <>
                        {/* 优先级1 - 项目负责工人 */}
                        {workerInventory.projectWorkers.length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium text-green-600">项目工人: </span>
                            <span className="text-gray-700">
                              {workerInventory.projectWorkers.reduce((sum, wm) => sum + wm.quantity, 0)}张
                            </span>
                          </div>
                        )}

                        {/* 优先级2 - 公共库存 */}
                        {workerInventory.publicWorkers.length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium text-blue-600">公共库存: </span>
                            <span className="text-gray-700">
                              {workerInventory.publicWorkers.reduce((sum, wm) => sum + wm.quantity, 0)}张
                            </span>
                          </div>
                        )}

                        {/* 优先级3 - 其他工人 */}
                        {workerInventory.otherWorkers.length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium text-gray-600">其他工人: </span>
                            <span className="text-gray-700">
                              {workerInventory.otherWorkers.reduce((sum, wm) => sum + wm.quantity, 0)}张
                            </span>
                          </div>
                        )}

                        {totalAvailable === 0 && (
                          <div className="text-xs text-gray-400">暂无可用库存</div>
                        )}
                      </>
                    )}
                  </div>
                </td>

                {/* 操作 */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleMultiProjectAllocation}
                    disabled={
                      loading || 
                      !selectedThicknessSpecId ||
                      selectedProjects.length === 0 ||
                      totalQuantity <= 0 ||
                      totalQuantity > totalAvailable
                    }
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading 
                      ? '分配中...' 
                      : '执行分配'
                    }
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 库存来源详情表格 */}
      {selectedThicknessSpecId && (workerInventory.projectWorkers.length > 0 || workerInventory.publicWorkers.length > 0 || workerInventory.otherWorkers.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h5 className="text-sm font-medium text-gray-900">库存来源详情</h5>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    优先级
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    工人姓名
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    库存数量
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    备注
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* 优先级1 - 项目负责工人 */}
                {workerInventory.projectWorkers.map((wm, index) => (
                  <tr key={`project-${wm.id}`} className="hover:bg-green-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Badge variant="success" size="sm">优先级1</Badge>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{wm.workerName}</div>
                      <div className="text-xs text-gray-500">项目工人</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-600">{wm.quantity}张</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{wm.notes || '无备注'}</span>
                    </td>
                  </tr>
                ))}

                {/* 优先级2 - 公共库存 */}
                {workerInventory.publicWorkers.map((wm, index) => (
                  <tr key={`public-${wm.id}`} className="hover:bg-blue-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Badge variant="primary" size="sm">优先级2</Badge>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{wm.workerName}</div>
                      <div className="text-xs text-gray-500">公共库存</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600">{wm.quantity}张</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{wm.notes || '无备注'}</span>
                    </td>
                  </tr>
                ))}

                {/* 优先级3 - 其他工人 */}
                {workerInventory.otherWorkers.map((wm, index) => (
                  <tr key={`other-${wm.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Badge variant="outline" size="sm">优先级3</Badge>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{wm.workerName}</div>
                      <div className="text-xs text-gray-500">其他工人</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-600">{wm.quantity}张</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{wm.notes || '无备注'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 分配结果摘要 */}
      {selectedThicknessSpecId && selectedProjects.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-900 mb-2">分配摘要</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">选中项目: </span>
              <span className="font-medium">{selectedProjects.length}个</span>
            </div>
            <div>
              <span className="text-gray-500">需求数量: </span>
              <span className="font-medium">{totalQuantity}张</span>
            </div>
            <div>
              <span className="text-gray-500">可用库存: </span>
              <span className={`font-medium ${totalQuantity > totalAvailable ? 'text-red-600' : 'text-green-600'}`}>
                {totalAvailable}张
              </span>
            </div>
            <div>
              <span className="text-gray-500">分配状态: </span>
              <span className={`font-medium ${
                !selectedThicknessSpecId ? 'text-gray-500' :
                totalQuantity > totalAvailable ? 'text-red-600' : 'text-green-600'
              }`}>
                {!selectedThicknessSpecId ? '未配置' :
                 totalQuantity > totalAvailable ? '库存不足' : '可执行'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailModern;
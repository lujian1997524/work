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
  SearchableSelect,
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
  // assignedFromWorkerMaterialId字段已移除
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
  FireIcon,
  MinusIcon,
  InformationCircleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { updateMaterialStatusShared, getProjectMaterialStatus } from '@/utils/materialStatusManager';
import { formatDate, formatDateTime } from '@/utils/dateFormatter';
import { apiRequest } from '@/utils/api';
import { useResponsive } from '@/hooks/useResponsive';
import { DrawingUpload } from '@/components/drawings/DrawingUpload';
import AdvancedDxfModal from '@/components/ui/advanced-dxf/AdvancedDxfModal';

interface ProjectDetailModernProps {
  projectId: number;
  onBack: () => void;
  className?: string;
}

// 状态配置
const statusConfig = {
  empty: { 
    label: '空白', 
    color: 'bg-gray-50 text-gray-500', 
    icon: ClockIcon,
    description: '未分配状态'
  },
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
  
  // 扣除界面状态管理
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<ThicknessSpec | null>(null);
  const [showBatchDeductModal, setShowBatchDeductModal] = useState(false);
  const [workerMaterials, setWorkerMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 获取工人材料库存数据
  const fetchWorkerMaterials = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await apiRequest('/api/worker-materials', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkerMaterials(data.workers || []);
      } else {
        console.error('获取工人材料库存失败:', response.status);
      }
    } catch (error) {
      console.error('获取工人材料库存失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 打开扣除界面
  const handleOpenDeduct = async (spec: ThicknessSpec) => {
    setSelectedSpec(spec);
    await fetchWorkerMaterials();
    setShowDeductModal(true);
  };
  
  // 打开批量扣除界面
  const handleOpenBatchDeduct = async () => {
    await fetchWorkerMaterials();
    setShowBatchDeductModal(true);
  };


  // 状态配置（与ActiveProjectCard保持一致）
  const statusConfig = {
    empty: {
      color: 'bg-gray-50 text-gray-500', 
      textColor: 'text-gray-500',
      label: '空白' 
    },
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
      <div key={spec.id} className="flex flex-col items-center min-w-0 space-y-1">
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
        
        {/* 扣除操作按钮 */}
        <button
          type="button" 
          className="w-full py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
          onClick={() => handleOpenDeduct(spec)}
        >
          扣除
        </button>
        
        {/* 时间信息显示 - 当有时间数据时才显示 - 确保显示在按钮下方 */}
        {(material?.startDate || material?.completedDate || material?.completedByUser) && (
          <div className="w-full text-xs text-gray-500 text-center leading-tight">
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
      {/* 批量操作按钮区域 */}
      {(carbonSpecs.length > 0 || specialSpecs.length > 0) && (
        <div className="flex justify-end mb-4">
          <Button
            size="sm"
            variant="primary"
            onClick={handleOpenBatchDeduct}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RectangleStackIcon className="w-4 h-4" />
            <span>批量扣除</span>
          </Button>
        </div>
      )}
      
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
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} mt-2`}>项目还没有配置任何板材规格</p>
        </div>
      )}
      
      {/* 板材扣除模态框 */}
      {showDeductModal && selectedSpec && (
        <MaterialDeductModal
          isOpen={showDeductModal}
          onClose={() => setShowDeductModal(false)}
          project={project}
          thicknessSpec={selectedSpec}
          workerMaterials={workerMaterials}
          onSuccess={async () => {
            await fetchProjectDetail();
            setShowDeductModal(false);
          }}
          token={token}
        />
      )}
      
      {/* 批量扣除模态框 */}
      {showBatchDeductModal && (
        <BatchDeductModal
          isOpen={showBatchDeductModal}
          onClose={() => setShowBatchDeductModal(false)}
          project={project}
          thicknessSpecs={thicknessSpecs}
          workerMaterials={workerMaterials}
          onSuccess={async () => {
            await fetchProjectDetail();
            setShowBatchDeductModal(false);
          }}
          token={token}
        />
      )}
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
        
      case 'material_deduct':
        return {
          title: `${operator.name} 扣除板材`,
          description: `从工人库存扣除 ${details?.quantity || ''}张 ${details?.materialType || ''} ${details?.thickness || ''} (${details?.dimensionSize || ''}) 给项目${details?.projectName || ''}`,
          icon: <MinusIcon className="w-4 h-4 text-white" />,
          status: 'warning' as const
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
        return ['material_start', 'material_complete', 'material_transfer', 'material_allocate', 'material_deduct', 'material_update'].includes(record.operationType);
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
              <PlusIcon className="w-3 h-3" />
              <span>添加需求 - 项目新增材料需求或创建项目</span>
            </AdaptiveLayout>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// 板材扣除模态框组件 - 重新设计版本
const MaterialDeductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  thicknessSpec: ThicknessSpec;
  workerMaterials: any[];
  onSuccess: () => Promise<void>;
  token: string | null;
}> = ({ isOpen, onClose, project, thicknessSpec, workerMaterials, onSuccess, token }) => {
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [selectedDimension, setSelectedDimension] = useState<string>('');
  const [deductQuantity, setDeductQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // 获取指定厚度的工人库存（按优先级排序）
  const getAvailableWorkers = () => {
    const availableWorkers = workerMaterials.filter(worker => {
      const materialKey = `${thicknessSpec.materialType}_${thicknessSpec.thickness}mm`;
      return worker.materials && worker.materials[materialKey] && worker.materials[materialKey].quantity > 0;
    });

    // 按优先级排序：项目负责工人 → 公共库存 → 其他工人
    return availableWorkers.sort((a, b) => {
      // 1. 项目负责工人优先
      const aIsAssigned = project.assignedWorker && a.workerId === project.assignedWorker.id;
      const bIsAssigned = project.assignedWorker && b.workerId === project.assignedWorker.id;
      
      if (aIsAssigned && !bIsAssigned) return -1;
      if (!aIsAssigned && bIsAssigned) return 1;
      
      // 2. 公共库存次优（假设工人名为"公共库存"或特定标识）
      const aIsPublic = a.workerName === '公共库存' || a.workerName.includes('公共');
      const bIsPublic = b.workerName === '公共库存' || b.workerName.includes('公共');
      
      if (aIsPublic && !bIsPublic) return -1;
      if (!aIsPublic && bIsPublic) return 1;
      
      // 3. 其他工人按姓名排序
      return a.workerName.localeCompare(b.workerName);
    });
  };
  
  // 在打开模态框时自动选择默认工人
  useEffect(() => {
    if (isOpen && workerMaterials.length > 0) {
      const availableWorkers = getAvailableWorkers();
      if (availableWorkers.length > 0) {
        // 自动选择优先级最高的工人
        setSelectedWorker(availableWorkers[0].workerId.toString());
      }
      setNotes(`项目${project.name}扣除${thicknessSpec.materialType} ${thicknessSpec.thickness}${thicknessSpec.unit}`);
    } else if (!isOpen) {
      // 模态框关闭时重置状态
      setSelectedWorker('');
      setSelectedDimension('');
      setDeductQuantity(1);
      setNotes('');
    }
  }, [isOpen, workerMaterials, project.name, thicknessSpec]);
  
  // 获取选中工人该厚度的尺寸信息
  const getWorkerDimensions = () => {
    if (!selectedWorker) return [];
    
    const worker = workerMaterials.find(w => w.workerId.toString() === selectedWorker);
    if (!worker || !worker.materials) return [];
    
    const materialKey = `${thicknessSpec.materialType}_${thicknessSpec.thickness}mm`;
    const material = worker.materials[materialKey];
    
    return material?.dimensions || [];
  };
  
  // 获取选中尺寸的可用数量
  const getAvailableQuantity = () => {
    if (!selectedWorker || !selectedDimension) return 0;
    
    const dimensions = getWorkerDimensions();
    const dimension = dimensions.find((d: any) => d.id.toString() === selectedDimension);
    
    return dimension?.quantity || 0;
  };
  
  // 执行扣除操作
  const handleDeduct = async () => {
    if (!selectedWorker || !selectedDimension || !deductQuantity || !token) return;
    
    setLoading(true);
    try {
      const response = await apiRequest('/api/material-dimensions/deduct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: project.id,
          dimensionId: parseInt(selectedDimension),
          quantity: deductQuantity,
          thicknessSpecId: thicknessSpec.id,
          notes: notes || `项目${project.name}扣除 ${deductQuantity}张 ${thicknessSpec.materialType} ${thicknessSpec.thickness}${thicknessSpec.unit}`
        })
      });
      
      if (response.ok) {
        await onSuccess();
        onClose();
      } else {
        const error = await response.json().catch(() => ({}));
        alert(`扣除失败: ${error.error || '未知错误'}`);
      }
    } catch (error) {
      alert('扣除失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };
  
  // 生成工人选择选项
  const workerOptions = getAvailableWorkers().map(worker => {
    const materialKey = `${thicknessSpec.materialType}_${thicknessSpec.thickness}mm`;
    const quantity = worker.materials[materialKey]?.quantity || 0;
    
    // 判断工人类型
    const isAssigned = project.assignedWorker && worker.workerId === project.assignedWorker.id;
    const isPublic = worker.workerName === '公共库存' || worker.workerName.includes('公共');
    
    let label = worker.workerName;
    let description = `库存: ${quantity}张`;
    
    if (isAssigned) {
      label = `${worker.workerName} [项目负责人]`;
      description = `项目负责人 • 库存: ${quantity}张`;
    } else if (isPublic) {
      label = `${worker.workerName} [公共库存]`;
      description = `公共库存 • 库存: ${quantity}张`;
    }
    
    return {
      value: worker.workerId.toString(),
      label,
      description
    };
  });
  
  // 生成尺寸选择选项
  const dimensionOptions = getWorkerDimensions().map((dimension: any) => ({
    value: dimension.id.toString(),
    label: `${dimension.width}×${dimension.length}mm`,
    description: `库存: ${dimension.quantity}张`
  }));
  
  const maxQuantity = getAvailableQuantity();
  const selectedWorkerData = workerMaterials.find(w => w.workerId.toString() === selectedWorker);
  const canSubmit = selectedWorker && selectedDimension && deductQuantity > 0 && deductQuantity <= maxQuantity && !loading;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`扣除板材 • ${thicknessSpec.materialType} ${thicknessSpec.thickness}${thicknessSpec.unit}`}
      size="lg"
      footer={
        <div className="flex items-center justify-end space-x-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleDeduct}
            disabled={!canSubmit}
            loading={loading}
          >
            确认扣除 {deductQuantity}张
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 项目信息卡片 */}
        <Card glass className="!bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-ios18-blue rounded-ios-lg flex items-center justify-center">
              <InformationCircleIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">项目信息</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>项目名称：{project.name}</p>
                <p>需要厚度：{thicknessSpec.materialType} {thicknessSpec.thickness}{thicknessSpec.unit}</p>
                {project.assignedWorker && (
                  <p>项目负责人：{project.assignedWorker.name}</p>
                )}
              </div>
            </div>
          </div>
        </Card>
        
        {/* 扣除配置区域 */}
        <div className="space-y-4">
          {/* 选择工人 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              选择工人
              <Badge variant="secondary" size="sm" className="ml-2">
                {workerOptions.length}人有库存
              </Badge>
            </label>
            <SearchableSelect
              value={selectedWorker}
              onChange={(value) => {
                setSelectedWorker(value.toString());
                setSelectedDimension('');
                setDeductQuantity(1);
              }}
              options={workerOptions}
              placeholder="选择有库存的工人..."
              clearable={true}
              variant="glass"
              disabled={loading}
            />
          </div>
          
          {/* 选择尺寸 */}
          {selectedWorker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="block text-sm font-medium text-gray-900 mb-3">
                选择尺寸
                <Badge variant="secondary" size="sm" className="ml-2">
                  {dimensionOptions.length}种尺寸
                </Badge>
              </label>
              <SearchableSelect
                value={selectedDimension}
                onChange={(value) => {
                  setSelectedDimension(value.toString());
                  setDeductQuantity(1);
                }}
                options={dimensionOptions}
                placeholder="选择材料尺寸..."
                clearable={true}
                variant="glass"
                disabled={loading}
              />
            </motion.div>
          )}
          
          {/* 扣除数量 */}
          {selectedDimension && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <label className="block text-sm font-medium text-gray-900 mb-3">
                扣除数量
                <Badge variant="outline" size="sm" className="ml-2">
                  最大: {maxQuantity}张
                </Badge>
              </label>
              <Input
                type="number"
                min={1}
                max={maxQuantity}
                value={deductQuantity}
                onChange={(e) => setDeductQuantity(parseInt(e.target.value) || 1)}
                placeholder="输入扣除数量"
                variant="glass"
                disabled={loading}
                error={deductQuantity > maxQuantity ? `数量不能超过${maxQuantity}张` : undefined}
              />
            </motion.div>
          )}
          
          {/* 备注 */}
          {selectedDimension && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <label className="block text-sm font-medium text-gray-900 mb-3">
                操作备注 (可选)
              </label>
              <Input
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="请输入扣除操作的备注信息..."
                variant="glass"
                disabled={loading}
              />
            </motion.div>
          )}
        </div>
        
        {/* 库存信息摘要 */}
        {selectedWorkerData && selectedDimension && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card glass className="!bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-status-success rounded-ios-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">扣除信息确认</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>扣除工人：{selectedWorkerData.workerName}</p>
                    <p>扣除规格：{thicknessSpec.materialType} {thicknessSpec.thickness}{thicknessSpec.unit}</p>
                    {dimensionOptions.find((d: any) => d.value === selectedDimension) && (
                      <p>尺寸规格：{dimensionOptions.find((d: any) => d.value === selectedDimension)?.label}</p>
                    )}
                    <p>扣除数量：{deductQuantity}张</p>
                    <p>剩余库存：{maxQuantity - deductQuantity}张</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </Modal>
  );
};

// 批量扣除模态框组件 - 重新设计版本
const BatchDeductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  thicknessSpecs: ThicknessSpec[];
  workerMaterials: any[];
  onSuccess: () => Promise<void>;
  token: string | null;
}> = ({ isOpen, onClose, project, thicknessSpecs, workerMaterials, onSuccess, token }) => {
  const [deductItems, setDeductItems] = useState<Record<number, {
    workerId: string;
    dimensionId: string;
    quantity: number;
    enabled: boolean;
    notes?: string;
  }>>({});
  const [loading, setLoading] = useState(false);
  const [globalNotes, setGlobalNotes] = useState<string>('');
  
  // 获取项目所需的厚度规格
  const getProjectThicknessSpecs = () => {
    const projectThicknessSpecIds = project.materials?.map(m => m.thicknessSpecId) || [];
    return thicknessSpecs.filter(spec => projectThicknessSpecIds.includes(spec.id));
  };
  
  // 初始化扣除项目（只包含当前项目所需的厚度规格）
  useEffect(() => {
    if (isOpen) {
      const initialItems: typeof deductItems = {};
      const projectThicknessSpecs = getProjectThicknessSpecs();
      
      projectThicknessSpecs.forEach(spec => {
        // 获取该厚度的可用工人并自动选择最优的
        const availableWorkers = getAvailableWorkers(spec);
        
        initialItems[spec.id] = {
          workerId: availableWorkers.length > 0 ? availableWorkers[0].workerId.toString() : '',
          dimensionId: '',
          quantity: 1,
          enabled: false,
          notes: `批量扣除：项目${project.name}扣除${spec.materialType} ${spec.thickness}${spec.unit}`
        };
      });
      
      setDeductItems(initialItems);
      setGlobalNotes(`批量扣除：项目${project.name}板材分配`);
    }
  }, [isOpen, thicknessSpecs, project.materials, workerMaterials, project.assignedWorker, project.name]);
  
  // 获取指定厚度的工人库存（按优先级排序）
  const getAvailableWorkers = (thicknessSpec: ThicknessSpec) => {
    const availableWorkers = workerMaterials.filter(worker => {
      const materialKey = `${thicknessSpec.materialType}_${thicknessSpec.thickness}mm`;
      return worker.materials[materialKey] && worker.materials[materialKey].quantity > 0;
    });

    // 按优先级排序：项目负责工人 → 公共库存 → 其他工人
    return availableWorkers.sort((a, b) => {
      // 1. 项目负责工人优先
      const aIsAssigned = project.assignedWorker && a.workerId === project.assignedWorker.id;
      const bIsAssigned = project.assignedWorker && b.workerId === project.assignedWorker.id;
      
      if (aIsAssigned && !bIsAssigned) return -1;
      if (!aIsAssigned && bIsAssigned) return 1;
      
      // 2. 公共库存次优
      const aIsPublic = a.workerName === '公共库存' || a.workerName.includes('公共');
      const bIsPublic = b.workerName === '公共库存' || b.workerName.includes('公共');
      
      if (aIsPublic && !bIsPublic) return -1;
      if (!aIsPublic && bIsPublic) return 1;
      
      // 3. 其他工人按姓名排序
      return a.workerName.localeCompare(b.workerName);
    });
  };
  
  // 获取选中工人该厚度的尺寸信息
  const getWorkerDimensions = (thicknessSpecId: number, workerId: string) => {
    if (!workerId) return [];
    
    const thicknessSpec = thicknessSpecs.find(s => s.id === thicknessSpecId);
    if (!thicknessSpec) return [];
    
    const worker = workerMaterials.find(w => w.workerId.toString() === workerId);
    if (!worker || !worker.materials) return [];
    
    const materialKey = `${thicknessSpec.materialType}_${thicknessSpec.thickness}mm`;
    const material = worker.materials[materialKey];
    
    return material?.dimensions || [];
  };
  
  // 获取选中尺寸的可用数量
  const getAvailableQuantity = (thicknessSpecId: number) => {
    const item = deductItems[thicknessSpecId];
    if (!item?.workerId || !item.dimensionId) return 0;
    
    const dimensions = getWorkerDimensions(thicknessSpecId, item.workerId);
    const dimension = dimensions.find((d: any) => d.id.toString() === item.dimensionId);
    
    return dimension?.quantity || 0;
  };
  
  // 更新扣除项目
  const updateDeductItem = (thicknessSpecId: number, updates: Partial<typeof deductItems[0]>) => {
    setDeductItems(prev => ({
      ...prev,
      [thicknessSpecId]: {
        ...prev[thicknessSpecId],
        ...updates
      }
    }));
  };
  
  // 生成工人选择选项
  const generateWorkerOptions = (thicknessSpec: ThicknessSpec) => {
    return getAvailableWorkers(thicknessSpec).map(worker => {
      const materialKey = `${thicknessSpec.materialType}_${thicknessSpec.thickness}mm`;
      const quantity = worker.materials[materialKey]?.quantity || 0;
      
      // 判断工人类型
      const isAssigned = project.assignedWorker && worker.workerId === project.assignedWorker.id;
      const isPublic = worker.workerName === '公共库存' || worker.workerName.includes('公共');
      
      let label = worker.workerName;
      let description = `库存: ${quantity}张`;
      
      if (isAssigned) {
        label = `${worker.workerName} [项目负责人]`;
        description = `项目负责人 • 库存: ${quantity}张`;
      } else if (isPublic) {
        label = `${worker.workerName} [公共库存]`;
        description = `公共库存 • 库存: ${quantity}张`;
      }
      
      return {
        value: worker.workerId.toString(),
        label,
        description
      };
    });
  };
  
  // 生成尺寸选择选项
  const generateDimensionOptions = (thicknessSpecId: number, workerId: string) => {
    return getWorkerDimensions(thicknessSpecId, workerId).map((dimension: any) => ({
      value: dimension.id.toString(),
      label: `${dimension.width}×${dimension.length}mm`,
      description: `库存: ${dimension.quantity}张`
    }));
  };
  
  // 执行批量扣除
  const handleBatchDeduct = async () => {
    const enabledItems = Object.entries(deductItems).filter(([_, item]) => 
      item.enabled && item.workerId && item.dimensionId && item.quantity > 0
    );
    
    if (enabledItems.length === 0) {
      alert('请至少选择一项扣除操作');
      return;
    }
    
    // 验证数量不超过库存
    const invalidItems = enabledItems.filter(([thicknessSpecId, item]) => {
      const maxQuantity = getAvailableQuantity(parseInt(thicknessSpecId));
      return item.quantity > maxQuantity;
    });
    
    if (invalidItems.length > 0) {
      alert('部分扣除数量超过库存限制，请检查后重试');
      return;
    }
    
    setLoading(true);
    
    // 生成批次ID (用于关联同一次批量操作)
    const batchId = `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      // 并行执行所有扣除操作
      const deductPromises = enabledItems.map(async ([thicknessSpecId, item]) => {
        const thicknessSpec = thicknessSpecs.find(s => s.id === parseInt(thicknessSpecId));
        if (!thicknessSpec) return null;
        
        const finalNotes = item.notes || globalNotes || `批量扣除：项目${project.name}扣除 ${item.quantity}张 ${thicknessSpec.materialType} ${thicknessSpec.thickness}${thicknessSpec.unit}`;
        
        const response = await apiRequest('/api/material-dimensions/deduct', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            projectId: project.id,
            dimensionId: parseInt(item.dimensionId),
            quantity: item.quantity,
            thicknessSpecId: parseInt(thicknessSpecId),
            notes: finalNotes,
            batchId: batchId // 添加批次ID
          })
        });
        
        return { response, thicknessSpec, item };
      });
      
      const results = await Promise.all(deductPromises);
      const failedResults = results.filter(r => r && !r.response.ok);
      
      if (failedResults.length === 0) {
        await onSuccess();
        onClose();
      } else {
        alert(`批量扣除完成，但有 ${failedResults.length} 项失败`);
        await onSuccess(); // 仍然刷新数据以显示成功的部分
      }
    } catch (error) {
      alert('批量扣除失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };
  
  const projectThicknessSpecs = getProjectThicknessSpecs();
  const enabledCount = Object.values(deductItems).filter(item => item.enabled).length;
  const totalQuantity = Object.values(deductItems).filter(item => item.enabled).reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`批量扣除板材 • ${project.name}`}
      size="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-gray-600">
            已选择 <Badge variant="secondary" className="mx-1">{enabledCount}</Badge> 个厚度规格，
            共计扣除 <Badge variant="primary" className="mx-1">{totalQuantity}</Badge> 张板材
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleBatchDeduct}
              disabled={loading || enabledCount === 0}
              loading={loading}
            >
              执行批量扣除 ({enabledCount}项)
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 项目信息和说明 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 项目信息卡片 */}
          <Card glass className="!bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-ios18-blue rounded-ios-lg flex items-center justify-center">
                <InformationCircleIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">项目信息</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>项目名称：{project.name}</p>
                  {project.assignedWorker && (
                    <p>项目负责人：{project.assignedWorker.name}</p>
                  )}
                  <p>需要扣除：{projectThicknessSpecs.length} 种厚度规格</p>
                </div>
              </div>
            </div>
          </Card>
          
          {/* 操作说明卡片 */}
          <Card glass className="!bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-status-success rounded-ios-lg flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">批量扣除说明</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 勾选需要扣除的板材厚度</li>
                  <li>• 为每个选中的厚度选择工人、尺寸和数量</li>
                  <li>• 点击"执行批量扣除"一次性完成所有扣除操作</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
        
        {/* 全局备注 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            全局备注 (应用到所有扣除操作)
          </label>
          <Input
            multiline
            rows={2}
            value={globalNotes}
            onChange={(e) => setGlobalNotes(e.target.value)}
            placeholder="输入批量扣除的全局备注信息..."
            variant="glass"
            disabled={loading}
          />
        </div>
        
        {/* 扣除项目列表 - 表格形式 */}
        <div className="space-y-4">
          {projectThicknessSpecs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>当前项目暂无需要扣除的板材规格</p>
            </div>
          ) : (
            <Card glass className="overflow-visible">
              <div className="space-y-4 overflow-visible">
                {/* 表格标题 */}
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">板材扣除配置</h4>
                  <Badge variant="secondary">
                    {projectThicknessSpecs.length} 种规格
                  </Badge>
                </div>
                
                {/* 表格 */}
                <div className="overflow-visible">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-medium text-gray-900 w-16">选择</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">板材规格</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">可选工人</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 min-w-[200px]">工人</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 min-w-[200px]">尺寸</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900 w-24">数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectThicknessSpecs.map((spec, index) => {
                        const availableWorkers = getAvailableWorkers(spec);
                        const item = deductItems[spec.id] || {};
                        const workerOptions = generateWorkerOptions(spec);
                        const dimensionOptions = generateDimensionOptions(spec.id, item.workerId);
                        const maxQuantity = getAvailableQuantity(spec.id);
                        
                        return (
                          <motion.tr
                            key={spec.id}
                            className={`border-b border-gray-100 ${item.enabled ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                          >
                            {/* 选择复选框 */}
                            <td className="py-4 px-2">
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={item.enabled || false}
                                  onChange={(e) => updateDeductItem(spec.id, { enabled: e.target.checked })}
                                  className="w-5 h-5 text-ios18-blue rounded focus:ring-2 focus:ring-ios18-blue"
                                  disabled={loading || availableWorkers.length === 0}
                                />
                              </motion.div>
                            </td>
                            
                            {/* 板材规格 */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">
                                  {spec.materialType} {spec.thickness}{spec.unit}
                                </span>
                                <Badge 
                                  variant={availableWorkers.length > 0 ? "success" : "danger"} 
                                  size="sm"
                                  className="mt-1 self-start"
                                >
                                  {availableWorkers.length}人有库存
                                </Badge>
                              </div>
                            </td>
                            
                            {/* 可选工人数量 */}
                            <td className="py-4 px-4">
                              <div className="text-sm text-gray-600">
                                {availableWorkers.length > 0 ? (
                                  <span className="text-green-600 font-medium">
                                    {availableWorkers.length} 个工人
                                  </span>
                                ) : (
                                  <span className="text-red-600">暂无库存</span>
                                )}
                              </div>
                            </td>
                            
                            {/* 工人选择 */}
                            <td className="py-4 px-4 relative">
                              {item.enabled && availableWorkers.length > 0 ? (
                                <div className="relative z-10">
                                  <SearchableSelect
                                    value={item.workerId || ''}
                                    onChange={(value) => updateDeductItem(spec.id, {
                                      workerId: value.toString(),
                                      dimensionId: '',
                                      quantity: 1
                                    })}
                                    options={workerOptions}
                                    placeholder="选择工人..."
                                    clearable={true}
                                    variant="filled"
                                    disabled={loading}
                                    size="sm"
                                    className="relative"
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                            
                            {/* 尺寸选择 */}
                            <td className="py-4 px-4 relative">
                              {item.enabled && item.workerId ? (
                                <div className="relative z-10">
                                  <SearchableSelect
                                    value={item.dimensionId || ''}
                                    onChange={(value) => updateDeductItem(spec.id, {
                                      dimensionId: value.toString(),
                                      quantity: 1
                                    })}
                                    options={dimensionOptions}
                                    placeholder="选择尺寸..."
                                    clearable={true}
                                    variant="filled"
                                    disabled={loading}
                                    size="sm"
                                    className="relative"
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                            
                            {/* 数量输入 */}
                            <td className="py-4 px-4">
                              {item.enabled && item.dimensionId ? (
                                <div className="space-y-1">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={maxQuantity}
                                    value={item.quantity || 1}
                                    onChange={(e) => updateDeductItem(spec.id, {
                                      quantity: parseInt(e.target.value) || 1
                                    })}
                                    variant="filled"
                                    disabled={loading}
                                    className="w-20"
                                    error={(item.quantity || 0) > maxQuantity ? `数量不能超过${maxQuantity}` : undefined}
                                  />
                                  <div className="text-xs text-gray-500">
                                    最大: {maxQuantity}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* 无库存的规格提示 */}
                {projectThicknessSpecs.some(spec => getAvailableWorkers(spec).length === 0) && (
                  <Alert variant="warning" className="mt-4">
                    <div className="flex items-start space-x-2">
                      <ExclamationCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">部分板材规格暂无库存</p>
                        <p className="text-sm mt-1">
                          以下规格暂无可用库存：
                          {projectThicknessSpecs
                            .filter(spec => getAvailableWorkers(spec).length === 0)
                            .map(spec => `${spec.materialType} ${spec.thickness}${spec.unit}`)
                            .join('、')}
                        </p>
                      </div>
                    </div>
                  </Alert>
                )}
              </div>
            </Card>
          )}
        </div>
        
        {/* 批量操作摘要 */}
        {enabledCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card glass className="!bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-purple-500 rounded-ios-lg flex items-center justify-center">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">批量扣除摘要</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">选中厚度：</span>
                      <span className="font-medium text-gray-900">{enabledCount} 种</span>
                    </div>
                    <div>
                      <span className="text-gray-500">总扣除量：</span>
                      <span className="font-medium text-gray-900">{totalQuantity} 张</span>
                    </div>
                    <div>
                      <span className="text-gray-500">目标项目：</span>
                      <span className="font-medium text-gray-900">{project.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">操作模式：</span>
                      <span className="font-medium text-purple-600">批量扣除</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </Modal>
  );
};

export default ProjectDetailModern;
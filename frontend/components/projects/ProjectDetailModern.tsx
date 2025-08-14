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
  Select
} from '@/components/ui';
import type { TimelineItem, StatusType } from '@/components/ui';
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
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { updateMaterialStatusShared, getProjectMaterialStatus } from '@/utils/materialStatusManager';
import { formatDate, formatDateTime } from '@/utils/dateFormatter';
import { apiRequest } from '@/utils/api';
import { useResponsive } from '@/hooks/useResponsive';
import { DrawingUpload } from '@/components/drawings/DrawingUpload';
import { MaterialRequirementManager } from '@/components/materials/MaterialRequirementManager';
import { ProjectBorrowingDetails } from '@/components/materials/ProjectBorrowingDetails';
import type { Project, Material, Drawing, ThicknessSpec, OperationHistory } from '@/types/project';

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

  // 材料编辑相关状态
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialNotes, setMaterialNotes] = useState('');

  // 图纸上传相关状态
  const [showUploadModal, setShowUploadModal] = useState(false);

  // 需求管理相关状态
  const [showRequirementManager, setShowRequirementManager] = useState(false);
  const [selectedMaterialForRequirement, setSelectedMaterialForRequirement] = useState<Material | null>(null);


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

  // 处理需求管理打开
  const handleOpenRequirementManager = async (material: Material) => {
    // 如果材料记录不存在，先创建一个
    if (material.id === -1) {
      try {
        const response = await apiRequest('/api/materials', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            projectId: material.projectId,
            thicknessSpecId: material.thicknessSpecId,
            status: 'pending',
            quantity: 1
          })
        });

        if (response.ok) {
          const data = await response.json();
          setSelectedMaterialForRequirement(data.material);
          setShowRequirementManager(true);
          await fetchProjectDetail(); // 刷新项目详情
        }
      } catch (error) {
        // 创建材料记录时出错，忽略错误日志
      }
    } else {
      setSelectedMaterialForRequirement(material);
      setShowRequirementManager(true);
    }
  };

  // 关闭需求管理模态框
  const handleCloseRequirementManager = () => {
    setShowRequirementManager(false);
    setSelectedMaterialForRequirement(null);
  };

  // 需求管理更新回调
  const handleRequirementUpdate = async () => {
    await fetchProjectDetail();
    fetchProjects();
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

    const carbonMaterials = project.materials.filter(m => !m.thicknessSpec.materialType || m.thicknessSpec.materialType === '碳板');
    const specialMaterials = project.materials.filter(m => m.thicknessSpec.materialType && m.thicknessSpec.materialType !== '碳板');

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
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Loading type="spinner" size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-500">
          <p>项目不存在</p>
          <Button variant="secondary" onClick={onBack} className="mt-4">
            返回
          </Button>
        </div>
      </div>
    );
  }

  const { total, completed, inProgress, pending } = getMaterialProgress();
  const { carbon, special } = getCarbonProgress();
  const { startDate, endDate, duration } = getProjectDuration();
  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.pending;
  const priority = priorityConfig[project.priority as keyof typeof priorityConfig] || priorityConfig.normal;

  return (
    <div className={`h-full flex flex-col bg-gray-50 ${className}`}>
      {/* 顶部导航 - 移动端适配 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className={isMobile ? "px-4 py-3" : "px-6 py-4"}>
          <div className={isMobile ? "space-y-3" : "flex items-center justify-between"}>
            {/* 返回按钮和标题 */}
            <div className={isMobile ? "flex items-center justify-between" : "flex items-center space-x-4"}>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size={isMobile ? "md" : "sm"}
                  onClick={onBack}
                  className="flex items-center space-x-2 shrink-0"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span>返回</span>
                </Button>
                {!isMobile && <div className="h-6 w-px bg-gray-300" />}
              </div>
              
              {/* 移动端标题单独一行 */}
              {isMobile && (
                <div className="text-right">
                  <Badge className={status.color} size="sm">
                    {status.label}
                  </Badge>
                </div>
              )}
            </div>

            {/* 项目信息 */}
            <div className={isMobile ? "space-y-2" : ""}>
              <h1 className={`font-bold text-gray-900 ${isMobile ? "text-lg" : "text-xl"}`}>
                {project.name}
              </h1>
              <div className={`flex items-center space-x-3 ${isMobile ? "text-xs" : "mt-1"}`}>
                {!isMobile && (
                  <>
                    <Badge className={status.color} size="sm">
                      {status.label}
                    </Badge>
                    <Badge className={priority.color} size="sm" variant="outline">
                      {priority.label}
                    </Badge>
                  </>
                )}
                <span className="text-xs text-gray-500">
                  创建于 {formatDate(project.createdAt)}
                </span>
                {isMobile && (
                  <Badge className={priority.color} size="sm" variant="outline">
                    {priority.label}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Tab导航 - 移动端适配 */}
            <div className={isMobile ? "overflow-x-auto" : ""}>
              <div className={`flex space-x-1 ${isMobile ? "min-w-max px-1" : ""}`}>
                {[
                { key: 'overview', label: '概览', icon: DocumentTextIcon },
                { key: 'materials', label: '板材', icon: CogIcon, badge: total },
                { key: 'drawings', label: '图纸', icon: PhotoIcon, badge: project.drawings.length },
                { key: 'history', label: '历史', icon: ClockIcon }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.key}
                    variant={activeTab === tab.key ? "primary" : "ghost"}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`${isMobile ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm"} font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={isMobile ? "w-3 h-3" : "w-4 h-4"} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <Badge variant="secondary" size="sm" className="ml-1">
                        {tab.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
        </div>
      </div>

      {/* 主内容区 - 移动端适配 */}
      <div className={`flex-1 overflow-auto ${isMobile ? "pb-20" : ""}`}>
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
              handleOpenRequirementManager={handleOpenRequirementManager}
            />
          )}

          {activeTab === 'drawings' && (
            <DrawingsSection 
              project={project}
              onUploadClick={() => setShowUploadModal(true)}
              onDeleteDrawing={handleDeleteDrawing}
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
      </div>

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
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowMaterialModal(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSaveMaterialNotes}>
              保存
            </Button>
          </div>
        </div>
      </Modal>

      {/* 图纸上传组件 - 使用统一的DrawingUpload组件，传递项目ID */}
      <DrawingUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleDrawingUploadSuccess}
        projectId={projectId}
      />

      {/* 需求管理模态框 */}
      {showRequirementManager && selectedMaterialForRequirement && (
        <MaterialRequirementManager
          projectId={selectedMaterialForRequirement.projectId}
          materialId={selectedMaterialForRequirement.id}
          materialType={selectedMaterialForRequirement.thicknessSpec?.materialType || '碳板'}
          thickness={selectedMaterialForRequirement.thicknessSpec?.thickness || ''}
          projectWorker={project.assignedWorker as any}
          onClose={handleCloseRequirementManager}
          onUpdate={handleRequirementUpdate}
        />
      )}

      <DialogRenderer />
      </div>
    </div>
  </div>
  );
}

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
        <h3 className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-gray-900 mb-4 flex items-center space-x-2`}>
          <UserIcon className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
          <span>项目信息</span>
        </h3>
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">碳板</span>
              <span className="text-sm text-gray-500">{carbon.completed}/{carbon.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${carbon.total > 0 ? (carbon.completed / carbon.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          {special.total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">特殊材料</span>
                <span className="text-sm text-gray-500">{special.completed}/{special.total}</span>
              </div>
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
        <h3 className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-gray-900 mb-4 flex items-center space-x-2`}>
          <CalendarIcon className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
          <span>工期统计</span>
        </h3>
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
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-gray-900`}>项目备注</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditingNotes(!editingNotes)}
        >
          <PencilIcon className="w-4 h-4 mr-2" />
          {editingNotes ? '取消' : '编辑'}
        </Button>
      </div>
      
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
          <div className="flex justify-end space-x-3">
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
          </div>
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
  handleOpenRequirementManager: (material: Material) => void;
}> = ({ project, thicknessSpecs, onMaterialStatusChange, onEditMaterial, token, fetchProjectDetail, handleOpenRequirementManager }) => {


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
      <div key={spec.id} className="flex flex-col">
        {/* 状态切换按钮 - 使用Button实现点击状态切换 */}
        <div className="flex flex-col items-center p-2 rounded-t-lg bg-white hover:shadow-sm transition-shadow">
          <button
            type="button"
            className={`w-full py-1.5 rounded text-xs font-medium ${config.color} ${config.textColor} hover:opacity-80 transition-all hover:scale-105 border border-transparent hover:border-gray-300 cursor-pointer`}
            onClick={() => handleStatusClick(spec.id, status)}
            
          >
            {getMaterialCode(spec.materialType)}{parseFloat(spec.thickness)}
          </button>
        </div>
        
        {/* 尺寸需求管理按钮 - 始终显示 */}
        <Button
          variant="ghost"
          className={`w-full py-1 px-2 ${
            spec.materialType === '碳板' || !spec.materialType 
              ? 'bg-blue-50 hover:bg-blue-100 border-t border-blue-200 text-blue-600' 
              : 'bg-orange-50 hover:bg-orange-100 border-t border-orange-200 text-orange-600'
          } rounded-b text-xs transition-colors flex items-center justify-center space-x-1`}
          onClick={() => {
            // 打开需求管理模态框
            handleOpenRequirementManager(material || {
              id: -1,
              projectId: project.id,
              thicknessSpecId: spec.id,
              status: 'pending' as StatusType,
              thicknessSpec: spec
            });
          }}
          
        >
          <CogIcon className="w-3 h-3" />
          <span>需求</span>
        </Button>
        
        {/* 板材tab特有的功能：编辑按钮和详细信息 */}
        {material && (
          <div className="mt-1 flex flex-col space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditMaterial(material)}
              className="text-xs py-1 px-2 h-6"
              
            >
              <PencilIcon className="w-3 h-3 mr-1" />
              编辑
            </Button>
            <div className="text-xs text-gray-500 text-center">
              {material.startDate && <div>始: {formatDate(material.startDate)}</div>}
              {material.completedDate && <div>完: {formatDate(material.completedDate)}</div>}
              {material.completedByUser && <div>人: {material.completedByUser.name}</div>}
            </div>
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
      className="p-6 space-y-8"
    >
      {/* 碳板材料区域 */}
      {carbonSpecs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">
              碳板材料 ({carbonSpecs.length}种)
            </h3>
            <div className="flex items-center space-x-3">
              <Badge variant="primary" size="sm">
                {carbonStats.completed}/{carbonStats.total} 已完成
              </Badge>
              <Badge variant="secondary" size="sm">
                {carbonStats.inProgress} 进行中
              </Badge>
              <Badge variant="secondary" size="sm">
                {carbonStats.started}/{carbonStats.total} 已开始
              </Badge>
            </div>
          </div>
          
          {/* 进度条 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-blue-800 mb-1">
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

          {/* 厚度规格按钮网格 */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(carbonSpecs.length, 8)}, 1fr)` }}>
            {carbonSpecs.map(renderThicknessButton)}
          </div>
        </div>
      )}

      {/* 特殊材料区域 */}
      {specialSpecs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-orange-900">
              特殊材料 ({specialSpecs.length}种)
            </h3>
            <div className="flex items-center space-x-3">
              <Badge variant="warning" size="sm">
                {specialStats.completed}/{specialStats.total} 已完成
              </Badge>
              <Badge variant="secondary" size="sm">
                {specialStats.inProgress} 进行中
              </Badge>
              <Badge variant="secondary" size="sm">
                {specialStats.started}/{specialStats.total} 已开始
              </Badge>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-orange-800 mb-1">
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

          {/* 厚度规格按钮网格 */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(specialSpecs.length, 6)}, 1fr)` }}>
            {specialSpecs.map(renderThicknessButton)}
          </div>
        </div>
      )}

      {carbonSpecs.length === 0 && specialSpecs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <CogIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>该项目暂无板材</p>
          <p className="text-sm mt-2">项目还没有分配任何板材规格</p>
        </div>
      )}

      {/* 借用管理区域 - 直接展示 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 flex items-center mb-4">
          <TruckIcon className="w-5 h-5 mr-2 text-blue-500" />
          板材借用详情
        </h4>
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
}> = ({ project, onUploadClick, onDeleteDrawing }) => {
  return (
    <motion.div
      key="drawings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">项目图纸</h3>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary">{project.drawings.length} 个文件</Badge>
          <Button variant="primary" size="sm" onClick={onUploadClick}>
            <CloudArrowUpIcon className="w-4 h-4 mr-2" />
            上传图纸
          </Button>
        </div>
      </div>

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
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 truncate" title={drawing.originalFilename}>
                      {drawing.originalFilename}
                    </h4>
                    <p className="text-sm text-gray-500">版本 {drawing.version}</p>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <Button variant="ghost" size="sm">
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDeleteDrawing(drawing.id, drawing.originalFilename || '')}
                      className="text-red-600 hover:text-red-700"
                      
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  <div>上传者: {drawing.uploadedBy.name}</div>
                  <div>时间: {formatDate(drawing.uploadedAt)}</div>
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">项目操作记录</h3>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            刷新
          </Button>
        </div>
      </div>

      {/* 筛选控制 */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">筛选类型：</span>
          <Select
            value={filterType}
            onChange={(value) => setFilterType(value.toString())}
            options={filterOptions}
            className="w-32"
          />
        </div>
        <span className="text-xs text-gray-500">共 {filteredHistory.length} 条记录</span>
      </div>

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
            <div className="flex items-center space-x-2">
              <PlayIcon className="w-3 h-3" />
              <span>开始处理 - 工人开始处理某项板材加工任务</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-3 h-3" />
              <span>完成加工 - 工人完成板材加工并记录用时</span>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowRightIcon className="w-3 h-3" />
              <span>转移板材 - 工人之间的板材资源转移</span>
            </div>
            <div className="flex items-center space-x-2">
              <UserIcon className="w-3 h-3" />
              <span>分配材料 - 为项目分配所需的板材资源</span>
            </div>
            <div className="flex items-center space-x-2">
              <PlusIcon className="w-3 h-3" />
              <span>添加需求 - 项目新增材料需求或创建项目</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};


export default ProjectDetailModern;
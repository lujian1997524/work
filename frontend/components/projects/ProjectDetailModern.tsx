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
  useDialog
} from '@/components/ui';
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
  TagIcon
} from '@heroicons/react/24/outline';
import { updateMaterialStatusShared, getProjectMaterialStatus } from '@/utils/materialStatusManager';
import { formatDate, formatDateTime } from '@/utils/dateFormatter';
import { apiRequest } from '@/utils/api';
import { DrawingUpload } from '@/components/drawings/DrawingUpload';
import { MaterialRequirementManager } from '@/components/materials/MaterialRequirementManager';
import { ProjectBorrowingDetails } from '@/components/materials/ProjectBorrowingDetails';
import type { Project, Material, Drawing, ThicknessSpec, OperationHistory } from '@/types/project';
import type { StatusType } from '@/components/ui';

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
      console.error('获取项目详情失败:', error);
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
      console.error('获取厚度规格失败:', error);
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
      console.error('获取操作历史失败:', error);
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
        updateProjectFn: updateProject,
        fetchProjectsFn: fetchProjects,
        setLoadingFn: setLoading,
      });
      
      if (success) {
        // 后台刷新项目详情确保数据一致性
        await fetchProjectDetail();
        console.log('材料状态更新成功');
      } else {
        // 如果失败，恢复原状态
        await fetchProjectDetail();
      }
    } catch (error) {
      console.error('更新材料状态失败:', error);
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
      console.error('保存备注错误:', error);
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
      console.error('保存材料备注失败:', error);
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
        console.error('创建材料记录时出错:', error);
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
      console.error('删除图纸失败:', error);
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
      {/* 顶部导航 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>返回</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <div className="flex items-center space-x-3 mt-1">
                  <Badge className={status.color} size="sm">
                    {status.label}
                  </Badge>
                  <Badge className={priority.color} size="sm" variant="outline">
                    {priority.label}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    创建于 {formatDate(project.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Tab导航 */}
            <div className="flex space-x-1">
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
                    className={`px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2 ${
                      activeTab === tab.key
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
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
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
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
        title={editingMaterial ? `编辑 ${editingMaterial.thicknessSpec.thickness}${editingMaterial.thicknessSpec.unit} 材料` : '编辑材料'}
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
          projectWorker={project.assignedWorker}
          onClose={handleCloseRequirementManager}
          onUpdate={handleRequirementUpdate}
        />
      )}

      <DialogRenderer />
    </div>
  );
};

// 概览子组件
const OverviewSection: React.FC<{
  project: Project;
  carbon: { total: number; completed: number };
  special: { total: number; completed: number };
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  startDate: Date | null;
  endDate: Date | null;
  duration: number;
  projectNotes: string;
  setProjectNotes: (notes: string) => void;
  editingNotes: boolean;
  setEditingNotes: (editing: boolean) => void;
  savingNotes: boolean;
  handleSaveNotes: () => void;
}> = ({ 
  project, carbon, special, total, completed, inProgress, pending, 
  startDate, endDate, duration, projectNotes, setProjectNotes, 
  editingNotes, setEditingNotes, savingNotes, handleSaveNotes 
}) => (
  <motion.div
    key="overview"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="p-6 space-y-6"
  >
    {/* 项目概览卡片 */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 项目基本信息 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <UserIcon className="w-5 h-5" />
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
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">碳板进度</h3>
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
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">整体统计</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <div className="text-xs text-gray-500">已完成</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
            <div className="text-xs text-gray-500">进行中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{pending}</div>
            <div className="text-xs text-gray-500">待处理</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{total}</div>
            <div className="text-xs text-gray-500">总计</div>
          </div>
        </div>
      </Card>

      {/* 工期统计 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <CalendarIcon className="w-5 h-5" />
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
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">项目备注</h3>
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
        <div className="flex flex-col items-center p-2 border border-gray-200 rounded-t-lg bg-white hover:shadow-sm transition-shadow">
          <button
            type="button"
            className={`w-full py-1.5 rounded text-xs font-medium ${config.color} ${config.textColor} hover:opacity-80 transition-all hover:scale-105 border border-transparent hover:border-gray-300 cursor-pointer`}
            onClick={() => handleStatusClick(spec.id, status)}
            title={`${spec.thickness}${spec.unit} - 当前: ${config.label}, 点击切换到下一状态`}
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
          title="管理板材尺寸需求"
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
              title="编辑材料详情"
            >
              <PencilIcon className="w-3 h-3 mr-1" />
              编辑
            </Button>
            <div className="text-xs text-gray-500 text-center">
              {material.startDate && <div>始: {formatDate(material.startDate)}</div>}
              {material.completedDate && <div>完: {formatDate(material.completedDate)}</div>}
              {material.completedBy && <div>人: {material.completedBy.name}</div>}
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
        <div className="bg-blue-50 rounded-lg p-4">
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
        <div className="bg-orange-50 rounded-lg p-4">
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
                    <Button variant="ghost" size="sm" title="预览图纸">
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDeleteDrawing(drawing.id, drawing.originalFilename)}
                      className="text-red-600 hover:text-red-700"
                      title="删除图纸"
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
  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'material_update': return CogIcon;
      case 'drawing_upload': return PhotoIcon;
      case 'project_update': return PencilIcon;
      case 'project_create': return PlusIcon;
      case 'project_delete': return TrashIcon;
      default: return DocumentIcon;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case 'material_update': return 'text-blue-600';
      case 'drawing_upload': return 'text-green-600';
      case 'project_update': return 'text-orange-600';
      case 'project_create': return 'text-purple-600';
      case 'project_delete': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">操作历史</h3>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          刷新
        </Button>
      </div>

      {operationHistory.length > 0 ? (
        <div className="space-y-4">
          {operationHistory.map((record) => {
            const Icon = getOperationIcon(record.operationType);
            const colorClass = getOperationColor(record.operationType);
            
            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {record.operationDescription}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {formatDateTime(record.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        操作者: {record.operator.name}
                      </p>
                      {record.details && Object.keys(record.details).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(record.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <ClockIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>暂无操作历史</p>
        </div>
      )}
    </motion.div>
  );
};


export default ProjectDetailModern;
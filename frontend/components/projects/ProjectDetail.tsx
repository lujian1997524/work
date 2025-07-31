'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore, type ProjectState } from '@/stores';
import { StatusToggle, CADPreview, DxfPreviewModal, Card, Input, Loading, VerticalTimeline } from '@/components/ui';
import type { StatusType } from '@/components/ui';
import { ProjectDetailCard } from '@/components/projects/ProjectCard';
import cadFileHandler from '@/utils/cadFileHandler';
import { apiRequest } from '@/utils/api';
import { 
  updateMaterialStatusShared, 
  getProjectMaterialStatus 
} from '@/utils/materialStatusManager';

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
  uploader?: { id: number; name: string };
}

interface OperationHistory {
  id: number;
  projectId: number;
  operationType: 'material_update' | 'drawing_upload' | 'project_update' | 'project_create' | 'project_delete';
  operationDescription: string;
  details: {
    [key: string]: any;
  };
  operatedBy: number;
  created_at: string;
  operator: { id: number; name: string };
  project: { id: number; name: string };
}

interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
  materials: Material[];
  drawings: Drawing[];
}

interface ProjectDetailProps {
  projectId: number;
  onBack: () => void;
  className?: string;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projectId,
  onBack,
  className = ''
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [operationHistory, setOperationHistory] = useState<OperationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDrawing, setUploadingDrawing] = useState(false);
  const [cadSoftwareInfo, setCADSoftwareInfo] = useState<string>('');
  const [thicknessSpecs, setThicknessSpecs] = useState<ThicknessSpec[]>([]);
  const [previewDrawing, setPreviewDrawing] = useState<Drawing | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [projectNotes, setProjectNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);
  const { token, user } = useAuth();
  const { projects, updateProject, fetchProjects } = useProjectStore();

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
        // 更新本地项目数据
        setProject(prev => prev ? { ...prev, description: projectNotes } : null);
        // 刷新项目列表
        fetchProjects();
      } else {
        alert('保存备注失败');
      }
    } catch (error) {
      console.error('保存备注错误:', error);
      alert('保存备注失败');
    } finally {
      setSavingNotes(false);
    }
  };

  // 处理操作历史详情文本显示
  const getOperationDetailsText = (record: OperationHistory): string => {
    try {
      const details = record.details;
      
      switch (record.operationType) {
        case 'material_update':
          return `材料ID: ${details.materialId}, 厚度: ${details.thickness}${details.unit}`;
          
        case 'drawing_upload':
          return `文件: ${details.originalFilename}, 版本: ${details.version}`;
          
        case 'project_update':
          if (details.changes) {
            const changeTexts = [];
            if (details.changes.status) {
              changeTexts.push(`状态: ${details.changes.oldStatus} → ${details.changes.status}`);
            }
            if (details.changes.priority) {
              changeTexts.push(`优先级: ${details.changes.oldPriority} → ${details.changes.priority}`);
            }
            if (details.changes.name) {
              changeTexts.push(`名称: ${details.changes.oldName} → ${details.changes.name}`);
            }
            if (details.changes.assignedWorkerId !== undefined) {
              changeTexts.push(`工人: ${details.changes.oldWorkerName || '无'} → ${details.changes.newWorkerName || '无'}`);
            }
            return changeTexts.join(', ');
          }
          return '项目信息已更新';
          
        case 'project_create':
          return `项目状态: ${details.status}, 优先级: ${details.priority}`;
          
        case 'project_delete':
          return `项目已删除: ${details.projectName}`;
          
        default:
          return '操作详情';
      }
    } catch (error) {
      console.warn('处理操作历史详情时出错:', error);
      return '操作详情';
    }
  };

  // 转换操作历史为Timeline格式
  const convertHistoryToTimeline = () => {
    return operationHistory.map(record => {
      let status: 'success' | 'error' | 'warning' | 'info' | 'pending' = 'info';
      let icon: React.ReactNode = null;
      
      // 根据操作类型设置状态和图标
      switch (record.operationType) {
        case 'material_update':
          status = 'success';
          icon = (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          );
          break;
        case 'drawing_upload':
          status = 'info';
          icon = (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          );
          break;
        case 'project_create':
          status = 'success';
          icon = (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          );
          break;
        case 'project_update':
          status = 'warning';
          icon = (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          );
          break;
        case 'project_delete':
          status = 'error';
          icon = (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          );
          break;
      }

      return {
        id: record.id.toString(),
        title: record.operationDescription,
        description: getOperationDetailsText(record),
        timestamp: record.created_at,
        icon,
        status,
        content: (
          <div className="text-xs text-gray-500">
            <span>{record.operator.name}</span>
          </div>
        )
      };
    });
  };

  // 获取项目详情
  const fetchProjectDetail = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setProjectNotes(data.project.description || '');
      } else {
        console.error('获取项目详情失败');
      }
    } catch (error) {
      console.error('获取项目详情错误:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取操作历史
  const fetchOperationHistory = async () => {
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
      console.error('获取操作历史错误:', error);
    }
  };

  useEffect(() => {
    fetchProjectDetail();
    fetchOperationHistory();
    fetchThicknessSpecs();
    initializeCADDetection();
  }, [projectId]);

  // 监听材料更新事件，保持与主页面同步
  useEffect(() => {
    const handleMaterialsUpdate = (event: CustomEvent) => {
      // 刷新项目数据以获取最新的材料状态
      fetchProjectDetail();
      fetchProjects();
    };

    window.addEventListener('materials-updated', handleMaterialsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('materials-updated', handleMaterialsUpdate as EventListener);
    };
  }, []);

  // 获取厚度规格
  const fetchThicknessSpecs = async () => {
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

  // 初始化CAD检测
  const initializeCADDetection = async () => {
    try {
      if (cadFileHandler.isElectronEnvironment()) {
        const result = await cadFileHandler.detectCADSoftware();
        if (result.success) {
          setCADSoftwareInfo(cadFileHandler.formatSoftwareInfo());
        } else {
          setCADSoftwareInfo('CAD软件检测失败');
        }
      } else {
        setCADSoftwareInfo('网页版：支持下载图纸到本地');
      }
    } catch (error) {
      console.error('CAD检测初始化失败:', error);
      setCADSoftwareInfo('CAD软件检测失败');
    }
  };

  // 更新材料状态 - 使用共享逻辑
  const updateMaterialStatus = async (materialId: number, newStatus: StatusType) => {
    if (!token || !user) return;

    try {
      setLoading(true);
      
      // 找到材料对应的厚度规格ID
      let targetThicknessSpecId: number | undefined;
      
      if (project) {
        const material = project.materials.find(m => m.id === materialId);
        if (material) {
          targetThicknessSpecId = material.thicknessSpecId;
        }
      }
      
      if (!targetThicknessSpecId) {
        console.error('无法找到材料对应的厚度规格ID');
        alert('无法找到材料信息');
        return;
      }

      console.log('使用共享函数更新材料状态:', { projectId, targetThicknessSpecId, newStatus });

      // 使用与MaterialsTable相同的共享函数
      const success = await updateMaterialStatusShared(projectId, targetThicknessSpecId, newStatus, {
        projects: projects as any[],
        thicknessSpecs: thicknessSpecs,
        user,
        updateProjectFn: updateProject,
        fetchProjectsFn: fetchProjects,
        setLoadingFn: setLoading,
      });
      
      if (success) {
        // 刷新项目详情
        await fetchProjectDetail();
        // 触发材料更新事件
        window.dispatchEvent(new CustomEvent('materials-updated'));
        console.log('材料状态更新成功');
      } else {
        console.error('材料状态更新失败');
        alert('材料状态更新失败');
      }
    } catch (error) {
      console.error('更新材料状态失败:', error);
      alert(`更新材料状态失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);  
    }
  };

  // 获取项目的材料状态（根据厚度规格ID）- 使用共享逻辑
  const getProjectMaterialStatusForUI = (thicknessSpecId: number): StatusType => {
    return getProjectMaterialStatus(projects as any[], projectId, thicknessSpecId);
  };

  // 上传图纸
  const handleDrawingUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDrawing(true);
    try {
      const formData = new FormData();
      formData.append('drawing', file);

      const response = await apiRequest(`/api/drawings/project/${projectId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        // 重新获取项目详情
        fetchProjectDetail();
        // 清空文件输入
        event.target.value = '';
      } else {
        const errorData = await response.json();
        alert('图纸上传失败: ' + (errorData.error || '服务器错误'));
      }
    } catch (error) {
      console.error('上传图纸错误:', error);
      alert('图纸上传失败');
    } finally {
      setUploadingDrawing(false);
    }
  };

  // 预览图纸
  const handlePreviewDrawing = (drawing: Drawing) => {
    setPreviewDrawing(drawing);
    setIsPreviewModalOpen(true);
  };

  // 关闭预览弹窗
  const closePreviewModal = () => {
    setIsPreviewModalOpen(false);
    setPreviewDrawing(null);
  };

  // 打开图纸
  const openDrawing = async (drawing: Drawing) => {
    try {
      const fileName = drawing.originalFilename || drawing.filename;
      // 首先检查是否为CAD文件
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
    } catch (error) {
      console.error('打开图纸失败:', error);
      alert('打开图纸失败');
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'pending': return '待处理';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  // 获取优先级颜色
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

  // 获取优先级文本
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg ${className}`}>
        <div className="p-8 text-center">
          <Loading size="lg" text="加载项目详情中..." />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg ${className}`}>
        <div className="p-8 text-center">
          <p className="text-gray-500">项目不存在</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col ${className}`}
      style={{ height: 'calc(100% - 0.5rem)' }}
    >
      {/* 标题栏 */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="返回列表"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
              <div className="flex items-center space-x-3 mt-1">
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                  {getStatusText(project.status)}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(project.priority)}`}>
                  {getPriorityText(project.priority)}优先级
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchProjectDetail();
                fetchOperationHistory();
              }}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 - 保留原有功能，优化布局 */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="space-y-6 p-6">
          {/* 使用新的卡片组件展示材料状态 */}
          <ProjectDetailCard
            project={{
              id: project.id,
              name: project.name,
              status: project.status,
              priority: project.priority,
              assignedWorker: project.assignedWorker,
              materials: project.materials || [],
              drawings: project.drawings || [],
              createdAt: project.createdAt
            }}
            onEdit={() => {
              console.log('编辑项目:', project.id);
            }}
            onManageDrawings={() => {
              console.log('管理图纸:', project.id);
            }}
            onMaterialStatusChange={updateMaterialStatus}
          />

          {/* 项目备注区域 */}
          <Card className="bg-white border border-gray-200 shadow-sm" padding="none">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">项目备注</h3>
                  <p className="text-sm text-gray-600 mt-1">记录项目相关的重要备注信息</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <textarea
                    className="w-full p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                    rows={4}
                    placeholder="在此输入项目备注信息..."
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <motion.button 
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      savingNotes 
                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md'
                    }`}
                    whileHover={savingNotes ? {} : { scale: 1.02 }}
                    whileTap={savingNotes ? {} : { scale: 0.98 }}
                  >
                    {savingNotes ? '保存中...' : '保存备注'}
                  </motion.button>
                </div>
              </div>
            </div>
          </Card>

          {/* 图纸管理部分 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">图纸管理</h3>
                  <p className="text-sm text-gray-600 mt-1">{cadSoftwareInfo}</p>
                </div>
                <div>
                  <input
                    type="file"
                    id="drawing-upload"
                    className="hidden"
                    accept=".dxf"
                    onChange={handleDrawingUpload}
                    disabled={uploadingDrawing}
                  />
                  <label
                    htmlFor="drawing-upload"
                    className={`px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer text-sm ${
                      uploadingDrawing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploadingDrawing ? '上传中...' : '上传图纸'}
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {project.drawings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg">暂无图纸文件</p>
                    <p className="text-sm text-gray-400 mt-1">点击上方"上传图纸"按钮添加图纸</p>
                  </div>
                ) : (
                  project.drawings.map(drawing => {
                    const fileName = drawing.originalFilename || drawing.filename;
                    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                    const isDXF = fileExtension === 'dxf';
                    
                    return (
                      <div key={drawing.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between space-x-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="flex items-center space-x-2">
                                {isDXF ? (
                                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                ) : (
                                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                                {isDXF && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">DXF</span>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{fileName}</div>
                                <div className="text-sm text-gray-600">
                                  版本 {drawing.version} • {drawing.uploader?.name || '未知'} • {new Date(drawing.createdAt).toLocaleDateString('zh-CN')}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            {isDXF && (
                              <button
                                onClick={() => handlePreviewDrawing(drawing)}
                                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex-shrink-0"
                                title="预览DXF图纸"
                              >
                                预览
                              </button>
                            )}
                            <button
                              onClick={() => openDrawing(drawing)}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex-shrink-0"
                            >
                              {isDXF && cadFileHandler.isElectronEnvironment() ? '用CAD打开' : '打开'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 操作历史部分 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">操作历史</h3>
              <p className="text-sm text-gray-600 mt-1">项目相关的所有操作记录</p>
            </div>
            
            <div className="p-6">
              {operationHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg">暂无操作历史</p>
                  <p className="text-sm text-gray-400 mt-1">项目的操作记录会显示在这里</p>
                </div>
              ) : (
                <VerticalTimeline
                  items={convertHistoryToTimeline()}
                  size="sm"
                  className="max-h-96 overflow-y-auto"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 图纸预览弹窗 */}
      <DxfPreviewModal
        drawing={previewDrawing}
        isOpen={isPreviewModalOpen}
        onClose={closePreviewModal}
      />
    </div>
  );
};
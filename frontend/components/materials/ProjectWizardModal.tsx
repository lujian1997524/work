'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Select, Form, FormField, FormActions, Loading, Badge, SearchableSelect } from '@/components/ui';
import { 
  XMarkIcon, 
  PlusIcon, 
  TrashIcon, 
  ChevronDownIcon, 
  ChevronLeftIcon,
  ChevronRightIcon,
  FireIcon, 
  FolderIcon, 
  CheckCircleIcon, 
  CloudArrowUpIcon, 
  DocumentIcon,
  UserIcon,
  Cog6ToothIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/components/ui/Toast';
import { PROJECT_STATUS_OPTIONS, PROJECT_PRIORITY_OPTIONS } from '@/constants/projectEnums';
import { drawingToastHelper } from '@/utils/drawingToastHelper';
import type { ThicknessSpec, ProjectFormData } from '@/types/project';

interface Worker {
  id: number;
  name: string;
  department: string;
  position: string;
}

interface WorkerMaterial {
  id: number;
  workerId: number;
  thicknessSpecId: number;
  quantity: number;
  thicknessSpec: ThicknessSpec;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface ProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<any>;
  project?: {
    id: number;
    name: string;
    description?: string;
    status: string;
    priority: string;
    assignedWorker?: { id: number; name: string };
    materials?: { id: number; thicknessSpecId: number; thicknessSpec: ThicknessSpec }[];
  } | null;
  loading?: boolean;
}

// 向导步骤枚举
enum WizardStep {
  BASIC_INFO = 1,
  THICKNESS_SELECTION = 2,
  DRAWINGS_CONFIRMATION = 3
}

const STEP_CONFIG = [
  {
    step: WizardStep.BASIC_INFO,
    title: '基本信息',
    description: '项目名称和工人分配',
    icon: UserIcon
  },
  {
    step: WizardStep.THICKNESS_SELECTION,
    title: '厚度选择',
    description: '选择需要的板材厚度',
    icon: RectangleStackIcon
  },
  {
    step: WizardStep.DRAWINGS_CONFIRMATION,
    title: '图纸确认',
    description: '上传图纸并确认创建',
    icon: DocumentIcon
  }
];

export const ProjectWizardModal: React.FC<ProjectWizardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project = null,
  loading = false
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.BASIC_INFO);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    assignedWorkerId: null,
    requiredThickness: []
  });
  
  // 编辑模式相关状态
  const [originalFormData, setOriginalFormData] = useState<ProjectFormData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [thicknessSpecs, setThicknessSpecs] = useState<ThicknessSpec[]>([]);
  const [localWorkerMaterials, setLocalWorkerMaterials] = useState<any>(null);
  const [loadingWorkerMaterials, setLoadingWorkerMaterials] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showSpecialMaterials, setShowSpecialMaterials] = useState(false);
  
  // 图纸上传相关状态
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploadingDrawings, setIsUploadingDrawings] = useState(false);
  
  const { token } = useAuth();
  const toast = useToast();

  // 初始化数据
  useEffect(() => {
    if (isOpen) {
      fetchWorkers();
      fetchThicknessSpecs();
      
      // 根据是否有project判断模式
      const editMode = !!project;
      setIsEditMode(editMode);
      
      // 编辑模式从第1步开始，新建模式也从第1步开始
      setCurrentStep(WizardStep.BASIC_INFO);
    }
  }, [isOpen, project]);

  // 设置表单数据
  useEffect(() => {
    if (project) {
      const projectFormData = {
        name: project.name || '',
        description: project.description || '',
        status: project.status as any || 'pending',
        priority: project.priority as any || 'medium',
        assignedWorkerId: project.assignedWorker?.id || null,
        requiredThickness: project.materials?.map(m => m.thicknessSpecId) || []
      };
      
      setFormData(projectFormData);
      setOriginalFormData(projectFormData); // 保存原始数据用于比较
      setHasUnsavedChanges(false);
    } else {
      const emptyFormData: ProjectFormData = {
        name: '',
        description: '',
        status: 'pending' as const,
        priority: 'medium' as const,
        assignedWorkerId: null,
        requiredThickness: []
      };
      
      setFormData(emptyFormData);
      setOriginalFormData(null);
      setHasUnsavedChanges(false);
    }
    setFormErrors({});
    setUploadFiles([]);
    setIsUploadingDrawings(false);
  }, [project, isOpen]);

  const fetchWorkers = async () => {
    try {
      const response = await apiRequest('/api/workers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.workers || []);
      }
    } catch (error) {
      // 静默处理错误
    }
  };

  const fetchThicknessSpecs = async () => {
    try {
      const response = await apiRequest('/api/thickness-specs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const activeSpecs = (data.thicknessSpecs || []).filter((spec: ThicknessSpec) => spec.isActive);
        setThicknessSpecs(activeSpecs);
      }
    } catch (error) {
      // 静默处理错误
    }
  };

  const fetchWorkerMaterials = async (workerId: number) => {
    if (!workerId || !token) return;

    try {
      setLoadingWorkerMaterials(true);
      const response = await apiRequest(`/api/worker-materials?workerId=${workerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLocalWorkerMaterials(data);
      }
    } catch (error) {
      setLocalWorkerMaterials(null);
    } finally {
      setLoadingWorkerMaterials(false);
    }
  };

  // 监听工人选择变化
  useEffect(() => {
    if (formData.assignedWorkerId) {
      fetchWorkerMaterials(formData.assignedWorkerId);
    } else {
      setLocalWorkerMaterials(null);
    }
  }, [formData.assignedWorkerId, token]);

  // 步骤验证函数（编辑模式下放宽限制）
  const validateStep = (step: WizardStep): boolean => {
    const errors: Record<string, string> = {};

    // 编辑模式和新建模式都需要验证基本信息
    if (step === WizardStep.BASIC_INFO) {
      if (!formData.name.trim()) {
        errors.name = '项目名称不能为空';
      }
      if (!formData.assignedWorkerId) {
        errors.assignedWorkerId = '请选择分配的工人';
      }
    }
    
    // 新建模式下的厚度选择验证
    if (step === WizardStep.THICKNESS_SELECTION && !isEditMode) {
      if (!formData.requiredThickness || formData.requiredThickness.length === 0) {
        errors.requiredThickness = '请至少选择一种板材厚度';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 智能步骤跳转（编辑模式下允许直接跳转）
  const handleStepClick = (targetStep: WizardStep) => {
    if (isEditMode) {
      // 编辑模式下允许直接跳转
      setCurrentStep(targetStep);
    } else {
      // 新建模式下只能逐步前进
      if (targetStep <= currentStep) {
        setCurrentStep(targetStep);
      }
    }
  };

  // 下一步
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, WizardStep.DRAWINGS_CONFIRMATION));
    }
  };

  // 上一步
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, WizardStep.BASIC_INFO));
  };

  // 表单提交
  const handleSubmit = async () => {
    // 编辑模式下，如果用户在第一步，验证基本信息
    // 如果在其他步骤，直接提交当前的formData
    if (isEditMode) {
      // 编辑模式下，只验证当前步骤
      if (currentStep === WizardStep.BASIC_INFO) {
        if (!validateStep(WizardStep.BASIC_INFO)) {
          return;
        }
      }
      // 其他步骤或基本信息验证通过，直接提交
    } else {
      // 新建模式下，严格验证厚度选择
      if (!validateStep(WizardStep.THICKNESS_SELECTION)) {
        setCurrentStep(WizardStep.THICKNESS_SELECTION);
        return;
      }
    }

    try {
      // Step 1: 创建项目
      const projectResult = await onSubmit(formData);
      
      if (!projectResult) {
        return;
      }
      
      // 如果是编辑模式或没有文件要上传，直接结束
      if (project || uploadFiles.length === 0) {
        window.dispatchEvent(new CustomEvent('project-created', {
          detail: { projectData: formData }
        }));
        return;
      }

      // Step 2: 上传图纸（仅在新建项目且有文件时）
      if (projectResult && typeof projectResult === 'object' && 'id' in projectResult) {
        const projectId = (projectResult as any).id;
        
        setIsUploadingDrawings(true);
        
        const uploadPromises = uploadFiles
          .filter(f => f.status === 'pending')
          .map(file => uploadFile(file, projectId));
        
        const results = await Promise.all(uploadPromises);
        const successCount = results.filter(Boolean).length;
        const totalCount = uploadFiles.filter(f => f.status === 'pending').length;
        
        if (totalCount > 1) {
          drawingToastHelper.batchUploadComplete(successCount, totalCount);
        }
        
        setIsUploadingDrawings(false);
      }
      
      window.dispatchEvent(new CustomEvent('project-created', {
        detail: { projectData: formData }
      }));
      
    } catch (error) {
      setIsUploadingDrawings(false);
      drawingToastHelper.error('创建项目或上传图纸失败');
    }
  };

  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // 检测是否有变更（编辑模式下）
    if (isEditMode && originalFormData) {
      const hasChanges = JSON.stringify(newFormData) !== JSON.stringify(originalFormData);
      setHasUnsavedChanges(hasChanges);
    }
    
    // 清除对应字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // 快速保存功能（仅编辑模式）
  const handleQuickSave = async () => {
    if (!isEditMode || !hasUnsavedChanges) return;
    
    try {
      await onSubmit(formData);
      setOriginalFormData({ ...formData });
      setHasUnsavedChanges(false);
      toast.addToast({
        type: 'success',
        message: '修改已保存'
      });
    } catch (error) {
      toast.addToast({
        type: 'error',
        message: '保存失败，请重试'
      });
    }
  };
  
  // 重置到原始值
  const handleReset = () => {
    if (originalFormData) {
      setFormData({ ...originalFormData });
      setHasUnsavedChanges(false);
      setFormErrors({});
    }
  };

  // 厚度规格选择
  const handleThicknessToggle = (thicknessSpecId: number) => {
    const currentThickness = formData.requiredThickness || [];
    const isSelected = currentThickness.includes(thicknessSpecId);
    const newSelection = isSelected 
      ? currentThickness.filter(id => id !== thicknessSpecId)
      : [...currentThickness, thicknessSpecId];
    
    handleInputChange('requiredThickness', newSelection);
  };

  // 图纸文件处理
  const handleFileSelected = (selectedFile: File) => {
    const newFile: UploadFile = {
      file: selectedFile,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending'
    };
    
    setUploadFiles(prev => [...prev, newFile]);
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // 上传单个文件
  const uploadFile = async (uploadFile: UploadFile, projectId: number): Promise<boolean> => {
    setUploadFiles(prev => prev.map(f => 
      f.id === uploadFile.id 
        ? { ...f, status: 'uploading' as const, progress: 0 } 
        : f
    ));

    try {
      const formData = new FormData();
      formData.append('drawing', uploadFile.file);
      formData.append('description', '项目创建时上传');

      const response = await apiRequest(`/api/drawings/project/${projectId}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 100, status: 'success' as const } 
            : f
        ));

        drawingToastHelper.drawingUploaded(uploadFile.file.name);
        return true;
      } else {
        throw new Error('上传失败');
      }
    } catch (error) {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error' as const, progress: 0, error: '上传失败' } 
          : f
      ));

      drawingToastHelper.drawingUploadFailed(uploadFile.file.name, error instanceof Error ? error.message : '未知错误');
      return false;
    }
  };

  // 获取工人库存
  const getWorkerStock = (spec: ThicknessSpec) => {
    if (!localWorkerMaterials?.materials) return 0;
    
    const foundMaterial = localWorkerMaterials.materials.find((material: any) => 
      material.thicknessSpec && material.thicknessSpec.id === spec.id
    );
    
    return foundMaterial ? foundMaterial.quantity || 0 : 0;
  };

  // 分类厚度规格
  const carbonThicknessSpecs = thicknessSpecs.filter(spec => 
    !spec.materialType || spec.materialType === '碳板'
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  const specialThicknessSpecs = thicknessSpecs.filter(spec => 
    spec.materialType && spec.materialType !== '碳板'
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 背景遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* 对话框 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-xl max-h-[600px] overflow-hidden"
        >
          {/* 标题栏和步骤指示器 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {project ? '编辑项目' : '创建项目'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2"
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* 步骤指示器 */}
            <div className="flex items-center justify-between">
              {STEP_CONFIG.map((stepConfig, index) => {
                const StepIcon = stepConfig.icon;
                const isActive = currentStep === stepConfig.step;
                const isCompleted = currentStep > stepConfig.step;
                const canClick = isEditMode || stepConfig.step <= currentStep;
                
                return (
                  <React.Fragment key={stepConfig.step}>
                    <div 
                      className={`flex items-center ${
                        canClick ? 'cursor-pointer group' : 'cursor-default'
                      }`}
                      onClick={() => canClick && handleStepClick(stepConfig.step)}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                        isCompleted 
                          ? isEditMode 
                            ? 'bg-orange-500 border-orange-500 group-hover:bg-orange-600' 
                            : 'bg-green-500 border-green-500'
                          : isActive 
                            ? isEditMode 
                              ? 'bg-orange-500 border-orange-500 group-hover:bg-orange-600' 
                              : 'bg-blue-500 border-blue-500'
                            : canClick
                              ? 'bg-gray-100 border-gray-300 group-hover:border-gray-400'
                              : 'bg-gray-100 border-gray-300'
                      }`}>
                        {isCompleted ? (
                          <CheckCircleIcon className="w-5 h-5 text-white" />
                        ) : (
                          <StepIcon className={`w-5 h-5 ${
                            isActive 
                              ? 'text-white' 
                              : canClick 
                                ? 'text-gray-400 group-hover:text-gray-500' 
                                : 'text-gray-400'
                          }`} />
                        )}
                      </div>
                      <div className="ml-3">
                        <div className={`text-sm font-medium ${
                          isActive 
                            ? isEditMode 
                              ? 'text-orange-600' 
                              : 'text-blue-600'
                            : isCompleted 
                              ? isEditMode 
                                ? 'text-orange-600' 
                                : 'text-green-600'
                              : 'text-gray-500'
                        } ${
                          canClick ? 'group-hover:text-gray-700' : ''
                        }`}>
                          {stepConfig.title}
                          {isEditMode && hasUnsavedChanges && isActive && (
                            <span className="ml-1 text-xs text-orange-500">• 未保存</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {stepConfig.description}
                          {isEditMode && canClick && (
                            <span className="ml-1 text-gray-500">点击跳转</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < STEP_CONFIG.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 transition-colors ${
                        currentStep > stepConfig.step 
                          ? isEditMode 
                            ? 'bg-orange-500' 
                            : 'bg-green-500'
                          : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* 步骤内容区域 - 固定高度可滚动 */}
          <div className="flex-1 overflow-hidden">
            <div className="h-96 overflow-y-auto px-6 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* 第1步：基本信息 */}
                  {currentStep === WizardStep.BASIC_INFO && (
                    <div className="space-y-6">
                      <FormField label="项目名称" required error={formErrors.name}>
                        <Input
                          type="text"
                          value={formData.name || ''}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="请输入项目名称"
                          error={formErrors.name}
                        />
                      </FormField>

                      <FormField label="项目描述">
                        <Input
                          multiline
                          rows={3}
                          value={formData.description || ''}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          placeholder="请输入项目描述（可选）"
                        />
                      </FormField>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="项目状态">
                          <Select
                            value={formData.status || 'pending'}
                            onChange={(value) => handleInputChange('status', value)}
                            options={[...PROJECT_STATUS_OPTIONS]}
                          />
                        </FormField>

                        <FormField label="优先级">
                          <Select
                            value={formData.priority || 'medium'}
                            onChange={(value) => handleInputChange('priority', value)}
                            options={[...PROJECT_PRIORITY_OPTIONS]}
                          />
                        </FormField>
                      </div>

                      <FormField label="分配工人" required error={formErrors.assignedWorkerId}>
                        <SearchableSelect
                          value={formData.assignedWorkerId ? formData.assignedWorkerId.toString() : ''}
                          onChange={(value) => {
                            handleInputChange('assignedWorkerId', value && value !== '' ? parseInt(value as string) : null);
                          }}
                          placeholder={workers.length === 0 ? "正在加载工人..." : "输入工人姓名进行筛选..."}
                          options={workers.map((worker) => ({
                            value: worker.id.toString(),
                            label: `${worker.name} (${worker.department || '未分配'})`
                          }))}
                          clearable={true}
                          required
                          error={formErrors.assignedWorkerId}
                        />

                        {/* 工人库存概览 */}
                        {formData.assignedWorkerId && !loadingWorkerMaterials && localWorkerMaterials && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-green-800">工人库存概览</h4>
                              <span className="text-xs text-green-600">
                                总计: {localWorkerMaterials.materials?.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0) || 0} 张
                              </span>
                            </div>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {localWorkerMaterials.materials?.length > 0 ? (
                                localWorkerMaterials.materials
                                  .filter((material: any) => material.quantity > 0)
                                  .map((material: any, index: number) => (
                                    <div key={index} className="flex justify-between items-center text-xs">
                                      <span className="text-green-700">
                                        {material.thicknessSpec?.thickness}{material.thicknessSpec?.unit} {material.thicknessSpec?.materialType || '碳板'}
                                      </span>
                                      <span className="font-semibold text-green-800">
                                        {material.quantity}张
                                      </span>
                                    </div>
                                  ))
                              ) : (
                                <div className="text-xs text-green-600 text-center">该工人暂无板材库存</div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {formData.assignedWorkerId && loadingWorkerMaterials && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-xs text-blue-600 text-center">
                              正在加载工人库存信息...
                            </div>
                          </div>
                        )}
                      </FormField>
                    </div>
                  )}

                  {/* 第2步：厚度选择 */}
                  {currentStep === WizardStep.THICKNESS_SELECTION && (
                    <div className="space-y-6">
                      <FormField label="选择需要的板材厚度" required error={formErrors.requiredThickness}>
                        {thicknessSpecs.length === 0 ? (
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                            <div className="text-sm text-gray-600">正在加载厚度规格...</div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* 碳板厚度区域 */}
                            {carbonThicknessSpecs.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-blue-900 flex items-center">
                                    <FireIcon className="w-4 h-4 mr-1" />
                                    碳板厚度
                                    <Badge variant="primary" className="ml-2">主要材料</Badge>
                                  </h4>
                                  <span className="text-xs text-blue-600">
                                    {(formData.requiredThickness || []).filter(id => 
                                      carbonThicknessSpecs.some(spec => spec.id === id)
                                    ).length} 已选择
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  {carbonThicknessSpecs.map((spec) => {
                                    const isSelected = (formData.requiredThickness || []).includes(spec.id);
                                    const stockQuantity = getWorkerStock(spec);
                                    const hasStock = stockQuantity > 0;
                                    
                                    return (
                                      <button
                                        key={spec.id}
                                        type="button" 
                                        onClick={() => handleThicknessToggle(spec.id)}
                                        className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors relative ${
                                          isSelected
                                            ? 'border-blue-500 bg-blue-500 text-white'
                                            : hasStock 
                                              ? 'border-green-300 bg-green-50 text-green-800 hover:border-green-500'
                                              : 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-500'
                                        }`}
                                      >
                                        <div className="text-center">
                                          <div className="font-medium">
                                            {spec.thickness}{spec.unit}
                                          </div>
                                          {formData.assignedWorkerId && (
                                            <div className="text-xs mt-1">
                                              {hasStock ? (
                                                <span className={isSelected ? 'text-blue-100' : 'text-green-600'}>
                                                  {stockQuantity}张
                                                </span>
                                              ) : (
                                                <span className={isSelected ? 'text-blue-100' : 'text-red-500'}>
                                                  无库存
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {formData.assignedWorkerId && hasStock && !isSelected && (
                                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 特殊材料厚度区域 */}
                            {specialThicknessSpecs.length > 0 && (
                              <div className="border border-gray-200 rounded-lg">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => setShowSpecialMaterials(!showSpecialMaterials)}
                                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                                >
                                  <span className="text-sm font-medium text-gray-700 flex items-center">
                                    <FolderIcon className="w-4 h-4 mr-1" />
                                    特殊材料
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">
                                      {(formData.requiredThickness || []).filter(id => 
                                        specialThicknessSpecs.some(spec => spec.id === id)
                                      ).length} 已选择
                                    </span>
                                    <ChevronDownIcon 
                                      className={`w-4 h-4 text-gray-500 transition-transform ${
                                        showSpecialMaterials ? 'rotate-180' : ''
                                      }`} 
                                    />
                                  </div>
                                </Button>
                                
                                {showSpecialMaterials && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-3">
                                      <div className="grid grid-cols-4 gap-2">
                                        {specialThicknessSpecs.map((spec) => {
                                          const isSelected = (formData.requiredThickness || []).includes(spec.id);
                                          const stockQuantity = getWorkerStock(spec);
                                          const hasStock = stockQuantity > 0;
                                          
                                          return (
                                            <button
                                              key={spec.id}
                                              type="button" 
                                              onClick={() => handleThicknessToggle(spec.id)}
                                              className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors relative ${
                                                isSelected
                                                  ? 'border-gray-500 bg-gray-500 text-white'
                                                  : hasStock
                                                    ? 'border-green-300 bg-green-50 text-green-700 hover:border-green-500' 
                                                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-500'
                                              }`}
                                            >
                                              <div className="text-center">
                                                <div className="font-medium">
                                                  {spec.thickness}{spec.unit}
                                                </div>
                                                <div className="text-xs opacity-75">
                                                  {spec.materialType}
                                                </div>
                                                {formData.assignedWorkerId && (
                                                  <div className="text-xs mt-1">
                                                    {hasStock ? (
                                                      <span className={isSelected ? 'text-gray-100' : 'text-green-600'}>
                                                        {stockQuantity}张
                                                      </span>
                                                    ) : (
                                                      <span className={isSelected ? 'text-gray-100' : 'text-red-500'}>
                                                        无库存
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                              
                                              {formData.assignedWorkerId && hasStock && !isSelected && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            )}

                            {/* 选择统计 */}
                            {(formData.requiredThickness || []).length > 0 && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="text-sm text-green-800 flex items-center">
                                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                                  已选择 {(formData.requiredThickness || []).length} 种板材厚度
                                  <span className="text-green-600 ml-2">
                                    （创建项目后将为工人生成对应厚度的板材记录）
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </FormField>
                    </div>
                  )}

                  {/* 第3步：确认修改（编辑模式）或图纸上传（新建模式） */}
                  {currentStep === WizardStep.DRAWINGS_CONFIRMATION && (
                    <div className="space-y-6">
                      {/* 信息汇总 */}
                      <div className={`border rounded-lg p-4 ${
                        isEditMode 
                          ? 'bg-orange-50 border-orange-200' 
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <h4 className={`text-sm font-semibold mb-3 ${
                          isEditMode ? 'text-orange-900' : 'text-blue-900'
                        }`}>
                          {isEditMode ? '修改确认' : '项目信息确认'}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className={isEditMode ? 'text-orange-700' : 'text-blue-700'}>项目名称：</span>
                            <span className={`font-medium ${
                              isEditMode ? 'text-orange-900' : 'text-blue-900'
                            }`}>{formData.name}</span>
                            {isEditMode && originalFormData && formData.name !== originalFormData.name && (
                              <span className="ml-2 text-xs text-orange-500">• 已修改</span>
                            )}
                          </div>
                          <div>
                            <span className={isEditMode ? 'text-orange-700' : 'text-blue-700'}>分配工人：</span>
                            <span className={`font-medium ${
                              isEditMode ? 'text-orange-900' : 'text-blue-900'
                            }`}>
                              {workers.find(w => w.id === formData.assignedWorkerId)?.name || '未选择'}
                            </span>
                            {isEditMode && originalFormData && formData.assignedWorkerId !== originalFormData.assignedWorkerId && (
                              <span className="ml-2 text-xs text-orange-500">• 已修改</span>
                            )}
                          </div>
                          <div>
                            <span className={isEditMode ? 'text-orange-700' : 'text-blue-700'}>优先级：</span>
                            <span className={`font-medium ${
                              isEditMode ? 'text-orange-900' : 'text-blue-900'
                            }`}>
                              {PROJECT_PRIORITY_OPTIONS.find(p => p.value === formData.priority)?.label}
                            </span>
                            {isEditMode && originalFormData && formData.priority !== originalFormData.priority && (
                              <span className="ml-2 text-xs text-orange-500">• 已修改</span>
                            )}
                          </div>
                          <div>
                            <span className={isEditMode ? 'text-orange-700' : 'text-blue-700'}>厚度数量：</span>
                            <span className={`font-medium ${
                              isEditMode ? 'text-orange-900' : 'text-blue-900'
                            }`}>
                              {(formData.requiredThickness || []).length} 种
                            </span>
                            {isEditMode && originalFormData && JSON.stringify(formData.requiredThickness) !== JSON.stringify(originalFormData.requiredThickness) && (
                              <span className="ml-2 text-xs text-orange-500">• 已修改</span>
                            )}
                          </div>
                        </div>
                        {formData.description && (
                          <div className="mt-3 text-sm">
                            <span className={isEditMode ? 'text-orange-700' : 'text-blue-700'}>项目描述：</span>
                            <span className={isEditMode ? 'text-orange-900' : 'text-blue-900'}>{formData.description}</span>
                            {isEditMode && originalFormData && formData.description !== originalFormData.description && (
                              <span className="ml-2 text-xs text-orange-500">• 已修改</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 编辑模式下的快速操作 */}
                      {isEditMode && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">快速操作</h4>
                          <div className="flex items-center space-x-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleQuickSave}
                              disabled={!hasUnsavedChanges || loading}
                              className="flex items-center space-x-2"
                            >
                              <Cog6ToothIcon className="w-4 h-4" />
                              <span>快速保存{hasUnsavedChanges ? '' : '（无变更）'}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleReset}
                              disabled={!hasUnsavedChanges || loading}
                              className="flex items-center space-x-2"
                            >
                              <TrashIcon className="w-4 h-4" />
                              <span>重置修改</span>
                            </Button>
                            {hasUnsavedChanges && (
                              <span className="text-xs text-orange-600">
                                您有未保存的修改
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 图纸上传区域 - 仅在新建项目时显示 */}
                      {!isEditMode && (
                        <FormField label="项目图纸">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = '.dxf';
                                  input.multiple = true;
                                  input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement).files;
                                    if (files) {
                                      Array.from(files).forEach(handleFileSelected);
                                    }
                                  };
                                  input.click();
                                }}
                                className="flex items-center space-x-2"
                              >
                                <CloudArrowUpIcon className="w-4 h-4" />
                                <span>选择图纸文件</span>
                              </Button>
                              <span className="text-xs text-gray-500">
                                可选，支持DXF格式，最大50MB
                              </span>
                            </div>

                            {uploadFiles.length > 0 && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    已选择 {uploadFiles.length} 个文件
                                  </span>
                                  {isUploadingDrawings && (
                                    <span className="text-xs text-blue-600">正在上传...</span>
                                  )}
                                </div>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {uploadFiles.map((uploadFile) => (
                                    <div
                                      key={uploadFile.id}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <DocumentIcon className="w-4 h-4 text-blue-500" />
                                        <span className="truncate text-gray-700">
                                          {uploadFile.file.name}
                                        </span>
                                      </div>
                                      {uploadFile.status === 'pending' && (
                                        <button
                                          onClick={() => removeFile(uploadFile.id)}
                                          className="text-red-500 hover:text-red-700 p-1"
                                        >
                                          <XMarkIcon className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </FormField>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* 底部导航按钮 */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={loading || isUploadingDrawings}
                >
                  取消
                </Button>
                {currentStep > WizardStep.BASIC_INFO && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={loading || isUploadingDrawings}
                    className="flex items-center space-x-1"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    <span>上一步</span>
                  </Button>
                )}
                
                {/* 编辑模式下的额外按钮 */}
                {isEditMode && hasUnsavedChanges && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={loading}
                    className="flex items-center space-x-1 text-gray-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>重置</span>
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {/* 显示未保存状态 */}
                {isEditMode && hasUnsavedChanges && (
                  <span className="text-xs text-orange-600 flex items-center">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-1"></span>
                    有未保存的修改
                  </span>
                )}
                
                {/* 编辑模式下的快速保存 */}
                {isEditMode && currentStep < WizardStep.DRAWINGS_CONFIRMATION && hasUnsavedChanges && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleQuickSave}
                    disabled={loading}
                    className="flex items-center space-x-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>快速保存</span>
                  </Button>
                )}
                
                {/* 主要操作按钮 */}
                {currentStep < WizardStep.DRAWINGS_CONFIRMATION ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                    disabled={loading}
                    className="flex items-center space-x-1"
                  >
                    <span>下一步</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSubmit}
                    loading={loading || isUploadingDrawings}
                    disabled={loading || isUploadingDrawings}
                    className={isEditMode ? 'bg-orange-500 hover:bg-orange-600 border-orange-500' : ''}
                  >
                    {loading 
                      ? isEditMode ? '保存中...' : '创建中...' 
                      : isUploadingDrawings 
                        ? '上传图纸中...' 
                        : isEditMode 
                          ? '保存修改' 
                          : `创建项目${uploadFiles.length > 0 ? ` + 上传${uploadFiles.length}个图纸` : ''}`
                    }
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
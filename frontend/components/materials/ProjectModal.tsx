'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Select, Form, FormField, FormActions, Loading, Badge, SearchableSelect } from '@/components/ui';
import { XMarkIcon, PlusIcon, TrashIcon, ChevronDownIcon, FireIcon, FolderIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { apiRequest } from '@/utils/api';
import { useWorkerMaterialStore } from '@/stores';
import { useToast } from '@/components/ui/Toast';
import { PROJECT_STATUS_OPTIONS, PROJECT_PRIORITY_OPTIONS } from '@/constants/projectEnums';
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

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
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

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project = null,
  loading = false
}) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    assignedWorkerId: null,
    requiredThickness: []
  });
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [thicknessSpecs, setThicknessSpecs] = useState<ThicknessSpec[]>([]);
  const [localWorkerMaterials, setLocalWorkerMaterials] = useState<any>(null);
  const [loadingWorkerMaterials, setLoadingWorkerMaterials] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [managingMaterials, setManagingMaterials] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);
  const [showSpecialMaterials, setShowSpecialMaterials] = useState(false);
  const { token } = useAuth();
  const { projectCreated, projectUpdated, smartSuggestion } = useToast();

  // 获取工人列表和厚度规格
  useEffect(() => {
    if (isOpen) {
      fetchWorkers();
      fetchThicknessSpecs();
    }
  }, [isOpen]);

  // 设置表单数据
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status as any,
        priority: project.priority as any,
        assignedWorkerId: project.assignedWorker?.id || null,
        requiredThickness: project.materials?.map(m => m.thicknessSpecId) || [] // 编辑模式下获取已选择的厚度规格
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        assignedWorkerId: null,
        requiredThickness: []
      });
    }
    setFormErrors({});
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
      // 获取工人列表失败，忽略错误日志
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
      // 获取厚度规格失败，忽略错误日志
    }
  };

  // 获取指定工人的板材库存
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
      // 获取工人板材失败，忽略错误日志
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

  // 分类厚度规格：碳板优先
  const carbonThicknessSpecs = thicknessSpecs.filter(spec => 
    !spec.materialType || spec.materialType === '碳板'
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  const specialThicknessSpecs = thicknessSpecs.filter(spec => 
    spec.materialType && spec.materialType !== '碳板'
  ).sort((a, b) => a.sortOrder - b.sortOrder);


  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '项目名称不能为空';
    }

    if (!formData.assignedWorkerId) {
      errors.assignedWorkerId = '请选择分配的工人';
    }

    if (!formData.requiredThickness || formData.requiredThickness.length === 0) {
      errors.requiredThickness = '请至少选择一种板材厚度';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
    
    // 触发项目创建事件
    window.dispatchEvent(new CustomEvent('project-created', {
      detail: { projectData: formData }
    }));
  };

  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
    
    // 更新表单数据
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除对应字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 处理厚度规格选择
  const handleThicknessToggle = (thicknessSpecId: number) => {
    const currentThickness = formData.requiredThickness || [];
    const isSelected = currentThickness.includes(thicknessSpecId);
    const newSelection = isSelected 
      ? currentThickness.filter(id => id !== thicknessSpecId)
      : [...currentThickness, thicknessSpecId];
    
    handleInputChange('requiredThickness', newSelection);
  };

  // 获取工人在指定厚度规格下的库存数量
  const getWorkerStock = (spec: ThicknessSpec) => {
    if (!localWorkerMaterials?.materials) return 0;
    
    // 查找匹配的材料记录
    const foundMaterial = localWorkerMaterials.materials.find((material: any) => 
      material.thicknessSpec && material.thicknessSpec.id === spec.id
    );
    
    return foundMaterial ? foundMaterial.quantity || 0 : 0;
  };

  // 厚度规格按钮组件
  const ThicknessButton: React.FC<{
    spec: ThicknessSpec;
    isSelected: boolean;
    onClick: () => void;
    priority: 'high' | 'low';
  }> = ({ spec, isSelected, onClick, priority }) => {
    const stockQuantity = getWorkerStock(spec);
    const hasStock = stockQuantity > 0;
    
    return (
      <button
        type="button" 
        onClick={onClick}
        className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors relative ${
          priority === 'high'
            ? isSelected
              ? 'border-blue-500 bg-blue-500 text-white'
              : hasStock 
                ? 'border-green-300 bg-green-50 text-green-800 hover:border-green-500'
                : 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-500'
            : isSelected
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
          {spec.materialType && (
            <div className="text-xs opacity-75">{spec.materialType}</div>
          )}
          {/* 库存指示器 */}
          {formData.assignedWorkerId && (
            <div className="text-xs mt-1">
              {hasStock ? (
                <span className="text-green-600 font-semibold">{stockQuantity}张</span>
              ) : (
                <span className="text-red-500">无库存</span>
              )}
            </div>
          )}
        </div>
        
        {/* 库存状态角标 */}
        {formData.assignedWorkerId && hasStock && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
        )}
      </button>
    );
  };

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
          className="relative w-full max-w-6xl bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-xl"
        >
          {/* 标题栏 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                {project ? '编辑项目' : '新建项目'}
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
          </div>

          {/* 表单内容 */}
          <div className="px-6 py-4">
            <form onSubmit={handleSubmit}>
              {/* 项目名称 */}
              <FormField label="项目名称" required error={formErrors.name}>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="请输入项目名称"
                  error={formErrors.name}
                />
              </FormField>

              {/* 项目描述 */}
              <FormField label="项目描述">
                <Input
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="请输入项目描述（可选）"
                />
              </FormField>

              {/* 状态和优先级 */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="项目状态">
                  <Select
                    value={formData.status}
                    onChange={(value) => handleInputChange('status', value)}
                    options={[...PROJECT_STATUS_OPTIONS]}
                  />
                </FormField>

                <FormField label="优先级">
                  <Select
                    value={formData.priority}
                    onChange={(value) => handleInputChange('priority', value)}
                    options={[...PROJECT_PRIORITY_OPTIONS]}
                  />
                </FormField>
              </div>

              {/* 分配工人 - 必填 */}
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
                {workers.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">工人列表: {workers.length} 个</p>
                )}
                {/* 只在编辑模式下显示工人库存概览 */}
                {project && formData.assignedWorkerId && !loadingWorkerMaterials && localWorkerMaterials && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-green-800">工人库存概览</h4>
                      <span className="text-xs text-green-600">
                        总计: {localWorkerMaterials.materials?.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0) || 0} 张
                      </span>
                    </div>
                    <div className="space-y-1">
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
                                {material.dimensions?.length > 0 && (
                                  <span className="ml-1 text-green-600">
                                    ({material.dimensions.length}种尺寸)
                                  </span>
                                )}
                              </span>
                            </div>
                          ))
                      ) : (
                        <div className="text-xs text-green-600 text-center">该工人暂无板材库存</div>
                      )}
                    </div>
                  </div>
                )}
                {project && formData.assignedWorkerId && loadingWorkerMaterials && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xs text-blue-600 text-center">
                      正在加载工人库存信息...
                    </div>
                  </div>
                )}
              </FormField>

              {/* 需要的板材厚度 - 碳板优先设计 */}
              <FormField label="需要的板材厚度" required error={formErrors.requiredThickness}>
                {thicknessSpecs.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <div className="text-sm text-gray-600">
                      正在加载厚度规格...
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 碳板厚度区域 - 主要显示 */}
                    {carbonThicknessSpecs.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
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
                        <div className="grid grid-cols-3 gap-2">
                          {carbonThicknessSpecs.map((spec) => {
                            const isSelected = (formData.requiredThickness || []).includes(spec.id);
                            
                            return (
                              <ThicknessButton
                                key={spec.id}
                                spec={spec}
                                isSelected={isSelected}
                                onClick={() => handleThicknessToggle(spec.id)}
                                priority="high"
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 特殊材料厚度区域 - 折叠显示 */}
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
                            <div className="p-3 pt-6">
                              <div className="grid grid-cols-4 gap-2">
                                {specialThicknessSpecs.map((spec) => {
                                  const isSelected = (formData.requiredThickness || []).includes(spec.id);
                                  
                                  return (
                                    <ThicknessButton
                                      key={spec.id}
                                      spec={spec}
                                      isSelected={isSelected}
                                      onClick={() => handleThicknessToggle(spec.id)}
                                      priority="low"
                                    />
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
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm text-green-800 flex items-center">
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          已选择 {(formData.requiredThickness || []).length} 种板材厚度
                          <span className="text-green-600 ml-2">
                            （创建项目后将为工人生成对应厚度的板材记录，数量为0等待填写）
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </FormField>
            </form>
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t border-gray-200">
            <FormActions>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                loading={loading}
                disabled={loading}
              >
                {project ? '保存修改' : '创建项目'}
              </Button>
            </FormActions>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
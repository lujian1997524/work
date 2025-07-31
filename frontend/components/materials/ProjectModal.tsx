'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Select, Form, FormField, FormActions, Loading } from '@/components/ui';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { apiRequest } from '@/utils/api';

interface Worker {
  id: number;
  name: string;
  department: string;
  position: string;
}

interface ThicknessSpec {
  id: number;
  thickness: string;
  unit: string;
  materialType: string;
  isActive: boolean;
  sortOrder: number;
}

interface ProjectFormData {
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedWorkerId: number | null;
  selectedThicknessSpecs: number[];
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
    selectedThicknessSpecs: []
  });
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [thicknessSpecs, setThicknessSpecs] = useState<ThicknessSpec[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [managingMaterials, setManagingMaterials] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);
  const { token } = useAuth();

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
        selectedThicknessSpecs: project.materials?.map(m => m.thicknessSpecId) || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        assignedWorkerId: null,
        selectedThicknessSpecs: []
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
      console.error('获取工人列表失败:', error);
    }
  };

  const fetchThicknessSpecs = async () => {
    try {
      const response = await apiRequest('/api/thickness-specs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // 只显示激活的厚度规格，按排序顺序排列
        const activeSpecs = (data.thicknessSpecs || []).filter((spec: ThicknessSpec) => spec.isActive);
        setThicknessSpecs(activeSpecs);
      }
    } catch (error) {
      console.error('获取厚度规格失败:', error);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '项目名称不能为空';
    }

    if (formData.selectedThicknessSpecs.length === 0) {
      errors.selectedThicknessSpecs = '请至少选择一种板材厚度';
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
  };

  const handleInputChange = (field: keyof ProjectFormData, value: any) => {
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
  const handleThicknessSpecToggle = async (specId: number) => {
    // 如果是编辑模式且项目已存在，直接调用API
    if (project?.id) {
      const isSelected = formData.selectedThicknessSpecs.includes(specId);
      
      if (isSelected) {
        // 删除板材
        await handleRemoveMaterial(specId);
      } else {
        // 添加板材
        await handleAddMaterial(specId);
      }
    } else {
      // 创建模式，只更新本地状态
      const isSelected = formData.selectedThicknessSpecs.includes(specId);
      const newSelection = isSelected 
        ? formData.selectedThicknessSpecs.filter(id => id !== specId)
        : [...formData.selectedThicknessSpecs, specId];
      
      handleInputChange('selectedThicknessSpecs', newSelection);
    }
  };

  // 添加板材（编辑模式）
  const handleAddMaterial = async (thicknessSpecId: number) => {
    if (!project?.id) return;
    
    try {
      setAddingMaterial(true);
      const response = await apiRequest(`/api/projects/${project.id}/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ thicknessSpecId })
      });

      if (response.ok) {
        // 更新本地状态
        const newSelection = [...formData.selectedThicknessSpecs, thicknessSpecId];
        handleInputChange('selectedThicknessSpecs', newSelection);
        
        // 触发材料更新事件
        window.dispatchEvent(new CustomEvent('materials-updated'));
      } else {
        const error = await response.json();
        alert(error.error || '添加板材失败');
      }
    } catch (error) {
      console.error('添加板材错误:', error);
      alert('添加板材失败');
    } finally {
      setAddingMaterial(false);
    }
  };

  // 删除板材（编辑模式）
  const handleRemoveMaterial = async (thicknessSpecId: number) => {
    if (!project?.id) return;
    
    // 找到对应的材料ID
    const material = project.materials?.find(m => m.thicknessSpecId === thicknessSpecId);
    if (!material) return;

    const confirmed = window.confirm('确定要删除这个板材吗？删除后该板材的所有状态信息将丢失。');
    if (!confirmed) return;
    
    try {
      setDeletingMaterialId(material.id);
      const response = await apiRequest(`/api/materials/${material.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // 更新本地状态
        const newSelection = formData.selectedThicknessSpecs.filter(id => id !== thicknessSpecId);
        handleInputChange('selectedThicknessSpecs', newSelection);
        
        // 触发材料更新事件
        window.dispatchEvent(new CustomEvent('materials-updated'));
      } else {
        const error = await response.json();
        alert(error.error || '删除板材失败');
      }
    } catch (error) {
      console.error('删除板材错误:', error);
      alert('删除板材失败');
    } finally {
      setDeletingMaterialId(null);
    }
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
                    options={[
                      { value: 'pending', label: '待处理' },
                      { value: 'in_progress', label: '进行中' },
                      { value: 'completed', label: '已完成' }
                    ]}
                  />
                </FormField>

                <FormField label="优先级">
                  <Select
                    value={formData.priority}
                    onChange={(value) => handleInputChange('priority', value)}
                    options={[
                      { value: 'low', label: '低' },
                      { value: 'medium', label: '中' },
                      { value: 'high', label: '高' },
                      { value: 'urgent', label: '紧急' }
                    ]}
                  />
                </FormField>
              </div>

              {/* 分配工人 */}
              <FormField label="分配工人">
                <Select
                  value={formData.assignedWorkerId || ''}
                  onChange={(value) => handleInputChange('assignedWorkerId', value ? parseInt(value as string) : null)}
                  options={[
                    { value: '', label: '未分配' },
                    ...workers.map((worker) => ({
                      value: worker.id.toString(),
                      label: `${worker.name} - ${worker.department}`
                    }))
                  ]}
                  clearable
                />
              </FormField>

              {/* 板材厚度选择 */}
              <FormField label="板材厚度" required error={formErrors.selectedThicknessSpecs}>
                {project?.id && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-800 font-medium mb-1">实时板材管理</div>
                    <div className="text-xs text-blue-600">
                      编辑项目时，点击厚度规格会立即添加或删除对应的板材
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {thicknessSpecs.map((spec) => {
                    const isSelected = formData.selectedThicknessSpecs.includes(spec.id);
                    const isProcessing = addingMaterial || deletingMaterialId !== null;
                    const isThisSpecProcessing = deletingMaterialId === project?.materials?.find(m => m.thicknessSpecId === spec.id)?.id;
                    
                    return (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => handleThicknessSpecToggle(spec.id)}
                        disabled={isProcessing}
                        className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors relative ${
                          isSelected
                            ? 'border-ios18-blue bg-ios18-blue text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-ios18-blue hover:bg-ios18-blue/10'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isThisSpecProcessing && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loading size="sm" />
                          </div>
                        )}
                        <div className={isThisSpecProcessing ? 'opacity-0' : ''}>
                          {spec.thickness}{spec.unit}
                          {spec.materialType && (
                            <div className="text-xs opacity-75">{spec.materialType}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {formData.selectedThicknessSpecs.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    已选择 {formData.selectedThicknessSpecs.length} 种厚度规格
                    {project?.id && (
                      <span className="text-blue-600 ml-2">（已实时同步到项目）</span>
                    )}
                  </div>
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
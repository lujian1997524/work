'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Button, Select, Loading, useDialog } from '@/components/ui';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';

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

interface MaterialManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  materials: Material[];
  onMaterialsUpdate: () => void;
  token: string;
}

export const MaterialManagementModal: React.FC<MaterialManagementModalProps> = ({
  isOpen,
  onClose,
  projectId,
  materials,
  onMaterialsUpdate,
  token
}) => {
  const [thicknessSpecs, setThicknessSpecs] = useState<ThicknessSpec[]>([]);
  const [selectedThicknessSpecId, setSelectedThicknessSpecId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);

  const { confirm } = useDialog();

  // 获取厚度规格列表
  const fetchThicknessSpecs = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/thickness-specs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setThicknessSpecs(data.thicknessSpecs || []);
      }
    } catch (error) {
      console.error('获取厚度规格失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取可用的厚度规格（排除已有的）
  const getAvailableThicknessSpecs = () => {
    const usedSpecIds = materials.map(m => m.thicknessSpecId);
    return thicknessSpecs.filter(spec => 
      spec.isActive && !usedSpecIds.includes(spec.id)
    );
  };

  // 添加板材
  const handleAddMaterial = async () => {
    if (!selectedThicknessSpecId) {
      alert('请选择厚度规格');
      return;
    }

    try {
      setAddingMaterial(true);
      const response = await apiRequest(`/api/projects/${projectId}/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          thicknessSpecId: parseInt(selectedThicknessSpecId)
        })
      });

      if (response.ok) {
        setSelectedThicknessSpecId('');
        onMaterialsUpdate();
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

  // 删除板材
  const handleDeleteMaterial = async (materialId: number) => {
    const confirmed = await confirm('确定要删除这个板材吗？删除后该板材的所有状态信息将丢失。');
    if (!confirmed) return;

    try {
      setDeletingMaterialId(materialId);
      const response = await apiRequest(`/api/materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onMaterialsUpdate();
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

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // 获取状态标签文字
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      default: return '未知状态';
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchThicknessSpecs();
    }
  }, [isOpen]);

  const availableSpecs = getAvailableThicknessSpecs();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="板材管理"
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 添加板材区域 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-3">添加新板材</h3>
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <Select
                value={selectedThicknessSpecId}
                onChange={setSelectedThicknessSpecId}
                placeholder="选择厚度规格"
                disabled={loading || addingMaterial}
                options={availableSpecs.map(spec => ({
                  value: spec.id.toString(),
                  label: `${spec.thickness}${spec.unit} - ${spec.materialType}`
                }))}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleAddMaterial}
              disabled={!selectedThicknessSpecId || addingMaterial || availableSpecs.length === 0}
              className="flex items-center space-x-1"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{addingMaterial ? '添加中...' : '添加'}</span>
            </Button>
          </div>
          {availableSpecs.length === 0 && !loading && (
            <div className="text-sm text-blue-600 mt-2">
              所有可用的厚度规格都已添加到项目中
            </div>
          )}
        </div>

        {/* 当前板材列表 */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">当前板材列表</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loading size="md" />
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              当前项目还没有板材
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {materials
                  .sort((a, b) => parseFloat(a.thicknessSpec.thickness) - parseFloat(b.thicknessSpec.thickness))
                  .map((material) => (
                    <motion.div
                      key={material.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="font-semibold text-gray-700">
                              {material.thicknessSpec.thickness}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {material.thicknessSpec.thickness}{material.thicknessSpec.unit}
                          </div>
                          <div className="text-sm text-gray-500">
                            {material.thicknessSpec.materialType}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(material.status)}`}>
                          {getStatusLabel(material.status)}
                        </span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMaterial(material.id)}
                        disabled={deletingMaterialId === material.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="删除板材"
                      >
                        {deletingMaterialId === material.id ? (
                          <Loading size="sm" />
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </Button>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* 提示信息 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-sm text-gray-600">
            <div className="font-medium mb-1">操作说明：</div>
            <ul className="list-disc list-inside space-y-1">
              <li>添加板材：选择厚度规格后点击添加按钮</li>
              <li>删除板材：点击板材右侧的删除按钮</li>
              <li>删除板材会同时删除该板材的所有状态记录</li>
              <li>每种厚度规格在同一项目中只能添加一次</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MaterialManagementModal;
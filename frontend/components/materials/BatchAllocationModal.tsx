'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  RectangleStackIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

interface Project {
  id: number;
  name: string;
  materials: Material[];
}

interface Material {
  id: number;
  thicknessSpecId: number;
  status: string;
  quantity: number;
  thicknessSpec: {
    id: number;
    thickness: string;
    materialType: string;
    unit: string;
  };
}

interface BatchAllocationItem {
  projectId: number;
  projectName: string;
  thicknessSpecId: number;
  thickness: string;
  materialType: string;
  quantity: number;
}

interface BatchAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onAllocationComplete: (result: any) => void;
}

const BatchAllocationModal: React.FC<BatchAllocationModalProps> = ({
  isOpen,
  onClose,
  project,
  onAllocationComplete
}) => {
  const { token } = useAuth();
  const toast = useToast();

  // 状态管理
  const [allocationItems, setAllocationItems] = useState<BatchAllocationItem[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [selectedThickness, setSelectedThickness] = useState<string>('');
  const [sharedPlateId, setSharedPlateId] = useState<string>('');
  const [totalQuantity, setTotalQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // 初始化数据
  useEffect(() => {
    if (isOpen) {
      fetchAvailableProjects();
      generateSharedPlateId();
      // 默认添加当前项目
      if (project && project.materials.length > 0) {
        const firstMaterial = project.materials[0];
        setAllocationItems([{
          projectId: project.id,
          projectName: project.name,
          thicknessSpecId: firstMaterial.thicknessSpecId,
          thickness: firstMaterial.thicknessSpec.thickness,
          materialType: firstMaterial.thicknessSpec.materialType,
          quantity: 1
        }]);
        setSelectedThickness(`${firstMaterial.thicknessSpec.materialType}_${firstMaterial.thicknessSpec.thickness}mm`);
      }
    }
  }, [isOpen, project]);

  // 获取可用项目列表
  const fetchAvailableProjects = async () => {
    if (!token) return;
    
    try {
      setLoadingProjects(true);
      const response = await apiRequest('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableProjects(data.projects || []);
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
      toast.addToast({
        type: 'error',
        message: '获取项目列表失败'
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  // 生成共用板材ID
  const generateSharedPlateId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    setSharedPlateId(`SHARED-${timestamp}-${random}`.toUpperCase());
  };

  // 添加项目到批量分配
  const addProjectToAllocation = (selectedProject: Project) => {
    if (!selectedThickness) {
      toast.addToast({ type: 'warning', message: '请先选择板材厚度' });
      return;
    }

    const [materialType, thicknessStr] = selectedThickness.split('_');
    const thickness = thicknessStr.replace('mm', '');

    // 检查项目是否已经添加
    const exists = allocationItems.find(item => item.projectId === selectedProject.id);
    if (exists) {
      toast.addToast({ type: 'warning', message: '该项目已经在分配列表中' });
      return;
    }

    // 查找对应厚度的材料
    const targetMaterial = selectedProject.materials.find(m => 
      m.thicknessSpec.materialType === materialType && 
      m.thicknessSpec.thickness === thickness
    );

    if (!targetMaterial) {
      toast.addToast({ type: 'warning', message: `项目 ${selectedProject.name} 没有 ${materialType} ${thickness}mm 规格的材料` });
      return;
    }

    const newItem: BatchAllocationItem = {
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      thicknessSpecId: targetMaterial.thicknessSpecId,
      thickness,
      materialType,
      quantity: 1
    };

    setAllocationItems([...allocationItems, newItem]);
  };

  // 移除项目
  const removeProject = (projectId: number) => {
    setAllocationItems(allocationItems.filter(item => item.projectId !== projectId));
  };

  // 更新项目数量
  const updateQuantity = (projectId: number, quantity: number) => {
    if (quantity < 1) return;
    
    setAllocationItems(allocationItems.map(item => 
      item.projectId === projectId ? { ...item, quantity } : item
    ));
  };

  // 计算总需求数量
  const calculateTotalDemand = () => {
    return allocationItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  // 执行批量分配
  const handleBatchAllocation = async () => {
    if (allocationItems.length === 0) {
      toast.addToast({ type: 'warning', message: '请至少添加一个项目' });
      return;
    }

    const totalDemand = calculateTotalDemand();
    if (totalQuantity < totalDemand) {
      toast.addToast({ type: 'error', message: `物理板材数量 ${totalQuantity} 小于总需求 ${totalDemand}` });
      return;
    }

    try {
      setLoading(true);

      // 构建批量分配请求
      const allocationData = {
        sharedPlateId,
        totalQuantity,
        allocations: allocationItems.map(item => ({
          projectId: item.projectId,
          thicknessSpecId: item.thicknessSpecId,
          quantity: item.quantity,
          usageNote: `与${allocationItems.filter(i => i.projectId !== item.projectId).map(i => i.projectName).join('、')}共用同一张${item.materialType}板材`
        }))
      };

      const response = await apiRequest('/api/materials/batch-allocation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(allocationData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.addToast({ type: 'success', message: `成功为 ${allocationItems.length} 个项目分配共用板材` });
        onAllocationComplete(result);
      } else {
        const error = await response.json();
        toast.addToast({ type: 'error', message: error.message || '批量分配失败' });
      }
    } catch (error) {
      console.error('批量分配失败:', error);
      toast.addToast({ type: 'error', message: '批量分配操作失败' });
    } finally {
      setLoading(false);
    }
  };

  // 重置状态
  const handleClose = () => {
    setAllocationItems([]);
    setSelectedThickness('');
    setSharedPlateId('');
    setTotalQuantity(1);
    onClose();
  };

  // 获取可用的厚度选项
  const getThicknessOptions = () => {
    if (!project?.materials) return [];
    
    const uniqueSpecs = project.materials.reduce((acc, material) => {
      const key = `${material.thicknessSpec.materialType}_${material.thicknessSpec.thickness}mm`;
      if (!acc.find(item => item.value === key)) {
        acc.push({
          value: key,
          label: `${material.thicknessSpec.materialType} ${material.thicknessSpec.thickness}${material.thicknessSpec.unit}`
        });
      }
      return acc;
    }, [] as Array<{value: string, label: string}>);

    return uniqueSpecs;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="批量板材分配"
      size="xl"
    >
      <div className="space-y-6">
        {/* 说明文本 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <RectangleStackIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">批量分配说明</h4>
              <p className="text-sm text-blue-700">
                将多个项目的相同规格板材分配到同一张物理板材上，配合上海博创cypnext排版软件使用，避免重复库存扣减。
              </p>
            </div>
          </div>
        </div>

        {/* 共用板材配置 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择板材规格
            </label>
            <Select
              value={selectedThickness}
              onChange={(value) => setSelectedThickness(value as string)}
              options={getThicknessOptions()}
              placeholder="选择厚度规格"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              物理板材数量
            </label>
            <Input
              type="number"
              min="1"
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 1)}
              placeholder="输入实际板材数量"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              共用板材ID
            </label>
            <div className="flex items-center space-x-2">
              <Input
                value={sharedPlateId}
                onChange={(e) => setSharedPlateId(e.target.value)}
                placeholder="自动生成"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={generateSharedPlateId}
                className="text-gray-500"
              >
                重新生成
              </Button>
            </div>
          </div>
        </div>

        {/* 项目选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            添加项目到分配列表
          </label>
          <Select
            placeholder="选择要添加的项目"
            onChange={(value) => {
              const selectedProject = availableProjects.find(p => p.id.toString() === value);
              if (selectedProject) {
                addProjectToAllocation(selectedProject);
              }
            }}
            options={availableProjects
              .filter(p => !allocationItems.find(item => item.projectId === p.id))
              .map(project => ({
                value: project.id.toString(),
                label: project.name
              }))}
            disabled={!selectedThickness || loadingProjects}
          />
        </div>

        {/* 分配列表 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">分配列表</h4>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-600">
                总需求: <span className="font-medium text-blue-600">{calculateTotalDemand()}</span>
              </span>
              <span className="text-gray-600">
                物理数量: <span className="font-medium text-green-600">{totalQuantity}</span>
              </span>
              {calculateTotalDemand() > totalQuantity && (
                <Badge variant="danger" size="sm">
                  <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                  数量不足
                </Badge>
              )}
              {calculateTotalDemand() <= totalQuantity && allocationItems.length > 0 && (
                <Badge variant="success" size="sm">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  数量充足
                </Badge>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg">
            {allocationItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <RectangleStackIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂未添加任何项目</p>
                <p className="text-sm mt-1">请选择板材规格后添加项目</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {allocationItems.map((item, index) => (
                  <div key={item.projectId} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.projectName}</p>
                        <p className="text-sm text-gray-500">
                          {item.materialType} {item.thickness}mm
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">数量:</label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.projectId, parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProject(item.projectId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={handleClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleBatchAllocation}
            disabled={loading || allocationItems.length === 0 || calculateTotalDemand() > totalQuantity}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                分配中...
              </>
            ) : (
              <>
                <TruckIcon className="w-4 h-4 mr-2" />
                执行批量分配
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BatchAllocationModal;
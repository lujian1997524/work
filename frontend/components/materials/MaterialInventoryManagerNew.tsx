'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Badge, Loading, useDialog } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { AddMaterialModal } from './AddMaterialModal';
import { ExpandableMaterialCell } from './ExpandableMaterialCell';
import { DimensionManager } from './DimensionManager';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

interface ThicknessSpec {
  id: number;
  key: string;
  materialType: string;
  thickness: string;
  unit: string;
  code: string;
  label: string;
}

interface MaterialDimension {
  id: number;
  width: number;
  height: number;
  quantity: number;
  notes?: string;
  dimensionLabel: string;
}

interface MaterialData {
  quantity: number;
  id: number | null;
  notes?: string;
  dimensions: MaterialDimension[];
}

interface WorkerMaterial {
  workerId: number;
  workerName: string;
  department: string;
  phone: string | null;
  materials: { [key: string]: MaterialData };
}

interface ApiResponse {
  success: boolean;
  workers: WorkerMaterial[];
  thicknessSpecs: ThicknessSpec[];
}

interface MaterialInventoryManagerNewProps {
  className?: string;
  materialTypeFilter?: string;
  workerIdFilter?: number | null;
  thicknessFilter?: string;
}

export const MaterialInventoryManagerNew: React.FC<MaterialInventoryManagerNewProps> = ({
  className = '',
  materialTypeFilter = 'all',
  workerIdFilter = null,
  thicknessFilter = 'all'
}) => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerMaterial | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDimensionManager, setShowDimensionManager] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<{
    workerMaterialId: number;
    materialData: MaterialData;
    workerName: string;
    materialType: string;
    thickness: string;
  } | null>(null);
  const { token } = useAuth();
  const { confirm, DialogRenderer } = useDialog();

  // 获取数据
  const fetchData = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await apiRequest('/api/worker-materials', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result: ApiResponse = await response.json();
        setData(result);
        // 数据加载成功
      }
    } catch (error) {
      // 获取数据失败
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    // 监听刷新事件
    const handleRefresh = () => {
      fetchData();
    };

    window.addEventListener('refresh-materials', handleRefresh);
    window.addEventListener('materials-updated', handleRefresh);
    window.addEventListener('worker-materials-updated', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-materials', handleRefresh);
      window.removeEventListener('materials-updated', handleRefresh);
      window.removeEventListener('worker-materials-updated', handleRefresh);
    };
  }, []);

  // 处理材料编辑
  const handleMaterialEdit = (
    workerId: number, 
    workerName: string,
    materialKey: string, 
    materialData: MaterialData
  ) => {
    if (materialData.id) {
      // 解析材料类型和厚度
      const [materialType, thicknessPart] = materialKey.split('_');
      const thickness = thicknessPart.replace('mm', '');
      
      setSelectedMaterial({
        workerMaterialId: materialData.id,
        materialData,
        workerName,
        materialType,
        thickness
      });
      setShowDimensionManager(true);
    }
  };

  // 处理尺寸管理更新
  const handleDimensionUpdate = () => {
    fetchData(); // 重新获取数据
  };

  // 关闭尺寸管理器
  const closeDimensionManager = () => {
    setShowDimensionManager(false);
    setSelectedMaterial(null);
  };

  if (loading || !data) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Loading type="spinner" size="lg" />
      </div>
    );
  }

  // 筛选工人
  const filteredWorkers = data.workers.filter(worker => {
    // 搜索筛选
    const matchesSearch = worker.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // 工人ID筛选
    if (workerIdFilter && worker.workerId !== workerIdFilter) {
      return false;
    }

    return true;
  });

  // 筛选材料类型列（只显示有库存的）
  const filteredThicknessSpecs = data.thicknessSpecs.filter(spec => {
    // 材料类型筛选
    if (materialTypeFilter && materialTypeFilter !== 'all') {
      if (materialTypeFilter === 'carbon' && spec.materialType !== '碳板') return false;
      if (materialTypeFilter === 'special' && spec.materialType === '碳板') return false;
      if (materialTypeFilter !== 'carbon' && materialTypeFilter !== 'special' && spec.materialType !== materialTypeFilter) return false;
    }

    // 厚度筛选
    if (thicknessFilter && thicknessFilter !== 'all') {
      const [filterMaterialType, filterThickness] = thicknessFilter.split('_');
      if (spec.materialType !== filterMaterialType || parseFloat(spec.thickness) !== parseFloat(filterThickness)) {
        return false;
      }
    }

    // 检查是否有工人有这种材料的库存
    const hasInventory = filteredWorkers.some(worker => {
      const materialData = worker.materials[spec.key];
      return materialData && materialData.quantity > 0;
    });

    return hasInventory;
  });

  // 筛选结果统计

  return (
    <div className={`h-full flex flex-col bg-white ${className}`}>
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">板材库存管理</h1>
            <p className="text-sm text-gray-600 mt-1">管理工人的板材库存分配和数量</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              添加板材
            </Button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索工人姓名或部门..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Badge variant="secondary">
            共 {filteredWorkers.length} 名工人
          </Badge>
        </div>
      </div>

      {/* 表格内容 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 via-gray-50/80 to-gray-50/60 border-b border-gray-200">
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-800 sticky left-0 bg-gray-50 min-w-[200px]">
                    工人信息
                  </th>
                  {filteredThicknessSpecs.map((spec) => (
                    <th key={spec.key} className="py-3 px-4 text-center text-sm font-semibold text-gray-800 min-w-[120px]">
                      {spec.code}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-800 min-w-[100px]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((worker, index) => (
                  <motion.tr
                    key={worker.workerId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`border-b border-gray-100 hover:bg-gray-50/50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'
                    }`}
                  >
                    {/* 工人信息列 */}
                    <td className="py-3 px-4 sticky left-0 bg-white border-r border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-md">
                          {worker.workerName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {worker.workerName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {worker.department}
                          </div>
                          {worker.phone && (
                            <div className="text-xs text-gray-400 flex items-center">
                              <PhoneIcon className="w-3 h-3 mr-1" />
                              {worker.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* 材料数量列 */}
                    {filteredThicknessSpecs.map((spec) => {
                      const materialData = worker.materials[spec.key];
                      
                      return (
                        <td key={spec.key} className="py-3 px-4 text-center">
                          <ExpandableMaterialCell
                            materialKey={spec.key}
                            materialData={materialData}
                            workerId={worker.workerId}
                            onEdit={(materialData) => 
                              handleMaterialEdit(worker.workerId, worker.workerName, spec.key, materialData)
                            }
                          />
                        </td>
                      );
                    })}
                    
                    {/* 操作列 */}
                    <td className="py-3 px-4 text-center">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setEditingWorker(worker);
                          setShowEditModal(true);
                        }}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        
                      >
                        <PencilIcon className="w-4 h-4" />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
                
                {filteredWorkers.length === 0 && (
                  <tr>
                    <td colSpan={filteredThicknessSpecs.length + 2} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {searchQuery ? '没有找到匹配的工人' : '暂无板材库存数据'}
                          </h3>
                          <p className="text-gray-500 max-w-sm">
                            {searchQuery 
                              ? '尝试调整搜索条件或筛选器' 
                              : '开始添加工人和板材分配来管理库存'
                            }
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 添加板材弹窗 */}
      <AddMaterialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchData}
      />

      {/* 编辑工人板材模态框 */}
      {showEditModal && editingWorker && (
        <WorkerMaterialEditModal
          worker={editingWorker}
          thicknessSpecs={data?.thicknessSpecs || []}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingWorker(null);
          }}
          onSuccess={fetchData}
        />
      )}
      
      {/* 尺寸管理模态框 */}
      {showDimensionManager && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <DimensionManager
            workerMaterialId={selectedMaterial.workerMaterialId}
            initialDimensions={selectedMaterial.materialData.dimensions}
            workerMaterial={{
              id: selectedMaterial.workerMaterialId,
              workerName: selectedMaterial.workerName,
              materialType: selectedMaterial.materialType,
              thickness: selectedMaterial.thickness,
              totalQuantity: selectedMaterial.materialData.quantity
            }}
            onUpdate={handleDimensionUpdate}
            onClose={closeDimensionManager}
          />
        </div>
      )}
      
      {/* Dialog渲染器 */}
      <DialogRenderer />
    </div>
  );
};

// 工人板材编辑模态框
interface WorkerMaterialEditModalProps {
  worker: WorkerMaterial;
  thicknessSpecs: ThicknessSpec[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WorkerMaterialEditModal: React.FC<WorkerMaterialEditModalProps> = ({
  worker,
  thicknessSpecs,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [materialList, setMaterialList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const { confirm, DialogRenderer: WorkerDialogRenderer } = useDialog();

  // 获取工人的详细板材数据
  const fetchWorkerMaterials = async () => {
    if (!token || !worker.workerId) return;
    
    setLoading(true);
    try {
      const response = await apiRequest(`/api/worker-materials/${worker.workerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // 转换数据格式，只显示有库存的材料
        const materials = Object.entries(worker.materials)
          .filter(([key, materialData]: [string, any]) => materialData.quantity > 0)
          .map(([key, materialData]: [string, any]) => {
            const spec = thicknessSpecs.find(s => s.key === key);
            return {
              id: materialData.id,
              key: key,
              materialType: spec?.materialType || '未知',
              thickness: spec?.thickness || '0',
              unit: spec?.unit || 'mm',
              label: spec?.label || key,
              quantity: materialData.quantity,
              notes: materialData.notes,
              // 支持尺寸详情（为将来扩展）
              dimensions: []
            };
          });
        setMaterialList(materials);
      }
    } catch (error) {
      // 获取工人板材详情失败
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWorkerMaterials();
    }
  }, [isOpen, worker.workerId]);

  // 更新板材数量
  const updateMaterialQuantity = async (materialId: number, newQuantity: number) => {
    if (!token) return;

    try {
      const response = await apiRequest(`/api/worker-materials/${materialId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: newQuantity
        })
      });

      if (response.ok) {
        // 重新获取数据
        await fetchWorkerMaterials();
        onSuccess();
        // 触发全局事件通知其他组件
        window.dispatchEvent(new CustomEvent('materials-updated'));
      }
    } catch (error) {
      // 更新板材数量失败
    }
  };

  // 删除板材记录
  const deleteMaterial = async (materialId: number, materialLabel: string) => {
    if (!token) return;

    const confirmed = await confirm(
      `确定要删除这条 ${materialLabel} 的板材记录吗？删除后主表格数量会立即更新。`
    );
    if (!confirmed) return;

    try {
      const response = await apiRequest(`/api/worker-materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // 立即从本地状态中移除已删除的项
        setMaterialList(prev => prev.filter(item => item.id !== materialId));
        // 重新获取数据以确保同步
        await fetchWorkerMaterials();
        onSuccess();
        // 触发全局事件通知其他组件
        window.dispatchEvent(new CustomEvent('materials-updated'));
      } else if (response.status === 404) {
        // 记录已经不存在，立即从本地状态中移除并刷新数据
        // 要删除的板材记录不存在
        setMaterialList(prev => prev.filter(item => item.id !== materialId));
        await fetchWorkerMaterials();
        onSuccess();
        // 触发全局事件通知其他组件
        window.dispatchEvent(new CustomEvent('materials-updated'));
      }
    } catch (error) {
      // 删除板材失败
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              编辑 {worker.workerName} 的板材库存
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {worker.department} {worker.phone && `• ${worker.phone}`}
            </p>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loading type="spinner" size="lg" />
              </div>
            ) : materialList.length > 0 ? (
              <div className="space-y-4">
                {materialList.map((material) => (
                  <MaterialEditItem
                    key={material.id}
                    material={material}
                    onUpdate={(newQuantity) => updateMaterialQuantity(material.id, newQuantity)}
                    onDelete={() => deleteMaterial(material.id, material.label)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                该工人暂无板材库存记录
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={onClose}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialog渲染器 */}
      <WorkerDialogRenderer />
    </>
  );
};

// 单个板材编辑项
interface MaterialEditItemProps {
  material: any;
  onUpdate: (newQuantity: number) => void;
  onDelete: () => void;
}

const MaterialEditItem: React.FC<MaterialEditItemProps> = ({
  material,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(material.quantity.toString());

  const handleSave = () => {
    const newQuantity = parseInt(editValue) || 0;
    onUpdate(newQuantity);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(material.quantity.toString());
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
      <div className="flex-1">
        <div className="flex items-center space-x-4">
          <div>
            <div className="font-medium text-gray-900">
              {material.materialType} - {material.thickness}{material.unit}
            </div>
            <div className="text-sm text-gray-600">
              {material.label}
            </div>
            {material.notes && (
              <div className="text-sm text-gray-500 mt-1">
                备注: {material.notes}
              </div>
            )}
            {/* 预留尺寸信息显示位置 */}
            {material.dimensions && material.dimensions.length > 0 && (
              <div className="text-sm text-blue-600 mt-1">
                📏 包含 {material.dimensions.length} 种尺寸规格
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
            <span className="text-sm text-gray-500">张</span>
            <Button size="sm" variant="primary" onClick={handleSave}>
              保存
            </Button>
            <Button size="sm" variant="secondary" onClick={handleCancel}>
              取消
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <span className="text-lg font-semibold text-gray-900">
              {material.quantity}张
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditValue(material.quantity.toString());
                setIsEditing(true);
              }}
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700"
            >
              删除
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
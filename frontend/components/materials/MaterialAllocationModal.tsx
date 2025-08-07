import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface MaterialDimension {
  id: number;
  width: number;
  height: number;
  quantity: number;
  notes?: string;
}

interface WorkerMaterial {
  id: number;
  workerId: number;
  workerName: string;
  quantity: number;
  thicknessSpecId: number;
  dimensions: MaterialDimension[];
}

interface ProjectMaterial {
  id: number;
  projectId: number;
  projectName: string;
  thicknessSpecId: number;
  materialType: string;
  thickness: string;
  unit: string;
  currentQuantity: number;
  assignedWorkerName?: string;
}

interface MaterialAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectMaterial: ProjectMaterial;
}

export const MaterialAllocationModal: React.FC<MaterialAllocationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectMaterial
}) => {
  const { token } = useAuth();
  const [availableWorkerMaterials, setAvailableWorkerMaterials] = useState<WorkerMaterial[]>([]);
  const [selectedWorkerMaterialId, setSelectedWorkerMaterialId] = useState<number | null>(null);
  const [selectedDimensionId, setSelectedDimensionId] = useState<number | null>(null);
  const [allocateQuantity, setAllocateQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allocationMode, setAllocationMode] = useState<'general' | 'dimension'>('general');

  // 获取可用的工人材料
  const fetchAvailableWorkerMaterials = async () => {
    if (!token || !projectMaterial.thicknessSpecId) return;

    try {
      setLoading(true);
      const response = await apiRequest('/api/worker-materials', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // 筛选匹配厚度规格且有库存的工人材料
        const matchingMaterials: WorkerMaterial[] = [];
        
        data.workers?.forEach((worker: any) => {
          Object.entries(worker.materials || {}).forEach(([key, materialData]: [string, any]) => {
            if (materialData.quantity > 0 || (materialData.dimensions && materialData.dimensions.length > 0)) {
              // 通过API获取厚度规格ID来匹配
              const thicknessSpec = data.thicknessSpecs?.find((spec: any) => spec.key === key);
              if (thicknessSpec && thicknessSpec.id === projectMaterial.thicknessSpecId) {
                matchingMaterials.push({
                  id: materialData.id,
                  workerId: worker.workerId,
                  workerName: worker.workerName,
                  quantity: materialData.quantity || 0,
                  thicknessSpecId: thicknessSpec.id,
                  dimensions: materialData.dimensions || []
                });
              }
            }
          });
        });

        setAvailableWorkerMaterials(matchingMaterials);
      }
    } catch (error) {
      console.error('获取可用工人材料失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAvailableWorkerMaterials();
      setSelectedWorkerMaterialId(null);
      setSelectedDimensionId(null);
      setAllocateQuantity(1);
      setNotes('');
      setAllocationMode('general');
    }
  }, [isOpen, projectMaterial.thicknessSpecId]);

  // 获取选中的工人材料信息
  const selectedWorkerMaterial = availableWorkerMaterials.find(wm => wm.id === selectedWorkerMaterialId);
  
  // 获取选中的尺寸信息
  const selectedDimension = selectedWorkerMaterial?.dimensions.find(d => d.id === selectedDimensionId);

  // 计算可分配的最大数量
  const getMaxAllocateQuantity = () => {
    if (allocationMode === 'dimension' && selectedDimension) {
      return selectedDimension.quantity;
    }
    return selectedWorkerMaterial?.quantity || 0;
  };

  // 验证分配数量
  const validateAllocation = () => {
    if (!selectedWorkerMaterial) {
      return '请选择工人材料来源';
    }

    if (allocateQuantity <= 0) {
      return '分配数量必须大于0';
    }

    const maxQuantity = getMaxAllocateQuantity();
    if (allocateQuantity > maxQuantity) {
      return `分配数量不能超过可用数量 ${maxQuantity}`;
    }

    return null;
  };

  // 提交分配
  const handleAllocate = async () => {
    const validationError = validateAllocation();
    if (validationError) {
      alert(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest('/api/materials/allocate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: projectMaterial.projectId,
          materialId: projectMaterial.id,
          workerMaterialId: selectedWorkerMaterialId,
          dimensionId: allocationMode === 'dimension' ? selectedDimensionId : null,
          allocateQuantity,
          notes: notes.trim() || null
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // 触发数据更新事件
        window.dispatchEvent(new CustomEvent('materials-updated'));
        window.dispatchEvent(new CustomEvent('worker-materials-updated'));
        
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.message || '分配失败');
      }
    } catch (error) {
      console.error('板材分配失败:', error);
      alert(error instanceof Error ? error.message : '分配失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex justify-between items-center p-6 border-b bg-blue-50">
          <div>
            <h2 className="text-xl font-semibold text-blue-900">板材分配</h2>
            <p className="text-sm text-blue-700 mt-1">
              项目: {projectMaterial.projectName} | 
              规格: {projectMaterial.materialType} {projectMaterial.thickness}{projectMaterial.unit}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-200 rounded-lg transition-colors"
            disabled={submitting}
          >
            <XMarkIcon className="w-5 h-5 text-blue-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              正在加载可用材料...
            </div>
          ) : availableWorkerMaterials.length === 0 ? (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">无可用库存</h3>
              <p className="text-gray-600">
                没有工人拥有该规格的板材库存，请先添加库存或检查厚度规格配置。
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 项目材料当前状态 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">项目材料当前状态</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">当前数量：</span>
                    <span className="font-semibold text-gray-900">{projectMaterial.currentQuantity} 张</span>
                  </div>
                  <div>
                    <span className="text-gray-600">分配工人：</span>
                    <span className="font-semibold text-gray-900">
                      {projectMaterial.assignedWorkerName || '未指定'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 选择工人材料来源 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择材料来源 *
                </label>
                <Select
                  value={selectedWorkerMaterialId ? selectedWorkerMaterialId.toString() : ''}
                  onChange={(value) => {
                    setSelectedWorkerMaterialId(value ? parseInt(value) : null);
                    setSelectedDimensionId(null);
                    setAllocationMode('general');
                  }}
                  placeholder="选择工人及其库存"
                >
                  {availableWorkerMaterials.map(wm => (
                    <option key={wm.id} value={wm.id}>
                      {wm.workerName} - 总量: {wm.quantity}张
                      {wm.dimensions.length > 0 && ` (含 ${wm.dimensions.length} 种尺寸)`}
                    </option>
                  ))}
                </Select>
              </div>

              {/* 分配模式选择 */}
              {selectedWorkerMaterial && selectedWorkerMaterial.dimensions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分配模式
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="general"
                        checked={allocationMode === 'general'}
                        onChange={(e) => setAllocationMode(e.target.value as 'general')}
                        className="mr-2"
                      />
                      <span>从总库存分配（{selectedWorkerMaterial.quantity} 张可用）</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="dimension"
                        checked={allocationMode === 'dimension'}
                        onChange={(e) => setAllocationMode(e.target.value as 'dimension')}
                        className="mr-2"
                      />
                      <span>从特定尺寸分配（{selectedWorkerMaterial.dimensions.length} 种尺寸可选）</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 尺寸选择（如果选择了尺寸分配模式） */}
              {allocationMode === 'dimension' && selectedWorkerMaterial && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择尺寸 *
                  </label>
                  <Select
                    value={selectedDimensionId ? selectedDimensionId.toString() : ''}
                    onChange={(value) => setSelectedDimensionId(value ? parseInt(value) : null)}
                    placeholder="选择具体尺寸"
                  >
                    {selectedWorkerMaterial.dimensions.map(dim => (
                      <option key={dim.id} value={dim.id}>
                        {dim.width}×{dim.height}mm - {dim.quantity}张
                        {dim.notes && ` (${dim.notes})`}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* 分配数量 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分配数量 *
                </label>
                <Input
                  type="number"
                  value={allocateQuantity}
                  onChange={(e) => setAllocateQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                  max={getMaxAllocateQuantity()}
                  placeholder="输入分配数量"
                />
                <p className="text-xs text-gray-500 mt-1">
                  最大可分配: {getMaxAllocateQuantity()} 张
                  {selectedDimension && ` (${selectedDimension.width}×${selectedDimension.height}mm)`}
                </p>
              </div>

              {/* 分配备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分配备注
                </label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="添加分配说明..."
                />
              </div>

              {/* 分配预览 */}
              {selectedWorkerMaterial && allocateQuantity > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-start space-x-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 mb-2">分配预览</h4>
                      <div className="text-sm text-green-800 space-y-1">
                        <p>• 从工人 <strong>{selectedWorkerMaterial.workerName}</strong> 分配</p>
                        <p>• 数量: <strong>{allocateQuantity} 张</strong></p>
                        {selectedDimension && (
                          <p>• 尺寸: <strong>{selectedDimension.width}×{selectedDimension.height}mm</strong></p>
                        )}
                        <p>• 项目材料将增加到: <strong>{projectMaterial.currentQuantity + allocateQuantity} 张</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {availableWorkerMaterials.length > 0 && (
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleAllocate}
              loading={submitting}
              disabled={submitting || !selectedWorkerMaterial || allocateQuantity <= 0}
            >
              确认分配
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialAllocationModal;
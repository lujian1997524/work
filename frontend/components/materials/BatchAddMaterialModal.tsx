import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, TrashIcon, MinusIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SearchableSelect } from '../ui/SearchableSelect';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { materialToastHelper } from '../../utils/materialToastHelper';

interface BatchAddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Worker {
  id: number;
  name: string;
  department: string;
}

interface ThicknessSpec {
  id: number;
  thickness: string;
  unit: string;
  materialType: string;
  isActive: boolean;
}

interface DimensionData {
  width: string;
  height: string;
  quantity: string;
  notes: string;
}

interface MaterialItem {
  id: string;
  workerId: string;
  materialType: string;
  thickness: string;
  quantity: string;
  notes: string;
  dimensions: DimensionData[];
  showDimensionSection: boolean;
}

export const BatchAddMaterialModal: React.FC<BatchAddMaterialModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { token } = useAuth();
  
  // 基础数据
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 材料项目列表
  const [materialItems, setMaterialItems] = useState<MaterialItem[]>([]);

  // 初始化单个材料项目
  const createNewMaterialItem = (): MaterialItem => ({
    id: Math.random().toString(36).substr(2, 9),
    workerId: '',
    materialType: materialTypes.length > 0 ? materialTypes[0] : '',
    thickness: '',
    quantity: '',
    notes: '',
    dimensions: [],
    showDimensionSection: false
  });

  // 获取工人列表
  const fetchWorkers = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/workers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.workers || []);
      }
    } catch (error) {
      console.error('获取工人列表失败:', error);
    }
  };

  // 获取厚度规格列表
  const fetchThicknessSpecs = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/thickness-specs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const specs = data.thicknessSpecs || [];
        
        // 提取唯一的材料类型
        const types = [...new Set(specs
          .filter((spec: any) => spec.isActive && spec.materialType)
          .map((spec: any) => spec.materialType)
        )] as string[];
        
        // 确保碳板在首位
        const sortedTypes = types.sort((a, b) => {
          if (a === '碳板') return -1;
          if (b === '碳板') return 1;
          return a.localeCompare(b);
        });
        setMaterialTypes(sortedTypes);
        
        // 如果还没有材料项目，创建第一个
        if (materialItems.length === 0 && sortedTypes.length > 0) {
          setMaterialItems([{
            id: Math.random().toString(36).substr(2, 9),
            workerId: '',
            materialType: sortedTypes[0],
            thickness: '',
            quantity: '',
            notes: '',
            dimensions: [],
            showDimensionSection: false
          }]);
        }
      }
    } catch (error) {
      console.error('获取厚度规格失败:', error);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchWorkers();
      fetchThicknessSpecs();
      
      // 如果还没有材料项目，创建第一个
      if (materialItems.length === 0) {
        setMaterialItems([createNewMaterialItem()]);
      }
    }
  }, [isOpen, token]);

  // 添加新的材料项目
  const addMaterialItem = () => {
    setMaterialItems(prev => [...prev, createNewMaterialItem()]);
  };

  // 移除材料项目
  const removeMaterialItem = (itemId: string) => {
    if (materialItems.length > 1) {
      setMaterialItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  // 更新材料项目
  const updateMaterialItem = (itemId: string, field: keyof MaterialItem, value: any) => {
    setMaterialItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  // 添加尺寸行
  const addDimensionRow = (itemId: string) => {
    setMaterialItems(prev => prev.map(item => 
      item.id === itemId ? {
        ...item,
        dimensions: [...item.dimensions, { width: '', height: '', quantity: '', notes: '' }],
        showDimensionSection: true
      } : item
    ));
  };

  // 移除尺寸行
  const removeDimensionRow = (itemId: string, dimensionIndex: number) => {
    setMaterialItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newDimensions = item.dimensions.filter((_, i) => i !== dimensionIndex);
        return {
          ...item,
          dimensions: newDimensions,
          showDimensionSection: newDimensions.length > 0
        };
      }
      return item;
    }));
  };

  // 更新尺寸数据
  const updateDimension = (itemId: string, dimensionIndex: number, field: keyof DimensionData, value: string) => {
    setMaterialItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newDimensions = [...item.dimensions];
        newDimensions[dimensionIndex][field] = value;
        return { ...item, dimensions: newDimensions };
      }
      return item;
    }));
  };

  // 计算单个材料项目的总数量
  const calculateItemTotalQuantity = (item: MaterialItem) => {
    if (item.dimensions.length === 0) return parseInt(item.quantity) || 0;
    return item.dimensions.reduce((sum, dim) => sum + (parseInt(dim.quantity) || 0), 0);
  };

  // 计算所有项目的总数量
  const calculateTotalQuantity = () => {
    return materialItems.reduce((sum, item) => sum + calculateItemTotalQuantity(item), 0);
  };

  // 验证单个材料项目
  const validateMaterialItem = (item: MaterialItem, index: number) => {
    if (!item.workerId || !item.materialType || !item.thickness) {
      alert(`第 ${index + 1} 项：请填写工人、材料类型和厚度`);
      return false;
    }

    const thickness = parseFloat(item.thickness);
    if (isNaN(thickness) || thickness <= 0) {
      alert(`第 ${index + 1} 项：请输入有效的厚度值`);
      return false;
    }

    if (item.dimensions.length > 0) {
      // 如果有尺寸数据，验证尺寸数据
      for (let i = 0; i < item.dimensions.length; i++) {
        const dim = item.dimensions[i];
        if (!dim.width || !dim.height || !dim.quantity) {
          alert(`第 ${index + 1} 项第 ${i + 1} 行尺寸信息不完整`);
          return false;
        }
        if (parseFloat(dim.width) <= 0 || parseFloat(dim.height) <= 0 || parseInt(dim.quantity) <= 0) {
          alert(`第 ${index + 1} 项第 ${i + 1} 行尺寸数据必须大于0`);
          return false;
        }
      }
    } else {
      // 没有尺寸数据，需要基础数量
      if (!item.quantity || parseInt(item.quantity) <= 0) {
        alert(`第 ${index + 1} 项：请输入有效的数量`);
        return false;
      }
    }

    return true;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证所有材料项目
    for (let i = 0; i < materialItems.length; i++) {
      if (!validateMaterialItem(materialItems[i], i)) {
        return;
      }
    }

    if (!token) {
      alert('认证信息已过期，请重新登录');
      return;
    }

    setSubmitting(true);
    try {
      let successCount = 0;
      let totalItems = materialItems.length;

      // 依次处理每个材料项目
      for (const item of materialItems) {
        try {
          const itemTotalQuantity = calculateItemTotalQuantity(item);
          
          // 创建工人材料记录
          const requestData = {
            workerId: parseInt(item.workerId),
            materialType: item.materialType,
            thickness: parseFloat(item.thickness).toFixed(3),
            quantity: itemTotalQuantity,
            notes: item.notes
          };
          
          const workerMaterialResponse = await apiRequest('/api/worker-materials', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
          });

          if (!workerMaterialResponse.ok) {
            const error = await workerMaterialResponse.json();
            throw new Error(error.message || '添加板材失败');
          }

          const workerMaterialData = await workerMaterialResponse.json();
          const workerMaterialId = workerMaterialData.material.id;

          // 如果有尺寸数据，创建尺寸记录
          if (item.dimensions.length > 0) {
            const dimensionPromises = item.dimensions.map(dim => 
              apiRequest(`/api/material-dimensions/worker-materials/${workerMaterialId}/dimensions/simple`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  width: parseFloat(dim.width),
                  height: parseFloat(dim.height),
                  quantity: parseInt(dim.quantity),
                  notes: dim.notes || null
                })
              })
            );

            await Promise.all(dimensionPromises);
          }

          successCount++;

        } catch (error) {
          console.error(`处理第 ${materialItems.indexOf(item) + 1} 项时发生错误:`, error);
          // 继续处理下一项，但记录错误
        }
      }

      // 显示成功统计
      if (successCount === totalItems) {
        materialToastHelper.batchOperationComplete(`成功批量添加 ${successCount} 项板材库存`);
      } else if (successCount > 0) {
        materialToastHelper.batchOperationComplete(`部分成功：添加了 ${successCount}/${totalItems} 项板材库存`);
      } else {
        materialToastHelper.error('批量添加失败，请检查网络连接或联系管理员');
        return;
      }

      // 重置表单
      setMaterialItems([createNewMaterialItem()]);
      onSuccess();
      onClose();
      
      // 触发数据更新事件
      window.dispatchEvent(new CustomEvent('materials-updated'));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量添加板材失败，请重试';
      materialToastHelper.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">批量添加板材库存</h2>
            <p className="text-sm text-gray-600 mt-1">
              可以一次添加多种板材规格，总计 {materialItems.length} 项，共 {calculateTotalQuantity()} 张
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            className="p-2 hover:bg-gray-200"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-6 space-y-6">
            {/* 材料项目列表 */}
            {materialItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="border rounded-lg p-6 bg-gray-50"
              >
                {/* 项目头部 */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-900">
                    第 {index + 1} 项板材
                    {item.materialType && item.thickness && (
                      <span className="text-sm text-gray-600 ml-2">
                        ({item.materialType} {item.thickness}mm - {calculateItemTotalQuantity(item)} 张)
                      </span>
                    )}
                  </h3>
                  <div className="flex space-x-2">
                    {materialItems.length > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => removeMaterialItem(item.id)}
                        className="flex items-center"
                      >
                        <MinusIcon className="w-4 h-4 mr-1" />
                        移除
                      </Button>
                    )}
                  </div>
                </div>

                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">工人 *</label>
                    <SearchableSelect
                      value={item.workerId}
                      onChange={(value) => updateMaterialItem(item.id, 'workerId', value as string)}
                      placeholder={workers.length === 0 ? "正在加载工人..." : "输入工人姓名进行筛选..."}
                      options={workers.map(worker => ({
                        value: worker.id,
                        label: `${worker.name} (${worker.department})`
                      }))}
                      clearable={true}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">材料类型 *</label>
                    <Select
                      value={item.materialType}
                      onChange={(value) => updateMaterialItem(item.id, 'materialType', value as string)}
                      placeholder={materialTypes.length === 0 ? "正在加载材料类型..." : "选择材料类型"}
                      options={materialTypes.map(type => ({
                        value: type,
                        label: type
                      }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">厚度 (mm) *</label>
                    <Input
                      type="number"
                      value={item.thickness}
                      onChange={(e) => updateMaterialItem(item.id, 'thickness', e.target.value)}
                      placeholder="输入任意厚度值 (如: 2.5, 3.7)"
                      step="0.001"
                      min="0.001"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                    <Input
                      type="text"
                      placeholder="添加备注信息..."
                      value={item.notes}
                      onChange={(e) => updateMaterialItem(item.id, 'notes', e.target.value)}
                    />
                  </div>
                </div>

                {/* 数量和尺寸管理 */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-800">数量管理</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        小计: {calculateItemTotalQuantity(item)} 张
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => addDimensionRow(item.id)}
                        className="flex items-center space-x-1"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>添加尺寸</span>
                      </Button>
                    </div>
                  </div>

                  {!item.showDimensionSection ? (
                    // 简单数量输入
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">总数量 (张) *</label>
                      <Input
                        type="number"
                        placeholder="输入板材总数量"
                        value={item.quantity}
                        onChange={(e) => updateMaterialItem(item.id, 'quantity', e.target.value)}
                        min="1"
                        required={item.dimensions.length === 0}
                      />
                    </div>
                  ) : (
                    // 尺寸明细管理
                    <div className="space-y-3">
                      {item.dimensions.map((dimension, dimensionIndex) => (
                        <div key={dimensionIndex} className="border rounded-lg p-3 bg-white">
                          <div className="grid grid-cols-4 gap-3 mb-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">宽度 (mm)</label>
                              <Input
                                type="number"
                                placeholder="宽度"
                                value={dimension.width}
                                onChange={(e) => updateDimension(item.id, dimensionIndex, 'width', e.target.value)}
                                step="0.01"
                                min="0"
                                className="text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">长度 (mm)</label>
                              <Input
                                type="number"
                                placeholder="长度"
                                value={dimension.height}
                                onChange={(e) => updateDimension(item.id, dimensionIndex, 'height', e.target.value)}
                                step="0.01"
                                min="0"
                                className="text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">数量 (张)</label>
                              <Input
                                type="number"
                                placeholder="数量"
                                value={dimension.quantity}
                                onChange={(e) => updateDimension(item.id, dimensionIndex, 'quantity', e.target.value)}
                                min="1"
                                className="text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">操作</label>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => removeDimensionRow(item.id, dimensionIndex)}
                                className="w-full flex items-center justify-center text-sm"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Input
                              type="text"
                              placeholder="备注 (批次、供应商等)"
                              value={dimension.notes}
                              onChange={(e) => updateDimension(item.id, dimensionIndex, 'notes', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* 添加更多材料项目 */}
            <div className="text-center">
              <Button
                type="button"
                variant="secondary"
                onClick={addMaterialItem}
                className="flex items-center space-x-2"
                disabled={submitting}
              >
                <PlusIcon className="w-5 h-5" />
                <span>添加更多板材项目</span>
              </Button>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between items-center p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              共 {materialItems.length} 项材料，总计 {calculateTotalQuantity()} 张板材
            </div>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                取消
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting}
              >
                批量添加板材
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchAddMaterialModal;
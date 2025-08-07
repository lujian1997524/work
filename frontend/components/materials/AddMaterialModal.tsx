import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface AddMaterialModalProps {
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

// 材料类型将从厚度规格中动态获取，不再硬编码

export const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { token } = useAuth();
  
  // 基础数据
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [thicknessSpecs, setThicknessSpecs] = useState<ThicknessSpec[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    workerId: '',
    materialType: '',
    thickness: '',
    thicknessSpecId: '', // 添加厚度规格ID
    quantity: '',
    notes: ''
  });

  // 尺寸数据
  const [dimensions, setDimensions] = useState<DimensionData[]>([]);
  const [showDimensionSection, setShowDimensionSection] = useState(false);

  // 获取工人列表
  const fetchWorkers = async () => {
    if (!token) {
      console.log('❌ fetchWorkers: 没有token');
      return;
    }
    
    console.log('📡 开始获取工人列表...');
    try {
      const response = await apiRequest('/api/workers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('📡 工人API响应状态:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 工人数据获取成功:', data);
        console.log('👥 工人数量:', data.workers?.length || 0);
        setWorkers(data.workers || []);
      } else {
        console.error('❌ 获取工人列表失败:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('❌ 错误详情:', errorData);
      }
    } catch (error) {
      console.error('❌ 获取工人列表异常:', error);
    }
  };

  // 获取厚度规格列表
  const fetchThicknessSpecs = async () => {
    if (!token) {
      console.log('❌ fetchThicknessSpecs: 没有token');
      return;
    }
    
    console.log('📡 开始获取厚度规格...');
    try {
      const response = await apiRequest('/api/thickness-specs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('📡 厚度规格API响应状态:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 厚度规格数据获取成功:', data);
        const specs = data.thicknessSpecs || [];
        setThicknessSpecs(specs);
        
        // 提取唯一的材料类型
        const types = [...new Set(specs
          .filter(spec => spec.isActive && spec.materialType)
          .map(spec => spec.materialType)
        )];
        console.log('🧱 提取的材料类型:', types);
        
        // 确保碳板在首位
        const sortedTypes = types.sort((a, b) => {
          if (a === '碳板') return -1;
          if (b === '碳板') return 1;
          return a.localeCompare(b);
        });
        setMaterialTypes(sortedTypes);
        console.log('🔢 排序后的材料类型:', sortedTypes);
        
        // 设置默认材料类型
        if (sortedTypes.length > 0 && !formData.materialType) {
          setFormData(prev => ({ ...prev, materialType: sortedTypes[0] }));
        }
      } else {
        console.error('❌ 获取厚度规格失败:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('❌ 错误详情:', errorData);
      }
    } catch (error) {
      console.error('❌ 获取厚度规格异常:', error);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      console.log('🔓 AddMaterialModal 打开，开始获取数据...');
      console.log('🔑 Token存在:', !!token);
      fetchWorkers();
      fetchThicknessSpecs();
    } else {
      console.log('🔒 AddMaterialModal 条件不满足:', { isOpen, hasToken: !!token });
    }
  }, [isOpen, token]);

  // 重置表单
  const resetForm = () => {
    const defaultMaterialType = materialTypes.length > 0 ? materialTypes[0] : '';
    setFormData({
      workerId: '',
      materialType: defaultMaterialType,
      thickness: '',
      thicknessSpecId: '',
      quantity: '',
      notes: ''
    });
    setDimensions([]);
    setShowDimensionSection(false);
  };

  // 添加尺寸行
  const addDimensionRow = () => {
    setDimensions([...dimensions, { width: '', height: '', quantity: '', notes: '' }]);
    setShowDimensionSection(true);
  };

  // 移除尺寸行
  const removeDimensionRow = (index: number) => {
    const newDimensions = dimensions.filter((_, i) => i !== index);
    setDimensions(newDimensions);
    if (newDimensions.length === 0) {
      setShowDimensionSection(false);
    }
  };

  // 更新尺寸数据
  const updateDimension = (index: number, field: keyof DimensionData, value: string) => {
    const newDimensions = [...dimensions];
    newDimensions[index][field] = value;
    setDimensions(newDimensions);
  };

  // 计算总数量
  const calculateTotalQuantity = () => {
    if (dimensions.length === 0) return parseInt(formData.quantity) || 0;
    return dimensions.reduce((sum, dim) => sum + (parseInt(dim.quantity) || 0), 0);
  };

  // 当材料类型改变时，筛选可用厚度
  const getAvailableThicknesses = (materialType: string) => {
    return thicknessSpecs
      .filter(spec => spec.materialType === materialType && spec.isActive)
      .map(spec => spec.thickness)
      .sort((a, b) => parseFloat(a) - parseFloat(b));
  };

  // 根据材料类型和厚度查找厚度规格ID
  const findThicknessSpecId = (materialType: string, thickness: string) => {
    const spec = thicknessSpecs.find(spec => 
      spec.materialType === materialType && 
      parseFloat(spec.thickness).toFixed(2) === parseFloat(thickness).toFixed(2)
    );
    return spec ? spec.id : null;
  };

  // 验证表单
  const validateForm = () => {
    if (!formData.workerId || !formData.materialType || !formData.thickness) {
      alert('请填写工人、材料类型和厚度');
      return false;
    }

    const thickness = parseFloat(formData.thickness);
    if (isNaN(thickness) || thickness <= 0) {
      alert('请输入有效的厚度值');
      return false;
    }

    if (dimensions.length > 0) {
      // 如果有尺寸数据，验证尺寸数据
      for (let i = 0; i < dimensions.length; i++) {
        const dim = dimensions[i];
        if (!dim.width || !dim.height || !dim.quantity) {
          alert(`第 ${i + 1} 行尺寸信息不完整`);
          return false;
        }
        if (parseFloat(dim.width) <= 0 || parseFloat(dim.height) <= 0 || parseInt(dim.quantity) <= 0) {
          alert(`第 ${i + 1} 行尺寸数据必须大于0`);
          return false;
        }
      }
    } else {
      // 没有尺寸数据，需要基础数量
      if (!formData.quantity || parseInt(formData.quantity) <= 0) {
        alert('请输入有效的数量');
        return false;
      }
    }

    return true;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!token) {
      alert('认证信息已过期，请重新登录');
      return;
    }

    setSubmitting(true);
    try {
      const totalQuantity = calculateTotalQuantity();
      
      // 使用兼容的API参数：materialType + thickness
      // 后端会自动查找或创建对应的厚度规格
      const requestData = {
        workerId: parseInt(formData.workerId),
        materialType: formData.materialType,
        thickness: parseFloat(formData.thickness).toFixed(3), // 保留3位小数精度
        quantity: totalQuantity,
        notes: formData.notes
      };
      
      console.log('🚀 即将发送的请求数据:', requestData);
      console.log('📊 数据验证:', {
        workerId: typeof requestData.workerId + ' - ' + requestData.workerId,
        materialType: typeof requestData.materialType + ' - ' + requestData.materialType,
        thickness: typeof requestData.thickness + ' - ' + requestData.thickness,
        quantity: typeof requestData.quantity + ' - ' + requestData.quantity,
        notes: typeof requestData.notes + ' - ' + requestData.notes
      });
      
      const workerMaterialResponse = await apiRequest('/api/worker-materials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      console.log('📡 后端响应状态:', workerMaterialResponse.status);

      if (!workerMaterialResponse.ok) {
        const error = await workerMaterialResponse.json();
        console.error('❌ 后端错误详情:', error);
        throw new Error(error.message || '添加板材失败');
      }

      const workerMaterialData = await workerMaterialResponse.json();
      const workerMaterialId = workerMaterialData.material.id;

      // 2. 如果有尺寸数据，创建尺寸记录
      if (dimensions.length > 0) {
        const dimensionPromises = dimensions.map(dim => 
          apiRequest(`/api/material-dimensions/worker-materials/${workerMaterialId}/dimensions`, {
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

        const dimensionResponses = await Promise.all(dimensionPromises);
        
        // 检查所有尺寸创建是否成功
        for (const response of dimensionResponses) {
          if (!response.ok) {
            const error = await response.json();
            console.error('创建尺寸记录失败:', error);
            // 继续处理其他尺寸，不中断整个流程
          }
        }
      }

      // 成功
      resetForm();
      onSuccess();
      onClose();
      
      // 触发数据更新事件
      window.dispatchEvent(new CustomEvent('materials-updated'));

    } catch (error) {
      console.error('添加板材失败:', error);
      alert(error instanceof Error ? error.message : '添加板材失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">添加板材库存</h2>
          <Button
            variant="ghost"
            onClick={onClose}
            className="p-2 hover:bg-gray-200"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* 基本信息 */}
          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-gray-900">基本信息</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工人 *</label>
                <Select
                  value={formData.workerId}
                  onChange={(value) => setFormData(prev => ({ ...prev, workerId: value as string }))}
                  placeholder={workers.length === 0 ? "正在加载工人..." : "选择工人"}
                  options={workers.map(worker => ({
                    value: worker.id,
                    label: `${worker.name} (${worker.department})`
                  }))}
                  required
                />
                {workers.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">工人列表: {workers.length} 个</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">材料类型 *</label>
                <Select
                  value={formData.materialType}
                  onChange={(value) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      materialType: value as string,
                      thickness: '' // 清空厚度选择
                    }));
                  }}
                  placeholder={materialTypes.length === 0 ? "正在加载材料类型..." : "选择材料类型"}
                  options={materialTypes.map(type => ({
                    value: type,
                    label: type
                  }))}
                  required
                />
                {materialTypes.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">材料类型: {materialTypes.length} 个</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">厚度 (mm) *</label>
              <Input
                type="number"
                value={formData.thickness}
                onChange={(e) => setFormData(prev => ({ ...prev, thickness: e.target.value }))}
                placeholder="输入任意厚度值 (如: 2.5, 3.7, 4.125)"
                step="0.001"
                min="0.001"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                支持任意厚度值，系统会自动创建新的厚度规格
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <Input
                type="text"
                placeholder="添加备注信息..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          {/* 数量和尺寸选择 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900">数量管理</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  总计: {calculateTotalQuantity()} 张
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={addDimensionRow}
                  className="flex items-center space-x-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>添加尺寸</span>
                </Button>
              </div>
            </div>

            {!showDimensionSection ? (
              // 简单数量输入
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">总数量 (张) *</label>
                <Input
                  type="number"
                  placeholder="输入板材总数量"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  min="1"
                  required={dimensions.length === 0}
                />
                <p className="text-xs text-gray-500 mt-1">
                  点击"添加尺寸"可以管理不同尺寸的板材数量
                </p>
              </div>
            ) : (
              // 尺寸明细管理
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  管理不同尺寸的板材数量详情：
                </div>
                
                {dimensions.map((dimension, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-4 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">宽度 (mm)</label>
                        <Input
                          type="number"
                          placeholder="宽度"
                          value={dimension.width}
                          onChange={(e) => updateDimension(index, 'width', e.target.value)}
                          step="0.01"
                          min="0"
                          size="sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">长度 (mm)</label>
                        <Input
                          type="number"
                          placeholder="长度"
                          value={dimension.height}
                          onChange={(e) => updateDimension(index, 'height', e.target.value)}
                          step="0.01"
                          min="0"
                          size="sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">数量 (张)</label>
                        <Input
                          type="number"
                          placeholder="数量"
                          value={dimension.quantity}
                          onChange={(e) => updateDimension(index, 'quantity', e.target.value)}
                          min="1"
                          size="sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">操作</label>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => removeDimensionRow(index)}
                          className="w-full flex items-center justify-center"
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
                        onChange={(e) => updateDimension(index, 'notes', e.target.value)}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}

                {dimensions.length === 0 && (
                  <div className="text-center py-4 text-gray-500 border-2 border-dashed rounded-lg">
                    点击"添加尺寸"开始管理不同尺寸的板材
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 预览信息 */}
          {formData.materialType && formData.thickness && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">添加预览</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>板材规格: {formData.materialType} {formData.thickness}mm</p>
                <p>总数量: {calculateTotalQuantity()} 张</p>
                {dimensions.length > 0 && (
                  <p>尺寸规格: {dimensions.length} 种不同尺寸</p>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3">
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
              添加板材
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterialModal;
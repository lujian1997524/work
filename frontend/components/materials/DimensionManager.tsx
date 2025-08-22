import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, XMarkIcon, PencilIcon, TrashIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { useDialog, useToast } from '../ui';
import { Input } from '../ui/Input';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { materialToastHelper } from '../../utils/materialToastHelper';
import { TransferModal } from './TransferModal';

interface MaterialDimension {
  id: number;
  width: number;
  height: number;
  quantity: number;
  notes?: string;
  dimensionLabel: string;
}

interface WorkerMaterial {
  id: number;
  workerName: string;
  materialType: string;
  thickness: string;
  totalQuantity: number;
}

interface DimensionManagerProps {
  workerMaterialId: number;
  initialDimensions: MaterialDimension[];
  workerMaterial?: WorkerMaterial;
  onUpdate: () => void;
  onClose: () => void;
}

interface DimensionFormData {
  width: string;
  height: string;
  quantity: string;
  notes: string;
}

export const DimensionManager: React.FC<DimensionManagerProps> = ({
  workerMaterialId,
  initialDimensions,
  workerMaterial,
  onUpdate,
  onClose
}) => {
  const { user } = useAuth();
  const { confirm, alert, DialogRenderer } = useDialog();
  const [dimensions, setDimensions] = useState<MaterialDimension[]>(initialDimensions);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDimension, setEditingDimension] = useState<MaterialDimension | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferDimension, setTransferDimension] = useState<MaterialDimension | null>(null);
  
  const [newDimension, setNewDimension] = useState<DimensionFormData>({
    width: '',
    height: '',
    quantity: '',
    notes: ''
  });

  // 加载最新尺寸数据
  const fetchDimensions = useCallback(async () => {
    try {
      const response = await apiRequest(`/api/material-dimensions/worker-materials/${workerMaterialId}/dimensions`);
      if (response.ok) {
        const data = await response.json();
        setDimensions(data.dimensions || []);
      }
    } catch (error) {
      // 获取尺寸数据失败
    }
  }, [workerMaterialId]);

  // 添加新尺寸
  const addDimension = async () => {
    if (!newDimension.width || !newDimension.height || !newDimension.quantity) {
      materialToastHelper.error('请填写完整的尺寸信息');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(`/api/material-dimensions/worker-materials/${workerMaterialId}/dimensions`, {
        method: 'POST',
        body: JSON.stringify({
          width: parseFloat(newDimension.width),
          height: parseFloat(newDimension.height),
          quantity: parseInt(newDimension.quantity),
          notes: newDimension.notes || null
        })
      });

      if (response.ok) {
        const result = await response.json();
        setDimensions(prev => [...prev, result]);
        setNewDimension({ width: '', height: '', quantity: '', notes: '' });
        setShowAddForm(false);
        onUpdate(); // 通知父组件更新
        
        // 显示成功Toast
        const materialTypeText = workerMaterial 
          ? `${workerMaterial.thickness}mm${workerMaterial.materialType}` 
          : '材料';
        const dimensionText = `${newDimension.width}×${newDimension.height}mm`;
        materialToastHelper.dimensionAdded(materialTypeText, dimensionText, parseInt(newDimension.quantity));
      } else {
        const error = await response.json();
        materialToastHelper.error(`添加失败: ${error.error || '未知错误'}`);
      }
    } catch (error) {
      materialToastHelper.error('添加失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 更新尺寸
  const updateDimension = async (dimensionId: number, formData: DimensionFormData) => {
    if (!formData.width || !formData.height || !formData.quantity) {
      materialToastHelper.error('请填写完整的尺寸信息');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(`/api/material-dimensions/dimensions/${dimensionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          width: parseFloat(formData.width),
          height: parseFloat(formData.height),
          quantity: parseInt(formData.quantity),
          notes: formData.notes || null
        })
      });

      if (response.ok) {
        const result = await response.json();
        setDimensions(prev => 
          prev.map(dim => dim.id === dimensionId ? result : dim)
        );
        setEditingDimension(null);
        onUpdate(); // 通知父组件更新
        
        // 显示成功Toast - 使用通用成功提示
        const materialTypeText = workerMaterial 
          ? `${workerMaterial.thickness}mm${workerMaterial.materialType}` 
          : '材料';
        const dimensionText = `${formData.width}×${formData.height}mm`;
        materialToastHelper.dimensionAdded(materialTypeText, dimensionText, parseInt(formData.quantity));
      } else {
        const error = await response.json();
        materialToastHelper.error(`更新失败: ${error.error || '未知错误'}`);
      }
    } catch (error) {
      materialToastHelper.error('更新失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 删除尺寸
  const deleteDimension = async (dimensionId: number) => {
    const confirmed = await confirm('确定要删除这个尺寸记录吗？');
    if (!confirmed) return;

    // 获取要删除的尺寸信息用于Toast显示
    const targetDimension = dimensions.find(d => d.id === dimensionId);
    const dimensionText = targetDimension 
      ? `${targetDimension.width}×${targetDimension.height}mm` 
      : '尺寸记录';

    setLoading(true);
    try {
      const response = await apiRequest(`/api/material-dimensions/dimensions/${dimensionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDimensions(prev => prev.filter(dim => dim.id !== dimensionId));
        onUpdate(); // 通知父组件更新
        
        // 显示删除成功Toast
        const materialTypeText = workerMaterial 
          ? `${workerMaterial.thickness}mm${workerMaterial.materialType}` 
          : '材料';
        materialToastHelper.materialRecycled(`${materialTypeText} ${dimensionText}`);
      } else {
        const error = await response.json();
        materialToastHelper.error(`删除失败: ${error.error || '未知错误'}`);
      }
    } catch (error) {
      materialToastHelper.error('删除失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 处理转移点击
  const handleTransferClick = (dimension: MaterialDimension) => {
    setTransferDimension(dimension);
    setShowTransferModal(true);
  };

  const totalQuantity = dimensions.reduce((sum, dim) => sum + dim.quantity, 0);

  return (
    <>
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
      {/* 头部 */}
      <div className="flex justify-between items-center p-6 border-b bg-gray-50">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            板材尺寸管理
          </h3>
          {workerMaterial && (
            <p className="text-sm text-gray-600 mt-1">
              {workerMaterial.workerName} - {workerMaterial.materialType} {workerMaterial.thickness}mm
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
        {/* 统计信息 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-800">总计数量</span>
            <span className="text-lg font-semibold text-blue-900">{totalQuantity} 张</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-blue-700">尺寸规格数量</span>
            <span className="text-sm text-blue-800">{dimensions.length} 种</span>
          </div>
        </div>

        {/* 现有尺寸列表 */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">现有尺寸</h4>
            <Button
              onClick={() => setShowAddForm(true)}
              disabled={showAddForm || loading}
              className="flex items-center space-x-1 text-sm"
            >
              <PlusIcon className="w-4 h-4" />
              <span>添加尺寸</span>
            </Button>
          </div>

          {dimensions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无尺寸记录，点击"添加尺寸"开始管理
            </div>
          ) : (
            <div className="space-y-2">
              {dimensions.map(dimension => (
                <DimensionEditItem
                  key={dimension.id}
                  dimension={dimension}
                  isEditing={editingDimension?.id === dimension.id}
                  onEdit={() => setEditingDimension(dimension)}
                  onCancelEdit={() => setEditingDimension(null)}
                  onUpdate={(formData) => updateDimension(dimension.id, formData)}
                  onDelete={() => deleteDimension(dimension.id)}
                  onTransfer={(dimension) => handleTransferClick(dimension)}
                  loading={loading}
                />
              ))}
            </div>
          )}
        </div>

        {/* 添加新尺寸表单 */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border rounded-lg p-4 bg-green-50"
            >
              <h5 className="font-medium text-green-900 mb-3">添加新尺寸</h5>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input
                  type="number"
                  placeholder="宽度 (mm)"
                  value={newDimension.width}
                  onChange={(e) => setNewDimension(prev => ({ ...prev, width: e.target.value }))}
                  step="0.01"
                  min="0"
                />
                <Input
                  type="number"
                  placeholder="长度 (mm)"
                  value={newDimension.height}
                  onChange={(e) => setNewDimension(prev => ({ ...prev, height: e.target.value }))}
                  step="0.01"
                  min="0"
                />
                <Input
                  type="number"
                  placeholder="数量 (张)"
                  value={newDimension.quantity}
                  onChange={(e) => setNewDimension(prev => ({ ...prev, quantity: e.target.value }))}
                  min="1"
                />
                <Input
                  placeholder="备注 (可选)"
                  value={newDimension.notes}
                  onChange={(e) => setNewDimension(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  className="text-sm" 
                  variant="secondary" 
                  onClick={() => {
                    setShowAddForm(false);
                    setNewDimension({ width: '', height: '', quantity: '', notes: '' });
                  }}
                  disabled={loading}
                >
                  取消
                </Button>
                <Button 
                  className="text-sm" 
                  onClick={addDimension}
                  loading={loading}
                >
                  添加
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    
    {/* Dialog渲染器 */}
    <DialogRenderer />
    
    {/* 转移模态框 */}
    {showTransferModal && transferDimension && (
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferDimension(null);
        }}
        dimension={transferDimension}
        workerMaterial={workerMaterial}
        onSuccess={() => {
          fetchDimensions();
          onUpdate();
          setShowTransferModal(false);
          setTransferDimension(null);
        }}
      />
    )}
    </>
  );
};

// 尺寸编辑项组件
interface DimensionEditItemProps {
  dimension: MaterialDimension;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (formData: DimensionFormData) => void;
  onDelete: () => void;
  onTransfer: (dimension: MaterialDimension) => void;
  loading: boolean;
}

const DimensionEditItem: React.FC<DimensionEditItemProps> = ({
  dimension,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onTransfer,
  loading
}) => {
  const [formData, setFormData] = useState<DimensionFormData>({
    width: dimension.width.toString(),
    height: dimension.height.toString(),
    quantity: dimension.quantity.toString(),
    notes: dimension.notes || ''
  });

  const handleSubmit = () => {
    onUpdate(formData);
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ backgroundColor: '#fef3c7' }}
        animate={{ backgroundColor: '#ffffff' }}
        className="border border-yellow-200 rounded-lg p-3"
      >
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Input
            type="number"
            placeholder="宽度 (mm)"
            value={formData.width}
            onChange={(e) => setFormData(prev => ({ ...prev, width: e.target.value }))}
            step="0.01"
            min="0"
            className="text-sm"
          />
          <Input
            type="number"
            placeholder="长度 (mm)"
            value={formData.height}
            onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
            step="0.01"
            min="0"
            className="text-sm"
          />
          <Input
            type="number"
            placeholder="数量 (张)"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
            min="1"
            className="text-sm"
          />
          <Input
            placeholder="备注"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="text-sm"
          />
        </div>
        <div className="flex justify-end space-x-1">
          <Button size="xs" variant="secondary" onClick={onCancelEdit} disabled={loading}>
            取消
          </Button>
          <Button size="xs" onClick={handleSubmit} loading={loading}>
            保存
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-1">
        <div className="flex items-center space-x-3">
          <span className="font-medium text-gray-900">
            {dimension.width}×{dimension.height}mm
          </span>
          <span className="font-semibold text-blue-600">
            {dimension.quantity}张
          </span>
        </div>
        {dimension.notes && (
          <p className="text-sm text-gray-600 mt-1">{dimension.notes}</p>
        )}
      </div>
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onTransfer(dimension)}
          className="p-1.5 hover:bg-green-100 rounded text-green-600 transition-colors"
          
          disabled={loading}
        >
          <ArrowRightIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-colors"
          
          disabled={loading}
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-red-100 rounded text-red-600 transition-colors"
          
          disabled={loading}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DimensionManager;
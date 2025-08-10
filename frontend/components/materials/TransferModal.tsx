import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useDialog } from '../ui';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

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

interface Worker {
  id: number;
  name: string;
  departmentInfo?: {
    id: number;
    name: string;
  };
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimension: MaterialDimension;
  workerMaterial?: WorkerMaterial;
  onSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  dimension,
  workerMaterial,
  onSuccess
}) => {
  const { user, token } = useAuth();
  const { alert, confirm, DialogRenderer } = useDialog();
  
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [transferQuantity, setTransferQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingWorkers, setFetchingWorkers] = useState(true);

  // 获取工人列表
  const fetchWorkers = async () => {
    if (!token) {
      setFetchingWorkers(false);
      return;
    }

    try {
      setFetchingWorkers(true);
      
      const response = await apiRequest('/api/workers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const workerList = data.workers || [];
        
        // 排除当前工人
        const availableWorkers = workerList.filter((worker: Worker) => 
          worker.name !== workerMaterial?.workerName
        );
        
        setWorkers(availableWorkers);
      } else {
        const errorData = await response.json().catch(() => ({}));
      }
    } catch (error) {
    } finally {
      setFetchingWorkers(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setSelectedWorkerId('');
    setTransferQuantity('');
    setNotes('');
  };

  // 处理模态框打开
  useEffect(() => {
    if (isOpen && token) {
      fetchWorkers();
      resetForm();
      // 默认设置转移数量为当前数量
      setTransferQuantity(dimension.quantity.toString());
    }
  }, [isOpen, dimension.quantity, token]);

  // 处理转移操作
  const handleTransfer = async () => {
    
    if (!token) {
      await alert('认证已过期，请重新登录');
      return;
    }

    // 验证输入
    if (!selectedWorkerId) {
      await alert('请选择目标工人');
      return;
    }

    const quantity = parseInt(transferQuantity);
    if (!quantity || quantity <= 0) {
      await alert('请输入有效的转移数量');
      return;
    }

    if (quantity > dimension.quantity) {
      await alert(`转移数量不能超过现有数量 ${dimension.quantity} 张`);
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/api/material-dimensions/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromDimensionId: dimension.id,
          toWorkerId: parseInt(selectedWorkerId),
          quantity: quantity,
          notes: notes || null
        })
      });

      if (response.ok) {
        const result = await response.json();
        // 移除成功提示，直接关闭模态框
        onSuccess();
        onClose();
      } else {
        const error = await response.json().catch(() => ({}));
        await alert(`转移失败: ${error.error || '未知错误'}`);
      }
    } catch (error) {
      await alert('转移失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const selectedWorker = workers.find(w => w.id.toString() === selectedWorkerId);

  return (
    <>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 头部 */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              转移材料
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              将材料尺寸转移给其他工人
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={loading}
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

          {/* 内容 */}
          <div className="p-6 space-y-6">
            {/* 当前材料信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">当前材料信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">工人:</span>
                  <span className="font-medium">{workerMaterial?.workerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">材料类型:</span>
                  <span className="font-medium">{workerMaterial?.materialType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">厚度:</span>
                  <span className="font-medium">{workerMaterial?.thickness}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">尺寸:</span>
                  <span className="font-medium">{dimension.width}×{dimension.height}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">数量:</span>
                  <span className="font-medium text-blue-600">{dimension.quantity} 张</span>
                </div>
                {dimension.notes && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">备注:</span>
                    <span className="font-medium">{dimension.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 转移设置 */}
            <div className="space-y-4">
              <div className="text-center">
                <ArrowRightIcon className="w-6 h-6 text-blue-500 mx-auto" />
                <span className="text-sm text-gray-500 mt-1 block">转移到</span>
              </div>

              {/* 目标工人选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目标工人 * 
                  <span className="text-xs text-gray-500 ml-2">
                    (获取: {fetchingWorkers ? '加载中' : '完成'}, 工人数: {workers.length})
                  </span>
                </label>
                {fetchingWorkers ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-sm text-gray-500">加载工人列表...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedWorkerId}
                    onChange={(value) => setSelectedWorkerId(value.toString())}
                    disabled={loading}
                    placeholder="请选择工人"
                    options={[
                      ...workers.map(worker => ({
                        value: worker.id.toString(),
                        label: `${worker.name}${worker.departmentInfo?.name ? ` (${worker.departmentInfo.name})` : ''}`,
                        disabled: false
                      }))
                    ]}
                  />
                )}
              </div>

              {/* 转移数量 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  转移数量 * <span className="text-gray-500 text-xs">(最多 {dimension.quantity} 张)</span>
                </label>
                <Input
                  type="number"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  placeholder="请输入转移数量"
                  min="1"
                  max={dimension.quantity}
                  disabled={loading}
                />
              </div>

              {/* 转移备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  转移备注 (可选)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="添加转移说明..."
                  disabled={loading}
                />
              </div>
            </div>

            {/* 转移预览 */}
            {selectedWorker && transferQuantity && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 rounded-lg p-4"
              >
                <h4 className="font-medium text-green-900 mb-2">转移预览</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-green-700">转移给:</span> 
                    <span className="font-medium ml-1">{selectedWorker.name}</span>
                    {selectedWorker.departmentInfo && (
                      <span className="text-green-600 ml-1">({selectedWorker.departmentInfo.name})</span>
                    )}
                  </div>
                  <div>
                    <span className="text-green-700">转移数量:</span> 
                    <span className="font-medium ml-1">{transferQuantity} 张</span>
                  </div>
                  <div>
                    <span className="text-green-700">剩余数量:</span> 
                    <span className="font-medium ml-1">{dimension.quantity - parseInt(transferQuantity || '0')} 张</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* 底部操作 */}
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleTransfer}
              loading={loading}
              disabled={!selectedWorkerId || !transferQuantity || fetchingWorkers}
            >
              确认转移
            </Button>
          </div>
        </div>
      
      {/* Dialog渲染器 */}
      <DialogRenderer />
    </>
  );
};

export default TransferModal;
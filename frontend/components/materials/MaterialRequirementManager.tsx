import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  XMarkIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StateChip } from '../ui/StateChip';
import { InfoCard } from '../ui/InfoCard';
import { useDialog } from '../ui/Dialog';
import { Loading } from '../ui/Loading';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

// 防抖工具函数
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

interface Worker {
  id: number;
  name: string;
  department: string;
}

interface InventoryItem {
  workerId: number;
  workerName: string;
  department: string;
  quantity: number;
  isProjectWorker: boolean;
}

interface MaterialRequirement {
  id: number;
  width: number;
  height: number;
  quantity: number;
  allocatedQuantity: number;
  notes?: string;
  allocations: any[];
}

interface MaterialRequirementManagerProps {
  projectId: number;
  materialId: number;
  materialType: string;
  thickness: string;
  projectWorker?: Worker;
  onClose: () => void;
  onUpdate: () => void;
}

export const MaterialRequirementManager: React.FC<MaterialRequirementManagerProps> = ({
  projectId,
  materialId,
  materialType,
  thickness,
  projectWorker,
  onClose,
  onUpdate
}) => {
  const { token } = useAuth();
  const { alert, confirm, DialogRenderer } = useDialog();
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // 添加需求表单
  const [newRequirement, setNewRequirement] = useState({
    searchQuery: '', // 搜索关键词（宽度或高度）
    selectedDimension: null as { width: number; height: number; availableQuantity: number } | null,
    quantity: '',
    notes: ''
  });

  // 搜索结果状态
  const [dimensionSearchResults, setDimensionSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // 分配状态
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<MaterialRequirement | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allocations, setAllocations] = useState<{ fromWorkerId: number; quantity: number }[]>([]);

  // 搜索现有板材尺寸
  const searchDimensions = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setDimensionSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await apiRequest('/api/material-dimensions/search', {
        headers: { 'Authorization': `Bearer ${token}` },
        method: 'POST',
        body: JSON.stringify({
          materialType,
          thickness,
          searchQuery: query.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDimensionSearchResults(data.dimensions || []);
      }
    } catch (error) {
    } finally {
      setSearchLoading(false);
    }
  };

  // 防抖搜索
  const debouncedSearch = useCallback(
    debounce((query: string) => searchDimensions(query), 300),
    [materialType, thickness, token]
  );

  // 处理搜索输入变化
  const handleSearchChange = (value: string) => {
    setNewRequirement(prev => ({ 
      ...prev, 
      searchQuery: value,
      selectedDimension: null // 清空已选择的尺寸
    }));
    debouncedSearch(value);
  };

  // 获取需求列表
  const fetchRequirements = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/material-requirements/project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // 过滤出当前材料的需求
        const materialRequirements = data.requirements.filter(
          (req: any) => req.materialId === materialId
        );
        setRequirements(materialRequirements);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // 添加需求
  const handleAddRequirement = async () => {
    if (!newRequirement.selectedDimension || !newRequirement.quantity) {
      await alert('请选择尺寸规格并填写数量');
      return;
    }

    if (parseInt(newRequirement.quantity) > newRequirement.selectedDimension.availableQuantity) {
      await alert(`需求数量不能超过库存数量 (${newRequirement.selectedDimension.availableQuantity} 张)`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest('/api/material-requirements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          materialId,
          width: newRequirement.selectedDimension.width,
          height: newRequirement.selectedDimension.height,
          quantity: parseInt(newRequirement.quantity),
          notes: newRequirement.notes
        })
      });

      if (response.ok) {
        setNewRequirement({ 
          searchQuery: '', 
          selectedDimension: null, 
          quantity: '', 
          notes: '' 
        });
        setDimensionSearchResults([]);
        setShowAddForm(false);
        fetchRequirements();
        onUpdate();
      } else {
        const error = await response.json();
        await alert(`添加失败: ${error.message}`);
      }
    } catch (error) {
      await alert('添加失败，请检查网络连接');
    } finally {
      setSubmitting(false);
    }
  };

  // 检查库存
  const checkInventory = async (width: number, height: number) => {
    try {
      const params: Record<string, string> = {
        materialType,
        thickness,
        width: width.toString(),
        height: height.toString()
      };

      // 只有当projectWorker存在时才添加projectWorkerId参数
      if (projectWorker?.id) {
        params.projectWorkerId = projectWorker.id.toString();
      }

      const response = await apiRequest('/api/material-requirements/check-inventory', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        params
      });

      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory || []);
        return data.inventory || [];
      } else {
      }
    } catch (error) {
    }
    return [];
  };

  // 开始分配
  const startAllocation = async (requirement: MaterialRequirement) => {
    setSelectedRequirement(requirement);
    const inventoryData = await checkInventory(requirement.width, requirement.height);
    
    // 初始化分配策略
    const remainingQuantity = requirement.quantity - requirement.allocatedQuantity;
    const newAllocations: { fromWorkerId: number; quantity: number }[] = [];
    let allocated = 0;

    // 优先从项目工人分配
    const projectWorkerInventory = inventoryData.find((inv: InventoryItem) => inv.isProjectWorker);
    if (projectWorkerInventory && allocated < remainingQuantity) {
      const allocateFromProject = Math.min(
        projectWorkerInventory.quantity,
        remainingQuantity - allocated
      );
      if (allocateFromProject > 0) {
        newAllocations.push({
          fromWorkerId: projectWorkerInventory.workerId,
          quantity: allocateFromProject
        });
        allocated += allocateFromProject;
      }
    }

    // 从其他工人分配
    for (const inv of inventoryData) {
      if (!inv.isProjectWorker && allocated < remainingQuantity) {
        const allocateFromOther = Math.min(
          inv.quantity,
          remainingQuantity - allocated
        );
        if (allocateFromOther > 0) {
          newAllocations.push({
            fromWorkerId: inv.workerId,
            quantity: allocateFromOther
          });
          allocated += allocateFromOther;
        }
      }
    }

    setAllocations(newAllocations);
    setShowAllocationModal(true);
  };

  // 执行分配
  const executeAllocation = async () => {
    if (!selectedRequirement) return;

    setSubmitting(true);
    try {
      const response = await apiRequest(
        `/api/material-requirements/${selectedRequirement.id}/allocate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ allocations })
        }
      );

      if (response.ok) {
        setShowAllocationModal(false);
        setSelectedRequirement(null);
        setAllocations([]);
        fetchRequirements();
        onUpdate();
      } else {
        const error = await response.json();
        await alert(`分配失败: ${error.message}`);
      }
    } catch (error) {
      await alert('分配失败，请检查网络连接');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除需求
  const deleteRequirement = async (requirementId: number) => {
    const confirmed = await confirm('确定要删除这个需求吗？相关库存分配将被归还。');
    if (!confirmed) return;

    try {
      const response = await apiRequest(`/api/material-requirements/${requirementId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchRequirements();
        onUpdate();
      } else {
        const error = await response.json();
        await alert(`删除失败: ${error.message}`);
      }
    } catch (error) {
      await alert('删除失败，请检查网络连接');
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [projectId, materialId]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* 头部 */}
          <div className="flex justify-between items-center p-6 border-b bg-gray-50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">板材需求管理</h2>
              <p className="text-sm text-gray-600 mt-1">
                {materialType} {thickness}mm - 项目工人: {projectWorker?.name || '未分配'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </Button>
          </div>

          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {/* 统计信息 */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <InfoCard
                title="需求总量"
                value={`${requirements.reduce((sum, req) => sum + req.quantity, 0)} 张`}
                color="blue"
                size="sm"
              />
              <InfoCard
                title="已分配量"
                value={`${requirements.reduce((sum, req) => sum + req.allocatedQuantity, 0)} 张`}
                color="green"
                size="sm"
              />
            </div>

            {/* 需求列表 */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">尺寸需求</h4>
                <Button
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  disabled={showAddForm || loading}
                  className="flex items-center space-x-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>添加需求</span>
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <Loading text="加载需求列表中..." />
                </div>
              ) : requirements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无尺寸需求，点击"添加需求"开始管理
                </div>
              ) : (
                <div className="space-y-2">
                  {requirements.map(requirement => {
                    const isFullyAllocated = requirement.allocatedQuantity >= requirement.quantity;
                    const hasAllocations = requirement.allocations.length > 0;
                    
                    return (
                      <div key={requirement.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-medium text-gray-900">
                                {requirement.width}×{requirement.height}mm
                              </span>
                              <span className="text-sm text-gray-600">
                                需求 {requirement.quantity} 张
                              </span>
                              {isFullyAllocated ? (
                                <StateChip 
                                  status="completed" 
                                  text="已分配" 
                                  size="sm"
                                  variant="subtle" 
                                />
                              ) : (
                                <StateChip 
                                  status="warning" 
                                  text={`待分配 ${requirement.quantity - requirement.allocatedQuantity}`}
                                  size="sm"
                                  variant="subtle"
                                />
                              )}
                            </div>
                            
                            {/* 分配详情 */}
                            {hasAllocations && (
                              <div className="text-sm text-gray-600 mt-2">
                                分配来源: {requirement.allocations.map(alloc => 
                                  `${alloc.fromWorker.name}(${alloc.quantity}张)`
                                ).join(', ')}
                              </div>
                            )}
                            
                            {requirement.notes && (
                              <div className="text-sm text-gray-500 mt-1">
                                备注: {requirement.notes}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            {!isFullyAllocated && (
                              <Button
                                size="sm"
                                onClick={() => startAllocation(requirement)}
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                分配板材
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => deleteRequirement(requirement.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 添加需求表单 */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border rounded-lg p-4 bg-green-50 mb-4"
                >
                  <h5 className="font-medium text-green-900 mb-3">添加新需求</h5>
                  
                  {/* 尺寸搜索 */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      搜索现有尺寸规格
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="输入宽度或高度进行搜索 (如: 200, 300mm 等)"
                        value={newRequirement.searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10"
                      />
                      <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>

                  {/* 搜索结果列表 */}
                  {searchLoading && (
                    <div className="text-center py-2 text-gray-500 text-sm">
                      搜索中...
                    </div>
                  )}

                  {dimensionSearchResults.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        选择尺寸规格
                      </label>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {dimensionSearchResults.map((dimension, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setNewRequirement(prev => ({
                              ...prev,
                              selectedDimension: {
                                width: dimension.width,
                                height: dimension.height,
                                availableQuantity: dimension.totalQuantity
                              }
                            }))}
                            className={`w-full p-3 rounded-lg border text-left transition-colors ${
                              newRequirement.selectedDimension?.width === dimension.width && 
                              newRequirement.selectedDimension?.height === dimension.height
                                ? 'border-green-500 bg-green-100' 
                                : 'border-gray-300 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium text-gray-900">
                                  {dimension.width}×{dimension.height}mm
                                </span>
                                <div className="text-sm text-gray-600">
                                  可用: {dimension.totalQuantity} 张 | 工人: {dimension.workerName}
                                </div>
                              </div>
                              {newRequirement.selectedDimension?.width === dimension.width && 
                               newRequirement.selectedDimension?.height === dimension.height && (
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 已选择的尺寸显示 */}
                  {newRequirement.selectedDimension && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-blue-900">
                            已选择: {newRequirement.selectedDimension.width}×{newRequirement.selectedDimension.height}mm
                          </span>
                          <div className="text-sm text-blue-700">
                            库存: {newRequirement.selectedDimension.availableQuantity} 张
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewRequirement(prev => ({ ...prev, selectedDimension: null }))}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 数量和备注 */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        需求数量 (张)
                      </label>
                      <Input
                        type="number"
                        placeholder="需要多少张"
                        value={newRequirement.quantity}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, quantity: e.target.value }))}
                        min="1"
                        max={newRequirement.selectedDimension?.availableQuantity || 999}
                        disabled={!newRequirement.selectedDimension}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        备注 (可选)
                      </label>
                      <Input
                        placeholder="备注信息"
                        value={newRequirement.notes}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => {
                        setShowAddForm(false);
                        setNewRequirement({ searchQuery: '', selectedDimension: null, quantity: '', notes: '' });
                        setDimensionSearchResults([]);
                      }}
                      disabled={submitting}
                    >
                      取消
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleAddRequirement}
                      loading={submitting}
                      disabled={!newRequirement.selectedDimension || !newRequirement.quantity}
                    >
                      添加需求
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 分配弹窗 */}
      <AnimatePresence>
        {showAllocationModal && selectedRequirement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">
                  分配板材 - {selectedRequirement.width}×{selectedRequirement.height}mm
                </h3>
                <p className="text-sm text-gray-600">
                  需求 {selectedRequirement.quantity - selectedRequirement.allocatedQuantity} 张
                </p>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  <h4 className="font-medium">库存状态</h4>
                  {inventory.map(inv => {
                    const allocation = allocations.find(a => a.fromWorkerId === inv.workerId);
                    const allocatedQty = allocation?.quantity || 0;
                    
                    return (
                      <div key={inv.workerId} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                          <div>
                            <span className="font-medium">
                              {inv.workerName}
                              {inv.isProjectWorker && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                  项目工人
                                </span>
                              )}
                            </span>
                            <div className="text-sm text-gray-600">{inv.department}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">库存: {inv.quantity}张</div>
                          {allocatedQty > 0 && (
                            <div className="text-sm text-blue-600">分配: {allocatedQty}张</div>
                          )}
                          {/* 分配数量输入 */}
                          <div className="mt-2 flex items-center space-x-2">
                            <Input
                              type="number"
                              min="0"
                              max={inv.quantity}
                              value={allocatedQty.toString()}
                              onChange={(e) => {
                                const newQty = Math.min(parseInt(e.target.value) || 0, inv.quantity);
                                setAllocations(prev => {
                                  const existing = prev.find(a => a.fromWorkerId === inv.workerId);
                                  if (existing) {
                                    if (newQty === 0) {
                                      return prev.filter(a => a.fromWorkerId !== inv.workerId);
                                    }
                                    return prev.map(a => 
                                      a.fromWorkerId === inv.workerId 
                                        ? { ...a, quantity: newQty }
                                        : a
                                    );
                                  } else if (newQty > 0) {
                                    return [...prev, { fromWorkerId: inv.workerId, quantity: newQty }];
                                  }
                                  return prev;
                                });
                              }}
                              className="w-20 text-center"
                              placeholder="0"
                            />
                            <span className="text-xs text-gray-500">张</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-800">
                      总分配: {allocations.reduce((sum, alloc) => sum + alloc.quantity, 0)} 张
                    </span>
                    <span className="text-blue-800">
                      还需分配: {selectedRequirement.quantity - selectedRequirement.allocatedQuantity - allocations.reduce((sum, alloc) => sum + alloc.quantity, 0)} 张
                    </span>
                  </div>
                  {allocations.reduce((sum, alloc) => sum + alloc.quantity, 0) !== (selectedRequirement.quantity - selectedRequirement.allocatedQuantity) && (
                    <div className="mt-2 text-sm text-orange-600">
                      分配数量必须等于需求数量才能确认分配
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowAllocationModal(false);
                      setSelectedRequirement(null);
                      setAllocations([]);
                    }}
                    disabled={submitting}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={executeAllocation}
                    loading={submitting}
                    disabled={
                      allocations.length === 0 || 
                      allocations.reduce((sum, alloc) => sum + alloc.quantity, 0) !== (selectedRequirement.quantity - selectedRequirement.allocatedQuantity)
                    }
                  >
                    确认分配
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Dialog渲染器 */}
      <DialogRenderer />
    </>
  );
};
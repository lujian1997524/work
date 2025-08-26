import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  XMarkIcon, 
  PencilIcon, 
  TrashIcon, 
  DocumentDuplicateIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Button, useDialog } from '../ui';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { materialToastHelper } from '@/utils/materialToastHelper';

// 数据类型定义
interface MaterialDimension {
  id: number;
  length?: string;
  width: string;
  height?: string;
  thickness?: string;
  quantity: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkerMaterial {
  id: number;
  workerName: string;
  materialType: string;
  thickness: string;
  totalQuantity: number;
}

interface DimensionManagerV2Props {
  workerMaterialId: number;
  initialDimensions: MaterialDimension[];
  workerMaterial: WorkerMaterial;
  onUpdate: () => void;
  onClose: () => void;
}

interface DimensionFormData {
  width: string;
  height: string;
  quantity: string;
  notes: string;
}

// 统计数据接口
interface DimensionStats {
  totalDimensions: number;
  totalQuantity: number;
  averageQuantity: number;
  uniqueSizes: number;
  recentlyAdded: number;
}

// 排序选项
type SortOption = 'quantity' | 'size' | 'recent' | 'alphabetical';
type SortDirection = 'asc' | 'desc';

export const DimensionManagerV2: React.FC<DimensionManagerV2Props> = ({
  workerMaterialId,
  initialDimensions,
  workerMaterial,
  onUpdate,
  onClose
}) => {
  const { user } = useAuth();
  const { confirm, DialogRenderer } = useDialog();

  // 基础状态 - 只保留界面状态，移除数据状态
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDimensions, setSelectedDimensions] = useState<Set<number>>(new Set());
  
  // 数据状态 - 使用服务器数据，但避免不必要的重新获取
  const [dimensions, setDimensions] = useState<MaterialDimension[]>([]);

  // 界面状态
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedView, setExpandedView] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // 排序和筛选状态
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [minQuantity, setMinQuantity] = useState<string>('');
  const [maxQuantity, setMaxQuantity] = useState<string>('');

  // 表单状态
  const [formData, setFormData] = useState<DimensionFormData>({
    width: '',
    height: '',
    quantity: '',
    notes: ''
  });

  // 转移相关状态
  const [transferTarget, setTransferTarget] = useState<string>('');
  const [transferQuantity, setTransferQuantity] = useState<string>('');
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([]);

  // 获取最新数据 - 仅在组件初始化时调用
  const fetchLatestDimensions = useCallback(async () => {
    console.log('🔄 从服务器获取初始尺寸数据...');
    try {
      const response = await apiRequest(`/api/material-dimensions/worker-materials/${workerMaterialId}/dimensions`);
      if (response.ok) {
        const data = await response.json();
        const latestDimensions = data.dimensions || [];
        console.log('✅ 获取成功，数据长度:', latestDimensions.length);
        setDimensions(latestDimensions);
        return latestDimensions;
      } else {
        console.error('❌ 获取数据失败:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ 获取数据异常:', error);
      return null;
    }
  }, [workerMaterialId]);

  // 仅在组件挂载时获取数据
  useEffect(() => {
    fetchLatestDimensions();
  }, [fetchLatestDimensions]);

  // 计算统计数据
  const stats: DimensionStats = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return {
      totalDimensions: dimensions.length,
      totalQuantity: dimensions.reduce((sum, dim) => sum + dim.quantity, 0),
      averageQuantity: dimensions.length ? Math.round(dimensions.reduce((sum, dim) => sum + dim.quantity, 0) / dimensions.length) : 0,
      uniqueSizes: new Set(dimensions.map(dim => `${dim.width}×${dim.height || dim.thickness || 0}`)).size,
      recentlyAdded: dimensions.filter(dim => 
        dim.createdAt && new Date(dim.createdAt) > oneDayAgo
      ).length
    };
  }, [dimensions]);

  // 筛选和排序逻辑 - 直接使用服务器数据
  const filteredAndSortedDimensions = useMemo(() => {
    console.log('📊 计算筛选数据，原始数据长度:', dimensions.length);
    
    let filtered = [...dimensions];

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(dim =>
        dim.width?.toLowerCase().includes(query) ||
        dim.height?.toLowerCase().includes(query) ||
        dim.thickness?.toLowerCase().includes(query) ||
        dim.notes?.toLowerCase().includes(query) ||
        dim.quantity.toString().includes(query)
      );
    }

    // 数量范围筛选
    if (minQuantity) {
      filtered = filtered.filter(dim => dim.quantity >= parseInt(minQuantity));
    }
    if (maxQuantity) {
      filtered = filtered.filter(dim => dim.quantity <= parseInt(maxQuantity));
    }

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'size':
          const aSize = parseFloat(a.width) * parseFloat(a.height || a.thickness || '0');
          const bSize = parseFloat(b.width) * parseFloat(b.height || b.thickness || '0');
          comparison = aSize - bSize;
          break;
        case 'recent':
          const aTime = new Date(a.updatedAt || a.createdAt || '').getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || '').getTime();
          comparison = aTime - bTime;
          break;
        case 'alphabetical':
          comparison = a.width.localeCompare(b.width);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    console.log('📊 筛选后数据长度:', filtered.length);
    return filtered;
  }, [dimensions, searchQuery, minQuantity, maxQuantity, sortBy, sortDirection]);

  // 添加尺寸 - 使用服务器返回的真实数据直接更新
  const addDimension = async () => {
    if (!formData.width || !formData.height || !formData.quantity) {
      materialToastHelper.error('请填写完整的尺寸信息');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(`/api/material-dimensions/worker-materials/${workerMaterialId}/dimensions/simple`, {
        method: 'POST',
        body: JSON.stringify({
          width: formData.width,
          height: formData.height,
          quantity: parseInt(formData.quantity),
          notes: formData.notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        const newDimension = result.dimension || result;
        
        // 直接使用服务器返回的真实数据更新本地状态，无视觉闪烁
        setDimensions(prevDimensions => [...prevDimensions, {
          id: newDimension.id,
          width: newDimension.width?.toString() || formData.width,
          height: newDimension.height?.toString() || formData.height,
          quantity: newDimension.quantity || parseInt(formData.quantity),
          notes: newDimension.notes || formData.notes,
          createdAt: newDimension.createdAt || new Date().toISOString(),
          updatedAt: newDimension.updatedAt || new Date().toISOString()
        }]);
        
        setFormData({ width: '', height: '', quantity: '', notes: '' });
        setShowAddForm(false);
        
        // 触发事件通知其他组件更新（现在不会闪烁因为有防护机制）
        window.dispatchEvent(new CustomEvent('materials-updated'));
        window.dispatchEvent(new CustomEvent('worker-materials-updated'));
        
        materialToastHelper.dimensionAdded(
          `${workerMaterial.materialType} ${workerMaterial.thickness}mm`,
          `${formData.width}×${formData.height}mm`,
          parseInt(formData.quantity)
        );
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

  // 更新尺寸 - 使用服务器返回的真实数据直接更新
  const updateDimension = async (id: number, data: DimensionFormData) => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/material-dimensions/dimensions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          width: data.width,
          height: data.height,
          quantity: parseInt(data.quantity),
          notes: data.notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        const updatedDimension = result;
        
        // 直接使用服务器返回的真实数据更新本地状态，无视觉闪烁
        setDimensions(prevDimensions => 
          prevDimensions.map(dim => dim.id === id ? {
            ...dim,
            width: updatedDimension.width?.toString() || data.width,
            height: updatedDimension.height?.toString() || data.height,
            quantity: updatedDimension.quantity || parseInt(data.quantity),
            notes: updatedDimension.notes || data.notes,
            updatedAt: updatedDimension.updatedAt || new Date().toISOString()
          } : dim)
        );
        
        setEditingId(null);
        
        // 触发事件通知其他组件更新，而不是调用onUpdate回调
        window.dispatchEvent(new CustomEvent('materials-updated'));
        window.dispatchEvent(new CustomEvent('worker-materials-updated'));
        
        materialToastHelper.dimensionUpdated(
          `${data.width}×${data.height}mm`,
          parseInt(data.quantity)
        );
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

  // 添加API测试函数用于调试
  const testApiEndpoints = async () => {
    console.log('=== API连接测试开始 ===');
    
    try {
      // 测试健康检查
      const healthResponse = await fetch('https://api.gei5.com/health');
      console.log('健康检查状态:', healthResponse.status);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('健康检查数据:', healthData);
      }
    } catch (e) {
      console.error('健康检查失败:', e);
    }

    try {
      // 测试认证状态
      const authTestResponse = await apiRequest('/api/worker-materials?limit=1');
      console.log('认证测试状态:', authTestResponse.status);
      if (authTestResponse.ok) {
        console.log('认证正常');
      } else {
        console.log('认证可能有问题');
      }
    } catch (e) {
      console.error('认证测试失败:', e);
    }

    try {
      // 测试material-dimensions路由
      const dimensionsResponse = await apiRequest(`/api/material-dimensions/worker-materials/${workerMaterialId}/dimensions`);
      console.log('尺寸API测试状态:', dimensionsResponse.status);
      if (dimensionsResponse.ok) {
        const data = await dimensionsResponse.json();
        console.log('尺寸API数据示例:', data.dimensions?.slice(0, 2));
      } else {
        console.log('尺寸API可能有问题');
      }
    } catch (e) {
      console.error('尺寸API测试失败:', e);
    }
    
    console.log('=== API连接测试结束 ===');
  };

  // 删除尺寸 - 使用服务器确认后直接移除，无视觉闪烁
  const deleteDimension = async (id: number) => {
    const dimension = dimensions.find(d => d.id === id);
    if (!dimension) return;

    if (!await confirm(`确定要删除尺寸 ${dimension.width}×${dimension.height || dimension.thickness || 0}mm 的记录吗？`)) {
      return;
    }

    setLoading(true);
    try {
      console.log(`尝试删除尺寸记录 ID: ${id}`);
      
      const response = await apiRequest(`/api/material-dimensions/dimensions/${id}`, {
        method: 'DELETE'
      });
      
      console.log(`删除请求响应:`, response.status, response.statusText);

      if (response.ok) {
        console.log('服务器删除成功');
        
        // 直接从本地状态移除已删除的记录，无视觉闪烁
        setDimensions(prevDimensions => prevDimensions.filter(d => d.id !== id));
        
        // 触发事件通知其他组件更新，而不是调用onUpdate回调
        window.dispatchEvent(new CustomEvent('materials-updated'));
        window.dispatchEvent(new CustomEvent('worker-materials-updated'));
        
        materialToastHelper.dimensionDeleted(
          `${dimension.width}×${dimension.height || dimension.thickness || 0}mm`,
          dimension.quantity
        );
      } else {
        console.log('服务器删除失败');
        materialToastHelper.error('删除失败');
      }
    } catch (error) {
      console.error('删除操作异常:', error);
      materialToastHelper.error('删除失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 批量删除 - 使用服务器确认后批量移除，无视觉闪烁
  const batchDelete = async () => {
    if (selectedDimensions.size === 0) return;

    if (!await confirm(`确定要删除选中的 ${selectedDimensions.size} 个尺寸记录吗？`)) {
      return;
    }

    setLoading(true);
    const deletedIds = Array.from(selectedDimensions);
    
    try {
      // 并行删除
      const deletePromises = deletedIds.map(id => {
        console.log(`批量删除尺寸记录 ID: ${id}`);
        return apiRequest(`/api/material-dimensions/dimensions/${id}`, { method: 'DELETE' });
      });

      const results = await Promise.allSettled(deletePromises);
      
      // 统计删除结果
      let successCount = 0;
      let notFoundCount = 0;
      let errorCount = 0;
      const actuallyDeletedIds: number[] = [];
      
      results.forEach((result, index) => {
        const id = deletedIds[index];
        if (result.status === 'fulfilled') {
          const response = result.value;
          if (response.ok) {
            successCount++;
            actuallyDeletedIds.push(id);
          } else if (response.status === 404) {
            notFoundCount++;
            actuallyDeletedIds.push(id); // 404也算删除成功（记录已不存在）
            console.log(`记录 ${id} 不存在`);
          } else {
            errorCount++;
            console.error(`删除记录 ${id} 失败:`, response.status);
          }
        } else {
          errorCount++;
          console.error(`删除记录 ${id} 异常:`, result.reason);
        }
      });
      
      // 直接从本地状态移除成功删除的记录，无视觉闪烁
      if (actuallyDeletedIds.length > 0) {
        setDimensions(prevDimensions => prevDimensions.filter(d => !actuallyDeletedIds.includes(d.id)));
      }
      
      setSelectedDimensions(new Set());
      
      // 触发事件通知其他组件更新，而不是调用onUpdate回调
      window.dispatchEvent(new CustomEvent('materials-updated'));
      window.dispatchEvent(new CustomEvent('worker-materials-updated'));
      
      // 显示综合结果
      const totalProcessed = successCount + notFoundCount;
      if (totalProcessed > 0) {
        let message = `成功处理 ${totalProcessed} 个记录`;
        if (notFoundCount > 0) {
          message += `（${notFoundCount} 个记录已不存在）`;
        }
        materialToastHelper.batchOperationComplete(message);
      }
      
      if (errorCount > 0) {
        materialToastHelper.warning(`${errorCount} 个记录删除失败`);
      }
      
    } catch (error) {
      console.error('批量删除异常:', error);
      materialToastHelper.error('批量删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 复制尺寸
  const duplicateDimension = (dimension: MaterialDimension) => {
    setFormData({
      width: dimension.width,
      height: dimension.height || dimension.thickness || '',
      quantity: dimension.quantity.toString(),
      notes: dimension.notes ? `${dimension.notes} (副本)` : '副本'
    });
    setShowAddForm(true);
  };

  // 获取可用工人列表
  const fetchAvailableWorkers = useCallback(async () => {
    try {
      const response = await apiRequest('/api/workers');
      if (response.ok) {
        const data = await response.json();
        // 处理API返回的数据格式：{success: true, workers: [...]}
        const workersList = data.workers || data; // 兼容不同的返回格式
        if (Array.isArray(workersList)) {
          setAvailableWorkers(workersList.filter((w: any) => w.id !== workerMaterial.id));
        } else {
          console.error('获取的工人数据不是数组格式:', workersList);
          setAvailableWorkers([]);
        }
      }
    } catch (error) {
      console.error('获取工人列表失败:', error);
      setAvailableWorkers([]); // 确保在错误情况下设置为空数组
    }
  }, [workerMaterial.id]);

  // 转移材料 - 使用服务器确认后更新本地状态，无视觉闪烁
  const transferMaterial = async () => {
    if (!transferTarget || !transferQuantity) {
      materialToastHelper.error('请填写完整的转移信息');
      return;
    }

    const selectedDimension = dimensions.find(d => selectedDimensions.has(d.id));
    if (!selectedDimension) {
      materialToastHelper.error('请选择要转移的尺寸记录');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/api/material-dimensions/transfer', {
        method: 'POST',
        body: JSON.stringify({
          fromDimensionId: selectedDimension.id,
          toWorkerId: transferTarget,
          quantity: parseInt(transferQuantity)
        })
      });

      if (response.ok) {
        const result = await response.json();
        const transferredQuantity = parseInt(transferQuantity);
        
        // 直接更新本地状态：减少或移除转移的记录，无视觉闪烁
        setDimensions(prevDimensions => 
          prevDimensions.map(dim => {
            if (dim.id === selectedDimension.id) {
              const remainingQuantity = dim.quantity - transferredQuantity;
              if (remainingQuantity <= 0) {
                return null; // 标记为删除
              } else {
                return { ...dim, quantity: remainingQuantity };
              }
            }
            return dim;
          }).filter(dim => dim !== null) as MaterialDimension[]
        );
        
        // 触发事件通知其他组件更新，而不是调用onUpdate回调
        window.dispatchEvent(new CustomEvent('materials-updated'));
        window.dispatchEvent(new CustomEvent('worker-materials-updated'));
        
        setShowTransferModal(false);
        setTransferTarget('');
        setTransferQuantity('');
        setSelectedDimensions(new Set());
        
        const targetWorker = availableWorkers.find(w => w.id.toString() === transferTarget);
        materialToastHelper.materialTransferred(
          `${selectedDimension.width}×${selectedDimension.height || selectedDimension.thickness || 0}mm`,
          transferredQuantity,
          workerMaterial.workerName,
          targetWorker?.name || '未知工人'
        );
      } else {
        const error = await response.json();
        materialToastHelper.error(`转移失败: ${error.error || '未知错误'}`);
      }
    } catch (error) {
      materialToastHelper.error('转移失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 选择操作
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedDimensions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDimensions(newSelected);
  };

  const selectAll = () => {
    if (selectedDimensions.size === filteredAndSortedDimensions.length) {
      setSelectedDimensions(new Set());
    } else {
      setSelectedDimensions(new Set(filteredAndSortedDimensions.map(d => d.id)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DocumentDuplicateIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">板材尺寸管理</h2>
              <p className="text-gray-600">
                {workerMaterial.workerName} - {workerMaterial.thickness}mm{workerMaterial.materialType}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => setExpandedView(!expandedView)}
              className="flex items-center space-x-2"
            >
              {expandedView ? (
                <>
                  <ChevronUpIcon className="w-4 h-4" />
                  <span>收起</span>
                </>
              ) : (
                <>
                  <ChevronDownIcon className="w-4 h-4" />
                  <span>展开</span>
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              <XMarkIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 统计面板 */}
        <AnimatePresence>
          {expandedView && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-gray-200 bg-gray-50"
            >
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalDimensions}</div>
                    <div className="text-sm text-gray-600">总记录数</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{stats.totalQuantity}</div>
                    <div className="text-sm text-gray-600">总数量</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">{stats.averageQuantity}</div>
                    <div className="text-sm text-gray-600">平均数量</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-orange-600">{stats.uniqueSizes}</div>
                    <div className="text-sm text-gray-600">规格种类</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-red-600">{stats.recentlyAdded}</div>
                    <div className="text-sm text-gray-600">今日新增</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 工具栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {/* 搜索 */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索尺寸..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>

            {/* 排序 */}
            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [sort, dir] = e.target.value.split('-');
                setSortBy(sort as SortOption);
                setSortDirection(dir as SortDirection);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="recent-desc">最新优先</option>
              <option value="recent-asc">最旧优先</option>
              <option value="quantity-desc">数量降序</option>
              <option value="quantity-asc">数量升序</option>
              <option value="size-desc">面积降序</option>
              <option value="size-asc">面积升序</option>
              <option value="alphabetical-asc">规格A-Z</option>
              <option value="alphabetical-desc">规格Z-A</option>
            </select>

            {/* 筛选 */}
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 ${showFilters ? 'bg-blue-100 text-blue-600' : ''}`}
            >
              <FunnelIcon className="w-4 h-4" />
              <span>筛选</span>
            </Button>
          </div>

          <div className="flex items-center space-x-3">
            {/* 批量操作 */}
            {selectedDimensions.size > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg"
              >
                <span className="text-sm text-blue-600">已选择 {selectedDimensions.size} 项</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    fetchAvailableWorkers();
                    setShowTransferModal(true);
                  }}
                  className="flex items-center space-x-1"
                >
                  <ArrowsRightLeftIcon className="w-4 h-4" />
                  <span>转移</span>
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={batchDelete}
                  className="flex items-center space-x-1"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>删除</span>
                </Button>
              </motion.div>
            )}

            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>添加尺寸</span>
            </Button>
          </div>
        </div>

        {/* 筛选面板 */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-gray-200 bg-gray-50"
            >
              <div className="p-4 flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最小数量</label>
                  <input
                    type="number"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 w-20"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最大数量</label>
                  <input
                    type="number"
                    value={maxQuantity}
                    onChange={(e) => setMaxQuantity(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 w-20"
                    placeholder="∞"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMinQuantity('');
                    setMaxQuantity('');
                  }}
                  className="mt-6"
                >
                  清除
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 主要内容区域 */}
        <div className="flex-1 overflow-hidden">
          {/* 空状态 */}
          {filteredAndSortedDimensions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <InformationCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">暂无尺寸记录</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || minQuantity || maxQuantity 
                    ? '没有找到符合条件的记录，请调整搜索或筛选条件' 
                    : '还没有添加任何尺寸记录，点击"添加尺寸"开始'
                  }
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  添加尺寸
                </Button>
              </div>
            </div>
          ) : (
            /* 尺寸列表 */
            <div className="h-full overflow-auto">
              <div className="p-6">
                {/* 全选控制 */}
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    checked={selectedDimensions.size === filteredAndSortedDimensions.length}
                    onChange={selectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  <span className="text-sm text-gray-600">
                    {selectedDimensions.size === filteredAndSortedDimensions.length ? '取消全选' : '全选'}
                    （共 {filteredAndSortedDimensions.length} 项）
                  </span>
                </div>

                {/* 尺寸数据表格 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="w-12 px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedDimensions.size === filteredAndSortedDimensions.length && filteredAndSortedDimensions.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDimensions(new Set(filteredAndSortedDimensions.map(d => d.id)));
                                } else {
                                  setSelectedDimensions(new Set());
                                }
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">宽度(mm)</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">高度(mm)</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">数量</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">备注</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredAndSortedDimensions.map((dimension, index) => (
                          <DimensionTableRow
                            key={dimension.id}
                            dimension={dimension}
                            isSelected={selectedDimensions.has(dimension.id)}
                            isEditing={editingId === dimension.id}
                            onSelect={() => toggleSelection(dimension.id)}
                            onEdit={() => setEditingId(dimension.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onUpdate={(data) => updateDimension(dimension.id, data)}
                            onDelete={() => deleteDimension(dimension.id)}
                            onDuplicate={() => duplicateDimension(dimension)}
                            loading={loading}
                            index={index}
                          />
                        ))}
                        {filteredAndSortedDimensions.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              {searchQuery ? '没有找到匹配的尺寸记录' : '暂无尺寸记录'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 添加表单模态框 */}
        <AnimatePresence>
          {showAddForm && (
            <AddDimensionModal
              formData={formData}
              onFormDataChange={setFormData}
              onSubmit={addDimension}
              onClose={() => {
                setShowAddForm(false);
                setFormData({ width: '', height: '', quantity: '', notes: '' });
              }}
              loading={loading}
            />
          )}
        </AnimatePresence>

        {/* 转移模态框 */}
        <AnimatePresence>
          {showTransferModal && (
            <TransferModal
              availableWorkers={availableWorkers}
              transferTarget={transferTarget}
              transferQuantity={transferQuantity}
              onTransferTargetChange={setTransferTarget}
              onTransferQuantityChange={setTransferQuantity}
              onSubmit={transferMaterial}
              onClose={() => setShowTransferModal(false)}
              loading={loading}
              selectedCount={selectedDimensions.size}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <DialogRenderer />
    </div>
  );
};

// 尺寸表格行组件
interface DimensionTableRowProps {
  dimension: MaterialDimension;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (data: DimensionFormData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  loading: boolean;
  index: number;
}

const DimensionTableRow: React.FC<DimensionTableRowProps> = ({
  dimension,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  loading,
  index
}) => {
  const [editData, setEditData] = useState<DimensionFormData>({
    width: dimension.width,
    height: dimension.height || dimension.thickness || '',
    quantity: dimension.quantity.toString(),
    notes: dimension.notes || ''
  });

  // 进入编辑模式时使用当前数据，不额外请求
  useEffect(() => {
    if (isEditing) {
      setEditData({
        width: dimension.width,
        height: dimension.height || dimension.thickness || '',
        quantity: dimension.quantity.toString(),
        notes: dimension.notes || ''
      });
    }
  }, [isEditing]);

  const handleSubmit = () => {
    onUpdate(editData);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const area = parseFloat(dimension.width) * parseFloat(dimension.height || dimension.thickness || '0');

  return (
    <tr
      className={`
        transition-colors duration-150
        ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
        ${loading ? 'opacity-50' : ''}
      `}
    >
      {/* 选择框 */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          disabled={loading}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
      </td>

      {/* 宽度 */}
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="number"
            value={editData.width}
            onChange={(e) => setEditData({ ...editData, width: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="宽度"
          />
        ) : (
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">{dimension.width}</span>
            {area > 0 && (
              <span className="text-xs text-gray-500">
                (面积: {area.toLocaleString()}mm²)
              </span>
            )}
          </div>
        )}
      </td>

      {/* 高度 */}
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="number"
            value={editData.height}
            onChange={(e) => setEditData({ ...editData, height: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="高度"
          />
        ) : (
          <span className="font-medium text-gray-900">
            {dimension.height || dimension.thickness || 0}
          </span>
        )}
      </td>

      {/* 数量 */}
      <td className="px-4 py-3 text-center">
        {isEditing ? (
          <input
            type="number"
            value={editData.quantity}
            onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center"
            placeholder="数量"
          />
        ) : (
          <span className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium
            ${dimension.quantity > 20 ? 'text-green-800 bg-green-100' :
              dimension.quantity > 10 ? 'text-yellow-800 bg-yellow-100' :
              dimension.quantity > 0 ? 'text-orange-800 bg-orange-100' :
              'text-gray-800 bg-gray-100'}
          `}>
            {dimension.quantity}
          </span>
        )}
      </td>

      {/* 备注 */}
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            type="text"
            value={editData.notes}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="备注信息"
          />
        ) : (
          <div className="max-w-xs">
            {dimension.notes && (
              <div className="text-sm text-gray-600 truncate" title={dimension.notes}>
                {dimension.notes}
              </div>
            )}
            {dimension.createdAt && (
              <div className="text-xs text-gray-400 mt-1 flex items-center space-x-1">
                <ClockIcon className="w-3 h-3" />
                <span>{formatDate(dimension.createdAt)}</span>
              </div>
            )}
          </div>
        )}
      </td>

      {/* 操作 */}
      <td className="px-4 py-3">
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center p-1.5 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
              title="保存"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onCancelEdit}
              disabled={loading}
              className="inline-flex items-center p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              title="取消"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-1">
            <button
              onClick={onDuplicate}
              disabled={loading}
              className="inline-flex items-center p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              title="复制"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onEdit}
              disabled={loading}
              className="inline-flex items-center p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              title="编辑"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              disabled={loading}
              className="inline-flex items-center p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
              title="删除"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

// 添加尺寸模态框
interface AddDimensionModalProps {
  formData: DimensionFormData;
  onFormDataChange: (data: DimensionFormData) => void;
  onSubmit: () => void;
  onClose: () => void;
  loading: boolean;
}

const AddDimensionModal: React.FC<AddDimensionModalProps> = ({
  formData,
  onFormDataChange,
  onSubmit,
  onClose,
  loading
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">添加尺寸</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  宽度 (mm) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.width}
                  onChange={(e) => onFormDataChange({ ...formData, width: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入宽度"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  高度 (mm) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.height}
                  onChange={(e) => onFormDataChange({ ...formData, height: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入高度"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数量 *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.quantity}
                onChange={(e) => onFormDataChange({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入数量"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                placeholder="可选的备注信息"
              />
            </div>

            {formData.width && formData.height && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>规格预览:</strong> {formData.width}×{formData.height}mm
                  {formData.width && formData.height && (
                    <span className="ml-2">
                      (面积: {(parseFloat(formData.width) * parseFloat(formData.height)).toLocaleString()}mm²)
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>添加中...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4" />
                    <span>添加尺寸</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 转移模态框
interface TransferModalProps {
  availableWorkers: any[];
  transferTarget: string;
  transferQuantity: string;
  onTransferTargetChange: (target: string) => void;
  onTransferQuantityChange: (quantity: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  loading: boolean;
  selectedCount: number;
}

const TransferModal: React.FC<TransferModalProps> = ({
  availableWorkers,
  transferTarget,
  transferQuantity,
  onTransferTargetChange,
  onTransferQuantityChange,
  onSubmit,
  onClose,
  loading,
  selectedCount
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">转移材料</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                将转移 {selectedCount} 个选中的尺寸记录
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                转移到工人 *
              </label>
              <select
                required
                value={transferTarget}
                onChange={(e) => onTransferTargetChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">请选择工人</option>
                {availableWorkers.map(worker => (
                  <option key={worker.id} value={worker.id.toString()}>
                    {worker.name} - {worker.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                转移数量 *
              </label>
              <input
                type="number"
                required
                min="1"
                value={transferQuantity}
                onChange={(e) => onTransferQuantityChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入转移数量"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>转移中...</span>
                  </>
                ) : (
                  <>
                    <ArrowsRightLeftIcon className="w-4 h-4" />
                    <span>确认转移</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DimensionManagerV2;
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Badge, Loading, useDialog } from '@/components/ui';
import { materialToastHelper } from '@/utils/materialToastHelper';
import { batchOperationToastHelper, useBatchOperationTracker } from '@/utils/batchOperationToastHelper';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { apiRequest } from '@/utils/api';
import { AddMaterialModal } from './AddMaterialModal';
import { BatchAddMaterialModal } from './BatchAddMaterialModal';
import { ExpandableMaterialCell } from './ExpandableMaterialCell';
import { DimensionManagerV2 } from './DimensionManagerV2';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { OperationHistory } from '@/components/materials/OperationHistory';

interface ThicknessSpec {
  id: number;
  key: string;
  materialType: string;
  thickness: string;
  unit: string;
  code: string;
  label: string;
  sortOrder?: number;
}

interface MaterialDimension {
  id: number;
  width: string;
  height: string;
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
  activeTab?: 'inventory' | 'workers';
}

type MaterialTabType = 'inventory' | 'records';

export const MaterialInventoryManagerNew: React.FC<MaterialInventoryManagerNewProps> = ({
  className = '',
  materialTypeFilter = 'all',
  workerIdFilter = null,
  thicknessFilter = 'all',
  activeTab = 'inventory'
}) => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchAddModal, setShowBatchAddModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerMaterial | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDimensionManager, setShowDimensionManager] = useState(false);
  const [showOnlyWithStock, setShowOnlyWithStock] = useState(true);
  const [currentTab, setCurrentTab] = useState<MaterialTabType>('inventory');
  const [selectedMaterial, setSelectedMaterial] = useState<{
    workerMaterialId: number;
    materialData: MaterialData;
    workerName: string;
    materialType: string;
    thickness: string;
  } | null>(null);
  
  // 批量操作相关状态
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  
  const { token } = useAuth();
  const { confirm, DialogRenderer } = useDialog();
  const { isMobile, isTablet } = useResponsive();
  const { createTracker } = useBatchOperationTracker();

  // 用于同步滚动的refs
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bodyScrollRef = React.useRef<HTMLDivElement>(null);

  // 同步滚动处理
  const handleTopScroll = () => {
    if (topScrollRef.current && bodyScrollRef.current) {
      const scrollLeft = topScrollRef.current.scrollLeft;
      bodyScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleBodyScroll = () => {
    if (bodyScrollRef.current && topScrollRef.current) {
      const scrollLeft = bodyScrollRef.current.scrollLeft;
      topScrollRef.current.scrollLeft = scrollLeft;
    }
  };

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
      } else {
        console.error('API请求失败:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      // 获取数据失败
    } finally {
      setLoading(false);
    }
  };

  // 静默获取数据 - 不显示loading状态，不影响UI渲染
  const fetchDataSilently = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/worker-materials', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result: ApiResponse = await response.json();
        setData(result);
        console.log('📊 静默更新板材库存数据成功');
      } else {
        console.log('❌ 静默更新失败:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ 静默更新异常:', error);
      // 静默更新失败时不设置error或loading状态，避免影响UI
    }
    // 注意：静默更新不改变loading状态
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    // 监听刷新事件 - 使用静默更新避免闪烁
    const handleRefresh = () => {
      // 如果尺寸管理器正在显示，暂停数据更新以避免闪烁
      if (showDimensionManager) {
        console.log('📊 尺寸管理器正在显示，跳过数据更新避免闪烁');
        return;
      }
      
      fetchDataSilently(); // 只在非尺寸管理模式下更新
    };

    window.addEventListener('refresh-materials', handleRefresh);
    window.addEventListener('materials-updated', handleRefresh);
    window.addEventListener('worker-materials-updated', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-materials', handleRefresh);
      window.removeEventListener('materials-updated', handleRefresh);
      window.removeEventListener('worker-materials-updated', handleRefresh);
    };
  }, [showDimensionManager]); // 依赖showDimensionManager状态

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

  // 处理尺寸管理更新 - 现在通过事件系统处理，这里留空避免重复更新
  const handleDimensionUpdate = () => {
    // 不需要做任何事，事件系统已经处理了更新
    console.log('📊 尺寸管理更新回调（通过事件系统处理）');
  };

  // 关闭尺寸管理器
  const closeDimensionManager = () => {
    setShowDimensionManager(false);
    setSelectedMaterial(null);
    
    // 关闭尺寸管理器后，立即进行一次静默更新以获取最新数据
    setTimeout(() => {
      fetchDataSilently();
      console.log('📊 尺寸管理器已关闭，更新板材库存数据');
    }, 100); // 延迟一点点确保状态已经更新
  };

  // 批量操作相关函数
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedItems(new Set());
  };

  const handleSelectItem = (itemKey: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemKey)) {
      newSelected.delete(itemKey);
    } else {
      newSelected.add(itemKey);
    }
    setSelectedItems(newSelected);
  };

  const selectAllItems = () => {
    const allItems = new Set<string>();
    filteredWorkers.forEach(worker => {
      filteredThicknessSpecs.forEach(spec => {
        const materialData = worker.materials[spec.key];
        if (materialData && materialData.quantity > 0) {
          allItems.add(`${worker.workerId}_${spec.key}`);
        }
      });
    });
    setSelectedItems(allItems);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // 批量更新材料状态
  const handleBatchStatusUpdate = async (newStatus: string) => {
    if (selectedItems.size === 0) {
      materialToastHelper.error('请先选择要操作的材料');
      return;
    }

    const confirmed = await confirm(
      `确定要将 ${selectedItems.size} 个材料的状态更新为 "${newStatus}" 吗？`,
      { title: '批量状态更新' }
    );

    if (!confirmed) return;

    setBatchLoading(true);
    const tracker = createTracker('批量更新材料状态', selectedItems.size, 'material-batch');
    
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const itemKey of selectedItems) {
        try {
          const [workerId, materialKey] = itemKey.split('_', 2);
          const worker = data?.workers.find(w => w.workerId === parseInt(workerId));
          const materialData = worker?.materials[materialKey];
          
          if (materialData?.id) {
            const response = await apiRequest(`/api/worker-materials/${materialData.id}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
              successCount++;
            } else {
              failedCount++;
              tracker.addError(`材料 ${materialKey} 更新失败`);
            }
          } else {
            failedCount++;
            tracker.addError(`材料 ${materialKey} 未找到ID`);
          }
          
          tracker.updateProgress(`${worker?.workerName} - ${materialKey}`);
        } catch (error) {
          failedCount++;
          tracker.addError(`处理 ${itemKey} 时出错: ${error}`);
        }
      }

      tracker.complete();
      materialToastHelper.batchOperationComplete(
        `批量更新状态完成：成功 ${successCount} 个，共 ${selectedItems.size} 个材料，状态为 "${newStatus}"`
      );
      
      if (successCount > 0) {
        await fetchData();
        setBatchMode(false);
        setSelectedItems(new Set());
      }
    } catch (error) {
      tracker.fail(`批量操作失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // 批量材料调拨
  const handleBatchTransfer = async (fromWorker: string, toWorker: string) => {
    if (selectedItems.size === 0) {
      materialToastHelper.error('请先选择要操作的材料');
      return;
    }

    const confirmed = await confirm(
      `确定要将 ${selectedItems.size} 个材料从 ${fromWorker} 调拨给 ${toWorker} 吗？`,
      { title: '批量材料调拨' }
    );

    if (!confirmed) return;

    setBatchLoading(true);
    const tracker = createTracker('批量材料调拨', selectedItems.size, 'material-batch');
    
    let successCount = 0;

    try {
      for (const itemKey of selectedItems) {
        try {
          // 这里需要根据实际API调用调拨接口
          // 暂时模拟
          successCount++;
          tracker.updateProgress(itemKey);
        } catch (error) {
          tracker.addError(`调拨 ${itemKey} 时出错: ${error}`);
        }
      }

      tracker.complete();
      materialToastHelper.batchOperationComplete(
        `批量调拨完成：成功调拨 ${successCount} 个材料从 ${fromWorker} 到 ${toWorker}`
      );
      
      if (successCount > 0) {
        await fetchData();
        setBatchMode(false);
        setSelectedItems(new Set());
      }
    } catch (error) {
      tracker.fail(`批量调拨失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // 批量添加库存
  const handleBatchAddStock = async (quantity: number) => {
    if (selectedItems.size === 0) {
      materialToastHelper.error('请先选择要操作的材料');
      return;
    }

    const confirmed = await confirm(
      `确定要为 ${selectedItems.size} 个材料各增加 ${quantity} 张库存吗？`,
      { title: '批量添加库存' }
    );

    if (!confirmed) return;

    setBatchLoading(true);
    const tracker = createTracker('批量添加库存', selectedItems.size, 'material-batch');
    
    let successCount = 0;
    const materialTypes = new Set<string>();

    try {
      for (const itemKey of selectedItems) {
        try {
          const [workerId, materialKey] = itemKey.split('_', 2);
          const worker = data?.workers.find(w => w.workerId === parseInt(workerId));
          const materialData = worker?.materials[materialKey];
          const [materialType] = materialKey.split('_');
          materialTypes.add(materialType);
          
          if (materialData?.id) {
            const response = await apiRequest(`/api/worker-materials/${materialData.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ 
                quantity: materialData.quantity + quantity
              })
            });

            if (response.ok) {
              successCount++;
            } else {
              tracker.addError(`材料 ${materialKey} 库存增加失败`);
            }
          } else {
            tracker.addError(`材料 ${materialKey} 未找到ID`);
          }
          
          tracker.updateProgress(`${worker?.workerName} - ${materialKey}`);
        } catch (error) {
          tracker.addError(`处理 ${itemKey} 时出错: ${error}`);
        }
      }

      tracker.complete();
      materialToastHelper.batchOperationComplete(
        `批量添加库存完成：成功增加 ${successCount} 个材料的库存`
      );
      
      if (successCount > 0) {
        await fetchData();
        setBatchMode(false);
        setSelectedItems(new Set());
      }
    } catch (error) {
      tracker.fail(`批量添加库存失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Loading type="spinner" size="lg" />
      </div>
    );
  }

  // 筛选工人
  const filteredWorkers = (data?.workers || []).filter(worker => {
    // 搜索筛选
    const matchesSearch = worker.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // 工人ID筛选
    if (workerIdFilter && worker.workerId !== workerIdFilter) {
      return false;
    }

    // 如果启用"仅显示有库存"，检查该工人是否有任何库存
    if (showOnlyWithStock) {
      if (!worker.materials) {
        return false;
      }
      
      const hasAnyStock = Object.values(worker.materials).some(material => {
        return material && material.quantity > 0;
      });
      if (!hasAnyStock) return false;
    }

    return true;
  });

  // 筛选材料类型列
  const filteredThicknessSpecs = (data?.thicknessSpecs || [])
    .map(spec => ({
      ...spec,
      // 确保key字段存在，如果没有则根据材料类型和厚度生成
      key: spec.key || `${spec.materialType}_${parseFloat(spec.thickness).toFixed(2)}mm`
    }))
    .sort((a, b) => {
      // 首先按 sortOrder 排序，如果没有 sortOrder 则按材料类型和厚度排序
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      
      // 备用排序逻辑：材料类型 + 厚度
      const materialOrder: { [key: string]: number } = { '碳板': 1, '锰板': 2, '不锈钢': 3 };
      const aOrder = materialOrder[a.materialType] || 999;
      const bOrder = materialOrder[b.materialType] || 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      return parseFloat(a.thickness) - parseFloat(b.thickness);
    })
    .filter(spec => {
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

    // 如果启用"仅显示有库存"，检查是否有工人有这种材料的库存
    if (showOnlyWithStock) {
      const hasInventory = (data?.workers || []).some(worker => {
        // 需要检查该工人是否符合筛选条件
        const matchesSearch = worker.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          worker.department.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        
        if (workerIdFilter && worker.workerId !== workerIdFilter) {
          return false;
        }
        
        const materialData = worker.materials?.[spec.key];
        return materialData && materialData.quantity > 0;
      });
      
      if (!hasInventory) return false;
    }

    return true;
  })
  // 确保key唯一性，去除重复的材料规格
  .filter((spec, index, arr) => {
    return arr.findIndex(s => s.key === spec.key) === index;
  });

  // 筛选结果统计
  const getStockStats = () => {
    let totalStockCount = 0;
    let workersWithStock = 0;
    let emptyWorkers = 0;

    (data?.workers || []).forEach(worker => {
      const workerTotalStock = Object.values(worker.materials || {}).reduce((sum, material) => sum + (material?.quantity || 0), 0);
      totalStockCount += workerTotalStock;
      
      if (workerTotalStock > 0) {
        workersWithStock++;
      } else {
        emptyWorkers++;
      }
    });

    return {
      totalStockCount,
      workersWithStock,
      emptyWorkers,
      totalWorkers: data?.workers?.length || 0,
      filteredWorkers: filteredWorkers.length,
      filteredSpecs: filteredThicknessSpecs.length
    };
  };

  const stats = getStockStats();


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
            
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowBatchAddModal(true)}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              批量添加
            </Button>
            
            <Button 
              variant={batchMode ? "outline" : "secondary"}
              size="sm"
              onClick={toggleBatchMode}
              disabled={batchLoading}
            >
              {batchMode ? '退出批量' : '批量操作'}
            </Button>
          </div>
        </div>

        {/* 搜索栏和筛选控制 */}
        <div className="space-y-4">
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
            
            {/* 视图切换控制 */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowOnlyWithStock(!showOnlyWithStock)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${showOnlyWithStock 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }
                `}
              >
                {showOnlyWithStock ? (
                  <EyeIcon className="w-4 h-4" />
                ) : (
                  <EyeSlashIcon className="w-4 h-4" />
                )}
                <span>{showOnlyWithStock ? '仅有库存' : '显示全部'}</span>
              </button>
              
              <Badge variant="secondary">
                显示 {stats.filteredWorkers} / {stats.totalWorkers} 工人
              </Badge>
            </div>
          </div>
          
          {/* 库存统计概览 */}
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <span>总库存:</span>
              <span className="font-semibold text-blue-600">{stats.totalStockCount} 张</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>有库存工人:</span>
              <span className="font-semibold text-green-600">{stats.workersWithStock} 人</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>无库存工人:</span>
              <span className="font-semibold text-gray-500">{stats.emptyWorkers} 人</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>显示厚度规格:</span>
              <span className="font-semibold text-purple-600">{stats.filteredSpecs} 种</span>
            </div>
          </div>

          {/* 批量操作控制面板 */}
          {batchMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-900">
                    已选择 {selectedItems.size} 个材料
                  </span>
                  {selectedItems.size > 0 && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchStatusUpdate('completed')}
                        disabled={batchLoading}
                      >
                        标记完成
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchAddStock(10)}
                        disabled={batchLoading}
                      >
                        增加库存 (+10)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                        disabled={batchLoading}
                      >
                        清除选择
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllItems}
                    disabled={batchLoading}
                  >
                    全选
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    disabled={batchLoading}
                  >
                    全不选
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* 标签导航 */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <nav className="px-6 -mb-px flex space-x-8">
          <button
            onClick={() => setCurrentTab('inventory')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              currentTab === 'inventory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <EyeIcon className="w-4 h-4" />
              <span>库存管理</span>
            </div>
          </button>
          <button
            onClick={() => setCurrentTab('records')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              currentTab === 'records'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ClipboardDocumentListIcon className="w-4 h-4" />
              <span>操作记录</span>
            </div>
          </button>
        </nav>
      </div>

      {/* 内容区域 */}
      {currentTab === 'inventory' ? (
        <>
          {/* 表格内容 */}
          <div className="flex-1 flex flex-col p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          {/* 固定的顶部水平滚动条 */}
          <div className="flex-shrink-0 bg-gray-50 border-b border-gray-100">
            <div 
              ref={topScrollRef}
              className="overflow-x-auto" 
              onScroll={handleTopScroll}
            >
              <div style={{ 
                width: `${(isMobile ? 100 : 200) + (filteredThicknessSpecs.length * 120) + 100}px`, 
                height: '12px' 
              }}></div>
            </div>
          </div>
          
          {/* 表格容器 */}
          <div 
            ref={bodyScrollRef}
            className="flex-1 overflow-auto"
            onScroll={handleBodyScroll}
          >
            <table className="w-full">
              {/* 固定表头 */}
              <thead className="bg-gradient-to-r from-gray-50 via-gray-50/80 to-gray-50/60 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  {batchMode && (
                    <th key="batch-select" className="py-3 px-4 text-center text-sm font-semibold text-gray-800 sticky left-0 bg-gray-50 z-20 min-w-[50px]">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllItems();
                          } else {
                            clearSelection();
                          }
                        }}
                        checked={selectedItems.size > 0 && selectedItems.size === filteredWorkers.reduce((count, worker) => {
                          return count + filteredThicknessSpecs.reduce((specCount, spec) => {
                            const materialData = worker.materials[spec.key];
                            return specCount + (materialData && materialData.quantity > 0 ? 1 : 0);
                          }, 0);
                        }, 0)}
                        className="rounded border-gray-300"
                      />
                    </th>
                  )}
                  <th key="worker-info" className={`py-3 px-4 text-left text-sm font-semibold text-gray-800 sticky ${batchMode ? 'left-[50px]' : 'left-0'} bg-gray-50 z-20 ${
                    isMobile ? 'min-w-[100px]' : 'min-w-[200px]'
                  }`}>
                    {isMobile ? '工人' : '工人信息'}
                  </th>
                  {filteredThicknessSpecs.map((spec) => (
                    <th key={spec.key} className="py-3 px-4 text-center text-sm font-semibold text-gray-800 min-w-[120px]">
                      {spec.code?.replace(/\.?0+$/, '') || spec.key}
                    </th>
                  ))}
                  <th key="operations" className="py-3 px-4 text-center text-sm font-semibold text-gray-800 min-w-[100px]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={filteredThicknessSpecs.length + 2} className="py-12 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          {showOnlyWithStock ? (
                            <EyeSlashIcon className="w-8 h-8 text-gray-400" />
                          ) : (
                            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <div className="text-gray-500">
                          <p className="font-medium">
                            {showOnlyWithStock ? '暂无工人有库存' : '未找到匹配的工人'}
                          </p>
                          <p className="text-sm mt-1">
                            {showOnlyWithStock 
                              ? '尝试切换到"显示全部"模式查看所有工人'
                              : '尝试调整搜索条件或切换筛选模式'
                            }
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((worker, index) => (
                    <motion.tr
                      key={worker.workerId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'
                      }`}
                    >
                    {/* 批量选择列 */}
                    {batchMode && (
                      <td key="batch-cell" className="py-3 px-4 text-center sticky left-0 bg-white border-r border-gray-100 z-10">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(`${worker.workerId}_${filteredThicknessSpecs.find(spec => worker.materials[spec.key]?.quantity > 0)?.key}`)}
                          onChange={() => {
                            // 批量选择逻辑，可以扩展为选择该工人的所有材料
                            const workerMaterialKeys = filteredThicknessSpecs
                              .filter(spec => worker.materials[spec.key]?.quantity > 0)
                              .map(spec => `${worker.workerId}_${spec.key}`);
                            
                            const newSelected = new Set(selectedItems);
                            const hasAnySelected = workerMaterialKeys.some(key => newSelected.has(key));
                            
                            if (hasAnySelected) {
                              // 如果有任意选中，则取消全部选中
                              workerMaterialKeys.forEach(key => newSelected.delete(key));
                            } else {
                              // 如果都没选中，则全部选中
                              workerMaterialKeys.forEach(key => newSelected.add(key));
                            }
                            
                            setSelectedItems(newSelected);
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    {/* 工人信息列 */}
                    <td className={`py-3 px-4 sticky ${batchMode ? 'left-[50px]' : 'left-0'} bg-white border-r border-gray-100 z-10 ${
                      isMobile ? 'min-w-[100px]' : 'min-w-[200px]'
                    }`}>
                      {isMobile ? (
                        // 移动端紧凑显示：只显示工人名字和头像
                        <div className="flex flex-col items-center space-y-1">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xs shadow-md">
                            {worker.workerName.charAt(0)}
                          </div>
                          <div className="text-xs font-semibold text-gray-900 text-center truncate w-full">
                            {worker.workerName}
                          </div>
                        </div>
                      ) : (
                        // 桌面端完整显示
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
                      )}
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
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      ) : (
        <div className="flex-1 p-6">
          <OperationHistory />
        </div>
      )}

      {/* 添加板材弹窗 */}
      <AddMaterialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchData}
      />

      {/* 批量添加板材弹窗 */}
      <BatchAddMaterialModal
        isOpen={showBatchAddModal}
        onClose={() => setShowBatchAddModal(false)}
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
        <DimensionManagerV2
          key={`dimension-manager-${selectedMaterial.workerMaterialId}`} // 添加固定key避免重新挂载
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
      // 获取当前材料信息用于Toast显示
      const currentMaterial = materialList.find(m => m.id === materialId);
      const materialTypeText = currentMaterial 
        ? `${currentMaterial.thickness}${currentMaterial.unit}${currentMaterial.materialType}`
        : '未知材料';
      const oldQuantity = currentMaterial?.quantity || 0;
      
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
        // 根据数量变化触发相应Toast
        if (newQuantity > oldQuantity) {
          // 库存增加
          const addedQuantity = newQuantity - oldQuantity;
          materialToastHelper.stockAdded(worker.workerName, materialTypeText, addedQuantity);
        } else if (newQuantity < oldQuantity) {
          // 库存减少（转移或消耗）
          const reducedQuantity = oldQuantity - newQuantity;
          if (newQuantity === 0) {
            // 库存清零
            materialToastHelper.materialRecycled(materialTypeText);
          } else {
            // 部分转移或消耗
            materialToastHelper.materialTransferred(materialTypeText, reducedQuantity, worker.workerName, '其他位置');
          }
        }
        
        // 重新获取数据
        await fetchWorkerMaterials();
        onSuccess();
        // 触发全局事件通知其他组件
        window.dispatchEvent(new CustomEvent('materials-updated'));
      }
    } catch (error) {
      // Toast错误提示
      materialToastHelper.error('更新板材数量失败：' + (error instanceof Error ? error.message : '未知错误'));
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
      // 获取要删除的材料信息用于Toast显示
      const currentMaterial = materialList.find(m => m.id === materialId);
      const materialTypeText = currentMaterial 
        ? `${currentMaterial.thickness}${currentMaterial.unit}${currentMaterial.materialType}`
        : materialLabel;
      const deletedQuantity = currentMaterial?.quantity || 0;
      
      const response = await apiRequest(`/api/worker-materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // 显示删除成功Toast
        materialToastHelper.materialRecycled(materialTypeText);
        
        // 立即从本地状态中移除已删除的项
        setMaterialList(prev => prev.filter(item => item.id !== materialId));
        // 重新获取数据以确保同步
        await fetchWorkerMaterials();
        onSuccess();
        // 触发全局事件通知其他组件
        window.dispatchEvent(new CustomEvent('materials-updated'));
      } else if (response.status === 404) {
        // 记录已经不存在，显示提示但继续清理
        materialToastHelper.error('要删除的板材记录不存在，已自动同步数据');
        setMaterialList(prev => prev.filter(item => item.id !== materialId));
        await fetchWorkerMaterials();
        onSuccess();
        // 触发全局事件通知其他组件
        window.dispatchEvent(new CustomEvent('materials-updated'));
      }
    } catch (error) {
      // 显示删除失败Toast
      materialToastHelper.error('删除板材失败：' + (error instanceof Error ? error.message : '未知错误'));
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

export const MaterialInventoryManager = MaterialInventoryManagerNew;
export default MaterialInventoryManagerNew;
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { 
  CubeIcon, 
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { 
  Card, 
  Button, 
  Badge, 
  Input, 
  Select, 
  Loading, 
  useToast,
  ResponsiveContainer,
  AdaptiveLayout 
} from '@/components/ui';

interface MaterialInventoryManagerProps {
  materialTypeFilter?: string;
  workerIdFilter?: number | null;
  thicknessFilter?: string;
  activeTab?: 'inventory' | 'workers';
  className?: string;
}

export const MaterialInventoryManager: React.FC<MaterialInventoryManagerProps> = ({
  materialTypeFilter = 'all',
  workerIdFilter = null,
  thicknessFilter = 'all',
  activeTab = 'inventory',
  className = ''
}) => {
  const [loading, setLoading] = useState(true);
  const [materialsData, setMaterialsData] = useState<any>(null);
  const [filteredMaterialsData, setFilteredMaterialsData] = useState<any>(null);
  const [workersData, setWorkersData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [localFilters, setLocalFilters] = useState({
    materialType: materialTypeFilter,
    workerId: workerIdFilter,
    thickness: thicknessFilter
  });

  const { token } = useAuth();
  const toast = useToast();

  // 筛选数据的函数
  const applyFilters = (data: any) => {
    if (!data || !data.workers) return data;

    let filteredWorkers = [...data.workers];

    // 按工人ID筛选
    if (localFilters.workerId) {
      filteredWorkers = filteredWorkers.filter(w => w.workerId === localFilters.workerId);
    }

    // 按材料类型筛选
    if (localFilters.materialType !== 'all') {
      filteredWorkers = filteredWorkers.map(worker => {
        const filteredMaterials: any = {};
        Object.entries(worker.materials || {}).forEach(([key, material]: [string, any]) => {
          if (key.startsWith(localFilters.materialType + '_')) {
            filteredMaterials[key] = material;
          }
        });
        return { ...worker, materials: filteredMaterials };
      }).filter(worker => Object.keys(worker.materials).length > 0);
    }

    // 按厚度筛选
    if (localFilters.thickness !== 'all') {
      const [materialType, thickness] = localFilters.thickness.split('_');
      filteredWorkers = filteredWorkers.map(worker => {
        const filteredMaterials: any = {};
        Object.entries(worker.materials || {}).forEach(([key, material]: [string, any]) => {
          if (key === localFilters.thickness) {
            filteredMaterials[key] = material;
          }
        });
        return { ...worker, materials: filteredMaterials };
      }).filter(worker => Object.keys(worker.materials).length > 0);
    }

    return { ...data, workers: filteredWorkers };
  };

  // 获取材料库存数据
  const fetchMaterialsData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await apiRequest('/api/worker-materials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMaterialsData(data);
        
        // 处理筛选后的数据显示
        const filteredData = applyFilters(data);
        setFilteredMaterialsData(filteredData);
      } else {
        toast.addToast({ type: 'error', message: '获取材料数据失败' });
      }
    } catch (error) {
      console.error('获取材料数据失败:', error);
      toast.addToast({ type: 'error', message: '获取材料数据失败' });
    } finally {
      setLoading(false);
    }
  };

  // 获取工人数据
  const fetchWorkersData = async () => {
    if (!token) return;

    try {
      const response = await apiRequest('/api/workers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkersData(data.workers || []);
      }
    } catch (error) {
      console.error('获取工人数据失败:', error);
    }
  };

  useEffect(() => {
    fetchMaterialsData();
    fetchWorkersData();

    // 监听刷新事件
    const handleRefresh = () => {
      fetchMaterialsData();
      fetchWorkersData();
    };

    window.addEventListener('refresh-materials', handleRefresh);
    return () => window.removeEventListener('refresh-materials', handleRefresh);
  }, [token]);

  // 更新本地筛选器
  useEffect(() => {
    setLocalFilters({
      materialType: materialTypeFilter,
      workerId: workerIdFilter,
      thickness: thicknessFilter
    });

    // 重新应用筛选
    if (materialsData) {
      const filteredData = applyFilters(materialsData);
      setFilteredMaterialsData(filteredData);
    }
  }, [materialTypeFilter, workerIdFilter, thicknessFilter, materialsData]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Loading type="spinner" size="lg" />
      </div>
    );
  }

  const renderInventoryView = () => (
    <div className="space-y-6">
      {/* 材料库存概览 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CubeIcon className="w-5 h-5" />
            材料库存概览
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                fetchMaterialsData();
                fetchWorkersData();
              }}
            >
              刷新数据
            </Button>
          </div>
        </div>

        {/* 筛选条件显示 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">当前筛选:</span>
            <Badge variant={localFilters.materialType === 'all' ? 'outline' : 'primary'}>
              {localFilters.materialType === 'all' ? '全部类型' : localFilters.materialType}
            </Badge>
            <Badge variant={localFilters.workerId ? 'primary' : 'outline'}>
              {localFilters.workerId 
                ? `工人ID: ${localFilters.workerId}` 
                : '全部工人'
              }
            </Badge>
            <Badge variant={localFilters.thickness === 'all' ? 'outline' : 'primary'}>
              {localFilters.thickness === 'all' ? '全部厚度' : localFilters.thickness}
            </Badge>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">总库存</p>
                <p className="text-2xl font-bold text-blue-900">
                  {materialsData?.workers?.reduce((total: number, worker: any) => {
                    return total + Object.values(worker.materials || {}).reduce((sum: number, material: any) => sum + (material.quantity || 0), 0);
                  }, 0) || 0}张
                </p>
              </div>
              <CubeIcon className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">工人数量</p>
                <p className="text-2xl font-bold text-green-900">
                  {materialsData?.workers?.length || 0}
                </p>
              </div>
              <UserGroupIcon className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">材料类型</p>
                <p className="text-2xl font-bold text-orange-900">
                  {materialsData?.thicknessSpecs?.reduce((types: Set<string>, spec: any) => {
                    if (spec.materialType) types.add(spec.materialType);
                    return types;
                  }, new Set()).size || 0}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">低库存警告</p>
                <p className="text-2xl font-bold text-red-900">
                  {materialsData?.workers?.reduce((warnings: number, worker: any) => {
                    return warnings + Object.values(worker.materials || {}).filter((material: any) => 
                      material.quantity > 0 && material.quantity < 5
                    ).length;
                  }, 0) || 0}
                </p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>
      </Card>

      {/* 材料列表表格 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            材料详细列表
          </h3>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="搜索材料..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
              className="w-64"
            />
          </div>
        </div>

        {/* 实际数据表格 */}
        {filteredMaterialsData?.workers && filteredMaterialsData.workers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">部门</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">材料类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">厚度</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">库存数量</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">尺寸规格</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMaterialsData.workers
                  .filter((worker: any) => 
                    !searchQuery || 
                    worker.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    worker.department.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((worker: any) => (
                  Object.entries(worker.materials || {}).map(([materialKey, material]: [string, any]) => {
                    const [materialType, thickness] = materialKey.split('_');
                    const thicknessValue = thickness.replace('mm', '');
                    
                    return (
                      <tr key={`${worker.workerId}-${materialKey}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {worker.workerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {worker.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={materialType === '碳板' ? 'primary' : 'secondary'}>
                            {materialType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {thicknessValue}mm
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={material.quantity > 0 ? 'primary' : 'outline'}>
                            {material.quantity}张
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {material.dimensions && material.dimensions.length > 0 ? (
                            <div className="space-y-1">
                              {material.dimensions.slice(0, 2).map((dim: any, index: number) => (
                                <div key={index} className="text-xs">
                                  {dim.width}×{dim.length}mm ({dim.quantity}张)
                                </div>
                              ))}
                              {material.dimensions.length > 2 && (
                                <div className="text-xs text-gray-400">
                                  +{material.dimensions.length - 2}种规格...
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">无详细规格</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )).flat()}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <CubeIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">
              {localFilters.materialType !== 'all' || localFilters.workerId || localFilters.thickness !== 'all'
                ? '无符合筛选条件的材料'
                : '暂无材料库存数据'
              }
            </h3>
            <p className="text-sm mb-4">
              {localFilters.materialType !== 'all' || localFilters.workerId || localFilters.thickness !== 'all'
                ? '请调整筛选条件或通过左侧边栏查看其他材料'
                : '库存数据将在工人分配材料后显示'
              }
            </p>
            <div className="text-xs text-gray-400">
              <p>• 材料类型筛选: {localFilters.materialType}</p>
              <p>• 工人筛选: {localFilters.workerId || '全部'}</p>
              <p>• 厚度筛选: {localFilters.thickness}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderWorkersView = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5" />
            工人管理
          </h2>
        </div>

        <div className="text-center py-12 text-gray-500">
          <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">工人管理</h3>
          <p className="text-sm mb-4">
            工人信息可以通过左侧边栏的"工人管理"标签页进行管理。
          </p>
          <p className="text-xs text-gray-400">
            共有 {workersData?.length || 0} 名工人
          </p>
        </div>
      </Card>
    </div>
  );

  return (
    <ResponsiveContainer className={`h-full bg-gray-50 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 h-full overflow-y-auto"
      >
        <AdaptiveLayout direction="column" gap="lg" className="h-full">
          {activeTab === 'inventory' ? renderInventoryView() : renderWorkersView()}
        </AdaptiveLayout>
      </motion.div>
    </ResponsiveContainer>
  );
};

export default MaterialInventoryManager;
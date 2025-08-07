'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button, Badge, Input, Loading, Modal } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { TabNavigation } from './TabNavigation';
import { DepartmentSelector } from './DepartmentSelector';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

interface MaterialsSidebarProps {
  activeTab?: 'inventory' | 'workers';
  onTabChange?: (tab: 'inventory' | 'workers') => void;
  onMaterialTypeFilter?: (materialType: string) => void;
  onWorkerFilter?: (workerId: number | null) => void;
  onThicknessFilter?: (thickness: string) => void;
  onRefresh?: () => void;
  className?: string;
}

interface MaterialSummary {
  materialType: string;
  code: string;
  totalQuantity: number;
  workerCount: number;
  lowStockCount: number;
  priority: 'primary' | 'secondary';
  thicknessStats: ThicknessStats[];
}

interface ThicknessStats {
  thickness: string;
  materialType: string;
  totalQuantity: number;
  workerCount: number;
  isMainMaterial: boolean;
}

interface WorkerSummary {
  id: number;
  name: string;
  department: string;
  materialCount: number;
  totalQuantity: number;
}

export const MaterialsSidebar: React.FC<MaterialsSidebarProps> = ({
  activeTab = 'inventory',
  onTabChange,
  onMaterialTypeFilter,
  onWorkerFilter,
  onThicknessFilter,
  onRefresh,
  className = ''
}) => {
  const [materialSummary, setMaterialSummary] = useState<MaterialSummary[]>([]);
  const [workerSummary, setWorkerSummary] = useState<WorkerSummary[]>([]);
  const [allWorkers, setAllWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('all');
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [selectedThickness, setSelectedThickness] = useState<string>('all');
  const [showCarbonDetails, setShowCarbonDetails] = useState(true);
  const [showSpecialMaterials, setShowSpecialMaterials] = useState(false);

  const { token } = useAuth();

  // 获取材料汇总数据
  const fetchMaterialSummary = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await apiRequest('/api/worker-materials', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // 处理材料类型汇总
        const materialTypeMap = new Map<string, {
          totalQuantity: number;
          workerCount: number;
          lowStockCount: number;
          thicknessMap: Map<string, { quantity: number; workerCount: number }>;
        }>();

        // 处理工人汇总
        const workerSummaries: WorkerSummary[] = [];

        data.workers?.forEach((worker: any) => {
          let workerTotalQuantity = 0;
          let workerMaterialCount = 0;

          Object.entries(worker.materials || {}).forEach(([key, materialData]: [string, any]) => {
            const [materialType, thicknessStr] = key.split('_');
            const thickness = thicknessStr.replace('mm', '');
            const quantity = materialData.quantity || 0;
            
            if (quantity > 0) {
              workerTotalQuantity += quantity;
              workerMaterialCount++;

              // 更新材料类型汇总
              if (!materialTypeMap.has(materialType)) {
                materialTypeMap.set(materialType, {
                  totalQuantity: 0,
                  workerCount: 0,
                  lowStockCount: 0,
                  thicknessMap: new Map()
                });
              }
              
              const typeData = materialTypeMap.get(materialType)!;
              typeData.totalQuantity += quantity;
              typeData.workerCount++;
              
              // 低库存警告（少于5张）
              if (quantity < 5) {
                typeData.lowStockCount++;
              }

              // 更新厚度统计
              if (!typeData.thicknessMap.has(thickness)) {
                typeData.thicknessMap.set(thickness, { quantity: 0, workerCount: 0 });
              }
              const thicknessData = typeData.thicknessMap.get(thickness)!;
              thicknessData.quantity += quantity;
              thicknessData.workerCount++;
            }
          });

          // 显示所有工人，无论是否有库存
          workerSummaries.push({
            id: worker.workerId,
            name: worker.workerName,
            department: worker.department,
            materialCount: workerMaterialCount,
            totalQuantity: workerTotalQuantity
          });
        });

        // 转换材料类型汇总 - 只显示有库存的材料类型
        const materialSummaries: MaterialSummary[] = Array.from(materialTypeMap.entries())
          .filter(([materialType, data]) => data.totalQuantity > 0) // 只显示有库存的材料类型
          .map(([materialType, data]) => {
            const getMaterialCode = (type: string) => {
              const typeMap: { [key: string]: string } = {
                '碳板': 'T',
                '不锈钢': 'B',
                '锰板': 'M',
                '钢板': 'S'
              };
              return typeMap[type] || type.charAt(0).toUpperCase();
            };

            // 转换厚度统计
            const thicknessStats: ThicknessStats[] = Array.from(data.thicknessMap.entries())
              .map(([thickness, thicknessData]) => ({
                thickness,
                materialType,
                totalQuantity: thicknessData.quantity,
                workerCount: thicknessData.workerCount,
                isMainMaterial: materialType === '碳板'
              }))
              .sort((a, b) => parseFloat(a.thickness) - parseFloat(b.thickness)); // 按厚度排序

            return {
              materialType,
              code: getMaterialCode(materialType),
              totalQuantity: data.totalQuantity,
              workerCount: data.workerCount,
              lowStockCount: data.lowStockCount,
              priority: materialType === '碳板' ? 'primary' : 'secondary',
              thicknessStats
            };
          });

        // 设置材料汇总，碳板优先排序
        setMaterialSummary(materialSummaries.sort((a, b) => {
          // 碳板优先显示
          if (a.priority !== b.priority) {
            return a.priority === 'primary' ? -1 : 1;
          }
          // 同级别按数量排序
          return b.totalQuantity - a.totalQuantity;
        }));
        setWorkerSummary(workerSummaries.sort((a, b) => b.totalQuantity - a.totalQuantity));
      }
    } catch (error) {
      console.error('获取材料汇总失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取所有工人数据（用于工人管理Tab）
  const fetchAllWorkers = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/workers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllWorkers(data.workers || []);
      }
    } catch (error) {
      console.error('获取工人数据失败:', error);
    }
  };

  useEffect(() => {
    fetchMaterialSummary();
    fetchAllWorkers();
  }, [token]);

  // 处理材料类型筛选
  const handleMaterialTypeClick = (materialType: string) => {
    const newSelection = selectedMaterialType === materialType ? 'all' : materialType;
    setSelectedMaterialType(newSelection);
    onMaterialTypeFilter?.(newSelection);
  };

  // 处理厚度筛选
  const handleThicknessClick = (materialType: string, thickness: string) => {
    console.log('🔧 厚度点击事件:', { materialType, thickness });
    
    const thicknessKey = `${materialType}_${thickness}`;
    const newSelection = selectedThickness === thicknessKey ? 'all' : thicknessKey;
    
    console.log('🔄 厚度筛选状态变化:', { 
      当前选中: selectedThickness, 
      点击厚度: thicknessKey, 
      新选择: newSelection 
    });
    
    setSelectedThickness(newSelection);
    
    // 调用厚度筛选回调
    onThicknessFilter?.(newSelection);
    
    // 同时设置材料类型筛选
    if (newSelection !== 'all') {
      setSelectedMaterialType(materialType);
      onMaterialTypeFilter?.(materialType);
    } else {
      setSelectedMaterialType('all');
      onMaterialTypeFilter?.('all');
    }
  };

  // 处理工人筛选
  const handleWorkerClick = (workerId: number) => {
    const newSelection = selectedWorkerId === workerId ? null : workerId;
    setSelectedWorkerId(newSelection);
    onWorkerFilter?.(newSelection);
  };

  // 处理快速筛选
  const handleQuickFilter = (filter: 'carbon' | 'special' | 'all') => {
    // 根据快速筛选设置材料类型筛选
    switch (filter) {
      case 'carbon':
        setSelectedMaterialType('碳板');
        onMaterialTypeFilter?.('碳板');
        setShowCarbonDetails(true);
        setShowSpecialMaterials(false);
        break;
      case 'special':
        setSelectedMaterialType('all');
        onMaterialTypeFilter?.('all');
        setShowCarbonDetails(false);
        setShowSpecialMaterials(true);
        break;
      case 'all':
        setSelectedMaterialType('all');
        onMaterialTypeFilter?.('all');
        setShowCarbonDetails(true);
        setShowSpecialMaterials(true);
        break;
    }
  };

  // 计算Tab徽章数量
  const inventoryCount = materialSummary.reduce((sum, m) => sum + m.totalQuantity, 0);
  const workerCount = allWorkers.length;

  // 筛选工人列表
  const filteredWorkers = workerSummary.filter(worker =>
    worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    worker.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 处理Tab切换
  const handleTabChange = (tab: 'inventory' | 'workers') => {
    onTabChange?.(tab);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loading type="spinner" size="md" />
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-white ${className}`}>
      {/* 标题栏 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CubeIcon className="w-5 h-5 text-gray-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === 'inventory' ? '材料库存' : '工人管理'}
              </h2>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchMaterialSummary();
              fetchAllWorkers();
              onRefresh?.();
            }}
            title="刷新数据"
          >
            刷新
          </Button>
        </div>
      </div>

      {/* Tab导航 */}
      {onTabChange && (
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
          <div className="px-4 py-3">
            <TabNavigation
              activeTab={activeTab}
              onTabChange={handleTabChange}
              inventoryCount={inventoryCount}
              workerCount={workerCount}
            />
          </div>
        </div>
      )}

      {/* 搜索栏 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'inventory' ? "搜索材料或工人..." : "搜索工人或部门..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'inventory' ? (
          <div className="space-y-4">
            {/* 材料类型汇总 */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <ChartBarIcon className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-700">材料类型汇总</h3>
              </div>
              
              <div className="space-y-3">
                {/* 碳板区域 */}
                {materialSummary
                  .filter(material => material.priority === 'primary')
                  .map((material) => (
                    <div
                      key={material.materialType}
                      className="bg-blue-50 rounded-lg p-4 border border-blue-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <h4 className="font-semibold text-blue-900">
                            {material.code} - {material.materialType}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="primary">{material.totalQuantity}张</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCarbonDetails(!showCarbonDetails)}
                          >
                            {showCarbonDetails ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      {material.lowStockCount > 0 && (
                        <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded text-sm text-yellow-700 mb-3">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          <span>{material.lowStockCount} 项低库存警告</span>
                        </div>
                      )}
                      
                      {/* 厚度规格详情 */}
                      {showCarbonDetails && (
                        <div className="space-y-2">
                          {material.thicknessStats.map((thickness) => {
                            const thicknessKey = `${material.materialType}_${thickness.thickness}`;
                            const isSelected = selectedThickness === thicknessKey;
                            return (
                              <button
                                key={thickness.thickness}
                                onClick={() => handleThicknessClick(material.materialType, thickness.thickness)}
                                className={`w-full flex items-center justify-between p-3 rounded border text-left ${
                                  isSelected
                                    ? 'bg-white border-blue-400 ring-2 ring-blue-200'
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                  <span className="font-medium">{thickness.thickness}mm</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">{thickness.workerCount} 工人</span>
                                  <Badge variant={isSelected ? "primary" : "secondary"} size="sm">
                                    {thickness.totalQuantity}张
                                  </Badge>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                {/* 特殊材料区域 */}
                {materialSummary.filter(material => material.priority === 'secondary').length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <button
                      onClick={() => setShowSpecialMaterials(!showSpecialMaterials)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <h4 className="font-medium text-gray-800">特殊材料</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {materialSummary.filter(material => material.priority === 'secondary').length} 种类型
                        </Badge>
                        {showSpecialMaterials ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                      </div>
                    </button>
                    
                    {showSpecialMaterials && (
                      <div className="p-4 pt-0 space-y-2">
                        {materialSummary
                          .filter(material => material.priority === 'secondary')
                          .map((material) => (
                            <div
                              key={material.materialType}
                              onClick={() => handleMaterialTypeClick(material.materialType)}
                              className={`p-3 rounded border cursor-pointer ${
                                selectedMaterialType === material.materialType
                                  ? 'bg-gray-50 border-gray-400'
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                                  <span className="font-medium">{material.code}</span>
                                </div>
                                <Badge variant="secondary">{material.totalQuantity}张</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{material.materialType}</p>
                              {material.lowStockCount > 0 && (
                                <div className="flex items-center space-x-1 text-xs text-yellow-600">
                                  <ExclamationTriangleIcon className="w-3 h-3" />
                                  <span>{material.lowStockCount} 项低库存</span>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 工人列表 */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <UserGroupIcon className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-700">工人列表</h3>
              </div>
              
              <div className="space-y-2">
                {filteredWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    onClick={() => handleWorkerClick(worker.id)}
                    className={`p-3 rounded border cursor-pointer ${
                      selectedWorkerId === worker.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{worker.name}</div>
                        <div className="text-xs text-gray-500">{worker.department}</div>
                      </div>
                      <div className="text-right">
                        {worker.totalQuantity > 0 ? (
                          <>
                            <Badge variant="secondary" size="sm">{worker.totalQuantity}张</Badge>
                            <div className="text-xs text-gray-500 mt-1">{worker.materialCount} 种材料</div>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline" size="sm">无库存</Badge>
                            <div className="text-xs text-gray-400 mt-1">可分配板材</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // 工人管理视图
          <WorkerManagementSidebar 
            workers={allWorkers}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onRefresh={fetchAllWorkers}
          />
        )}
      </div>
    </div>
  );
};

// 工人管理侧边栏组件
interface WorkerManagementSidebarProps {
  workers: any[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onRefresh: () => void;
}

const WorkerManagementSidebar: React.FC<WorkerManagementSidebarProps> = ({
  workers,
  searchQuery,
  onSearchQueryChange,
  onRefresh
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [departments, setDepartments] = useState<any[]>([]);
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newWorkerData, setNewWorkerData] = useState({
    name: '',
    phone: '',
    department: '',
    departmentId: undefined as number | undefined,
    position: ''
  });
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // 获取部门列表
  const fetchDepartments = async () => {
    if (!token) return;
    
    try {
      console.log('🔄 开始获取部门列表...');
      const response = await apiRequest('/api/workers/departments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 部门API响应状态:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 获取到的部门数据:', data);
        setDepartments(data.departments || []);
        console.log('✅ 设置部门列表:', data.departments || []);
      } else {
        const errorData = await response.json();
        console.error('❌ 获取部门失败:', errorData);
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
    }
  };

  // 添加部门
  const addDepartment = async () => {
    if (!token || !newDepartmentName.trim()) {
      console.log('❌ 添加部门失败: 缺少token或部门名称');
      return;
    }

    console.log('🔄 开始添加部门:', newDepartmentName.trim());
    console.log('👤 当前用户角色:', user?.role);

    try {
      const response = await apiRequest('/api/workers/departments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newDepartmentName.trim() })
      });

      console.log('📡 API响应状态:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 部门创建成功:', data);
        setNewDepartmentName('');
        setShowAddDepartmentModal(false);
        fetchDepartments();
      } else {
        const errorData = await response.json();
        console.error('❌ API返回错误:', errorData);
        alert(`创建部门失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('❌ 添加部门失败:', error);
      alert(`创建部门失败: ${error.message}`);
    }
  };

  // 添加工人
  const addWorker = async () => {
    if (!token || !newWorkerData.name.trim()) {
      console.log('❌ 添加工人失败: 缺少token或工人姓名');
      return;
    }

    console.log('🔄 开始添加工人:', newWorkerData);

    try {
      // 构建提交数据
      const submitData = {
        name: newWorkerData.name.trim(),
        phone: newWorkerData.phone.trim() || undefined,
        departmentId: newWorkerData.departmentId,
        position: newWorkerData.position.trim() || undefined
      };

      console.log('📤 提交数据:', submitData);

      const response = await apiRequest('/api/workers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      console.log('📡 API响应状态:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 工人创建成功:', data);
        setNewWorkerData({ 
          name: '', 
          phone: '', 
          department: '', 
          departmentId: undefined,
          position: '' 
        });
        setShowAddWorkerModal(false);
        onRefresh();
      } else {
        const errorData = await response.json();
        console.error('❌ API返回错误:', errorData);
        alert(`创建工人失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('❌ 添加工人失败:', error);
      alert(`创建工人失败: ${error.message}`);
    }
  };
  useEffect(() => {
    fetchDepartments();
  }, [token]);

  // 按部门分组工人，并确保所有部门都显示
  const workersByDepartment = useMemo(() => {
    // 首先基于工人数据分组
    const workerGroups = workers.reduce((acc: any, worker: any) => {
      const dept = worker.department || '未分配部门';
      if (!acc[dept]) {
        acc[dept] = [];
      }
      acc[dept].push(worker);
      return acc;
    }, {});

    // 然后确保所有部门都在列表中，即使没有工人
    departments.forEach(dept => {
      if (!workerGroups[dept.name]) {
        workerGroups[dept.name] = [];
      }
    });

    // 确保"未分配部门"始终存在
    if (!workerGroups['未分配部门']) {
      workerGroups['未分配部门'] = [];
    }

    return workerGroups;
  }, [workers, departments]);

  // 筛选工人
  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    worker.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    worker.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 管理操作按钮 */}
      {isAdmin && (
        <div className="flex-shrink-0 px-4 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddDepartmentModal(true)}
              className="flex items-center justify-center space-x-1"
            >
              <PlusIcon className="w-3 h-3" />
              <span className="text-xs">添加部门</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddWorkerModal(true)}
              className="flex items-center justify-center space-x-1"
            >
              <PlusIcon className="w-3 h-3" />
              <span className="text-xs">添加工人</span>
            </Button>
          </div>
        </div>
      )}

      {/* 搜索框 */}
      <div className="flex-shrink-0 px-4">
        <Input
          variant="glass"
          size="sm"
          placeholder="搜索工人姓名、部门或电话..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
        />
      </div>

      {/* 部门筛选 */}
      <div className="flex-shrink-0 px-4">
        <h4 className="text-xs font-medium text-gray-500 mb-2">按部门筛选</h4>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedDepartment('all')}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              selectedDepartment === 'all'
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            全部部门
            <Badge variant="outline" size="sm" className="ml-2">
              {workers.length}
            </Badge>
          </button>
          {Object.entries(workersByDepartment).map(([dept, deptWorkers]: [string, any]) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                selectedDepartment === dept
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {dept}
              <Badge variant="outline" size="sm" className="ml-2">
                {deptWorkers.length}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* 工人列表 */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {filteredWorkers
          .filter(worker => 
            selectedDepartment === 'all' || 
            (worker.department || '未分配部门') === selectedDepartment
          )
          .map((worker) => (
            <div
              key={worker.id}
              className="p-3 rounded-lg border bg-white hover:bg-gray-50 border-gray-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{worker.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {worker.department || '未分配部门'}
                  </div>
                  {worker.phone && (
                    <div className="text-xs text-gray-400 truncate mt-1 flex items-center">
                      <PhoneIcon className="w-3 h-3 mr-1" />
                      <span>{worker.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Badge variant="outline" size="sm">
                    {worker.position || '普通员工'}
                  </Badge>
                </div>
              </div>
              
              {/* 简化的操作按钮 */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      // 切换到板材库存视图并筛选该工人
                      window.dispatchEvent(new CustomEvent('switch-to-inventory', {
                        detail: { workerId: worker.id }
                      }));
                    }}
                    className="text-blue-600 hover:text-blue-700 px-2 py-1 text-xs"
                  >
                    板材分配
                  </Button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {filteredWorkers.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-center py-8 text-gray-500">
          <div>
            <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">没有找到匹配的工人</p>
          </div>
        </div>
      )}

      {/* 添加部门模态框 */}
      <Modal
        isOpen={showAddDepartmentModal}
        onClose={() => {
          setShowAddDepartmentModal(false);
          setNewDepartmentName('');
        }}
        title="添加部门"
        maxWidth="md"
      >
        <div className="p-6">
          <Input
            placeholder="部门名称"
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            className="mb-4"
          />
          <div className="flex space-x-2">
            <Button variant="primary" onClick={addDepartment} disabled={!newDepartmentName.trim()}>
              添加
            </Button>
            <Button variant="secondary" onClick={() => {
              setShowAddDepartmentModal(false);
              setNewDepartmentName('');
            }}>
              取消
            </Button>
          </div>
        </div>
      </Modal>

      {/* 添加工人模态框 */}
      <Modal
        isOpen={showAddWorkerModal}
        onClose={() => {
          setShowAddWorkerModal(false);
          setNewWorkerData({ name: '', phone: '', department: '', departmentId: undefined, position: '' });
        }}
        title="添加工人"
        maxWidth="md"
      >
        <div className="p-6">
          <div className="space-y-3">
            <Input
              placeholder="工人姓名*"
              value={newWorkerData.name}
              onChange={(e) => setNewWorkerData(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="联系电话"
              value={newWorkerData.phone}
              onChange={(e) => setNewWorkerData(prev => ({ ...prev, phone: e.target.value }))}
            />
            <DepartmentSelector
              placeholder="选择或创建部门*"
              value={newWorkerData.department}
              onChange={(departmentName, departmentId) => {
                setNewWorkerData(prev => ({ 
                  ...prev, 
                  department: departmentName,
                  departmentId: departmentId 
                }));
              }}
            />
            <Input
              placeholder="职位"
              value={newWorkerData.position}
              onChange={(e) => setNewWorkerData(prev => ({ ...prev, position: e.target.value }))}
            />
          </div>
          <div className="flex space-x-2 mt-4">
            <Button variant="primary" onClick={addWorker} disabled={!newWorkerData.name.trim()}>
              添加
            </Button>
            <Button variant="secondary" onClick={() => {
              setShowAddWorkerModal(false);
              setNewWorkerData({ name: '', phone: '', department: '', departmentId: undefined, position: '' });
            }}>
              取消
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
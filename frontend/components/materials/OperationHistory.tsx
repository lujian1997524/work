'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Badge, Loading, Input, Select } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface OperationHistoryRecord {
  id: number;
  operationTime: string;
  operationType: 'deduction' | 'supplement' | 'adjustment' | 'allocation' | 'return' | 'material_stock' | 'material_dimension_delete' | 'material_dimension_update' | 'material_dimension_transfer';
  projectName: string;
  projectId: number;
  thicknessSpec: string;
  thicknessSpecId: number;
  quantity: number;
  operatorName: string;
  operatorId: number;
  notes: string;
  batchId: string;
  status: string;
  // 扩展字段
  operationDescription?: string;
  materialInfo?: {
    width?: number;
    height?: number;
    dimensions?: string;
    materialType?: string;
    thickness?: string;
    projectName?: string;
    workerName?: string;
    notes?: string;
    [key: string]: any;
  };
  dimensions?: string;
}

interface BatchOperation {
  batchId: string;
  operationCount: number;
  startTime: string;
  endTime: string;
  operatorName: string;
  operatorId: number;
  projectNames: string[];
  materialSpecs: string[];
  totalQuantity: number;
  operationType: string;
}

interface OperationHistoryProps {
  className?: string;
}

const operationTypeMap = {
  deduction: { label: '扣除', color: 'text-red-600 bg-red-50' },
  supplement: { label: '补充', color: 'text-green-600 bg-green-50' },
  adjustment: { label: '调整', color: 'text-blue-600 bg-blue-50' },
  allocation: { label: '分配', color: 'text-purple-600 bg-purple-50' },
  return: { label: '归还', color: 'text-orange-600 bg-orange-50' },
  material_stock: { label: '入库', color: 'text-green-600 bg-green-50' },
  material_dimension_delete: { label: '删除', color: 'text-red-600 bg-red-50' },
  material_dimension_update: { label: '修改', color: 'text-blue-600 bg-blue-50' },
  material_dimension_transfer: { label: '转移', color: 'text-purple-600 bg-purple-50' }
};

export const OperationHistory: React.FC<OperationHistoryProps> = ({
  className = ''
}) => {
  const [records, setRecords] = useState<OperationHistoryRecord[]>([]);
  const [batchOperations, setBatchOperations] = useState<BatchOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('today');
  const [operationType, setOperationType] = useState('all');
  const [viewType, setViewType] = useState<'records' | 'batches'>('records');
  
  const { token } = useAuth();
  const limit = 20;

  // 获取操作记录
  const fetchOperationHistory = async (pageNum = 1, reset = false) => {
    if (!token) return;
    
    try {
      if (reset) setLoading(true);
      
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
      });
      
      // 添加筛选参数
      if (searchQuery) params.append('search', searchQuery);
      if (operationType !== 'all') params.append('operationType', operationType);
      
      // 日期范围筛选
      const now = new Date();
      if (dateRange === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        params.append('startDate', today.toISOString());
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.append('startDate', weekAgo.toISOString());
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        params.append('startDate', monthAgo.toISOString());
      }

      const response = await apiRequest(`/api/materials/operation-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const historyRecords = result.operationHistory || [];
        
        // 调试：打印完整的响应数据
        console.log('操作历史API响应:', {
          success: result.success,
          totalRecords: historyRecords.length,
          firstRecord: historyRecords[0],
          pagination: result.pagination
        });
        
        // 转换后端数据格式为前端期待的格式
        const transformedRecords = historyRecords.map((record: any) => {
          // 尝试多个可能的时间字段，并记录详细日志
          const timeFields = ['createdAt', 'created_at', 'operationTime', 'timestamp'];
          let operationTime = null;
          
          for (const field of timeFields) {
            if (record[field] && record[field] !== undefined && record[field] !== null) {
              operationTime = record[field];
              break;
            }
          }
          
          // 如果都没有时间，使用当前时间作为后备
          if (!operationTime) {
            console.warn('记录缺少时间字段，使用当前时间:', {
              id: record.id,
              availableFields: Object.keys(record),
              recordData: record
            });
            operationTime = new Date().toISOString();
          }
          
          console.log('时间字段处理结果:', {
            id: record.id,
            原始时间: operationTime,
            时间有效性: operationTime ? new Date(operationTime).toString() : 'Invalid'
          });
          
          return {
            id: record.id,
            operationTime: operationTime,
            operationType: record.operationType,
            projectName: record.projectName || record.materialInfo?.projectName || '系统操作',
            projectId: record.projectId,
            thicknessSpec: record.materialInfo?.thickness || '未指定',
            thicknessSpecId: record.materialInfo?.thicknessSpecId || 0,
            quantity: record.materialInfo?.quantity || record.materialInfo?.newQuantity || 0,
            operatorName: record.operatorName,
            operatorId: record.operatedBy,
            notes: record.materialInfo?.notes || record.operationDescription || '',
            batchId: record.materialInfo?.batchId || '',
            status: record.materialInfo?.newStatus || 'completed',
            // 添加额外的信息字段
            operationDescription: record.operationDescription,
            materialInfo: record.materialInfo,
            dimensions: record.materialInfo?.dimensions
          };
        });
        
        if (reset || pageNum === 1) {
          setRecords(transformedRecords);
        } else {
          setRecords(prev => [...prev, ...transformedRecords]);
        }
        
        setTotalPages(result.pagination?.totalPages || 1);
        setHasMore(result.pagination?.hasNextPage || false);
      }
    } catch (error) {
      console.error('获取操作记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取批量操作记录 (暂时返回空数据，因为后端接口不存在)
  const fetchBatchOperations = async (pageNum = 1, reset = false) => {
    if (!token) return;
    
    try {
      if (reset) setLoading(true);
      
      // 临时返回空数据，避免404错误（批量操作功能待实现）
      console.info('批量操作功能暂未实现');
      
      const emptyResult = {
        batchOperations: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNextPage: false
        }
      };
      
      setBatchOperations(emptyResult.batchOperations);
      setTotalPages(emptyResult.pagination.totalPages || 1);
      setHasMore(emptyResult.pagination.hasNextPage || false);

    } catch (error) {
      console.error('获取批量操作记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载数据 - 目前仅支持操作记录
  const loadData = (reset = true) => {
    fetchOperationHistory(1, reset);
  };

  // 加载更多 - 目前仅支持操作记录
  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOperationHistory(nextPage, false);
    }
  };

  // 初始加载和筛选变更时重新加载
  useEffect(() => {
    loadData(true);
    setPage(1);
  }, [token, searchQuery, dateRange, operationType, viewType]);

  // 格式化时间
  const formatTime = (timeString: string) => {
    if (!timeString) return '未知时间';
    
    try {
      const date = new Date(timeString);
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.warn('无效的时间格式:', timeString);
        return '时间格式错误';
      }
      
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('时间格式化错误:', error, '原始时间:', timeString);
      return '时间解析失败';
    }
  };

  // 渲染操作记录表格
  const renderRecordsTable = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">项目名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">材料规格</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">尺寸</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">数量</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">操作人</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">描述</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.map((record) => (
              <motion.tr 
                key={record.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatTime(record.operationTime)}
                </td>
                <td className="px-4 py-3">
                  <Badge 
                    className={operationTypeMap[record.operationType]?.color || 'text-gray-600 bg-gray-50'}
                    size="sm"
                  >
                    {operationTypeMap[record.operationType]?.label || record.operationType}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {record.projectName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {record.thicknessSpec}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {record.dimensions || 
                   (record.materialInfo?.width && record.materialInfo?.height 
                     ? `${record.materialInfo.width}×${record.materialInfo.height}mm` 
                     : '-')}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="secondary" size="sm">
                    {record.quantity}张
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {record.operatorName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                  {record.operationDescription || record.notes || '-'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // 渲染批量操作表格
  const renderBatchTable = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">批次ID</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">操作数</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">时间范围</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">操作人</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">涉及项目</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">总数量</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">材料规格</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {batchOperations.map((batch) => (
              <motion.tr 
                key={batch.batchId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <Badge variant="primary" size="sm">
                    #{batch.batchId.slice(-8)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="secondary" size="sm">
                    {batch.operationCount}项
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div>
                    <div>{formatTime(batch.startTime)}</div>
                    {batch.startTime !== batch.endTime && (
                      <div className="text-xs text-gray-500">至 {formatTime(batch.endTime)}</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {batch.operatorName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="max-w-xs">
                    {batch.projectNames.slice(0, 2).join('、')}
                    {batch.projectNames.length > 2 && (
                      <span className="text-gray-500"> 等{batch.projectNames.length}个项目</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="success" size="sm">
                    {batch.totalQuantity}张
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div className="max-w-xs">
                    {batch.materialSpecs.slice(0, 2).join('、')}
                    {batch.materialSpecs.length > 2 && (
                      <span className="text-gray-500"> 等{batch.materialSpecs.length}种</span>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading && records.length === 0 && batchOperations.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <Loading type="spinner" size="lg" />
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 筛选工具栏 */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">操作记录</h2>
            <p className="text-sm text-gray-600 mt-1">查看所有材料操作的历史记录</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant={viewType === 'records' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewType('records')}
            >
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              操作记录
            </Button>
            {/* 批量操作功能暂未实现，暂时隐藏 */}
            {/* 
            <Button
              variant={viewType === 'batches' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewType('batches')}
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              批量操作
            </Button>
            */}
          </div>
        </div>

        {/* 筛选条件 */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索项目名称或备注..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <Select
              value={dateRange}
              onChange={(value) => setDateRange(value as string)}
              options={[
                { value: 'today', label: '今天' },
                { value: 'week', label: '最近7天' },
                { value: 'month', label: '最近30天' },
                { value: 'all', label: '全部时间' }
              ]}
              size="sm"
              className="w-32"
            />
          </div>

          {viewType === 'records' && (
            <div className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-gray-400" />
              <Select
                value={operationType}
                onChange={(value) => setOperationType(value as string)}
                options={[
                  { value: 'all', label: '全部类型' },
                  { value: 'deduction', label: '扣除' },
                  { value: 'supplement', label: '补充' },
                  { value: 'adjustment', label: '调整' },
                  { value: 'allocation', label: '分配' },
                  { value: 'return', label: '归还' },
                  { value: 'material_stock', label: '入库' },
                  { value: 'material_dimension_delete', label: '删除' },
                  { value: 'material_dimension_update', label: '修改' }
                ]}
                size="sm"
                className="w-32"
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={loading}
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          {renderRecordsTable()}
          
          {/* 无数据提示 */}
          {records.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentTextIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无操作记录</p>
              <p className="text-sm text-gray-400 mt-1">请尝试调整筛选条件</p>
            </div>
          )}

          {/* 加载更多 */}
          {hasMore && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? '加载中...' : '加载更多'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
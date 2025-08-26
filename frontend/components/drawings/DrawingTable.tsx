'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { 
  DocumentIcon, 
  EyeIcon, 
  ArrowDownTrayIcon, 
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import AdvancedDxfModal from '@/components/ui/advanced-dxf/AdvancedDxfModal';
import { Loading, Button } from '@/components/ui';
import { downloadDrawingWeb } from '@/utils/drawingHandlersPure';

interface Drawing {
  id: number;
  projectId: number;
  project?: {
    id: number;
    name: string;
  };
  filename: string;
  originalFilename?: string;
  filePath: string;
  version: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
  uploader?: {
    id: number;
    name: string;
  };
}

interface DrawingTableProps {
  projectId?: number;
  showProjectColumn?: boolean;
  className?: string;
}

export const DrawingTable: React.FC<DrawingTableProps> = ({
  projectId,
  showProjectColumn = true,
  className = ''
}) => {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [advancedPreviewOpen, setAdvancedPreviewOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Drawing>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterVersion, setFilterVersion] = useState<string>('all');
  const { token } = useAuth();

  useEffect(() => {
    fetchDrawings();
  }, [projectId, token]);

  const fetchDrawings = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const endpoint = projectId 
        ? `/api/drawings?projectId=${projectId}`
        : '/api/drawings';

      const response = await apiRequest(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDrawings(data.drawings || data || []);
      } else {
        throw new Error('获取图纸列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取图纸列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (drawing: Drawing) => {
    setSelectedDrawing(drawing);
    setAdvancedPreviewOpen(true);
  };

  const handleDownload = async (drawing: Drawing) => {
    try {
      // 转换为 drawingHandlersPure 需要的格式
      const drawingForDownload = {
        id: drawing.id,
        filename: drawing.filename,
        version: drawing.version,
        filePath: drawing.filePath,
        projectId: drawing.projectId || 0
      };
      await downloadDrawingWeb(drawingForDownload);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  const handleDelete = async (drawing: Drawing) => {
    if (!confirm(`确定要删除图纸 "${drawing.originalFilename || drawing.filename}" 吗？`)) {
      return;
    }

    try {
      const response = await apiRequest(`/api/drawings/${drawing.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchDrawings();
      } else {
        throw new Error('删除失败');
      }
    } catch (err) {
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleSort = (field: keyof Drawing) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 过滤和排序逻辑
  const filteredAndSortedDrawings = drawings
    .filter(drawing => {
      const matchesSearch = !searchTerm || 
        (drawing.originalFilename || drawing.filename).toLowerCase().includes(searchTerm.toLowerCase()) ||
        drawing.project?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVersion = filterVersion === 'all' || drawing.version === filterVersion;
      
      return matchesSearch && matchesVersion;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === undefined || bValue === undefined) return 0;
      
      let result = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        result = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue));
      }
      
      return sortDirection === 'asc' ? result : -result;
    });

  const versions = [...new Set(drawings.map(d => d.version))].sort();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <Loading text="加载图纸列表中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <DocumentIcon className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchDrawings}>重试</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* 表格头部工具栏 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              图纸管理
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredAndSortedDrawings.length} 个图纸)
              </span>
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 搜索框 */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索图纸名称或项目..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            
            {/* 版本筛选 */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterVersion}
                onChange={(e) => setFilterVersion(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white"
              >
                <option value="all">全部版本</option>
                {versions.map(version => (
                  <option key={version} value={version}>v{version}</option>
                ))}
              </select>
            </div>
            
            {/* 新增按钮 */}
            <Button className="flex items-center space-x-2">
              <PlusIcon className="w-4 h-4" />
              <span>上传图纸</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('filename')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>图纸名称</span>
                  <ArrowsUpDownIcon className="w-4 h-4" />
                </button>
              </th>
              
              {showProjectColumn && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('projectId')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>所属项目</span>
                    <ArrowsUpDownIcon className="w-4 h-4" />
                  </button>
                </th>
              )}
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('version')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>版本</span>
                  <ArrowsUpDownIcon className="w-4 h-4" />
                </button>
              </th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                文件大小
              </th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                上传者
              </th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>上传时间</span>
                  <ArrowsUpDownIcon className="w-4 h-4" />
                </button>
              </th>
              
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedDrawings.length === 0 ? (
              <tr>
                <td colSpan={showProjectColumn ? 7 : 6} className="px-6 py-12 text-center">
                  <div className="text-gray-400">
                    <DocumentIcon className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchTerm || filterVersion !== 'all' ? '没有找到匹配的图纸' : '暂无图纸'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedDrawings.map((drawing) => (
                <tr key={drawing.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <DocumentIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {drawing.originalFilename || drawing.filename}
                        </div>
                        <div className="text-sm text-gray-500">
                          {drawing.filename}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {showProjectColumn && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {drawing.project?.name || '-'}
                      </div>
                    </td>
                  )}
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      v{drawing.version}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(drawing.fileSize)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {drawing.uploader?.name || '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(drawing.createdAt)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handlePreview(drawing)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                        title="预览"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(drawing)}
                        className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50"
                        title="下载"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(drawing)}
                        className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                        title="删除"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 高级DXF预览模态框 */}
      <AdvancedDxfModal
        isOpen={advancedPreviewOpen}
        onClose={() => {
          setAdvancedPreviewOpen(false);
          setSelectedDrawing(null);
        }}
        drawing={selectedDrawing}
      />
    </div>
  );
};
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
  ChevronRightIcon,
  CalendarIcon,
  UserIcon,
  ArchiveBoxIcon,
  FireIcon
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

interface MobileDrawingListProps {
  projectId?: number;
  showProjectColumn?: boolean;
  className?: string;
}

export const MobileDrawingList: React.FC<MobileDrawingListProps> = ({
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
  const [filterVersion, setFilterVersion] = useState<string>('all');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 过滤逻辑
  const filteredDrawings = drawings
    .filter(drawing => {
      const matchesSearch = !searchTerm || 
        (drawing.originalFilename || drawing.filename).toLowerCase().includes(searchTerm.toLowerCase()) ||
        drawing.project?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVersion = filterVersion === 'all' || drawing.version === filterVersion;
      
      return matchesSearch && matchesVersion;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const versions = [...new Set(drawings.map(d => d.version))].sort();

  const toggleExpanded = (drawingId: number) => {
    setExpandedCard(expandedCard === drawingId ? null : drawingId);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <Loading text="加载图纸列表中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
      {/* 移动端头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            图纸管理
          </h2>
          <Button size="sm" className="flex items-center space-x-1">
            <PlusIcon className="w-4 h-4" />
            <span>上传</span>
          </Button>
        </div>
        
        <div className="text-sm text-gray-500 mb-4">
          共 {filteredDrawings.length} 个图纸
        </div>
        
        {/* 搜索和筛选 */}
        <div className="space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索图纸..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterVersion}
              onChange={(e) => setFilterVersion(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white"
            >
              <option value="all">全部版本</option>
              {versions.map(version => (
                <option key={version} value={version}>v{version}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 移动端列表 */}
      <div className="divide-y divide-gray-200">
        {filteredDrawings.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400">
              <DocumentIcon className="w-12 h-12 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || filterVersion !== 'all' ? '没有找到匹配的图纸' : '暂无图纸'}
              </p>
            </div>
          </div>
        ) : (
          filteredDrawings.map((drawing) => (
            <div key={drawing.id} className="p-4">
              {/* 主要信息行 */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleExpanded(drawing.id)}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DocumentIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {drawing.originalFilename || drawing.filename}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        v{drawing.version}
                      </span>
                      {showProjectColumn && drawing.project && (
                        <span className="text-xs text-gray-500 truncate">
                          {drawing.project.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <ChevronRightIcon 
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedCard === drawing.id ? 'rotate-90' : ''
                  }`} 
                />
              </div>
              
              {/* 展开的详细信息 */}
              {expandedCard === drawing.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <ArchiveBoxIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">大小:</span>
                      <span className="text-gray-900">{formatFileSize(drawing.fileSize)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">上传者:</span>
                      <span className="text-gray-900">{drawing.uploader?.name || '-'}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 col-span-2">
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">上传时间:</span>
                      <span className="text-gray-900">{formatDate(drawing.createdAt)}</span>
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center justify-end space-x-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(drawing);
                      }}
                      className="flex items-center space-x-1 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg text-sm font-medium hover:bg-blue-100"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>预览</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(drawing);
                      }}
                      className="flex items-center space-x-1 px-3 py-2 text-orange-600 bg-orange-50 rounded-lg text-sm font-medium hover:bg-orange-100"
                    >
                      <FireIcon className="w-4 h-4" />
                      <span>高级</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(drawing);
                      }}
                      className="flex items-center space-x-1 px-3 py-2 text-green-600 bg-green-50 rounded-lg text-sm font-medium hover:bg-green-100"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span>下载</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(drawing);
                      }}
                      className="flex items-center space-x-1 px-3 py-2 text-red-600 bg-red-50 rounded-lg text-sm font-medium hover:bg-red-100"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 高级DXF预览模态框 */}
      <AdvancedDxfModal
        drawing={selectedDrawing}
        isOpen={advancedPreviewOpen}
        onClose={() => {
          setAdvancedPreviewOpen(false);
          setSelectedDrawing(null);
        }}
      />
    </div>
  );
};
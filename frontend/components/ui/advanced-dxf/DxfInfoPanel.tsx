/**
 * DXF信息面板 - 显示图纸的详细信息和统计数据
 */

'use client'

import React from 'react';
import { 
  DocumentTextIcon, 
  Squares2X2Icon,
  PuzzlePieceIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  UserIcon,
  TagIcon,
  CubeIcon,
  ScaleIcon,
  ClockIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface EntityInfo {
  type: string;
  layer: string;
  color?: number;
  lineType?: string;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  center?: { x: number; y: number };
  radius?: number;
  text?: string;
}

interface LayerInfo {
  name: string;
  color: number;
  visible: boolean;
  frozen: boolean;
  entityCount: number;
}

interface DxfAnalysisData {
  layers: LayerInfo[];
  entities: EntityInfo[];
  bounds: { min: { x: number; y: number }; max: { x: number; y: number } };
  statistics: {
    totalEntities: number;
    entityTypes: Record<string, number>;
    layerCount: number;
    fileSize?: string;
  };
}

interface DxfInfoPanelProps {
  analysisData: DxfAnalysisData | null;
  isLoading: boolean;
  drawing?: {
    id: number;
    filename: string;
    originalFilename?: string;
    originalName?: string; // DrawingLibrary使用这个字段
    version: string;
    createdAt: string;
    uploader?: { id: number; name: string };
    projectId: number;
    filePath: string;
  };
  className?: string;
  onDownload?: (drawing: any) => void;
}

const DxfInfoPanel: React.FC<DxfInfoPanelProps> = ({
  analysisData,
  isLoading,
  drawing,
  onDownload,
  className = ''
}) => {
  if (isLoading || !analysisData) {
    return (
      <div className={`bg-gray-800 border-l border-gray-700 ${className}`}>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded mb-4"></div>
            <div className="h-3 bg-gray-600 rounded mb-2"></div>
            <div className="h-3 bg-gray-600 rounded mb-2"></div>
            <div className="h-3 bg-gray-600 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const { layers, entities, bounds, statistics } = analysisData;

  return (
    <div className={`bg-gray-800 border-l border-gray-700 ${className}`}>
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center space-x-2">
          <InformationCircleIcon className="w-5 h-5 text-blue-400" />
          <h3 className="font-medium text-white">图纸分析</h3>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 图纸信息 */}
        {drawing && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center justify-between">
              <div className="flex items-center">
                <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                图纸信息
              </div>
              {onDownload && (
                <button
                  onClick={() => onDownload(drawing)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="下载图纸"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
              )}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">主文件名</span>
                  <span className="font-medium text-white text-right max-w-32 truncate" title={drawing.originalFilename || drawing.originalName || drawing.filename}>
                    {drawing.originalFilename || drawing.originalName || drawing.filename}
                  </span>
                </div>
                {(drawing.originalFilename || drawing.originalName) && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">系统文件名</span>
                    <span className="font-mono text-xs text-gray-500 text-right max-w-32 truncate" title={drawing.filename}>
                      {drawing.filename}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">版本</span>
                <span className="font-medium text-white">v{drawing.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">上传者</span>
                <span className="font-medium text-white">{drawing.uploader?.name || '未知'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">创建时间</span>
                <span className="font-medium text-white text-xs">
                  {new Date(drawing.createdAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 统计概览 */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <DocumentTextIcon className="w-4 h-4 mr-1" />
            文件统计
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">总实体数</span>
              <span className="font-medium text-white">{statistics.totalEntities}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">图层数</span>
              <span className="font-medium text-white">{statistics.layerCount}</span>
            </div>
            {statistics.fileSize && (
              <div className="flex justify-between">
                <span className="text-gray-400">文件大小</span>
                <span className="font-medium text-white">{statistics.fileSize}</span>
              </div>
            )}
          </div>
        </div>

        {/* 边界信息 */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <Squares2X2Icon className="w-4 h-4 mr-1" />
            边界范围
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">最小点</span>
              <span className="font-mono text-xs text-cyan-400">({bounds.min.x.toFixed(2)}, {bounds.min.y.toFixed(2)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">最大点</span>
              <span className="font-mono text-xs text-cyan-400">({bounds.max.x.toFixed(2)}, {bounds.max.y.toFixed(2)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">尺寸</span>
              <span className="font-mono text-xs text-green-400">
                {(bounds.max.x - bounds.min.x).toFixed(2)} × {(bounds.max.y - bounds.min.y).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 实体类型统计 */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <PuzzlePieceIcon className="w-4 h-4 mr-1" />
            实体类型
          </h4>
          <div className="space-y-2">
            {Object.entries(statistics.entityTypes)
              .sort(([,a], [,b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{type}</span>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="bg-blue-600 h-2 rounded"
                      style={{ 
                        width: `${Math.max(20, (count / statistics.totalEntities) * 100)}px` 
                      }}
                    />
                    <span className="font-medium w-8 text-right text-white">{count}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* 图层详情 */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <FolderIcon className="w-4 h-4 mr-1" />
            图层详情
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {layers.map((layer) => (
              <div key={layer.name} className="flex items-center justify-between p-2 rounded hover:bg-gray-700">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded border border-gray-600"
                    style={{ 
                      backgroundColor: layer.visible ? `hsl(${layer.color * 30}, 70%, 50%)` : '#555' 
                    }}
                  />
                  <span className="text-xs font-mono text-gray-300">{layer.name}</span>
                  {layer.frozen && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-800 text-blue-200 rounded">冻结</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {layer.entityCount} 实体
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 技术信息 */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <Cog6ToothIcon className="w-4 h-4 mr-1" />
            技术信息
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">解析引擎</span>
              <span className="font-medium text-white text-xs">dxf-parser</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">渲染引擎</span>
              <span className="font-medium text-white text-xs">dxf-viewer</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">图形引擎</span>
              <span className="font-medium text-white text-xs">Three.js WebGL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">坐标系统</span>
              <span className="font-medium text-white text-xs">CAD世界坐标</span>
            </div>
          </div>
        </div>

        {/* 性能信息 */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <ChartBarIcon className="w-4 h-4 mr-1" />
            性能统计
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">内存使用</span>
              <span className="font-medium text-green-400 text-xs">优化</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">渲染模式</span>
              <span className="font-medium text-blue-400 text-xs">GPU加速</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">字体缓存</span>
              <span className="font-medium text-cyan-400 text-xs">已预加载</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DxfInfoPanel;
/**
 * 高级信息面板 - 显示DXF文件的详细分析信息
 * 提供图层管理、实体统计、边界信息等专业CAD功能
 */

'use client'

import React, { useState } from 'react';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  CubeIcon,
  RectangleStackIcon,
  ChartBarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface AdvancedInfoPanelProps {
  analysisData: {
    layers: any[];
    entities: any[];
    bounds: { min: { x: number; y: number }; max: { x: number; y: number } };
    statistics: {
      totalEntities: number;
      entityTypes: Record<string, number>;
      layerCount: number;
      fileSize?: string;
    };
  };
  fileName: string;
}

const AdvancedInfoPanel: React.FC<AdvancedInfoPanelProps> = ({ 
  analysisData, 
  fileName 
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'statistics']) // 默认展开基本信息和统计
  );
  const [layerVisibility, setLayerVisibility] = useState<Map<string, boolean>>(
    new Map(analysisData.layers.map(layer => [layer.name, layer.visible]))
  );

  // 切换章节展开状态
  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  // 切换图层可见性
  const toggleLayerVisibility = (layerName: string) => {
    const newVisibility = new Map(layerVisibility);
    newVisibility.set(layerName, !newVisibility.get(layerName));
    setLayerVisibility(newVisibility);
    // 这里可以添加实际的图层显示/隐藏逻辑
  };

  // 获取实体类型的中文名称
  const getEntityTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'LINE': '直线',
      'CIRCLE': '圆',
      'ARC': '圆弧', 
      'POLYLINE': '多段线',
      'LWPOLYLINE': '轻量多段线',
      'TEXT': '文字',
      'MTEXT': '多行文字',
      'INSERT': '块引用',
      'POINT': '点',
      'ELLIPSE': '椭圆',
      'SPLINE': '样条曲线',
      'DIMENSION': '标注',
      'HATCH': '填充',
      'SOLID': '实体填充'
    };
    return typeMap[type] || type;
  };

  // 获取图层颜色显示
  const getLayerColorStyle = (color: number) => {
    // AutoCAD标准颜色映射（简化版）
    const colorMap: Record<number, string> = {
      1: '#FF0000', // 红色
      2: '#FFFF00', // 黄色  
      3: '#00FF00', // 绿色
      4: '#00FFFF', // 青色
      5: '#0000FF', // 蓝色
      6: '#FF00FF', // 品红
      7: '#FFFFFF', // 白色（显示为黑色）
      8: '#808080', // 灰色
      9: '#C0C0C0'  // 浅灰
    };
    return colorMap[color] || '#808080';
  };

  // 可折叠章节组件
  const CollapsibleSection: React.FC<{
    name: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ name, title, icon, children }) => {
    const isExpanded = expandedSections.has(name);
    
    return (
      <div className="border-b border-gray-200 last:border-b-0">
        <button
          onClick={() => toggleSection(name)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            {icon}
            <span className="font-medium text-gray-900">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {isExpanded && (
          <div className="px-4 pb-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* 基本信息 */}
      <CollapsibleSection
        name="basic"
        title="基本信息"
        icon={<InformationCircleIcon className="h-5 w-5 text-blue-600" />}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">文件名</label>
            <p className="text-sm text-gray-900 mt-1 break-all">{fileName}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">文件大小</label>
              <p className="text-sm text-gray-900 mt-1">{analysisData.statistics.fileSize || '未知'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">解析引擎</label>
              <p className="text-sm text-gray-900 mt-1">dxf-parser</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 统计信息 */}
      <CollapsibleSection
        name="statistics"
        title="统计信息"
        icon={<ChartBarIcon className="h-5 w-5 text-green-600" />}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CubeIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">总实体</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {analysisData.statistics.totalEntities}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <RectangleStackIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">图层数</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {analysisData.statistics.layerCount}
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* 实体类型分布 */}
      <CollapsibleSection
        name="entities"
        title="实体类型"
        icon={<DocumentTextIcon className="h-5 w-5 text-purple-600" />}
      >
        <div className="space-y-2">
          {Object.entries(analysisData.statistics.entityTypes)
            .sort(([,a], [,b]) => b - a) // 按数量排序
            .map(([type, count]) => (
              <div key={type} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-700">{getEntityTypeName(type)}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all"
                      style={{ 
                        width: `${(count / analysisData.statistics.totalEntities) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
        </div>
      </CollapsibleSection>

      {/* 图层管理 */}
      <CollapsibleSection
        name="layers"
        title="图层管理"
        icon={<RectangleStackIcon className="h-5 w-5 text-orange-600" />}
      >
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {analysisData.layers
            .sort((a, b) => b.entityCount - a.entityCount) // 按实体数量排序
            .map((layer) => (
              <div key={layer.name} className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-100">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {/* 图层颜色指示器 */}
                  <div 
                    className="w-3 h-3 rounded border border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: getLayerColorStyle(layer.color) }}
                  />
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {layer.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {layer.entityCount} 个实体
                    </p>
                  </div>
                </div>
                
                {/* 可见性控制 */}
                <button
                  onClick={() => toggleLayerVisibility(layer.name)}
                  className={`p-1 rounded transition-colors ${
                    layerVisibility.get(layer.name) 
                      ? 'text-blue-600 hover:bg-blue-100' 
                      : 'text-gray-400 hover:bg-gray-200'
                  }`}
                  title={layerVisibility.get(layer.name) ? '隐藏图层' : '显示图层'}
                >
                  {layerVisibility.get(layer.name) ? (
                    <EyeIcon className="h-4 w-4" />
                  ) : (
                    <EyeSlashIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
        </div>
      </CollapsibleSection>

      {/* 边界信息 */}
      <CollapsibleSection
        name="bounds"
        title="边界信息"
        icon={<CubeIcon className="h-5 w-5 text-indigo-600" />}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">最小值 (X, Y)</label>
              <p className="text-sm text-gray-900 mt-1">
                ({analysisData.bounds.min.x.toFixed(2)}, {analysisData.bounds.min.y.toFixed(2)})
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">最大值 (X, Y)</label>
              <p className="text-sm text-gray-900 mt-1">
                ({analysisData.bounds.max.x.toFixed(2)}, {analysisData.bounds.max.y.toFixed(2)})
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">宽度</label>
              <p className="text-sm text-gray-900 mt-1">
                {(analysisData.bounds.max.x - analysisData.bounds.min.x).toFixed(2)}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">高度</label>
              <p className="text-sm text-gray-900 mt-1">
                {(analysisData.bounds.max.y - analysisData.bounds.min.y).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default AdvancedInfoPanel;
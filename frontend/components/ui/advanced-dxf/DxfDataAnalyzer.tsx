/**
 * DXF数据分析器 - 使用dxf-parser + dxf-viewer的高级预览引擎
 * 解析DXF文件结构，提取详细信息，并提供高质量渲染
 */

'use client'

import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import DxfParser from 'dxf-parser';
import DxfFontCache from '@/utils/dxfFontCache';
import { useAuth } from '@/contexts/AuthContext';

interface DxfDataAnalyzerProps {
  drawing: any; // Drawing对象，包含id等信息
  onAnalysisComplete: (data: any) => void;
  onAnalysisError: (error: string) => void;
  isLoading: boolean;
}

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

const DxfDataAnalyzer: React.FC<DxfDataAnalyzerProps> = ({
  drawing,
  onAnalysisComplete,
  onAnalysisError,
  isLoading
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [parsedDxf, setParsedDxf] = useState<any>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const { token } = useAuth();

  // 获取实体详细信息
  const getEntityInfo = (entity: any): EntityInfo => {
    const info: EntityInfo = {
      type: entity.type || 'UNKNOWN',
      layer: entity.layer || '0',
      color: entity.color,
      lineType: entity.lineTypeName
    };

    // 根据实体类型提取特定信息
    switch (entity.type) {
      case 'LINE':
        info.startPoint = entity.startPoint;
        info.endPoint = entity.endPoint;
        break;
      case 'CIRCLE':
        info.center = entity.center;
        info.radius = entity.radius;
        break;
      case 'ARC':
        info.center = entity.center;
        info.radius = entity.radius;
        break;
      case 'TEXT':
      case 'MTEXT':
        info.text = entity.text;
        break;
      case 'POLYLINE':
      case 'LWPOLYLINE':
        // 多段线信息
        break;
      default:
        break;
    }

    return info;
  };

  // 分析图层信息
  const analyzeLayers = (dxf: any): LayerInfo[] => {
    const layerMap = new Map<string, LayerInfo>();
    
    // 初始化默认图层
    layerMap.set('0', {
      name: '0',
      color: 7, // 默认白色
      visible: true,
      frozen: false,
      entityCount: 0
    });

    // 从图层表中获取图层定义
    if (dxf.tables && dxf.tables.layers) {
      Object.values(dxf.tables.layers).forEach((layer: any) => {
        layerMap.set(layer.name, {
          name: layer.name,
          color: layer.color || 7,
          visible: !layer.flags || !(layer.flags & 1),
          frozen: layer.flags && (layer.flags & 4),
          entityCount: 0
        });
      });
    }

    // 统计每个图层的实体数量
    if (dxf.entities) {
      dxf.entities.forEach((entity: any) => {
        const layerName = entity.layer || '0';
        const layer = layerMap.get(layerName);
        if (layer) {
          layer.entityCount++;
        }
      });
    }

    return Array.from(layerMap.values());
  };

  // 计算边界框
  const calculateBounds = (entities: any[]) => {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    entities.forEach(entity => {
      const points = [];
      
      switch (entity.type) {
        case 'LINE':
          points.push(entity.startPoint, entity.endPoint);
          break;
        case 'CIRCLE':
          if (entity.center && entity.radius) {
            const r = entity.radius;
            points.push(
              { x: entity.center.x - r, y: entity.center.y - r },
              { x: entity.center.x + r, y: entity.center.y + r }
            );
          }
          break;
        case 'ARC':
          if (entity.center && entity.radius) {
            // 简化：使用整个圆的边界
            const r = entity.radius;
            points.push(
              { x: entity.center.x - r, y: entity.center.y - r },
              { x: entity.center.x + r, y: entity.center.y + r }
            );
          }
          break;
        case 'POLYLINE':
        case 'LWPOLYLINE':
          if (entity.vertices) {
            points.push(...entity.vertices);
          }
          break;
        default:
          if (entity.startPoint) points.push(entity.startPoint);
          if (entity.endPoint) points.push(entity.endPoint);
          if (entity.center) points.push(entity.center);
          break;
      }

      points.forEach(point => {
        if (point && typeof point.x === 'number' && typeof point.y === 'number') {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      });
    });

    return {
      min: { x: minX === Infinity ? 0 : minX, y: minY === Infinity ? 0 : minY },
      max: { x: maxX === -Infinity ? 0 : maxX, y: maxY === -Infinity ? 0 : maxY }
    };
  };

  // 分析DXF文件
  const analyzeDxf = async () => {
    if (!drawing?.id) {
      onAnalysisError('图纸信息无效');
      return;
    }

    if (!token) {
      onAnalysisError('用户未登录，请重新登录');
      return;
    }

    try {
      setAnalysisProgress(10);
      
      // 使用与原DxfPreviewModal相同的API端点获取DXF内容
      const { apiRequest } = await import('@/utils/api');
      
      console.log('🔄 开始获取DXF文件内容, 图纸ID:', drawing.id);
      
      const response = await apiRequest(`/api/drawings/${drawing.id}/content`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('认证失败，请重新登录');
        }
        throw new Error(`获取DXF文件失败: ${response.status}`);
      }
      
      setAnalysisProgress(30);
      const dxfText = await response.text();
      const fileSize = new Blob([dxfText]).size;
      
      console.log('✅ DXF文件获取完成，大小:', formatFileSize(fileSize));
      
      // 使用dxf-parser解析DXF文件
      setAnalysisProgress(50);
      console.log('🔄 开始解析DXF结构...');
      
      const parser = new DxfParser();
      const dxf = parser.parseSync(dxfText);
      
      if (!dxf) {
        throw new Error('DXF文件解析失败');
      }
      
      console.log('✅ DXF解析完成:', dxf);
      setParsedDxf(dxf);
      
      // 分析实体
      const entities = dxf.entities || [];
      const layers = analyzeLayers(dxf);
      const bounds = calculateBounds(entities);
      
      // 统计信息
      const entityTypes: Record<string, number> = {};
      entities.forEach((entity: any) => {
        const type = entity.type || 'UNKNOWN';
        entityTypes[type] = (entityTypes[type] || 0) + 1;
      });
      
      setAnalysisProgress(70);
      
      // 初始化dxf-viewer进行渲染
      await initializeDxfViewer(dxfText);
      
      setAnalysisProgress(100);
      
      // 返回分析结果
      const analysisData = {
        layers,
        entities: entities.map(getEntityInfo),
        bounds,
        statistics: {
          totalEntities: entities.length,
          entityTypes,
          layerCount: layers.length,
          fileSize: formatFileSize(fileSize)
        }
      };
      
      console.log('🔍 DXF分析完成:', analysisData);
      onAnalysisComplete(analysisData);
      
    } catch (error: any) {
      console.error('❌ DXF分析失败:', error);
      onAnalysisError(error.message || '分析DXF文件时发生未知错误');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 初始化dxf-viewer
  const initializeDxfViewer = async (dxfText: string) => {
    if (!containerRef.current) return;

    try {
      // 清理现有viewer
      if (viewerRef.current) {
        viewerRef.current.Dispose();
      }

      console.log('🎨 初始化高级DXF查看器...');
      
      // 动态导入dxf-viewer，使用正确的API
      const { DxfViewer } = await import('dxf-viewer');
      
      // 清理容器
      containerRef.current.innerHTML = '';
      
      // 创建新的viewer，使用正确的构造函数
      const viewer = new DxfViewer(containerRef.current, {
        autoResize: true,
        colorCorrection: true
      });
      
      // 获取缓存的字体URLs
      const fontCache = DxfFontCache.getInstance();
      const fontUrls = fontCache.getFontUrls();
      
      console.log('📦 使用预缓存字体:', fontUrls);
      
      // 加载DXF内容到查看器
      await viewer.Load({
        url: `data:application/dxf;charset=utf-8,${encodeURIComponent(dxfText)}`,
        fonts: fontUrls,
        progressCbk: (phase: string, receivedBytes: number, totalBytes: number) => {
          console.log(`📈 加载进度 [${phase}]: ${receivedBytes}/${totalBytes}`);
        }
      });
      
      console.log('✅ DXF查看器初始化完成');
      
      viewerRef.current = viewer;
      
    } catch (error: any) {
      console.error('❌ DXF查看器初始化失败:', error);
      // 不抛出错误，因为解析已经成功了
    }
  };

  // 当drawing变化时开始分析
  useEffect(() => {
    if (drawing?.id && !isLoading && token) {
      analyzeDxf();
    }
  }, [drawing?.id, token]);

  // 清理viewer
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.Dispose();
        } catch (error) {
          console.warn('清理DXF查看器时出错:', error);
        }
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      {/* DXF查看器容器 */}
      <div 
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      
      {/* 分析进度显示 */}
      {isLoading && analysisProgress > 0 && (
        <div className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-20">
          <div className="flex items-center space-x-3">
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
            <span className="text-sm text-gray-300">{analysisProgress}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {analysisProgress < 30 ? '下载文件...' : 
             analysisProgress < 70 ? '解析结构...' :
             analysisProgress < 90 ? '分析数据...' : '初始化查看器...'}
          </p>
        </div>
      )}
      
      {/* 基本信息显示 */}
      {parsedDxf && !isLoading && (
        <div className="absolute bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 shadow-lg z-20">
          <div className="text-xs text-gray-300 space-y-1">
            <div>实体: <span className="text-white font-mono">{parsedDxf.entities?.length || 0}</span></div>
            <div>图层: <span className="text-white font-mono">{Object.keys(parsedDxf.tables?.layers || {}).length}</span></div>
            <div className="text-gray-500">dxf-parser + dxf-viewer</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DxfDataAnalyzer;
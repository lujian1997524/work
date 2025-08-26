/**
 * 高级DXF预览模态框 - CAD风格全屏界面
 * 专业级CAD软件风格的全屏预览体验
 */

'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
  XMarkIcon, 
  Squares2X2Icon,
  DocumentTextIcon,
  InformationCircleIcon,
  ArrowsPointingOutIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import DxfDataAnalyzer from './DxfDataAnalyzer';
import DxfInfoPanel from './DxfInfoPanel';
import { downloadDrawingWeb } from '@/utils/drawingHandlersPure';

interface Drawing {
  id: number;
  projectId: number;
  filename: string;
  originalFilename?: string;
  originalName?: string; // DrawingLibrary使用这个字段
  filePath: string;
  version: string;
  createdAt: string;
  uploader?: { id: number; name: string };
}

interface AdvancedDxfModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawing: Drawing | null;
}

interface DxfAnalysisData {
  layers: any[];
  entities: any[];
  bounds: { min: { x: number; y: number }; max: { x: number; y: number } };
  statistics: {
    totalEntities: number;
    entityTypes: Record<string, number>;
    layerCount: number;
    fileSize?: string;
  };
}

const AdvancedDxfModal: React.FC<AdvancedDxfModalProps> = ({
  isOpen,
  onClose,
  drawing
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<DxfAnalysisData | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理DXF文件分析
  const handleDxfAnalysis = async (data: DxfAnalysisData) => {
    setAnalysisData(data);
    setIsLoading(false);
  };

  // 处理分析错误
  const handleAnalysisError = (error: string) => {
    setError(error);
    setIsLoading(false);
  };

  // 处理下载
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

  // 重置状态
  const resetState = () => {
    setIsLoading(false);
    setError(null);
    setAnalysisData(null);
  };

  // 当模态框打开时开始分析
  useEffect(() => {
    if (isOpen && drawing?.id) {
      setIsLoading(true);
      resetState();
    } else {
      resetState();
    }
  }, [isOpen, drawing?.id]);

  // 阻止背景滚动和键盘事件
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // ESC键关闭
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  if (!isOpen || !drawing) return null;

  const fileName = drawing.originalFilename || drawing.originalName || drawing.filename;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900">
      {/* CAD风格顶部工具栏 */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        {/* 左侧：文件信息 */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white text-sm font-medium">{fileName}</div>
              <div className="text-gray-400 text-xs">
                版本 {drawing.version} • {drawing.uploader?.name || '未知用户'}
              </div>
            </div>
          </div>
        </div>

        {/* 中间：状态指示器 */}
        <div className="flex items-center space-x-6">
          {isLoading && (
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm">解析中...</span>
            </div>
          )}
          
          {analysisData && !isLoading && (
            <div className="flex items-center space-x-6 text-gray-300 text-sm">
              <div className="flex items-center space-x-1">
                <Squares2X2Icon className="w-4 h-4" />
                <span>{analysisData.statistics.totalEntities} 实体</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>{analysisData.statistics.layerCount} 图层</span>
              </div>
              {analysisData.statistics.fileSize && (
                <div className="flex items-center space-x-1">
                  <span>{analysisData.statistics.fileSize}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧：工具栏按钮 */}
        <div className="flex items-center space-x-2">
          {/* 信息面板切换 */}
          <button
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            className={`p-2 rounded transition-colors ${
              showInfoPanel 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="信息面板"
          >
            <InformationCircleIcon className="w-5 h-5" />
          </button>

          {/* 全屏指示 */}
          <div className="p-2 text-green-400" title="全屏模式">
            <ArrowsPointingOutIcon className="w-5 h-5" />
          </div>

          {/* 分隔线 */}
          <div className="w-px h-6 bg-gray-600 mx-2"></div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-red-600 rounded transition-colors"
            title="关闭 (ESC)"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* DXF显示区域 */}
        <div className="flex-1 relative bg-black">
          <DxfDataAnalyzer
            drawing={drawing}
            onAnalysisComplete={handleDxfAnalysis}
            onAnalysisError={handleAnalysisError}
            isLoading={isLoading}
          />
          
          {/* CAD风格加载状态 */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <DocumentTextIcon className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <h3 className="text-white text-lg font-medium mb-2">正在解析DXF文件</h3>
                <p className="text-gray-400 text-sm">使用专业解析引擎分析图纸结构...</p>
                <div className="mt-4 w-64 h-1 bg-gray-700 rounded overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* CAD风格错误状态 */}
          {error && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XMarkIcon className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-3">图纸解析失败</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">{error}</p>
                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    重新解析
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CAD风格坐标系指示器 */}
          {!isLoading && !error && (
            <div className="absolute bottom-4 left-4">
              <div className="bg-gray-800/80 backdrop-blur rounded p-2">
                <svg width="40" height="40" viewBox="0 0 40 40" className="text-white">
                  {/* X轴 */}
                  <line x1="5" y1="35" x2="25" y2="35" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  <text x="27" y="39" fontSize="10" fill="currentColor">X</text>
                  
                  {/* Y轴 */}
                  <line x1="5" y1="35" x2="5" y2="15" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  <text x="2" y="12" fontSize="10" fill="currentColor">Y</text>
                  
                  {/* 箭头定义 */}
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                    </marker>
                  </defs>
                </svg>
              </div>
            </div>
          )}
        </div>
        
        {/* 信息面板 */}
        {showInfoPanel && (
          <div className="w-80 border-l border-gray-700 bg-gray-800">
            <DxfInfoPanel
              analysisData={analysisData}
              isLoading={isLoading}
              drawing={drawing}
              onDownload={handleDownload}
              className="h-full bg-gray-800 border-gray-700"
            />
          </div>
        )}
      </div>

      {/* CAD风格状态栏 */}
      <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4 text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>就绪</span>
          {analysisData && (
            <>
              <span>•</span>
              <span>解析引擎: dxf-parser + dxf-viewer</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedDxfModal;
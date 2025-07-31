'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { Loading } from '@/components/ui';
interface Drawing {
  id: number;
  projectId: number;
  filename: string;
  originalFilename?: string;
  filePath: string;
  version: string;
  createdAt: string;
  uploader?: { id: number; name: string };
}

interface CADPreviewProps {
  filePath?: string;
  drawingId?: number;
  drawing?: Drawing; // 直接传递完整的图纸信息
  width?: number;
  height?: number;
  className?: string;
  onError?: (error: string) => void;
  onLoad?: () => void;
  enableInteraction?: boolean; // 是否启用交互功能（缩放、平移）
  showToolbar?: boolean; // 是否显示工具栏
}

export const CADPreview: React.FC<CADPreviewProps> = ({
  filePath,
  drawingId,
  drawing,
  width = 300,
  height = 200,
  className = '',
  onError,
  onLoad,
  enableInteraction = false,
  showToolbar = false
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerInstance, setViewerInstance] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!drawingId && !filePath && !drawing) {
      setError('未提供图纸ID、文件路径或图纸信息');
      setLoading(false);
      return;
    }

    // 如果需要API调用但没有token，等待token加载
    if ((drawing?.id || drawingId) && !token) {
      // 等待token加载
      return;
    }

    loadDxfViewer();
  }, [drawingId, filePath, drawing, token]);

  const loadDxfViewer = async () => {
    let mounted = true;

    try {
      setLoading(true);
      setError(null);

      console.log('🎯 开始加载DXF预览', { 
        drawing: drawing?.id, 
        drawingId, 
        filePath, 
        hasToken: !!token 
      });

      // 动态导入 dxf-viewer
      const { DxfViewer } = await import('dxf-viewer');
      
      if (!mounted || !containerRef.current) {
        console.log('⚠️ 组件已卸载或容器不存在');
        return;
      }

      // 清理容器
      containerRef.current.innerHTML = '';

      // 创建查看器实例 - 使用简化的配置
      const viewer = new DxfViewer(containerRef.current, {
        autoResize: true,
        colorCorrection: true
        // 移除不支持的canvasOptions
      });

      setViewerInstance(viewer);
      console.log('✅ DXF查看器创建成功');

      // 获取DXF文件内容
      let dxfContent: string;
      
      if (drawing?.id || drawingId) {
        const id = drawing?.id || drawingId;
        
        if (!token) {
          throw new Error('认证令牌未获取到，请重新登录');
        }
        
        console.log('📡 开始获取DXF内容，图纸ID:', id);
        
        // 通过API获取图纸内容
        const response = await apiRequest(`/api/drawings/${id}/content`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        console.log('📡 API响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('认证失败，请重新登录');
          }
          throw new Error(`获取图纸内容失败: ${response.status}`);
        }
        
        dxfContent = await response.text();
        console.log('📄 DXF内容获取成功，长度:', dxfContent.length);
      } else if (filePath) {
        // 直接读取文件路径（开发模式）
        const response = await apiRequest(filePath);
        if (!response.ok) {
          throw new Error('读取DXF文件失败');
        }
        dxfContent = await response.text();
      } else {
        throw new Error('无效的参数');
      }

      // 加载DXF到查看器
      console.log('🎨 开始加载DXF到查看器...');
      await viewer.Load({
        url: `data:application/dxf;charset=utf-8,${encodeURIComponent(dxfContent)}`,
        // 使用简化的字体配置 - 只使用URL数组格式
        fonts: [
          '/fonts/NotoSansSC-Thin.ttf'
        ],
        progressCbk: (phase: string, receivedBytes: number, totalBytes: number) => {
          console.log(`📊 加载进度: ${phase} - ${receivedBytes}/${totalBytes}`);
        },
        workerFactory: undefined
      } as any);
      console.log('✅ DXF加载到查看器完成');

      if (mounted) {
        setLoading(false);
        onLoad?.();
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载DXF文件失败';
      console.error('DXF加载失败:', errorMessage, err);
      if (mounted) {
        setError(errorMessage);
        setLoading(false);
        onError?.(errorMessage);
      }
    }

    return () => {
      mounted = false;
      if (viewerInstance && viewerInstance.Dispose) {
        viewerInstance.Dispose();
      }
    };
  };

  // 工具栏组件已移除
  const renderToolbar = () => {
    return null;
  };

  if (loading) {
    return (
      <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`} style={{ width, height }}>
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-500">加载DXF预览中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`} style={{ width, height }}>
        <div className="w-full h-full flex items-center justify-center bg-red-50">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative border border-gray-200 rounded-lg overflow-hidden ${className}`} style={{ width, height }}>
      {renderToolbar()}
      <div 
        ref={containerRef} 
        className="w-full h-full dxf-viewer-container"
        style={{ background: '#ffffff' }}
      />
    </div>
  );
};
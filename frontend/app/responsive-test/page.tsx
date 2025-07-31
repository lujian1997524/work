'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';
import { useTouch } from '@/hooks/useTouch';
import { usePerformance } from '@/hooks/usePerformance';
import { Button, Card } from '@/components/ui';
import { ResponsiveMainLayout } from '@/components/layout/ResponsiveMainLayout';
import { ResponsiveHeader } from '@/components/layout/ResponsiveHeader';
import { EnhancedMobileTable } from '@/components/materials/EnhancedMobileTable';

export default function ResponsiveTestPage() {
  const { device, isMobile, isTablet, isDesktop } = useResponsive();
  const { metrics, isLowPerformanceMode, optimizationSuggestions } = usePerformance();
  const [testResults, setTestResults] = useState<string[]>([]);

  // 触摸测试
  const touchHandlers = useTouch({
    onTap: (point) => {
      addTestResult(`点击测试: 坐标 (${point.x}, ${point.y})`);
    },
    onSwipe: (swipe) => {
      addTestResult(`滑动测试: ${swipe.direction} 方向，距离 ${Math.round(swipe.distance)}px`);
    },
    onLongPress: (point) => {
      addTestResult(`长按测试: 坐标 (${point.x}, ${point.y})`);
    },
    onPinch: (pinch) => {
      addTestResult(`缩放测试: 缩放比例 ${pinch.scale.toFixed(2)}`);
    }
  });

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  // 模拟项目数据
  const mockProjects = [
    {
      id: 1,
      name: '测试项目 A',
      status: 'in_progress',
      priority: 'high',
      assignedWorker: { name: '张三' },
      drawings: []
    },
    {
      id: 2,
      name: '测试项目 B',
      status: 'completed',
      priority: 'medium',
      assignedWorker: { name: '李四' },
      drawings: [{ id: 1, name: 'drawing1.dxf' }]
    }
  ];

  const mockThicknessSpecs = [
    { id: 1, thickness: '2', unit: 'mm' },
    { id: 2, thickness: '3', unit: 'mm' },
    { id: 3, thickness: '4', unit: 'mm' },
    { id: 4, thickness: '5', unit: 'mm' }
  ];

  return (
    <ResponsiveMainLayout
      header={
        <ResponsiveHeader
          onMenuClick={() => addTestResult('移动端菜单点击测试')}
          onSearchResults={(results) => addTestResult(`搜索测试: ${results.length} 个结果`)}
        />
      }
      sidebar={
        <Card className="p-4 h-full">
          <h3 className="font-medium mb-4">响应式测试</h3>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">设备信息</h4>
              <div className="text-xs space-y-1">
                <div>设备类型: <span className="font-mono">{device}</span></div>
                <div>窗口宽度: <span className="font-mono">{typeof window !== 'undefined' ? window.innerWidth : 'N/A'}px</span></div>
                <div>移动端: <span className={isMobile ? 'text-green-600' : 'text-red-600'}>{isMobile ? '是' : '否'}</span></div>
                <div>平板端: <span className={isTablet ? 'text-green-600' : 'text-red-600'}>{isTablet ? '是' : '否'}</span></div>
                <div>桌面端: <span className={isDesktop ? 'text-green-600' : 'text-red-600'}>{isDesktop ? '是' : '否'}</span></div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">性能信息</h4>
              <div className="text-xs space-y-1">
                <div>渲染时间: <span className="font-mono">{metrics.renderTime.toFixed(0)}ms</span></div>
                <div>内存使用: <span className="font-mono">{metrics.memoryUsage?.toFixed(1) || 'N/A'}MB</span></div>
                <div>网络请求: <span className="font-mono">{metrics.networkRequests}</span></div>
                <div>低性能模式: <span className={isLowPerformanceMode ? 'text-yellow-600' : 'text-green-600'}>{isLowPerformanceMode ? '启用' : '关闭'}</span></div>
              </div>
            </div>
          </div>
        </Card>
      }
      bottomNavigation={
        <div className="p-4">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-2">移动端底部导航测试</p>
            <div className="flex justify-around">
              <Button size="xs" onClick={() => addTestResult('底部导航 - 按钮1')}>按钮1</Button>
              <Button size="xs" onClick={() => addTestResult('底部导航 - 按钮2')}>按钮2</Button>
              <Button size="xs" onClick={() => addTestResult('底部导航 - 按钮3')}>按钮3</Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        {/* 触摸测试区域 */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">触摸手势测试</h3>
          <motion.div
            ref={touchHandlers.ref as React.RefObject<HTMLDivElement>}
            className="h-32 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <p className="text-center text-gray-700">
              {isMobile ? '在此区域进行触摸测试' : '点击此区域进行交互测试'}
              <br />
              <span className="text-xs">
                {isMobile ? '支持: 点击、滑动、长按、缩放' : '支持: 点击、长按'}
              </span>
            </p>
          </motion.div>
          
          {touchHandlers.touchState.isActive && (
            <div className="mt-2 text-xs text-blue-600">
              触摸活跃 - {touchHandlers.touchState.touchCount} 个触摸点
            </div>
          )}
        </Card>

        {/* 测试结果 */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">测试结果 (最近10条)</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无测试结果</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                  {result}
                </div>
              ))
            )}
          </div>
          <Button 
            size="sm" 
            onClick={() => setTestResults([])} 
            className="mt-3"
            disabled={testResults.length === 0}
          >
            清空结果
          </Button>
        </Card>

        {/* 响应式表格测试 */}
        {isMobile && (
          <Card className="p-4">
            <h3 className="font-medium mb-4">移动端表格测试</h3>
            <EnhancedMobileTable
              projects={mockProjects}
              thicknessSpecs={mockThicknessSpecs}
              viewType="active"
              getProjectMaterialStatusForTable={() => 'pending'}
              updateMaterialStatusInTable={() => addTestResult('材料状态更新测试')}
              onProjectSelect={(id) => addTestResult(`项目选择测试: ${id}`)}
              handleMoveToPast={(id) => addTestResult(`移至过往测试: ${id}`)}
              handleRestoreFromPast={(id) => addTestResult(`恢复项目测试: ${id}`)}
              movingToPast={null}
              restoringFromPast={null}
              getStatusText={(status) => status}
              getPriorityColorBadge={() => 'bg-blue-500'}
              getPriorityText={(priority) => priority}
            />
          </Card>
        )}

        {/* 性能优化建议 */}
        {optimizationSuggestions.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium text-orange-700 mb-3">性能优化建议</h3>
            <ul className="space-y-2">
              {optimizationSuggestions.map((suggestion, index) => (
                <li key={index} className="text-sm text-orange-600 flex items-start">
                  <span className="mr-2">⚠️</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* 功能测试按钮 */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">功能测试</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              onClick={() => addTestResult('按钮点击测试')}
            >
              点击测试
            </Button>
            <Button 
              size="sm" 
              onClick={() => window.navigator.vibrate?.(100)}
            >
              震动测试
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                if ('share' in navigator) {
                  navigator.share({
                    title: '激光切割管理系统',
                    text: '响应式测试页面',
                    url: window.location.href
                  });
                } else {
                  addTestResult('分享功能不支持');
                }
              }}
            >
              分享测试
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                document.documentElement.requestFullscreen?.();
                addTestResult('全屏模式测试');
              }}
            >
              全屏测试
            </Button>
          </div>
        </Card>
      </div>
    </ResponsiveMainLayout>
  );
}
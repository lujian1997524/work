'use client';

import React from 'react';
import { ResponsiveDrawingList } from '@/components/drawings';

export default function DrawingsTableTest() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">图纸表格视图测试</h1>
          <p className="mt-2 text-gray-600">
            测试表格形式的图纸列表组件，支持桌面端表格和移动端适配
          </p>
        </div>
        
        <ResponsiveDrawingList 
          showProjectColumn={true}
          className="mb-8"
        />
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">功能特性</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 桌面端：完整表格视图，支持排序、搜索、筛选</li>
            <li>• 移动端：优化的列表视图，可展开查看详细信息</li>
            <li>• DXF预览：集成原有的DXF预览功能</li>
            <li>• 文件操作：上传、下载、删除功能</li>
            <li>• 响应式设计：自动适配不同屏幕尺寸</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
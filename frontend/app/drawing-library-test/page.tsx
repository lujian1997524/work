'use client';

import React, { useState } from 'react';
import { DrawingLibrary } from '@/components/drawings';

export default function DrawingLibraryTest() {
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">图纸库组件测试</h1>
          <p className="mt-2 text-gray-600">
            测试表格形式的图纸列表组件，已移除卡片视图，统一使用表格视图
          </p>
          <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
            <span>当前视图模式: <strong>表格视图（统一）</strong></span>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              打开上传模态框
            </button>
          </div>
        </div>
        
        <DrawingLibrary 
          className="h-[800px]"
          showUploadModal={showUploadModal}
          onUploadModalChange={setShowUploadModal}
          enableBatchOperations={true}
        />
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">更新功能特性</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• ✅ 统一表格视图：移除卡片视图，所有图纸统一使用表格显示</li>
            <li>• ✅ 修复下载功能：使用正确的 downloadDrawingWeb 函数处理下载</li>
            <li>• ✅ 归档图纸：归档图纸按月份分组，同样使用表格视图</li>
            <li>• ✅ 移动端适配：表格视图在移动端自动切换为列表视图</li>
            <li>• ✅ 集成预览：DXF预览功能完全集成</li>
            <li>• ✅ 认证下载：正确处理JWT认证和blob下载</li>
            <li>• ✅ 响应式设计：桌面端和移动端优化</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
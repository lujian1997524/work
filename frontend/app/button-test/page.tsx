/**
 * 图纸预览按钮测试页面 - 验证高级预览按钮是否显示
 */

'use client'

import React, { useState } from 'react';
import { EyeIcon, FireIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import AdvancedDxfModal from '@/components/ui/advanced-dxf/AdvancedDxfModal';

export default function ButtonTest() {
  const [showAdvancedPreview, setShowAdvancedPreview] = useState(false);
  
  const testDrawing = {
    id: 1,
    filename: 'test.dxf',
    originalFilename: 'test.dxf',
    filePath: 'test.dxf',
    version: '1.0'
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">图纸预览按钮测试</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">按钮样式测试</h2>
          
          {/* 模拟表格行中的按钮组 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">表格中的图纸操作按钮</h3>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">test.dxf</h4>
                <p className="text-sm text-gray-500">版本 1.0</p>
              </div>
              
              <div className="flex items-center justify-end space-x-2">
                {/* 基础预览按钮 */}
                <button
                  className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                  title="预览"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                
                {/* 🔥 高级预览按钮 */}
                <button
                  onClick={() => setShowAdvancedPreview(true)}
                  className="text-orange-600 hover:text-orange-900 p-1 rounded-md hover:bg-orange-50"
                  title="🔥 高级预览"
                >
                  <FireIcon className="w-4 h-4" />
                </button>
                
                {/* 下载按钮 */}
                <button
                  className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50"
                  title="下载"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
                
                {/* 删除按钮 */}
                <button
                  className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                  title="删除"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* 单独的按钮测试 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">单独按钮测试</h3>
            <div className="flex flex-wrap gap-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <EyeIcon className="w-4 h-4" />
                <span>基础预览</span>
              </button>
              
              <button 
                onClick={() => setShowAdvancedPreview(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <FireIcon className="w-4 h-4" />
                <span>🔥 高级预览</span>
              </button>
              
              <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>下载</span>
              </button>
              
              <button className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <TrashIcon className="w-4 h-4" />
                <span>删除</span>
              </button>
            </div>
          </div>
          
          {/* 图标显示测试 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">图标显示测试</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <EyeIcon className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">基础预览</p>
              </div>
              <div className="text-center">
                <FireIcon className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                <p className="text-sm text-gray-600">高级预览</p>
              </div>
              <div className="text-center">
                <ArrowDownTrayIcon className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-gray-600">下载</p>
              </div>
              <div className="text-center">
                <TrashIcon className="w-8 h-8 mx-auto text-red-600 mb-2" />
                <p className="text-sm text-gray-600">删除</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-medium mb-2">测试说明</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• 如果你能看到橙色的火焰图标（🔥），说明高级预览按钮已正确添加</li>
              <li>• 点击"🔥 高级预览"按钮会打开高级DXF预览模态框</li>
              <li>• 这个功能与现有的基础预览完全隔离</li>
              <li>• 在实际使用中，这些按钮出现在图纸表格的操作列中</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 高级DXF预览模态框 */}
      <AdvancedDxfModal
        isOpen={showAdvancedPreview}
        onClose={() => setShowAdvancedPreview(false)}
        fileUrl="/test.dxf"
        fileName="test.dxf"
      />
    </div>
  );
}
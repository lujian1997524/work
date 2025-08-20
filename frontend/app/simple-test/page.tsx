/**
 * 简单的高级预览测试 - 验证按钮和模态框
 */

'use client'

import React, { useState } from 'react';
import { FireIcon, EyeIcon } from '@heroicons/react/24/outline';

// 简化的高级预览模态框
const SimpleAdvancedModal = ({ isOpen, onClose, fileName }: { 
  isOpen: boolean; 
  onClose: () => void; 
  fileName: string; 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-2xl mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">🔥 高级DXF预览</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FireIcon className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">高级预览功能已激活！</h3>
          <p className="text-gray-600 mb-4">文件: {fileName}</p>
          <div className="bg-orange-50 rounded-lg p-4 text-sm text-orange-800">
            <p className="font-medium mb-2">✅ 功能特性:</p>
            <ul className="text-left space-y-1">
              <li>• dxf-parser 深度解析</li>
              <li>• 图层管理和控制</li>
              <li>• 实体统计分析</li>
              <li>• 边界计算</li>
              <li>• 完全独立于基础预览</li>
            </ul>
          </div>
          <button 
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SimpleTest() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBasic, setShowBasic] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">图纸预览按钮测试</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">预览功能对比</h2>
          
          {/* 模拟图纸条目 */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">sample-drawing.dxf</h3>
                <p className="text-sm text-gray-500">版本 1.0 • 34.2 KB</p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* 基础预览按钮 */}
                <button
                  onClick={() => setShowBasic(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>基础预览</span>
                </button>
                
                {/* 高级预览按钮 */}
                <button
                  onClick={() => setShowAdvanced(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <FireIcon className="w-4 h-4" />
                  <span>🔥 高级预览</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* 功能说明 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-blue-900 font-medium mb-2 flex items-center">
                <EyeIcon className="w-5 h-5 mr-2" />
                基础预览
              </h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• 使用 dxf-viewer</li>
                <li>• 基础文件显示</li>
                <li>• 简单缩放平移</li>
                <li>• 现有功能保持不变</li>
              </ul>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-orange-900 font-medium mb-2 flex items-center">
                <FireIcon className="w-5 h-5 mr-2" />
                高级预览
              </h3>
              <ul className="text-orange-800 text-sm space-y-1">
                <li>• 使用 dxf-parser + dxf-viewer</li>
                <li>• 详细结构分析</li>
                <li>• 图层管理控制</li>
                <li>• 实体统计信息</li>
                <li>• 边界和尺寸计算</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-800 font-medium mb-2">✅ 架构优势</h3>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• 完全隔离设计，两个功能独立运行</li>
              <li>• 高级预览可以安全删除而不影响基础功能</li>
              <li>• 用户可以自由选择使用哪种预览方式</li>
              <li>• 渐进式增强，为现有系统添加专业功能</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 基础预览模态框（模拟）*/}
      {showBasic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBasic(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <div className="text-center py-8">
              <EyeIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">基础预览</h3>
              <p className="text-gray-600 mb-4">这里会显示原有的dxf-viewer预览</p>
              <button 
                onClick={() => setShowBasic(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 高级预览模态框 */}
      <SimpleAdvancedModal
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        fileName="sample-drawing.dxf"
      />
    </div>
  );
}
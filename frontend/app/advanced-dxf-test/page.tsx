/**
 * 高级DXF预览测试页面
 */

'use client'

import React, { useState } from 'react';
import AdvancedDxfModal from '@/components/ui/advanced-dxf/AdvancedDxfModal';
import { Button } from '@/components/ui';

export default function AdvancedDxfTest() {
  const [isOpen, setIsOpen] = useState(false);
  
  // 测试用的DXF文件URL（假设存在）
  const testFileUrl = '/test-sample.dxf';
  const testFileName = 'test-sample.dxf';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔥 高级DXF预览测试</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">功能测试</h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setIsOpen(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                🔥 打开高级预览
              </Button>
              <span className="text-gray-600">测试高级DXF预览功能</span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">功能特性</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ 使用 dxf-parser 解析DXF文件结构</li>
                <li>✅ 使用 dxf-viewer 进行高质量渲染</li>
                <li>✅ 显示详细的图层信息和实体统计</li>
                <li>✅ 边界框计算和文件分析</li>
                <li>✅ 完全独立的模态框，不影响现有预览功能</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">架构优势</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>🔒 完全隔离：与现有DxfPreviewModal完全分离</li>
                <li>🛡️ 安全删除：可以安全移除而不影响现有功能</li>
                <li>🔄 双重选择：用户可以选择使用基础预览或高级预览</li>
                <li>🚀 渐进增强：为现有系统添加增强功能</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 高级DXF预览模态框 */}
      <AdvancedDxfModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fileUrl={testFileUrl}
        fileName={testFileName}
      />
    </div>
  );
}
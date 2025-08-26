'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { 
  CloudArrowUpIcon, 
  DocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button, Loading } from '@/components/ui';

interface DrawingUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  onSuccess?: () => void;
}

export const DrawingUploadModal: React.FC<DrawingUploadModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSuccess
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  if (!isOpen) return null;

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return ['dxf', 'dwg', 'pdf'].includes(extension || '');
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        if (projectId) {
          formData.append('projectId', projectId.toString());
        }
        formData.append('version', '1.0');

        const response = await apiRequest('/api/drawings/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`上传 ${file.name} 失败`);
        }
      }

      onSuccess?.();
      onClose();
      setSelectedFiles([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">上传图纸</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* 拖拽上传区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              拖拽文件到这里，或点击选择文件
            </p>
            <p className="text-sm text-gray-500">
              支持 DXF、DWG、PDF 格式，单个文件最大 50MB
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".dxf,.dwg,.pdf"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* 选中的文件列表 */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                已选择的文件 ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center flex-1 min-w-0">
                      <DocumentIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-3 p-1 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={uploading}
          >
            取消
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="flex items-center space-x-2"
          >
            {uploading ? (
              <>
                <Loading size="sm" />
                <span>上传中...</span>
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="w-4 h-4" />
                <span>上传 ({selectedFiles.length})</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // 字节
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelect,
  accept = '.pdf,.jpg,.jpeg,.png,.dwg,.dxf',
  maxSize = 10 * 1024 * 1024, // 10MB
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState('');

  // 验证文件
  const validateFile = (file: File): string | null => {
    // 检查文件大小
    if (file.size > maxSize) {
      return `文件大小超过限制（最大 ${Math.round(maxSize / 1024 / 1024)}MB）`;
    }

    // 检查文件类型
    const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return `不支持的文件类型。支持的格式：${allowedExtensions.join(', ')}`;
    }

    return null;
  };

  // 处理文件选择
  const handleFile = useCallback((file: File) => {
    setError('');
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    onFileSelect(file);
  }, [onFileSelect, maxSize, accept]);

  // 拖拽事件处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 只有当拖拽离开整个dropzone区域时才设置为false
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragActive(false);
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragActive(false);
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]); // 只处理第一个文件
    }
  }, [handleFile]);

  // 文件输入处理
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // 清空input值，允许重复选择同一文件
    e.target.value = '';
  }, [handleFile]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isDragActive ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        `}
        whileHover={{ scale: isDragOver ? 1.05 : 1.02 }}
        whileTap={{ scale: 0.98 }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {isDragOver ? (
            <motion.div
              key="drag-active"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-blue-500"
            >
              <div className="text-6xl mb-4">📤</div>
              <h3 className="text-lg font-semibold mb-2">释放文件以上传</h3>
              <p className="text-sm">支持的格式：PDF, JPG, PNG, DWG, DXF</p>
            </motion.div>
          ) : (
            <motion.div
              key="drag-inactive"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-gray-500"
            >
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                点击选择文件或拖拽到此处
              </h3>
              <p className="text-sm text-text-secondary mb-2">
                支持格式：PDF, JPG, PNG, DWG, DXF
              </p>
              <p className="text-xs text-text-tertiary">
                最大文件大小：{formatFileSize(maxSize)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 拖拽指示器 */}
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-xl flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full"
            />
          </motion.div>
        )}
      </motion.div>

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
          >
            ❌ {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
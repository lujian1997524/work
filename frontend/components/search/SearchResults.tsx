'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Loading } from '@/components/ui';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchResult {
  id: number;
  name?: string;
  filename?: string;
  description?: string;
  status?: string;
  priority?: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string; department: string };
  project?: { id: number; name: string };
  uploader?: { id: number; name: string };
  createdAt: string;
  updatedAt?: string;
  type: 'project' | 'worker' | 'drawing';
}

interface SearchResultsProps {
  results: {
    projects: SearchResult[];
    workers: SearchResult[];
    drawings: SearchResult[];
    total: number;
  };
  query: string;
  loading?: boolean;
  onResultClick?: (result: SearchResult) => void;
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  loading = false,
  onResultClick,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <Loading size="lg" text="正在搜索中..." />
        </div>
      </div>
    );
  }

  if (results.total === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="w-16 h-16 mb-4 text-gray-400 mx-auto" />
          <h3 className="text-lg font-medium text-text-primary mb-2">
            未找到相关结果
          </h3>
          <p className="text-text-secondary">
            尝试使用其他关键词或检查拼写是否正确
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery) return text;
    
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* 搜索统计 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">
          搜索结果 ({results.total} 项)
        </h2>
        <div className="text-sm text-text-secondary">
          关键词: "{query}"
        </div>
      </div>

      {/* 项目结果 */}
      {results.projects.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-ios18-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="text-md font-medium text-text-primary">
              项目 ({results.projects.length})
            </h3>
          </div>
          
          <div className="space-y-3">
            {results.projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onResultClick?.(project)}
              >
                <Link href={`/?project=${project.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-text-primary mb-2">
                        {highlightText(project.name || '', query)}
                      </h4>
                      
                      {project.description && (
                        <p className="text-sm text-text-secondary mb-2">
                          {highlightText(project.description, query)}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-text-tertiary">
                        <span>创建者: {project.creator?.name}</span>
                        {project.assignedWorker && (
                          <span>负责人: {project.assignedWorker.name}</span>
                        )}
                        <span>创建时间: {formatDate(project.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      {project.status && (
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status === 'completed' && '已完成'}
                          {project.status === 'in_progress' && '进行中'}
                          {project.status === 'pending' && '待处理'}
                        </span>
                      )}
                      
                      {project.priority && (
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(project.priority)}`}>
                          {project.priority === 'high' && '高优先级'}
                          {project.priority === 'medium' && '中优先级'}
                          {project.priority === 'low' && '低优先级'}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* 工人结果 */}
      {results.workers.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="text-md font-medium text-text-primary">
              工人 ({results.workers.length})
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.workers.map((worker, index) => (
              <motion.div
                key={worker.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onResultClick?.(worker)}
              >
                <Link href={`/workers/${worker.id}`}>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {worker.name?.charAt(0)}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-text-primary">
                        {highlightText(worker.name || '', query)}
                      </h4>
                      
                      <div className="text-sm text-text-secondary space-y-1">
                        {worker.department && (
                          <div>{highlightText(worker.department, query)}</div>
                        )}
                        {worker.position && (
                          <div>{worker.position}</div>
                        )}
                        {worker.phone && (
                          <div className="text-xs text-text-tertiary">{worker.phone}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* 图纸结果 */}
      {results.drawings.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-md font-medium text-text-primary">
              图纸 ({results.drawings.length})
            </h3>
          </div>
          
          <div className="space-y-3">
            {results.drawings.map((drawing, index) => (
              <motion.div
                key={drawing.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onResultClick?.(drawing)}
              >
                <Link href={`/drawings?project=${drawing.project?.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-text-primary mb-2">
                        {highlightText(drawing.filename || '', query)}
                      </h4>
                      
                      {drawing.description && (
                        <p className="text-sm text-text-secondary mb-2">
                          {highlightText(drawing.description, query)}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-text-tertiary">
                        {drawing.project && (
                          <span>项目: {drawing.project.name}</span>
                        )}
                        <span>上传者: {drawing.uploader?.name}</span>
                        <span>上传时间: {formatDate(drawing.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-secondary">
                        v1.0
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
};
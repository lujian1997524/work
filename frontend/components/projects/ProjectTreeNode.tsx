'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedWorker?: {
    id: number;
    name: string;
    department?: string;
  };
}

interface TreeNode {
  id: string;
  title: string;
  type: 'group' | 'project';
  project?: Project;
  children?: TreeNode[];
  isExpanded?: boolean;
}

interface ProjectTreeNodeProps {
  node: TreeNode;
  selectedProjectId?: number;
  onProjectSelect: (project: Project) => void;
  onToggleExpand: (nodeId: string) => void;
  level?: number;
}

export function ProjectTreeNode({
  node,
  selectedProjectId,
  onProjectSelect,
  onToggleExpand,
  level = 0
}: ProjectTreeNodeProps) {
  const isGroup = node.type === 'group';
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.project && selectedProjectId === node.project.id;
  const isExpanded = node.isExpanded ?? true;

  // 根据项目状态获取状态指示器配置
  const getStatusConfig = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return {
          bgColor: 'bg-status-success',
          icon: (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L5.53 12.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.18 4.18c.39.39 1.02.39 1.41 0L20.29 6.71c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L9 16.17z"/>
            </svg>
          )
        };
      case 'in_progress':
        return {
          bgColor: 'bg-status-warning',
          icon: <div className="w-2 h-2 bg-white rounded-full"></div>
        };
      case 'pending':
        return {
          bgColor: 'border-2 border-gray-400 bg-transparent',
          icon: null
        };
      case 'cancelled':
        return {
          bgColor: 'bg-status-error',
          icon: (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.88c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/>
            </svg>
          )
        };
    }
  };

  // 根据优先级获取优先级标记颜色
  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-status-error';
      case 'high':
        return 'bg-status-warning';
      case 'medium':
        return 'bg-ios18-blue';
      case 'low':
        return 'bg-gray-400';
    }
  };

  const handleClick = () => {
    if (isGroup && hasChildren) {
      onToggleExpand(node.id);
    } else if (node.project) {
      onProjectSelect(node.project);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'ArrowRight' && isGroup && !isExpanded) {
      onToggleExpand(node.id);
    } else if (e.key === 'ArrowLeft' && isGroup && isExpanded) {
      onToggleExpand(node.id);
    }
  };

  return (
    <div className="select-none">
      {/* 节点内容 */}
      <motion.div
        className={`
          flex items-center px-3 py-2 rounded-ios-md cursor-pointer transition-all duration-200
          ${isSelected 
            ? 'bg-ios18-blue bg-opacity-20 border-l-4 border-ios18-blue' 
            : 'hover:bg-macos15-control'
          }
          ${level > 0 ? 'ml-4' : ''}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role={isGroup ? 'button' : 'treeitem'}
        aria-expanded={isGroup ? isExpanded : undefined}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {/* 展开/折叠图标 */}
        {isGroup && hasChildren && (
          <motion.div
            className="mr-2 text-text-secondary"
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.div>
        )}

        {/* 文件夹图标（分组）或项目状态指示器 */}
        {isGroup ? (
          <div className="mr-3 text-text-secondary">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
        ) : node.project && (
          <div className="mr-3 flex items-center space-x-2">
            {/* 状态指示器 */}
            <div className={`
              w-4 h-4 rounded-full flex items-center justify-center
              ${getStatusConfig(node.project.status).bgColor}
            `}>
              {getStatusConfig(node.project.status).icon}
            </div>
            
            {/* 优先级标记 */}
            <div className={`
              w-2 h-2 rounded-full
              ${getPriorityColor(node.project.priority)}
            `} />
          </div>
        )}

        {/* 节点标题 */}
        <div className="flex-1 min-w-0">
          <div className={`
            text-sm font-medium truncate
            ${isGroup ? 'text-text-primary' : isSelected ? 'text-ios18-blue' : 'text-text-primary'}
          `}>
            {node.title}
          </div>
          
          {/* 项目额外信息 */}
          {node.project && (
            <div className="text-xs text-text-secondary mt-1 space-y-1">
              {node.project.description && (
                <div className="truncate max-w-[200px]" title={node.project.description}>
                  {node.project.description}
                </div>
              )}
              {node.project.assignedWorker && (
                <div className="truncate">
                  负责人: {node.project.assignedWorker.name}
                  {node.project.assignedWorker.department && ` · ${node.project.assignedWorker.department}`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 项目计数（仅分组节点显示） */}
        {isGroup && hasChildren && (
          <div className="ml-2 px-2 py-1 text-xs bg-macos15-separator rounded-full text-text-secondary">
            {node.children!.length}
          </div>
        )}
      </motion.div>

      {/* 子节点 */}
      <AnimatePresence>
        {isGroup && hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {node.children!.map((childNode) => (
              <ProjectTreeNode
                key={childNode.id}
                node={childNode}
                selectedProjectId={selectedProjectId}
                onProjectSelect={onProjectSelect}
                onToggleExpand={onToggleExpand}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
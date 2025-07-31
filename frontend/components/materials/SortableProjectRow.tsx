'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StatusToggle, Button, TableCell } from '@/components/ui';
import type { StatusType } from '@/components/ui';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';

interface ThicknessSpec {
  id: number;
  thickness: string;
  unit: string;
  materialType: string;
  isActive: boolean;
  sortOrder: number;
}

interface Drawing {
  id: number;
  projectId: number;
  filename: string;
  originalFilename?: string;
  filePath: string;
  version: string;
  createdAt: string;
}

interface ProjectState {
  id: number;
  name: string;
  status: string;
  priority: string;
  createdAt: string;
  assignedWorker?: { id: number; name: string };
  materials?: any[];
  drawings?: Drawing[];
}

interface SortableProjectRowProps {
  project: ProjectState;
  index: number;
  thicknessSpecs: ThicknessSpec[];
  viewType: 'active' | 'completed';
  movingToPast: number | null;
  restoringFromPast: number | null;
  getProjectMaterialStatusForTable: (projectId: number, thicknessSpecId: number) => string;
  updateMaterialStatusInTable: (projectId: number, thicknessSpecId: number, newStatus: StatusType) => void;
  handleDrawingHover: (event: React.MouseEvent, drawings: Drawing[]) => void;
  handleCloseHover: () => void;
  onProjectSelect: (id: number | null) => void;
  handleMoveToPast: (projectId: number) => void;
  handleRestoreFromPast: (projectId: number) => void;
  getStatusText: (status: string) => string;
  getPriorityColorBadge: (priority: string) => string;
  getPriorityText: (priority: string) => string;
}

export const SortableProjectRow: React.FC<SortableProjectRowProps> = ({
  project,
  index,
  thicknessSpecs,
  viewType,
  movingToPast,
  restoringFromPast,
  getProjectMaterialStatusForTable,
  updateMaterialStatusInTable,
  handleDrawingHover,
  handleCloseHover,
  onProjectSelect,
  handleMoveToPast,
  handleRestoreFromPast,
  getStatusText,
  getPriorityColorBadge,
  getPriorityText
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 获取项目开始时间：第一个进入in_progress状态的材料时间
  const getProjectStartTime = (proj: ProjectState): string | null => {
    if (!proj.materials || proj.materials.length === 0) return null;
    
    // 筛选出有startDate且状态为in_progress或completed的材料
    const materialsWithStartDate = proj.materials.filter(material => 
      material.startDate && (material.status === 'in_progress' || material.status === 'completed')
    );
    
    if (materialsWithStartDate.length === 0) return null;
    
    // 找到最早的startDate
    const earliestStartDate = materialsWithStartDate.reduce((earliest, current) => {
      if (!earliest.startDate) return current;
      if (!current.startDate) return earliest;
      return new Date(current.startDate) < new Date(earliest.startDate) ? current : earliest;
    });
    
    return earliestStartDate.startDate || null;
  };

  // 获取项目完成时间：最后一个completed材料的时间，但如果有未完成任务则清空
  const getProjectCompletedTime = (proj: ProjectState): string | null => {
    if (!proj.materials || proj.materials.length === 0) return null;
    
    // 检查是否有未完成的材料（in_progress或pending状态）
    const hasIncompleteTask = proj.materials.some(material => 
      material.status === 'in_progress' || material.status === 'pending'
    );
    
    // 如果有未完成任务，返回null（显示-）
    if (hasIncompleteTask) return null;
    
    // 获取所有已完成材料中有completedDate的材料
    const completedMaterials = proj.materials.filter(material => 
      material.status === 'completed' && material.completedDate
    );
    
    if (completedMaterials.length === 0) return null;
    
    // 找到最晚的completedDate
    const latestCompletedDate = completedMaterials.reduce((latest, current) => {
      if (!latest.completedDate) return current;
      if (!current.completedDate) return latest;
      return new Date(current.completedDate) > new Date(latest.completedDate) ? current : latest;
    });
    
    return latestCompletedDate.completedDate || null;
  };

  const projectStartTime = getProjectStartTime(project);
  const projectCompletedTime = getProjectCompletedTime(project);

  return (
    <motion.tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`hover:bg-gray-50/50 transition-colors ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      {/* 序号 - 拖拽手柄 */}
      <TableCell>
        <div className="flex items-center space-x-2">
          <div 
            {...listeners}
            className="text-sm font-medium text-text-primary cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
            title="拖拽排序"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h.01M8 10h.01M8 14h.01M8 18h.01M16 6h.01M16 10h.01M16 14h.01M16 18h.01" />
            </svg>
          </div>
          <div className="text-sm font-medium text-text-primary">{index + 1}</div>
        </div>
      </TableCell>
      
      {/* 项目名 */}
      <TableCell>
        <div className="font-medium text-text-primary">{project.name}</div>
        <div className="text-xs flex items-center space-x-1">
          <span className="text-text-secondary">{getStatusText(project.status)}</span>
          <span className="text-text-secondary">•</span>
          <span className={`w-3 h-3 rounded-full ${getPriorityColorBadge(project.priority)}`} title={`${getPriorityText(project.priority)}优先级`}></span>
          <span className="text-text-secondary">•</span>
          <span className="text-text-secondary">{project.assignedWorker?.name || '未分配'}</span>
        </div>
      </TableCell>
      
      {/* 厚度状态列 */}
      {thicknessSpecs.map(spec => {
        const materialStatus = getProjectMaterialStatusForTable(project.id, spec.id);
        
        return (
          <TableCell key={spec.id} align="center" className="px-3 py-4">
            <StatusToggle
              status={materialStatus as StatusType}
              onChange={(newStatus) => {
                updateMaterialStatusInTable(project.id, spec.id, newStatus);
              }}
              size="md"
              disabled={viewType === 'completed'} // 过往项目禁用编辑
            />
          </TableCell>
        );
      })}
      
      {/* 创建时间 */}
      <TableCell>
        <div className="text-sm text-text-primary">
          {project.createdAt ? new Date(project.createdAt).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : '-'}
        </div>
      </TableCell>
      
      {/* 开始时间 */}
      <TableCell>
        <div className="text-sm text-text-primary">
          {projectStartTime ? new Date(projectStartTime).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : '-'}
        </div>
      </TableCell>
      
      {/* 完成时间 */}
      <TableCell>
        <div className="text-sm text-text-primary">
          {projectCompletedTime ? new Date(projectCompletedTime).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : '-'}
        </div>
      </TableCell>
      
      {/* 图纸 */}
      <TableCell>
        <div className="flex items-center space-x-1">
          {project.drawings && project.drawings.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              <span 
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded cursor-pointer hover:bg-blue-200 transition-colors"
                onMouseEnter={(e) => handleDrawingHover(e, (project.drawings as any[]).map(d => ({
                  id: d.id,
                  projectId: d.projectId,
                  filename: d.filename,
                  originalFilename: d.originalFilename,
                  filePath: d.filePath,
                  version: d.version,
                  createdAt: d.createdAt
                })))}
                onMouseLeave={handleCloseHover}
                onClick={() => onProjectSelect(project.id)}
                title={`查看 ${project.name} 的图纸详情`}
              >
                {project.drawings.length}个
              </span>
              <Button 
                onClick={() => onProjectSelect(project.id)}
                variant="ghost"
                size="sm"
                className="text-xs text-green-600 hover:text-green-800 hover:bg-green-50 px-1 py-1 rounded h-auto"
              >
                +
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => onProjectSelect(project.id)}
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded h-auto"
            >
              + 上传图纸
            </Button>
          )}
        </div>
      </TableCell>

      {/* 操作 */}
      <TableCell>
        <div className="flex items-center space-x-2">
          {/* 活跃项目视图：显示"移至过往"按钮 */}
          {project.status === 'completed' && viewType !== 'completed' && (
            <Button
              onClick={() => handleMoveToPast(project.id)}
              disabled={movingToPast === project.id}
              variant="ghost"
              size="sm"
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md h-auto"
            >
              <ArchiveBoxIcon className="w-3 h-3 mr-1" />
              {movingToPast === project.id ? '移动中...' : '移至过往'}
            </Button>
          )}
          
          {/* 过往项目视图：显示"恢复项目"按钮 */}
          {viewType === 'completed' && (
            <Button
              onClick={() => handleRestoreFromPast(project.id)}
              disabled={restoringFromPast === project.id}
              variant="ghost"
              size="sm"
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md h-auto"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {restoringFromPast === project.id ? '恢复中...' : '恢复项目'}
            </Button>
          )}
        </div>
      </TableCell>
    </motion.tr>
  );
};
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';
import { StatusToggle, Button, Card } from '@/components/ui';
import type { StatusType } from '@/components/ui';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { EnhancedMobileTable } from './EnhancedMobileTable';

interface ResponsiveMaterialsTableProps {
  projects: any[];
  thicknessSpecs: any[];
  viewType: 'active' | 'completed';
  movingToPast: number | null;
  restoringFromPast: number | null;
  getProjectMaterialStatusForTable: (projectId: number, thicknessSpecId: number) => string;
  updateMaterialStatusInTable: (projectId: number, thicknessSpecId: number, newStatus: StatusType) => void;
  handleDrawingHover: (event: React.MouseEvent, drawings: any[]) => void;
  handleCloseHover: () => void;
  onProjectSelect: (id: number | null) => void;
  handleMoveToPast: (projectId: number) => void;
  handleRestoreFromPast: (projectId: number) => void;
  getStatusText: (status: string) => string;
  getPriorityColorBadge: (priority: string) => string;
  getPriorityText: (priority: string) => string;
}

export const ResponsiveMaterialsTable: React.FC<ResponsiveMaterialsTableProps> = ({
  projects,
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
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // 桌面端：使用完整表格布局
  if (isDesktop) {
    return <DesktopTable {...{
      projects,
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
    }} />;
  }

  // 平板端：紧凑表格布局
  if (isTablet) {
    return <TabletTable {...{
      projects,
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
    }} />;
  }

  // 移动端：增强卡片布局
  return <EnhancedMobileTable {...{
    projects,
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
  }} />;
};

// 桌面端完整表格
const DesktopTable: React.FC<ResponsiveMaterialsTableProps> = (props) => {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">序号</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">项目名</th>
              {props.thicknessSpecs.map(spec => (
                <th key={spec.id} className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  {spec.thickness}{spec.unit}
                </th>
              ))}
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">创建时间</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">开始时间</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">完成时间</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">图纸</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {props.projects.map((project, index) => (
              <ProjectRowDesktop key={project.id} project={project} index={index} {...props} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 平板端紧凑表格
const TabletTable: React.FC<ResponsiveMaterialsTableProps> = (props) => {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm">
            <tr>
              <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-left min-w-[200px]">项目信息</th>
              <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center min-w-[300px]">厚度状态</th>
              <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {props.projects.map((project, index) => (
              <ProjectRowTablet key={project.id} project={project} index={index} {...props} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 移动端卡片布局
const MobileCardLayout: React.FC<ResponsiveMaterialsTableProps> = (props) => {
  return (
    <div className="space-y-3 px-2">
      {props.projects.map((project, index) => (
        <ProjectCardMobile key={project.id} project={project} index={index} {...props} />
      ))}
    </div>
  );
};

// 桌面端项目行组件
const ProjectRowDesktop: React.FC<{project: any, index: number} & ResponsiveMaterialsTableProps> = ({
  project, index, thicknessSpecs, viewType, getProjectMaterialStatusForTable, updateMaterialStatusInTable,
  handleDrawingHover, handleCloseHover, onProjectSelect, handleMoveToPast, handleRestoreFromPast,
  movingToPast, restoringFromPast, getStatusText, getPriorityColorBadge, getPriorityText
}) => {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="hover:bg-gray-50/50 transition-colors"
    >
      {/* 序号 */}
      <td className="px-4 py-4">
        <div className="text-sm font-medium text-text-primary">{index + 1}</div>
      </td>
      
      {/* 项目名 */}
      <td className="px-4 py-4">
        <div className="font-medium text-text-primary">{project.name}</div>
        <div className="text-xs flex items-center space-x-1">
          <span className="text-text-secondary">{getStatusText(project.status)}</span>
          <span className="text-text-secondary">•</span>
          <span className={`w-3 h-3 rounded-full ${getPriorityColorBadge(project.priority)}`}></span>
          <span className="text-text-secondary">•</span>
          <span className="text-text-secondary">{project.assignedWorker?.name || '未分配'}</span>
        </div>
      </td>
      
      {/* 厚度状态列 */}
      {thicknessSpecs.map(spec => {
        const materialStatus = getProjectMaterialStatusForTable(project.id, spec.id);
        return (
          <td key={spec.id} className="px-3 py-4 text-center">
            <StatusToggle
              status={materialStatus as StatusType}
              onChange={(newStatus) => updateMaterialStatusInTable(project.id, spec.id, newStatus)}
              size="md"
              disabled={viewType === 'completed'}
            />
          </td>
        );
      })}
      
      {/* 其他列... */}
      <td className="px-4 py-4">
        <div className="text-sm text-text-primary">
          {project.createdAt ? new Date(project.createdAt).toLocaleString('zh-CN') : '-'}
        </div>
      </td>
      
      {/* 简化其他列显示 */}
      <td className="px-4 py-4 text-sm text-text-primary">-</td>
      <td className="px-4 py-4 text-sm text-text-primary">-</td>
      <td className="px-4 py-4">
        {project.drawings && project.drawings.length > 0 ? (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {project.drawings.length}个
          </span>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => onProjectSelect(project.id)}>
            + 上传
          </Button>
        )}
      </td>
      
      <td className="px-4 py-4">
        {project.status === 'completed' && viewType !== 'completed' && (
          <Button
            onClick={() => handleMoveToPast(project.id)}
            disabled={movingToPast === project.id}
            variant="ghost"
            size="sm"
          >
            移至过往
          </Button>
        )}
        
        {viewType === 'completed' && (
          <Button
            onClick={() => handleRestoreFromPast(project.id)}
            disabled={restoringFromPast === project.id}
            variant="ghost"
            size="sm"
          >
            恢复项目
          </Button>
        )}
      </td>
    </motion.tr>
  );
};

// 平板端项目行组件
const ProjectRowTablet: React.FC<{project: any, index: number} & ResponsiveMaterialsTableProps> = ({
  project, index, thicknessSpecs, viewType, getProjectMaterialStatusForTable, updateMaterialStatusInTable,
  getStatusText, getPriorityColorBadge, handleMoveToPast, handleRestoreFromPast, movingToPast, restoringFromPast
}) => {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="hover:bg-gray-50/50 transition-colors"
    >
      {/* 项目信息列 */}
      <td className="px-3 py-3">
        <div className="font-medium text-text-primary text-sm">{project.name}</div>
        <div className="text-xs text-text-secondary mt-1">
          {getStatusText(project.status)} • {project.assignedWorker?.name || '未分配'}
        </div>
        <div className="flex items-center space-x-1 mt-1">
          <span className={`w-2 h-2 rounded-full ${getPriorityColorBadge(project.priority)}`}></span>
          <span className="text-xs text-text-secondary">#{index + 1}</span>
        </div>
      </td>
      
      {/* 厚度状态列 */}
      <td className="px-2 py-3">
        <div className="flex flex-wrap gap-1 justify-center">
          {thicknessSpecs.slice(0, 6).map(spec => { // 平板端限制显示数量
            const materialStatus = getProjectMaterialStatusForTable(project.id, spec.id);
            return (
              <div key={spec.id} className="flex flex-col items-center space-y-1">
                <StatusToggle
                  status={materialStatus as StatusType}
                  onChange={(newStatus) => updateMaterialStatusInTable(project.id, spec.id, newStatus)}
                  size="sm"
                  disabled={viewType === 'completed'}
                />
                <span className="text-xs text-text-secondary">{spec.thickness}</span>
              </div>
            );
          })}
          {thicknessSpecs.length > 6 && (
            <div className="text-xs text-text-secondary">+{thicknessSpecs.length - 6}</div>
          )}
        </div>
      </td>
      
      {/* 操作列 */}
      <td className="px-3 py-3 text-center">
        {project.status === 'completed' && viewType !== 'completed' && (
          <Button
            onClick={() => handleMoveToPast(project.id)}
            disabled={movingToPast === project.id}
            variant="ghost"
            size="xs"
          >
            移至过往
          </Button>
        )}
        
        {viewType === 'completed' && (
          <Button
            onClick={() => handleRestoreFromPast(project.id)}
            disabled={restoringFromPast === project.id}
            variant="ghost"
            size="xs"
          >
            恢复
          </Button>
        )}
      </td>
    </motion.tr>
  );
};

// 移动端项目卡片组件
const ProjectCardMobile: React.FC<{project: any, index: number} & ResponsiveMaterialsTableProps> = ({
  project, index, thicknessSpecs, viewType, getProjectMaterialStatusForTable, updateMaterialStatusInTable,
  onProjectSelect, handleMoveToPast, handleRestoreFromPast, movingToPast, restoringFromPast,
  getStatusText, getPriorityColorBadge, getPriorityText
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="p-4 space-y-3">
        {/* 卡片头部 */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-text-secondary">#{index + 1}</span>
              <span className={`w-2 h-2 rounded-full ${getPriorityColorBadge(project.priority)}`}></span>
            </div>
            <h3 className="font-medium text-text-primary text-sm mt-1 truncate">{project.name}</h3>
            <div className="text-xs text-text-secondary mt-1">
              {getStatusText(project.status)} • {project.assignedWorker?.name || '未分配'}
            </div>
          </div>
          
          {/* 图纸和操作按钮 */}
          <div className="flex flex-col space-y-1 ml-2">
            {project.drawings && project.drawings.length > 0 ? (
              <Button variant="ghost" size="xs" onClick={() => onProjectSelect(project.id)}>
                📁 {project.drawings.length}
              </Button>
            ) : (
              <Button variant="ghost" size="xs" onClick={() => onProjectSelect(project.id)}>
                + 图纸
              </Button>
            )}
          </div>
        </div>

        {/* 厚度状态网格 */}
        <div className="space-y-2">
          <div className="text-xs text-text-secondary font-medium">板材状态</div>
          <div className="grid grid-cols-4 gap-2">
            {thicknessSpecs.slice(0, 8).map(spec => { // 移动端显示前8个
              const materialStatus = getProjectMaterialStatusForTable(project.id, spec.id);
              return (
                <div key={spec.id} className="flex flex-col items-center space-y-1 p-2 bg-gray-50 rounded-lg">
                  <StatusToggle
                    status={materialStatus as StatusType}
                    onChange={(newStatus) => updateMaterialStatusInTable(project.id, spec.id, newStatus)}
                    size="sm"
                    disabled={viewType === 'completed'}
                  />
                  <span className="text-xs text-text-secondary">{spec.thickness}{spec.unit}</span>
                </div>
              );
            })}
          </div>
          
          {thicknessSpecs.length > 8 && (
            <div className="text-center">
              <Button variant="ghost" size="xs">
                查看更多 ({thicknessSpecs.length - 8}个)
              </Button>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {(project.status === 'completed' && viewType !== 'completed') || viewType === 'completed' ? (
          <div className="pt-2 border-t border-gray-200">
            {project.status === 'completed' && viewType !== 'completed' && (
              <Button
                onClick={() => handleMoveToPast(project.id)}
                disabled={movingToPast === project.id}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                {movingToPast === project.id ? '移动中...' : '移至过往'}
              </Button>
            )}
            
            {viewType === 'completed' && (
              <Button
                onClick={() => handleRestoreFromPast(project.id)}
                disabled={restoringFromPast === project.id}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {restoringFromPast === project.id ? '恢复中...' : '恢复项目'}
              </Button>
            )}
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
};
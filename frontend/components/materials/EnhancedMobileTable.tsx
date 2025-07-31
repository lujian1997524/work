'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { useSwipe, useLongPress } from '@/hooks/useTouch';
import { useResponsive } from '@/hooks/useResponsive';
import { StatusToggle, Button, Card } from '@/components/ui';
import type { StatusType } from '@/components/ui';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface EnhancedMobileTableProps {
  projects: any[];
  thicknessSpecs: any[];
  viewType: 'active' | 'completed';
  getProjectMaterialStatusForTable: (projectId: number, thicknessSpecId: number) => string;
  updateMaterialStatusInTable: (projectId: number, thicknessSpecId: number, newStatus: StatusType) => void;
  onProjectSelect: (id: number | null) => void;
  handleMoveToPast: (projectId: number) => void;
  handleRestoreFromPast: (projectId: number) => void;
  movingToPast: number | null;
  restoringFromPast: number | null;
  getStatusText: (status: string) => string;
  getPriorityColorBadge: (priority: string) => string;
  getPriorityText: (priority: string) => string;
}

// 增强的移动端项目卡片
const EnhancedProjectCard: React.FC<{
  project: any;
  index: number;
  thicknessSpecs: any[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  onRefresh?: () => void;
} & Omit<EnhancedMobileTableProps, 'projects'>> = ({
  project,
  index,
  thicknessSpecs,
  viewType,
  getProjectMaterialStatusForTable,
  updateMaterialStatusInTable,
  onProjectSelect,
  handleMoveToPast,
  handleRestoreFromPast,
  movingToPast,
  restoringFromPast,
  getStatusText,
  getPriorityColorBadge,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  onRefresh
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllThickness, setShowAllThickness] = useState(false);
  const [currentThicknessPage, setCurrentThicknessPage] = useState(0);
  const itemsPerPage = 4;
  
  // 滑动手势
  const swipeHandlers = useSwipe((swipe) => {
    switch (swipe.direction) {
      case 'left':
        onSwipeLeft?.();
        break;
      case 'right':
        onSwipeRight?.();
        break;
      case 'down':
        if (onRefresh) {
          onRefresh();
        }
        break;
      default:
        break;
    }
  }, 80);
  
  // 长按手势
  const longPressHandlers = useLongPress(() => {
    onLongPress?.();
  }, 600);
  
  // 合并触摸处理器
  const combinedRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const element = combinedRef.current;
    if (element) {
      // 将两个ref的事件处理器都绑定到同一元素
      const swipeElement = swipeHandlers.ref.current;
      const longPressElement = longPressHandlers.ref.current;
      
      if (swipeElement) {
        (swipeHandlers.ref as any).current = element;
      }
      if (longPressElement) {
        (longPressHandlers.ref as any).current = element;
      }
    }
  }, []);

  // 分页显示厚度规格
  const paginatedThickness = showAllThickness 
    ? thicknessSpecs 
    : thicknessSpecs.slice(
        currentThicknessPage * itemsPerPage, 
        (currentThicknessPage + 1) * itemsPerPage
      );
  
  const totalPages = Math.ceil(thicknessSpecs.length / itemsPerPage);
  const hasNextPage = currentThicknessPage < totalPages - 1;
  const hasPrevPage = currentThicknessPage > 0;

  return (
    <motion.div
      ref={combinedRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(event, info: PanInfo) => {
        // 实现滑动删除或归档功能
        if (info.offset.x > 100 && onSwipeRight) {
          onSwipeRight();
        } else if (info.offset.x < -100 && onSwipeLeft) {
          onSwipeLeft();
        }
      }}
      className="relative"
    >
      <Card className="p-4 space-y-3 select-none touch-manipulation">
        {/* 卡片头部 */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-text-secondary">#{index + 1}</span>
              <span className={`w-2 h-2 rounded-full ${getPriorityColorBadge(project.priority)}`}></span>
            </div>
            <motion.h3 
              className="font-medium text-text-primary text-sm mt-1 cursor-pointer"
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {project.name}
            </motion.h3>
            <div className="text-xs text-text-secondary mt-1">
              {getStatusText(project.status)} • {project.assignedWorker?.name || '未分配'}
            </div>
          </div>
          
          {/* 操作按钮 */}
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
          <div className="flex items-center justify-between">
            <div className="text-xs text-text-secondary font-medium">板材状态</div>
            {!showAllThickness && totalPages > 1 && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setCurrentThicknessPage(Math.max(0, currentThicknessPage - 1))}
                  disabled={!hasPrevPage}
                  className="p-1 h-6 w-6"
                >
                  <ChevronLeftIcon className="w-3 h-3" />
                </Button>
                <span className="text-xs text-text-secondary">
                  {currentThicknessPage + 1}/{totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setCurrentThicknessPage(Math.min(totalPages - 1, currentThicknessPage + 1))}
                  disabled={!hasNextPage}
                  className="p-1 h-6 w-6"
                >
                  <ChevronRightIcon className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          
          <motion.div 
            className="grid grid-cols-4 gap-2"
            animate={{ height: isExpanded ? 'auto' : 'auto' }}
          >
            {paginatedThickness.map(spec => {
              const materialStatus = getProjectMaterialStatusForTable(project.id, spec.id);
              return (
                <motion.div 
                  key={spec.id} 
                  className="flex flex-col items-center space-y-1 p-2 bg-gray-50 rounded-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <StatusToggle
                    status={materialStatus as StatusType}
                    onChange={(newStatus) => updateMaterialStatusInTable(project.id, spec.id, newStatus)}
                    size="sm"
                    disabled={viewType === 'completed'}
                  />
                  <span className="text-xs text-text-secondary">{spec.thickness}{spec.unit}</span>
                </motion.div>
              );
            })}
          </motion.div>
          
          {!showAllThickness && thicknessSpecs.length > itemsPerPage && (
            <div className="text-center">
              <Button 
                variant="ghost" 
                size="xs"
                onClick={() => setShowAllThickness(true)}
              >
                查看全部 ({thicknessSpecs.length}个)
              </Button>
            </div>
          )}
          
          {showAllThickness && (
            <div className="text-center">
              <Button 
                variant="ghost" 
                size="xs"
                onClick={() => setShowAllThickness(false)}
              >
                收起
              </Button>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <AnimatePresence>
          {((project.status === 'completed' && viewType !== 'completed') || viewType === 'completed') && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2 border-t border-gray-200"
            >
              {project.status === 'completed' && viewType !== 'completed' && (
                <Button
                  onClick={() => handleMoveToPast(project.id)}
                  disabled={movingToPast === project.id}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
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
                  {restoringFromPast === project.id ? '恢复中...' : '恢复项目'}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 滑动提示 */}
        {swipeHandlers.touchState.isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-green-500/10 rounded-lg pointer-events-none"
          />
        )}
      </Card>
    </motion.div>
  );
};

// 下拉刷新组件
const PullToRefresh: React.FC<{
  onRefresh: () => void;
  children: React.ReactNode;
}> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* 下拉刷新指示器 */}
      <AnimatePresence>
        {pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 flex justify-center p-2 bg-gray-50/80 backdrop-blur-sm"
            style={{ transform: `translateY(${pullDistance - 60}px)` }}
          >
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {isRefreshing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                  />
                  <span>刷新中...</span>
                </>
              ) : pullDistance > 60 ? (
                <span>松开刷新</span>
              ) : (
                <span>下拉刷新</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div style={{ paddingTop: pullDistance }}>
        {children}
      </motion.div>
    </div>
  );
};

export const EnhancedMobileTable: React.FC<EnhancedMobileTableProps> = (props) => {
  const { isMobile } = useResponsive();
  const [refreshing, setRefreshing] = useState(false);

  if (!isMobile) {
    return null; // 只在移动端使用
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    // 模拟刷新延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleSwipeLeft = (project: any) => {
    // 左滑快速归档
    if (props.viewType === 'active' && project.status === 'completed') {
      props.handleMoveToPast(project.id);
    }
  };

  const handleSwipeRight = (project: any) => {
    // 右滑查看详情
    props.onProjectSelect(project.id);
  };

  const handleLongPress = (project: any) => {
    // 长按显示操作菜单（可以通过context menu实现）
    console.log('长按项目:', project.name);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-3 px-2 pb-20"> {/* 底部留出空间给导航栏 */}
        {props.projects.map((project, index) => (
          <EnhancedProjectCard
            key={project.id}
            project={project}
            index={index}
            {...props}
            onSwipeLeft={() => handleSwipeLeft(project)}
            onSwipeRight={() => handleSwipeRight(project)}
            onLongPress={() => handleLongPress(project)}
            onRefresh={handleRefresh}
          />
        ))}
        
        {props.projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-gray-400 text-sm">暂无项目</div>
          </motion.div>
        )}
      </div>
    </PullToRefresh>
  );
};
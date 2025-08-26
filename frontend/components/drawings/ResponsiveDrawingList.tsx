'use client';

import React from 'react';
import { DrawingTable } from './DrawingTable';
import { MobileDrawingList } from './MobileDrawingList';

interface ResponsiveDrawingListProps {
  projectId?: number;
  showProjectColumn?: boolean;
  className?: string;
}

export const ResponsiveDrawingList: React.FC<ResponsiveDrawingListProps> = ({
  projectId,
  showProjectColumn = true,
  className = ''
}) => {
  return (
    <>
      {/* 桌面端表格视图 */}
      <div className="hidden md:block">
        <DrawingTable 
          projectId={projectId}
          showProjectColumn={showProjectColumn}
          className={className}
        />
      </div>
      
      {/* 移动端列表视图 */}
      <div className="block md:hidden">
        <MobileDrawingList 
          projectId={projectId}
          showProjectColumn={showProjectColumn}
          className={className}
        />
      </div>
    </>
  );
};
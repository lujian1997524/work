import React from 'react';
import { Button } from '@/components/ui';
import { 
  handleDrawingAction,
  detectPlatform
} from '@/utils/drawingHandlersPure';

interface Drawing {
  id: number;
  filename: string;
  version: string;
  filePath: string;
  projectId: number;
}

export interface DrawingActionProps {
  drawing: Drawing;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const DrawingActionButton: React.FC<DrawingActionProps> = ({
  drawing,
  variant = 'primary',
  size = 'md',
  showText = true
}) => {
  const platform = detectPlatform();
  
  const handleClick = async () => {
    try {
      await handleDrawingAction(drawing);
    } catch (error) {
      console.error('图纸操作失败:', error);
    }
  };
  
  const getButtonText = () => {
    if (platform.canOpenCADFiles) {
      return '打开图纸';
    }
    return '下载图纸';
  };
  
  const getButtonIcon = () => {
    if (platform.canOpenCADFiles) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className="flex items-center space-x-2"
      title={getButtonText()}
    >
      {getButtonIcon()}
      {showText && <span>{getButtonText()}</span>}
    </Button>
  );
};

// 高级操作按钮组件（桌面端专用）
export const DrawingAdvancedActions: React.FC<{drawing: Drawing}> = ({ drawing }) => {
  const platform = detectPlatform();
  
  if (!platform.canOpenCADFiles) {
    return null;
  }
  
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDrawingAction(drawing)}
        title="在CAD软件中打开"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDrawingAction(drawing)}
        title="保存到指定位置"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      </Button>
    </div>
  );
};
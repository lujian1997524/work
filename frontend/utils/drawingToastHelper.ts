// 图纸操作Toast辅助模块
// 用于在非React组件中触发图纸相关Toast提示

import React from 'react';

interface DrawingToastHelper {
  // 图纸上传相关Toast
  drawingUploaded: (filename: string, projectName?: string) => void;
  drawingUploadProgress: (filename: string, progress: number) => void;
  drawingUploadFailed: (filename: string, error: string) => void;
  batchUploadComplete: (successCount: number, totalCount: number) => void;
  
  // DXF处理相关Toast
  dxfParsed: (filename: string, details: string) => void;
  dxfParsingFailed: (filename: string, error: string) => void;
  
  // 图纸管理相关Toast  
  drawingDeleted: (filename: string) => void;
  drawingVersionUpdated: (filename: string, newVersion: string) => void;
  drawingRenamed: (oldName: string, newName: string) => void;
  drawingArchived: (filename: string) => void;
  
  // 图纸版本控制Toast
  versionCreated: (filename: string, version: string) => void;
  versionRestored: (filename: string, version: string) => void;
  versionCompared: (filename: string, version1: string, version2: string) => void;
  
  // 图纸分享和权限Toast
  drawingShared: (filename: string, recipientName: string) => void;
  drawingPermissionUpdated: (filename: string, permission: string) => void;
  
  // DXF预览相关Toast
  dxfPreviewGenerated: (filename: string) => void;
  dxfPreviewFailed: (filename: string) => void;
  
  // 通用错误
  error: (message: string) => void;
}

// 创建全局事件来触发Toast
export const drawingToastEvents = {
  emit: (eventType: string, data: any) => {
    window.dispatchEvent(new CustomEvent(`drawing-toast-${eventType}`, { detail: data }));
  }
};

// Toast事件处理器（在React组件中使用）
export const useDrawingToastListener = (toast: any) => {
  React.useEffect(() => {
    const handlers = {
      'drawing-toast-uploaded': (e: CustomEvent) => {
        const { filename, projectName } = e.detail;
        toast.drawingUploaded(filename, projectName);
      },
      
      'drawing-toast-upload-progress': (e: CustomEvent) => {
        const { filename, progress } = e.detail;
        toast.drawingUploadProgress(filename, progress);
      },
      
      'drawing-toast-upload-failed': (e: CustomEvent) => {
        const { filename, error } = e.detail;
        toast.drawingUploadFailed(filename, error);
      },
      
      'drawing-toast-batch-upload-complete': (e: CustomEvent) => {
        const { successCount, totalCount } = e.detail;
        toast.batchUploadComplete(successCount, totalCount);
      },
      
      'drawing-toast-dxf-parsed': (e: CustomEvent) => {
        const { filename, details } = e.detail;
        toast.addToast({
          type: 'dxf-parsed',
          message: `DXF文件"${filename}"解析完成: ${details}`,
          duration: 4000
        });
      },
      
      'drawing-toast-dxf-parsing-failed': (e: CustomEvent) => {
        const { filename, error } = e.detail;
        toast.addToast({
          type: 'error',
          message: `DXF文件"${filename}"解析失败: ${error}`,
          duration: 6000
        });
      },
      
      'drawing-toast-deleted': (e: CustomEvent) => {
        const { filename } = e.detail;
        toast.drawingDeleted(filename);
      },
      
      'drawing-toast-version-updated': (e: CustomEvent) => {
        const { filename, newVersion } = e.detail;
        toast.drawingVersionUpdated(filename, newVersion);
      },
      
      'drawing-toast-renamed': (e: CustomEvent) => {
        const { oldName, newName } = e.detail;
        toast.drawingRenamed(oldName, newName);
      },
      
      'drawing-toast-archived': (e: CustomEvent) => {
        const { filename } = e.detail;
        toast.drawingArchived(filename);
      },
      
      'drawing-toast-version-created': (e: CustomEvent) => {
        const { filename, version } = e.detail;
        toast.versionCreated(filename, version);
      },
      
      'drawing-toast-version-restored': (e: CustomEvent) => {
        const { filename, version } = e.detail;
        toast.versionRestored(filename, version);
      },
      
      'drawing-toast-version-compared': (e: CustomEvent) => {
        const { filename, version1, version2 } = e.detail;
        toast.versionCompared(filename, version1, version2);
      },
      
      'drawing-toast-shared': (e: CustomEvent) => {
        const { filename, recipientName } = e.detail;
        toast.drawingShared(filename, recipientName);
      },
      
      'drawing-toast-permission-updated': (e: CustomEvent) => {
        const { filename, permission } = e.detail;
        toast.drawingPermissionUpdated(filename, permission);
      },
      
      'drawing-toast-dxf-preview-generated': (e: CustomEvent) => {
        const { filename } = e.detail;
        toast.dxfPreviewGenerated(filename);
      },
      
      'drawing-toast-dxf-preview-failed': (e: CustomEvent) => {
        const { filename } = e.detail;
        toast.dxfPreviewFailed(filename);
      },
      
      'drawing-toast-error': (e: CustomEvent) => {
        const { message } = e.detail;
        toast.addToast({
          type: 'error',
          message
        });
      }
    };

    // 注册事件监听器
    Object.entries(handlers).forEach(([eventType, handler]) => {
      window.addEventListener(eventType, handler as EventListener);
    });

    // 清理函数
    return () => {
      Object.entries(handlers).forEach(([eventType, handler]) => {
        window.removeEventListener(eventType, handler as EventListener);
      });
    };
  }, [toast]);
};

// 在图纸相关组件中使用的辅助函数
export const drawingToastHelper: DrawingToastHelper = {
  drawingUploaded: (filename: string, projectName?: string) => {
    drawingToastEvents.emit('uploaded', { filename, projectName });
  },
  
  drawingUploadProgress: (filename: string, progress: number) => {
    drawingToastEvents.emit('upload-progress', { filename, progress });
  },
  
  drawingUploadFailed: (filename: string, error: string) => {
    drawingToastEvents.emit('upload-failed', { filename, error });
  },
  
  batchUploadComplete: (successCount: number, totalCount: number) => {
    drawingToastEvents.emit('batch-upload-complete', { successCount, totalCount });
  },
  
  dxfParsed: (filename: string, details: string) => {
    drawingToastEvents.emit('dxf-parsed', { filename, details });
  },
  
  dxfParsingFailed: (filename: string, error: string) => {
    drawingToastEvents.emit('dxf-parsing-failed', { filename, error });
  },
  
  drawingDeleted: (filename: string) => {
    drawingToastEvents.emit('deleted', { filename });
  },
  
  drawingVersionUpdated: (filename: string, newVersion: string) => {
    drawingToastEvents.emit('version-updated', { filename, newVersion });
  },
  
  drawingRenamed: (oldName: string, newName: string) => {
    drawingToastEvents.emit('renamed', { oldName, newName });
  },
  
  drawingArchived: (filename: string) => {
    drawingToastEvents.emit('archived', { filename });
  },
  
  versionCreated: (filename: string, version: string) => {
    drawingToastEvents.emit('version-created', { filename, version });
  },
  
  versionRestored: (filename: string, version: string) => {
    drawingToastEvents.emit('version-restored', { filename, version });
  },
  
  versionCompared: (filename: string, version1: string, version2: string) => {
    drawingToastEvents.emit('version-compared', { filename, version1, version2 });
  },
  
  drawingShared: (filename: string, recipientName: string) => {
    drawingToastEvents.emit('shared', { filename, recipientName });
  },
  
  drawingPermissionUpdated: (filename: string, permission: string) => {
    drawingToastEvents.emit('permission-updated', { filename, permission });
  },
  
  dxfPreviewGenerated: (filename: string) => {
    drawingToastEvents.emit('dxf-preview-generated', { filename });
  },
  
  dxfPreviewFailed: (filename: string) => {
    drawingToastEvents.emit('dxf-preview-failed', { filename });
  },
  
  error: (message: string) => {
    drawingToastEvents.emit('error', { message });
  }
};
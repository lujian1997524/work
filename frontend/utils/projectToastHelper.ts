// 项目操作Toast辅助模块
// 用于在非React组件中触发Toast提示

import React from 'react';

interface ProjectToastHelper {
  projectCreated: (projectName: string, workerName?: string) => void;
  projectUpdated: (projectName: string, updateType?: string) => void;  
  projectDeleted: (projectName: string, userName?: string, drawingsCount?: number) => void;
  projectArchived: (projectName: string) => void;
  projectRestored: (projectName: string) => void;
  projectStatusAuto: (projectName: string, newStatus: string, reason: string) => void;
  projectStatusChanged: (projectName: string, oldStatus: string, newStatus: string, reason: string) => void;
  workerReassigned: (projectName: string, fromWorker: string, toWorker: string) => void;
  batchOperationComplete: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
}

// 创建全局事件来触发Toast
export const projectToastEvents = {
  emit: (eventType: string, data: any) => {
    window.dispatchEvent(new CustomEvent(`project-toast-${eventType}`, { detail: data }));
  }
};

// Toast事件处理器（在React组件中使用）
export const useProjectToastListener = (toast: any) => {
  React.useEffect(() => {
    const handlers = {
      'project-toast-created': (e: CustomEvent) => {
        const { projectName, workerName } = e.detail;
        if (workerName) {
          toast.projectCreated(`${projectName}，已分配给${workerName}`);
        } else {
          toast.projectCreated(projectName);
        }
      },
      
      'project-toast-updated': (e: CustomEvent) => {
        const { projectName } = e.detail;
        toast.projectUpdated(projectName);
      },
      
      'project-toast-deleted': (e: CustomEvent) => {
        const { projectName, drawingsCount } = e.detail;
        if (drawingsCount && drawingsCount > 0) {
          toast.projectDeleted(`${projectName}，包含${drawingsCount}个图纸文件`);
        } else {
          toast.projectDeleted(projectName);
        }
      },
      
      'project-toast-status-auto': (e: CustomEvent) => {
        const { projectName, newStatus, reason } = e.detail;
        toast.projectStatusAuto(projectName, newStatus, reason);
      },
      
      'project-toast-worker-reassigned': (e: CustomEvent) => {
        const { projectName, fromWorker, toWorker } = e.detail;
        toast.workerReassigned(projectName, fromWorker, toWorker);
      },
      
      'project-toast-archived': (e: CustomEvent) => {
        const { projectName } = e.detail;
        toast.projectArchived(projectName);
      },
      
      'project-toast-restored': (e: CustomEvent) => {
        const { projectName } = e.detail;
        toast.addToast({
          type: 'success',
          message: `项目"${projectName}"已从过往库恢复`
        });
      },
      
      'project-toast-status-changed': (e: CustomEvent) => {
        const { projectName, oldStatus, newStatus, reason } = e.detail;
        toast.addToast({
          type: 'info',
          message: `项目"${projectName}"状态从${oldStatus}改为${newStatus}（${reason}）`
        });
      },
      
      'project-toast-batch-operation': (e: CustomEvent) => {
        const { message } = e.detail;
        toast.addToast({
          type: 'info',
          message
        });
      },
      
      'project-toast-info': (e: CustomEvent) => {
        const { message } = e.detail;
        toast.addToast({
          type: 'info',
          message
        });
      },
      
      'project-toast-error': (e: CustomEvent) => {
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

// 在projectStore中使用的辅助函数
export const projectToastHelper: ProjectToastHelper = {
  projectCreated: (projectName: string, workerName?: string) => {
    projectToastEvents.emit('created', { projectName, workerName });
  },
  
  projectUpdated: (projectName: string, updateType?: string) => {
    projectToastEvents.emit('updated', { projectName, updateType });
  },
  
  projectDeleted: (projectName: string, userName?: string, drawingsCount?: number) => {
    projectToastEvents.emit('deleted', { projectName, userName, drawingsCount });
  },
  
  projectArchived: (projectName: string) => {
    projectToastEvents.emit('archived', { projectName });
  },
  
  projectRestored: (projectName: string) => {
    projectToastEvents.emit('restored', { projectName });
  },
  
  projectStatusAuto: (projectName: string, newStatus: string, reason: string) => {
    projectToastEvents.emit('status-auto', { projectName, newStatus, reason });
  },
  
  projectStatusChanged: (projectName: string, oldStatus: string, newStatus: string, reason: string) => {
    projectToastEvents.emit('status-changed', { projectName, oldStatus, newStatus, reason });
  },
  
  workerReassigned: (projectName: string, fromWorker: string, toWorker: string) => {
    projectToastEvents.emit('worker-reassigned', { projectName, fromWorker, toWorker });
  },
  
  batchOperationComplete: (message: string) => {
    projectToastEvents.emit('batch-operation', { message });
  },
  
  info: (message: string) => {
    projectToastEvents.emit('info', { message });
  },
  
  error: (message: string) => {
    projectToastEvents.emit('error', { message });
  }
};
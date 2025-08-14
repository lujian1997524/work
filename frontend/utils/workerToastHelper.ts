// 工人操作Toast辅助模块
// 用于在非React组件中触发工人相关Toast提示

import React from 'react';

interface WorkerToastHelper {
  // 工人CRUD操作Toast
  workerAdded: (workerName: string, department: string) => void;
  workerUpdated: (workerName: string, updateType: string) => void;
  workerDeleted: (workerName: string) => void;
  workerProfileUpdated: (workerName: string, field: string) => void;
  
  // 部门管理Toast
  departmentAdded: (departmentName: string) => void;
  departmentUpdated: (departmentName: string) => void;
  departmentDeleted: (departmentName: string) => void;
  
  // 工人负载管理Toast
  workerOverloaded: (workerName: string, projectCount: number) => void;
  workerAvailable: (workerName: string) => void;
  workloadBalanced: () => void;
  workerReassigned: (workerName: string, fromProject: string, toProject: string) => void;
  
  // 工人技能和权限Toast
  skillAdded: (workerName: string, skillName: string) => void;
  permissionUpdated: (workerName: string, permission: string) => void;
  accessGranted: (workerName: string, resource: string) => void;
  accessRevoked: (workerName: string, resource: string) => void;
  
  // 工人协作和通信Toast
  taskAssigned: (workerName: string, taskName: string) => void;
  collaborationInvited: (workerName: string, projectName: string) => void;
  messageReceived: (fromWorker: string, toWorker: string) => void;
  
  // 通用消息Toast
  info: (message: string) => void;
  
  // 通用错误
  error: (message: string) => void;
}

// 创建全局事件来触发Toast
export const workerToastEvents = {
  emit: (eventType: string, data: any) => {
    window.dispatchEvent(new CustomEvent(`worker-toast-${eventType}`, { detail: data }));
  }
};

// Toast事件处理器（在React组件中使用）
export const useWorkerToastListener = (toast: any) => {
  React.useEffect(() => {
    const handlers = {
      'worker-toast-added': (e: CustomEvent) => {
        const { workerName, department } = e.detail;
        toast.workerAdded(workerName, department);
      },
      
      'worker-toast-updated': (e: CustomEvent) => {
        const { workerName, updateType } = e.detail;
        toast.workerUpdated(workerName, updateType);
      },
      
      'worker-toast-deleted': (e: CustomEvent) => {
        const { workerName } = e.detail;
        toast.addToast({
          type: 'success',
          message: `工人"${workerName}"已从系统中移除`
        });
      },
      
      'worker-toast-profile-updated': (e: CustomEvent) => {
        const { workerName, field } = e.detail;
        toast.addToast({
          type: 'success',
          message: `${workerName}的${field}信息已更新`
        });
      },
      
      'worker-toast-department-added': (e: CustomEvent) => {
        const { departmentName } = e.detail;
        toast.addToast({
          type: 'success',
          message: `新部门"${departmentName}"已创建`
        });
      },
      
      'worker-toast-department-updated': (e: CustomEvent) => {
        const { departmentName } = e.detail;
        toast.addToast({
          type: 'success',
          message: `部门"${departmentName}"信息已更新`
        });
      },
      
      'worker-toast-department-deleted': (e: CustomEvent) => {
        const { departmentName } = e.detail;
        toast.addToast({
          type: 'warning',
          message: `部门"${departmentName}"已删除，相关工人需要重新分配部门`
        });
      },
      
      'worker-toast-overloaded': (e: CustomEvent) => {
        const { workerName, projectCount } = e.detail;
        toast.workerOverloaded(workerName, projectCount);
      },
      
      'worker-toast-available': (e: CustomEvent) => {
        const { workerName } = e.detail;
        toast.addToast({
          type: 'info',
          message: `${workerName}现在有空闲时间，可分配新任务`
        });
      },
      
      'worker-toast-workload-balanced': (e: CustomEvent) => {
        toast.addToast({
          type: 'success',
          message: `团队工作负载已平衡，所有工人任务分配合理`
        });
      },
      
      'worker-toast-reassigned': (e: CustomEvent) => {
        const { workerName, fromProject, toProject } = e.detail;
        toast.addToast({
          type: 'info',
          message: `${workerName}已从"${fromProject}"调配至"${toProject}"`
        });
      },
      
      'worker-toast-skill-added': (e: CustomEvent) => {
        const { workerName, skillName } = e.detail;
        toast.addToast({
          type: 'success',
          message: `${workerName}新增技能：${skillName}`
        });
      },
      
      'worker-toast-permission-updated': (e: CustomEvent) => {
        const { workerName, permission } = e.detail;
        toast.addToast({
          type: 'info',
          message: `${workerName}的权限已更新：${permission}`
        });
      },
      
      'worker-toast-access-granted': (e: CustomEvent) => {
        const { workerName, resource } = e.detail;
        toast.addToast({
          type: 'success',
          message: `已授权${workerName}访问${resource}`
        });
      },
      
      'worker-toast-access-revoked': (e: CustomEvent) => {
        const { workerName, resource } = e.detail;
        toast.addToast({
          type: 'warning',
          message: `已撤销${workerName}对${resource}的访问权限`
        });
      },
      
      'worker-toast-task-assigned': (e: CustomEvent) => {
        const { workerName, taskName } = e.detail;
        toast.addToast({
          type: 'info',
          message: `任务"${taskName}"已分配给${workerName}`
        });
      },
      
      'worker-toast-collaboration-invited': (e: CustomEvent) => {
        const { workerName, projectName } = e.detail;
        toast.addToast({
          type: 'info',
          message: `邀请${workerName}参与项目"${projectName}"协作`
        });
      },
      
      'worker-toast-message-received': (e: CustomEvent) => {
        const { fromWorker, toWorker } = e.detail;
        toast.addToast({
          type: 'info',
          message: `${fromWorker}向${toWorker}发送了消息`
        });
      },
      
      'worker-toast-info': (e: CustomEvent) => {
        const { message } = e.detail;
        toast.addToast({
          type: 'info',
          message
        });
      },
      
      'worker-toast-error': (e: CustomEvent) => {
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

// 在工人相关组件中使用的辅助函数
export const workerToastHelper: WorkerToastHelper = {
  workerAdded: (workerName: string, department: string) => {
    workerToastEvents.emit('added', { workerName, department });
  },
  
  workerUpdated: (workerName: string, updateType: string) => {
    workerToastEvents.emit('updated', { workerName, updateType });
  },
  
  workerDeleted: (workerName: string) => {
    workerToastEvents.emit('deleted', { workerName });
  },
  
  workerProfileUpdated: (workerName: string, field: string) => {
    workerToastEvents.emit('profile-updated', { workerName, field });
  },
  
  departmentAdded: (departmentName: string) => {
    workerToastEvents.emit('department-added', { departmentName });
  },
  
  departmentUpdated: (departmentName: string) => {
    workerToastEvents.emit('department-updated', { departmentName });
  },
  
  departmentDeleted: (departmentName: string) => {
    workerToastEvents.emit('department-deleted', { departmentName });
  },
  
  workerOverloaded: (workerName: string, projectCount: number) => {
    workerToastEvents.emit('overloaded', { workerName, projectCount });
  },
  
  workerAvailable: (workerName: string) => {
    workerToastEvents.emit('available', { workerName });
  },
  
  workloadBalanced: () => {
    workerToastEvents.emit('workload-balanced', {});
  },
  
  workerReassigned: (workerName: string, fromProject: string, toProject: string) => {
    workerToastEvents.emit('reassigned', { workerName, fromProject, toProject });
  },
  
  skillAdded: (workerName: string, skillName: string) => {
    workerToastEvents.emit('skill-added', { workerName, skillName });
  },
  
  permissionUpdated: (workerName: string, permission: string) => {
    workerToastEvents.emit('permission-updated', { workerName, permission });
  },
  
  accessGranted: (workerName: string, resource: string) => {
    workerToastEvents.emit('access-granted', { workerName, resource });
  },
  
  accessRevoked: (workerName: string, resource: string) => {
    workerToastEvents.emit('access-revoked', { workerName, resource });
  },
  
  taskAssigned: (workerName: string, taskName: string) => {
    workerToastEvents.emit('task-assigned', { workerName, taskName });
  },
  
  collaborationInvited: (workerName: string, projectName: string) => {
    workerToastEvents.emit('collaboration-invited', { workerName, projectName });
  },
  
  messageReceived: (fromWorker: string, toWorker: string) => {
    workerToastEvents.emit('message-received', { fromWorker, toWorker });
  },
  
  info: (message: string) => {
    workerToastEvents.emit('info', { message });
  },
  
  error: (message: string) => {
    workerToastEvents.emit('error', { message });
  }
};
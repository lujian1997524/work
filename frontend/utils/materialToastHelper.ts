// 材料操作Toast辅助模块
// 用于在非React组件中触发材料相关Toast提示

import React from 'react';

interface MaterialToastHelper {
  // 四状态循环Toast
  materialAllocated: (materialType: string, projectName: string, quantity: number) => void;
  materialStarted: (materialType: string, workerName: string) => void;
  materialCompleted: (materialType: string, workerName?: string) => void;
  materialRecycled: (materialType: string) => void;
  
  // 库存管理Toast
  stockAdded: (workerName: string, materialType: string, quantity: number) => void;
  stockWarning: (workerName: string, materialType: string, currentStock: number, required: number) => void;
  dimensionAdded: (materialType: string, dimensions: string, quantity: number) => void;
  materialTransferred: (materialType: string, quantity: number, fromWorker: string, toWorker: string) => void;
  
  // 95/5策略提醒
  strategyDeviation: (carbonRatio: number, target?: number) => void;
  strategyBalanced: () => void;
  
  // 批量操作Toast
  batchOperationComplete: (message: string) => void;
  
  // 通用错误
  error: (message: string) => void;
}

// 创建全局事件来触发Toast
export const materialToastEvents = {
  emit: (eventType: string, data: any) => {
    window.dispatchEvent(new CustomEvent(`material-toast-${eventType}`, { detail: data }));
  }
};

// Toast事件处理器（在React组件中使用）
export const useMaterialToastListener = (toast: any) => {
  React.useEffect(() => {
    const handlers = {
      'material-toast-allocated': (e: CustomEvent) => {
        const { materialType, projectName, quantity } = e.detail;
        toast.materialAllocated(materialType, projectName, quantity);
      },
      
      'material-toast-started': (e: CustomEvent) => {
        const { materialType, workerName } = e.detail;
        toast.materialStarted(materialType, workerName);
      },
      
      'material-toast-completed': (e: CustomEvent) => {
        const { materialType, workerName } = e.detail;
        toast.materialCompleted(materialType, workerName);
      },
      
      'material-toast-recycled': (e: CustomEvent) => {
        const { materialType } = e.detail;
        toast.materialRecycled(materialType);
      },
      
      'material-toast-stock-added': (e: CustomEvent) => {
        const { workerName, materialType, quantity } = e.detail;
        toast.stockAdded(workerName, materialType, quantity);
      },
      
      'material-toast-stock-warning': (e: CustomEvent) => {
        const { workerName, materialType, currentStock, required } = e.detail;
        toast.stockWarning(workerName, materialType, currentStock, required);
      },
      
      'material-toast-dimension-added': (e: CustomEvent) => {
        const { materialType, dimensions, quantity } = e.detail;
        toast.dimensionAdded(materialType, dimensions, quantity);
      },
      
      'material-toast-transferred': (e: CustomEvent) => {
        const { materialType, quantity, fromWorker, toWorker } = e.detail;
        toast.materialTransferred(materialType, quantity, fromWorker, toWorker);
      },
      
      'material-toast-strategy-deviation': (e: CustomEvent) => {
        const { carbonRatio, target } = e.detail;
        toast.strategyDeviation(carbonRatio, target);
      },
      
      'material-toast-strategy-balanced': (e: CustomEvent) => {
        toast.strategyBalanced();
      },
      
      'material-toast-batch-operation-complete': (e: CustomEvent) => {
        const { message } = e.detail;
        toast.addToast({
          type: 'info',
          message
        });
      },
      
      'material-toast-error': (e: CustomEvent) => {
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

// 在材料相关组件中使用的辅助函数
export const materialToastHelper: MaterialToastHelper = {
  materialAllocated: (materialType: string, projectName: string, quantity: number) => {
    materialToastEvents.emit('allocated', { materialType, projectName, quantity });
  },
  
  materialStarted: (materialType: string, workerName: string) => {
    materialToastEvents.emit('started', { materialType, workerName });
  },
  
  materialCompleted: (materialType: string, workerName?: string) => {
    materialToastEvents.emit('completed', { materialType, workerName });
  },
  
  materialRecycled: (materialType: string) => {
    materialToastEvents.emit('recycled', { materialType });
  },
  
  stockAdded: (workerName: string, materialType: string, quantity: number) => {
    materialToastEvents.emit('stock-added', { workerName, materialType, quantity });
  },
  
  stockWarning: (workerName: string, materialType: string, currentStock: number, required: number) => {
    materialToastEvents.emit('stock-warning', { workerName, materialType, currentStock, required });
  },
  
  dimensionAdded: (materialType: string, dimensions: string, quantity: number) => {
    materialToastEvents.emit('dimension-added', { materialType, dimensions, quantity });
  },
  
  materialTransferred: (materialType: string, quantity: number, fromWorker: string, toWorker: string) => {
    materialToastEvents.emit('transferred', { materialType, quantity, fromWorker, toWorker });
  },
  
  strategyDeviation: (carbonRatio: number, target: number = 95) => {
    materialToastEvents.emit('strategy-deviation', { carbonRatio, target });
  },
  
  strategyBalanced: () => {
    materialToastEvents.emit('strategy-balanced', {});
  },
  
  batchOperationComplete: (message: string) => {
    materialToastEvents.emit('batch-operation-complete', { message });
  },
  
  error: (message: string) => {
    materialToastEvents.emit('error', { message });
  }
};
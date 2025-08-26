import { create } from 'zustand';
import { apiRequest } from '@/utils/api';

export interface WorkerMaterial {
  id: number;
  workerId: number;
  thicknessSpecId: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  worker?: {
    id: number;
    name: string;
    department: string;
  };
  thicknessSpec?: {
    id: number;
    thickness: number;
    unit: string;
    materialType: string;
  };
  dimensions?: MaterialDimension[];
}

export interface MaterialDimension {
  id: number;
  workerMaterialId: number;
  width: number;
  height: number;
  quantity: number;
  notes?: string;
  dimensionLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerMaterialSummary {
  workerId: number;
  workerName: string;
  department: string;
  materials: {
    [materialKey: string]: {
      id: number;
      quantity: number;
      notes?: string;
      dimensions: {
        id: number;
        length: number;
        width: number;
        thickness: number;
        quantity: number;
      }[];
    };
  };
}

interface WorkerMaterialStore {
  // 状态
  workerMaterials: WorkerMaterial[];
  workerMaterialSummary: WorkerMaterialSummary[];
  thicknessSpecs: any[];
  loading: boolean;
  error: string | null;

  // 操作
  fetchWorkerMaterials: () => Promise<void>;
  fetchWorkerMaterialSummary: () => Promise<void>;
  
  // 材料尺寸操作
  fetchMaterialDimensions: (workerMaterialId: number) => Promise<MaterialDimension[]>;
  createMaterialDimension: (data: {
    workerMaterialId: number;
    width: number;
    height: number;
    quantity: number;
    notes?: string;
  }) => Promise<MaterialDimension | null>;
  updateMaterialDimension: (id: number, data: Partial<MaterialDimension>) => Promise<MaterialDimension | null>;
  deleteMaterialDimension: (id: number) => Promise<boolean>;
  
  // 统计信息
  getMaterialStatistics: (workerMaterialId: number) => Promise<any>;
  
  // 工具函数
  clearError: () => void;
  reset: () => void;
}

export const useWorkerMaterialStore = create<WorkerMaterialStore>((set, get) => ({
  // 初始状态
  workerMaterials: [],
  workerMaterialSummary: [],
  thicknessSpecs: [],
  loading: false,
  error: null,

  // 获取工人材料汇总（兼容现有MaterialsSidebar）
  fetchWorkerMaterialSummary: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ error: '用户未登录' });
      return;
    }

    try {
      set({ loading: true, error: null });
      
      const response = await apiRequest('/api/worker-materials', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        set({ 
          workerMaterialSummary: data.workers || [],
          thicknessSpecs: data.thicknessSpecs || [],
          loading: false 
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取工人材料汇总失败');
      }
    } catch (error) {
      console.error('获取工人材料汇总失败:', error);
      set({ 
        error: error instanceof Error ? error.message : '获取工人材料汇总失败',
        loading: false 
      });
    }
  },

  // 获取所有工人材料记录
  fetchWorkerMaterials: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ error: '用户未登录' });
      return;
    }

    try {
      set({ loading: true, error: null });
      
      const response = await apiRequest('/api/worker-materials/detailed', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        set({ 
          workerMaterials: data.workerMaterials || [],
          loading: false 
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取工人材料记录失败');
      }
    } catch (error) {
      console.error('获取工人材料记录失败:', error);
      set({ 
        error: error instanceof Error ? error.message : '获取工人材料记录失败',
        loading: false 
      });
    }
  },

  // 获取材料尺寸记录
  fetchMaterialDimensions: async (workerMaterialId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ error: '用户未登录' });
      return [];
    }

    try {
      const response = await apiRequest(`/api/material-dimensions/worker-material/${workerMaterialId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.dimensions || [];
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取材料尺寸记录失败');
      }
    } catch (error) {
      console.error('获取材料尺寸记录失败:', error);
      set({ error: error instanceof Error ? error.message : '获取材料尺寸记录失败' });
      return [];
    }
  },

  // 创建材料尺寸记录
  createMaterialDimension: async (data) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ error: '用户未登录' });
      return null;
    }

    try {
      set({ loading: true, error: null });

      const response = await apiRequest('/api/material-dimensions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        set({ loading: false });
        
        // 触发全局刷新事件
        window.dispatchEvent(new CustomEvent('materials-updated'));
        
        return result.dimension;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '创建材料尺寸记录失败');
      }
    } catch (error) {
      console.error('创建材料尺寸记录失败:', error);
      set({ 
        error: error instanceof Error ? error.message : '创建材料尺寸记录失败',
        loading: false 
      });
      return null;
    }
  },

  // 更新材料尺寸记录
  updateMaterialDimension: async (id, updateData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ error: '用户未登录' });
      return null;
    }

    try {
      set({ loading: true, error: null });

      const response = await apiRequest(`/api/material-dimensions/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        set({ loading: false });
        
        // 触发全局刷新事件
        window.dispatchEvent(new CustomEvent('materials-updated'));
        
        return result.dimension;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '更新材料尺寸记录失败');
      }
    } catch (error) {
      console.error('更新材料尺寸记录失败:', error);
      set({ 
        error: error instanceof Error ? error.message : '更新材料尺寸记录失败',
        loading: false 
      });
      return null;
    }
  },

  // 删除材料尺寸记录
  deleteMaterialDimension: async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ error: '用户未登录' });
      return false;
    }

    try {
      set({ loading: true, error: null });

      const response = await apiRequest(`/api/material-dimensions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        set({ loading: false });
        
        // 触发全局刷新事件
        window.dispatchEvent(new CustomEvent('materials-updated'));
        
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除材料尺寸记录失败');
      }
    } catch (error) {
      console.error('删除材料尺寸记录失败:', error);
      set({ 
        error: error instanceof Error ? error.message : '删除材料尺寸记录失败',
        loading: false 
      });
      return false;
    }
  },

  // 获取材料统计信息
  getMaterialStatistics: async (workerMaterialId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ error: '用户未登录' });
      return null;
    }

    try {
      const response = await apiRequest(`/api/material-dimensions/statistics/${workerMaterialId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.statistics;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取材料统计失败');
      }
    } catch (error) {
      console.error('获取材料统计失败:', error);
      set({ error: error instanceof Error ? error.message : '获取材料统计失败' });
      return null;
    }
  },

  // 清除错误
  clearError: () => set({ error: null }),

  // 重置状态
  reset: () => set({
    workerMaterials: [],
    workerMaterialSummary: [],
    thicknessSpecs: [],
    loading: false,
    error: null
  })
}));

// 导出类型
export type { WorkerMaterialStore };
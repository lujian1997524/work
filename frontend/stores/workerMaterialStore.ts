import { create } from 'zustand';
import { apiRequest } from '@/utils/api';

// 获取认证token的辅助函数
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

// 工人材料状态类型
interface WorkerMaterialState {
  id: number;
  workerId: number;
  thicknessSpecId: number;
  quantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  thicknessSpec: {
    id: number;
    thickness: string;
    unit: string;
    materialType: string;
    sortOrder: number;
  };
  worker: {
    id: number;
    name: string;
    department?: string;
  };
}

// 工人材料Store接口
interface WorkerMaterialStore {
  // 状态
  workerMaterials: WorkerMaterialState[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;

  // 操作方法
  fetchWorkerMaterials: (workerId?: number) => Promise<void>;
  updateWorkerMaterial: (id: number, updates: { quantity?: number; notes?: string }) => Promise<WorkerMaterialState | null>;
  addWorkerMaterial: (material: { workerId: number; thicknessSpecId: number; quantity: number; notes?: string }) => Promise<WorkerMaterialState | null>;
  deleteWorkerMaterial: (id: number) => Promise<boolean>;
  getWorkerMaterialsByWorker: (workerId: number) => WorkerMaterialState[];
  
  // 内部方法
  setWorkerMaterials: (materials: WorkerMaterialState[]) => void;
  updateWorkerMaterialInStore: (id: number, updates: Partial<WorkerMaterialState>) => void;
  addWorkerMaterialToStore: (material: WorkerMaterialState) => void;
  removeWorkerMaterialFromStore: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// 创建工人材料Store
export const useWorkerMaterialStore = create<WorkerMaterialStore>((set, get) => ({
  // 初始状态
  workerMaterials: [],
  loading: false,
  error: null,
  lastUpdated: 0,

  // 获取工人材料列表
  fetchWorkerMaterials: async (workerId) => {
    set({ loading: true, error: null });
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }
      
      const url = workerId ? `/api/worker-materials?workerId=${workerId}` : '/api/worker-materials';
      const response = await apiRequest(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('获取工人材料列表失败');
      }
      
      const data = await response.json();
      const materials = data.materials || [];
      
      set({ 
        workerMaterials: materials, 
        loading: false, 
        lastUpdated: Date.now() 
      });

      // 触发更新事件
      window.dispatchEvent(new CustomEvent('worker-materials-updated', {
        detail: { workerId, materials }
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '未知错误',
        loading: false 
      });
    }
  },

  // 更新工人材料
  updateWorkerMaterial: async (id, updates) => {
    set({ loading: true, error: null });
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }

      const response = await apiRequest(`/api/worker-materials/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新工人材料失败');
      }
      
      const data = await response.json();
      const updatedMaterial = data.material;
      
      // 更新本地状态
      set(state => ({
        workerMaterials: state.workerMaterials.map(m => 
          m.id === id ? { ...m, ...updatedMaterial } : m
        ),
        loading: false,
        lastUpdated: Date.now()
      }));
      
      // 触发更新事件
      window.dispatchEvent(new CustomEvent('worker-materials-updated', { 
        detail: { id, updates: updatedMaterial } 
      }));
      
      return updatedMaterial;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '更新工人材料失败',
        loading: false 
      });
      return null;
    }
  },

  // 添加工人材料
  addWorkerMaterial: async (materialData) => {
    set({ loading: true, error: null });
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }

      const response = await apiRequest('/api/worker-materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(materialData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '添加工人材料失败');
      }
      
      const data = await response.json();
      const newMaterial = data.material;
      
      // 更新本地状态
      set(state => ({
        workerMaterials: [...state.workerMaterials, newMaterial],
        loading: false,
        lastUpdated: Date.now()
      }));
      
      // 触发更新事件
      window.dispatchEvent(new CustomEvent('worker-materials-updated', { 
        detail: { action: 'created', material: newMaterial } 
      }));
      
      return newMaterial;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '添加工人材料失败',
        loading: false 
      });
      return null;
    }
  },

  // 删除工人材料
  deleteWorkerMaterial: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }

      const response = await apiRequest(`/api/worker-materials/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除工人材料失败');
      }
      
      // 更新本地状态
      set(state => ({
        workerMaterials: state.workerMaterials.filter(m => m.id !== id),
        loading: false,
        lastUpdated: Date.now()
      }));
      
      // 触发更新事件
      window.dispatchEvent(new CustomEvent('worker-materials-updated', { 
        detail: { action: 'deleted', id } 
      }));
      
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '删除工人材料失败',
        loading: false 
      });
      return false;
    }
  },

  // 根据工人ID获取材料
  getWorkerMaterialsByWorker: (workerId) => {
    return get().workerMaterials.filter(m => m.workerId === workerId);
  },

  // 内部状态管理方法
  setWorkerMaterials: (materials) => set({ workerMaterials: materials, lastUpdated: Date.now() }),
  
  updateWorkerMaterialInStore: (id, updates) => set(state => ({ 
    workerMaterials: state.workerMaterials.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ),
    lastUpdated: Date.now()
  })),

  addWorkerMaterialToStore: (material) => set(state => ({
    workerMaterials: [...state.workerMaterials, material],
    lastUpdated: Date.now()
  })),

  removeWorkerMaterialFromStore: (id) => set(state => ({
    workerMaterials: state.workerMaterials.filter(m => m.id !== id),
    lastUpdated: Date.now()
  })),
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
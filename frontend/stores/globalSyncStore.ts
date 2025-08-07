import { create } from 'zustand';

// 全局状态同步管理
interface GlobalSyncState {
  // 同步状态
  isOnline: boolean;
  lastSyncTime: number;
  syncErrors: string[];
  
  // 操作方法
  setOnlineStatus: (status: boolean) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
  updateLastSyncTime: () => void;
  
  // 跨组件事件监听
  startEventListeners: () => void;
  stopEventListeners: () => void;
}

// 事件监听器引用
let eventListeners: (() => void)[] = [];

// 创建全局同步Store
export const useGlobalSyncStore = create<GlobalSyncState>((set, get) => ({
  // 初始状态
  isOnline: true,
  lastSyncTime: Date.now(),
  syncErrors: [],

  // 设置在线状态
  setOnlineStatus: (status) => {
    set({ isOnline: status });
    
    if (status) {
      // 上线时清除错误
      get().clearSyncErrors();
    }
  },

  // 添加同步错误
  addSyncError: (error) => {
    set(state => ({
      syncErrors: [...state.syncErrors.slice(-9), error] // 只保留最近10个错误
    }));
  },

  // 清除同步错误
  clearSyncErrors: () => set({ syncErrors: [] }),

  // 更新最后同步时间
  updateLastSyncTime: () => set({ lastSyncTime: Date.now() }),

  // 启动事件监听器
  startEventListeners: () => {
    const state = get();
    
    // 监听网络状态
    const handleOnline = () => state.setOnlineStatus(true);
    const handleOffline = () => state.setOnlineStatus(false);
    
    // 监听数据更新事件
    const handleProjectCreated = () => {
      state.updateLastSyncTime();
    };
    
    const handleProjectUpdated = () => {
      state.updateLastSyncTime();
    };
    
    const handleMaterialUpdated = () => {
      state.updateLastSyncTime();
    };

    const handleMaterialsUpdated = () => {
      state.updateLastSyncTime();
    };

    const handleWorkerMaterialsUpdated = () => {
      state.updateLastSyncTime();
    };

    // 注册事件监听器
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('project-created', handleProjectCreated);
    window.addEventListener('project-updated', handleProjectUpdated);
    window.addEventListener('material-updated', handleMaterialUpdated);
    window.addEventListener('materials-updated', handleMaterialsUpdated);
    window.addEventListener('material-status-updated', handleMaterialsUpdated); // 新的材料状态更新事件
    window.addEventListener('worker-materials-updated', handleWorkerMaterialsUpdated);

    // 保存清理函数
    eventListeners = [
      () => window.removeEventListener('online', handleOnline),
      () => window.removeEventListener('offline', handleOffline),
      () => window.removeEventListener('project-created', handleProjectCreated),
      () => window.removeEventListener('project-updated', handleProjectUpdated),
      () => window.removeEventListener('material-updated', handleMaterialUpdated),
      () => window.removeEventListener('materials-updated', handleMaterialsUpdated),
      () => window.removeEventListener('material-status-updated', handleMaterialsUpdated),
      () => window.removeEventListener('worker-materials-updated', handleWorkerMaterialsUpdated),
    ];
  },

  // 停止事件监听器
  stopEventListeners: () => {
    eventListeners.forEach(cleanup => cleanup());
    eventListeners = [];
  },
}));
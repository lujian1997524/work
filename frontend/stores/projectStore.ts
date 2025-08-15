import { create } from 'zustand';
import { sseManager } from '@/utils/sseManager';
import { apiRequest } from '@/utils/api';
import { projectToastHelper } from '@/utils/projectToastHelper';
import type { Project, Material } from '@/types/project';

// 类型别名，兼容现有代码
export type MaterialState = Material;
export type ProjectState = Project;

// 获取认证token的辅助函数
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

// 防抖函数
let refreshTimer: NodeJS.Timeout | null = null;
const debouncedRefresh = (fetchProjects: () => Promise<void>) => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    fetchProjects().then(() => {
      // 防抖刷新完成
    }).catch(error => {
      // 防抖刷新失败，忽略错误
    });
  }, 300); // 300ms防抖
};

// 项目Store接口
export interface ProjectStore {
  // 状态
  projects: Project[];
  completedProjects: Project[];
  pastProjects: Project[];
  pastProjectsByMonth: Record<string, Project[]>;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
  sseListenersSetup: boolean;
  _sseHandlers?: { [key: string]: (data: any) => void };
  
  // 乐观更新标记
  isOptimisticUpdating: boolean;

  // 操作方法
  fetchProjects: () => Promise<void>;
  fetchCompletedProjects: (workerName?: string) => Promise<void>;
  fetchPastProjects: (year?: number, month?: number) => Promise<void>;
  createProject: (projectData: Partial<Project>) => Promise<Project | null>;
  updateProject: (id: number, updates: Partial<Project>, options?: { silent?: boolean }) => Promise<Project | null>;
  deleteProject: (id: number) => Promise<boolean>;
  moveToPastProject: (id: number) => Promise<boolean>;
  restoreFromPastProject: (id: number) => Promise<boolean>;
  getProjectById: (id: number) => Project | undefined;
  
  // SSE相关方法
  setupSSEListeners: () => void;
  cleanupSSEListeners: () => void;
  
  // 内部方法
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProjectInStore: (id: number, updates: Partial<Project>) => void;
  optimisticUpdateMaterialStatus: (projectId: number, materialId: number, newStatus: 'pending' | 'in_progress' | 'completed', user?: { id: number; name: string }) => void;
  setOptimisticUpdating: (updating: boolean) => void;
  removeProject: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// 创建项目Store
export const useProjectStore = create<ProjectStore>((set, get) => ({
  // 初始状态
  projects: [],
  completedProjects: [],
  pastProjects: [],
  pastProjectsByMonth: {},
  loading: false,
  error: null,
  lastUpdated: 0,
  sseListenersSetup: false,
  _sseHandlers: undefined,
  isOptimisticUpdating: false,

  // 获取项目列表
  fetchProjects: async () => {
    set({ loading: true, error: null });
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }
      
      const response = await apiRequest('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('获取项目列表失败');
      }
      
      const data = await response.json();
      const projects = data.projects || [];
      
      set({ 
        projects, 
        loading: false, 
        lastUpdated: Date.now() 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '未知错误',
        loading: false 
      });
    }
  },

  // 获取已完成任务列表
  fetchCompletedProjects: async (workerName) => {
    set({ loading: true, error: null });
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }
      
      const params = new URLSearchParams();
      if (workerName) {
        params.append('workerName', workerName);
      }
      
      const url = `/api/projects/completed${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await apiRequest(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('获取已完成任务失败');
      }
      
      const data = await response.json();
      const completedProjects = data.projects || [];
      
      set({ 
        completedProjects, 
        loading: false, 
        lastUpdated: Date.now() 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取已完成任务失败',
        loading: false 
      });
    }
  },

  // 获取过往项目列表
  fetchPastProjects: async (year, month) => {
    set({ loading: true, error: null });
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }
      
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (month) params.append('month', month.toString());
      
      const url = `/api/projects/past${params.toString() ? '?' + params.toString() : ''}`;
      
      // 添加超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时，请检查网络连接')), 15000);
      });
      
      const fetchPromise = apiRequest(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        const errorText = await response.text();
        // API响应错误，忽略日志输出
        throw new Error(`获取过往项目失败 (${response.status})`);
      }
      
      const data = await response.json();
      // 获取到过往项目数据，无需日志输出
      
      if (year && month) {
        // 如果指定了年月，返回项目列表
        const pastProjects = data.projects || [];
        set({ 
          pastProjects, 
          loading: false, 
          error: null,
          lastUpdated: Date.now() 
        });
        // 设置指定月份过往项目完成，无需日志输出
      } else {
        // 如果没有指定年月，返回按月分组的数据
        const pastProjectsByMonth = data.projectsByMonth || {};
        const pastProjects = Object.values(pastProjectsByMonth).flat() as Project[];
        set({ 
          pastProjects,
          pastProjectsByMonth, 
          loading: false,
          error: null,
          lastUpdated: Date.now() 
        });
        // 设置按月分组过往项目完成，无需日志输出
      }
    } catch (error) {
      // 获取过往项目失败，忽略错误日志
      const errorMessage = error instanceof Error ? error.message : '获取过往项目失败';
      set({ 
        error: errorMessage,
        loading: false,
        pastProjects: [],
        pastProjectsByMonth: {}
      });
    }
  },

  // 创建新项目
  createProject: async (projectData) => {
    set({ loading: true, error: null });
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }
      
      const response = await apiRequest('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建项目失败');
      }
      
      const data = await response.json();
      const newProject = data.project;
      
      // 标记本地操作，避免SSE重复通知
      sseManager.markLocalOperation('project-created', newProject.id);
      
      // 更新本地状态
      set(state => ({
        projects: [...state.projects, newProject],
        loading: false,
        lastUpdated: Date.now()
      }));
      
      // 通知其他组件更新
      window.dispatchEvent(new CustomEvent('project-created', { 
        detail: newProject 
      }));
      window.dispatchEvent(new CustomEvent('materials-updated', { 
        detail: { projectId: newProject.id, action: 'project-created' } 
      }));
      
      // 本地成功通知（作为SSE的备用）
      const workerName = newProject.assignedWorker?.name;
      projectToastHelper.projectCreated(newProject.name, workerName);
      
      return newProject;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建项目失败';
      set({ 
        error: errorMessage,
        loading: false 
      });
      
      // 触发错误Toast
      projectToastHelper.error(errorMessage);
      
      return null;
    }
  },

  // 更新项目
  updateProject: async (id, updates, options = {}) => {
    const { silent = false } = options;
    
    if (!silent) {
      set({ loading: true, error: null });
    }
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }
      
      const response = await apiRequest(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('更新项目失败');
      }
      
      const data = await response.json();
      const updatedProject = data.project;
      
      // 标记本地操作，避免SSE重复通知
      sseManager.markLocalOperation('project-updated', id);
      sseManager.markLocalOperation('project-status-changed', id);
      
      // 更新本地状态
      set(state => ({
        projects: state.projects.map(p => 
          p.id === id ? { ...p, ...updatedProject } : p
        ),
        loading: silent ? state.loading : false,
        lastUpdated: Date.now()
      }));
      
      // 只有在非静默模式下才通知其他组件更新
      if (!silent) {
        window.dispatchEvent(new CustomEvent('project-updated', { 
          detail: { id, updates: updatedProject } 
        }));
        
        // 本地更新通知（作为SSE的备用）
        const projectName = updatedProject.name || get().projects.find(p => p.id === id)?.name || `项目${id}`;
        projectToastHelper.projectUpdated(projectName);
      }
      
      return updatedProject;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新项目失败';
      set({ 
        error: errorMessage,
        loading: false 
      });
      
      // 触发错误Toast（本地错误，SSE不会发送）
      if (!silent) {
        projectToastHelper.error(errorMessage);
      }
      
      return null;
    }
  },

  // 删除项目
  deleteProject: async (id) => {
    set({ loading: true, error: null });
    
    // 获取项目信息用于Toast
    const project = get().projects.find(p => p.id === id);
    const projectName = project?.name || `项目${id}`;
    const drawingsCount = project?.drawings?.length || 0;
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }
      
      const response = await apiRequest(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('删除项目失败');
      }
      
      // 标记本地操作，避免SSE重复通知
      sseManager.markLocalOperation('project-deleted', id);
      
      // 更新本地状态
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        loading: false,
        lastUpdated: Date.now()
      }));
      
      // 通知其他组件更新
      window.dispatchEvent(new CustomEvent('project-deleted', { 
        detail: { id } 
      }));
      
      // 本地删除通知（作为SSE的备用）
      // 参数顺序：projectName, userName, drawingsCount
      projectToastHelper.projectDeleted(projectName, undefined, drawingsCount);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除项目失败';
      set({ 
        error: errorMessage,
        loading: false 
      });
      
      // 触发错误Toast（本地错误，SSE不会发送）
      projectToastHelper.error(errorMessage);
      
      return false;
    }
  },

  // 移动项目到过往项目
  moveToPastProject: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }
      
      const response = await apiRequest(`/api/projects/${id}/move-to-past`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '移动项目到过往失败');
      }
      
      const data = await response.json();
      const updatedProject = data.project;
      
      // 从活跃项目列表中移除
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        completedProjects: state.completedProjects.filter(p => p.id !== id),
        loading: false,
        lastUpdated: Date.now()
      }));
      
      // 通知其他组件更新
      window.dispatchEvent(new CustomEvent('project-moved-to-past', { 
        detail: { id, project: updatedProject } 
      }));
      
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '移动项目到过往失败',
        loading: false 
      });
      return false;
    }
  },

  // 恢复过往项目到活跃状态
  restoreFromPastProject: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('未找到认证令牌');
      }
      
      const response = await apiRequest(`/api/projects/${id}/restore-from-past`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '恢复项目失败');
      }
      
      const data = await response.json();
      const updatedProject = data.project;
      
      // 从过往项目列表中移除
      set(state => ({
        pastProjects: state.pastProjects.filter(p => p.id !== id),
        loading: false,
        lastUpdated: Date.now()
      }));
      
      // 通知其他组件更新
      window.dispatchEvent(new CustomEvent('project-restored-from-past', { 
        detail: { id, project: updatedProject } 
      }));
      
      return true;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '恢复项目失败',
        loading: false 
      });
      return false;
    }
  },

  // 根据ID获取项目
  getProjectById: (id) => {
    return get().projects.find(p => p.id === id);
  },

  // 设置SSE事件监听器
  setupSSEListeners: () => {
    const state = get();
    if (state.sseListenersSetup) {
      // SSE监听器已设置，跳过重复设置
      return;
    }
    // 设置SSE事件监听器开始
    
    // 先清理可能存在的旧监听器
    get().cleanupSSEListeners();
    
    // 监听项目创建事件
    const projectCreatedHandler = (data: any) => {
      // 收到项目创建事件，开始处理
      if (data.project) {
        const existingProject = get().projects.find(p => p.id === data.project.id);
        if (!existingProject) {
          get().addProject(data.project);
          set({ lastUpdated: Date.now() });
        }
        debouncedRefresh(get().fetchProjects);
      }
    };

    // 监听项目更新事件
    const projectUpdatedHandler = (data: any) => {
      // 收到项目更新事件，开始处理
      if (data.project) {
        get().updateProjectInStore(data.project.id, data.project);
        set({ lastUpdated: Date.now() });
        debouncedRefresh(get().fetchProjects);
      }
    };

    // 监听项目状态变更事件
    const projectStatusChangedHandler = (data: any) => {
      // 收到项目状态变更事件，开始处理
      if (data.projectId) {
        // 更新项目状态
        get().updateProjectInStore(data.projectId, { status: data.newStatus });
        set({ lastUpdated: Date.now() });
        debouncedRefresh(get().fetchProjects);
      }
    };

    // 监听项目删除事件
    const projectDeletedHandler = (data: any) => {
      // 收到项目删除事件，开始处理
      if (data.projectId) {
        get().removeProject(data.projectId);
        set({ lastUpdated: Date.now() });
        window.dispatchEvent(new CustomEvent('project-deleted-sse', { 
          detail: { id: data.projectId } 
        }));
        debouncedRefresh(get().fetchProjects);
      }
    };

    // 监听板材状态变更事件
    const materialStatusChangedHandler = (data: any) => {
      // 收到板材状态变更事件，开始处理
      // 当前项目数量信息已收集
      if (data.projectId && data.material) {
        // 使用乐观更新而不是全量刷新
        const { optimisticUpdateMaterialStatus } = get();
        
        // 直接更新Zustand store中的材料状态
        optimisticUpdateMaterialStatus(
          data.projectId, 
          data.material.id, 
          data.newStatus,
          data.updatedBy ? { id: data.updatedBy.id, name: data.updatedBy.name } : undefined
        );
        
        // 如果需要更新项目状态，也使用乐观更新
        if (data.project && data.project.status !== get().projects.find(p => p.id === data.projectId)?.status) {
          get().updateProjectInStore(data.projectId, { status: data.project.status });
        }
        
        set({ lastUpdated: Date.now() });
        
        // SSE材料状态变更：使用乐观更新，避免全量刷新
        
        // 发送事件通知其他组件（带特殊标记表示来自SSE）
        window.dispatchEvent(new CustomEvent('materials-updated', { 
          detail: { 
            projectId: data.projectId, 
            materialId: data.material?.id,
            oldStatus: data.oldStatus,
            newStatus: data.newStatus,
            fromSSE: true, // 标记来自SSE，避免重复处理
            timestamp: Date.now()
          } 
        }));
      }
    };

    // 监听批量板材状态变更事件
    const materialBatchStatusChangedHandler = (data: any) => {
      // 收到批量板材状态变更事件，开始处理
      
      // 批量操作由于复杂性，仍然使用防抖刷新
      set({ lastUpdated: Date.now() });
      debouncedRefresh(get().fetchProjects);
      
      window.dispatchEvent(new CustomEvent('materials-updated', { 
        detail: { 
          batchUpdate: true,
          materialIds: data.materialIds,
          status: data.status,
          updatedCount: data.updatedCount,
          fromSSE: true,
          timestamp: Date.now()
        } 
      }));
    };

    // 监听项目移动到过往事件
    const projectMovedToPastHandler = (data: any) => {
      // 收到项目移动到过往事件，开始处理
      if (data.project) {
        get().removeProject(data.project.id);
        set({ lastUpdated: Date.now() });
        debouncedRefresh(get().fetchProjects);
      }
    };

    // 监听项目从过往恢复事件
    const projectRestoredFromPastHandler = (data: any) => {
      // 收到项目从过往恢复事件，开始处理
      if (data.project) {
        get().addProject(data.project);
        set({ lastUpdated: Date.now() });
        debouncedRefresh(get().fetchProjects);
      }
    };
    
    // 注册事件监听器
    sseManager.addEventListener('project-created', projectCreatedHandler);
    sseManager.addEventListener('project-updated', projectUpdatedHandler);
    sseManager.addEventListener('project-status-changed', projectStatusChangedHandler);
    sseManager.addEventListener('project-deleted', projectDeletedHandler);
    sseManager.addEventListener('material-status-changed', materialStatusChangedHandler);
    sseManager.addEventListener('material-batch-status-changed', materialBatchStatusChangedHandler);
    sseManager.addEventListener('project-moved-to-past', projectMovedToPastHandler);
    sseManager.addEventListener('project-restored-from-past', projectRestoredFromPastHandler);

    // 保存监听器引用以便清理
    set({ 
      sseListenersSetup: true,
      _sseHandlers: {
        'project-created': projectCreatedHandler,
        'project-updated': projectUpdatedHandler,
        'project-status-changed': projectStatusChangedHandler,
        'project-deleted': projectDeletedHandler,
        'material-status-changed': materialStatusChangedHandler,
        'material-batch-status-changed': materialBatchStatusChangedHandler,
        'project-moved-to-past': projectMovedToPastHandler,
        'project-restored-from-past': projectRestoredFromPastHandler
      }
    });
  },

  // 清理SSE事件监听器
  cleanupSSEListeners: () => {
    const state = get();
    if (state._sseHandlers) {
      // 清理SSE事件监听器中
      Object.entries(state._sseHandlers).forEach(([eventType, handler]) => {
        sseManager.removeEventListener(eventType as any, handler);
      });
    }
    set({ sseListenersSetup: false, _sseHandlers: undefined });
  },

  // 内部状态管理方法
  setProjects: (projects) => set({ projects, lastUpdated: Date.now() }),
  
  addProject: (project) => {
    // Zustand addProject被调用，开始处理
    set(state => {
      const newProjects = [...state.projects, project];
      const newState = {
        projects: newProjects,
        lastUpdated: Date.now()
      };
      // Zustand项目数量更新完成
      return newState;
    });
  },
  
  updateProjectInStore: (id, updates) => {
    // Zustand updateProjectInStore被调用，开始处理
    set(state => ({
      projects: state.projects.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ),
      lastUpdated: Date.now()
    }));
  },
  
  optimisticUpdateMaterialStatus: (projectId, materialId, newStatus, user) => {
    // 乐观更新材料状态开始
    const currentTime = new Date().toISOString();
    
    set(state => ({
      projects: state.projects.map(project => {
        if (project.id === projectId) {
          return {
            ...project,
            materials: project.materials?.map(material => {
              if (material.id === materialId) {
                const updatedMaterial = { ...material, status: newStatus };
                
                // 根据新状态设置时间和完成人
                if (newStatus === 'in_progress') {
                  updatedMaterial.startDate = material.startDate || currentTime;
                  updatedMaterial.completedDate = undefined;
                  updatedMaterial.completedBy = undefined;
                } else if (newStatus === 'completed') {
                  updatedMaterial.completedDate = currentTime;
                  updatedMaterial.completedBy = user?.id;
                  updatedMaterial.startDate = material.startDate || currentTime;
                } else if (newStatus === 'pending') {
                  updatedMaterial.startDate = undefined;
                  updatedMaterial.completedDate = undefined;
                  updatedMaterial.completedBy = undefined;
                }
                
                return updatedMaterial;
              }
              return material;
            })
          };
        }
        return project;
      }),
      lastUpdated: Date.now()
    }));
  },
  
  removeProject: (id) => set(state => ({ 
    projects: state.projects.filter(p => p.id !== id),
    lastUpdated: Date.now()
  })),
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setOptimisticUpdating: (updating) => set({ isOptimisticUpdating: updating }),
}));

// 添加事件监听器，当材料更新时刷新项目数据
// 优化：减少频繁的全量刷新
if (typeof window !== 'undefined') {
  let refreshTimeout: NodeJS.Timeout | null = null;
  let lastUpdateTimestamp = 0;
  
  window.addEventListener('materials-updated', (event: any) => {
    const eventDetail = event.detail;
    const eventTimestamp = eventDetail?.timestamp || Date.now();
    
    // 如果事件来自SSE，则跳过处理（因为Store层已经处理了）
    if (eventDetail?.fromSSE) {
      // Store层跳过SSE事件（已由SSE处理器处理）
      return;
    }
    
    // 防止重复处理相同的事件
    if (eventTimestamp <= lastUpdateTimestamp) {
      // 跳过重复的materials-updated事件
      return;
    }
    
    lastUpdateTimestamp = eventTimestamp;
    
    // 防抖：避免短时间内多次刷新
    if (refreshTimeout) {
      // 清除之前的刷新定时器
      clearTimeout(refreshTimeout);
    }
    
    refreshTimeout = setTimeout(() => {
      const store = useProjectStore.getState();
      // 只有在没有正在进行乐观更新时才进行全量刷新
      if (!store.isOptimisticUpdating) {
        // Store层收到materials-updated事件，静默同步数据
        store.fetchProjects();
      } else {
        // 乐观更新进行中，跳过Store层刷新
      }
    }, 800); // 增加防抖时间到800ms
  });

  // 监听新的材料状态更新事件 - 使用乐观更新而非全量刷新
  window.addEventListener('material-status-updated', (event: any) => {
    const eventDetail = event.detail;
    const { projectId, thicknessSpecId, newStatus, action } = eventDetail;
    
    // Store层收到material-status-updated事件，进行乐观更新
    
    const store = useProjectStore.getState();
    
    // 使用乐观更新：直接更新Store中的数据，无需全量刷新
    if (projectId && thicknessSpecId) {
      const currentProjects = store.projects;
      const targetProjectIndex = currentProjects.findIndex(p => p.id === projectId);
      
      if (targetProjectIndex >= 0) {
        const updatedProjects = [...currentProjects];
        const targetProject = { ...updatedProjects[targetProjectIndex] };
        const materials = targetProject.materials || [];
        
        if (action === 'delete') {
          // 删除材料记录
          targetProject.materials = materials.filter(m => m.thicknessSpecId !== thicknessSpecId);
        } else if (action === 'create') {
          // 创建新材料记录
          const newMaterial = {
            id: Date.now(), // 临时ID
            projectId,
            thicknessSpecId,
            status: newStatus,
            startDate: newStatus === 'in_progress' ? new Date().toISOString().split('T')[0] : undefined,
            completedDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : undefined
          };
          targetProject.materials = [...materials, newMaterial as any];
        } else if (action === 'update') {
          // 更新现有材料记录
          targetProject.materials = materials.map(m => 
            m.thicknessSpecId === thicknessSpecId 
              ? { 
                  ...m, 
                  status: newStatus,
                  startDate: newStatus === 'in_progress' && !m.startDate ? new Date().toISOString().split('T')[0] : m.startDate,
                  completedDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : m.completedDate
                }
              : m
          );
        }
        
        // 计算项目新状态
        const allMaterials = targetProject.materials || [];
        const hasEmpty = allMaterials.length === 0 || allMaterials.some(m => !m.status);
        const hasPending = allMaterials.some(m => m.status === 'pending');
        const hasInProgress = allMaterials.some(m => m.status === 'in_progress');
        const hasCompleted = allMaterials.some(m => m.status === 'completed');
        
        let newProjectStatus = targetProject.status;
        
        // 规则1: 有任何一个进行中状态时，项目为进行中状态
        if (hasInProgress) {
          newProjectStatus = 'in_progress';
        }
        // 规则2: 当待处理状态和已完成状态同时存在时，项目为进行中状态
        else if (hasPending && hasCompleted) {
          newProjectStatus = 'in_progress';
        }
        // 规则3: 当只有空白状态和已完成状态时，项目为已完成状态
        else if (hasCompleted && !hasPending && !hasInProgress) {
          newProjectStatus = 'completed';
        }
        // 规则4: 当只有空白状态和待处理状态时，项目为待处理状态
        else {
          newProjectStatus = 'pending';
        }
        
        targetProject.status = newProjectStatus;
        updatedProjects[targetProjectIndex] = targetProject;
        
        // 直接更新Store，触发UI更新但避免全量刷新
        store.setProjects(updatedProjects);
        
        // 材料状态和项目状态乐观更新完成，无需全量刷新
      }
    }
  });
}
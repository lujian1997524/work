// Store 统一导出
export { useProjectStore } from './projectStore';
export { useMaterialStore } from './materialStore';
export { useWorkerMaterialStore } from './workerMaterialStore';
export { useGlobalSyncStore } from './globalSyncStore';
export { useNotificationStore } from './notificationStore';

// 类型导出 - 使用统一的types/project.ts中的类型
export type { Project, Material } from '@/types/project';
// 保留向后兼容的类型别名
export type { 
  ProjectState, 
  MaterialState 
} from './projectStore';
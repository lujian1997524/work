// 项目枚举常量定义
// 与数据库 ENUM 定义保持一致

export const PROJECT_STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
] as const;

export const PROJECT_PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
] as const;

export const MATERIAL_STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' }
] as const;

export const WORKER_STATUS_OPTIONS = [
  { value: 'active', label: '激活' },
  { value: 'inactive', label: '停用' }
] as const;

export const USER_ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'operator', label: '操作员' }
] as const;

// 导出类型
export type ProjectStatus = typeof PROJECT_STATUS_OPTIONS[number]['value'];
export type ProjectPriority = typeof PROJECT_PRIORITY_OPTIONS[number]['value'];
export type MaterialStatus = typeof MATERIAL_STATUS_OPTIONS[number]['value'];
export type WorkerStatus = typeof WORKER_STATUS_OPTIONS[number]['value'];
export type UserRole = typeof USER_ROLE_OPTIONS[number]['value'];
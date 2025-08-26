// 材料类型统计数据类型定义
export interface MaterialTypeStats {
  thicknessSpecId: number;
  thickness: string;
  unit: string;
  materialType: string;
  isActive: boolean;
  sortOrder: number;
  stats: {
    totalMaterials: number;
    pendingCount: number;
    inProgressCount: number;
    completedCount: number;
    projectCount: number;
    activeMaterials: number;
    completionRate: number;
  };
}

export interface MaterialTypeSummary {
  totalMaterials: number;
  carbonMaterials: {
    count: number;
    totalMaterials: number;
    percentage: number;
    completedMaterials: number;
    inProgressMaterials: number;
    pendingMaterials: number;
  };
  specialMaterials: {
    count: number;
    totalMaterials: number;
    percentage: number;
    completedMaterials: number;
    inProgressMaterials: number;
    pendingMaterials: number;
  };
  strategy95_5: {
    actual: {
      carbon: number;
      special: number;
    };
    target: {
      carbon: number;
      special: number;
    };
    deviation: {
      carbon: number;
      special: number;
    };
  };
}

export interface MaterialTypeStatsResponse {
  summary: MaterialTypeSummary;
  carbonMaterials: MaterialTypeStats[];
  specialMaterials: MaterialTypeStats[];
  timestamp: string;
}

// 筛选器类型
export interface MaterialFilter {
  materialType?: 'all' | 'carbon' | 'special';
  status?: 'all' | 'pending' | 'in_progress' | 'completed';
  thicknessSpecIds?: number[];
  hasProjects?: boolean;
}

// 筛选器选项
export interface FilterOption {
  value: string | number;
  label: string;
  count?: number;
  percentage?: number;
}
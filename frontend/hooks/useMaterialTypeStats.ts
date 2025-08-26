'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import type { MaterialTypeStatsResponse, MaterialFilter } from '@/types/materialStats';

export const useMaterialTypeStats = () => {
  const [data, setData] = useState<MaterialTypeStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { token } = useAuth();

  const fetchStats = async () => {
    if (!token) {
      setError('未找到认证令牌');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('/api/materials/type-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('获取材料类型统计失败');
      }

      const statsData: MaterialTypeStatsResponse = await response.json();
      setData(statsData);
      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取统计数据失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 应用筛选器
  const applyFilter = (filter: MaterialFilter) => {
    if (!data) return { carbonMaterials: [], specialMaterials: [] };

    const filterMaterials = (materials: typeof data.carbonMaterials) => {
      return materials.filter(material => {
        // 状态筛选
        if (filter.status && filter.status !== 'all') {
          const hasStatus = material.stats[`${filter.status}Count` as keyof typeof material.stats] > 0;
          if (!hasStatus) return false;
        }

        // 厚度规格筛选
        if (filter.thicknessSpecIds && filter.thicknessSpecIds.length > 0) {
          if (!filter.thicknessSpecIds.includes(material.thicknessSpecId)) return false;
        }

        // 是否有项目筛选
        if (filter.hasProjects !== undefined) {
          if (filter.hasProjects && material.stats.projectCount === 0) return false;
          if (!filter.hasProjects && material.stats.projectCount > 0) return false;
        }

        return true;
      });
    };

    let carbonMaterials = data.carbonMaterials;
    let specialMaterials = data.specialMaterials;

    // 材料类型筛选
    if (filter.materialType === 'carbon') {
      specialMaterials = [];
    } else if (filter.materialType === 'special') {
      carbonMaterials = [];
    }

    return {
      carbonMaterials: filterMaterials(carbonMaterials),
      specialMaterials: filterMaterials(specialMaterials),
    };
  };

  // 获取快速筛选选项
  const getQuickFilterOptions = () => {
    if (!data) return [];

    const options = [
      {
        value: 'all',
        label: '所有材料',
        count: data.summary.totalMaterials,
        percentage: 100
      },
      {
        value: 'carbon',
        label: '碳板材料',
        count: data.summary.carbonMaterials.totalMaterials,
        percentage: data.summary.carbonMaterials.percentage
      }
    ];

    // 只有当特殊材料存在时才添加选项
    if (data.summary.specialMaterials.totalMaterials > 0) {
      options.push({
        value: 'special',
        label: '特殊材料',
        count: data.summary.specialMaterials.totalMaterials,
        percentage: data.summary.specialMaterials.percentage
      });
    }

    return options;
  };

  // 获取状态筛选选项
  const getStatusFilterOptions = () => {
    if (!data) return [];

    const allMaterials = [...data.carbonMaterials, ...data.specialMaterials];
    
    const totalPending = allMaterials.reduce((sum, m) => sum + m.stats.pendingCount, 0);
    const totalInProgress = allMaterials.reduce((sum, m) => sum + m.stats.inProgressCount, 0);
    const totalCompleted = allMaterials.reduce((sum, m) => sum + m.stats.completedCount, 0);

    return [
      { value: 'all', label: '所有状态', count: data.summary.totalMaterials },
      { value: 'pending', label: '待处理', count: totalPending },
      { value: 'in_progress', label: '进行中', count: totalInProgress },
      { value: 'completed', label: '已完成', count: totalCompleted }
    ].filter(option => option.count > 0);
  };

  // 初始化时获取数据
  useEffect(() => {
    fetchStats();
  }, [token]);

  // 监听材料更新事件
  useEffect(() => {
    const handleMaterialsUpdate = () => {
      fetchStats();
    };

    window.addEventListener('materials-updated', handleMaterialsUpdate);
    window.addEventListener('material-status-updated', handleMaterialsUpdate); // 新的材料状态更新事件
    
    return () => {
      window.removeEventListener('materials-updated', handleMaterialsUpdate);
      window.removeEventListener('material-status-updated', handleMaterialsUpdate);
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    fetchStats,
    applyFilter,
    getQuickFilterOptions,
    getStatusFilterOptions,
  };
};
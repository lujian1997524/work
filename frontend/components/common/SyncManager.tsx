'use client';

import { useEffect } from 'react';
import { useGlobalSyncStore } from '@/stores';
import { Badge } from '@/components/ui';

/**
 * 全局状态同步初始化组件
 * 在应用启动时初始化事件监听器
 */
export const GlobalSyncInitializer = () => {
  const { startEventListeners, stopEventListeners } = useGlobalSyncStore();

  useEffect(() => {
    // 启动全局事件监听器
    startEventListeners();

    // 组件卸载时清理
    return () => {
      stopEventListeners();
    };
  }, [startEventListeners, stopEventListeners]);

  // 此组件不渲染任何内容
  return null;
};

/**
 * 状态同步状态指示器
 * 显示当前的同步状态
 */
export const SyncStatusIndicator = () => {
  const { isOnline, lastSyncTime, syncErrors } = useGlobalSyncStore();

  const formatLastSync = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else {
      return new Date(timestamp).toLocaleTimeString();
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      {/* 在线状态指示器 */}
      <Badge
        variant={isOnline ? 'success' : 'danger'}
        size="sm"
        className="flex items-center space-x-1"
      >
        <div 
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>
          {isOnline ? '在线' : '离线'}
        </span>
      </Badge>

      {/* 最后同步时间 */}
      {isOnline && (
        <span className="text-gray-500">
          最后同步: {formatLastSync(lastSyncTime)}
        </span>
      )}

      {/* 错误指示器 */}
      {syncErrors.length > 0 && (
        <Badge
          variant="warning"
          size="sm"
          className="cursor-pointer"
        >
          ⚠️ {syncErrors.length}个同步问题
        </Badge>
      )}
    </div>
  );
};

/**
 * 状态同步Hook
 * 提供便捷的状态管理方法
 */
export const useSyncStatus = () => {
  const { 
    isOnline, 
    lastSyncTime, 
    syncErrors,
    addSyncError,
    clearSyncErrors 
  } = useGlobalSyncStore();

  const notifyError = (error: string) => {
    addSyncError(error);
    console.error('同步错误:', error);
  };

  const isRecentlyUpdated = (threshold = 30000) => { // 30秒内
    return Date.now() - lastSyncTime < threshold;
  };

  return {
    isOnline,
    lastSyncTime,
    syncErrors,
    hasErrors: syncErrors.length > 0,
    isRecentlyUpdated,
    notifyError,
    clearSyncErrors,
  };
};
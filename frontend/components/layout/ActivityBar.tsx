'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from './UserMenu';
import {
  FolderIcon,
  ClockIcon,
  DocumentTextIcon,
  CubeIcon,
  CogIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface ActivityBarProps {
  activeView: 'active' | 'completed' | 'drawings' | 'materials' | 'workers' | 'public-inventory' | 'settings' | 'attendance';
  onViewChange: (view: 'active' | 'completed' | 'drawings' | 'materials' | 'workers' | 'public-inventory' | 'settings' | 'attendance') => void;
  onSearchClick?: () => void;
  onSystemSettingsClick?: () => void;
  onProfileClick?: () => void;
  className?: string;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeView,
  onViewChange,
  onSearchClick,
  onSystemSettingsClick,
  onProfileClick,
  className = ''
}) => {
  const { user } = useAuth();

  const activities = [
    { key: 'active', icon: FolderIcon, label: '活跃项目' },
    { key: 'completed', icon: ClockIcon, label: '过往项目' },
    { key: 'drawings', icon: DocumentTextIcon, label: '图纸库' },
    { key: 'materials', icon: CubeIcon, label: '板材库存' },
    { key: 'attendance', icon: CalendarDaysIcon, label: '考勤管理' }
  ];

  const adminActivities = [
    { key: 'settings', icon: CogIcon, label: '系统配置' }
  ];
  return (
    <div className={`w-16 bg-gray-50/95 border-r border-gray-200 flex-shrink-0 flex flex-col ${className}`}>
      {/* 搜索按钮 */}
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSearchClick}
          className="w-12 h-12 p-0 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white/80"
          
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
        </Button>
      </div>
      
      {/* 分隔线 */}
      <div className="mx-2 h-px bg-gray-300"></div>
      
      {/* 主要功能 */}
      <div className="p-2 space-y-2">
        {activities.map((activity) => {
          const IconComponent = activity.icon;
          const isActive = activeView === activity.key;
          return (
            <Button
              key={activity.key}
              variant="ghost"
              size="sm"
              onClick={() => onViewChange(activity.key as any)}
              className={`w-12 h-12 p-0 flex items-center justify-center relative ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
              }`}
              
            >
              <IconComponent className="w-5 h-5" />
              {isActive && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
              )}
            </Button>
          );
        })}
      </div>

      {/* 管理员功能 */}
      {user?.role === 'admin' && (
        <>
          <div className="mx-2 h-px bg-gray-300"></div>
          <div className="p-2 space-y-2">
            {adminActivities.map((activity) => {
              const IconComponent = activity.icon;
              const isActive = activeView === activity.key;
              return (
                <Button
                  key={activity.key}
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewChange(activity.key as any)}
                  className={`w-12 h-12 p-0 flex items-center justify-center relative ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                  }`}
                  
                >
                  <IconComponent className="w-5 h-5" />
                  {isActive && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                  )}
                </Button>
              );
            })}
          </div>
        </>
      )}

      {/* 用户菜单 */}
      <div className="mt-auto p-2">
        <UserMenu 
          onProfileClick={onProfileClick}
          onSettingsClick={onSystemSettingsClick}
        />
      </div>
    </div>
  );
};
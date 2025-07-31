'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from './UserMenu';
import {
  FolderIcon,
  ClockIcon,
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface ActivityBarProps {
  activeView: 'active' | 'completed' | 'drawings' | 'workers' | 'dashboard' | 'settings';
  onViewChange: (view: 'active' | 'completed' | 'drawings' | 'workers' | 'dashboard' | 'settings') => void;
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
    { 
      key: 'active', 
      icon: FolderIcon,
      label: '活跃项目', 
      description: '当前进行中的项目'
    },
    { 
      key: 'completed', 
      icon: ClockIcon,
      label: '过往项目', 
      description: '已完成的历史项目'
    },
    { 
      key: 'drawings', 
      icon: DocumentTextIcon,
      label: '图纸库', 
      description: '图纸文件管理'
    },
    { 
      key: 'workers', 
      icon: UsersIcon,
      label: '工人管理', 
      description: '员工信息管理'
    },
    { 
      key: 'dashboard', 
      icon: ChartBarIcon,
      label: '仪表盘', 
      description: '数据统计和报表'
    }
  ] as const;

  // 管理员专用功能
  const adminActivities = [
    { 
      key: 'settings', 
      icon: CogIcon,
      label: '板材管理', 
      description: '厚度规格配置'
    }
  ] as const;

  return (
    <div className={`w-16 bg-gray-50/80 backdrop-blur-xl border-r border-gray-200 flex-shrink-0 flex flex-col ${className}`}>
      {/* 主功能活动栏 */}
      <div className="p-2 space-y-1">
        {/* 搜索按钮 */}
        <motion.div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSearchClick}
            className="w-12 h-12 p-0 flex flex-col items-center justify-center relative group text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <MagnifyingGlassIcon className="w-6 h-6" />
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              搜索 (Ctrl+K)
            </div>
          </Button>
        </motion.div>
        
        {/* 分隔线 */}
        <div className="mx-2 border-t border-gray-200 my-2"></div>
        
        {activities.map((activity) => {
          const IconComponent = activity.icon;
          return (
            <motion.div key={activity.key}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange(activity.key as any)}
                className={`
                  w-12 h-12 p-0 flex flex-col items-center justify-center relative group
                  ${activeView === activity.key 
                    ? 'bg-ios18-blue/10 text-ios18-blue border border-ios18-blue/20' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <IconComponent className="w-6 h-6" />
                
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {activity.label}
                </div>
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* 管理员功能 */}
      {user?.role === 'admin' && (
        <>
          <div className="mx-2 border-t border-gray-200"></div>
          <div className="p-2 space-y-1">
            {adminActivities.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <motion.div key={activity.key}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewChange(activity.key as any)}
                    className={`
                      w-12 h-12 p-0 flex flex-col items-center justify-center relative group
                      ${activeView === activity.key 
                        ? 'bg-ios18-blue/10 text-ios18-blue border border-ios18-blue/20' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <IconComponent className="w-6 h-6" />
                    
                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {activity.label}
                    </div>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* 用户信息 */}
      <div className="mt-auto">
        <div className="p-2">
          <UserMenu 
            onProfileClick={onProfileClick}
            onSettingsClick={onSystemSettingsClick}
          />
        </div>
      </div>
    </div>
  );
};
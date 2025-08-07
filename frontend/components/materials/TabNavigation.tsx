'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui';
import { 
  CubeIcon, 
  UserGroupIcon 
} from '@heroicons/react/24/outline';

interface TabNavigationProps {
  activeTab: 'inventory' | 'workers';
  onTabChange: (tab: 'inventory' | 'workers') => void;
  inventoryCount: number;
  workerCount: number;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  inventoryCount,
  workerCount,
  className = ''
}) => {
  const tabs = [
    {
      id: 'inventory' as const,
      label: '板材库存',
      icon: CubeIcon,
      count: inventoryCount,
      description: '查看和管理板材库存'
    },
    {
      id: 'workers' as const,
      label: '工人管理',
      icon: UserGroupIcon,
      count: workerCount,
      description: '管理工人信息和板材分配'
    }
  ];

  return (
    <div className={`flex border-b border-gray-200 bg-white ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              <span>{tab.label}</span>
              <Badge 
                variant={isActive ? 'primary' : 'secondary'} 
                size="sm"
              >
                {tab.count}
              </Badge>
            </div>
            
            {/* 活跃指示器动画 */}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
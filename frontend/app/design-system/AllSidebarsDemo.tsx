'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { UnifiedSidebar } from './UnifiedSidebar';
import type { SidebarGroup } from './UnifiedSidebar';
import {
  FolderIcon,
  ClockIcon,
  DocumentTextIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

// 模拟数据
const mockProjects = [
  { id: 1, name: '激光切割项目A', status: 'pending' },
  { id: 2, name: '钣金加工项目', status: 'in_progress' },
  { id: 3, name: '精密切割项目', status: 'pending' },
  { id: 4, name: '批量生产项目', status: 'completed' }
];

const mockDepartments = [
  { id: 1, name: '生产部', workerCount: 8 },
  { id: 2, name: '技术部', workerCount: 5 },
  { id: 3, name: '质检部', workerCount: 3 },
  { id: 4, name: '管理部', workerCount: 2 }
];

const mockDrawings = [
  { id: 1, name: '项目图纸', count: 45 },
  { id: 2, name: '常用零件', count: 23 },
  { id: 3, name: '模板文件', count: 12 }
];

export const AllSidebarsDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState('projects');
  const [selectedKey, setSelectedKey] = useState('all');
  const [mounted, setMounted] = useState(false);

  // 避免水合错误
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // 项目侧边栏数据
  const projectGroups: SidebarGroup[] = [
    {
      key: 'overview',
      label: '项目概览',
      icon: <FolderIcon className="w-5 h-5" />,
      items: [
        {
          key: 'all',
          label: '全部项目',
          count: mockProjects.length,
          icon: <FolderIcon className="w-4 h-4" />
        }
      ]
    },
    {
      key: 'status',
      label: '按状态分类',
      icon: <ChartBarIcon className="w-5 h-5" />,
      items: [
        {
          key: 'pending',
          label: '待处理',
          count: mockProjects.filter(p => p.status === 'pending').length,
          icon: <ClockIcon className="w-4 h-4" />
        },
        {
          key: 'in_progress',
          label: '进行中',
          count: mockProjects.filter(p => p.status === 'in_progress').length,
          icon: <UserGroupIcon className="w-4 h-4" />
        },
        {
          key: 'completed',
          label: '已完成',
          count: mockProjects.filter(p => p.status === 'completed').length,
          icon: <ArchiveBoxIcon className="w-4 h-4" />
        }
      ]
    },
    {
      key: 'projects',
      label: '项目列表',
      icon: <DocumentIcon className="w-5 h-5" />,
      items: mockProjects.map(project => ({
        key: project.id.toString(),
        label: project.name,
        icon: <DocumentIcon className="w-4 h-4" />,
        data: project
      }))
    }
  ];

  // 工人管理侧边栏数据
  const workerGroups: SidebarGroup[] = [
    {
      key: 'overview',
      label: '工人概览',
      icon: <UsersIcon className="w-5 h-5" />,
      items: [
        {
          key: 'all',
          label: '全部工人',
          count: mockDepartments.reduce((total, dept) => total + dept.workerCount, 0),
          icon: <UsersIcon className="w-4 h-4" />
        }
      ]
    },
    {
      key: 'departments',
      label: '部门管理',
      icon: <BuildingOfficeIcon className="w-5 h-5" />,
      items: mockDepartments.map(dept => ({
        key: dept.name,
        label: dept.name,
        count: dept.workerCount,
        icon: <BuildingOfficeIcon className="w-4 h-4" />,
        data: dept
      }))
    }
  ];

  // 图纸库侧边栏数据
  const drawingGroups: SidebarGroup[] = [
    {
      key: 'categories',
      label: '图纸分类',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      items: [
        {
          key: 'all',
          label: '全部图纸',
          count: mockDrawings.reduce((total, d) => total + d.count, 0),
          icon: <DocumentTextIcon className="w-4 h-4" />
        },
        ...mockDrawings.map(drawing => ({
          key: drawing.name,
          label: drawing.name,
          count: drawing.count,
          icon: <DocumentTextIcon className="w-4 h-4" />,
          data: drawing
        }))
      ]
    }
  ];

  const getCurrentGroups = () => {
    switch (activeDemo) {
      case 'projects': return projectGroups;
      case 'workers': return workerGroups;
      case 'drawings': return drawingGroups;
      default: return projectGroups;
    }
  };

  const getCurrentTitle = () => {
    switch (activeDemo) {
      case 'projects': return '项目列表';
      case 'workers': return '工人管理';
      case 'drawings': return '图纸库';
      default: return '项目列表';
    }
  };

  const handleItemAction = (action: 'edit' | 'delete', item: any) => {
    alert(`${action === 'edit' ? '编辑' : '删除'}: ${item.label}\n(这是设计系统预览)`);
  };

  return (
    <div className="space-y-6">
      {/* 切换按钮 */}
      <div className="flex space-x-2 mb-4">
        <Button
          variant={activeDemo === 'projects' ? 'primary' : 'secondary'}
          onClick={() => {
            setActiveDemo('projects');
            setSelectedKey('all');
          }}
        >
          项目侧边栏
        </Button>
        <Button
          variant={activeDemo === 'workers' ? 'primary' : 'secondary'}
          onClick={() => {
            setActiveDemo('workers');
            setSelectedKey('all');
          }}
        >
          工人管理侧边栏
        </Button>
        <Button
          variant={activeDemo === 'drawings' ? 'primary' : 'secondary'}
          onClick={() => {
            setActiveDemo('drawings');
            setSelectedKey('all');
          }}
        >
          图纸库侧边栏
        </Button>
      </div>

      {/* 当前状态显示 */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>当前类型：</strong> {getCurrentTitle()} |{' '}
          <strong>选中项：</strong> {selectedKey}
        </p>
      </div>

      {/* 侧边栏展示 */}
      <div className="relative">
        {/* 组件名称标识 */}
        <div className="absolute top-2 right-2 z-10 text-xs bg-white/90 backdrop-blur-sm text-gray-600 px-2 py-1 rounded border font-mono">
          UnifiedSidebar.tsx
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <UnifiedSidebar
            title={getCurrentTitle()}
            groups={getCurrentGroups()}
            selectedKey={selectedKey}
            onItemSelect={setSelectedKey}
            actions={
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => alert('刷新功能 (设计系统预览)')}
                >
                  刷新
                </Button>
                <Button
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  size="sm"
                  onClick={() => alert('新建功能 (设计系统预览)')}
                >
                  + 新建
                </Button>
              </>
            }
            showItemActions={activeDemo === 'workers'}
            onItemAction={handleItemAction}
            className="h-full"
          />
        </div>
      </div>

      {/* 设计说明 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">统一侧边栏设计特点</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>统一的视觉风格</strong>：所有侧边栏使用相同的背景、边框、间距</li>
          <li>• <strong>分组折叠设计</strong>：支持多级分组，可折叠展开</li>
          <li>• <strong>选中状态一致</strong>：统一的高亮样式和图标颜色</li>
          <li>• <strong>操作按钮统一</strong>：顶部操作区域布局一致</li>
          <li>• <strong>悬停效果统一</strong>：鼠标交互反馈保持一致</li>
          <li>• <strong>通用组件架构</strong>：一个组件适配所有侧边栏场景</li>
          <li>• <strong>数据驱动</strong>：通过配置数据结构生成不同类型侧边栏</li>
        </ul>
      </div>
    </div>
  );
};
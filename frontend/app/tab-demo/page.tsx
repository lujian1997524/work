'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TabBar,
  Card,
  Button,
  Badge,
  ResponsiveContainer,
  AdaptiveLayout
} from '@/components/ui';
import { 
  CalendarDaysIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  PhotoIcon,
  ClockIcon,
  HomeIcon,
  BellIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// 新设计方案的TabBar组件
const ModernTabBar = ({ tabs, activeTab, onChange, variant = 'design1', className = '' }: {
  tabs: any[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: string;
  className?: string;
}) => {
  const renderTab = (tab: any, index: number) => {
    const isActive = tab.id === activeTab;
    
    if (variant === 'design1') {
      // 方案1: 现代毛玻璃风格
      return (
        <motion.button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            relative px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300
            ${isActive 
              ? 'text-white shadow-lg' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isActive && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl"
              layoutId="activeTab1"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <div className="relative flex items-center space-x-2">
            {tab.icon && <span className="text-current">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`
                px-1.5 py-0.5 text-xs rounded-full font-semibold
                ${isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}
              `}>
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
        </motion.button>
      );
    }
    
    if (variant === 'design2') {
      // 方案2: 简约线条风格
      return (
        <motion.button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            relative px-6 py-3 font-medium text-sm transition-all duration-200
            ${isActive 
              ? 'text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
          whileHover={{ y: -1 }}
          whileTap={{ y: 0 }}
        >
          <div className="flex items-center space-x-2">
            {tab.icon && <span className="text-current">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full font-semibold">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
          {isActive && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
              layoutId="activeTab2"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </motion.button>
      );
    }
    
    if (variant === 'design3') {
      // 方案3: 卡片阴影风格
      return (
        <motion.button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            relative px-4 py-3 rounded-lg font-medium text-sm transition-all duration-300
            ${isActive 
              ? 'text-blue-600 bg-white shadow-lg border border-blue-100' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center space-x-2">
            {tab.icon && (
              <span className={`${isActive ? 'text-blue-600' : 'text-current'}`}>
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full font-semibold">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
        </motion.button>
      );
    }
    
    if (variant === 'design4') {
      // 方案4: 苹果风格
      return (
        <motion.button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            relative px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200
            ${isActive 
              ? 'text-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex flex-col items-center space-y-1">
            {tab.icon && (
              <span className={`${isActive ? 'text-blue-600' : 'text-current'}`}>
                {tab.icon}
              </span>
            )}
            <span className="text-xs">{tab.label}</span>
            {tab.badge && (
              <span className="absolute -top-1 -right-1 px-1 py-0.5 text-xs bg-red-500 text-white rounded-full font-semibold min-w-[16px] h-4 flex items-center justify-center">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
        </motion.button>
      );
    }
    
    if (variant === 'design5') {
      // 方案5: 分段控制器风格
      return (
        <motion.button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            relative px-4 py-2 font-medium text-sm transition-all duration-300 flex-1
            ${isActive 
              ? 'text-white' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
          whileHover={{ scale: isActive ? 1 : 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isActive && (
            <motion.div
              className="absolute inset-0 bg-blue-600 rounded-lg shadow-md"
              layoutId="activeTab5"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <div className="relative flex items-center justify-center space-x-2">
            {tab.icon && <span className="text-current">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`
                px-1.5 py-0.5 text-xs rounded-full font-semibold
                ${isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}
              `}>
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
        </motion.button>
      );
    }
  };
  
  const containerClasses = {
    design1: 'flex bg-gray-100/80 backdrop-blur-sm p-1 rounded-2xl',
    design2: 'flex border-b border-gray-200',
    design3: 'flex bg-gray-50 p-1 rounded-xl gap-1',
    design4: 'flex bg-gray-100 p-1 rounded-xl gap-1',
    design5: 'flex bg-gray-100 p-1 rounded-xl gap-1'
  };
  
  return (
    <div className={`${containerClasses[variant as keyof typeof containerClasses]} ${className}`}>
      {tabs.map(renderTab)}
    </div>
  );
};

export default function TabDemoPage() {
  const [activeTab1, setActiveTab1] = useState('today');
  const [activeTab2, setActiveTab2] = useState('overview');
  const [activeTab3, setActiveTab3] = useState('materials');
  const [activeTab4, setActiveTab4] = useState('employees');
  const [activeTab5, setActiveTab5] = useState('home');

  // 考勤管理Tab配置
  const attendanceTabs = [
    {
      id: 'today',
      label: '今日考勤',
      icon: <CalendarDaysIcon className="w-4 h-4" />,
      badge: 24
    },
    {
      id: 'employees',
      label: '员工管理', 
      icon: <UsersIcon className="w-4 h-4" />,
      badge: 18
    },
    {
      id: 'statistics',
      label: '统计报表',
      icon: <ChartBarIcon className="w-4 h-4" />
    }
  ];

  // 项目详情Tab配置
  const projectTabs = [
    { 
      id: 'overview', 
      label: '概览', 
      icon: <DocumentTextIcon className="w-4 h-4" />
    },
    { 
      id: 'materials', 
      label: '板材', 
      icon: <CogIcon className="w-4 h-4" />,
      badge: 12
    },
    { 
      id: 'drawings', 
      label: '图纸', 
      icon: <PhotoIcon className="w-4 h-4" />,
      badge: 5
    },
    { 
      id: 'history', 
      label: '历史', 
      icon: <ClockIcon className="w-4 h-4" />
    }
  ];

  // 主导航Tab配置
  const mainNavTabs = [
    {
      id: 'home',
      label: '首页',
      icon: <HomeIcon className="w-4 h-4" />
    },
    {
      id: 'projects',
      label: '项目',
      icon: <CogIcon className="w-4 h-4" />,
      badge: 8
    },
    {
      id: 'notifications',
      label: '通知',
      icon: <BellIcon className="w-4 h-4" />,
      badge: 3
    },
    {
      id: 'settings',
      label: '设置',
      icon: <Cog6ToothIcon className="w-4 h-4" />
    }
  ];

  return (
    <ResponsiveContainer className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-8">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TabBar 设计方案</h1>
          <p className="text-gray-600">五种现代化的TabBar设计方案，请选择你喜欢的风格</p>
        </div>

        {/* 新设计: Modern自适应风格 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">新设计: Modern自适应风格</h2>
              <p className="text-gray-600 text-sm">桌面端卡片阴影 + 移动端苹果风格，自动适配</p>
            </div>
            <Badge variant="success">已应用</Badge>
          </div>
          
          <TabBar
            tabs={attendanceTabs}
            activeTab={activeTab1}
            onChange={setActiveTab1}
            variant="modern"
            className="mb-6"
          />
          
          <motion.div
            key={activeTab1}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg"
          >
            <h3 className="font-medium text-gray-900">
              {attendanceTabs.find(tab => tab.id === activeTab1)?.label} 内容
            </h3>
            <p className="text-gray-600 mt-2">
              这是新的modern变体，桌面端显示卡片阴影风格，移动端自动切换为苹果风格的垂直布局。
            </p>
          </motion.div>
        </Card>

        {/* 方案1: 现代毛玻璃风格 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">方案1: 现代毛玻璃风格</h2>
              <p className="text-gray-600 text-sm">渐变背景 + 毛玻璃效果，现代感强</p>
            </div>
            <Badge variant="primary">推荐</Badge>
          </div>
          
          <ModernTabBar
            tabs={attendanceTabs}
            activeTab={activeTab1}
            onChange={setActiveTab1}
            variant="design1"
            className="mb-6"
          />
          
          <motion.div
            key={activeTab1}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
          >
            <h3 className="font-medium text-gray-900">
              {attendanceTabs.find(tab => tab.id === activeTab1)?.label} 内容
            </h3>
            <p className="text-gray-600 mt-2">
              活跃Tab有渐变背景，非活跃Tab有毛玻璃悬停效果，视觉层次丰富。
            </p>
          </motion.div>
        </Card>

        {/* 方案2: 简约线条风格 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">方案2: 简约线条风格</h2>
              <p className="text-gray-600 text-sm">底部线条指示器，简洁清爽</p>
            </div>
            <Badge variant="secondary">经典</Badge>
          </div>
          
          <ModernTabBar
            tabs={projectTabs}
            activeTab={activeTab2}
            onChange={setActiveTab2}
            variant="design2"
            className="mb-6"
          />
          
          <motion.div
            key={activeTab2}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-50 rounded-lg"
          >
            <h3 className="font-medium text-blue-900">
              {projectTabs.find(tab => tab.id === activeTab2)?.label} 页面
            </h3>
            <p className="text-blue-700 mt-2">
              底部蓝色线条指示当前选中状态，悬停时有轻微上移动画。
            </p>
          </motion.div>
        </Card>

        {/* 方案3: 卡片阴影风格 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">方案3: 卡片阴影风格</h2>
              <p className="text-gray-600 text-sm">白色卡片 + 阴影，立体感强</p>
            </div>
            <Badge variant="outline">立体</Badge>
          </div>
          
          <ModernTabBar
            tabs={projectTabs}
            activeTab={activeTab3}
            onChange={setActiveTab3}
            variant="design3"
            className="mb-6"
          />
          
          <motion.div
            key={activeTab3}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white border border-blue-100 rounded-lg shadow-sm"
          >
            <h3 className="font-medium text-gray-900">
              {projectTabs.find(tab => tab.id === activeTab3)?.label} 模块
            </h3>
            <p className="text-gray-600 mt-2">
              活跃Tab呈现白色卡片效果，带有蓝色边框和阴影，层次分明。
            </p>
          </motion.div>
        </Card>

        {/* 方案4: 苹果风格 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">方案4: 苹果风格</h2>
              <p className="text-gray-600 text-sm">垂直布局，类似iOS底部TabBar</p>
            </div>
            <Badge variant="success">移动优先</Badge>
          </div>
          
          <ModernTabBar
            tabs={attendanceTabs}
            activeTab={activeTab4}
            onChange={setActiveTab4}
            variant="design4"
            className="mb-6 justify-center"
          />
          
          <motion.div
            key={activeTab4}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-50 rounded-lg"
          >
            <h3 className="font-medium text-blue-900">
              {attendanceTabs.find(tab => tab.id === activeTab4)?.label} 应用
            </h3>
            <p className="text-blue-700 mt-2">
              图标在上文字在下的垂直布局，适合移动端使用，徽章显示在右上角。
            </p>
          </motion.div>
        </Card>

        {/* 方案5: 分段控制器风格 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">方案5: 分段控制器风格</h2>
              <p className="text-gray-600 text-sm">iOS分段控制器风格，等宽分布</p>
            </div>
            <Badge variant="warning">紧凑</Badge>
          </div>
          
          <ModernTabBar
            tabs={mainNavTabs}
            activeTab={activeTab5}
            onChange={setActiveTab5}
            variant="design5"
            className="mb-6"
          />
          
          <motion.div
            key={activeTab5}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-50 rounded-lg"
          >
            <h3 className="font-medium text-blue-900">
              {mainNavTabs.find(tab => tab.id === activeTab5)?.label} 功能
            </h3>
            <p className="text-blue-700 mt-2">
              类似iOS分段控制器，Tab等宽分布，活跃状态有蓝色背景滑动动画。
            </p>
          </motion.div>
        </Card>

        {/* 对比表格 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">设计方案对比</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">方案</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">风格特点</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">适用场景</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">视觉效果</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">推荐指数</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">方案1</td>
                  <td className="py-3 px-4">现代毛玻璃风格</td>
                  <td className="py-3 px-4">主要导航区域</td>
                  <td className="py-3 px-4">渐变背景，现代感强</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="flex text-yellow-400">★★★★★</div>
                      <Badge variant="primary" size="sm" className="ml-2">推荐</Badge>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">方案2</td>
                  <td className="py-3 px-4">简约线条风格</td>
                  <td className="py-3 px-4">内容页面导航</td>
                  <td className="py-3 px-4">简洁清爽，经典</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="flex text-yellow-400">★★★★☆</div>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">方案3</td>
                  <td className="py-3 px-4">卡片阴影风格</td>
                  <td className="py-3 px-4">设置页面，表单</td>
                  <td className="py-3 px-4">立体感强，层次清晰</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="flex text-yellow-400">★★★☆☆</div>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">方案4</td>
                  <td className="py-3 px-4">苹果风格</td>
                  <td className="py-3 px-4">移动端底部导航</td>
                  <td className="py-3 px-4">垂直布局，移动优先</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="flex text-yellow-400">★★★★☆</div>
                      <Badge variant="success" size="sm" className="ml-2">移动端</Badge>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">方案5</td>
                  <td className="py-3 px-4">分段控制器</td>
                  <td className="py-3 px-4">筛选器，少量选项</td>
                  <td className="py-3 px-4">紧凑，等宽分布</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="flex text-yellow-400">★★★☆☆</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* 操作按钮 */}
        <div className="text-center">
          <AdaptiveLayout direction="row" gap="md" className="justify-center">
            <Button 
              variant="secondary" 
              onClick={() => window.history.back()}
            >
              返回上一页
            </Button>
            <Button 
              variant="primary"
              onClick={() => {
                alert('请告诉我你选择哪个方案，我将实现到项目中！');
              }}
            >
              选择并应用
            </Button>
          </AdaptiveLayout>
        </div>
      </div>
    </ResponsiveContainer>
  );
}
'use client';

import React from 'react';
import { 
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { ResponsiveStatCards } from '@/components/ui/StatCardSwiper';
import { MobileEmployeeList, MobileStatsOverview } from '@/components/ui/MobileEmployeeCard';

const testStats = [
  { 
    icon: UsersIcon, 
    label: '员工总数', 
    value: 25, 
    color: 'blue' as const 
  },
  { 
    icon: ClockIcon, 
    label: '工作时长', 
    value: '160小时', 
    color: 'green' as const 
  },
  { 
    icon: CalendarDaysIcon, 
    label: '请假时长', 
    value: '8小时', 
    color: 'yellow' as const 
  },
  { 
    icon: ChartBarIcon, 
    label: '出勤率', 
    value: '96.5%', 
    color: 'purple' as const 
  }
];

const testEmployees = [
  {
    id: 1,
    name: '员工A',
    employeeId: 'E001',
    department: '生产车间',
    position: '操作员',
    phone: '138****8001',
    status: 'active' as const,
    hireDate: '2023-01-01',
    dailyWorkHours: 9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2, 
    name: '员工B',
    employeeId: 'E002',
    department: '技术车间',
    position: '技师',
    phone: '138****8002',
    status: 'active' as const,
    hireDate: '2023-02-01',
    dailyWorkHours: 9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default function MobileTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">移动端组件测试</h1>
        
        {/* 测试统计卡片轮播 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">统计卡片轮播</h2>
          <ResponsiveStatCards stats={testStats} />
        </section>
        
        {/* 测试员工统计概览 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">员工概览</h2>
          <MobileStatsOverview 
            totalEmployees={25}
            activeEmployees={23}
            inactiveEmployees={2}
          />
        </section>
        
        {/* 测试员工卡片列表 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">员工卡片</h2>
          <MobileEmployeeList
            employees={testEmployees}
            onEdit={(emp) => console.log('编辑:', emp)}
            onDelete={(emp) => console.log('删除:', emp)}
          />
        </section>
        
        {/* 普通文本确认页面正常 */}
        <div className="text-center text-gray-600 mt-8">
          <p>如果你能看到这个页面，说明基础页面是正常的</p>
          <p>请检查上方的移动端组件是否显示</p>
        </div>
      </div>
    </div>
  );
}
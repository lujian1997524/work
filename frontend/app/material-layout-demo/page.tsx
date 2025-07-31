'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';

// 模拟数据
const mockProjects = [
  {
    id: 1,
    name: '项目A',
    worker: '张三',
    status: 'in_progress',
    thicknesses: [2, 3, 4, 5, 6, 8, 10],
    materials: {
      2: { status: 'completed', completedAt: '2024-01-01', note: '质量良好' },
      3: { status: 'pending', completedAt: null, note: '' },
      4: { status: 'completed', completedAt: '2024-01-02', note: '按时完成' },
      5: { status: 'pending', completedAt: null, note: '' },
      6: { status: 'completed', completedAt: '2024-01-03', note: '' },
      8: { status: 'pending', completedAt: null, note: '需要注意精度' },
      10: { status: 'completed', completedAt: '2024-01-04', note: '' }
    }
  },
  {
    id: 2,
    name: '项目B',
    worker: '李四',
    status: 'pending',
    thicknesses: [5, 8, 10, 12, 16],
    materials: {
      5: { status: 'pending', completedAt: null, note: '' },
      8: { status: 'completed', completedAt: '2024-01-05', note: '提前完成' },
      10: { status: 'pending', completedAt: null, note: '' },
      12: { status: 'completed', completedAt: '2024-01-06', note: '' },
      16: { status: 'pending', completedAt: null, note: '材料已准备' }
    }
  },
  {
    id: 3,
    name: '项目C',
    worker: '王五',
    status: 'in_progress',
    thicknesses: [4, 6, 8, 16, 20],
    materials: {
      4: { status: 'completed', completedAt: '2024-01-07', note: '' },
      6: { status: 'pending', completedAt: null, note: '' },
      8: { status: 'in_progress', completedAt: null, note: '正在处理' },
      16: { status: 'pending', completedAt: null, note: '' },
      20: { status: 'pending', completedAt: null, note: '特殊要求' }
    }
  },
  {
    id: 4,
    name: '项目D',
    worker: '赵六',
    status: 'completed',
    thicknesses: [3, 10, 16, 25, 30],
    materials: {
      3: { status: 'completed', completedAt: '2024-01-08', note: '' },
      10: { status: 'completed', completedAt: '2024-01-09', note: '优质完成' },
      16: { status: 'completed', completedAt: '2024-01-10', note: '' },
      25: { status: 'completed', completedAt: '2024-01-11', note: '' },
      30: { status: 'completed', completedAt: '2024-01-12', note: '厚板专用' }
    }
  },
  {
    id: 5,
    name: '项目E',
    worker: '孙七',
    status: 'in_progress',
    thicknesses: [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25],
    materials: {
      2: { status: 'completed', completedAt: '2024-01-13', note: '' },
      3: { status: 'completed', completedAt: '2024-01-14', note: '' },
      4: { status: 'in_progress', completedAt: null, note: '进行中' },
      5: { status: 'pending', completedAt: null, note: '' },
      6: { status: 'pending', completedAt: null, note: '' },
      8: { status: 'in_progress', completedAt: null, note: '进行中' },
      10: { status: 'pending', completedAt: null, note: '' },
      12: { status: 'pending', completedAt: null, note: '' },
      16: { status: 'pending', completedAt: null, note: '' },
      20: { status: 'pending', completedAt: null, note: '' },
      25: { status: 'pending', completedAt: null, note: '大型项目' }
    }
  }
];

const statusConfig = {
  pending: { label: '待处理', color: 'bg-gray-200', textColor: 'text-gray-600' },
  in_progress: { label: '进行中', color: 'bg-blue-200', textColor: 'text-blue-600' },
  completed: { label: '已完成', color: 'bg-green-200', textColor: 'text-green-600' }
};

// 方案一：动态列表格
const DynamicTableView = ({ projects }: { projects: any[] }) => {
  // 获取当前项目中所有用到的厚度
  const allThicknesses = Array.from(
    new Set(projects.flatMap(p => p.thicknesses))
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">方案一：动态列表格（只显示有数据的厚度列）</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 p-2 text-left">项目名</th>
              <th className="border border-gray-300 p-2 text-left">工人</th>
              <th className="border border-gray-300 p-2 text-left">状态</th>
              {allThicknesses.map(thickness => (
                <th key={thickness} className="border border-gray-300 p-2 text-center w-20">
                  {thickness}mm
                </th>
              ))}
              <th className="border border-gray-300 p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2">{project.name}</td>
                <td className="border border-gray-300 p-2">{project.worker}</td>
                <td className="border border-gray-300 p-2">
                  <span className={`px-2 py-1 rounded text-xs ${statusConfig[project.status as keyof typeof statusConfig].color} ${statusConfig[project.status as keyof typeof statusConfig].textColor}`}>
                    {statusConfig[project.status as keyof typeof statusConfig].label}
                  </span>
                </td>
                {allThicknesses.map(thickness => (
                  <td key={thickness} className="border border-gray-300 p-1 text-center">
                    {project.thicknesses.includes(thickness) ? (
                      <button className={`w-6 h-6 rounded-full ${statusConfig[project.materials[thickness].status as keyof typeof statusConfig].color} hover:opacity-80 transition-opacity`}>
                        {project.materials[thickness].status === 'completed' ? '●' : 
                         project.materials[thickness].status === 'in_progress' ? '◐' : '○'}
                      </button>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                ))}
                <td className="border border-gray-300 p-2">
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm"><EyeIcon className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm"><PencilIcon className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 方案二：紧凑视图 + 展开详情
const CompactExpandView = ({ projects }: { projects: any[] }) => {
  const [expandedProject, setExpandedProject] = useState<number | null>(null);

  const getCompletionStats = (project: any) => {
    const completed = project.thicknesses.filter((t: number) => project.materials[t].status === 'completed').length;
    return `${completed}/${project.thicknesses.length}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">方案二：紧凑视图 + 展开详情</h3>
      <div className="space-y-2">
        {projects.map(project => (
          <div key={project.id} className="border rounded-lg">
            {/* 主行 */}
            <div className="p-4 bg-gray-50 flex items-center justify-between hover:bg-gray-100 cursor-pointer"
                 onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}>
              <div className="flex items-center space-x-4">
                {expandedProject === project.id ? 
                  <ChevronDownIcon className="w-5 h-5" /> : 
                  <ChevronRightIcon className="w-5 h-5" />
                }
                <span className="font-medium">{project.name}</span>
                <span className="text-gray-600">{project.worker}</span>
                <span className={`px-2 py-1 rounded text-xs ${statusConfig[project.status as keyof typeof statusConfig].color} ${statusConfig[project.status as keyof typeof statusConfig].textColor}`}>
                  {statusConfig[project.status as keyof typeof statusConfig].label}
                </span>
                <span className="text-sm text-gray-500">
                  {project.thicknesses.length}种厚度 [{getCompletionStats(project)}完成]
                </span>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm"><DocumentTextIcon className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm"><PencilIcon className="w-4 h-4" /></Button>
              </div>
            </div>
            
            {/* 展开详情 */}
            {expandedProject === project.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t bg-white p-4"
              >
                <div className="grid grid-cols-3 gap-4">
                  {project.thicknesses.map((thickness: number) => {
                    const material = project.materials[thickness];
                    return (
                      <div key={thickness} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <button className={`w-8 h-8 rounded-full ${statusConfig[material.status as keyof typeof statusConfig].color} hover:opacity-80 transition-opacity flex items-center justify-center`}>
                            {material.status === 'completed' ? '●' : 
                             material.status === 'in_progress' ? '◐' : '○'}
                          </button>
                          <span className="font-medium">{thickness}mm</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {material.completedAt || material.note || '待处理'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 方案三：卡片式布局 - 三个组件的不同实现
const CardView = ({ projects }: { projects: any[] }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">方案三：卡片式布局</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projects.map(project => (
          <div key={project.id} className="border rounded-lg p-4 bg-white shadow-sm">
            {/* 项目头部 */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-lg">{project.name}</h4>
                <p className="text-gray-600">工人：{project.worker}</p>
              </div>
              <span className={`px-3 py-1 rounded ${statusConfig[project.status as keyof typeof statusConfig].color} ${statusConfig[project.status as keyof typeof statusConfig].textColor}`}>
                {statusConfig[project.status as keyof typeof statusConfig].label}
              </span>
            </div>
            
            {/* 厚度网格 */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {project.thicknesses.map((thickness: number) => {
                const material = project.materials[thickness];
                return (
                  <div key={thickness} className="text-center">
                    <button className={`w-full py-2 rounded text-sm ${statusConfig[material.status as keyof typeof statusConfig].color} ${statusConfig[material.status as keyof typeof statusConfig].textColor} hover:opacity-80 transition-opacity`}>
                      {thickness}mm
                    </button>
                    <div className="text-xs text-gray-500 mt-1">
                      {material.status === 'completed' ? '●' : 
                       material.status === 'in_progress' ? '◐' : '○'}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 操作按钮 */}
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" size="sm"><EyeIcon className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm"><PencilIcon className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm"><DocumentTextIcon className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 活跃项目页面的卡片布局
const ActiveProjectsCardView = ({ projects }: { projects: any[] }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">活跃项目页面 - 卡片布局</h3>
      <p className="text-sm text-gray-600">特点：紧凑布局，快速状态切换，实时操作</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.filter(p => p.status !== 'completed').map(project => (
          <div key={project.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
            {/* 项目头部 - 更紧凑 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-base truncate">{project.name}</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>{project.worker}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${statusConfig[project.status as keyof typeof statusConfig].color} ${statusConfig[project.status as keyof typeof statusConfig].textColor}`}>
                    {statusConfig[project.status as keyof typeof statusConfig].label}
                  </span>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="sm" className="p-1"><PencilIcon className="w-3 h-3" /></Button>
                <Button variant="ghost" size="sm" className="p-1"><DocumentTextIcon className="w-3 h-3" /></Button>
              </div>
            </div>
            
            {/* 厚度网格 - 可点击切换状态 */}
            <div className="grid grid-cols-5 gap-1 mb-3">
              {project.thicknesses.map((thickness: number) => {
                const material = project.materials[thickness];
                return (
                  <div key={thickness} className="text-center">
                    <button className={`w-full py-1.5 rounded text-xs font-medium ${statusConfig[material.status as keyof typeof statusConfig].color} ${statusConfig[material.status as keyof typeof statusConfig].textColor} hover:opacity-80 transition-all hover:scale-105 border border-transparent hover:border-gray-300`}>
                      {thickness}
                    </button>
                  </div>
                );
              })}
            </div>
            
            {/* 进度统计 */}
            <div className="text-xs text-gray-500 text-center">
              {project.thicknesses.filter((t: number) => project.materials[t].status === 'completed').length}/{project.thicknesses.length} 已完成
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 过往项目页面的卡片布局
const PastProjectsCardView = ({ projects }: { projects: any[] }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">过往项目页面 - 卡片布局</h3>
      <p className="text-sm text-gray-600">特点：信息丰富，统计导向，归档展示</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.filter(p => p.status === 'completed').map(project => (
          <div key={project.id} className="border rounded-lg p-5 bg-gradient-to-br from-green-50 to-white shadow-sm">
            {/* 项目头部 - 更详细 */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-green-800">{project.name}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>负责工人：{project.worker}</div>
                  <div>完成时间：2024-01-12</div>
                  <div className="flex items-center">
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">已归档</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="sm"><EyeIcon className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm"><DocumentTextIcon className="w-4 h-4" /></Button>
              </div>
            </div>
            
            {/* 厚度网格 - 只读展示 */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">使用板材规格：</div>
              <div className="grid grid-cols-6 gap-2">
                {project.thicknesses.map((thickness: number) => {
                  const material = project.materials[thickness];
                  return (
                    <div key={thickness} className="text-center">
                      <div className={`py-2 rounded text-xs ${material.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} border`}>
                        {thickness}mm
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 项目统计 */}
            <div className="bg-white/60 rounded p-3">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-semibold text-gray-800">{project.thicknesses.length}</div>
                  <div className="text-gray-500">板材种类</div>
                </div>
                <div>
                  <div className="font-semibold text-green-600">{project.thicknesses.filter((t: number) => project.materials[t].status === 'completed').length}</div>
                  <div className="text-gray-500">已完成</div>
                </div>
                <div>
                  <div className="font-semibold text-blue-600">15天</div>
                  <div className="text-gray-500">用时</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 项目详情页面的卡片布局
const ProjectDetailCardView = ({ project }: { project: any }) => {
  const [selectedThickness, setSelectedThickness] = useState<number | null>(null);
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">项目详情页面 - 卡片布局</h3>
      <p className="text-sm text-gray-600">特点：单项目深度信息，详细操作，历史记录</p>
      
      <div className="max-w-4xl mx-auto">
        {/* 项目基本信息卡片 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
              <div className="flex items-center space-x-4 mt-2 text-gray-600">
                <span>负责工人：{project.worker}</span>
                <span className={`px-3 py-1 rounded ${statusConfig[project.status as keyof typeof statusConfig].color} ${statusConfig[project.status as keyof typeof statusConfig].textColor}`}>
                  {statusConfig[project.status as keyof typeof statusConfig].label}
                </span>
                <span>开始时间：2024-01-01</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline">编辑项目</Button>
              <Button variant="outline">管理图纸</Button>
            </div>
          </div>
          
          {/* 进度概览 */}
          <div className="bg-gray-50 rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">整体进度</span>
              <span className="text-sm text-gray-600">
                {project.thicknesses.filter((t: number) => project.materials[t].status === 'completed').length}/{project.thicknesses.length} 已完成
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(project.thicknesses.filter((t: number) => project.materials[t].status === 'completed').length / project.thicknesses.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 板材详情网格 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">板材加工详情</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {project.thicknesses.map((thickness: number) => {
              const material = project.materials[thickness];
              const isSelected = selectedThickness === thickness;
              return (
                <div 
                  key={thickness} 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedThickness(isSelected ? null : thickness)}
                >
                  <div className="text-center mb-3">
                    <div className="text-lg font-bold text-gray-900">{thickness}mm</div>
                    <button className={`w-8 h-8 rounded-full mx-auto mt-2 ${statusConfig[material.status as keyof typeof statusConfig].color} hover:opacity-80 transition-opacity`}>
                      {material.status === 'completed' ? '●' : 
                       material.status === 'in_progress' ? '◐' : '○'}
                    </button>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className={`text-center font-medium ${statusConfig[material.status as keyof typeof statusConfig].textColor}`}>
                      {statusConfig[material.status as keyof typeof statusConfig].label}
                    </div>
                    {material.completedAt && (
                      <div className="text-gray-500">完成：{material.completedAt}</div>
                    )}
                    {material.note && (
                      <div className="text-gray-500">备注：{material.note}</div>
                    )}
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="mt-3 flex justify-center space-x-1">
                    <Button variant="ghost" size="sm" className="p-1 text-xs">
                      <PencilIcon className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-1 text-xs">
                      更新
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 选中厚度的详细信息 */}
          {selectedThickness && (
            <div className="mt-6 p-4 bg-blue-50 rounded border-l-4 border-blue-500">
              <h4 className="font-semibold mb-2">{selectedThickness}mm 板材详情</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>状态：{statusConfig[project.materials[selectedThickness].status as keyof typeof statusConfig].label}</div>
                <div>完成时间：{project.materials[selectedThickness].completedAt || '待处理'}</div>
                <div>备注：{project.materials[selectedThickness].note || '无'}</div>
                <div>负责人：{project.worker}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 方案四：分组显示
const GroupedView = ({ projects }: { projects: any[] }) => {
  const groups = {
    thin: { label: '薄板 (2-6mm)', range: [2, 6] },
    medium: { label: '中板 (8-12mm)', range: [8, 12] },
    thick: { label: '厚板 (16-30mm)', range: [16, 30] }
  };

  const [activeGroup, setActiveGroup] = useState<keyof typeof groups>('thin');

  const getProjectsInGroup = (groupRange: number[]) => {
    return projects.filter(project => 
      project.thicknesses.some((t: number) => t >= groupRange[0] && t <= groupRange[1])
    );
  };

  const getThicknessesInGroup = (project: any, groupRange: number[]) => {
    return project.thicknesses.filter((t: number) => t >= groupRange[0] && t <= groupRange[1]);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">方案四：分组显示</h3>
      
      {/* 分组标签 */}
      <div className="flex space-x-2">
        {Object.entries(groups).map(([key, group]) => (
          <button
            key={key}
            onClick={() => setActiveGroup(key as keyof typeof groups)}
            className={`px-4 py-2 rounded ${
              activeGroup === key 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* 当前分组内容 */}
      <div className="space-y-3">
        {getProjectsInGroup(groups[activeGroup].range).map(project => {
          const groupThicknesses = getThicknessesInGroup(project, groups[activeGroup].range);
          return (
            <div key={project.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="font-medium">{project.name}</span>
                  <span className="text-gray-600">{project.worker}</span>
                  <span className={`px-2 py-1 rounded text-xs ${statusConfig[project.status as keyof typeof statusConfig].color} ${statusConfig[project.status as keyof typeof statusConfig].textColor}`}>
                    {statusConfig[project.status as keyof typeof statusConfig].label}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {groupThicknesses.map((thickness: number) => {
                    const material = project.materials[thickness];
                    return (
                      <div key={thickness} className="text-center">
                        <button className={`w-12 h-8 rounded text-xs ${statusConfig[material.status as keyof typeof statusConfig].color} ${statusConfig[material.status as keyof typeof statusConfig].textColor} hover:opacity-80 transition-opacity`}>
                          {thickness}mm
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function MaterialLayoutDemo() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">板材显示布局方案演示</h1>
        <p className="text-gray-600">
          模拟数据：项目A(7种厚度) | 项目B(5种厚度) | 项目C(5种厚度) | 项目D(5种厚度) | 项目E(11种厚度)
        </p>
        <p className="text-sm text-gray-500">
          状态说明：● 已完成 | ◐ 进行中 | ○ 待处理
        </p>
      </div>

      <div className="space-y-12">
        <DynamicTableView projects={mockProjects} />
        <CompactExpandView projects={mockProjects} />
        <CardView projects={mockProjects} />
        
        {/* 三个组件的卡片式实现方案 */}
        <div className="border-t-4 border-blue-500 pt-8">
          <h2 className="text-xl font-bold text-center mb-8">方案三在不同组件中的具体实现</h2>
          <ActiveProjectsCardView projects={mockProjects} />
        </div>
        
        <PastProjectsCardView projects={mockProjects} />
        
        <ProjectDetailCardView project={mockProjects[4]} /> {/* 使用最复杂的项目E */}
        
        <GroupedView projects={mockProjects} />
      </div>
    </div>
  );
}
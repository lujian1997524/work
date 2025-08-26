'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  PencilIcon, 
  TrashIcon,
  PhoneIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { StateChip, IconButton } from '@/components/ui';
import { type Employee } from '@/types/attendance';

interface EmployeeCardProps {
  employee: Employee;
  index: number;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

// 移动端员工卡片
export const MobileEmployeeCard: React.FC<EmployeeCardProps> = ({ 
  employee, 
  index,
  onEdit, 
  onDelete 
}) => {
  return (
    <motion.div
      className="lg:hidden bg-white rounded-xl p-4 shadow-sm border border-gray-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -2, shadow: '0 8px 25px rgba(0,0,0,0.1)' }}
    >
      {/* 卡片头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {employee.name || '未知员工'}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              {employee.position || '员工'}
            </p>
          </div>
        </div>
        
        {/* 状态标识 */}
        <StateChip
          status={employee.status === 'active' ? 'success' : 'error'}
          text={employee.status === 'active' ? '在职' : '离职'}
          size="sm"
        />
      </div>
      
      {/* 员工信息 */}
      <div className="space-y-2 mb-4">
        {employee.phone && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <PhoneIcon className="w-4 h-4 text-gray-400" />
            <span>{employee.phone}</span>
          </div>
        )}
        
        {employee.hireDate && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span>入职时间: {new Date(employee.hireDate).toLocaleDateString('zh-CN')}</span>
          </div>
        )}
      </div>
      
      {/* 快捷操作 */}
      <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
        <IconButton
          icon={PencilIcon}
          variant="ghost"
          color="secondary"
          size="sm"
          tooltip="编辑员工"
          onClick={() => onEdit(employee)}
        />
        <IconButton
          icon={TrashIcon}
          variant="ghost"
          color="danger"
          size="sm"
          tooltip="删除员工"
          onClick={() => onDelete(employee)}
        />
      </div>
    </motion.div>
  );
};

interface MobileEmployeeListProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  loading?: boolean;
}

// 移动端员工列表容器
export const MobileEmployeeList: React.FC<MobileEmployeeListProps> = ({
  employees,
  onEdit,
  onDelete,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="lg:hidden space-y-4">
        {[...Array(3)].map((_, index) => (
          <div 
            key={index} 
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="lg:hidden bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
        <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无员工</h3>
        <p className="text-gray-500">点击右上角添加员工</p>
      </div>
    );
  }

  return (
    <div className="lg:hidden space-y-4">
      {employees.map((employee, index) => (
        <MobileEmployeeCard
          key={employee.id}
          employee={employee}
          index={index}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      
      {/* 底部提示 */}
      <div className="text-center text-sm text-gray-500 py-4">
        共 {employees.length} 名员工
      </div>
    </div>
  );
};

// 统计概览卡片（移动端顶部显示）
interface MobileStatsOverviewProps {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
}

export const MobileStatsOverview: React.FC<MobileStatsOverviewProps> = ({
  totalEmployees,
  activeEmployees,  
  inactiveEmployees
}) => {
  const stats = [
    { label: '总员工', value: totalEmployees, color: 'bg-blue-500' },
    { label: '在职', value: activeEmployees, color: 'bg-green-500' },
    { label: '离职', value: inactiveEmployees, color: 'bg-gray-500' }
  ];

  return (
    <div className="lg:hidden bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">员工概览</h3>
      <div className="flex space-x-4">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.label}
            className="flex-1 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <span className="text-white text-lg font-bold">{stat.value}</span>
            </div>
            <p className="text-xs text-gray-600">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
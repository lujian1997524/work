'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Modal, Loading } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import {
  PlusIcon,
  BuildingOfficeIcon,
  UsersIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface Department {
  id: number;
  name: string;
  workerCount?: number;
}

interface UnifiedWorkersSidebarProps {
  selectedDepartment: string;
  onDepartmentChange: (department: string) => void;
  onRefresh?: () => void;
  className?: string;
}

export const UnifiedWorkersSidebar: React.FC<UnifiedWorkersSidebarProps> = ({
  selectedDepartment,
  onDepartmentChange,
  onRefresh,
  className = ''
}) => {
  // 所有状态 Hooks - 必须在组件顶部，顺序不能改变
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['departments']));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Context Hooks
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // 所有 useCallback Hooks
  const fetchDepartments = useCallback(async () => {
    // 在设计系统页面中使用模拟数据
    if (!token) {
      setDepartments([
        { id: 1, name: '生产部', workerCount: 8 },
        { id: 2, name: '技术部', workerCount: 5 },
        { id: 3, name: '质检部', workerCount: 3 },
        { id: 4, name: '管理部', workerCount: 2 }
      ]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await apiRequest('/api/departments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      } else {
        console.error('获取部门列表失败');
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const toggleGroup = useCallback((groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  }, [expandedGroups]);

  const handleCreateDepartment = useCallback(async () => {
    if (!token || !formData.name.trim()) {
      alert('这是设计系统预览，实际功能需要在主应用中使用');
      return;
    }
    
    try {
      setSubmitLoading(true);
      const response = await apiRequest('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: formData.name.trim() })
      });
      
      if (response.ok) {
        const result = await response.json();
        setFormData({ name: '' });
        setShowCreateModal(false);
        await fetchDepartments();
        if (result.department) {
          onDepartmentChange(result.department.name);
        }
        onRefresh?.();
      } else {
        const errorData = await response.json();
        alert(`创建部门失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('创建部门失败:', error);
      alert('创建部门失败，请重试');
    } finally {
      setSubmitLoading(false);
    }
  }, [token, formData.name, fetchDepartments, onDepartmentChange, onRefresh]);

  const handleUpdateDepartment = useCallback(async () => {
    if (!token || !editingDepartment || !formData.name.trim()) {
      alert('这是设计系统预览，实际功能需要在主应用中使用');
      return;
    }
    
    try {
      setSubmitLoading(true);
      const response = await apiRequest(`/api/departments/${editingDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: formData.name.trim() })
      });
      
      if (response.ok) {
        const oldName = editingDepartment.name;
        const newName = formData.name.trim();
        
        setFormData({ name: '' });
        setShowEditModal(false);
        setEditingDepartment(null);
        await fetchDepartments();
        
        if (selectedDepartment === oldName) {
          onDepartmentChange(newName);
        }
        onRefresh?.();
      } else {
        const errorData = await response.json();
        alert(`更新部门失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('更新部门失败:', error);
      alert('更新部门失败，请重试');
    } finally {
      setSubmitLoading(false);
    }
  }, [token, editingDepartment, formData.name, fetchDepartments, selectedDepartment, onDepartmentChange, onRefresh]);

  const handleDeleteDepartment = useCallback(async (department: Department) => {
    if (!token) {
      alert('这是设计系统预览，实际功能需要在主应用中使用');
      return;
    }
    
    if (!confirm(`确定要删除部门"${department.name}"吗？此操作不可撤销。`)) return;
    
    try {
      const response = await apiRequest(`/api/departments/${department.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await fetchDepartments();
        if (selectedDepartment === department.name) {
          onDepartmentChange('all');
        }
        onRefresh?.();
      } else {
        const errorData = await response.json();
        alert(`删除部门失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('删除部门失败:', error);
      alert('删除部门失败，请重试');
    }
  }, [token, fetchDepartments, selectedDepartment, onDepartmentChange, onRefresh]);

  const openEditModal = useCallback((department: Department) => {
    setEditingDepartment(department);
    setFormData({ name: department.name });
    setShowEditModal(true);
  }, []);

  const openCreateModal = useCallback(() => {
    setFormData({ name: '' });
    setShowCreateModal(true);
  }, []);

  // 所有 useEffect Hooks - 必须在所有其他 hooks 之后
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchDepartments();
    }
  }, [mounted, fetchDepartments]);

  useEffect(() => {
    const handleRefresh = () => {
      if (token) {
        fetchDepartments();
      }
    };

    window.addEventListener('refresh-workers', handleRefresh);
    return () => {
      window.removeEventListener('refresh-workers', handleRefresh);
    };
  }, [token, fetchDepartments]);

  // 数据计算（不是 Hooks）
  const groups = [
    {
      key: 'overview',
      label: '工人概览',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      items: [
        {
          key: 'all',
          label: '全部工人',
          count: departments.reduce((total, dept) => total + (dept.workerCount || 0), 0),
          icon: <UsersIcon className="w-4 h-4" />
        }
      ]
    },
    {
      key: 'departments',
      label: '部门管理',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      items: departments.map(dept => ({
        key: dept.name,
        label: dept.name,
        count: dept.workerCount || 0,
        icon: <BuildingOfficeIcon className="w-4 h-4" />,
        department: dept
      }))
    }
  ];

  // 主要渲染逻辑 - 使用条件内容而不是条件返回
  return (
    <div className={`bg-white/80 backdrop-blur-xl border-r border-gray-200 ${className}`}>
      {!mounted ? (
        <div className="p-4 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="p-4 text-center">
          <Loading size="md" text="加载中..." />
        </div>
      ) : (
        <>
          {/* 标题区域 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-text-primary text-sm">工人管理</h2>
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <Button
                    onClick={openCreateModal}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                    size="sm"
                  >
                    + 新建
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 工人树 */}
          <div className="overflow-y-auto h-full">
            {groups.map((group) => (
              <div key={group.key} className="border-b border-gray-100 last:border-b-0">
                {/* 分组标题 */}
                <Button
                  onClick={() => toggleGroup(group.key)}
                  variant="ghost"
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors h-auto"
                >
                  <div className="flex items-center space-x-2">
                    <div className="text-ios18-blue">{group.icon}</div>
                    <span className="font-medium text-text-primary text-sm">{group.label}</span>
                    <span className="text-xs bg-gray-100 text-text-secondary px-2 py-1 rounded-full">
                      {group.items.length}
                    </span>
                  </div>
                  <motion.span
                    animate={{ rotate: expandedGroups.has(group.key) ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-text-tertiary"
                  >
                    ▶
                  </motion.span>
                </Button>

                {/* 分组内容 */}
                <AnimatePresence>
                  {expandedGroups.has(group.key) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="py-1">
                        {group.items.map((item) => (
                          <motion.div
                            key={item.key}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                            className="group relative"
                          >
                            <Button
                              onClick={() => onDepartmentChange(item.key)}
                              variant="ghost"
                              className={`w-full px-8 py-2 flex items-center justify-between text-left transition-colors group-hover:bg-gray-50 h-auto ${
                                selectedDepartment === item.key 
                                  ? 'bg-ios18-blue/10 text-ios18-blue border-r-2 border-ios18-blue' 
                                  : 'text-text-secondary hover:text-text-primary'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div className={selectedDepartment === item.key ? 'text-ios18-blue' : 'text-text-tertiary'}>
                                  {item.icon}
                                </div>
                                <span className="text-sm truncate">{item.label}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {item.count !== undefined && (
                                  <span className="text-xs bg-gray-100 text-text-secondary px-2 py-1 rounded-full">
                                    {item.count}
                                  </span>
                                )}
                              </div>
                            </Button>

                            {/* 管理员操作按钮 - 仅部门项目显示 */}
                            {isAdmin && 'department' in item && item.department && (
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if ('department' in item && item.department) {
                                        openEditModal(item.department);
                                      }
                                    }}
                                    className="p-1 rounded hover:bg-blue-100 text-blue-600"
                                  >
                                    <PencilIcon className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if ('department' in item && item.department) {
                                        handleDeleteDepartment(item.department);
                                      }
                                    }}
                                    className="p-1 rounded hover:bg-red-100 text-red-600"
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 创建部门模态框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({ name: '' });
        }}
        title="创建部门"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              部门名称
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              placeholder="请输入部门名称"
              required
              onKeyDown={(e) => {
                if (e.key === 'Enter' && formData.name.trim()) {
                  handleCreateDepartment();
                }
              }}
            />
          </div>
          
          <div className="flex space-x-2 pt-4">
            <Button
              variant="primary"
              onClick={handleCreateDepartment}
              loading={submitLoading}
              disabled={!formData.name.trim()}
              className="flex-1"
            >
              创建
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setFormData({ name: '' });
              }}
              className="flex-1"
            >
              取消
            </Button>
          </div>
        </div>
      </Modal>

      {/* 编辑部门模态框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingDepartment(null);
          setFormData({ name: '' });
        }}
        title="编辑部门"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              部门名称
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              placeholder="请输入部门名称"
              required
              onKeyDown={(e) => {
                if (e.key === 'Enter' && formData.name.trim()) {
                  handleUpdateDepartment();
                }
              }}
            />
          </div>
          
          <div className="flex space-x-2 pt-4">
            <Button
              variant="primary"
              onClick={handleUpdateDepartment}
              loading={submitLoading}
              disabled={!formData.name.trim()}
              className="flex-1"
            >
              保存
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false);
                setEditingDepartment(null);
                setFormData({ name: '' });
              }}
              className="flex-1"
            >
              取消
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Modal } from '@/components/ui';
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

interface WorkersSidebarProps {
  selectedDepartment: string;
  onDepartmentChange: (department: string) => void;
  onRefresh?: () => void;
  onMobileItemClick?: () => void;
  className?: string;
}

export const WorkersSidebar: React.FC<WorkersSidebarProps> = ({
  selectedDepartment,
  onDepartmentChange,
  onRefresh,
  onMobileItemClick,
  className = ''
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // 获取部门列表
  const fetchDepartments = async () => {
    if (!token) return;
    
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
  };

  // 创建部门
  const handleCreateDepartment = async () => {
    if (!token || !formData.name.trim()) return;
    
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
        // 立即更新部门列表
        await fetchDepartments();
        // 自动选择新创建的部门
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
  };

  // 更新部门
  const handleUpdateDepartment = async () => {
    if (!token || !editingDepartment || !formData.name.trim()) return;
    
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
        // 立即更新部门列表
        await fetchDepartments();
        
        // 如果当前选中的是被编辑的部门，更新选中状态
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
  };

  // 删除部门
  const handleDeleteDepartment = async (department: Department) => {
    if (!token || !confirm(`确定要删除部门"${department.name}"吗？此操作不可撤销。`)) return;
    
    try {
      const response = await apiRequest(`/api/departments/${department.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // 立即更新部门列表
        await fetchDepartments();
        // 如果删除的是当前选中的部门，切换到全部
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
  };

  // 打开编辑模态框
  const openEditModal = (department: Department) => {
    setEditingDepartment(department);
    setFormData({ name: department.name });
    setShowEditModal(true);
  };

  // 打开创建模态框
  const openCreateModal = () => {
    setFormData({ name: '' });
    setShowCreateModal(true);
    onMobileItemClick?.(); // 移动端自动收回侧边栏
  };

  useEffect(() => {
    fetchDepartments();
  }, [token]);

  // 监听刷新事件
  useEffect(() => {
    const handleRefresh = () => {
      fetchDepartments();
    };

    window.addEventListener('refresh-workers', handleRefresh);
    return () => {
      window.removeEventListener('refresh-workers', handleRefresh);
    };
  }, []);

  if (loading) {
    return (
      <div className={`h-full bg-white/80 backdrop-blur-xl p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full bg-white/80 backdrop-blur-xl p-4 flex flex-col ${className}`}>
      {/* 标题和创建按钮 */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <BuildingOfficeIcon className="w-5 h-5 mr-2" />
          部门管理
        </h3>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={openCreateModal}
            className="p-1.5 hover:bg-ios18-blue/10"
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 部门列表 */}
      <div className="space-y-1 flex-1 overflow-y-auto">
        {/* 全部工人 */}
        <button
          onClick={() => {
            onDepartmentChange('all');
            onMobileItemClick?.(); // 通知移动端关闭侧边栏
          }}
          className={`
            w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors
            ${selectedDepartment === 'all' 
              ? 'bg-ios18-blue/10 text-ios18-blue border border-ios18-blue/20' 
              : 'hover:bg-gray-100 text-gray-700'
            }
          `}
        >
          <div className="flex items-center">
            <UsersIcon className="w-4 h-4 mr-2" />
            <span className="text-sm truncate">全部工人</span>
          </div>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
            {departments.reduce((total, dept) => total + (dept.workerCount || 0), 0)}
          </span>
        </button>

        {/* 部门列表 */}
        {departments.map((department) => (
          <motion.div
            key={department.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="group relative"
          >
            <button
              onClick={() => {
                onDepartmentChange(department.name);
                onMobileItemClick?.(); // 通知移动端关闭侧边栏
              }}
              className={`
                w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors pr-16
                ${selectedDepartment === department.name 
                  ? 'bg-ios18-blue/10 text-ios18-blue border border-ios18-blue/20' 
                  : 'hover:bg-gray-100 text-gray-700'
                }
              `}
            >
              <div className="flex items-center min-w-0 flex-1">
                <BuildingOfficeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate text-sm">{department.name}</span>
              </div>
              {department.workerCount !== undefined && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 ml-2">
                  {department.workerCount}
                </span>
              )}
            </button>

            {/* 操作按钮 */}
            {isAdmin && (
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(department);
                    }}
                    className="p-1 rounded hover:bg-blue-100 text-blue-600"
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDepartment(department);
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
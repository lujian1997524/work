'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, Input, Table, TableHeader, TableBody, TableRow, TableCell, Form, FormField, FormActions } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';

interface Worker {
  id: number;
  name: string;
  phone: string;
  email?: string;
  department?: string;
  departmentId?: number;
  position?: string;
  status?: string;
  projectCount?: number;  // 关联项目数量
  createdAt: string;
  updatedAt: string;
}

interface Department {
  id: number;
  name: string;
  workerCount: number;
}

interface WorkerManagementProps {
  className?: string;
  onClose?: () => void;
  selectedDepartment?: string;
  onDepartmentChange?: (department: string) => void;
}

export const WorkerManagement: React.FC<WorkerManagementProps> = ({ 
  className = '', 
  onClose, 
  selectedDepartment: propSelectedDepartment = 'all',
  onDepartmentChange: propOnDepartmentChange
}) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(propSelectedDepartment);
  const [loading, setLoading] = useState(true);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    departmentId: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // 获取部门列表
  const fetchDepartments = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/workers/departments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
    }
  };

  // 获取工人列表
  const fetchWorkers = async () => {
    if (!token) {
      console.warn('没有token，无法获取工人数据');
      return;
    }
    
    try {
      setLoading(true);
      const response = await apiRequest('/api/workers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.workers || data);
      } else {
        console.error('获取工人数据失败:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('获取工人数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchWorkers();
      fetchDepartments();
    }
  }, [token]);

  // 同步外部selectedDepartment变化
  useEffect(() => {
    setSelectedDepartment(propSelectedDepartment);
  }, [propSelectedDepartment]);

  // 监听刷新事件
  useEffect(() => {
    const handleRefresh = () => {
      fetchWorkers();
    };

    window.addEventListener('refresh-workers', handleRefresh);
    return () => {
      window.removeEventListener('refresh-workers', handleRefresh);
    };
  }, []);

  // 部门变化处理
  const handleDepartmentChange = (department: string) => {
    setSelectedDepartment(department);
    propOnDepartmentChange?.(department);
  };

  // 表单验证
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = '工人姓名不能为空';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = '手机号不能为空';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.phone = '请输入有效的手机号';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      departmentId: ''
    });
    setEditingWorker(null);
    setFormErrors({});
  };

  // 跳转到主页面并筛选活跃项目
  const handleJumpToProjects = (workerName: string) => {
    // 关闭工人管理模式，回到主页面的活跃项目视图
    window.dispatchEvent(new CustomEvent('close-worker-management', { 
      detail: { workerName, viewType: 'active' } // 明确指定跳转到活跃项目
    }));
  };

  // 过滤工人
  const filteredWorkers = selectedDepartment === 'all' 
    ? workers 
    : workers.filter(worker => worker.department === selectedDepartment);

  // 按部门分组工人
  const groupedWorkers = filteredWorkers.reduce((groups, worker) => {
    const dept = worker.department || '未分配部门';
    if (!groups[dept]) {
      groups[dept] = [];
    }
    groups[dept].push(worker);
    return groups;
  }, {} as Record<string, Worker[]>);

  // 打开新建工人对话框
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // 打开编辑工人对话框
  const openEditModal = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      phone: worker.phone,
      departmentId: worker.departmentId ? worker.departmentId.toString() : ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  // 保存工人
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitLoading(true);
      const url = editingWorker ? `/api/workers/${editingWorker.id}` : '/api/workers';
      const method = editingWorker ? 'PUT' : 'POST';
      
      const response = await apiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        resetForm();
        fetchWorkers();
      } else {
        const errorData = await response.json();
        alert(`操作失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('保存工人数据失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 处理工人表单提交
  const handleWorkerFormSubmit = async () => {
    try {
      setSubmitLoading(true);
      const url = editingWorker ? `/api/workers/${editingWorker.id}` : '/api/workers';
      const method = editingWorker ? 'PUT' : 'POST';
      
      // 准备提交数据，转换 departmentId 为数字或 null
      const submitData = {
        ...formData,
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : null
      };
      
      const response = await apiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        setShowModal(false);
        resetForm();
        fetchWorkers();
      } else {
        const errorData = await response.json();
        alert(`操作失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('保存工人数据失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 删除工人
  const handleDelete = async (workerId: number, workerName: string) => {
    if (!confirm(`确定要删除工人 "${workerName}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const response = await apiRequest(`/api/workers/${workerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchWorkers();
      } else {
        const errorData = await response.json();
        alert(`删除失败: ${errorData.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('删除工人失败:', error);
      alert('删除失败，请重试');
    }
  };

  if (loading) {
    return (
      <Card className={`flex items-center justify-center h-64 ${className}`}>
        <motion.div
          className="flex items-center space-x-3 text-text-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-5 h-5 border-2 border-ios18-blue border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span>加载中...</span>
        </motion.div>
      </Card>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 标题栏 */}
      <Card className="flex-shrink-0" padding="md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">工人管理</h2>
            <p className="text-text-secondary text-sm mt-1">管理工人信息和部门分配</p>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <Button
                variant="primary"
                size="sm"
                onClick={openCreateModal}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                添加工人
              </Button>
            </div>
          )}
        </div>

        {/* 当前筛选状态 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">当前筛选:</span>
          <div className="px-3 py-1 bg-ios18-blue/10 text-ios18-blue rounded-full text-sm font-medium">
            {selectedDepartment === 'all' ? '全部工人' : selectedDepartment}
          </div>
          <span className="text-xs text-gray-500">
            ({filteredWorkers.length} 人)
          </span>
        </div>
      </Card>

      {/* 工人列表 - 全高度自适应 */}
      <Card className="flex-1 mt-4 overflow-hidden" padding="none">
        {Object.keys(groupedWorkers).length === 0 ? (
          <motion.div
            className="flex items-center justify-center h-full text-text-secondary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </motion.div>
              <p className="text-lg font-medium mb-2">
                {selectedDepartment === 'all' ? '暂无工人数据' : `${selectedDepartment}部门暂无工人`}
              </p>
              <p className="text-sm mb-4">开始添加第一个工人吧</p>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openCreateModal}
                >
                  立即添加
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="h-full overflow-auto">
            {Object.entries(groupedWorkers).map(([departmentName, deptWorkers]) => (
              <motion.div
                key={departmentName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="border-b border-macos15-separator last:border-b-0"
              >
                {/* 部门标题 */}
                <div className="px-6 py-3 bg-macos15-control/20 border-b border-macos15-separator">
                  <h3 className="font-semibold text-text-primary flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {departmentName}
                    <span className="ml-2 px-2 py-1 bg-ios18-blue/10 text-ios18-blue rounded-full text-xs">
                      {deptWorkers.length}人
                    </span>
                  </h3>
                </div>

                {/* 该部门的工人列表 */}
                <div className="hidden md:block overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader className="bg-macos15-control/10">
                      <TableRow>
                        <TableCell type="header" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">姓名</TableCell>
                        <TableCell type="header" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">电话</TableCell>
                        <TableCell type="header" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">项目数量</TableCell>
                        {isAdmin && (
                          <TableCell type="header" className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">操作</TableCell>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-macos15-separator">
                      <AnimatePresence>
                        {deptWorkers.map((worker, index) => (
                          <TableRow
                            key={worker.id}
                            animate={true}
                            index={index}
                            className="hover:bg-macos15-control/20 transition-colors"
                          >
                            <TableCell className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-text-primary">{worker.name}</div>
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-text-secondary text-sm">
                              {worker.phone}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleJumpToProjects(worker.name)}
                                className="inline-flex items-center px-3 py-1 bg-ios18-blue/10 text-ios18-blue rounded-full text-sm font-medium hover:bg-ios18-blue/20 transition-colors"
                              >
                                {worker.projectCount || 0} 个项目
                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </Button>
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditModal(worker)}
                                  >
                                    编辑
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete(worker.id, worker.name)}
                                  >
                                    删除
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>

                {/* 移动端工人卡片布局 */}
                <div className="md:hidden space-y-3 p-4">
                  <AnimatePresence>
                    {deptWorkers.map((worker, index) => (
                      <motion.div
                        key={worker.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                      >
                        {/* 工人基本信息 */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-text-primary text-lg">{worker.name}</h4>
                            <div className="flex items-center mt-1 text-text-secondary text-sm">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.964 11.1a13.651 13.651 0 004.236 4.236l1.713-3.26a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {worker.phone}
                            </div>
                          </div>
                        </div>

                        {/* 项目信息和操作 */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleJumpToProjects(worker.name)}
                            className="inline-flex items-center px-3 py-2 bg-ios18-blue/10 text-ios18-blue rounded-lg text-sm font-medium hover:bg-ios18-blue/20 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {worker.projectCount || 0} 个项目
                          </Button>
                          
                          {isAdmin && (
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(worker)}
                                className="px-3 py-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(worker.id, worker.name)}
                                className="px-3 py-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* 工人表单模态框 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Card padding="none" glass>
                <div className="px-6 py-4 border-b border-macos15-separator">
                  <h3 className="text-lg font-bold text-text-primary">
                    {editingWorker ? '编辑工人' : '添加工人'}
                  </h3>
                </div>

                <Form onSubmit={async (formDataFromForm) => {
                  // 从FormData中提取数据并更新状态
                  const data = {
                    name: formDataFromForm.get('name') as string || '',
                    phone: formDataFromForm.get('phone') as string || '',
                    departmentId: formDataFromForm.get('departmentId') as string || ''
                  };
                  
                  setFormData(data);
                  
                  // 执行表单验证
                  const errors: Record<string, string> = {};
                  
                  if (!data.name.trim()) {
                    errors.name = '工人姓名不能为空';
                  }
                  
                  if (!data.phone.trim()) {
                    errors.phone = '手机号不能为空';
                  } else if (!/^1[3-9]\d{9}$/.test(data.phone)) {
                    errors.phone = '请输入有效的手机号';
                  }
                  
                  setFormErrors(errors);
                  
                  if (Object.keys(errors).length > 0) {
                    return;
                  }
                  
                  // 提交数据
                  await handleWorkerFormSubmit();
                }} className="p-6 space-y-4">
                  <FormField label="姓名" required error={formErrors.name}>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="请输入工人姓名"
                      required
                    />
                  </FormField>

                  <FormField label="手机号" required error={formErrors.phone}>
                    <Input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="请输入手机号"
                      required
                    />
                  </FormField>

                  <FormField label="部门">
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ios18-blue focus:border-transparent"
                    >
                      <option value="">请选择部门（可选）</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.workerCount}人)
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormActions align="right">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowModal(false)}
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={submitLoading}
                    >
                      {editingWorker ? '更新' : '创建'}
                    </Button>
                  </FormActions>
                </Form>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
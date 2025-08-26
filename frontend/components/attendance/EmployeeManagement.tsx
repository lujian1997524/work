'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Modal,
  Form,
  FormField,
  FormActions,
  Input,
  Select,
  Button,
  ModernTable,
  SearchBar,
  IconButton,
  Badge,
  StateChip,
  Alert,
  useToast
} from '@/components/ui';
import { MobileEmployeeList, MobileStatsOverview } from '@/components/ui/MobileEmployeeCard';
import { MobileFormWizard, EMPLOYEE_FORM_STEPS } from '@/components/ui/MobileFormWizard';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { useAttendanceStore } from '@/stores/attendanceStore';
import { type Employee } from '@/types/attendance';

interface EmployeeManagementProps {
  className?: string;
}

interface EmployeeFormData {
  name: string;
  department: string;
  position: string;
  phone: string;
  hireDate: string;
  status: 'active' | 'inactive';
}

const initialFormData: EmployeeFormData = {
  name: '',
  department: '东车间',
  position: '',
  phone: '',
  hireDate: new Date().toISOString().split('T')[0], // 默认今天
  status: 'active'
};

// 车间选项
const departmentOptions = [
  { value: '东车间', label: '东车间' },
  { value: '西车间', label: '西车间' },
  { value: '北车间', label: '北车间' },
  { value: '后勤', label: '后勤' }
];

// 员工状态选项
const statusOptions = [
  { value: 'active', label: '在职' },
  { value: 'inactive', label: '离职' }
];

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const toast = useToast();

  const {
    employees,
    loading,
    saving,
    createEmployee,
    updateEmployee,
    deleteEmployee
  } = useAttendanceStore();

  // 搜索过滤和排序
  const filteredEmployees = employees
    .filter(emp => 
      emp && 
      emp.name && (
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    )
    .sort((a, b) => {
      // 按工号排序，如果没有工号则按姓名排序
      const employeeIdA = a.employeeId || '';
      const employeeIdB = b.employeeId || '';
      
      if (employeeIdA && employeeIdB) {
        return employeeIdA.localeCompare(employeeIdB);
      } else if (employeeIdA && !employeeIdB) {
        return -1;
      } else if (!employeeIdA && employeeIdB) {
        return 1;
      } else {
        return (a.name || '').localeCompare(b.name || '');
      }
    });

  // 打开新建员工模态框
  const handleCreate = () => {
    setEditingEmployee(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowEmployeeModal(true);
  };

  // 打开编辑员工模态框
  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      department: employee.department || '东车间',
      position: employee.position || '',
      phone: employee.phone || '',
      hireDate: employee.hireDate,
      status: employee.status
    });
    setFormErrors({});
    setShowEmployeeModal(true);
  };

  // 删除员工
  const handleDelete = (employee: Employee) => {
    setDeletingEmployee(employee);
    setShowDeleteModal(true);
  };

  // 确认删除员工
  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;
    
    const success = await deleteEmployee(deletingEmployee.id);
    if (success) {
      toast.addToast({
        type: 'success',
        message: `员工 ${deletingEmployee.name} 删除成功`
      });
    } else {
      toast.addToast({
        type: 'error',
        message: '删除员工失败，请重试'
      });
    }
    
    setShowDeleteModal(false);
    setDeletingEmployee(null);
  };

  // 取消删除
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingEmployee(null);
  };

  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '员工姓名不能为空';
    }

    if (!formData.hireDate) {
      errors.hireDate = '入职日期不能为空';
    }

    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.phone = '手机号格式不正确';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 包装表单提交，忽略FormData参数
  const handleFormSubmit = async (_formData: FormData) => {
    await handleSubmit();
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    let employeeData;
    
    if (editingEmployee) {
      // 编辑模式：保持原有员工工号不变
      employeeData = {
        name: formData.name.trim(),
        department: formData.department,
        position: formData.position.trim() || '普通员工',
        phone: formData.phone.trim() || undefined,
        hireDate: formData.hireDate,
        dailyWorkHours: 9.0,
        status: formData.status
        // 注意：编辑时不包含employeeId字段，保持不变
      };
    } else {
      // 新建模式：自动生成员工工号
      const currentYear = new Date().getFullYear();
      let employeeCount = 1;
      let employeeId = '';
      
      // 查找不重复的工号
      do {
        employeeId = `EMP${currentYear}${String(employeeCount).padStart(4, '0')}`;
        employeeCount++;
      } while (employees.some(emp => emp.employeeId === employeeId));

      employeeData = {
        employeeId,
        name: formData.name.trim(),
        department: formData.department,
        position: formData.position.trim() || '普通员工',
        phone: formData.phone.trim() || undefined,
        hireDate: formData.hireDate,
        dailyWorkHours: 9.0,
        status: formData.status
      };
    }

    

    let success = false;
    if (editingEmployee) {
      success = await updateEmployee(editingEmployee.id, employeeData);
    } else {
      success = await createEmployee(employeeData);
    }

    if (success) {
      toast.addToast({
        type: 'success',
        message: editingEmployee ? '员工信息更新成功' : '员工创建成功'
      });
      setShowEmployeeModal(false);
    } else {
      toast.addToast({
        type: 'error',
        message: editingEmployee ? '更新员工信息失败' : '创建员工失败'
      });
    }
  };

  // 输入处理
  const handleInputChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除对应字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 计算员工统计
  const getEmployeeStats = () => {
    const total = employees.length;
    const active = employees.filter(emp => emp.status === 'active').length;
    
    return { total, active };
  };

  const stats = getEmployeeStats();

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* 移动端统计概览 */}
      <MobileStatsOverview 
        totalEmployees={stats.total}
        activeEmployees={stats.active}
        inactiveEmployees={stats.total - stats.active}
      />
      
      {/* 桌面端统计卡片 */}
      <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-blue-700">{stats.total}</div>
              <div className="text-sm text-blue-600">总员工数</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-green-700">{stats.active}</div>
              <div className="text-sm text-green-600">在职员工</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-purple-700">{stats.total - stats.active}</div>
              <div className="text-sm text-purple-600">离职员工</div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <SearchBar
          placeholder="搜索员工姓名、职位或车间..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1 max-w-md"
        />
        
        <Button
          variant="primary"
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="hidden sm:inline">新增员工</span>
          <span className="sm:hidden">新增</span>
        </Button>
      </div>

      {/* 移动端员工卡片列表 */}
      <MobileEmployeeList
        employees={filteredEmployees}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* 桌面端员工列表 */}
      <div className="hidden lg:block">
        <ModernTable
        data={filteredEmployees}
        loading={loading}
        columns={[
          {
            key: 'employee',
            title: '员工信息',
            render: (value: any, employee: Employee) => {
              if (!employee) return null;
              return (
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-text-primary">{employee.name || '未知员工'}</div>
                    <div className="text-sm text-text-secondary">
                      {employee.department || '未分配车间'} · {employee.position || '未设置职位'}
                    </div>
                  </div>
                </div>
              );
            }
          },
          {
            key: 'contact',
            title: '联系方式',
            render: (value: any, employee: Employee) => {
              if (!employee) return null;
              return (
                <div className="text-sm">
                  {employee.phone ? (
                    <div className="text-text-primary">{employee.phone}</div>
                  ) : (
                    <span className="text-text-tertiary">未填写</span>
                  )}
                </div>
              );
            }
          },
          {
            key: 'hireDate',
            title: '入职信息',
            render: (value: any, employee: Employee) => {
              if (!employee || !employee.hireDate) return <span className="text-text-tertiary">未设置</span>;
              const hireDate = new Date(employee.hireDate);
              const years = Math.floor((Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
              return (
                <div className="text-sm">
                  <div className="text-text-primary">
                    {hireDate.toLocaleDateString()}
                  </div>
                  <div className="text-text-secondary">
                    {years}年工龄
                  </div>
                </div>
              );
            }
          },
          {
            key: 'status',
            title: '状态',
            render: (value: any, employee: Employee) => {
              if (!employee) return null;
              return (
                <StateChip
                  status={employee.status === 'active' ? 'success' : 'error'}
                  text={employee.status === 'active' ? '在职' : '离职'}
                  size="sm"
                />
              );
            }
          },
          {
            key: 'actions',
            title: '操作',
            render: (value: any, employee: Employee) => {
              if (!employee) return null;
              return (
                <div className="flex items-center gap-2">
                  <IconButton
                    icon={PencilIcon}
                    variant="ghost"
                    color="secondary"
                    size="sm"
                    tooltip="编辑员工"
                    onClick={() => handleEdit(employee)}
                  />
                  <IconButton
                    icon={TrashIcon}
                    variant="ghost"
                    color="danger"
                    size="sm"
                    tooltip="删除员工"
                    onClick={() => handleDelete(employee)}
                  />
                </div>
              );
            }
          }
        ]}
      />
      </div>

      {/* 移动端分步表单向导 */}
      <MobileFormWizard
        steps={EMPLOYEE_FORM_STEPS}
        initialData={formData}
        onSubmit={async (data) => {
          const employeeData: EmployeeFormData = {
            name: data.name || '',
            department: data.department || '东车间',
            position: data.position || '',
            phone: data.phone || '',
            hireDate: data.hireDate || new Date().toISOString().split('T')[0],
            status: data.status || 'active'
          };
          setFormData(employeeData);
          await handleFormSubmit(new Event('submit') as any);
        }}
        onCancel={() => setShowEmployeeModal(false)}
        loading={saving}
        className={showEmployeeModal ? 'fixed inset-0 z-50 bg-white' : 'hidden'}
      />

      {/* 桌面端表单模态框 */}
      <div className="hidden lg:block">
        <Modal
          isOpen={showEmployeeModal}
          onClose={() => setShowEmployeeModal(false)}
          title={editingEmployee ? '编辑员工' : '新增员工'}
          size="lg"
          className="mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto"
        >
        <Form onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="员工姓名" required error={formErrors.name}>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="请输入员工姓名"
                error={formErrors.name}
              />
            </FormField>

            <FormField label="所属车间" required>
              <Select
                value={formData.department}
                onChange={(value) => handleInputChange('department', value)}
                options={departmentOptions}
                placeholder="请选择车间"
              />
            </FormField>

            <FormField label="职位" error={formErrors.position}>
              <Input
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                placeholder="请输入职位"
                error={formErrors.position}
              />
            </FormField>

            <FormField label="入职日期" required error={formErrors.hireDate}>
              <Input
                type="date"
                value={formData.hireDate}
                onChange={(e) => handleInputChange('hireDate', e.target.value)}
                error={formErrors.hireDate}
              />
            </FormField>

            <FormField label="手机号码" error={formErrors.phone}>
              <Input
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="请输入手机号码"
                error={formErrors.phone}
              />
            </FormField>

            <FormField label="员工状态" required>
              <Select
                value={formData.status}
                onChange={(value) => handleInputChange('status', value)}
                options={statusOptions}
                placeholder="请选择状态"
              />
            </FormField>
          </div>

          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEmployeeModal(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving}
            >
              {editingEmployee ? '更新' : '创建'}
            </Button>
          </FormActions>
        </Form>
      </Modal>
      </div>

      {/* 删除确认模态框 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        title="删除员工"
        size="sm"
        className="mx-4 sm:mx-auto"
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-lg font-medium text-text-primary mb-2">
              确认删除员工
            </div>
            <div className="text-sm text-text-secondary">
              {deletingEmployee && (
                <>
                  您即将删除员工 <span className="font-medium text-text-primary">{deletingEmployee.name}</span>，此操作不可撤销。
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={handleCancelDelete}
            >
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              loading={saving}
            >
              确认删除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Modal,
  Form,
  FormField,
  FormActions,
  Input,
  Select,
  Button,
  Avatar,
  Alert,
  Badge,
  useToast
} from '@/components/ui';
import { 
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAttendanceStore } from '@/stores/attendanceStore';
import { 
  LEAVE_TYPE_OPTIONS,
  LEAVE_DURATION_OPTIONS,
  EXCEPTION_TYPE_OPTIONS,
  type Employee,
  type AttendanceException
} from '@/types/attendance';

interface DailyAttendanceEntryProps {
  isOpen: boolean;
  onClose: () => void;
  exceptionType: 'leave' | 'absent' | 'overtime' | null;
  employee?: Employee;
}

interface ExceptionFormData {
  employeeId: string;
  exceptionType: 'leave' | 'absent' | 'overtime';
  
  // 请假相关
  leaveType: 'sick' | 'personal' | 'annual' | 'compensatory';
  leaveDurationType: 'full_day' | 'half_day' | 'hours';
  leaveHours: number;
  leaveStartTime: string;
  leaveEndTime: string;
  leaveReason: string;
  
  // 加班相关
  overtimeHours: number;
  overtimeReason: string;
  
  // 缺勤相关
  absentReason: string;
  
  // 通用
  notes: string;
}

const initialFormData: ExceptionFormData = {
  employeeId: '',
  exceptionType: 'leave',
  
  leaveType: 'sick',
  leaveDurationType: 'full_day',
  leaveHours: 2,
  leaveStartTime: '09:00',
  leaveEndTime: '11:00',
  leaveReason: '',
  
  overtimeHours: 2,
  overtimeReason: '',
  
  absentReason: '',
  notes: ''
};

export const DailyAttendanceEntry: React.FC<DailyAttendanceEntryProps> = ({
  isOpen,
  onClose,
  exceptionType,
  employee
}) => {
  const [formData, setFormData] = useState<ExceptionFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [previewWorkHours, setPreviewWorkHours] = useState<{
    standardHours: number;
    actualHours: number;
    leaveHours: number;
    overtimeHours: number;
  } | null>(null);
  
  const toast = useToast();

  const {
    employees,
    selectedDate,
    saving,
    createAttendanceException
  } = useAttendanceStore();

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      const newFormData = {
        ...initialFormData,
        exceptionType: exceptionType || 'leave',
        employeeId: employee ? employee.id.toString() : ''
      };
      setFormData(newFormData);
      setFormErrors({});
      
      // 计算工时预览
      if (employee) {
        updateWorkHoursPreview(employee, newFormData);
      }
    }
  }, [isOpen, exceptionType, employee]);

  // 更新工时预览
  const updateWorkHoursPreview = (emp: Employee, data: ExceptionFormData) => {
    const standardHours = emp.dailyWorkHours;
    let actualHours = standardHours;
    let leaveHours = 0;
    let overtimeHours = 0;

    switch (data.exceptionType) {
      case 'leave':
        if (data.leaveDurationType === 'full_day') {
          leaveHours = standardHours || 9;
          actualHours = 0;
        } else if (data.leaveDurationType === 'half_day') {
          leaveHours = (standardHours || 9) / 2;
          actualHours = (standardHours || 9) / 2;
        } else {
          leaveHours = data.leaveHours;
          actualHours = Math.max(0, (standardHours || 9) - data.leaveHours);
        }
        break;
      case 'absent':
        leaveHours = standardHours || 9;
        actualHours = 0;
        break;
      case 'overtime':
        overtimeHours = data.overtimeHours;
        break;
    }

    setPreviewWorkHours({
      standardHours: standardHours || 9,
      actualHours: actualHours || 0,
      leaveHours: leaveHours || 0,
      overtimeHours: overtimeHours || 0
    });
  };

  // 输入处理
  const handleInputChange = (field: keyof ExceptionFormData, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // 清除对应字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // 更新工时预览
    const selectedEmployee = employees.find(emp => emp.id.toString() === newFormData.employeeId);
    if (selectedEmployee) {
      updateWorkHoursPreview(selectedEmployee, newFormData);
    }

    // 自动计算请假结束时间
    if (field === 'leaveStartTime' || field === 'leaveHours') {
      if (newFormData.leaveDurationType === 'hours' && newFormData.leaveStartTime) {
        const startTime = new Date(`2000-01-01 ${newFormData.leaveStartTime}:00`);
        const endTime = new Date(startTime.getTime() + newFormData.leaveHours * 60 * 60 * 1000);
        const endTimeString = endTime.toTimeString().slice(0, 5);
        setFormData(prev => ({ ...prev, leaveEndTime: endTimeString }));
      }
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.employeeId) {
      errors.employeeId = '请选择员工';
    }

    switch (formData.exceptionType) {
      case 'leave':
        if (!formData.leaveReason.trim()) {
          errors.leaveReason = '请填写请假原因';
        }
        
        if (formData.leaveDurationType === 'hours') {
          if (formData.leaveHours <= 0 || formData.leaveHours > 8) {
            errors.leaveHours = '请假时长应在0-8小时之间';
          }
          
          if (!formData.leaveStartTime) {
            errors.leaveStartTime = '请选择请假开始时间';
          }
        }
        break;
        
      case 'overtime':
        if (formData.overtimeHours <= 0 || formData.overtimeHours > 12) {
          errors.overtimeHours = '加班时长应在0-12小时之间';
        }
        
        if (!formData.overtimeReason.trim()) {
          errors.overtimeReason = '请填写加班原因';
        }
        break;
        
      case 'absent':
        if (!formData.absentReason.trim()) {
          errors.absentReason = '请填写缺勤原因';
        }
        break;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 提交表单
  const handleFormSubmit = (data: FormData) => {
    // Form组件传入的FormData，忽略这个参数
    handleSubmit(new Event('submit') as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const selectedEmployee = employees.find(emp => emp.id.toString() === formData.employeeId);
    if (!selectedEmployee) {
      toast.addToast({
        type: 'error',
        message: '未找到选中的员工'
      });
      return;
    }

    // 构建异常记录数据
    const exceptionData: Omit<AttendanceException, 'id' | 'createdAt' | 'updatedAt'> = {
      employeeId: parseInt(formData.employeeId),
      date: selectedDate,
      exceptionType: formData.exceptionType,
      notes: formData.notes,
      createdBy: 1 // TODO: 获取当前用户ID
    };

    // 根据异常类型添加特定字段
    switch (formData.exceptionType) {
      case 'leave':
        Object.assign(exceptionData, {
          leaveType: formData.leaveType,
          leaveDurationType: formData.leaveDurationType,
          leaveReason: formData.leaveReason,
          leaveHours: formData.leaveDurationType === 'full_day' ? (selectedEmployee.dailyWorkHours || 9) :
                     formData.leaveDurationType === 'half_day' ? (selectedEmployee.dailyWorkHours || 9) / 2 :
                     formData.leaveHours,
          leaveStartTime: formData.leaveDurationType === 'hours' ? formData.leaveStartTime : undefined,
          leaveEndTime: formData.leaveDurationType === 'hours' ? formData.leaveEndTime : undefined
        });
        break;
      case 'overtime':
        Object.assign(exceptionData, {
          overtimeHours: formData.overtimeHours,
          overtimeReason: formData.overtimeReason
        });
        break;
      case 'absent':
        Object.assign(exceptionData, {
          absentReason: formData.absentReason
        });
        break;
    }

    const success = await createAttendanceException(exceptionData);
    
    if (success) {
      toast.addToast({
        type: 'success',
        message: `${selectedEmployee.name} 的考勤异常记录已添加`
      });
      onClose();
    } else {
      toast.addToast({
        type: 'error',
        message: '添加考勤异常记录失败，请重试'
      });
    }
  };

  // 获取异常类型显示信息
  const getExceptionTypeInfo = () => {
    switch (formData.exceptionType) {
      case 'leave':
        return {
          title: '添加请假记录',
          icon: ClockIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        };
      case 'absent':
        return {
          title: '添加缺勤记录',
          icon: ExclamationTriangleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        };
      case 'overtime':
        return {
          title: '添加加班记录',
          icon: CheckCircleIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      default:
        return {
          title: '添加考勤异常',
          icon: ClockIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const typeInfo = getExceptionTypeInfo();
  const selectedEmployee = employees.find(emp => emp.id.toString() === formData.employeeId);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={typeInfo.title}
      size="lg"
    >
      <Form onSubmit={handleFormSubmit}>
        <div className="space-y-6">
          {/* 异常类型和员工选择 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="异常类型" required>
              <Select
                value={formData.exceptionType}
                onChange={(value) => handleInputChange('exceptionType', value)}
                options={[...EXCEPTION_TYPE_OPTIONS]}
                disabled={!!exceptionType}
              />
            </FormField>

            <FormField label="选择员工" required error={formErrors.employeeId}>
              <Select
                value={formData.employeeId}
                onChange={(value) => handleInputChange('employeeId', value)}
                options={employees.map(emp => ({
                  value: emp.id.toString(),
                  label: `${emp.name} (${emp.department})`
                }))}
                placeholder="请选择员工"
                error={formErrors.employeeId}
                disabled={!!employee}
              />
            </FormField>
          </div>

          {/* 员工信息预览 */}
          {selectedEmployee && (
            <div className={`p-4 rounded-lg ${typeInfo.bgColor}`}>
              <div className="flex items-center gap-4">
                <Avatar 
                  name={selectedEmployee.name}
                  src={selectedEmployee.avatar}
                  size="sm"
                />
                <div className="flex-1">
                  <div className="font-medium text-text-primary">
                    {selectedEmployee.name} ({selectedEmployee.employeeId})
                  </div>
                  <div className="text-sm text-text-secondary">
                    {selectedEmployee.department} · {selectedEmployee.position}
                  </div>
                </div>
                <Badge variant="secondary">
                  {selectedEmployee.dailyWorkHours}小时/天
                </Badge>
              </div>
            </div>
          )}

          {/* 请假详细设置 */}
          {formData.exceptionType === 'leave' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="请假类型" required>
                  <Select
                    value={formData.leaveType}
                    onChange={(value) => handleInputChange('leaveType', value)}
                    options={[...LEAVE_TYPE_OPTIONS]}
                  />
                </FormField>

                <FormField label="请假时长" required>
                  <Select
                    value={formData.leaveDurationType}
                    onChange={(value) => handleInputChange('leaveDurationType', value)}
                    options={[...LEAVE_DURATION_OPTIONS]}
                  />
                </FormField>
              </div>

              {formData.leaveDurationType === 'hours' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="请假小时数" required error={formErrors.leaveHours}>
                    <div className="space-y-2">
                      <Input
                        type="number"
                        value={formData.leaveHours}
                        onChange={(e) => handleInputChange('leaveHours', parseFloat(e.target.value))}
                        min={0.5}
                        max={8}
                        step={0.5}
                        error={formErrors.leaveHours}
                      />
                      <div className="text-center text-sm text-text-secondary">
                        {formData.leaveHours} 小时
                      </div>
                    </div>
                  </FormField>

                  <FormField label="开始时间" required error={formErrors.leaveStartTime}>
                    <Input
                      type="time"
                      value={formData.leaveStartTime}
                      onChange={(e) => handleInputChange('leaveStartTime', e.target.value)}
                      error={formErrors.leaveStartTime}
                    />
                  </FormField>

                  <FormField label="结束时间">
                    <Input
                      type="time"
                      value={formData.leaveEndTime}
                      onChange={(e) => handleInputChange('leaveEndTime', e.target.value)}
                      disabled
                      className="bg-gray-50"
                    />
                  </FormField>
                </div>
              )}

              <FormField label="请假原因" required error={formErrors.leaveReason}>
                <Input
                  value={formData.leaveReason}
                  onChange={(e) => handleInputChange('leaveReason', e.target.value)}
                  placeholder="请输入请假原因..."
                  multiline
                  rows={2}
                  error={formErrors.leaveReason}
                />
              </FormField>
            </div>
          )}

          {/* 加班详细设置 */}
          {formData.exceptionType === 'overtime' && (
            <div className="space-y-4">
              <FormField label="加班小时数" required error={formErrors.overtimeHours}>
                <div className="space-y-2">
                  <Input
                    type="number"
                    value={formData.overtimeHours}
                    onChange={(e) => handleInputChange('overtimeHours', parseFloat(e.target.value))}
                    min={0.5}
                    max={12}
                    step={0.5}
                    error={formErrors.overtimeHours}
                  />
                  <div className="text-center text-sm text-text-secondary">
                    {formData.overtimeHours} 小时
                  </div>
                </div>
              </FormField>

              <FormField label="加班原因" required error={formErrors.overtimeReason}>
                <Input
                  value={formData.overtimeReason}
                  onChange={(e) => handleInputChange('overtimeReason', e.target.value)}
                  placeholder="请输入加班原因..."
                  multiline
                  rows={2}
                  error={formErrors.overtimeReason}
                />
              </FormField>
            </div>
          )}

          {/* 缺勤详细设置 */}
          {formData.exceptionType === 'absent' && (
            <FormField label="缺勤原因" required error={formErrors.absentReason}>
              <Input
                value={formData.absentReason}
                onChange={(e) => handleInputChange('absentReason', e.target.value)}
                placeholder="请输入缺勤原因..."
                multiline
                rows={2}
                error={formErrors.absentReason}
              />
            </FormField>
          )}

          {/* 备注 */}
          <FormField label="备注">
            <Input
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="其他需要说明的信息..."
              multiline
              rows={2}
            />
          </FormField>

          {/* 工时影响预览 */}
          {previewWorkHours && selectedEmployee && (
            <Alert variant="info">
              <div className="text-sm">
                <div className="font-medium mb-2">工时影响预览：</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-text-secondary">标准工时</div>
                    <div className="font-medium">{previewWorkHours.standardHours}h</div>
                  </div>
                  <div>
                    <div className="text-text-secondary">实际工时</div>
                    <div className="font-medium text-green-600">{previewWorkHours.actualHours}h</div>
                  </div>
                  {previewWorkHours.leaveHours > 0 && (
                    <div>
                      <div className="text-text-secondary">请假时长</div>
                      <div className="font-medium text-yellow-600">{previewWorkHours.leaveHours}h</div>
                    </div>
                  )}
                  {previewWorkHours.overtimeHours > 0 && (
                    <div>
                      <div className="text-text-secondary">加班时长</div>
                      <div className="font-medium text-blue-600">{previewWorkHours.overtimeHours}h</div>
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          )}
        </div>

        <FormActions>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            disabled={saving || !selectedEmployee}
          >
            确认添加
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
};
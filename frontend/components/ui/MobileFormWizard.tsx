'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button, FormField, Input, Select } from '@/components/ui';

interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: string[];
  validation?: (data: any) => string | null;
}

interface MobileFormWizardProps {
  steps: FormStep[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  className?: string;
}

export const MobileFormWizard: React.FC<MobileFormWizardProps> = ({
  steps,
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // 更新表单数据
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 验证当前步骤
  const validateCurrentStep = (): boolean => {
    if (!currentStepData.validation) return true;
    
    const error = currentStepData.validation(formData);
    if (error) {
      setErrors(prev => ({ ...prev, [currentStepData.id]: error }));
      return false;
    }
    
    return true;
  };

  // 下一步
  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  // 上一步
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`lg:hidden ${className}`}>
      {/* 顶部导航栏 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentStepData.title}
            </h2>
            <p className="text-sm text-gray-500">
              {currentStep + 1} / {steps.length}
            </p>
          </div>
          
          <div className="w-9 h-9"></div> {/* 占位符保持居中 */}
        </div>
        
        {/* 进度条 */}
        <div className="h-1 bg-gray-200">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="flex justify-center py-4 bg-gray-50">
        <div className="flex items-center space-x-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index < currentStep
                    ? 'bg-blue-500 text-white'
                    : index === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < currentStep ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    index < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 表单内容 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          className="flex-1 p-4 min-h-[400px]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* 步骤描述 */}
          {currentStepData.description && (
            <p className="text-gray-600 mb-6 leading-relaxed">
              {currentStepData.description}
            </p>
          )}

          {/* 表单字段 */}
          <div className="space-y-6">
            {currentStepData.fields.map(fieldName => (
              <FormField
                key={fieldName}
                label={getFieldLabel(fieldName)}
                required={isFieldRequired(fieldName)}
                error={errors[fieldName]}
              >
                {renderField(fieldName, formData[fieldName], updateField)}
              </FormField>
            ))}
          </div>

          {/* 步骤级别的错误提示 */}
          {errors[currentStepData.id] && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors[currentStepData.id]}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 底部操作栏 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <div className="flex justify-between space-x-3">
          <Button
            variant="secondary"
            onClick={isFirstStep ? onCancel : handlePrevious}
            disabled={loading || isSubmitting}
            className="flex-1"
          >
            {isFirstStep ? '取消' : (
              <>
                <ChevronLeftIcon className="w-4 h-4 mr-1" />
                上一步
              </>
            )}
          </Button>
          
          <Button
            variant="primary"
            onClick={isLastStep ? handleSubmit : handleNext}
            disabled={loading}
            loading={isLastStep && isSubmitting}
            className="flex-1"
          >
            {isLastStep ? '完成' : (
              <>
                下一步
                <ChevronRightIcon className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// 获取字段标签
function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    name: '员工姓名',
    employeeId: '员工编号',
    department: '所属车间',
    position: '职位',
    phone: '手机号码',
    email: '邮箱地址',
    hireDate: '入职日期',
    status: '员工状态'
  };
  return labels[fieldName] || fieldName;
}

// 检查字段是否必填
function isFieldRequired(fieldName: string): boolean {
  const requiredFields = ['name', 'department', 'hireDate'];
  return requiredFields.includes(fieldName);
}

// 渲染表单字段
function renderField(
  fieldName: string, 
  value: any, 
  onChange: (field: string, value: any) => void
): React.ReactNode {
  const commonProps = {
    value: value || '',
    onChange: (e: any) => onChange(fieldName, e.target?.value || e)
  };

  switch (fieldName) {
    case 'name':
      return (
        <Input
          {...commonProps}
          placeholder="请输入员工姓名"
          autoFocus
        />
      );
      
    case 'employeeId':
      return (
        <Input
          {...commonProps}
          placeholder="请输入员工编号"
        />
      );
      
    case 'department':
      return (
        <Select
          {...commonProps}
          options={[
            { value: '东车间', label: '东车间' },
            { value: '西车间', label: '西车间' },
            { value: '北车间', label: '北车间' },
            { value: '后勤', label: '后勤' }
          ]}
          placeholder="请选择车间"
        />
      );
      
    case 'position':
      return (
        <Input
          {...commonProps}
          placeholder="请输入职位"
        />
      );
      
    case 'phone':
      return (
        <Input
          {...commonProps}
          type="tel"
          placeholder="请输入手机号码"
        />
      );
      
    case 'email':
      return (
        <Input
          {...commonProps}
          type="email"
          placeholder="请输入邮箱地址"
        />
      );
      
    case 'hireDate':
      return (
        <Input
          {...commonProps}
          type="date"
        />
      );
      
    case 'status':
      return (
        <Select
          {...commonProps}
          options={[
            { value: 'active', label: '在职' },
            { value: 'inactive', label: '离职' }
          ]}
          placeholder="请选择状态"
        />
      );
      
    default:
      return (
        <Input
          {...commonProps}
          placeholder={`请输入${getFieldLabel(fieldName)}`}
        />
      );
  }
}

// 预定义的员工表单步骤
export const EMPLOYEE_FORM_STEPS: FormStep[] = [
  {
    id: 'basic',
    title: '基本信息',
    description: '请填写员工的基本信息',
    fields: ['name', 'employeeId'],
    validation: (data) => {
      if (!data.name?.trim()) return '请输入员工姓名';
      if (data.name.trim().length < 2) return '员工姓名至少需要2个字符';
      return null;
    }
  },
  {
    id: 'work',
    title: '工作信息',
    description: '设置员工的工作相关信息',
    fields: ['department', 'position', 'hireDate'],
    validation: (data) => {
      if (!data.department) return '请选择所属车间';
      if (!data.hireDate) return '请选择入职日期';
      return null;
    }
  },
  {
    id: 'contact',
    title: '联系方式',
    description: '填写员工的联系信息（可选）',
    fields: ['phone', 'email'],
    validation: (data) => {
      if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
        return '请输入正确的手机号码';
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return '请输入正确的邮箱地址';
      }
      return null;
    }
  },
  {
    id: 'status',
    title: '员工状态',
    description: '设置员工的当前状态',
    fields: ['status'],
    validation: (data) => {
      if (!data.status) return '请选择员工状态';
      return null;
    }
  }
];
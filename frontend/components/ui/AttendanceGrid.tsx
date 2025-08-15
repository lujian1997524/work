'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Card, Button, Modal, Select, Input, FormField } from '@/components/ui';
import { AttendanceDetailTooltip } from '@/components/ui/AttendanceDetailTooltip';
import { type AttendanceException } from '@/types/attendance';

// 请假类型选项
const LEAVE_TYPE_OPTIONS = [
  { value: 'sick', label: '病假' },
  { value: 'personal', label: '事假' },
  { value: 'annual', label: '年假' },
  { value: 'compensatory', label: '调休' }
];

// 请假时长类型选项  
const LEAVE_DURATION_OPTIONS = [
  { value: 'full_day', label: '全天' },
  { value: 'half_day', label: '半天' },
  { value: 'hours', label: '小时' }
];

export interface AttendanceCellProps {
  employee: {
    id: number;
    name: string;
    avatar?: string;
  };
  date: string;
  status: 'present' | 'leave' | 'absent' | 'overtime' | 'late' | 'early';
  exception?: AttendanceException | null;
  onStatusChange: (status: string, exception?: any) => void;
  isToday?: boolean;
  isWeekend?: boolean;
  rowIndex?: number;
  totalRows?: number;
}

export interface AttendanceGridProps {
  employees: any[];
  dates: Date[];
  onStatusChange: (employeeId: number, date: string, status: string, reason?: string) => void;
  getStatus: (employeeId: number, date: string) => string;
  getException?: (employeeId: number, date: string) => AttendanceException | null;
  serverToday?: string; // 后端服务器时间
  className?: string;
}

// 简洁的考勤单元格
export const AttendanceCell: React.FC<AttendanceCellProps> = ({
  employee,
  date,
  status,
  exception,
  onStatusChange,
  isToday = false,
  isWeekend = false,
  rowIndex = 0,
  totalRows = 1
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(status);
  
  // 智能定位逻辑
  const getTooltipPosition = () => {
    const isFirstRow = rowIndex === 0;
    const isLastRow = rowIndex === totalRows - 1;
    
    if (isFirstRow) {
      // 第一行：右下方显示
      return {
        className: "absolute top-full left-full transform -translate-x-full mt-1 z-50",
        animation: { y: -5 }
      };
    } else if (isLastRow) {
      // 最后一行：右上方显示  
      return {
        className: "absolute bottom-full left-full transform -translate-x-full mb-1 z-50",
        animation: { y: 5 }
      };
    } else {
      // 中间行：右侧显示
      return {
        className: "absolute top-0 left-full ml-2 z-50",
        animation: { x: -5 }
      };
    }
  };
  
  const tooltipConfig = getTooltipPosition();
  
  // 表单状态
  const [leaveType, setLeaveType] = useState(exception?.leaveType || 'sick');
  const [leaveDurationType, setLeaveDurationType] = useState(exception?.leaveDurationType || 'full_day');
  const [leaveHours, setLeaveHours] = useState(exception?.leaveHours || 4.5);
  const [leaveStartTime, setLeaveStartTime] = useState(exception?.leaveStartTime || '09:00');
  const [leaveEndTime, setLeaveEndTime] = useState(exception?.leaveEndTime || '18:00');
  const [leaveReason, setLeaveReason] = useState(exception?.leaveReason || '');
  
  const [overtimeStartTime, setOvertimeStartTime] = useState(exception?.overtimeStartTime || '18:00');
  const [overtimeEndTime, setOvertimeEndTime] = useState(exception?.overtimeEndTime || '20:00');
  const [overtimeReason, setOvertimeReason] = useState(exception?.overtimeReason || '');
  
  const [absentReason, setAbsentReason] = useState(exception?.absentReason || '');
  
  const [earlyLeaveTime, setEarlyLeaveTime] = useState(exception?.earlyLeaveTime || '16:00');
  const [earlyLeaveReason, setEarlyLeaveReason] = useState(exception?.earlyLeaveReason || '');
  
  const [lateArrivalTime, setLateArrivalTime] = useState(exception?.lateArrivalTime || '10:00');
  const [lateArrivalReason, setLateArrivalReason] = useState(exception?.lateArrivalReason || '');

  // 获取异常摘要信息用于显示
  const getExceptionSummary = () => {
    if (!exception) return '';
    
    if (status === 'leave') {
      const typeLabel = LEAVE_TYPE_OPTIONS.find(opt => opt.value === exception.leaveType)?.label || '';
      const durationLabel = LEAVE_DURATION_OPTIONS.find(opt => opt.value === exception.leaveDurationType)?.label || '';
      return `${typeLabel}${durationLabel}`;
    } else if (status === 'overtime') {
      return `加班${Math.floor((exception.overtimeMinutes || 0) / 60)}小时${(exception.overtimeMinutes || 0) % 60}分钟`;
    } else if (status === 'absent') {
      return '缺勤';
    } else if (status === 'early') {
      return `早退至${exception.earlyLeaveTime || ''}`;
    } else if (status === 'late') {
      return `迟到至${exception.lateArrivalTime || ''}`;
    }
    
    return '';
  };

  // 计算加班分钟数
  const calculateOvertimeMinutes = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;
    
    return endTotal - startTotal;
  };

  // 保存考勤状态
  const handleSave = () => {
    let exceptionData = {};

    if (selectedStatus === 'leave') {
      exceptionData = {
        leaveType,
        leaveDurationType,
        leaveHours: leaveDurationType === 'hours' ? leaveHours : (leaveDurationType === 'half_day' ? 4.5 : 9),
        leaveStartTime: leaveDurationType === 'hours' ? leaveStartTime : undefined,
        leaveEndTime: leaveDurationType === 'hours' ? leaveEndTime : undefined,
        leaveReason
      };
    } else if (selectedStatus === 'overtime') {
      const overtimeMinutes = calculateOvertimeMinutes(overtimeStartTime, overtimeEndTime);
      exceptionData = {
        overtimeMinutes,
        overtimeStartTime,
        overtimeEndTime,
        overtimeReason
      };
    } else if (selectedStatus === 'absent') {
      exceptionData = {
        absentReason
      };
    } else if (selectedStatus === 'early') {
      exceptionData = {
        earlyLeaveTime,
        earlyLeaveReason
      };
    } else if (selectedStatus === 'late') {
      exceptionData = {
        lateArrivalTime,
        lateArrivalReason
      };
    }

    onStatusChange(selectedStatus, exceptionData);
    setShowModal(false);
  };

  const statusConfig = {
    present: {
      icon: CheckCircleIcon,
      label: '出勤',
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700'
    },
    leave: {
      icon: ClockIcon,
      label: '请假',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700'
    },
    absent: {
      icon: XCircleIcon,
      label: '缺勤',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700'
    },
    overtime: {
      icon: ExclamationTriangleIcon,
      label: '加班',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700'
    },
    late: {
      icon: ClockIcon,
      label: '迟到',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700'
    },
    early: {
      icon: ClockIcon,
      label: '早退',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700'
    }
  };

  const config = statusConfig[status] || statusConfig.present;
  const Icon = config.icon;

  const handleSubmit = () => {
    handleSave();
  };

  return (
    <>
      <div 
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          className={`
            w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 cursor-pointer
            ${config.bg} ${config.border}
            flex items-center justify-center
            transition-all duration-200 hover:scale-105 hover:shadow-md
            ${isWeekend ? 'opacity-60' : ''}
          `}
          onClick={() => setShowModal(true)}
          title={`${employee.name} - ${config.label}${getExceptionSummary() ? `: ${getExceptionSummary()}` : ''}`}
        >
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.text}`} />
        </div>
        
        {/* Tooltip 悬停显示详细信息 - 智能定位 */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, ...tooltipConfig.animation }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, ...tooltipConfig.animation }}
              transition={{ duration: 0.15 }}
              className={tooltipConfig.className}
              style={{ pointerEvents: 'none' }}
            >
              <AttendanceDetailTooltip
                exception={exception || null}
                employeeName={employee.name}
                date={date}
                className="whitespace-nowrap shadow-lg"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 简洁的状态选择模态框 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        size="md"
        className="mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto"
      >
        <div className="p-4 sm:p-6">
          {/* 员工信息头部 */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-text-primary">
                {employee.name}
              </h3>
              <p className="text-sm text-text-secondary">
                {new Date(date).toLocaleDateString('zh-CN', { 
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
          </div>

          {/* 状态选择 */}
          <div className="mb-4 sm:mb-6">
            <h4 className="text-sm font-medium text-text-secondary mb-3">选择考勤状态</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(statusConfig).map(([key, statusInfo]) => {
                const StatusIcon = statusInfo.icon;
                const isSelected = selectedStatus === key;
                
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedStatus(key as "leave" | "absent" | "overtime" | "present" | "early" | "late")}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200
                      flex items-center gap-3
                      ${isSelected 
                        ? `${statusInfo.bg} ${statusInfo.border}` 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <StatusIcon className={`w-5 h-5 ${isSelected ? statusInfo.text : 'text-gray-500'}`} />
                    <span className={`font-medium ${isSelected ? statusInfo.text : 'text-gray-600'}`}>
                      {statusInfo.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 详细表单根据状态显示 */}
          {selectedStatus === 'leave' && (
            <div className="space-y-4 mb-4 sm:mb-6">
              <h4 className="text-sm font-medium text-text-secondary">请假详情</h4>
              
              <FormField label="请假类型" required>
                <Select
                  value={leaveType}
                  onChange={(value) => setLeaveType(value as "sick" | "personal" | "annual" | "compensatory")}
                  options={LEAVE_TYPE_OPTIONS}
                />
              </FormField>

              <FormField label="请假时长" required>
                <Select
                  value={leaveDurationType}
                  onChange={(value) => setLeaveDurationType(value as "full_day" | "half_day" | "hours")}
                  options={LEAVE_DURATION_OPTIONS}
                />
              </FormField>

              {leaveDurationType === 'hours' && (
                <>
                  <FormField label="请假小时数" required>
                    <Input
                      type="number"
                      value={leaveHours}
                      onChange={(e) => setLeaveHours(Number(e.target.value))}
                      min="0.5"
                      max="9"
                      step="0.5"
                      placeholder="例如: 2.5"
                    />
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="开始时间">
                      <Input
                        type="time"
                        value={leaveStartTime}
                        onChange={(e) => setLeaveStartTime(e.target.value)}
                      />
                    </FormField>
                    <FormField label="结束时间">
                      <Input
                        type="time"
                        value={leaveEndTime}
                        onChange={(e) => setLeaveEndTime(e.target.value)}
                      />
                    </FormField>
                  </div>
                </>
              )}

              <FormField label="请假原因" required>
                <Input
                  type="text"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="请输入具体的请假原因..."
                />
              </FormField>
            </div>
          )}

          {selectedStatus === 'overtime' && (
            <div className="space-y-4 mb-4 sm:mb-6">
              <h4 className="text-sm font-medium text-text-secondary">加班详情</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="加班开始时间" required>
                  <Input
                    type="time"
                    value={overtimeStartTime}
                    onChange={(e) => setOvertimeStartTime(e.target.value)}
                  />
                </FormField>
                <FormField label="加班结束时间" required>
                  <Input
                    type="time"
                    value={overtimeEndTime}
                    onChange={(e) => setOvertimeEndTime(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="text-sm text-text-secondary">
                预计加班时长: {Math.max(0, calculateOvertimeMinutes(overtimeStartTime, overtimeEndTime))} 分钟
              </div>

              <FormField label="加班原因" required>
                <Input
                  type="text"
                  value={overtimeReason}
                  onChange={(e) => setOvertimeReason(e.target.value)}
                  placeholder="请输入加班的具体原因..."
                />
              </FormField>
            </div>
          )}

          {selectedStatus === 'absent' && (
            <div className="space-y-4 mb-4 sm:mb-6">
              <h4 className="text-sm font-medium text-text-secondary">缺勤详情</h4>
              
              <FormField label="缺勤原因" required>
                <Input
                  type="text"
                  value={absentReason}
                  onChange={(e) => setAbsentReason(e.target.value)}
                  placeholder="请输入缺勤的具体原因..."
                />
              </FormField>
            </div>
          )}

          {selectedStatus === 'early' && (
            <div className="space-y-4 mb-4 sm:mb-6">
              <h4 className="text-sm font-medium text-text-secondary">早退详情</h4>
              
              <FormField label="早退时间" required>
                <Input
                  type="time"
                  value={earlyLeaveTime}
                  onChange={(e) => setEarlyLeaveTime(e.target.value)}
                />
              </FormField>

              <FormField label="早退原因" required>
                <Input
                  type="text"
                  value={earlyLeaveReason}
                  onChange={(e) => setEarlyLeaveReason(e.target.value)}
                  placeholder="请输入早退的具体原因..."
                />
              </FormField>
            </div>
          )}

          {selectedStatus === 'late' && (
            <div className="space-y-4 mb-4 sm:mb-6">
              <h4 className="text-sm font-medium text-text-secondary">迟到详情</h4>
              
              <FormField label="到达时间" required>
                <Input
                  type="time"
                  value={lateArrivalTime}
                  onChange={(e) => setLateArrivalTime(e.target.value)}
                />
              </FormField>

              <FormField label="迟到原因" required>
                <Input
                  type="text"
                  value={lateArrivalReason}
                  onChange={(e) => setLateArrivalReason(e.target.value)}
                  placeholder="请输入迟到的具体原因..."
                />
              </FormField>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              className="flex-1"
            >
              确认更新
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

// 简洁的考勤网格
export const AttendanceGrid: React.FC<AttendanceGridProps> = ({
  employees,
  dates,
  onStatusChange,
  getStatus,
  getException,
  serverToday = '',
  className = ''
}) => {
  // 使用后端提供的今天日期，如果没有则使用本地时间作为后备
  const todayStr = serverToday || new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);
  
  return (
    <Card className={`${className}`}>
      {/* 移动端滚动提示 */}
      <div className="block sm:hidden bg-amber-50 border-l-4 border-amber-400 p-3 m-4 rounded-r-lg">
        <p className="text-sm text-amber-700 flex items-center gap-2">
          <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
          左右滑动查看更多日期
        </p>
      </div>
      
      {/* 统一的滚动容器 - 表头和内容一起滚动 */}
      <div className="overflow-x-auto">
        <div className="min-w-fit sm:min-w-0">
          {/* 表格头部 */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="flex">
              {/* 员工名称列 */}
              <div className="flex-shrink-0 w-24 sm:w-32 p-2 sm:p-4 border-r border-gray-200">
                <h3 className="text-sm sm:text-base font-semibold text-text-primary">员工</h3>
              </div>
              
              {/* 日期列 */}
              {dates.map(date => {
                // 使用本地时间格式化日期，避免UTC时区问题
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                
                const isCurrentDay = dateStr === todayStr;
                const isPastDay = date < today;  
                const isFutureDay = date > today;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                
                return (
                  <div 
                    key={dateStr} 
                    className={`
                      flex-shrink-0 w-12 sm:w-16 p-1 sm:p-2 text-center border-r border-gray-200
                      ${isCurrentDay ? 'bg-ios18-blue text-white' : 
                        isFutureDay ? 'bg-gray-50 opacity-50' : 
                        isWeekend ? 'bg-gray-100' : ''}
                    `}
                  >
                    <div className={`text-xs ${
                      isCurrentDay ? 'text-white' : 
                      isFutureDay ? 'text-gray-400' : 
                      isWeekend ? 'text-gray-500' : 'text-text-secondary'
                    }`}>
                      {date.toLocaleDateString('zh-CN', { weekday: 'short' })}
                    </div>
                    <div className={`text-xs sm:text-sm font-bold mt-1 ${
                      isCurrentDay ? 'text-white' : 
                      isFutureDay ? 'text-gray-400' : 
                      isWeekend ? 'text-gray-600' : 'text-text-primary'
                    }`}>
                      {date.getDate()}
                    </div>
                    {isCurrentDay && (
                      <div className="w-1 h-1 bg-white rounded-full mx-auto mt-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 员工行 */}
          <div className="divide-y divide-gray-100">
            {employees.map((employee, employeeIndex) => (
              <div
                key={employee.id}
                className="flex hover:bg-gray-50 transition-colors duration-200"
              >
                {/* 员工信息 */}
                <div className="flex-shrink-0 w-24 sm:w-32 p-2 sm:p-4 border-r border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-text-primary text-xs sm:text-sm truncate">
                        {employee.name}
                      </div>
                      <div className="text-xs text-text-secondary truncate sm:block hidden">
                        {employee.position}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 考勤单元格 */}
                {dates.map(date => {
                  // 使用本地时间格式化日期，避免UTC时区问题
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${day}`;
                  
                  const isCurrentDay = dateStr === todayStr;
                  const isPastDay = date < today;
                  const isFutureDay = date > today;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  
                  // 未来日期不显示考勤单元格，只显示空白
                  if (isFutureDay) {
                    return (
                      <div 
                        key={dateStr} 
                        className="flex-shrink-0 w-12 sm:w-16 p-1 sm:p-2 flex items-center justify-center border-r border-gray-100 bg-gray-50 opacity-50"
                        title="未来日期"
                      >
                        {/* 未来日期显示空白 */}
                      </div>
                    );
                  }
                  
                  const status = getStatus(employee.id, dateStr);
                  const exception = getException ? getException(employee.id, dateStr) : null;
                  
                  return (
                    <div 
                      key={dateStr} 
                      className={`
                        flex-shrink-0 w-12 sm:w-16 p-1 sm:p-2 flex items-center justify-center border-r border-gray-100
                        ${isCurrentDay ? 'bg-ios18-blue/10' : ''}
                      `}
                    >
                      <AttendanceCell
                        employee={employee}
                        date={dateStr}
                        status={status as "leave" | "absent" | "overtime" | "present" | "early" | "late"}
                        exception={exception}
                        onStatusChange={(newStatus, exceptionData) => 
                          onStatusChange(employee.id, dateStr, newStatus, exceptionData)
                        }
                        isToday={isCurrentDay}
                        isWeekend={isWeekend}
                        rowIndex={employeeIndex}
                        totalRows={employees.length}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
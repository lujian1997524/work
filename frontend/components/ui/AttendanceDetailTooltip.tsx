'use client';

import React from 'react';
import { 
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { type AttendanceException } from '@/types/attendance';

interface AttendanceDetailTooltipProps {
  exception: AttendanceException | null;
  employeeName: string;
  date: string;
  className?: string;
}

export const AttendanceDetailTooltip: React.FC<AttendanceDetailTooltipProps> = ({
  exception,
  employeeName,
  date,
  className = ''
}) => {
  if (!exception) {
    return (
      <div className={`p-3 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-green-700">
          <InformationCircleIcon className="w-4 h-4" />
          <span className="text-sm font-medium">正常出勤</span>
        </div>
        <p className="text-xs text-green-600 mt-1">
          {employeeName} 在 {new Date(date).toLocaleDateString('zh-CN')} 正常出勤
        </p>
      </div>
    );
  }

  const getStatusInfo = () => {
    switch (exception.exceptionType) {
      case 'leave':
        return {
          icon: CalendarDaysIcon,
          title: '请假',
          color: 'yellow',
          details: [
            `类型: ${getLeaveTypeLabel(exception.leaveType)}`,
            `时长: ${getLeaveHoursDisplay(exception)}`,
            ...(exception.leaveReason ? [`原因: ${exception.leaveReason}`] : [])
          ]
        };
      
      case 'overtime':
        return {
          icon: ClockIcon,
          title: '加班',
          color: 'blue',
          details: [
            `时长: ${exception.overtimeMinutes ? Math.floor(exception.overtimeMinutes / 60) + '小时' + (exception.overtimeMinutes % 60) + '分钟' : '未知'}`,
            ...(exception.overtimeStartTime && exception.overtimeEndTime ? 
              [`时间: ${exception.overtimeStartTime} - ${exception.overtimeEndTime}`] : []),
            ...(exception.overtimeReason ? [`原因: ${exception.overtimeReason}`] : [])
          ]
        };
      
      case 'absent':
        return {
          icon: ExclamationTriangleIcon,
          title: '缺勤',
          color: 'red',
          details: [
            ...(exception.absentReason ? [`原因: ${exception.absentReason}`] : ['无原因说明'])
          ]
        };
      
      case 'late':
        return {
          icon: ClockIcon,
          title: '迟到',
          color: 'orange',
          details: [
            ...(exception.lateArrivalTime ? [`到达时间: ${exception.lateArrivalTime}`] : []),
            ...(exception.lateArrivalReason ? [`原因: ${exception.lateArrivalReason}`] : ['无原因说明'])
          ]
        };
      
      case 'early':
        return {
          icon: ClockIcon,
          title: '早退',
          color: 'purple',
          details: [
            ...(exception.earlyLeaveTime ? [`离开时间: ${exception.earlyLeaveTime}`] : []),
            ...(exception.earlyLeaveReason ? [`原因: ${exception.earlyLeaveReason}`] : ['无原因说明'])
          ]
        };
      
      default:
        return {
          icon: InformationCircleIcon,
          title: '未知状态',
          color: 'gray',
          details: []
        };
    }
  };

  const getLeaveTypeLabel = (leaveType?: string) => {
    const labels = {
      'sick': '病假',
      'personal': '事假',
      'annual': '年假',
      'compensatory': '调休'
    };
    return labels[leaveType as keyof typeof labels] || '未知';
  };

  const getLeaveHoursDisplay = (exception: AttendanceException) => {
    if (exception.leaveDurationType === 'full_day') {
      return '全天';
    } else if (exception.leaveDurationType === 'half_day') {
      return '半天';
    } else if (exception.leaveHours) {
      return `${exception.leaveHours}小时`;
    }
    return '未知';
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;
  
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: 'text-yellow-600'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200', 
      text: 'text-blue-700',
      icon: 'text-blue-600'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-600'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      icon: 'text-orange-600'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      icon: 'text-purple-600'
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      icon: 'text-gray-600'
    }
  };

  const colors = colorClasses[statusInfo.color as keyof typeof colorClasses];

  return (
    <div className={`p-3 ${colors.bg} border ${colors.border} rounded-lg max-w-xs ${className}`}>
      {/* 标题 */}
      <div className={`flex items-center gap-2 ${colors.text} mb-2`}>
        <Icon className={`w-4 h-4 ${colors.icon}`} />
        <span className="text-sm font-medium">{statusInfo.title}</span>
      </div>

      {/* 员工和日期 */}
      <div className={`text-xs ${colors.text} opacity-80 mb-2`}>
        {employeeName} • {new Date(date).toLocaleDateString('zh-CN', { 
          month: 'short', 
          day: 'numeric',
          weekday: 'short'
        })}
      </div>

      {/* 详细信息 */}
      <div className="space-y-1">
        {statusInfo.details.map((detail, index) => (
          <div key={index} className={`text-xs ${colors.text}`}>
            {detail}
          </div>
        ))}
      </div>

      {/* 备注 */}
      {exception.notes && (
        <div className={`text-xs ${colors.text} opacity-75 mt-2 pt-2 border-t ${colors.border}`}>
          备注: {exception.notes}
        </div>
      )}
    </div>
  );
};
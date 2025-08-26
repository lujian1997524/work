'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Card,
  ModernTable,
  SearchBar,
  DatePicker,
  Select,
  Button,
  IconButton,
  Badge,
  StateChip,
  Alert,
  Timeline,
  ProgressBar,
  useToast,
  useDialog
} from '@/components/ui';
import { 
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  DocumentTextIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useAttendanceStore } from '@/stores/attendanceStore';
import { 
  LEAVE_TYPE_OPTIONS,
  ATTENDANCE_STATUS_LABELS,
  type Employee,
  type AttendanceException
} from '@/types/attendance';

interface LeaveManagementProps {
  className?: string;
}

interface LeaveFilters {
  employeeId: string;
  leaveType: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  status: string;
}

const initialFilters: LeaveFilters = {
  employeeId: '',
  leaveType: '',
  dateRange: {
    startDate: '',
    endDate: ''
  },
  status: ''
};

// 请假状态选项
const leaveStatusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已拒绝' }
];

export const LeaveManagement: React.FC<LeaveManagementProps> = ({
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<LeaveFilters>(initialFilters);
  const [selectedLeaveRecord, setSelectedLeaveRecord] = useState<AttendanceException | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const toast = useToast();
  const { confirm } = useDialog();

  const {
    employees,
    attendanceExceptions,
    selectedDate,
    loading,
    fetchAttendanceExceptions,
    updateAttendanceException,
    deleteAttendanceException
  } = useAttendanceStore();

  // 获取请假记录
  const leaveRecords = attendanceExceptions.filter(exc => exc.exceptionType === 'leave');

  // 初始化数据
  useEffect(() => {
    // 获取最近30天的考勤异常记录
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    setFilters(prev => ({
      ...prev,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    }));
    
    // TODO: 实际应该调用获取指定日期范围的数据
    fetchAttendanceExceptions({ date: selectedDate });
  }, []);

  // 过滤请假记录
  const getFilteredLeaveRecords = () => {
    let filtered = leaveRecords;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(record => {
        const employee = employees.find(emp => emp.id === record.employeeId);
        return employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               employee?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               record.leaveReason?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // 员工过滤
    if (filters.employeeId) {
      filtered = filtered.filter(record => record.employeeId.toString() === filters.employeeId);
    }

    // 请假类型过滤
    if (filters.leaveType) {
      filtered = filtered.filter(record => record.leaveType === filters.leaveType);
    }

    // 日期范围过滤
    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        const startDate = new Date(filters.dateRange.startDate);
        const endDate = new Date(filters.dateRange.endDate);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredLeaveRecords = getFilteredLeaveRecords();

  // 获取请假统计
  const getLeaveStatistics = () => {
    const total = filteredLeaveRecords.length;
    const byType = {
      sick: filteredLeaveRecords.filter(record => record.leaveType === 'sick').length,
      personal: filteredLeaveRecords.filter(record => record.leaveType === 'personal').length,
      annual: filteredLeaveRecords.filter(record => record.leaveType === 'annual').length,
      compensatory: filteredLeaveRecords.filter(record => record.leaveType === 'compensatory').length
    };
    
    const totalHours = filteredLeaveRecords.reduce((sum, record) => sum + (record.leaveHours || 0), 0);
    const avgHours = total > 0 ? (totalHours / total).toFixed(1) : '0';

    return { total, byType, totalHours, avgHours };
  };

  const stats = getLeaveStatistics();

  // 编辑请假记录
  const handleEditLeave = (record: AttendanceException) => {
    setSelectedLeaveRecord(record);
    toast.addToast({
      type: 'info',
      message: '编辑请假记录功能开发中...'
    });
  };

  // 删除请假记录
  const handleDeleteLeave = async (record: AttendanceException) => {
    const employee = employees.find(emp => emp.id === record.employeeId);
    const confirmed = await confirm(`确定要删除 ${employee?.name} 的请假记录吗？`);
    if (!confirmed) return;
    
    const success = await deleteAttendanceException(record.id);
    if (success) {
      toast.addToast({
        type: 'success',
        message: '请假记录删除成功'
      });
    } else {
      toast.addToast({
        type: 'error',
        message: '删除请假记录失败'
      });
    }
  };

  // 获取请假类型标签
  const getLeaveTypeLabel = (type: string) => {
    const option = LEAVE_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.label || type;
  };

  // 获取请假时长描述
  const getLeaveDurationText = (record: AttendanceException) => {
    switch (record.leaveDurationType) {
      case 'full_day':
        return '全天';
      case 'half_day':
        return '半天';
      case 'hours':
        return `${record.leaveHours}小时`;
      default:
        return '-';
    }
  };

  // 过滤器重置
  const resetFilters = () => {
    setFilters(initialFilters);
    setSearchTerm('');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
              <div className="text-sm text-text-secondary">总请假记录</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{stats.totalHours}</div>
              <div className="text-sm text-text-secondary">总请假时长(小时)</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{stats.avgHours}</div>
              <div className="text-sm text-text-secondary">平均时长(小时)</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="text-sm text-text-secondary">请假类型分布</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>病假</span>
                <span className="font-medium">{stats.byType.sick}</span>
              </div>
              <div className="flex justify-between">
                <span>事假</span>
                <span className="font-medium">{stats.byType.personal}</span>
              </div>
              <div className="flex justify-between">
                <span>年假</span>
                <span className="font-medium">{stats.byType.annual}</span>
              </div>
              <div className="flex justify-between">
                <span>调休</span>
                <span className="font-medium">{stats.byType.compensatory}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 搜索和过滤 */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <SearchBar
              placeholder="搜索员工姓名、工号或请假原因..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="flex-1"
            />
            
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <FunnelIcon className="w-4 h-4" />
                高级筛选
              </Button>
              
              {(searchTerm || filters.employeeId || filters.leaveType) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetFilters}
                >
                  清除筛选
                </Button>
              )}
            </div>
          </div>

          {/* 高级筛选面板 */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    员工筛选
                  </label>
                  <Select
                    value={filters.employeeId}
                    onChange={(value) => setFilters(prev => ({ ...prev, employeeId: value as string }))}
                    options={[
                      { value: '', label: '全部员工' },
                      ...employees.map(emp => ({
                        value: emp.id.toString(),
                        label: `${emp.name} (${emp.department})`
                      }))
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    请假类型
                  </label>
                  <Select
                    value={filters.leaveType}
                    onChange={(value) => setFilters(prev => ({ ...prev, leaveType: value as string }))}
                    options={[
                      { value: '', label: '全部类型' },
                      ...LEAVE_TYPE_OPTIONS
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    开始日期
                  </label>
                  <DatePicker
                    value={filters.dateRange.startDate ? new Date(filters.dateRange.startDate) : undefined}
                    onChange={(date) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, startDate: date ? date.toISOString().split('T')[0] : '' }
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    结束日期
                  </label>
                  <DatePicker
                    value={filters.dateRange.endDate ? new Date(filters.dateRange.endDate) : undefined}
                    onChange={(date) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, endDate: date ? date.toISOString().split('T')[0] : '' }
                    }))}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </Card>

      {/* 请假记录列表 */}
      <Card>
        <ModernTable
          data={filteredLeaveRecords}
          loading={loading}
          columns={[
            {
              key: 'employee',
              title: '员工信息',
              render: (record: AttendanceException) => {
                const employee = employees.find(emp => emp.id === record.employeeId);
                return (
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-text-primary">
                        {employee?.name}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {employee?.employeeId} · {employee?.department}
                      </div>
                    </div>
                  </div>
                );
              }
            },
            {
              key: 'date',
              title: '请假日期',
              render: (record: AttendanceException) => (
                <div className="text-sm">
                  <div className="font-medium text-text-primary">
                    {new Date(record.date).toLocaleDateString()}
                  </div>
                  <div className="text-text-secondary">
                    {new Date(record.date).toLocaleDateString('zh-CN', { weekday: 'short' })}
                  </div>
                </div>
              )
            },
            {
              key: 'leaveType',
              title: '请假类型',
              render: (record: AttendanceException) => (
                <Badge 
                  variant={
                    record.leaveType === 'sick' ? 'danger' :
                    record.leaveType === 'personal' ? 'warning' :
                    record.leaveType === 'annual' ? 'success' : 'secondary'
                  }
                >
                  {getLeaveTypeLabel(record.leaveType || '')}
                </Badge>
              )
            },
            {
              key: 'duration',
              title: '请假时长',
              render: (record: AttendanceException) => (
                <div className="text-sm">
                  <div className="font-medium text-text-primary">
                    {getLeaveDurationText(record)}
                  </div>
                  {record.leaveStartTime && record.leaveEndTime && (
                    <div className="text-text-secondary">
                      {record.leaveStartTime} - {record.leaveEndTime}
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'reason',
              title: '请假原因',
              render: (record: AttendanceException) => (
                <div className="text-sm max-w-xs">
                  <div className="text-text-primary truncate">
                    {record.leaveReason}
                  </div>
                  {record.notes && (
                    <div className="text-text-secondary text-xs mt-1 truncate">
                      备注: {record.notes}
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'status',
              title: '状态',
              render: (record: AttendanceException) => (
                <StateChip
                  status="success" // TODO: 实际状态应该从数据中获取
                  text="已批准"
                  size="sm"
                />
              )
            },
            {
              key: 'actions',
              title: '操作',
              render: (record: AttendanceException) => (
                <div className="flex items-center gap-2">
                  <IconButton
                    icon={PencilIcon}
                    variant="ghost"
                    color="secondary"
                    size="sm"
                    tooltip="编辑请假记录"
                    onClick={() => handleEditLeave(record)}
                  />
                  <IconButton
                    icon={TrashIcon}
                    variant="ghost"
                    color="danger"
                    size="sm"
                    tooltip="删除请假记录"
                    onClick={() => handleDeleteLeave(record)}
                  />
                </div>
              )
            }
          ]}
          pagination={{
            current: 1,
            pageSize: 15,
            total: getFilteredLeaveRecords().length,
            onChange: (page: number, pageSize: number) => {
              // TODO: 实现分页逻辑
            }
          }}
          emptyState={<div className="text-center py-8 text-gray-500">暂无请假记录</div>}
        />
      </Card>
    </div>
  );
};
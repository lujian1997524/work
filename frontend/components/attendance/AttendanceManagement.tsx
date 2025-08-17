'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card,
  Button,
  TabBar,
  ModernTable,
  MonthSelector,
  Loading,
  useToast,
  IconButton,
  SearchBar
} from '@/components/ui';
import { 
  CalendarDaysIcon,
  UsersIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAttendanceStore } from '@/stores/attendanceStore';
import { 
  ATTENDANCE_STATUS_LABELS, 
  ATTENDANCE_STATUS_COLORS,
  type Employee,
  type AttendanceException
} from '@/types/attendance';
import { 
  EmployeeManagement,
  AttendanceStatistics,
  exportDailyAttendance
} from '@/components/attendance';
import { AttendanceGrid } from '@/components/ui/AttendanceGrid';
import { apiRequest } from '@/utils/apiConfig';

interface AttendanceManagementProps {
  className?: string;
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [serverToday, setServerToday] = useState<string>(''); // 后端服务器时间
  const toast = useToast();

  const {
    employees,
    attendanceExceptions,
    loading,
    fetchEmployees,
    fetchAttendanceExceptions,
    createAttendanceException,
    updateAttendanceException,
    deleteAttendanceException
  } = useAttendanceStore();

  // 初始化数据
  useEffect(() => {
    // 获取服务器当前日期
    const fetchServerDate = async () => {
      try {
        const response = await apiRequest('/api/attendance/server-time');
        const data = await response.json();
        setServerToday(data.date);
      } catch (error) {
        
        // 如果获取失败，使用本地时间作为后备
        setServerToday(new Date().toISOString().split('T')[0]);
      }
    };
    
    fetchServerDate();
    fetchEmployees();
  }, [selectedDate]);

  // 当服务器时间获取后，获取考勤数据
  useEffect(() => {
    if (serverToday) {
      // 获取完整月度数据，但只到今天为止
      const allMonthDates = getCurrentMonthDates();
      const monthStart = allMonthDates[0].toISOString().split('T')[0];
      const monthEnd = serverToday; // 数据获取只到今天
      
      fetchAttendanceExceptions({ 
        startDate: monthStart, 
        endDate: monthEnd 
      });
    }
  }, [serverToday, selectedDate]);

  // 过滤员工并按工号排序
  const filteredEmployees = employees
    .filter(employee =>
      employee && 
      employee.name && 
      employee.employeeId && 
      employee.department && (
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    .sort((a, b) => {
      // 按工号排序
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

  // Tab配置
  const tabs = [
    {
      id: 'daily',
      label: '今日考勤',
      icon: CalendarDaysIcon,
      count: employees.length
    },
    {
      id: 'employees',
      label: '员工管理',
      icon: UsersIcon,
      count: employees.filter(emp => emp.status === 'active').length
    },
    {
      id: 'statistics',
      label: '统计报表',
      icon: ChartBarIcon,
      count: 0
    }
  ];

  // 获取员工考勤状态
  const getEmployeeAttendanceStatus = (employeeId: number | undefined, date: string) => {
    if (!employeeId) return 'present';
    
    const exception = attendanceExceptions.find(
      exc => exc.employeeId === employeeId && exc.date === date
    );
    
    return exception ? exception.exceptionType : 'present';
  };

  // 获取员工考勤异常详情
  const getEmployeeAttendanceException = (employeeId: number | undefined, date: string) => {
    if (!employeeId) return null;
    
    return attendanceExceptions.find(
      exc => exc.employeeId === employeeId && exc.date === date
    ) || null;
  };

  // 快速标记考勤状态
  const quickMarkAttendance = async (employee: Employee, status: 'present' | 'leave' | 'absent' | 'overtime') => {
    if (!employee || !employee.id) {
      toast.addToast({
        type: 'error',
        message: '员工信息无效，无法操作'
      });
      return;
    }
    
    try {
      const existingException = attendanceExceptions.find(
        exc => exc.employeeId === employee.id && exc.date === selectedDate
      );

      if (status === 'present') {
        // 如果标记为正常出勤，删除异常记录
        if (existingException) {
          await deleteAttendanceException(existingException.id);
          toast.addToast({
            type: 'success',
            message: `${employee.name} 已标记为正常出勤`
          });
        }
      } else {
        // 创建或更新异常记录
        const exceptionData = {
          employeeId: employee.id,
          date: selectedDate,
          exceptionType: status,
          createdBy: 1, // 使用默认用户ID
          ...(status === 'leave' && {
            leaveType: 'personal' as const,
            leaveDurationType: 'full_day' as const,
            leaveHours: employee.dailyWorkHours
          }),
          ...(status === 'overtime' && {
            overtimeMinutes: 120, // 2小时 = 120分钟
            overtimeStartTime: '18:00',
            overtimeEndTime: '20:00',
            overtimeReason: '项目紧急任务'
          })
        };

        if (existingException) {
          await updateAttendanceException(existingException.id, exceptionData);
        } else {
          await createAttendanceException(exceptionData);
        }

        toast.addToast({
          type: 'success',
          message: `${employee.name} 已标记为${ATTENDANCE_STATUS_LABELS[status]}`
        });
      }

      // 刷新数据
      fetchAttendanceExceptions({ date: selectedDate });
    } catch (error) {
      toast.addToast({
        type: 'error',
        message: '操作失败，请重试'
      });
    }
  };

  // 获取当前月份的所有日期（显示完整月份）
  const getCurrentMonthDates = () => {
    const year = new Date(selectedDate).getFullYear();
    const month = new Date(selectedDate).getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 显示整个月的所有日期
    const dates = [];
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }
    return dates;
  };

  // 处理考勤状态变更
  const handleAttendanceChange = async (employeeId: number, date: string, newStatus: string, exceptionDataOrReason?: any) => {
    try {
      const employee = filteredEmployees.find(emp => emp.id === employeeId);
      if (!employee) {
        toast.addToast({
          type: 'error',
          message: '找不到对应的员工信息'
        });
        return;
      }

      // 从当前状态中查找现有记录，而不是依赖后端查询
      const existingException = attendanceExceptions.find(
        exc => exc.employeeId === employeeId && exc.date === date
      );

      if (newStatus === 'present') {
        // 正常出勤，删除异常记录
        if (existingException) {
          await deleteAttendanceException(existingException.id);
        }
      } else {
        // 异常状态，创建或更新记录
        let exceptionData: any = {
          employeeId: employeeId,
          date: date,
          exceptionType: newStatus,
          createdBy: 1 // 使用默认用户ID
        };

        // 如果传递的是详细数据对象，使用详细数据；否则使用默认值
        if (exceptionDataOrReason && typeof exceptionDataOrReason === 'object') {
          // 传递的是详细异常数据对象（从Modal来的）
          exceptionData = { ...exceptionData, ...exceptionDataOrReason };
        } else {
          // 传递的是简单字符串原因（从旧版接口来的）
          const reason = exceptionDataOrReason;
          if (newStatus === 'leave') {
            exceptionData = {
              ...exceptionData,
              leaveType: 'personal' as const,
              leaveReason: reason || '请假',
              leaveDurationType: 'full_day' as const,
              leaveHours: 8
            };
          } else if (newStatus === 'overtime') {
            exceptionData = {
              ...exceptionData,
              overtimeMinutes: 120,
              overtimeStartTime: '18:00',
              overtimeEndTime: '20:00',
              overtimeReason: reason || '加班'
            };
          } else if (newStatus === 'late') {
            exceptionData = {
              ...exceptionData,
              lateArrivalTime: '09:30',
              lateArrivalReason: reason || '迟到'
            };
          } else if (newStatus === 'early') {
            exceptionData = {
              ...exceptionData,
              earlyLeaveTime: '17:00',
              earlyLeaveReason: reason || '早退'
            };
          } else if (newStatus === 'absent') {
            exceptionData = {
              ...exceptionData,
              absentReason: reason || '缺勤'
            };
          }
        }

        let success = false;
        if (existingException) {
          success = await updateAttendanceException(existingException.id, exceptionData);
        } else {
          success = await createAttendanceException(exceptionData);
        }
        
        if (!success) {
          throw new Error('API操作失败');
        }
      }

      toast.addToast({
        type: 'success',
        message: `${employee.name} ${date} 考勤状态已更新`
      });

      // 立即刷新数据，确保数据同步
      const currentMonthDates = getCurrentMonthDates();
      const monthStart = currentMonthDates[0].toISOString().split('T')[0];
      const monthEnd = serverToday || new Date().toISOString().split('T')[0]; // 数据获取只到今天
      
      // 使用await确保数据加载完成
      await fetchAttendanceExceptions({ 
        startDate: monthStart, 
        endDate: monthEnd 
      });
      
    } catch (error) {
      
      toast.addToast({
        type: 'error',
        message: '更新失败，请重试'
      });
    }
  };

  const monthDates = getCurrentMonthDates();

  // 渲染月度出勤表
  const renderMonthlyAttendance = () => (
    <div className="space-y-6">
      {/* 月份选择器 */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-10 h-10 bg-ios18-blue rounded-xl flex items-center justify-center">
                <CalendarDaysIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-text-primary">考勤月份</h3>
                <p className="text-sm text-text-secondary">选择要查看的月份</p>
              </div>
            </div>
            <MonthSelector
              selectedDate={selectedDate}
              onChange={setSelectedDate}
              className="sm:ml-4"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="搜索员工..."
              className="w-full sm:w-64"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                try {
                  // 获取当日员工考勤异常数据
                  const exceptionsData = attendanceExceptions.filter(exc => 
                    exc.date === selectedDate
                  );
                  
                  // 使用美化的前端导出函数
                  await exportDailyAttendance(
                    employees, 
                    exceptionsData, 
                    selectedDate
                  );
                  
                  toast.addToast({
                    type: 'success',
                    message: '导出成功'
                  });
                } catch (error) {
                  console.error('导出失败:', error);
                  toast.addToast({
                    type: 'error',
                    message: '导出失败，请重试'
                  });
                }
              }}
              className="flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span className="hidden sm:inline">导出Excel</span>
              <span className="sm:hidden">导出</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 使用美观的AttendanceGrid组件 - 只有获取到服务器时间后才渲染 */}
      {serverToday ? (
        <AttendanceGrid
          employees={filteredEmployees}
          dates={monthDates}
          onStatusChange={(employeeId, date, status, exceptionData) => {
            handleAttendanceChange(employeeId, date, status, exceptionData);
          }}
          getStatus={(employeeId, date) => getEmployeeAttendanceStatus(employeeId, date)}
          getException={(employeeId, date) => getEmployeeAttendanceException(employeeId, date)}
          serverToday={serverToday} // 传递服务器时间
          className="animate-in slide-in-from-bottom-4 duration-500"
        />
      ) : (
        <Card className="p-12 text-center">
          <Loading text="正在获取服务器时间..." />
        </Card>
      )}

      {filteredEmployees.length === 0 && (
        <div className="p-12 text-center">
          <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无员工数据</h3>
          <p className="text-gray-500">请先添加员工信息</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <Loading text="加载考勤数据..." />;
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Tab导航 */}
      <TabBar
        tabs={tabs.map(tab => ({
          id: tab.id,
          label: tab.label,
          icon: React.createElement(tab.icon, { className: 'w-4 h-4' }),
          badge: tab.count > 0 ? tab.count : undefined,
          content: <div />
        }))}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
        className="border-b border-macos15-separator"
      />

      {/* Tab内容 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'daily' && renderMonthlyAttendance()}
          {activeTab === 'employees' && <EmployeeManagement />}
          {activeTab === 'statistics' && <AttendanceStatistics />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button, Badge, Loading } from '@/components/ui';
import { 
  ChartBarIcon,
  DocumentArrowDownIcon,
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAttendanceStore } from '@/stores/attendanceStore';

interface AttendanceStatisticsProps {
  className?: string;
}

interface StatsPeriod {
  year: number;
  month: number;
  label: string;
}

export const AttendanceStatistics: React.FC<AttendanceStatisticsProps> = ({
  className = ''
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    label: `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`
  });
  const [statsType, setStatsType] = useState<'monthly' | 'yearly'>('monthly');
  
  const { employees, monthlyStats, yearlyStats, statsLoading, generateMonthlyStats, generateYearlyStats, resetStats } = useAttendanceStore();

  // 当统计类型或选择期间变化时自动获取数据
  useEffect(() => {
    if (statsType === 'monthly') {
      generateMonthlyStats(selectedPeriod.year, selectedPeriod.month);
    } else {
      generateYearlyStats(selectedPeriod.year);
    }
  }, [statsType, selectedPeriod.year, selectedPeriod.month]);

  // 生成期间选项
  const generatePeriodOptions = (): StatsPeriod[] => {
    const options: StatsPeriod[] = [];
    const current = new Date();
    
    if (statsType === 'monthly') {
      // 月度统计：显示最近3年的所有月份（36个月）
      for (let i = 0; i < 36; i++) {
        const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
        options.push({
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          label: `${date.getFullYear()}年${date.getMonth() + 1}月`
        });
      }
    } else {
      // 年度统计：显示最近10年
      for (let i = 0; i < 10; i++) {
        const year = current.getFullYear() - i;
        options.push({
          year: year,
          month: 0,
          label: `${year}年`
        });
      }
    }
    return options;
  };

  const periodOptions = generatePeriodOptions();
  const currentStats = statsType === 'monthly' ? monthlyStats : yearlyStats;
  
  // 手动获取数据的函数
  const fetchData = () => {
    if (statsType === 'monthly') {
      generateMonthlyStats(selectedPeriod.year, selectedPeriod.month);
    } else {
      generateYearlyStats(selectedPeriod.year);
    }
  };

  // 格式化工时显示（更准确的天数+小时数计算）
  const formatWorkHours = (hours: number) => {
    if (hours === 0) return '0小时';
    
    const days = Math.floor(hours / 9); // 按9小时工作日计算完整天数
    const remainingHours = Math.round((hours % 9) * 10) / 10;
    
    if (days === 0) {
      return `${remainingHours}小时`;
    } else if (remainingHours === 0) {
      return `${days}天`;
    } else {
      return `${days}天${remainingHours}小时`;
    }
  };

  // 格式化详细工时显示（用于表格中的小字显示）
  const formatDetailedHours = (hours: number) => {
    return `共${Math.round(hours * 10) / 10}小时`;
  };
  
  // 计算整体统计
  const overallStats = {
    totalEmployees: currentStats.length,
    totalWorkHours: Math.round(currentStats.reduce((sum, stat) => sum + (stat?.totalWorkHours || 0), 0) * 10) / 10,
    totalLeaveHours: Math.round(currentStats.reduce((sum, stat) => sum + (stat?.totalLeaveHours || 0), 0) * 10) / 10,
    totalOvertimeHours: Math.round(currentStats.reduce((sum, stat) => sum + (stat?.totalOvertimeHours || 0), 0) * 10) / 10,
    avgAttendanceRate: currentStats.length > 0 ? 
      (currentStats.reduce((sum, stat) => sum + (stat?.attendanceRate || 0), 0) / currentStats.length).toFixed(1) : '0'
  };

  if (statsLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Loading type="spinner" size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* 控制栏 */}
      <motion.div 
        className="flex flex-col gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">统计类型:</label>
              <select 
              value={statsType}
              onChange={(e) => {
                const newType = e.target.value as 'monthly' | 'yearly';
                setStatsType(newType);
                if (newType === 'yearly') {
                  setSelectedPeriod({
                    year: new Date().getFullYear(),
                    month: 0,
                    label: `${new Date().getFullYear()}年`
                  });
                } else {
                  setSelectedPeriod({
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1,
                    label: `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`
                  });
                }
              }}
              className="flex-1 sm:flex-initial px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="monthly">月度统计</option>
              <option value="yearly">年度统计</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {statsType === 'monthly' ? '统计月份:' : '统计年份:'}
            </label>
            <select 
              value={statsType === 'monthly' ? `${selectedPeriod.year}-${selectedPeriod.month}` : selectedPeriod.year.toString()}
              onChange={(e) => {
                if (statsType === 'monthly') {
                  const [year, month] = e.target.value.split('-');
                  setSelectedPeriod({
                    year: parseInt(year),
                    month: parseInt(month),
                    label: `${year}年${month}月`
                  });
                } else {
                  const year = parseInt(e.target.value);
                  setSelectedPeriod({
                    year: year,
                    month: 0,
                    label: `${year}年`
                  });
                }
              }}
              className="flex-1 sm:flex-initial px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {periodOptions.map(period => (
                <option 
                  key={statsType === 'monthly' ? `${period.year}-${period.month}` : period.year.toString()}
                  value={statsType === 'monthly' ? `${period.year}-${period.month}` : period.year.toString()}
                >
                  {period.label}
                </option>
              ))}
            </select>
          </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            onClick={fetchData}
            disabled={statsLoading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {statsLoading ? '加载中...' : '刷新统计'}
          </Button>

          <Button
            onClick={() => {
              if (statsType === 'monthly') {
                // 调用store中的导出函数
                useAttendanceStore.getState().exportMonthlyReport(selectedPeriod.year, selectedPeriod.month, 'xlsx');
              } else {
                useAttendanceStore.getState().exportYearlyReport(selectedPeriod.year, 'xlsx');
              }
            }}
            disabled={currentStats.length === 0}
            variant="secondary"
            className="flex items-center justify-center gap-2 px-4 py-2"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            <span className="hidden sm:inline">导出Excel</span>
            <span className="sm:hidden">导出</span>
          </Button>
          
          <Button
            onClick={() => resetStats()}
            variant="outline"
            className="flex items-center justify-center gap-2 px-3 py-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span className="hidden sm:inline">重置</span>
          </Button>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { icon: UsersIcon, label: '员工总数', value: overallStats.totalEmployees, color: 'blue' },
          { icon: ClockIcon, label: '总工作时长', value: formatWorkHours(overallStats.totalWorkHours), color: 'green' },
          { icon: CalendarDaysIcon, label: '总请假时长', value: formatWorkHours(overallStats.totalLeaveHours), color: 'yellow' },
          { icon: ClockIcon, label: '总加班时长', value: formatWorkHours(overallStats.totalOvertimeHours), color: 'purple' },
          { icon: ChartBarIcon, label: '平均出勤率', value: `${overallStats.avgAttendanceRate}%`, color: 'indigo' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            className="bg-white rounded-xl p-3 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${stat.color}-600`} />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 员工统计表格 */}
      {currentStats.length > 0 ? (
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">员工统计详情</h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedPeriod.label} · 共 {currentStats.length} 名员工
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    员工信息
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    工作时长
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    请假时长
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    加班时长
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    出勤率
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {currentStats.map((stat, index) => (
                  <motion.tr 
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                  >
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-medium text-xs sm:text-sm">
                            {(stat.employee?.name || '未知')[0]}
                          </span>
                        </div>
                        <div className="ml-2 sm:ml-4 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {stat.employee?.name || '未知员工'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {stat.employee?.employeeId || ''} · {stat.employee?.department || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-center">
                      <div className="text-sm sm:text-lg font-semibold text-green-600">
                        {formatWorkHours(stat?.totalWorkHours || 0)}
                      </div>
                      <div className="text-xs text-gray-500 hidden sm:block">
                        {formatDetailedHours(stat?.totalWorkHours || 0)}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-center">
                      <div className="text-sm sm:text-lg font-semibold text-yellow-600">
                        {formatWorkHours(stat?.totalLeaveHours || 0)}
                      </div>
                      <div className="text-xs text-gray-500 hidden sm:block">
                        {formatDetailedHours(stat?.totalLeaveHours || 0)}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-center">
                      <div className="text-sm sm:text-lg font-semibold text-purple-600">
                        {formatWorkHours(stat?.totalOvertimeHours || 0)}
                      </div>
                      <div className="text-xs text-gray-500 hidden sm:block">
                        {formatDetailedHours(stat?.totalOvertimeHours || 0)}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <Badge 
                          variant={
                            (stat?.attendanceRate || 0) >= 95 ? 'success' : 
                            (stat?.attendanceRate || 0) >= 90 ? 'warning' : 'danger'
                          }
                          className="text-xs sm:text-sm font-medium"
                        >
                          {(stat?.attendanceRate || 0).toFixed(1)}%
                        </Badge>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <div className="text-lg font-medium text-gray-900 mb-2">暂无统计数据</div>
          <div className="text-sm text-gray-500 mb-6">
            数据正在自动加载中，或可点击"刷新统计"按钮重新获取数据
          </div>
          <Button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white">
            刷新统计数据
          </Button>
        </motion.div>
      )}
    </div>
  );
};
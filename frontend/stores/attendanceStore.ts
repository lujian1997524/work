import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  Employee, 
  AttendanceException, 
  DailyAttendanceSummary, 
  MonthlyAttendanceStats,
  AttendanceSettings 
} from '@/types/attendance';
import { apiRequest } from '@/utils/apiConfig';

interface AttendanceState {
  // 基础数据
  employees: Employee[];
  attendanceExceptions: AttendanceException[];
  attendanceSettings: AttendanceSettings | null;
  
  // 当前选中的日期和员工
  selectedDate: string;
  selectedEmployee: Employee | null;
  
  // 加载状态 - 分离不同操作的loading状态
  loading: boolean;              // 通用加载状态
  employeesLoading: boolean;     // 员工数据加载状态
  statsLoading: boolean;         // 统计数据加载状态
  saving: boolean;
  
  // UI状态
  showEmployeeModal: boolean;
  showExceptionModal: boolean;
  showStatsModal: boolean;
  exceptionModalType: 'leave' | 'absent' | 'overtime' | null;
  
  // 统计数据
  dailySummaries: DailyAttendanceSummary[];
  monthlyStats: MonthlyAttendanceStats[];
  yearlyStats: MonthlyAttendanceStats[]; // 复用MonthlyAttendanceStats结构，但表示年度汇总数据
  
  // Actions - 员工管理
  fetchEmployees: () => Promise<void>;
  createEmployee: (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateEmployee: (id: number, data: Partial<Employee>) => Promise<boolean>;
  deleteEmployee: (id: number) => Promise<boolean>;
  
  // Actions - 考勤异常管理
  fetchAttendanceExceptions: (params: { date?: string; startDate?: string; endDate?: string }) => Promise<void>;
  createAttendanceException: (data: Omit<AttendanceException, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateAttendanceException: (id: number, data: Partial<AttendanceException>) => Promise<boolean>;
  deleteAttendanceException: (id: number) => Promise<boolean>;
  
  // Actions - 统计数据
  generateDailySummary: (date: string) => Promise<void>;
  generateMonthlyStats: (year: number, month: number) => Promise<void>;
  generateYearlyStats: (year: number) => Promise<void>;
  exportMonthlyReport: (year: number, month: number, format: 'xlsx' | 'csv') => Promise<void>;
  exportYearlyReport: (year: number, format: 'xlsx' | 'csv') => Promise<void>;
  
  // Actions - 设置管理
  fetchAttendanceSettings: () => Promise<void>;
  updateAttendanceSettings: (data: Partial<AttendanceSettings>) => Promise<boolean>;
  
  // Actions - UI控制
  setSelectedDate: (date: string) => void;
  setSelectedEmployee: (employee: Employee | null) => void;
  setShowEmployeeModal: (show: boolean) => void;
  setShowExceptionModal: (show: boolean, type?: 'leave' | 'absent' | 'overtime') => void;
  setShowStatsModal: (show: boolean) => void;
  
  // 重置统计数据和加载状态
  resetStats: () => void;
  
  // Helper functions
  getEmployeeAttendanceStatus: (employeeId: number, date: string) => 'present' | 'leave' | 'absent' | 'overtime';
  calculateWorkHours: (employeeId: number, date: string) => {
    actualWorkHours: number;
    overtimeHours: number;
    leaveHours: number;
  };
}

// 获取认证token的辅助函数
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const useAttendanceStore = create<AttendanceState>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    employees: [],
    attendanceExceptions: [],
    attendanceSettings: null,
    selectedDate: new Date().toISOString().split('T')[0],
    selectedEmployee: null,
    loading: false,
    employeesLoading: false,
    statsLoading: false,
    saving: false,
    showEmployeeModal: false,
    showExceptionModal: false,
    showStatsModal: false,
    exceptionModalType: null,
    dailySummaries: [],
    monthlyStats: [],
    yearlyStats: [],

    // 员工管理 Actions
    fetchEmployees: async () => {
      set({ employeesLoading: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest('/api/employees', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        set({ employees: data.employees || [] });
      } catch (error) {
        // 获取员工列表失败
      } finally {
        set({ employeesLoading: false });
      }
    },

    createEmployee: async (employeeData) => {
      set({ saving: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest('/api/employees', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(employeeData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          // API错误详情
          throw new Error('创建员工失败');
        }

        const data = await response.json();
        set(state => ({
          employees: [...state.employees, data.employee]
        }));
        
        return true;
      } catch (error) {
        
        return false;
      } finally {
        set({ saving: false });
      }
    },

    updateEmployee: async (id, employeeData) => {
      set({ saving: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest(`/api/employees/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(employeeData)
        });

        if (!response.ok) {
          throw new Error('更新员工失败');
        }

        const data = await response.json();
        set(state => ({
          employees: state.employees.map(emp => 
            emp.id === id ? { ...emp, ...data.employee } : emp
          )
        }));
        
        return true;
      } catch (error) {
        
        return false;
      } finally {
        set({ saving: false });
      }
    },

    deleteEmployee: async (id) => {
      set({ saving: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest(`/api/employees/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('删除员工失败');
        }

        set(state => ({
          employees: state.employees.filter(emp => emp.id !== id)
        }));
        
        return true;
      } catch (error) {
        
        return false;
      } finally {
        set({ saving: false });
      }
    },

    // 考勤异常管理 Actions
    fetchAttendanceExceptions: async (params) => {
      set({ loading: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        // 构建查询参数，自动限制到今天为止
        const searchParams = new URLSearchParams();
        const today = new Date().toISOString().split('T')[0];
        
        if (params.date) {
          searchParams.append('date', params.date);
        }
        if (params.startDate) {
          searchParams.append('startDate', params.startDate);
        }
        if (params.endDate) {
          // 如果没有指定结束日期，或结束日期超过今天，限制为今天
          const endDate = params.endDate && params.endDate <= today ? params.endDate : today;
          searchParams.append('endDate', endDate);
        } else {
          // 如果没有指定结束日期，默认为今天
          searchParams.append('endDate', today);
        }

        const response = await apiRequest(`/api/attendance/exceptions?${searchParams.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('获取考勤记录失败');
        }

        const data = await response.json();
        set({ attendanceExceptions: data.exceptions || [] });
      } catch (error) {
        
      } finally {
        set({ loading: false });
      }
    },

    createAttendanceException: async (exceptionData) => {
      set({ saving: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest('/api/attendance/exceptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(exceptionData)
        });

        if (!response.ok) {
          const errorData = await response.text();
          
          throw new Error('添加考勤异常失败');
        }

        const data = await response.json();
        // 立即更新状态，确保 UI 同步
        set(state => ({
          attendanceExceptions: [...state.attendanceExceptions, data.exception]
        }));
        
        return true;
      } catch (error) {
        
        return false;
      } finally {
        set({ saving: false });
      }
    },

    updateAttendanceException: async (id, exceptionData) => {
      set({ saving: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest(`/api/attendance/exceptions/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(exceptionData)
        });

        if (!response.ok) {
          throw new Error('更新考勤异常失败');
        }

        const data = await response.json();
        // 立即更新状态，确保 UI 同步
        set(state => ({
          attendanceExceptions: state.attendanceExceptions.map(exc => 
            exc.id === id ? { ...exc, ...data.exception } : exc
          )
        }));
        
        return true;
      } catch (error) {
        
        return false;
      } finally {
        set({ saving: false });
      }
    },

    deleteAttendanceException: async (id) => {
      set({ saving: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest(`/api/attendance/exceptions/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('删除考勤异常失败');
        }

        // 立即更新状态，确保 UI 同步
        set(state => ({
          attendanceExceptions: state.attendanceExceptions.filter(exc => exc.id !== id)
        }));
        
        return true;
      } catch (error) {
        
        return false;
      } finally {
        set({ saving: false });
      }
    },

    // 统计数据 Actions
    generateDailySummary: async (date) => {
      set({ loading: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest(`/api/attendance/daily-summary?date=${date}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('生成日报失败');
        }

        const data = await response.json();
        set({ dailySummaries: data.summaries || [] });
      } catch (error) {
        
      } finally {
        set({ loading: false });
      }
    },

    generateMonthlyStats: async (year, month) => {
      const { statsLoading } = get();
      if (statsLoading) return; // 防止重复请求，使用专用的statsLoading
      
      set({ statsLoading: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest(`/api/attendance/summary?year=${year}&month=${month}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        set({ monthlyStats: data.summaries || [] });
      } catch (error) {
        
        set({ monthlyStats: [] }); // 清空数据避免显示错误信息
      } finally {
        set({ statsLoading: false });
      }
    },

    generateYearlyStats: async (year) => {
      const { statsLoading } = get();
      if (statsLoading) return; // 防止重复请求，使用专用的statsLoading
      
      set({ statsLoading: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        // 获取一年中每个月的统计数据，然后汇总
        const monthlyPromises = [];
        for (let month = 1; month <= 12; month++) {
          monthlyPromises.push(
            apiRequest(`/api/attendance/summary?year=${year}&month=${month}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }).then(res => res.ok ? res.json() : { summaries: [] }).catch(() => ({ summaries: [] }))
          );
        }

        const allMonthlyData = await Promise.all(monthlyPromises);
        
        // 按员工汇总年度数据
        const employeeYearlyMap = new Map();
        
        allMonthlyData.forEach(({ summaries = [] }, monthIndex) => {
          summaries.forEach((monthlyStat: any) => {
            const employeeId = monthlyStat.employeeId;
            
            if (!employeeYearlyMap.has(employeeId)) {
              employeeYearlyMap.set(employeeId, {
                employeeId: monthlyStat.employeeId,
                employee: monthlyStat.employee,
                year: year,
                month: 0, // 年度统计不需要月份
                workDays: 0,
                totalWorkHours: 0,
                totalLeaveHours: 0,
                totalOvertimeHours: 0,
                attendanceRate: 0,
                leaveBreakdown: {
                  sick: 0,
                  personal: 0,
                  annual: 0,
                  compensatory: 0
                }
              });
            }
            
            const yearlyData = employeeYearlyMap.get(employeeId);
            yearlyData.workDays += monthlyStat.workDays || 0;
            yearlyData.totalWorkHours += monthlyStat.totalWorkHours || 0;
            yearlyData.totalLeaveHours += monthlyStat.totalLeaveHours || 0;
            yearlyData.totalOvertimeHours += monthlyStat.totalOvertimeHours || 0;
            
            // 汇总请假类型
            if (monthlyStat.leaveBreakdown) {
              yearlyData.leaveBreakdown.sick += monthlyStat.leaveBreakdown.sick || 0;
              yearlyData.leaveBreakdown.personal += monthlyStat.leaveBreakdown.personal || 0;
              yearlyData.leaveBreakdown.annual += monthlyStat.leaveBreakdown.annual || 0;
              yearlyData.leaveBreakdown.compensatory += monthlyStat.leaveBreakdown.compensatory || 0;
            }
          });
        });

        // 计算年度出勤率并整理数据
        const yearlyStats = Array.from(employeeYearlyMap.values()).map(stat => {
          // 计算实际年度工作天数
          let actualYearlyDays;
          const today = new Date();
          const currentYear = today.getFullYear();
          
          if (year === currentYear) {
            // 当前年份：计算从年初到今天的天数
            const startOfYear = new Date(year, 0, 1);
            const daysPassed = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            actualYearlyDays = daysPassed;
          } else {
            // 过去年份：计算整年天数（简单直接的方法）
            const lastDayOfYear = new Date(year, 11, 31); // 12月31日
            const firstDayOfYear = new Date(year, 0, 1);   // 1月1日
            const daysInYear = Math.floor((lastDayOfYear.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            actualYearlyDays = daysInYear;
          }
          
          const standardYearlyHours = actualYearlyDays * 9;
          stat.attendanceRate = standardYearlyHours > 0 ? 
            Math.round((stat.totalWorkHours / standardYearlyHours) * 1000) / 10 : 100;
          
          // 四舍五入处理
          stat.totalWorkHours = Math.round(stat.totalWorkHours * 100) / 100;
          stat.totalLeaveHours = Math.round(stat.totalLeaveHours * 100) / 100;
          stat.totalOvertimeHours = Math.round(stat.totalOvertimeHours * 100) / 100;
          
          Object.keys(stat.leaveBreakdown).forEach(key => {
            stat.leaveBreakdown[key] = Math.round(stat.leaveBreakdown[key] * 100) / 100;
          });
          
          return stat;
        });

        set({ yearlyStats: yearlyStats });
      } catch (error) {
        
        set({ yearlyStats: [] }); // 清空数据避免显示错误信息
      } finally {
        set({ statsLoading: false });
      }
    },

    exportMonthlyReport: async (year, month, format) => {
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest(
          `/api/attendance/export?year=${year}&month=${month}&format=${format}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('导出报表失败');
        }

        // 处理文件下载
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `考勤报表_${year}年${month}月.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        
      }
    },

    exportYearlyReport: async (year, format) => {
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest(
          `/api/attendance/export?year=${year}&format=${format}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('导出年度报表失败');
        }

        // 处理文件下载
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `年度考勤报表_${year}年.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        
      }
    },

    // 设置管理 Actions  
    fetchAttendanceSettings: async () => {
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest('/api/attendance/settings', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('获取设置失败');
        }

        const data = await response.json();
        set({ attendanceSettings: data.settings });
      } catch (error) {
        
      }
    },

    updateAttendanceSettings: async (settingsData) => {
      set({ saving: true });
      try {
        const token = getAuthToken();
        if (!token) throw new Error('未找到认证令牌');

        const response = await apiRequest('/api/attendance/settings', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settingsData)
        });

        if (!response.ok) {
          throw new Error('更新设置失败');
        }

        const data = await response.json();
        set({ attendanceSettings: data.settings });
        
        return true;
      } catch (error) {
        
        return false;
      } finally {
        set({ saving: false });
      }
    },

    // UI控制 Actions
    setSelectedDate: (date) => set({ selectedDate: date }),
    setSelectedEmployee: (employee) => set({ selectedEmployee: employee }),
    setShowEmployeeModal: (show) => set({ showEmployeeModal: show }),
    setShowExceptionModal: (show, type: 'leave' | 'absent' | 'overtime' | null = null) => set({ 
      showExceptionModal: show, 
      exceptionModalType: type 
    }),
    setShowStatsModal: (show) => set({ showStatsModal: show }),

    // 重置统计数据和加载状态
    resetStats: () => set({ 
      statsLoading: false,  // 重置统计专用loading状态
      monthlyStats: [], 
      yearlyStats: [],
      dailySummaries: []
    }),

    // Helper functions
    getEmployeeAttendanceStatus: (employeeId, date) => {
      const { attendanceExceptions } = get();
      const exception = attendanceExceptions.find(
        exc => exc.employeeId === employeeId && exc.date === date
      );
      
      if (!exception) return 'present';
      
      switch (exception.exceptionType) {
        case 'leave': return 'leave';
        case 'absent': return 'absent';
        case 'overtime': return 'overtime';
        default: return 'present';
      }
    },

    calculateWorkHours: (employeeId, date) => {
      const { employees, attendanceExceptions, attendanceSettings } = get();
      const employee = employees.find(emp => emp.id === employeeId);
      const exception = attendanceExceptions.find(
        exc => exc.employeeId === employeeId && exc.date === date
      );
      
      const standardHours = employee?.dailyWorkHours || attendanceSettings?.standardWorkHoursPerDay || 8;
      
      if (!exception) {
        return {
          actualWorkHours: standardHours,
          overtimeHours: 0,
          leaveHours: 0
        };
      }
      
      switch (exception.exceptionType) {
        case 'leave':
          const leaveHours = exception.leaveHours || 0;
          return {
            actualWorkHours: Math.max(0, standardHours - leaveHours),
            overtimeHours: 0,
            leaveHours
          };
        case 'absent':
          return {
            actualWorkHours: 0,
            overtimeHours: 0,
            leaveHours: standardHours
          };
        case 'overtime':
          return {
            actualWorkHours: standardHours,
            overtimeHours: (exception.overtimeMinutes || 0) / 60, // 将分钟转换为小时
            leaveHours: 0
          };
        default:
          return {
            actualWorkHours: standardHours,
            overtimeHours: 0,
            leaveHours: 0
          };
      }
    }
  }))
);
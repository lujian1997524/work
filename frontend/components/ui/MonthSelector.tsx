'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { Button, Modal } from '@/components/ui';

interface MonthSelectorProps {
  selectedDate: string; // YYYY-MM-DD 格式
  onChange: (date: string) => void;
  className?: string;
}

interface QuickJumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  onJump: (date: string) => void;
}

// 快速跳转弹窗
const QuickJumpModal: React.FC<QuickJumpModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  onJump
}) => {
  const currentYear = new Date(currentDate).getFullYear();
  const currentMonth = new Date(currentDate).getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // 生成年份选项（当前年份前后5年）
  const yearOptions = [];
  for (let year = currentYear - 5; year <= currentYear + 2; year++) {
    yearOptions.push(year);
  }

  // 月份选项
  const monthOptions = [
    { value: 1, label: '1月' },
    { value: 2, label: '2月' },
    { value: 3, label: '3月' },
    { value: 4, label: '4月' },
    { value: 5, label: '5月' },
    { value: 6, label: '6月' },
    { value: 7, label: '7月' },
    { value: 8, label: '8月' },
    { value: 9, label: '9月' },
    { value: 10, label: '10月' },
    { value: 11, label: '11月' },
    { value: 12, label: '12月' },
  ];

  const handleJump = () => {
    // 生成新的日期字符串，保持为当月1号
    const newDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    onJump(newDate);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6 text-center">
          快速跳转到
        </h3>

        <div className="space-y-4">
          {/* 年份选择 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              年份
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ios18-blue focus:border-transparent bg-white"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
          </div>

          {/* 月份选择 */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              月份
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ios18-blue focus:border-transparent bg-white"
            >
              {monthOptions.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleJump}
            className="flex-1"
          >
            确定
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// 主月份选择器组件
export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedDate,
  onChange,
  className = ''
}) => {
  const [showQuickJump, setShowQuickJump] = useState(false);

  const currentDate = new Date(selectedDate);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // 计算上一个月
  const getPrevMonth = () => {
    const prevMonth = new Date(currentYear, currentMonth - 1, 1);
    return prevMonth;
  };

  // 计算下一个月
  const getNextMonth = () => {
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    return nextMonth;
  };

  // 格式化月份显示
  const formatMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
  };

  // 切换到指定月份
  const switchToMonth = (targetDate: Date) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const dateString = `${year}-${String(month).padStart(2, '0')}-01`;
    onChange(dateString);
  };

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // 如果焦点在输入框中，不处理快捷键
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          switchToMonth(getPrevMonth());
          break;
        case 'ArrowRight':
          e.preventDefault();
          switchToMonth(getNextMonth());
          break;
        case 'g':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowQuickJump(true);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate]);

  const prevMonth = getPrevMonth();
  const nextMonth = getNextMonth();

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* 快速跳转按钮 */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowQuickJump(true)}
          className="flex items-center gap-2 px-3 py-2"
        >
          <CalendarIcon className="w-4 h-4" />
          快速跳转
        </Button>

        {/* 月份切换区域 */}
        <div className="flex items-center bg-gray-50 rounded-lg p-1">
          {/* 上一个月 */}
          <button
            onClick={() => switchToMonth(prevMonth)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all duration-200"
            title={`切换到${formatMonth(prevMonth)}`}
          >
            <ChevronLeftIcon className="w-4 h-4" />
            {formatMonth(prevMonth)}
          </button>

          {/* 当前月份 */}
          <div className="px-4 py-2 bg-ios18-blue text-white rounded-md font-medium text-sm">
            {formatMonth(currentDate)}
          </div>

          {/* 下一个月 */}
          <button
            onClick={() => switchToMonth(nextMonth)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all duration-200"
            title={`切换到${formatMonth(nextMonth)}`}
          >
            {formatMonth(nextMonth)}
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 快速跳转弹窗 */}
      <QuickJumpModal
        isOpen={showQuickJump}
        onClose={() => setShowQuickJump(false)}
        currentDate={selectedDate}
        onJump={onChange}
      />
    </>
  );
};

export default MonthSelector;
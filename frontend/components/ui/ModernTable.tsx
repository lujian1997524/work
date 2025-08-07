'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  EllipsisHorizontalIcon,
  CheckIcon,
  Square2StackIcon
} from '@heroicons/react/24/outline';
import { Loading } from './Loading';

export interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, index: number) => React.ReactNode;
  className?: string;
}

export interface ModernTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  rowKey?: keyof T | ((record: T) => string | number);
  onRowClick?: (record: T, index: number) => void;
  selectable?: boolean;
  selectedRows?: (string | number)[];
  onSelectionChange?: (selectedRows: (string | number)[]) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  searchable?: boolean;
  density?: 'compact' | 'comfortable' | 'spacious';
  className?: string;
  emptyState?: React.ReactNode;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function ModernTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  rowKey,
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  pagination,
  searchable = false,
  density = 'comfortable',
  className = '',
  emptyState
}: ModernTableProps<T>) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowsState, setSelectedRowsState] = useState<Set<string | number>>(new Set(selectedRows));
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(columns.map(col => col.key as string)));
  
  // 密度样式配置
  const densityConfig = {
    compact: { padding: 'py-2 px-3', fontSize: 'text-xs', rowHeight: 'h-10' },
    comfortable: { padding: 'py-3 px-4', fontSize: 'text-sm', rowHeight: 'h-12' },
    spacious: { padding: 'py-4 px-6', fontSize: 'text-sm', rowHeight: 'h-16' }
  };

  const currentDensity = densityConfig[density];

  // 获取行key
  const getRowKey = (record: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    if (rowKey && record[rowKey] !== undefined) {
      return record[rowKey];
    }
    return index;
  };

  // 排序处理
  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    let newDirection: SortDirection = 'asc';
    if (sortState.column === columnKey) {
      newDirection = sortState.direction === 'asc' ? 'desc' : sortState.direction === 'desc' ? null : 'asc';
    }

    setSortState({ column: newDirection ? columnKey : null, direction: newDirection });
  };

  // 数据处理：搜索和排序
  const processedData = React.useMemo(() => {
    let result = [...data];

    // 搜索过滤
    if (searchQuery.trim()) {
      result = result.filter(record =>
        columns.some(column => {
          const value = record[column.key as keyof T];
          return String(value || '').toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // 排序
    if (sortState.column && sortState.direction) {
      result.sort((a, b) => {
        const aValue = a[sortState.column as keyof T];
        const bValue = b[sortState.column as keyof T];
        
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortState.direction === 'asc' ? -1 : 1;
        if (bValue == null) return sortState.direction === 'asc' ? 1 : -1;
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortState.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (sortState.direction === 'asc') {
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
        } else {
          return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
        }
      });
    }

    return result;
  }, [data, searchQuery, sortState, columns]);

  // 选择处理
  const handleSelectRow = (rowKey: string | number, checked: boolean) => {
    const newSelectedRows = new Set(selectedRowsState);
    
    if (checked) {
      newSelectedRows.add(rowKey);
    } else {
      newSelectedRows.delete(rowKey);
    }
    
    setSelectedRowsState(newSelectedRows);
    onSelectionChange?.(Array.from(newSelectedRows));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allRowKeys = processedData.map((record, index) => getRowKey(record, index));
      setSelectedRowsState(new Set(allRowKeys));
      onSelectionChange?.(allRowKeys);
    } else {
      setSelectedRowsState(new Set());
      onSelectionChange?.([]);
    }
  };

  // 渲染排序图标
  const renderSortIcon = (columnKey: string) => {
    if (sortState.column !== columnKey) {
      return <ChevronUpDownIcon className="w-3 h-3 text-gray-400" />;
    }
    
    return sortState.direction === 'asc' 
      ? <ChevronUpIcon className="w-3 h-3 text-blue-600" />
      : <ChevronDownIcon className="w-3 h-3 text-blue-600" />;
  };

  const filteredColumns = columns.filter(column => visibleColumns.has(column.key as string));
  const isAllSelected = processedData.length > 0 && processedData.every(record => 
    selectedRowsState.has(getRowKey(record, processedData.indexOf(record)))
  );
  const isPartialSelected = selectedRowsState.size > 0 && !isAllSelected;

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* 表格工具栏 */}
      {(searchable || selectable) && (
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* 搜索框 */}
              {searchable && (
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索数据..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
              )}

              {/* 批量操作提示 */}
              {selectable && selectedRowsState.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">已选择 {selectedRowsState.size} 项</span>
                </motion.div>
              )}
            </div>

            {/* 表格设置 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="列设置"
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 列设置面板 */}
          <AnimatePresence>
            {showColumnSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                <h4 className="text-sm font-medium text-gray-800 mb-2">显示列</h4>
                <div className="grid grid-cols-2 gap-2">
                  {columns.map(column => (
                    <label key={column.key as string} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(column.key as string)}
                        onChange={(e) => {
                          const newVisibleColumns = new Set(visibleColumns);
                          if (e.target.checked) {
                            newVisibleColumns.add(column.key as string);
                          } else {
                            newVisibleColumns.delete(column.key as string);
                          }
                          setVisibleColumns(newVisibleColumns);
                        }}
                        className="text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{column.title}</span>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 表格主体 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* 表头 */}
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 via-gray-50/80 to-gray-50/60 border-b border-gray-200">
              {/* 选择列 */}
              {selectable && (
                <th className={`${currentDensity.padding} text-left w-12`}>
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isPartialSelected;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </th>
              )}

              {/* 数据列 */}
              {filteredColumns.map((column) => (
                <th
                  key={column.key as string}
                  className={`${currentDensity.padding} ${currentDensity.fontSize} font-semibold text-gray-800 tracking-wide ${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-right' : 'text-left'
                  } ${column.sortable ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''} ${column.className || ''}`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key as string)}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <span className="flex-shrink-0">
                        {renderSortIcon(column.key as string)}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={filteredColumns.length + (selectable ? 1 : 0)} className="text-center py-12">
                  <Loading text="加载表格数据中..." />
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan={filteredColumns.length + (selectable ? 1 : 0)} className="text-center py-12">
                  {emptyState || (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Square2StackIcon className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-800">暂无数据</h3>
                        <p className="text-xs text-gray-500 mt-1">没有找到符合条件的记录</p>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              <AnimatePresence>
                {processedData.map((record, index) => {
                  const key = getRowKey(record, index);
                  const isSelected = selectedRowsState.has(key);
                  
                  return (
                    <motion.tr
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => onRowClick?.(record, index)}
                      className={`
                        border-b border-gray-100 transition-all duration-200 group
                        ${onRowClick ? 'cursor-pointer' : ''}
                        ${isSelected ? 'bg-blue-50/50 border-blue-200' : 'hover:bg-gray-50/50'}
                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}
                      `}
                    >
                      {/* 选择列 */}
                      {selectable && (
                        <td className={`${currentDensity.padding} w-12`}>
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectRow(key, e.target.checked);
                              }}
                              className="text-blue-600 rounded focus:ring-blue-500"
                            />
                          </div>
                        </td>
                      )}

                      {/* 数据列 */}
                      {filteredColumns.map((column) => {
                        const value = record[column.key as keyof T];
                        const cellContent = column.render 
                          ? column.render(value, record, index)
                          : String(value || '');

                        return (
                          <td
                            key={column.key as string}
                            className={`
                              ${currentDensity.padding} ${currentDensity.fontSize} text-gray-800
                              ${column.align === 'center' ? 'text-center' : 
                                column.align === 'right' ? 'text-right' : 'text-left'}
                              ${column.className || ''}
                            `}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页器 */}
      {pagination && (
        <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共 {pagination.total} 条记录，第 {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)} 页
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
                disabled={pagination.current <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <span className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">
                {pagination.current}
              </span>
              <button
                onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
                disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
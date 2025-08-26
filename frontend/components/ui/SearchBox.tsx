'use client'

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 搜索类型定义
export type SearchType = 'all' | 'projects' | 'workers' | 'drawings' | 'materials' | 'time';

// 搜索类型选项
const searchTypeOptions = [
  { value: 'all', label: '全部内容' },
  { value: 'projects', label: '项目' },
  { value: 'workers', label: '工人' },
  { value: 'drawings', label: '图纸' },
  { value: 'materials', label: '板材' },
  { value: 'time', label: '时间' }
];

// 搜索结果接口
export interface SearchResult {
  id: string;
  type: SearchType;
  title: string;
  subtitle?: string;
  description?: string;
}

// 组件属性接口
export interface SearchBoxProps {
  placeholder?: string;
  searchType?: SearchType;
  onSearchTypeChange?: (type: SearchType) => void;
  onSearch?: (query: string, type: SearchType) => void;
  onResultSelect?: (result: SearchResult) => void;
  results?: SearchResult[];
  loading?: boolean;
  className?: string;
  clearTrigger?: number; // 添加清空触发器
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder = "搜索...",
  searchType = 'all',
  onSearchTypeChange,
  onSearch,
  onResultSelect,
  results = [],
  loading = false,
  className = "",
  clearTrigger = 0
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SearchType>(searchType);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 处理类型选择
  const handleTypeSelect = (type: SearchType) => {
    setSelectedType(type);
    setIsOpen(false);
    onSearchTypeChange?.(type);
    // 如果有查询内容，重新搜索
    if (query.trim()) {
      onSearch?.(query, type);
    }
  };

  // 处理搜索输入
  const handleSearch = (value: string) => {
    setQuery(value);
    setHighlightedIndex(-1);
    
    if (value.trim().length >= 2) {
      onSearch?.(value, selectedType);
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          onResultSelect?.(results[highlightedIndex]);
          setShowResults(false);
          setQuery('');
          setHighlightedIndex(-1);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setHighlightedIndex(-1);
        setQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  // 监听清空触发器
  useEffect(() => {
    if (clearTrigger > 0) {
      setQuery('');
      setShowResults(false);
      setHighlightedIndex(-1);
    }
  }, [clearTrigger]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取当前选中类型的标签
  const selectedTypeLabel = searchTypeOptions.find(option => option.value === selectedType)?.label || '全部内容';

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        {/* 搜索类型下拉选择器 */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200 hover:bg-gray-100 transition-colors duration-200 min-w-[120px]"
          >
            <span className="truncate">{selectedTypeLabel}</span>
            <motion.svg
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="ml-2 w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>

          {/* 类型选择下拉菜单 */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2 mt-1"
              >
                {searchTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTypeSelect(option.value as SearchType)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                      selectedType === option.value
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 搜索输入框 */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim().length >= 2 && results.length > 0) {
                setShowResults(true);
              }
            }}
            placeholder={placeholder}
            className="w-full px-4 py-3 text-sm text-gray-700 bg-transparent outline-none placeholder-gray-400"
          />
          
          {/* 搜索图标 */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
              />
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* 搜索结果下拉列表 */}
      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2 mt-1 max-h-80 overflow-y-auto"
          >
            {results.map((result, index) => (
              <motion.button
                key={result.id}
                onClick={() => {
                  onResultSelect?.(result);
                  setShowResults(false);
                  setQuery('');
                }}
                className={`w-full text-left px-4 py-3 transition-colors duration-150 ${
                  index === highlightedIndex
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                whileHover={{ backgroundColor: index === highlightedIndex ? undefined : 'rgb(249 250 251)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-sm text-gray-500 truncate mt-1">{result.subtitle}</div>
                    )}
                    {result.description && (
                      <div className="text-xs text-gray-400 truncate mt-1">{result.description}</div>
                    )}
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {searchTypeOptions.find(opt => opt.value === result.type)?.label}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 无结果提示 */}
      <AnimatePresence>
        {showResults && results.length === 0 && query.trim().length >= 2 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-8 mt-1 text-center"
          >
            <svg className="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 text-sm">没有找到相关结果</p>
            <p className="text-gray-400 text-xs mt-1">试试其他关键词或搜索类型</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
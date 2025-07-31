'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { 
  MagnifyingGlassIcon,
  FolderIcon,
  UsersIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
export type SearchType = 'projects' | 'workers' | 'drawings' | 'thickness_specs' | 'all';

export interface SearchResult {
  id: string;
  type: SearchType;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  data: any; // 原始数据对象
}

interface GlobalSearchProps {
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

const searchTypeConfig = {
  all: { label: '全部', icon: '🔍' },
  projects: { label: '活跃项目', icon: '📁' },
  workers: { label: '工人', icon: '👷' },
  drawings: { label: '图纸', icon: '📋' },
  thickness_specs: { label: '厚度规格', icon: '📏' }
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onSelect,
  placeholder = "搜索项目、工人、图纸...",
  className = ""
}) => {
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 搜索防抖
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery, searchType);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchType]);

  // 执行搜索
  const performSearch = async (query: string, type: SearchType) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsSearching(false);
        return;
      }

      const response = await apiRequest(`/api/search?q=${encodeURIComponent(query)}&type=${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const results = formatSearchResults(data.results || []);
        setSearchResults(results);
        setShowResults(results.length > 0);
        setSelectedIndex(-1);
      } else {
        console.error('搜索失败:', response.statusText);
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('搜索错误:', error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // 格式化搜索结果
  const formatSearchResults = (results: any[]): SearchResult[] => {
    return results.map(item => {
      const config = searchTypeConfig[item.type as SearchType];
      return {
        id: `${item.type}-${item.id}`,
        type: item.type as SearchType,
        title: item.title || item.name || '未知',
        subtitle: item.subtitle,
        description: item.description,
        icon: config?.icon,
        data: item
      };
    });
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelectResult(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  // 选择搜索结果
  const handleSelectResult = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery('');
    setSelectedIndex(-1);
    onSelect?.(result);
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current && !resultsRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current && !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        {/* 搜索类型下拉选择器 */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-l-lg border-r border-gray-300 transition-colors"
          >
            <span className="mr-2">{searchTypeConfig[searchType].icon}</span>
            <span>{searchTypeConfig[searchType].label}</span>
            <svg 
              className={`ml-2 w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 下拉菜单 */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
              >
                {Object.entries(searchTypeConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSearchType(key as SearchType);
                      setShowDropdown(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                      searchType === key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    } ${key === 'all' ? 'rounded-t-lg' : ''} ${key === 'thickness_specs' ? 'rounded-b-lg' : ''}`}
                  >
                    <span className="mr-2">{config.icon}</span>
                    {config.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 搜索输入框 */}
        <div className="flex-1 relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowResults(true);
              }
            }}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-500 bg-transparent border-none outline-none"
          />

          {/* 搜索图标/加载状态 */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isSearching ? (
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* 搜索结果下拉框 */}
      <AnimatePresence>
        {showResults && searchResults.length > 0 && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-40 max-h-96 overflow-y-auto"
          >
            <div className="p-2">
              <div className="text-xs text-gray-500 font-medium px-2 py-1 border-b border-gray-100 mb-1">
                找到 {searchResults.length} 个结果
              </div>
              
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  className={`w-full flex items-start p-3 text-left rounded-lg transition-colors ${
                    index === selectedIndex 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0 mr-3 mt-0.5 text-lg">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {result.title}
                      </h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                        {searchTypeConfig[result.type].label}
                      </span>
                    </div>
                    {result.subtitle && (
                      <p className="text-xs text-gray-600 mb-1">{result.subtitle}</p>
                    )}
                    {result.description && (
                      <p className="text-xs text-gray-500 truncate">{result.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 无结果提示 */}
      <AnimatePresence>
        {showResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-40 p-4 text-center"
          >
            <div className="text-gray-500 text-sm">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>未找到相关结果</p>
              <p className="text-xs text-gray-400 mt-1">尝试使用其他关键词</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
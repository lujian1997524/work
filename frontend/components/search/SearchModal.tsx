'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Modal, Input, Badge, Loading, EmptySearch } from '@/components/ui';
import { apiRequest } from '@/utils/api';
import {
  MagnifyingGlassIcon,
  FolderIcon,
  UsersIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

// 搜索结果类型定义
interface SearchResultItem {
  id: number;
  name: string;
  category: string;
  type: string;
  meta?: string;
  description?: string;
  status?: string;
  department?: string;
  phone?: string;
  email?: string;
  assignedWorker?: string;
  projectIds?: number[];
  _score?: number;
}

interface SearchResults {
  [key: string]: {
    name: string;
    icon: React.ComponentType<any>;
    items: SearchResultItem[];
    count: number;
    weight: number;
  };
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (result: SearchResultItem) => void;
}

// 搜索分类配置
const SEARCH_CATEGORIES = {
  projects: { 
    name: '项目', 
    icon: FolderIcon, 
    weight: 10,
    color: 'text-blue-600'
  },
  workers: { 
    name: '工人', 
    icon: UsersIcon, 
    weight: 8,
    color: 'text-green-600'
  },
  departments: { 
    name: '部门', 
    icon: BuildingOfficeIcon, 
    weight: 6,
    color: 'text-purple-600'
  },
  drawings: { 
    name: '图纸', 
    icon: DocumentTextIcon, 
    weight: 4,
    color: 'text-orange-600'
  }
};

// 防抖Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchCache = useRef(new Map<string, SearchResults>());
  const abortController = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { token } = useAuth();
  const debouncedQuery = useDebounce(query, 300);

  // 扁平化结果用于键盘导航
  const flatResults = useMemo(() => {
    const flat: (SearchResultItem & { categoryKey: string })[] = [];
    Object.entries(results).forEach(([categoryKey, category]) => {
      category.items.forEach((item) => {
        flat.push({ ...item, categoryKey });
      });
    });
    return flat;
  }, [results]);

  // 执行搜索
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2 || !token) {
      setResults({});
      return;
    }

    // 检查缓存
    const cacheKey = searchQuery.toLowerCase();
    if (searchCache.current.has(cacheKey)) {
      setResults(searchCache.current.get(cacheKey)!);
      return;
    }

    // 取消之前的请求
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setLoading(true);
    try {
      const response = await apiRequest(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: abortController.current.signal
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 搜索API返回数据:', data); // 调试日志
        const formattedResults = formatSearchResults(data, searchQuery);
        console.log('🔍 格式化后的结果:', formattedResults); // 调试日志
        
        // 缓存结果
        searchCache.current.set(cacheKey, formattedResults);
        setResults(formattedResults);
      } else {
        console.error('搜索请求失败');
        setResults({});
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('搜索失败:', error);
        setResults({});
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 格式化搜索结果
  const formatSearchResults = (rawResults: any, searchQuery: string): SearchResults => {
    const formatted: SearchResults = {};
    
    Object.keys(SEARCH_CATEGORIES).forEach(categoryKey => {
      const categoryData = SEARCH_CATEGORIES[categoryKey as keyof typeof SEARCH_CATEGORIES];
      const items = rawResults[categoryKey] || [];
      
      if (items.length > 0) {
        // 计算相关性分数并排序
        const scoredItems = items
          .map((item: any) => ({
            ...item,
            category: categoryData.name,
            type: categoryKey,
            _score: calculateRelevanceScore(item, searchQuery, categoryKey)
          }))
          .filter((item: any) => item._score > 0)
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, 8); // 每类最多8个结果

        if (scoredItems.length > 0) {
          formatted[categoryKey] = {
            ...categoryData,
            items: scoredItems,
            count: scoredItems.length
          };
        }
      }
    });

    return formatted;
  };

  // 计算相关性分数
  const calculateRelevanceScore = (item: any, query: string, category: string): number => {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // 主要字段匹配
    const primaryField = item.name?.toLowerCase() || '';
    if (primaryField === queryLower) {
      score += 10;
    } else if (primaryField.startsWith(queryLower)) {
      score += 8;
    } else if (primaryField.includes(queryLower)) {
      score += 6;
    }
    
    // 次要字段匹配
    const secondaryFields = [
      item.department,
      item.assignedWorker,
      item.status,
      item.description,
      item.phone,
      item.email
    ].filter(Boolean);
    
    secondaryFields.forEach(field => {
      const fieldValue = field?.toLowerCase() || '';
      if (fieldValue.includes(queryLower)) {
        score += 2;
      }
    });
    
    // 根据分类权重调整
    score *= SEARCH_CATEGORIES[category as keyof typeof SEARCH_CATEGORIES].weight / 10;
    
    return score;
  };

  // 监听搜索查询变化
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults({});
      setSelectedIndex(-1);
    }
  }, [debouncedQuery, performSearch]);

  // 键盘导航
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < flatResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : flatResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, selectedIndex, flatResults, onClose]);

  // 监听键盘事件
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 模态框打开时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else if (!isOpen) {
      // 关闭时重置状态
      setQuery('');
      setResults({});
      setSelectedIndex(-1);
      if (abortController.current) {
        abortController.current.abort();
      }
    }
  }, [isOpen]);

  // 处理结果选择
  const handleSelect = (result: SearchResultItem) => {
    onNavigate(result);
    onClose();
  };

  // 获取结果项的元信息
  const getResultMeta = (item: SearchResultItem) => {
    switch (item.type) {
      case 'projects':
        return `${item.status === 'completed' ? '已完成' : item.status === 'in_progress' ? '进行中' : '待处理'} • ${item.assignedWorker || '未分配'}`;
      case 'workers':
        return `${item.department || '未分配部门'} • ${item.phone || '无联系方式'}`;
      case 'departments':
        return `${item.meta || '0'} 名工人`;
      case 'drawings':
        return `${item.description || '图纸文件'}`;
      default:
        return item.meta || '';
    }
  };

  // 获取结果项图标
  const getResultIcon = (item: SearchResultItem) => {
    switch (item.type) {
      case 'projects':
        return item.status === 'completed' ? ClockIcon : FolderIcon;
      case 'workers':
        return UsersIcon;
      case 'departments':
        return BuildingOfficeIcon;
      case 'drawings':
        return DocumentTextIcon;
      default:
        return FolderIcon;
    }
  };

  const totalCount = Object.values(results).reduce((sum, category) => sum + category.count, 0);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="lg"
      closable={false}
      className="search-modal"
    >
      <div className="p-6">
        {/* 搜索输入框 */}
        <div className="relative">
          <Input
            ref={inputRef}
            variant="glass"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索项目、工人、部门、图纸..."
            leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
            rightIcon={loading ? <Loading type="dots" size="sm" /> : null}
            className="text-lg py-4"
          />
          
          {/* 快捷键提示 */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 text-xs text-gray-400">
            {!loading && (
              <>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">↑↓</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">⏎</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">ESC</kbd>
              </>
            )}
          </div>
        </div>

        {/* 搜索结果区域 */}
        <div className="mt-6">
          {query.length > 0 && (
            <div className="mb-4 text-sm text-gray-500">
              {loading ? '搜索中...' : totalCount > 0 ? `找到 ${totalCount} 个结果` : ''}
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            <AnimatePresence>
              {Object.entries(results).map(([categoryKey, categoryData]) => (
                <motion.div
                  key={categoryKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 last:mb-0"
                >
                  {/* 分类标题 */}
                  <div className="flex items-center mb-3">
                    <categoryData.icon className={`w-4 h-4 mr-2 ${categoryData.color}`} />
                    <span className="font-medium text-gray-700">{categoryData.name}</span>
                    <Badge variant="secondary" size="sm" className="ml-2">
                      {categoryData.count}
                    </Badge>
                  </div>
                  
                  {/* 结果列表 */}
                  <div className="space-y-2">
                    {categoryData.items.map((item, index) => {
                      const globalIndex = flatResults.findIndex(f => f.id === item.id && f.categoryKey === categoryKey);
                      const isSelected = selectedIndex === globalIndex;
                      const ItemIcon = getResultIcon(item);
                      
                      return (
                        <motion.div
                          key={`${categoryKey}-${item.id}`}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-ios18-blue/10 border border-ios18-blue/20 shadow-sm' 
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                          onClick={() => handleSelect(item)}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <ItemIcon className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-ios18-blue' : 'text-gray-400'}`} />
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium truncate ${isSelected ? 'text-ios18-blue' : 'text-gray-900'}`}>
                                  {item.name}
                                </div>
                                <div className={`text-sm truncate ${isSelected ? 'text-ios18-blue/70' : 'text-gray-500'}`}>
                                  {getResultMeta(item)}
                                </div>
                              </div>
                            </div>
                            <Badge 
                              variant={isSelected ? 'primary' : 'secondary'} 
                              size="sm"
                            >
                              {item.category}
                            </Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 空状态 */}
          {totalCount === 0 && query.length > 0 && !loading && (
            <EmptySearch 
              title="未找到相关结果"
              description="尝试调整搜索关键词或查看其他内容"
              size="sm"
            />
          )}

          {/* 搜索提示 */}
          {query.length === 0 && (
            <div className="text-center py-8">
              <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-500 text-sm">
                <div className="mb-2">输入关键词开始搜索</div>
                <div className="text-xs text-gray-400">
                  支持搜索项目、工人、部门、图纸等内容
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
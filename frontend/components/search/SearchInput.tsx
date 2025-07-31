'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui';
import { apiRequest } from '@/utils/api';
interface SearchSuggestion {
  text: string;
  type: 'project' | 'worker' | 'drawing';
  icon: string;
  extra?: string;
}

interface SearchInputProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "搜索项目、工人、图纸...",
  onSearch,
  onSuggestionSelect,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();

  // 防抖搜索建议
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query.trim().length > 0) {
        fetchSuggestions(query.trim());
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  // 获取搜索建议
  const fetchSuggestions = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 1) return;

    try {
      setIsLoading(true);
      const response = await apiRequest(
        `/api/search/suggestions?q=${encodeURIComponent(searchTerm)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('获取搜索建议失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理搜索
  const handleSearch = (searchQuery?: string) => {
    const searchTerm = searchQuery || query;
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // 处理建议选择
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    } else {
      handleSearch(suggestion.text);
    }
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
        
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-tertiary">
          {isLoading ? (
            <Loading size="xs" />
          ) : (
            <span className="text-xl">🔍</span>
          )}
        </div>

        <button
          onClick={() => handleSearch()}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
        >
          搜索
        </button>
      </div>

      {/* 搜索建议 */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={`${suggestion.type}-${suggestion.text}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.1 }}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{suggestion.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">
                        {suggestion.text}
                      </div>
                      {suggestion.extra && (
                        <div className="text-sm text-text-secondary">
                          {suggestion.extra}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {suggestion.type === 'project' && '项目'}
                      {suggestion.type === 'worker' && '工人'}
                      {suggestion.type === 'drawing' && '图纸'}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 快捷键提示 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute right-0 -bottom-6 text-xs text-text-tertiary">
          ↑↓ 选择 • Enter 确认 • Esc 关闭
        </div>
      )}
    </div>
  );
};
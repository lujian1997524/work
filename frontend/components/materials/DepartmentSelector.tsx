'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import {
  ChevronDownIcon,
  PlusIcon,
  CheckIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface Department {
  id: number;
  name: string;
  workerCount?: number;
}

interface DepartmentSelectorProps {
  value: string;
  onChange: (value: string, departmentId?: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  value,
  onChange,
  placeholder = "选择或输入部门",
  className = "",
  disabled = false
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [loading, setLoading] = useState(false);
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const { token, user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';

  // 获取部门列表
  const fetchDepartments = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/workers/departments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      // 获取部门列表失败
    }
  };

  // 创建新部门
  const createDepartment = async (name: string) => {
    if (!token || !isAdmin) return null;
    
    try {
      setLoading(true);
      const response = await apiRequest('/api/workers/departments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        const newDepartment = data.department;
        
        // 更新部门列表
        setDepartments(prev => [...prev, newDepartment]);
        
        // 选择新创建的部门
        onChange(newDepartment.name, newDepartment.id);
        setSearchQuery(newDepartment.name);
        setIsOpen(false);
        setShowCreatePrompt(false);
        
        return newDepartment;
      }
    } catch (error) {
      // 创建部门失败
    } finally {
      setLoading(false);
    }
    return null;
  };

  // 处理输入变化
  const handleInputChange = (inputValue: string) => {
    setSearchQuery(inputValue);
    
    // 检查是否匹配现有部门
    const exactMatch = departments.find(dept => 
      dept.name.toLowerCase() === inputValue.toLowerCase()
    );
    
    if (exactMatch) {
      onChange(exactMatch.name, exactMatch.id);
      setShowCreatePrompt(false);
    } else if (inputValue.trim()) {
      onChange(inputValue, undefined);
      // 如果输入的部门不存在且用户是管理员，显示创建提示
      setShowCreatePrompt(isAdmin && inputValue.trim().length > 0);
    } else {
      onChange('', undefined);
      setShowCreatePrompt(false);
    }
  };

  // 处理部门选择
  const handleSelectDepartment = (department: Department) => {
    onChange(department.name, department.id);
    setSearchQuery(department.name);
    setIsOpen(false);
    setShowCreatePrompt(false);
  };

  // 处理快速创建
  const handleQuickCreate = async () => {
    if (searchQuery.trim()) {
      const newDept = await createDepartment(searchQuery.trim());
      if (!newDept) {
        // 创建失败，显示错误提示
        // 部门创建失败
      }
    }
  };

  // 过滤部门列表
  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 初始化
  useEffect(() => {
    fetchDepartments();
  }, [token]);

  // 同步外部value变化
  useEffect(() => {
    if (value !== searchQuery) {
      setSearchQuery(value);
    }
  }, [value]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
        >
          <ChevronDownIcon 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>
      </div>

      {/* 下拉选项 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {/* 搜索结果 */}
            {filteredDepartments.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
                  现有部门
                </div>
                {filteredDepartments.map((department) => (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => handleSelectDepartment(department)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{department.name}</span>
                      {department.workerCount !== undefined && (
                        <span className="text-xs text-gray-500">
                          {department.workerCount}人
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 快速创建提示 */}
            {showCreatePrompt && searchQuery.trim() && (
              <div className="border-t border-gray-100">
                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                  创建新部门
                </div>
                <button
                  type="button"
                  onClick={handleQuickCreate}
                  disabled={loading}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-2">
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <PlusIcon className="w-4 h-4" />
                    )}
                    <span>创建部门 "{searchQuery.trim()}"</span>
                  </div>
                </button>
              </div>
            )}

            {/* 无结果提示 */}
            {filteredDepartments.length === 0 && !showCreatePrompt && searchQuery.trim() && (
              <div className="px-3 py-6 text-center text-gray-500 text-sm">
                <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <div>未找到匹配的部门</div>
                {!isAdmin && (
                  <div className="text-xs text-gray-400 mt-1">
                    请联系管理员创建新部门
                  </div>
                )}
              </div>
            )}

            {/* 空状态 */}
            {departments.length === 0 && (
              <div className="px-3 py-6 text-center text-gray-500 text-sm">
                <div>暂无部门数据</div>
                {isAdmin && (
                  <div className="text-xs text-gray-400 mt-1">
                    开始创建第一个部门
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
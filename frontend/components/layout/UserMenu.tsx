'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ChevronUpIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface UserMenuProps {
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  onProfileClick,
  onSettingsClick,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // 计算菜单位置
  const calculateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 192; // w-48 = 12rem = 192px
      const menuHeight = 200; // 估计高度
      
      let left = rect.right + 8; // ml-2 = 8px
      let top = rect.bottom - menuHeight; // 从底部向上对齐
      
      // 确保菜单不会超出视窗
      if (left + menuWidth > window.innerWidth) {
        left = rect.left - menuWidth - 8;
      }
      
      if (top < 0) {
        top = rect.top;
      }
      
      setMenuPosition({ top, left });
    }
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      setIsOpen(false);
    }
  };

  const menuItems = [
    {
      icon: UserIcon,
      label: '个人信息',
      onClick: () => {
        onProfileClick?.();
        setIsOpen(false);
      }
    },
    {
      icon: CogIcon,
      label: '系统设置',
      onClick: () => {
        onSettingsClick?.();
        setIsOpen(false);
      }
    },
    {
      icon: ArrowRightOnRectangleIcon,
      label: '退出登录',
      onClick: handleLogout,
      className: 'text-red-600 hover:text-red-700 hover:bg-red-50'
    }
  ];

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* 用户头像按钮 */}
      <button
        ref={buttonRef}
        onClick={() => {
          if (!isOpen) {
            calculateMenuPosition();
          }
          setIsOpen(!isOpen);
        }}
        className={`
          w-12 h-12 rounded-lg bg-white/50 flex items-center justify-center group relative transition-all duration-200
          ${isOpen ? 'bg-ios18-blue/10 border border-ios18-blue/20' : 'hover:bg-gray-100'}
        `}
      >
        <div className="w-8 h-8 rounded-full bg-ios18-blue flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user?.name?.charAt(0)}
          </span>
        </div>
        
        {/* 展开指示器 */}
        <ChevronUpIcon 
          className={`
            absolute -top-1 -right-1 w-3 h-3 text-gray-400 transition-transform duration-200
            ${isOpen ? 'rotate-0' : 'rotate-180'}
          `}
        />
        
        {/* Tooltip */}
        {!isOpen && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
            {user?.name} ({user?.role === 'admin' ? '管理员' : '操作员'})
          </div>
        )}
      </button>

      {/* 用户菜单 - 使用Portal渲染到body避免被任何容器遮挡 */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="fixed w-48 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
              style={{ 
                top: menuPosition.top,
                left: menuPosition.left,
                backgroundColor: 'white',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                zIndex: 99999
              }}
            >
            {/* 用户信息头部 */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-ios18-blue flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    {user?.name}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    {user?.role === 'admin' && (
                      <ShieldCheckIcon className="w-3 h-3 mr-1" />
                    )}
                    {user?.role === 'admin' ? '管理员' : '操作员'}
                  </div>
                </div>
              </div>
            </div>

            {/* 菜单项 */}
            <div className="py-1">
              {menuItems.map((item, index) => {
                // 如果是管理员专用项目且用户不是管理员，跳过
                if (item.adminOnly && user?.role !== 'admin') {
                  return null;
                }

                const IconComponent = item.icon;
                
                return (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className={`
                      w-full flex items-center px-4 py-2 text-sm text-left transition-colors
                      ${item.className || 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}
                    `}
                  >
                    <IconComponent className="w-4 h-4 mr-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
};
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Alert } from '@/components/ui';
import { UserIcon } from '@heroicons/react/24/outline';

interface LoginModalProps {
  isOpen: boolean;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen }) => {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }

    setError('');
    const success = await login(username);
    if (!success) {
      setError('登录失败，请重试');
    }
    // 登录成功后模态框会自动关闭（通过isAuthenticated状态变化）
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setError('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
        >
          {/* 毛玻璃背景 */}
          <div className="absolute inset-0 backdrop-blur-md" />
          
          {/* 登录卡片 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative w-full max-w-md mx-4"
          >
            <div 
              className="rounded-2xl p-8 shadow-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              {/* 标题 */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  激光切割生产管理系统
                </h1>
                <p className="text-gray-600 text-sm">
                  请输入用户名登录系统
                </p>
              </div>

              {/* 登录表单 */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 用户名输入 */}
                <Input
                  label="用户名"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="请输入用户名"
                  leftIcon={<UserIcon className="w-5 h-5" />}
                  error={error}
                  autoFocus
                  required
                />

                {/* 登录按钮 */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!username || isLoading}
                  loading={isLoading}
                  className="w-full"
                >
                  {isLoading ? '登录中...' : '登录系统'}
                </Button>
              </form>

              {/* 底部信息 */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  激光切割生产管理系统 v1.0
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;
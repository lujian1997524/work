'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiRequest, isLocalStorageAvailable } from '@/utils/api';
import { detectBackendWithRetry, getBackendUrl } from '@/utils/envConfig';

// 定义用户类型
export interface User {
  id: number;
  name: string;
  role: 'admin' | 'operator';
}

// 定义认证上下文类型
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: 'admin' | 'operator') => boolean;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // 在静态生成时设置isLoading为false，避免生成loading状态的HTML
  const [isLoading, setIsLoading] = useState(false);

  // 登出函数（使用新的API工具）
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    
    // 安全清除localStorage
    if (isLocalStorageAvailable()) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    
    // 调用后端登出接口
    if (token) {
      apiRequest('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch(console.error);
    }
  }, [token]);

  // 验证token有效性（使用新的API工具）
  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await apiRequest('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`,
        },
      });

      if (!response.ok) {
        console.warn('Token验证失败，自动登出');
        logout();
      }
    } catch (error) {
      console.error('Token验证错误:', error);
      logout();
    }
  };

  // 从localStorage获取token（仅在客户端执行）
  useEffect(() => {
    // 只在客户端环境下执行认证检查
    if (typeof window === 'undefined') {
      return;
    }

    console.log('🔑 AuthContext 客户端初始化...');
    setIsLoading(true); // 客户端开始时设置loading

    const initAuth = async () => {
      try {
        // 在Electron环境下检测后端连接
        if ((window as any).ELECTRON_ENV) {
          console.log('🔍 Electron环境：开始检测后端连接...');
          try {
            const availableBackend = await Promise.race([
              detectBackendWithRetry(2), // 减少重试次数
              new Promise(resolve => setTimeout(() => resolve(null), 5000)) // 5秒超时
            ]);
            if (availableBackend) {
              console.log('✅ 后端检测成功:', availableBackend);
            } else {
              console.warn('⚠️ 后端检测失败或超时，将使用默认地址');
              // 设置默认后端地址
              (window as any).BACKEND_URL = getBackendUrl();
            }
          } catch (error) {
            console.warn('⚠️ 后端检测异常:', error);
            // 设置默认后端地址
            (window as any).BACKEND_URL = getBackendUrl();
          }
        }
        
        // 检查localStorage是否可用
        if (isLocalStorageAvailable()) {
          const storedToken = localStorage.getItem('auth_token');
          const storedUser = localStorage.getItem('auth_user');
          
          console.log('📦 存储的认证数据:', { hasToken: !!storedToken, hasUser: !!storedUser });
          
          if (storedToken && storedUser) {
            try {
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
              console.log('✅ 从存储恢复认证状态');
              // 验证token有效性（可能失败，但不影响加载状态）
              validateToken(storedToken).catch(() => {
                console.warn('⚠️ Token验证失败，但继续加载应用');
              });
            } catch (error) {
              console.error('解析存储的用户信息失败:', error);
              logout();
            }
          } else {
            console.log('❌ 没有找到存储的认证信息');
          }
        } else {
          console.warn('⚠️ localStorage 不可用，跳过认证恢复');
        }
      } catch (error) {
        console.error('❌ 访问localStorage失败:', error);
      } finally {
        // 无论如何都要结束loading状态
        setIsLoading(false);
        console.log('✅ AuthContext 初始化完成');
      }
    };

    // 添加超时保护，防止卡在loading状态
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ 认证初始化超时，强制结束loading状态');
      setIsLoading(false);
    }, 3000); // 缩短到3秒超时

    initAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
    };
  }, [logout]);

  // 登录函数（使用新的API工具）
  const login = async (username: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name: username }),
      });

      const data = await response.json();

      if (response.ok && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        
        // 存储到localStorage（检查可用性）
        if (isLocalStorageAvailable()) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
        }
        
        return true;
      } else {
        throw new Error(data.error || '登录失败');
      }
    } catch (error) {
      console.error('登录错误:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 检查用户角色
  const hasRole = (role: 'admin' | 'operator'): boolean => {
    if (!user) return false;
    if (role === 'operator') {
      return user.role === 'admin' || user.role === 'operator';
    }
    return user.role === role;
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 使用认证上下文的Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
};
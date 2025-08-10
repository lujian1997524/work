'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiRequest, isLocalStorageAvailable } from '@/utils/api';

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
  const [isLoading, setIsLoading] = useState(false);
  
  // 独立的认证状态，确保及时更新
  const isAuthenticated = !!user && !!token;

  // 登出函数
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
      }).catch(error => {
      });
    }
  }, [token]);

  // 验证token有效性
  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await apiRequest('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`,
        },
      });

      if (!response.ok) {
        logout();
      } else {
      }
    } catch (error: any) {
      logout();
    }
  };

  // 初始化认证状态
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsLoading(true);

    const initAuth = async () => {
      try {
        if (isLocalStorageAvailable()) {
          const storedToken = localStorage.getItem('auth_token');
          const storedUser = localStorage.getItem('auth_user');
          
          if (storedToken && storedUser) {
            try {
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
              
              // 验证token（但不阻塞应用加载）
              validateToken(storedToken).catch(() => {
                // 忽略验证失败
              });
            } catch (error) {
              logout();
            }
          }
        }
      } catch (error) {
        // 忽略初始化错误
      } finally {
        setIsLoading(false);
      }
    };

    // 设置超时机制，防止初始化卡死
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    initAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
    };
  }, [logout]);

  // 登录函数
  const login = async (username: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name: username }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        
        // 存储到localStorage
        if (isLocalStorageAvailable()) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user));
        }
        
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
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
    isAuthenticated,
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
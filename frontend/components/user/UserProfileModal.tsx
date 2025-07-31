'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Modal, Input, Button, Loading } from '@/components/ui';
import { apiRequest } from '@/utils/api';
import {
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  name: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || '',
    phone: '',
    email: '',
    department: '',
    position: ''
  });
  const [tempProfile, setTempProfile] = useState<UserProfile>(profile);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 获取用户详细信息
  const fetchUserProfile = async () => {
    if (!token || !user?.id) return;
    
    try {
      setLoading(true);
      const response = await apiRequest(`/api/users/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const userProfile = {
          name: data.user?.name || user.name || '',
          phone: data.user?.phone || '',
          email: data.user?.email || '',
          department: data.user?.department || '',
          position: data.user?.position || ''
        };
        setProfile(userProfile);
        setTempProfile(userProfile);
      } else {
        console.error('获取用户信息失败');
        // 使用基本用户信息作为备用
        const basicProfile = {
          name: user.name || '',
          phone: '',
          email: '',
          department: '',
          position: ''
        };
        setProfile(basicProfile);
        setTempProfile(basicProfile);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 使用基本用户信息作为备用
      const basicProfile = {
        name: user.name || '',
        phone: '',
        email: '',
        department: '',
        position: ''
      };
      setProfile(basicProfile);
      setTempProfile(basicProfile);
    } finally {
      setLoading(false);
    }
  };

  // 保存用户信息
  const handleSave = async () => {
    if (!token || !user?.id) return;

    // 验证必填字段
    if (!tempProfile.name.trim()) {
      setResult({
        success: false,
        message: '姓名不能为空'
      });
      return;
    }

    try {
      setSaving(true);
      setResult(null);
      
      const response = await apiRequest(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: tempProfile.name.trim(),
          phone: tempProfile.phone?.trim() || null,
          email: tempProfile.email?.trim() || null,
          department: tempProfile.department?.trim() || null,
          position: tempProfile.position?.trim() || null
        })
      });

      if (response.ok) {
        setProfile(tempProfile);
        setResult({
          success: true,
          message: '个人信息保存成功'
        });
        
        // 2秒后关闭模态框
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        setResult({
          success: false,
          message: `保存失败: ${errorData.message || '未知错误'}`
        });
      }
    } catch (error) {
      console.error('保存用户信息失败:', error);
      setResult({
        success: false,
        message: '保存失败，请重试'
      });
    } finally {
      setSaving(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    setTempProfile(profile);
    setResult(null);
  };

  // 当模态框打开时获取用户信息
  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="个人信息"
      size="md"
    >
      <div className="space-y-6">
        {/* 用户基本信息显示 */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 rounded-full bg-ios18-blue flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {user?.name?.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              {user?.role === 'admin' && (
                <ShieldCheckIcon className="w-4 h-4 mr-1" />
              )}
              <span>{user?.role === 'admin' ? '管理员' : '操作员'}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 姓名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="w-4 h-4 inline mr-1" />
                姓名 *
              </label>
              <Input
                type="text"
                value={tempProfile.name}
                onChange={(e) => setTempProfile({
                  ...tempProfile,
                  name: e.target.value
                })}
                placeholder="请输入姓名"
                required
              />
            </div>

            {/* 手机号码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PhoneIcon className="w-4 h-4 inline mr-1" />
                手机号码
              </label>
              <Input
                type="tel"
                value={tempProfile.phone || ''}
                onChange={(e) => setTempProfile({
                  ...tempProfile,
                  phone: e.target.value
                })}
                placeholder="请输入手机号码"
              />
            </div>

            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <EnvelopeIcon className="w-4 h-4 inline mr-1" />
                邮箱地址
              </label>
              <Input
                type="email"
                value={tempProfile.email || ''}
                onChange={(e) => setTempProfile({
                  ...tempProfile,
                  email: e.target.value
                })}
                placeholder="请输入邮箱地址"
              />
            </div>

            {/* 部门 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BuildingOfficeIcon className="w-4 h-4 inline mr-1" />
                所属部门
              </label>
              <Input
                type="text"
                value={tempProfile.department || ''}
                onChange={(e) => setTempProfile({
                  ...tempProfile,
                  department: e.target.value
                })}
                placeholder="请输入所属部门"
              />
            </div>

            {/* 职位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                职位
              </label>
              <Input
                type="text"
                value={tempProfile.position || ''}
                onChange={(e) => setTempProfile({
                  ...tempProfile,
                  position: e.target.value
                })}
                placeholder="请输入职位"
              />
            </div>
          </div>
        )}

        {/* 保存结果提示 */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg flex items-center space-x-2 ${
              result.success 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}
          >
            {result.success ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5" />
            )}
            <span className="text-sm">{result.message}</span>
          </motion.div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
        <Button
          variant="secondary"
          onClick={handleReset}
          disabled={loading || saving}
        >
          重置
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          disabled={loading || saving || !tempProfile.name.trim()}
        >
          保存
        </Button>
      </div>
    </Modal>
  );
};
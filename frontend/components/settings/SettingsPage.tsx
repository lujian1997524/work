'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Card, Modal } from '@/components/ui';
import { configManager, type AppConfig } from '@/utils/configManager';
import { audioManager, type SoundType } from '@/utils/audioManager';
import { useAuth } from '@/contexts/AuthContext';
import {
  CogIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  BellIcon
} from '@heroicons/react/24/outline';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [config, setConfig] = useState<AppConfig>(configManager.getConfig());
  const [tempConfig, setTempConfig] = useState<AppConfig>(config);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // 初始化时同步音频配置
  useEffect(() => {
    const audioConfig = audioManager.getConfig();
    const initialConfig = configManager.getConfig();
    
    // 同步音频配置
    setTempConfig({
      ...initialConfig,
      audio: {
        ...initialConfig.audio,
        enableSounds: audioConfig.enabled,
        notificationVolume: Math.round(audioConfig.volume * 100)
      }
    });
  }, [isOpen]);

  // 监听配置变化
  useEffect(() => {
    const unsubscribe = configManager.addListener((newConfig) => {
      setConfig(newConfig);
      setTempConfig(newConfig);
    });
    
    return unsubscribe;
  }, []);

  // 重置为当前配置
  const handleReset = () => {
    setTempConfig(config);
    setConnectionResult(null);
  };

  // 测试API连接
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    
    try {
      const result = await configManager.testConnection(tempConfig.apiUrl);
      setConnectionResult({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `连接错误: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!isAdmin) {
      alert('只有管理员可以修改系统配置');
      return;
    }

    setSaving(true);
    try {
      // 同步音频配置到 audioManager
      if (tempConfig.audio) {
        audioManager.setEnabled(tempConfig.audio.enableSounds);
        audioManager.setVolume((tempConfig.audio.notificationVolume || 70) / 100);
      }

      await configManager.updateConfig(tempConfig);
      setConnectionResult({
        success: true,
        message: '配置保存成功'
      });
      
      // 2秒后关闭模态框
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `保存失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认配置
  const handleResetToDefaults = async () => {
    if (!isAdmin) {
      alert('只有管理员可以重置配置');
      return;
    }

    if (!confirm('确定要重置为默认配置吗？此操作不可撤销。')) {
      return;
    }

    try {
      await configManager.resetToDefaults();
      setConnectionResult({
        success: true,
        message: '已重置为默认配置'
      });
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `重置失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="系统设置"
      size="3xl"
    >
      <div className="space-y-6">
        {/* API配置 */}
        <Card className="p-4">
          <div className="flex items-center mb-4">
            <WifiIcon className="w-5 h-5 mr-2 text-ios18-blue" />
            <h3 className="font-semibold text-gray-900">API配置</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                服务器地址
              </label>
              <div className="flex space-x-2">
                <Input
                  type="url"
                  value={tempConfig.apiUrl}
                  onChange={(e) => setTempConfig({
                    ...tempConfig,
                    apiUrl: e.target.value
                  })}
                  placeholder="http://localhost:35001"
                  className="flex-1"
                  disabled={!isAdmin}
                  readOnly={!isAdmin}
                />
                <Button
                  variant="secondary"
                  onClick={handleTestConnection}
                  loading={testingConnection}
                  disabled={!tempConfig.apiUrl || testingConnection}
                >
                  测试连接
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                请求超时 (毫秒)
              </label>
              <Input
                type="number"
                value={tempConfig.apiTimeout}
                onChange={(e) => setTempConfig({
                  ...tempConfig,
                  apiTimeout: parseInt(e.target.value) || 30000
                })}
                min="1000"
                max="120000"
                step="1000"
                disabled={!isAdmin}
                readOnly={!isAdmin}
              />
            </div>
          </div>
        </Card>

        {/* 功能开关 */}
        <Card className="p-4">
          <div className="flex items-center mb-4">
            <CogIcon className="w-5 h-5 mr-2 text-ios18-blue" />
            <h3 className="font-semibold text-gray-900">功能开关</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">通知功能</div>
                <div className="text-xs text-gray-500">启用系统通知提醒</div>
              </div>
              <input
                type="checkbox"
                checked={tempConfig.features.enableNotifications}
                onChange={(e) => setTempConfig({
                  ...tempConfig,
                  features: {
                    ...tempConfig.features,
                    enableNotifications: e.target.checked
                  }
                })}
                disabled={!isAdmin}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">实时更新</div>
                <div className="text-xs text-gray-500">启用SSE实时数据同步</div>
              </div>
              <input
                type="checkbox"
                checked={tempConfig.features.enableSSE}
                onChange={(e) => setTempConfig({
                  ...tempConfig,
                  features: {
                    ...tempConfig.features,
                    enableSSE: e.target.checked
                  }
                })}
                disabled={!isAdmin}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">离线模式</div>
                <div className="text-xs text-gray-500">支持离线操作</div>
              </div>
              <input
                type="checkbox"
                checked={tempConfig.features.enableOfflineMode}
                onChange={(e) => setTempConfig({
                  ...tempConfig,
                  features: {
                    ...tempConfig.features,
                    enableOfflineMode: e.target.checked
                  }
                })}
                disabled={!isAdmin}
                className="rounded"
              />
            </div>
          </div>
        </Card>

        {/* UI配置 */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">界面配置</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                侧边栏宽度 (px)
              </label>
              <Input
                type="number"
                value={tempConfig.ui.sidebarWidth}
                onChange={(e) => setTempConfig({
                  ...tempConfig,
                  ui: {
                    ...tempConfig.ui,
                    sidebarWidth: parseInt(e.target.value) || 220
                  }
                })}
                min="180"
                max="400"
                step="20"
                disabled={!isAdmin}
                readOnly={!isAdmin}
              />
            </div>
          </div>
        </Card>

        {/* 音频设置 */}
        <Card className="p-4">
          <div className="flex items-center mb-4">
            <SpeakerWaveIcon className="w-5 h-5 mr-2 text-ios18-blue" />
            <h3 className="font-semibold text-gray-900">音频设置</h3>
          </div>
          
          <div className="space-y-4">
            {/* 启用音效开关 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">启用系统音效</div>
                <div className="text-xs text-gray-500">状态变更时播放提示音</div>
              </div>
              <button
                onClick={() => {
                  if (!isAdmin) return;
                  const newEnabled = !audioManager.getConfig().enabled;
                  audioManager.setEnabled(newEnabled);
                  if (newEnabled) {
                    audioManager.testSound('info');
                  }
                  // 更新临时配置以反映实际状态
                  const audioConfig = audioManager.getConfig();
                  setTempConfig({
                    ...tempConfig,
                    audio: {
                      ...tempConfig.audio,
                      enableSounds: audioConfig.enabled
                    }
                  });
                }}
                disabled={!isAdmin}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  audioManager.getConfig().enabled ? 'bg-ios18-blue' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    audioManager.getConfig().enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 音量控制 */}
            <div className={`transition-opacity duration-200 ${audioManager.getConfig().enabled ? 'opacity-100' : 'opacity-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  通知音量
                </label>
                <span className="text-sm text-gray-500">{Math.round(audioManager.getConfig().volume * 100)}%</span>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioManager.getConfig().volume}
                  onChange={(e) => {
                    if (!isAdmin) return;
                    const newVolume = parseFloat(e.target.value);
                    audioManager.setVolume(newVolume);
                    // 更新临时配置
                    setTempConfig({
                      ...tempConfig,
                      audio: {
                        ...tempConfig.audio,
                        notificationVolume: Math.round(newVolume * 100)
                      }
                    });
                  }}
                  disabled={!isAdmin || !audioManager.getConfig().enabled}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => audioManager.testSound('info')}
                  disabled={!audioManager.getConfig().enabled}
                  className="whitespace-nowrap"
                >
                  测试音量
                </Button>
              </div>
            </div>

            {/* 音效测试区域 */}
            <div className={`transition-opacity duration-200 ${audioManager.getConfig().enabled ? 'opacity-100' : 'opacity-50'}`}>
              <h4 className="text-sm font-medium text-gray-700 mb-3">测试音效</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { type: 'info' as SoundType, label: '信息/创建', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                  { type: 'success' as SoundType, label: '进行中', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                  { type: 'wancheng' as SoundType, label: '已完成', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                  { type: 'error' as SoundType, label: '删除', color: 'bg-red-100 text-red-700 hover:bg-red-200' }
                ].map(({ type, label, color }) => (
                  <button
                    key={type}
                    onClick={() => audioManager.testSound(type)}
                    disabled={!audioManager.getConfig().enabled}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* 通知设置 */}
        <Card className="p-4">
          <div className="flex items-center mb-4">
            <BellIcon className="w-5 h-5 mr-2 text-ios18-blue" />
            <h3 className="font-semibold text-gray-900">通知设置</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">桌面通知</div>
                <div className="text-xs text-gray-500">
                  {typeof window !== 'undefined' && 'Notification' in window 
                    ? Notification.permission === 'granted' 
                      ? '已授权 - 可以显示桌面通知'
                      : Notification.permission === 'denied'
                      ? '已拒绝 - 请在浏览器设置中启用'
                      : '点击开关请求通知权限'
                    : '当前浏览器不支持通知'
                  }
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!isAdmin) return;
                  if (typeof window === 'undefined' || !('Notification' in window)) {
                    alert('当前浏览器不支持桌面通知');
                    return;
                  }
                  
                  const newEnabled = !tempConfig.notifications?.desktop;
                  
                  if (newEnabled && Notification.permission !== 'granted') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                      alert('通知权限被拒绝，无法启用桌面通知');
                      return;
                    }
                  }
                  
                  setTempConfig({
                    ...tempConfig,
                    notifications: {
                      ...tempConfig.notifications,
                      desktop: newEnabled
                    }
                  });
                }}
                disabled={!isAdmin}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  tempConfig.notifications?.desktop ? 'bg-ios18-blue' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    tempConfig.notifications?.desktop ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">声音通知</div>
                <div className="text-xs text-gray-500">通知时播放提示音（需配合音效设置）</div>
              </div>
              <button
                onClick={() => {
                  if (!isAdmin) return;
                  const newEnabled = !tempConfig.notifications?.sound;
                  setTempConfig({
                    ...tempConfig,
                    notifications: {
                      ...tempConfig.notifications,
                      sound: newEnabled
                    }
                  });
                }}
                disabled={!isAdmin}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  tempConfig.notifications?.sound ? 'bg-ios18-blue' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    tempConfig.notifications?.sound ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">显示预览</div>
                <div className="text-xs text-gray-500">通知中显示消息内容</div>
              </div>
              <button
                onClick={() => {
                  if (!isAdmin) return;
                  const newEnabled = !tempConfig.notifications?.showPreview;
                  setTempConfig({
                    ...tempConfig,
                    notifications: {
                      ...tempConfig.notifications,
                      showPreview: newEnabled
                    }
                  });
                }}
                disabled={!isAdmin}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  tempConfig.notifications?.showPreview ? 'bg-ios18-blue' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    tempConfig.notifications?.showPreview ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                通知位置
              </label>
              <select
                value={tempConfig.notifications?.position || 'top-right'}
                onChange={(e) => setTempConfig({
                  ...tempConfig,
                  notifications: {
                    ...tempConfig.notifications,
                    position: e.target.value as 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
                  }
                })}
                disabled={!isAdmin}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-ios18-blue focus:border-ios18-blue disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="top-right">右上角</option>
                <option value="top-left">左上角</option>
                <option value="bottom-right">右下角</option>
                <option value="bottom-left">左下角</option>
              </select>
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (typeof window === 'undefined' || !('Notification' in window)) {
                    alert('当前浏览器不支持桌面通知');
                    return;
                  }

                  // 检查权限
                  let permission = Notification.permission;
                  if (permission === 'default') {
                    permission = await Notification.requestPermission();
                  }

                  if (permission === 'granted') {
                    // 发送测试通知
                    const notification = new Notification('测试通知', {
                      body: tempConfig.notifications?.showPreview 
                        ? '这是一个测试通知消息，用于验证通知功能是否正常工作。' 
                        : '通知功能测试',
                      icon: '/favicon.ico',
                      badge: '/favicon.ico',
                      tag: 'test-notification',
                      requireInteraction: false,
                      silent: !tempConfig.notifications?.sound
                    });

                    // 播放通知音效（如果启用）
                    if (tempConfig.notifications?.sound && audioManager.getConfig().enabled) {
                      audioManager.testSound('info');
                    }

                    // 3秒后自动关闭
                    setTimeout(() => {
                      notification.close();
                    }, 3000);

                    // 点击事件处理
                    notification.onclick = () => {
                      window.focus();
                      notification.close();
                    };
                  } else {
                    alert('通知权限被拒绝。请在浏览器设置中启用通知权限，然后刷新页面重试。');
                  }
                }}
                className="w-full"
              >
                发送测试通知
              </Button>
            </div>
          </div>
        </Card>

        {/* 连接测试结果 */}
        {connectionResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg flex items-center space-x-2 ${
              connectionResult.success 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}
          >
            {connectionResult.success ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5" />
            )}
            <span className="text-sm">{connectionResult.message}</span>
          </motion.div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          {isAdmin && (
            <Button
              variant="secondary"
              onClick={handleResetToDefaults}
              className="text-red-600 hover:text-red-700"
            >
              重置默认
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={handleReset}
          >
            取消
          </Button>
          {isAdmin && (
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={saving}
            >
              保存配置
            </Button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>查看模式</strong>：您可以查看当前系统配置，但只有管理员可以修改设置。如需修改配置，请联系管理员。
          </p>
        </div>
      )}
    </Modal>
  );
};
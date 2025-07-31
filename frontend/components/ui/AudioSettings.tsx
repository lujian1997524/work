'use client';

import React, { useState, useEffect } from 'react';
import { audioManager, type SoundType } from '@/utils/audioManager';
import { motion } from 'framer-motion';

interface AudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({ isOpen, onClose }) => {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.6);
  const [isLoading, setIsLoading] = useState(false);

  // 初始化配置
  useEffect(() => {
    if (isOpen) {
      const config = audioManager.getConfig();
      setEnabled(config.enabled);
      setVolume(config.volume);
    }
  }, [isOpen]);

  // 切换音效开关
  const handleToggleEnabled = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    audioManager.setEnabled(newEnabled);

    if (newEnabled) {
      audioManager.testSound('info');
    }
  };

  // 调整音量
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    audioManager.setVolume(newVolume);
  };

  // 测试音效
  const handleTestSound = async (type: SoundType) => {
    setIsLoading(true);
    try {
      await audioManager.testSound(type);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">音效设置</h2>
                <p className="text-xs text-gray-500">通知提示音配置</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 设置内容 */}
        <div className="p-6 space-y-6">
          {/* 音效开关 */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium text-gray-900">启用音效</h3>
              <p className="text-sm text-gray-500">收到通知时播放提示音</p>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 音量控制 */}
          <div className={`transition-opacity duration-200 ${enabled ? 'opacity-100' : 'opacity-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-900">音量</h3>
              <span className="text-sm text-gray-500">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              disabled={!enabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* 音效测试 */}
          <div className={`transition-opacity duration-200 ${enabled ? 'opacity-100' : 'opacity-50'}`}>
            <h3 className="text-md font-medium text-gray-900 mb-3">测试音效</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'info' as SoundType, label: '信息/创建', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                { type: 'success' as SoundType, label: '进行中', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                { type: 'wancheng' as SoundType, label: '已完成', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                { type: 'error' as SoundType, label: '删除', color: 'bg-red-100 text-red-700 hover:bg-red-200' }
              ].map(({ type, label, color }) => (
                <button
                  key={type}
                  onClick={() => handleTestSound(type)}
                  disabled={!enabled || isLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072" />
                    </svg>
                    <span>{label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
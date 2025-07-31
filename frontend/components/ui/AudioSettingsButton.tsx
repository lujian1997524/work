'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioSettings } from './AudioSettings';
import { audioManager } from '@/utils/audioManager';

interface AudioSettingsButtonProps {
  className?: string;
}

export const AudioSettingsButton: React.FC<AudioSettingsButtonProps> = ({ 
  className = '' 
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  // 初始化音效状态
  React.useEffect(() => {
    const config = audioManager.getConfig();
    setIsEnabled(config.enabled);
  }, []);

  const handleToggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  const handleToggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    audioManager.setEnabled(newEnabled);
    
    if (newEnabled) {
      audioManager.testSound('info');
    }
  };

  return (
    <>
      {/* 音频设置按钮 - 固定在右下角 */}
      <div className={`fixed bottom-20 right-6 z-40 ${className}`}>
        <div className="flex flex-col items-end space-y-2">
          {/* 快速开关按钮 */}
          <motion.button
            onClick={handleToggleAudio}
            className={`p-3 rounded-full shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
              isEnabled 
                ? 'bg-blue-500/90 text-white hover:bg-blue-600/90' 
                : 'bg-gray-400/90 text-white hover:bg-gray-500/90'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isEnabled ? '点击关闭音效' : '点击开启音效'}
          >
            {isEnabled ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </motion.button>

          {/* 设置按钮 */}
          <motion.button
            onClick={handleToggleSettings}
            className="p-3 rounded-full bg-white/90 backdrop-blur-xl shadow-lg text-gray-700 hover:bg-white hover:text-gray-900 transition-all duration-200 hover:scale-105 active:scale-95"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="音效设置"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* 音频设置弹窗 */}
      <AnimatePresence>
        {isSettingsOpen && (
          <AudioSettings
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
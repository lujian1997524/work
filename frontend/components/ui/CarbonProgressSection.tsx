'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FireIcon } from '@heroicons/react/24/outline';

interface CarbonProgressData {
  total: number;
  completed: number;
  inProgress?: number;
  rate: number;
  byThickness?: Record<string, { total: number; completed: number; }>;
}

interface SpecialMaterialData {
  total: number;
  completed: number;
  rate: number;
}

interface CarbonProgressSectionProps {
  carbonData: CarbonProgressData;
  specialData?: SpecialMaterialData;
  title?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showSpecialMaterials?: boolean;
  className?: string;
}

export const CarbonProgressSection: React.FC<CarbonProgressSectionProps> = ({
  carbonData,
  specialData,
  title = "碳板进度",
  variant = 'default',
  showSpecialMaterials = true,
  className = ''
}) => {
  // 根据完成率确定进度条颜色
  const getProgressColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-blue-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 根据完成率确定背景颜色
  const getBackgroundColor = (rate: number) => {
    if (rate >= 90) return 'from-green-50 to-green-100 border-green-200';
    if (rate >= 70) return 'from-blue-50 to-blue-100 border-blue-200';
    if (rate >= 50) return 'from-yellow-50 to-yellow-100 border-yellow-200';
    return 'from-red-50 to-red-100 border-red-200';
  };

  // 根据完成率确定文字颜色
  const getTextColors = (rate: number) => {
    if (rate >= 90) return { primary: 'text-green-800', secondary: 'text-green-600', accent: 'text-green-700' };
    if (rate >= 70) return { primary: 'text-blue-800', secondary: 'text-blue-600', accent: 'text-blue-700' };
    if (rate >= 50) return { primary: 'text-yellow-800', secondary: 'text-yellow-600', accent: 'text-yellow-700' };
    return { primary: 'text-red-800', secondary: 'text-red-600', accent: 'text-red-700' };
  };

  const progressColor = getProgressColor(carbonData.rate);
  const backgroundClass = getBackgroundColor(carbonData.rate);
  const textColors = getTextColors(carbonData.rate);

  if (variant === 'compact') {
    return (
      <div className={`p-2 bg-gradient-to-r ${backgroundClass} rounded-lg border ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FireIcon className={`w-4 h-4 ${textColors.primary}`} />
            <span className={`text-sm font-medium ${textColors.primary}`}>碳板</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={`font-bold ${textColors.accent}`}>{carbonData.rate}%</span>
            <span className={textColors.secondary}>({carbonData.completed}/{carbonData.total})</span>
          </div>
        </div>
        <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5 mt-1">
          <motion.div 
            className={`${progressColor} h-1.5 rounded-full transition-all duration-500`}
            initial={{ width: 0 }}
            animate={{ width: `${carbonData.rate}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`p-4 bg-gradient-to-r ${backgroundClass} rounded-lg border ${className}`}>
        <div className={`text-sm font-semibold ${textColors.primary} mb-3 flex items-center`}>
          <FireIcon className={`w-4 h-4 mr-2 ${textColors.primary}`} />
          {title}
        </div>
        
        {/* 主要进度显示 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-3 text-sm">
              <span className={`text-xl font-bold ${textColors.accent}`}>{carbonData.rate}%</span>
              <span className={textColors.secondary}>({carbonData.completed}/{carbonData.total} 已完成)</span>
              {carbonData.inProgress && carbonData.inProgress > 0 && (
                <span className="text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full text-xs font-medium">
                  {carbonData.inProgress} 进行中
                </span>
              )}
            </div>
            <div className="w-full bg-white bg-opacity-60 rounded-full h-2 mt-2">
              <motion.div 
                className={`${progressColor} h-2 rounded-full transition-all duration-500`}
                initial={{ width: 0 }}
                animate={{ width: `${carbonData.rate}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
          {showSpecialMaterials && specialData && specialData.total > 0 && (
            <div className="ml-4 text-center">
              <div className="text-xs text-gray-600 mb-1">特殊材料</div>
              <div className="text-sm font-semibold text-orange-700">{specialData.rate}%</div>
              <div className="text-xs text-orange-600">({specialData.completed}/{specialData.total})</div>
            </div>
          )}
        </div>

        {/* 按厚度显示详细统计 */}
        {carbonData.byThickness && Object.keys(carbonData.byThickness).length > 0 && (
          <div className="space-y-2">
            <div className={`text-xs font-medium ${textColors.primary}`}>按厚度分布：</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(carbonData.byThickness).map(([thickness, data]) => {
                const thicknessRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                return (
                  <div key={thickness} className="bg-white bg-opacity-40 rounded p-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className={textColors.accent}>{thickness}mm</span>
                      <span className={textColors.secondary}>{thicknessRate}%</span>
                    </div>
                    <div className={`text-xs ${textColors.secondary} mt-1`}>
                      {data.completed}/{data.total}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`p-3 bg-gradient-to-r ${backgroundClass} rounded-lg border ${className}`}>
      <div className={`text-sm font-semibold ${textColors.primary} mb-2 flex items-center`}>
        <FireIcon className={`w-4 h-4 mr-2 ${textColors.primary}`} />
        {title}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 text-sm">
            <span className={`font-bold ${textColors.accent}`}>{carbonData.rate}%</span>
            <span className={textColors.secondary}>({carbonData.completed}/{carbonData.total})</span>
            {carbonData.inProgress && carbonData.inProgress > 0 && (
              <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded text-xs">
                {carbonData.inProgress}进行中
              </span>
            )}
          </div>
          <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5 mt-1">
            <motion.div 
              className={`${progressColor} h-1.5 rounded-full transition-all duration-500`}
              initial={{ width: 0 }}
              animate={{ width: `${carbonData.rate}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
        {showSpecialMaterials && specialData && specialData.total > 0 && (
          <div className="ml-3 text-xs text-gray-600">
            特殊: {specialData.rate}%
          </div>
        )}
      </div>
    </div>
  );
};
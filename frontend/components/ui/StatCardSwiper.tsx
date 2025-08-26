'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface StatData {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'indigo';
}

interface StatCardSwiperProps {
  stats: StatData[];
  className?: string;
}

// 移动端大尺寸统计卡片
const MobileStatCard: React.FC<{ stat: StatData; index: number }> = ({ stat, index }) => {
  const Icon = stat.icon;
  
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      iconBg: 'bg-white bg-opacity-20',
      iconText: 'text-white'
    },
    green: {
      bg: 'from-green-500 to-green-600', 
      iconBg: 'bg-white bg-opacity-20',
      iconText: 'text-white'
    },
    yellow: {
      bg: 'from-amber-500 to-orange-600',
      iconBg: 'bg-white bg-opacity-20', 
      iconText: 'text-white'
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      iconBg: 'bg-white bg-opacity-20',
      iconText: 'text-white'
    },
    indigo: {
      bg: 'from-indigo-500 to-indigo-600',
      iconBg: 'bg-white bg-opacity-20',
      iconText: 'text-white'
    }
  };
  
  const colors = colorClasses[stat.color];
  
  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors.bg} p-6 shadow-lg`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* 装饰性背景图案 */}
      <div className="absolute inset-0 bg-white bg-opacity-5">
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white bg-opacity-10"></div>
        <div className="absolute top-1/2 -left-4 w-16 h-16 rounded-full bg-white bg-opacity-5"></div>
      </div>
      
      <div className="relative z-10">
        {/* 图标 */}
        <div className={`w-16 h-16 ${colors.iconBg} rounded-2xl flex items-center justify-center mb-4`}>
          <Icon className={`w-8 h-8 ${colors.iconText}`} />
        </div>
        
        {/* 数值 */}
        <div className="text-3xl font-bold text-white mb-2">
          {stat.value}
        </div>
        
        {/* 标签 */}
        <div className="text-white/80 text-sm font-medium">
          {stat.label}
        </div>
      </div>
    </motion.div>
  );
};

// 简单的轮播实现（不依赖外部库）
export const StatCardSwiper: React.FC<StatCardSwiperProps> = ({ stats, className = '' }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [touchStart, setTouchStart] = React.useState(0);
  const [touchEnd, setTouchEnd] = React.useState(0);
  
  // 处理触摸滑动
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && currentIndex < stats.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  // 自动轮播
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === stats.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // 5秒自动切换
    
    return () => clearInterval(interval);
  }, [stats.length]);
  
  return (
    <div className={`lg:hidden ${className}`}>
      {/* 卡片容器 */}
      <div 
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <motion.div
          className="flex"
          animate={{ x: -currentIndex * 100 + '%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {stats.map((stat, index) => (
            <div key={stat.label} className="w-full flex-shrink-0 px-4">
              <MobileStatCard stat={stat} index={index} />
            </div>
          ))}
        </motion.div>
      </div>
      
      {/* 指示器 */}
      <div className="flex justify-center mt-4 space-x-2">
        {stats.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
            }`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
      
      {/* 滑动提示 */}
      <div className="text-center text-sm text-gray-500 mt-2">
        滑动查看更多统计
      </div>
    </div>
  );
};

// 桌面端紧凑网格卡片
const DesktopStatCard: React.FC<{ stat: StatData; index: number }> = ({ stat, index }) => {
  const Icon = stat.icon;
  
  return (
    <motion.div
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${stat.color}-600`} />
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{stat.value}</div>
          <div className="text-xs text-gray-500">{stat.label}</div>
        </div>
      </div>
    </motion.div>
  );
};

// 桌面端网格布局
export const StatCardGrid: React.FC<StatCardSwiperProps> = ({ stats, className = '' }) => {
  return (
    <div className={`hidden lg:grid grid-cols-2 xl:grid-cols-5 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <DesktopStatCard key={stat.label} stat={stat} index={index} />
      ))}
    </div>
  );
};

// 统一的统计卡片组件
export const ResponsiveStatCards: React.FC<StatCardSwiperProps> = ({ stats, className = '' }) => {
  return (
    <div className={className}>
      <StatCardSwiper stats={stats} />
      <StatCardGrid stats={stats} />
    </div>
  );
};
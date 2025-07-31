'use client';

import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  mobileClassName = '',
  tabletClassName = '',
  desktopClassName = ''
}) => {
  const { device } = useResponsive();

  const getDeviceClassName = () => {
    switch (device) {
      case 'mobile':
        return mobileClassName;
      case 'tablet':
        return tabletClassName;
      case 'desktop':
        return desktopClassName;
      default:
        return '';
    }
  };

  return (
    <div className={`${className} ${getDeviceClassName()}`}>
      {children}
    </div>
  );
};

interface AdaptiveLayoutProps {
  children: ReactNode;
  direction?: 'row' | 'column';
  mobileDirection?: 'row' | 'column';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AdaptiveLayout: React.FC<AdaptiveLayoutProps> = ({
  children,
  direction = 'row',
  mobileDirection = 'column',
  gap = 'md',
  className = ''
}) => {
  const { isMobile } = useResponsive();
  
  const flexDirection = isMobile ? mobileDirection : direction;
  const gapClass = {
    sm: 'gap-2',
    md: 'gap-4', 
    lg: 'gap-6'
  }[gap];

  return (
    <div className={`flex flex-${flexDirection} ${gapClass} ${className}`}>
      {children}
    </div>
  );
};

interface ResponsiveGridProps {
  children: ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className = ''
}) => {
  const gapClass = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }[gap];

  const gridCols = `grid-cols-${columns.mobile} md:grid-cols-${columns.tablet} lg:grid-cols-${columns.desktop}`;

  return (
    <div className={`grid ${gridCols} ${gapClass} ${className}`}>
      {children}
    </div>
  );
};

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  position?: 'left' | 'right' | 'bottom';
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  children,
  title,
  position = 'left'
}) => {
  const slideVariants = {
    left: {
      closed: { x: '-100%' },
      open: { x: 0 }
    },
    right: {
      closed: { x: '100%' },
      open: { x: 0 }
    },
    bottom: {
      closed: { y: '100%' },
      open: { y: 0 }
    }
  };

  const drawerPositionClass = {
    left: 'left-0 top-0 h-full w-80 max-w-[85vw]',
    right: 'right-0 top-0 h-full w-80 max-w-[85vw]',
    bottom: 'bottom-0 left-0 right-0 h-auto max-h-[85vh]'
  }[position];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* 抽屉内容 */}
          <motion.div
            className={`fixed z-50 bg-white/95 backdrop-blur-xl shadow-2xl ${drawerPositionClass}`}
            initial={slideVariants[position].closed}
            animate={slideVariants[position].open}
            exit={slideVariants[position].closed}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {title && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  height?: 'half' | 'full' | 'auto';
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto'
}) => {
  const heightClass = {
    half: 'h-1/2',
    full: 'h-full',
    auto: 'h-auto max-h-[90vh]'
  }[height];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl rounded-t-2xl shadow-2xl ${heightClass}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* 拖拽指示器 */}
            <div className="flex justify-center p-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            {title && (
              <div className="flex items-center justify-between px-4 pb-2">
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            <div className="overflow-y-auto flex-1 px-4 pb-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
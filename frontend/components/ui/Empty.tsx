import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

// 定义空状态图像类型
type EmptyImageType = 'noData' | 'noResults' | 'noFiles' | 'network' | 'loading';

// 预设的空状态图像组件
const EmptyImage: React.FC<{ type: EmptyImageType; className?: string }> = ({ type, className = "w-32 h-32" }) => {
  const getImage = () => {
    switch (type) {
      case 'noData':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        );
      case 'noResults':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'noFiles':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'network':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'loading':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        );
    }
  };

  return (
    <div className="flex justify-center text-gray-300">
      {getImage()}
    </div>
  );
};

export interface EmptyProps {
  image?: EmptyImageType;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  className?: string;
}

export const Empty: React.FC<EmptyProps> = ({
  image = 'noData',
  title = '暂无数据',
  description,
  size = 'md',
  children,
  className = ''
}) => {
  const sizeConfig = {
    sm: {
      container: 'py-8',
      title: 'text-base',
      description: 'text-sm',
      image: 'w-16 h-16'
    },
    md: {
      container: 'py-12',
      title: 'text-lg',
      description: 'text-sm',
      image: 'w-24 h-24'
    },
    lg: {
      container: 'py-16',
      title: 'text-xl',
      description: 'text-base',
      image: 'w-32 h-32'
    }
  };

  const config = sizeConfig[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`text-center ${config.container} ${className}`}
    >
      <EmptyImage type={image} className={config.image} />
      
      <h3 className={`font-medium text-gray-900 mt-4 ${config.title}`}>
        {title}
      </h3>
      
      {description && (
        <p className={`text-gray-500 mt-2 ${config.description}`}>
          {description}
        </p>
      )}
      
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </motion.div>
  );
};

// 预设的空状态组件
export const EmptyData: React.FC<Omit<EmptyProps, 'image'>> = (props) => (
  <Empty image="noData" {...props} />
);

export const EmptySearch: React.FC<Omit<EmptyProps, 'image'>> = (props) => (
  <Empty 
    image="noResults" 
    title="未找到相关内容"
    description="尝试调整搜索条件或使用其他关键词"
    {...props} 
  />
);

export const EmptyFiles: React.FC<Omit<EmptyProps, 'image'>> = (props) => (
  <Empty 
    image="noFiles" 
    title="暂无文件"
    description="还没有上传任何文件"
    {...props} 
  />
);

export const EmptyNotifications: React.FC<Omit<EmptyProps, 'image'>> = (props) => (
  <Empty 
    image="noData" 
    title="暂无通知"
    description="暂时没有新的通知消息"
    {...props} 
  />
);
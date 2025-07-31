'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface LoadingProps {
  type?: 'spinner' | 'dots' | 'pulse' | 'bars' | 'ring' | 'wave'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white' | 'gray'
  text?: string
  overlay?: boolean
  className?: string
}

export const Loading: React.FC<LoadingProps> = ({
  type = 'spinner',
  size = 'md',
  color = 'primary',
  text,
  overlay = false,
  className = ''
}) => {
  const sizeClasses = {
    xs: { loader: 'w-4 h-4', text: 'text-xs' },
    sm: { loader: 'w-5 h-5', text: 'text-sm' },
    md: { loader: 'w-6 h-6', text: 'text-base' },
    lg: { loader: 'w-8 h-8', text: 'text-lg' },
    xl: { loader: 'w-12 h-12', text: 'text-xl' }
  }

  const colorClasses = {
    primary: 'text-ios18-blue border-ios18-blue',
    secondary: 'text-gray-600 border-gray-600',
    white: 'text-white border-white',
    gray: 'text-gray-400 border-gray-400'
  }

  // 旋转加载器
  const SpinnerLoader = () => (
    <motion.div
      className={`${sizeClasses[size].loader} border-2 border-t-transparent rounded-full ${colorClasses[color]}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  )

  // 点状加载器
  const DotsLoader = () => (
    <div className={`flex space-x-1 ${sizeClasses[size].loader}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`w-2 h-2 rounded-full ${colorClasses[color].split(' ')[0]} bg-current`}
          animate={{
            y: [-4, 4, -4],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15
          }}
        />
      ))}
    </div>
  )

  // 脉冲加载器
  const PulseLoader = () => (
    <motion.div
      className={`${sizeClasses[size].loader} rounded-full ${colorClasses[color].split(' ')[0]} bg-current`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  )

  // 条状加载器
  const BarsLoader = () => (
    <div className={`flex items-end space-x-1 ${sizeClasses[size].loader}`}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className={`w-1 bg-current ${colorClasses[color].split(' ')[0]}`}
          animate={{
            height: ['40%', '100%', '40%']
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.1
          }}
        />
      ))}
    </div>
  )

  // 环形加载器
  const RingLoader = () => (
    <div className={`relative ${sizeClasses[size].loader}`}>
      <motion.div
        className={`absolute inset-0 border-2 border-t-transparent rounded-full ${colorClasses[color]}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className={`absolute inset-1 border-2 border-b-transparent rounded-full ${colorClasses[color]} opacity-60`}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  )

  // 波浪加载器
  const WaveLoader = () => (
    <div className={`flex items-center space-x-1 ${sizeClasses[size].loader}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className={`w-1 h-4 bg-current ${colorClasses[color].split(' ')[0]}`}
          animate={{
            scaleY: [1, 0.3, 1]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1
          }}
        />
      ))}
    </div>
  )

  // 获取加载器组件
  const getLoader = () => {
    switch (type) {
      case 'dots': return <DotsLoader />
      case 'pulse': return <PulseLoader />
      case 'bars': return <BarsLoader />
      case 'ring': return <RingLoader />
      case 'wave': return <WaveLoader />
      default: return <SpinnerLoader />
    }
  }

  const content = (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      {getLoader()}
      {text && (
        <motion.p
          className={`${sizeClasses[size].text} ${colorClasses[color].split(' ')[0]} font-medium`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )

  if (overlay) {
    return (
      <motion.div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-ios-2xl p-8 shadow-ios-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {content}
        </motion.div>
      </motion.div>
    )
  }

  return content
}

// 预设的加载组件
export const LoadingSpinner: React.FC<Omit<LoadingProps, 'type'>> = (props) => (
  <Loading type="spinner" {...props} />
)

export const LoadingDots: React.FC<Omit<LoadingProps, 'type'>> = (props) => (
  <Loading type="dots" {...props} />
)

export const LoadingPulse: React.FC<Omit<LoadingProps, 'type'>> = (props) => (
  <Loading type="pulse" {...props} />
)

export const LoadingBars: React.FC<Omit<LoadingProps, 'type'>> = (props) => (
  <Loading type="bars" {...props} />
)

export const LoadingOverlay: React.FC<Omit<LoadingProps, 'overlay'>> = (props) => (
  <Loading overlay {...props} />
)

// 按钮内加载器
export const ButtonLoading: React.FC<{ size?: LoadingProps['size'] }> = ({ size = 'sm' }) => (
  <Loading type="spinner" size={size} color="white" className="mr-2" />
)

// 页面加载器
export const PageLoading: React.FC<{ text?: string }> = ({ text = '加载中...' }) => (
  <div className="flex items-center justify-center min-h-screen">
    <Loading type="spinner" size="lg" text={text} />
  </div>
)

// 内容加载器
export const ContentLoading: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="space-y-3 p-4">
    {Array.from({ length: lines }).map((_, i) => (
      <motion.div
        key={i}
        className="h-4 bg-gray-200 rounded animate-pulse"
        style={{ width: i === lines - 1 ? '60%' : '100%' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
      />
    ))}
  </div>
)
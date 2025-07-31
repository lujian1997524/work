'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  type = 'button'
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-ios-lg
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ios18-blue focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  const variantClasses = {
    primary: `
      bg-ios18-blue text-white shadow-ios-md
      hover:bg-opacity-90 hover:shadow-ios-lg
      active:scale-95
    `,
    secondary: `
      bg-transparent text-ios18-blue border border-ios18-blue
      hover:bg-ios18-blue hover:bg-opacity-10
      active:scale-95
    `,
    outline: `
      bg-transparent text-ios18-blue border border-ios18-blue
      hover:bg-ios18-blue hover:bg-opacity-10
      active:scale-95
    `,
    danger: `
      bg-status-error text-white shadow-ios-md
      hover:bg-opacity-90 hover:shadow-ios-lg
      active:scale-95
    `,
    success: `
      bg-status-success text-white shadow-ios-md
      hover:bg-opacity-90 hover:shadow-ios-lg
      active:scale-95
    `,
    ghost: `
      bg-transparent text-text-primary
      hover:bg-macos15-control
      active:scale-95
    `
  }

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }

  return (
    <motion.button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={disabled || loading ? {} : { scale: 0.95 }}
      whileHover={disabled || loading ? {} : { scale: 1.02 }}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span>加载中...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  )
}
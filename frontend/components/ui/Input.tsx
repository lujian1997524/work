'use client'

import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  variant?: 'default' | 'filled' | 'glass'
  multiline?: boolean
  rows?: number
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  variant = 'default',
  multiline = false,
  rows = 3,
  className = '',
  ...props
}, ref) => {
  const baseClasses = `
    w-full px-4 py-3 rounded-ios-lg border transition-all duration-200
    font-system text-base
    focus:outline-none focus:ring-2 focus:ring-ios18-blue focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  const variantClasses = {
    default: `
      bg-white border-macos15-separator
      focus:border-ios18-blue focus:bg-white
      hover:border-ios18-blue hover:border-opacity-50
    `,
    filled: `
      bg-macos15-control border-transparent
      focus:border-ios18-blue focus:bg-white
      hover:bg-opacity-80
    `,
    glass: `
      bg-bg-glass backdrop-blur-glass border-white border-opacity-20
      focus:border-ios18-blue focus:bg-white focus:bg-opacity-90
      hover:bg-white hover:bg-opacity-30
    `
  }

  const errorClasses = error ? 'border-status-error focus:ring-status-error' : ''

  return (
    <div className="w-full">
      {label && (
        <motion.label 
          className="block text-sm font-medium text-text-primary mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
            {leftIcon}
          </div>
        )}
        
        {multiline ? (
          <motion.textarea
            ref={ref as any}
            rows={rows}
            className={`
              ${baseClasses} 
              ${variantClasses[variant]} 
              ${errorClasses}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${className}
              resize-none
            `}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            {...(props as any)}
          />
        ) : (
          <input
            ref={ref}
            className={`
              ${baseClasses} 
              ${variantClasses[variant]} 
              ${errorClasses}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />
        )}
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <motion.p 
          className="mt-2 text-sm text-status-error"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {error}
        </motion.p>
      )}
      
      {hint && !error && (
        <motion.p 
          className="mt-2 text-sm text-text-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {hint}
        </motion.p>
      )}
    </div>
  )
})
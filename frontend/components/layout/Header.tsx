'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card } from '../ui'

export interface HeaderProps {
  title?: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export const Header: React.FC<HeaderProps> = ({
  title = '激光切割生产管理系统',
  subtitle,
  children,
  className = ''
}) => {
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <motion.h1 
            className="text-headline font-semibold text-text-primary mb-0.5 truncate"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p 
              className="text-caption1 text-text-secondary truncate"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
        
        {children && (
          <motion.div 
            className="flex items-center space-x-2 ml-3 flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </div>
  )
}
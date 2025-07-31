'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  glass?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  hoverable = false,
  glass = true
}) => {
  const baseClasses = `
    rounded-ios-xl border border-white border-opacity-20
    transition-all duration-200
  `

  const glassClasses = glass ? `
    bg-bg-card backdrop-blur-glass
    shadow-ios-md
  ` : `
    bg-white shadow-ios-md
  `

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const hoverClasses = hoverable ? `
    hover:shadow-ios-lg hover:scale-105 cursor-pointer
  ` : ''

  return (
    <motion.div
      className={`${baseClasses} ${glassClasses} ${paddingClasses[padding]} ${hoverClasses} ${className}`}
      initial={hoverable ? { scale: 1 } : false}
      whileHover={hoverable ? { scale: 1.02, y: -2 } : {}}
      whileTap={hoverable ? { scale: 0.98 } : {}}
    >
      {children}
    </motion.div>
  )
}
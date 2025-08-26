'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface SwitchProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className = ''
}) => {
  const sizeClasses = {
    sm: {
      track: 'w-10 h-6',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4'
    },
    md: {
      track: 'w-12 h-7',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5'
    },
    lg: {
      track: 'w-14 h-8',
      thumb: 'w-6 h-6',
      translate: 'translate-x-6'
    }
  }

  const trackClasses = `
    ${sizeClasses[size].track}
    relative inline-flex items-center rounded-full
    transition-colors duration-300 ease-in-out
    ${checked 
      ? 'bg-ios18-blue shadow-inner' 
      : 'bg-gray-200 dark:bg-gray-700'
    }
    ${disabled 
      ? 'opacity-50 cursor-not-allowed' 
      : 'cursor-pointer'
    }
  `

  const thumbClasses = `
    ${sizeClasses[size].thumb}
    bg-white rounded-full shadow-lg
    transform transition-transform duration-300 ease-in-out
    ${checked ? sizeClasses[size].translate : 'translate-x-1'}
  `

  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked)
    }
  }

  const switchElement = (
    <motion.div
      className={trackClasses}
      onClick={handleClick}
      whileTap={disabled ? {} : { scale: 0.95 }}
      aria-checked={checked}
      role="switch"
    >
      <motion.div
        className={thumbClasses}
        layout
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30
        }}
      />
    </motion.div>
  )

  if (label) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {switchElement}
        <label 
          className={`text-text-primary font-medium ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
          onClick={handleClick}
        >
          {label}
        </label>
      </div>
    )
  }

  return <div className={className}>{switchElement}</div>
}
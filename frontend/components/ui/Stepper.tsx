'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface StepperStep {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  completed: boolean
  current?: boolean
  error?: boolean
}

export interface StepperProps {
  steps: StepperStep[]
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  clickeable?: boolean
  showNumbers?: boolean
  className?: string
  onStepClick?: (step: StepperStep, index: number) => void
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  orientation = 'horizontal',
  size = 'md',
  clickeable = false,
  showNumbers = true,
  className = '',
  onStepClick
}) => {
  const sizeClasses = {
    sm: {
      circle: 'w-6 h-6 text-xs',
      title: 'text-sm',
      description: 'text-xs',
      connector: orientation === 'horizontal' ? 'h-0.5' : 'w-0.5'
    },
    md: {
      circle: 'w-8 h-8 text-sm',
      title: 'text-base',
      description: 'text-sm',
      connector: orientation === 'horizontal' ? 'h-1' : 'w-1'
    },
    lg: {
      circle: 'w-10 h-10 text-base',
      title: 'text-lg',
      description: 'text-base',
      connector: orientation === 'horizontal' ? 'h-1.5' : 'w-1.5'
    }
  }

  const getStepStatus = (step: StepperStep) => {
    if (step.error) return 'error'
    if (step.completed) return 'completed'
    if (step.current) return 'current'
    return 'pending'
  }

  const getStepClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-ios18-blue text-white border-ios18-blue',
          title: 'text-gray-900',
          description: 'text-gray-600'
        }
      case 'current':
        return {
          circle: 'bg-white text-ios18-blue border-ios18-blue border-2 shadow-ios-sm',
          title: 'text-ios18-blue font-semibold',
          description: 'text-gray-600'
        }
      case 'error':
        return {
          circle: 'bg-red-500 text-white border-red-500',
          title: 'text-red-600',
          description: 'text-red-500'
        }
      default:
        return {
          circle: 'bg-gray-200 text-gray-500 border-gray-200',
          title: 'text-gray-500',
          description: 'text-gray-400'
        }
    }
  }

  const getConnectorClasses = (currentIndex: number) => {
    const prevStep = steps[currentIndex - 1]
    if (prevStep?.completed || prevStep?.error) {
      return 'bg-ios18-blue'
    }
    return 'bg-gray-200'
  }

  const handleStepClick = (step: StepperStep, index: number) => {
    if (clickeable && onStepClick) {
      onStepClick(step, index)
    }
  }

  if (orientation === 'horizontal') {
    return (
      <div className={`flex items-center ${className}`}>
        {steps.map((step, index) => {
          const status = getStepStatus(step)
          const classes = getStepClasses(status)
          const isClickable = clickeable && (step.completed || step.current)

          return (
            <React.Fragment key={step.id}>
              {/* 步骤项 */}
              <motion.div
                className={`flex flex-col items-center ${isClickable ? 'cursor-pointer' : ''}`}
                onClick={() => handleStepClick(step, index)}
                whileHover={isClickable ? { scale: 1.02 } : {}}
                whileTap={isClickable ? { scale: 0.98 } : {}}
              >
                {/* 圆圈 */}
                <motion.div
                  className={`
                    ${sizeClasses[size].circle} rounded-full border
                    flex items-center justify-center font-medium
                    ${classes.circle}
                    transition-all duration-200
                  `}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {step.error ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : step.completed ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step.icon ? (
                    step.icon
                  ) : showNumbers ? (
                    index + 1
                  ) : null}
                </motion.div>

                {/* 文本内容 */}
                <motion.div
                  className="text-center mt-2 max-w-24"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.1 }}
                >
                  <div className={`${sizeClasses[size].title} ${classes.title} font-medium`}>
                    {step.title}
                  </div>
                  {step.description && (
                    <div className={`${sizeClasses[size].description} ${classes.description} mt-1`}>
                      {step.description}
                    </div>
                  )}
                </motion.div>
              </motion.div>

              {/* 连接线 */}
              {index < steps.length - 1 && (
                <motion.div
                  className={`
                    flex-1 mx-4 ${sizeClasses[size].connector} rounded-full
                    ${getConnectorClasses(index + 1)}
                    transition-colors duration-300
                  `}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  // 垂直布局
  return (
    <div className={`flex flex-col ${className}`}>
      {steps.map((step, index) => {
        const status = getStepStatus(step)
        const classes = getStepClasses(status)
        const isClickable = clickeable && (step.completed || step.current)

        return (
          <React.Fragment key={step.id}>
            {/* 步骤项 */}
            <motion.div
              className={`flex items-start ${isClickable ? 'cursor-pointer' : ''}`}
              onClick={() => handleStepClick(step, index)}
              whileHover={isClickable ? { x: 2 } : {}}
            >
              {/* 左侧圆圈和连接线 */}
              <div className="flex flex-col items-center mr-4">
                {/* 圆圈 */}
                <motion.div
                  className={`
                    ${sizeClasses[size].circle} rounded-full border
                    flex items-center justify-center font-medium flex-shrink-0
                    ${classes.circle}
                    transition-all duration-200
                  `}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {step.error ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : step.completed ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step.icon ? (
                    step.icon
                  ) : showNumbers ? (
                    index + 1
                  ) : null}
                </motion.div>

                {/* 连接线 */}
                {index < steps.length - 1 && (
                  <motion.div
                    className={`
                      ${sizeClasses[size].connector} flex-1 min-h-8 mt-2 rounded-full
                      ${getConnectorClasses(index + 1)}
                      transition-colors duration-300
                    `}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
                  />
                )}
              </div>

              {/* 右侧内容 */}
              <motion.div
                className="flex-1 pb-6"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.1 }}
              >
                <div className={`${sizeClasses[size].title} ${classes.title} font-medium`}>
                  {step.title}
                </div>
                {step.description && (
                  <div className={`${sizeClasses[size].description} ${classes.description} mt-1`}>
                    {step.description}
                  </div>
                )}
              </motion.div>
            </motion.div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// 预设组件
export const HorizontalStepper: React.FC<Omit<StepperProps, 'orientation'>> = (props) => (
  <Stepper orientation="horizontal" {...props} />
)

export const VerticalStepper: React.FC<Omit<StepperProps, 'orientation'>> = (props) => (
  <Stepper orientation="vertical" {...props} />
)
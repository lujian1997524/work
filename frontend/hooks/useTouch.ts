'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// 触摸手势类型
export type GestureType = 'tap' | 'swipe' | 'pinch' | 'longpress' | 'pan';

export interface TouchPoint {
  x: number;
  y: number;
  id: number;
  timestamp: number;
}

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
}

export interface PinchGesture {
  scale: number;
  center: { x: number; y: number };
}

export interface TouchGestureHandlers {
  onTap?: (point: TouchPoint) => void;
  onSwipe?: (swipe: SwipeDirection) => void;
  onPinch?: (pinch: PinchGesture) => void;
  onLongPress?: (point: TouchPoint) => void;
  onPanStart?: (point: TouchPoint) => void;
  onPanMove?: (point: TouchPoint) => void;
  onPanEnd?: (point: TouchPoint) => void;
}

export interface TouchOptions {
  // 滑动阈值（像素）
  swipeThreshold?: number;
  // 长按时间（毫秒）
  longPressDelay?: number;
  // 双击时间间隔（毫秒）
  doubleTapDelay?: number;
  // 缩放最小变化阈值
  pinchThreshold?: number;
  // 是否阻止默认事件
  preventDefault?: boolean;
}

export const useTouch = (
  handlers: TouchGestureHandlers,
  options: TouchOptions = {}
) => {
  const {
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
    pinchThreshold = 0.1,
    preventDefault = true
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [touchState, setTouchState] = useState<{
    touches: TouchPoint[];
    startTime: number;
    startDistance?: number;
    lastTap?: number;
    longPressTimer?: NodeJS.Timeout;
  }>({
    touches: [],
    startTime: 0
  });

  // 计算两点距离
  const getDistance = useCallback((touch1: TouchPoint, touch2: TouchPoint) => {
    const dx = touch1.x - touch2.x;
    const dy = touch1.y - touch2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // 计算滑动方向
  const getSwipeDirection = useCallback((
    start: TouchPoint,
    end: TouchPoint
  ): SwipeDirection | null => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < swipeThreshold) return null;
    
    const velocity = distance / (end.timestamp - start.timestamp);
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return {
        direction: dx > 0 ? 'right' : 'left',
        distance,
        velocity
      };
    } else {
      return {
        direction: dy > 0 ? 'down' : 'up',
        distance,
        velocity
      };
    }
  }, [swipeThreshold]);

  // 转换原生触摸事件为TouchPoint
  const getTouchPoints = useCallback((touches: TouchList): TouchPoint[] => {
    return Array.from(touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      id: touch.identifier,
      timestamp: Date.now()
    }));
  }, []);

  // 处理触摸开始
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }
    
    const touches = getTouchPoints(event.touches);
    const now = Date.now();
    
    setIsPressed(true);
    
    // 设置长按定时器
    const longPressTimer = setTimeout(() => {
      if (touches.length === 1 && handlers.onLongPress) {
        handlers.onLongPress(touches[0]);
      }
    }, longPressDelay);

    setTouchState(prev => ({
      touches,
      startTime: now,
      startDistance: touches.length === 2 ? getDistance(touches[0], touches[1]) : undefined,
      lastTap: prev.lastTap,
      longPressTimer
    }));

    // 处理拖拽开始
    if (touches.length === 1 && handlers.onPanStart) {
      handlers.onPanStart(touches[0]);
    }
  }, [preventDefault, getTouchPoints, handlers, longPressDelay, getDistance]);

  // 处理触摸移动
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }
    
    const touches = getTouchPoints(event.touches);
    
    setTouchState(prev => {
      // 清除长按定时器（移动时取消长按）
      if (prev.longPressTimer) {
        clearTimeout(prev.longPressTimer);
      }

      // 处理缩放手势
      if (touches.length === 2 && prev.startDistance && handlers.onPinch) {
        const currentDistance = getDistance(touches[0], touches[1]);
        const scale = currentDistance / prev.startDistance;
        
        if (Math.abs(scale - 1) > pinchThreshold) {
          const center = {
            x: (touches[0].x + touches[1].x) / 2,
            y: (touches[0].y + touches[1].y) / 2
          };
          
          handlers.onPinch({ scale, center });
        }
      }

      // 处理拖拽移动
      if (touches.length === 1 && handlers.onPanMove) {
        handlers.onPanMove(touches[0]);
      }

      return {
        ...prev,
        touches,
        longPressTimer: undefined
      };
    });
  }, [preventDefault, getTouchPoints, handlers, getDistance, pinchThreshold]);

  // 处理触摸结束
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }
    
    const now = Date.now();
    setIsPressed(false);
    
    setTouchState(prev => {
      // 清除长按定时器
      if (prev.longPressTimer) {
        clearTimeout(prev.longPressTimer);
      }

      const { touches: startTouches, startTime, lastTap } = prev;
      const endTouches = getTouchPoints(event.changedTouches);
      
      if (startTouches.length === 1 && endTouches.length === 1) {
        const startTouch = startTouches[0];
        const endTouch = endTouches[0];
        const duration = now - startTime;
        
        // 检测滑动手势
        const swipe = getSwipeDirection(startTouch, endTouch);
        if (swipe && handlers.onSwipe) {
          handlers.onSwipe(swipe);
        }
        // 检测点击手势（如果没有滑动）
        else if (!swipe && duration < 300) {
          // 检测双击
          if (lastTap && (now - lastTap) < doubleTapDelay) {
            // 这里可以扩展双击处理
            console.log('双击检测');
          }
          
          if (handlers.onTap) {
            handlers.onTap(endTouch);
          }
          
          return {
            touches: [],
            startTime: 0,
            lastTap: now
          };
        }
        
        // 处理拖拽结束
        if (handlers.onPanEnd) {
          handlers.onPanEnd(endTouch);
        }
      }

      return {
        touches: [],
        startTime: 0,
        lastTap: prev.lastTap
      };
    });
  }, [preventDefault, getTouchPoints, handlers, getSwipeDirection, doubleTapDelay]);

  // 绑定事件监听器
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefault]);

  return {
    ref,
    isPressed,
    touchState: {
      isActive: touchState.touches.length > 0,
      touchCount: touchState.touches.length,
      touches: touchState.touches
    }
  };
};

// 简化的滑动Hook
export const useSwipe = (
  onSwipe: (direction: SwipeDirection) => void,
  threshold: number = 50
) => {
  return useTouch({ onSwipe }, { swipeThreshold: threshold });
};

// 简化的长按Hook
export const useLongPress = (
  onLongPress: () => void,
  delay: number = 500
) => {
  return useTouch(
    { onLongPress: () => onLongPress() },
    { longPressDelay: delay }
  );
};
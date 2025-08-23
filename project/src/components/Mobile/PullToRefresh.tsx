import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
  className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
  className = ''
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if user can pull (at top of scroll)
  const checkCanPull = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop <= 0;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return;
    
    if (checkCanPull()) {
      const touch = (e.touches && e.touches[0]) as any;
      if (!touch) return;
      startY.current = touch.clientY || 0;
      setCanPull(true);
    }
  }, [enabled, isRefreshing, checkCanPull]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing || !canPull) return;
    
    const touch = (e.touches && e.touches[0]) as any;
    if (!touch) return;
    currentY.current = touch.clientY || 0;
    const deltaY = currentY.current - startY.current;
    
    if (deltaY > 0 && checkCanPull()) {
      // Prevent default scroll behavior when pulling down
      e.preventDefault();
      
      // Apply resistance to pull distance
      const distance = Math.pow(deltaY, 0.8) / resistance;
      setPullDistance(distance);
      
      if (!isPullingRef.current) {
        setIsPulling(true);
        isPullingRef.current = true;
        
        // Add haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
        document.body.classList.add('haptic-light');
        setTimeout(() => document.body.classList.remove('haptic-light'), 100);
      }
    }
  }, [enabled, isRefreshing, canPull, checkCanPull, resistance]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!enabled || isRefreshing || !isPullingRef.current) return;
    
    setIsPulling(false);
    isPullingRef.current = false;
    setCanPull(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      // Add stronger haptic feedback for refresh trigger
      if (navigator.vibrate) {
        navigator.vibrate([10, 50, 10]);
      }
      document.body.classList.add('haptic-medium');
      setTimeout(() => document.body.classList.remove('haptic-medium'), 150);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [enabled, isRefreshing, pullDistance, threshold, onRefresh]);

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate indicator states
  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const isTriggered = pullDistance >= threshold;
  const indicatorScale = isTriggered ? 1.2 : 0.8 + (pullDistance / threshold) * 0.4;
  const indicatorRotation = (pullDistance / threshold) * 180;

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-auto h-full ${className}`}
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.5, 40)}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        touchAction: 'pan-y',
      }}
    >
      {/* Pull to Refresh Indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: indicatorOpacity,
              scale: indicatorScale,
              y: Math.min(pullDistance - 40, 20)
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none"
            style={{
              marginTop: '-60px',
            }}
          >
            <div 
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                isTriggered 
                  ? 'bg-mint-500 text-white shadow-lg' 
                  : 'bg-white dark:bg-obsidian-800 text-obsidian-600 dark:text-pearl-400 shadow-md'
              }`}
            >
              {isRefreshing ? (
                <RefreshCw 
                  className="h-6 w-6 animate-spin" 
                />
              ) : isTriggered ? (
                <RefreshCw 
                  className="h-6 w-6" 
                  style={{ transform: `rotate(${indicatorRotation}deg)` }}
                />
              ) : (
                <ArrowDown 
                  className="h-6 w-6" 
                  style={{ transform: `rotate(${indicatorRotation}deg)` }}
                />
              )}
            </div>
            
            {/* Progress Ring */}
            <div className="absolute inset-0 w-12 h-12">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-pearl-200 dark:text-obsidian-600"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={isTriggered ? 'text-white' : 'text-mint-500'}
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - indicatorOpacity)}`}
                  style={{
                    transition: isPulling ? 'none' : 'stroke-dashoffset 0.3s ease-out',
                  }}
                />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Text */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ 
              opacity: indicatorOpacity * 0.8,
              y: Math.min(pullDistance - 10, 40)
            }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-0 left-0 right-0 text-center z-10 pointer-events-none"
            style={{
              marginTop: '-20px',
            }}
          >
            <span className="text-sm font-medium text-obsidian-600 dark:text-pearl-400">
              {isRefreshing 
                ? '正在刷新...' 
                : isTriggered 
                  ? '松开刷新' 
                  : '下拉刷新'
              }
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {children}
    </div>
  );
};

export default PullToRefresh;
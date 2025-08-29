import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom countdown hook with auto-decrementing timer and proper cleanup
 * 
 * @param initialTime - Initial countdown time in seconds
 * @returns Object containing timeLeft, isActive, and control functions
 */
export const useCountdown = (initialTime: number = 60) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Start countdown with specified duration
  const start = useCallback((duration?: number) => {
    const countdownDuration = duration ?? initialTime;
    setTimeLeft(countdownDuration);
    setIsActive(true);
  }, [initialTime]);
  
  // Stop and reset countdown
  const stop = useCallback(() => {
    setIsActive(false);
    setTimeLeft(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Reset countdown to initial time without starting
  const reset = useCallback(() => {
    setTimeLeft(initialTime);
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [initialTime]);
  
  // Auto-decrementing countdown logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, timeLeft]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  return {
    timeLeft,
    isActive,
    start,
    stop,
    reset,
    // Utility computed values
    isFinished: !isActive && timeLeft === 0,
    canStart: !isActive && timeLeft === 0,
  };
};

export default useCountdown;
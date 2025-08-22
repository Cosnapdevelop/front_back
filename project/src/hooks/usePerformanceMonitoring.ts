/**
 * Performance monitoring hooks for tracking and optimizing app performance
 * Integrates with analytics to provide comprehensive performance insights
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { trackPerformance } from '../utils/analytics';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  interactionToNextPaint: number;
}

interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
}

/**
 * Hook to monitor Core Web Vitals and other performance metrics
 */
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const observer = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Observe Core Web Vitals
    const observeMetrics = () => {
      // First Contentful Paint (FCP)
      observer.current = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            const fcp = entry.startTime;
            setMetrics(prev => ({ ...prev, firstContentfulPaint: fcp }));
            trackPerformance('page_load_time', fcp);
          }
        });
      });
      observer.current.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.startTime;
        setMetrics(prev => ({ ...prev, largestContentfulPaint: lcp }));
        trackPerformance('page_load_time', lcp);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Cumulative Layout Shift (CLS)
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        setMetrics(prev => ({ ...prev, cumulativeLayoutShift: clsValue }));
        trackPerformance('page_load_time', clsValue * 1000); // Convert to ms for consistency
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          setMetrics(prev => ({ ...prev, firstInputDelay: fid }));
          trackPerformance('page_load_time', fid);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    };

    observeMetrics();

    // Track navigation timing
    const trackNavigationTiming = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        setMetrics(prev => ({ ...prev, pageLoadTime }));
        trackPerformance('page_load_time', pageLoadTime);
      }
    };

    if (document.readyState === 'complete') {
      trackNavigationTiming();
    } else {
      window.addEventListener('load', trackNavigationTiming);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
      window.removeEventListener('load', trackNavigationTiming);
    };
  }, []);

  return metrics;
};

/**
 * Hook to monitor API call performance
 */
export const useAPIPerformance = () => {
  const measureAPICall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    apiName: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      trackPerformance('api_response_time', duration);
      
      // Log slow API calls for optimization
      if (duration > 3000) {
        console.warn(`Slow API call detected: ${apiName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      trackPerformance('api_response_time', duration);
      throw error;
    }
  }, []);

  return { measureAPICall };
};

/**
 * Hook to monitor resource loading performance
 */
export const useResourceMonitoring = () => {
  const [resources, setResources] = useState<ResourceTiming[]>([]);

  useEffect(() => {
    const trackResourceTiming = () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const processedResources = resources.map(resource => ({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize || 0,
        type: getResourceType(resource.name),
      }));

      setResources(processedResources);

      // Track large resources that might impact performance
      const largeResources = processedResources.filter(r => r.size > 1000000); // > 1MB
      largeResources.forEach(resource => {
        console.warn(`Large resource detected: ${resource.name} (${(resource.size / 1024 / 1024).toFixed(2)}MB)`);
      });
    };

    if (document.readyState === 'complete') {
      trackResourceTiming();
    } else {
      window.addEventListener('load', trackResourceTiming);
    }

    return () => {
      window.removeEventListener('load', trackResourceTiming);
    };
  }, []);

  return resources;
};

/**
 * Hook to monitor component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderStart = useRef<number>(0);
  const mountTime = useRef<number>(0);

  useEffect(() => {
    renderStart.current = performance.now();
  });

  useEffect(() => {
    const mountEnd = performance.now();
    mountTime.current = mountEnd - renderStart.current;
    
    // Track component mount performance
    if (mountTime.current > 16) { // > 1 frame at 60fps
      console.warn(`Slow component mount: ${componentName} took ${mountTime.current.toFixed(2)}ms`);
    }
  }, [componentName]);

  const measureRender = useCallback((renderFunction: () => void) => {
    const start = performance.now();
    renderFunction();
    const end = performance.now();
    const duration = end - start;
    
    if (duration > 16) {
      console.warn(`Slow render in ${componentName}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }, [componentName]);

  return { mountTime: mountTime.current, measureRender };
};

/**
 * Hook to monitor memory usage
 */
export const useMemoryMonitoring = () => {
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number;
    total: number;
    limit: number;
  } | null>(null);

  useEffect(() => {
    const checkMemory = () => {
      // Add proper feature detection for Chrome-specific memory API
      if ('memory' in performance && typeof performance.memory === 'object') {
        const memory = performance.memory as any;
        setMemoryInfo({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        });

        // Alert if memory usage is high
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          console.warn(`High memory usage: ${usagePercent.toFixed(2)}%`);
        }
      }
    };

    checkMemory();
    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
};

// Helper function to determine resource type
const getResourceType = (url: string): string => {
  if (url.includes('.js')) return 'javascript';
  if (url.includes('.css')) return 'stylesheet';
  if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return 'image';
  if (url.includes('.woff') || url.includes('.ttf')) return 'font';
  return 'other';
};

/**
 * Performance monitoring summary hook
 */
export const usePerformanceSummary = () => {
  const coreMetrics = usePerformanceMonitoring();
  const resources = useResourceMonitoring();
  const memory = useMemoryMonitoring();

  const getPerformanceScore = useCallback(() => {
    let score = 100;
    
    // Deduct points for poor Core Web Vitals
    if (coreMetrics.firstContentfulPaint && coreMetrics.firstContentfulPaint > 2500) score -= 20;
    if (coreMetrics.largestContentfulPaint && coreMetrics.largestContentfulPaint > 4000) score -= 20;
    if (coreMetrics.firstInputDelay && coreMetrics.firstInputDelay > 300) score -= 20;
    if (coreMetrics.cumulativeLayoutShift && coreMetrics.cumulativeLayoutShift > 0.25) score -= 20;
    
    // Deduct points for large resources
    const largeResources = resources.filter(r => r.size > 1000000);
    score -= largeResources.length * 5;
    
    // Deduct points for high memory usage
    if (memory && memory.used / memory.limit > 0.8) score -= 10;
    
    return Math.max(0, score);
  }, [coreMetrics, resources, memory]);

  return {
    metrics: coreMetrics,
    resources,
    memory,
    score: getPerformanceScore(),
  };
};
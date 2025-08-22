/**
 * Real-time performance monitoring component for Cosnap AI
 * Integrates with analytics and provides performance insights
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { usePerformanceSummary, useAPIPerformance } from '../../hooks/usePerformanceMonitoring';
import { trackPerformance, trackError } from '../../utils/analytics';

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  metric?: string;
  value?: number;
}

interface PerformanceMonitorProps {
  showDetailedMetrics?: boolean;
  alertThresholds?: {
    fcp: number; // First Contentful Paint threshold in ms
    lcp: number; // Largest Contentful Paint threshold in ms
    fid: number; // First Input Delay threshold in ms
    cls: number; // Cumulative Layout Shift threshold
    apiResponseTime: number; // API response time threshold in ms
  };
}

const DEFAULT_THRESHOLDS = {
  fcp: 1500,
  lcp: 2500,
  fid: 100,
  cls: 0.1,
  apiResponseTime: 3000,
};

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDetailedMetrics = false,
  alertThresholds = DEFAULT_THRESHOLDS,
}) => {
  const { metrics, resources, memory, score } = usePerformanceSummary();
  const { measureAPICall } = useAPIPerformance();
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Monitor performance thresholds and generate alerts
  useEffect(() => {
    const checkThresholds = () => {
      const newAlerts: PerformanceAlert[] = [];

      // Check Core Web Vitals
      if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > alertThresholds.fcp) {
        newAlerts.push({
          id: `fcp-${Date.now()}`,
          type: 'warning',
          message: `First Contentful Paint is ${Math.round(metrics.firstContentfulPaint)}ms (target: <${alertThresholds.fcp}ms)`,
          timestamp: Date.now(),
          metric: 'firstContentfulPaint',
          value: metrics.firstContentfulPaint,
        });
      }

      if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > alertThresholds.lcp) {
        newAlerts.push({
          id: `lcp-${Date.now()}`,
          type: 'warning',
          message: `Largest Contentful Paint is ${Math.round(metrics.largestContentfulPaint)}ms (target: <${alertThresholds.lcp}ms)`,
          timestamp: Date.now(),
          metric: 'largestContentfulPaint',
          value: metrics.largestContentfulPaint,
        });
      }

      if (metrics.firstInputDelay && metrics.firstInputDelay > alertThresholds.fid) {
        newAlerts.push({
          id: `fid-${Date.now()}`,
          type: 'error',
          message: `First Input Delay is ${Math.round(metrics.firstInputDelay)}ms (target: <${alertThresholds.fid}ms)`,
          timestamp: Date.now(),
          metric: 'firstInputDelay',
          value: metrics.firstInputDelay,
        });
      }

      if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > alertThresholds.cls) {
        newAlerts.push({
          id: `cls-${Date.now()}`,
          type: 'warning',
          message: `Cumulative Layout Shift is ${metrics.cumulativeLayoutShift.toFixed(3)} (target: <${alertThresholds.cls})`,
          timestamp: Date.now(),
          metric: 'cumulativeLayoutShift',
          value: metrics.cumulativeLayoutShift,
        });
      }

      // Check memory usage
      if (memory && memory.used / memory.limit > 0.8) {
        newAlerts.push({
          id: `memory-${Date.now()}`,
          type: 'error',
          message: `High memory usage: ${Math.round((memory.used / memory.limit) * 100)}%`,
          timestamp: Date.now(),
          metric: 'memoryUsage',
          value: (memory.used / memory.limit) * 100,
        });
      }

      // Track alerts in analytics
      newAlerts.forEach(alert => {
        trackError(new Error(`Performance Alert: ${alert.message}`), alert.metric);
      });

      setAlerts(prev => [...prev.slice(-4), ...newAlerts].slice(-5)); // Keep last 5 alerts
    };

    const interval = setInterval(checkThresholds, 5000); // Check every 5 seconds
    checkThresholds(); // Initial check

    return () => clearInterval(interval);
  }, [metrics, memory, alertThresholds]);

  // Auto-dismiss alerts after 10 seconds
  useEffect(() => {
    alerts.forEach(alert => {
      const age = Date.now() - alert.timestamp;
      if (age > 10000) {
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
      }
    });
  }, [alerts]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <TrendingUp className="h-4 w-4" />;
    if (score >= 70) return <Activity className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  // Only show in development or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showDetailedMetrics) {
    return null;
  }

  return (
    <>
      {/* Performance Score Widget */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-4 right-4 z-40"
      >
        <motion.button
          onClick={() => setIsVisible(!isVisible)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ${
            score >= 90
              ? 'bg-green-500/90 text-white'
              : score >= 70
              ? 'bg-yellow-500/90 text-white'
              : 'bg-red-500/90 text-white'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {getScoreIcon(score)}
          <span className="font-medium">{Math.round(score)}</span>
          <Zap className="h-3 w-3" />
        </motion.button>
      </motion.div>

      {/* Detailed Performance Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed bottom-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Performance Monitor</h3>
                <div className={`flex items-center space-x-1 ${getScoreColor(score)}`}>
                  {getScoreIcon(score)}
                  <span className="font-bold">{Math.round(score)}/100</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="p-4 space-y-3 overflow-y-auto max-h-64">
              {/* Core Web Vitals */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Core Web Vitals</h4>
                
                {metrics.firstContentfulPaint && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">FCP</span>
                    <span className={metrics.firstContentfulPaint > alertThresholds.fcp ? 'text-red-500' : 'text-green-500'}>
                      {Math.round(metrics.firstContentfulPaint)}ms
                    </span>
                  </div>
                )}

                {metrics.largestContentfulPaint && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">LCP</span>
                    <span className={metrics.largestContentfulPaint > alertThresholds.lcp ? 'text-red-500' : 'text-green-500'}>
                      {Math.round(metrics.largestContentfulPaint)}ms
                    </span>
                  </div>
                )}

                {metrics.firstInputDelay && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">FID</span>
                    <span className={metrics.firstInputDelay > alertThresholds.fid ? 'text-red-500' : 'text-green-500'}>
                      {Math.round(metrics.firstInputDelay)}ms
                    </span>
                  </div>
                )}

                {metrics.cumulativeLayoutShift && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">CLS</span>
                    <span className={metrics.cumulativeLayoutShift > alertThresholds.cls ? 'text-red-500' : 'text-green-500'}>
                      {metrics.cumulativeLayoutShift.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>

              {/* Memory Usage */}
              {memory && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Memory</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Used</span>
                    <span className={(memory.used / memory.limit) > 0.8 ? 'text-red-500' : 'text-green-500'}>
                      {Math.round((memory.used / memory.limit) * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Resource Summary */}
              {resources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Resources</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total</span>
                    <span className="text-gray-900 dark:text-white">{resources.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Large (>1MB)</span>
                    <span className={resources.filter(r => r.size > 1000000).length > 0 ? 'text-red-500' : 'text-green-500'}>
                      {resources.filter(r => r.size > 1000000).length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance Alerts */}
      <div className="fixed bottom-4 left-4 space-y-2 z-40">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              className={`flex items-start space-x-3 p-3 rounded-lg shadow-lg backdrop-blur-sm max-w-sm ${
                alert.type === 'error'
                  ? 'bg-red-500/90 text-white'
                  : alert.type === 'warning'
                  ? 'bg-yellow-500/90 text-white'
                  : 'bg-blue-500/90 text-white'
              }`}
            >
              <div className="flex-shrink-0">
                {alert.type === 'error' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.message}</p>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="flex-shrink-0 text-white/80 hover:text-white"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default PerformanceMonitor;
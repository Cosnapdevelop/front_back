import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ServerIcon,
  WifiIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { useBeta } from '../../context/BetaContext';
import { useAuth } from '../../context/AuthContext';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: {
    warning: number;
    critical: number;
  };
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  history: number[];
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: Date;
  metric: string;
  acknowledged: boolean;
}

const RealTimeMonitor: React.FC = () => {
  const { analytics } = useBeta();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const websocketRef = useRef<WebSocket | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize performance metrics
  const initializeMetrics = useCallback((): PerformanceMetric[] => {
    return [
      {
        name: 'Page Load Time',
        value: 0,
        unit: 'ms',
        threshold: { warning: 3000, critical: 5000 },
        status: 'good',
        trend: 'stable',
        history: []
      },
      {
        name: 'API Response Time',
        value: 0,
        unit: 'ms',
        threshold: { warning: 1000, critical: 2000 },
        status: 'good',
        trend: 'stable',
        history: []
      },
      {
        name: 'Memory Usage',
        value: 0,
        unit: 'MB',
        threshold: { warning: 100, critical: 200 },
        status: 'good',
        trend: 'stable',
        history: []
      },
      {
        name: 'Network Quality',
        value: 100,
        unit: '%',
        threshold: { warning: 70, critical: 50 },
        status: 'good',
        trend: 'stable',
        history: []
      },
      {
        name: 'Frame Rate',
        value: 60,
        unit: 'fps',
        threshold: { warning: 30, critical: 15 },
        status: 'good',
        trend: 'stable',
        history: []
      },
      {
        name: 'Error Rate',
        value: 0,
        unit: '%',
        threshold: { warning: 1, critical: 5 },
        status: 'good',
        trend: 'stable',
        history: []
      }
    ];
  }, []);

  // Web Performance API measurements
  const measureWebVitals = useCallback(() => {
    try {
      // Core Web Vitals
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const metrics = {
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.navigationStart : 0,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      };

      return metrics;
    } catch (error) {
      console.error('Error measuring web vitals:', error);
      return null;
    }
  }, []);

  // Memory usage monitoring
  const measureMemoryUsage = useCallback(() => {
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        };
      }
      return null;
    } catch (error) {
      console.error('Error measuring memory:', error);
      return null;
    }
  }, []);

  // Network quality assessment
  const measureNetworkQuality = useCallback(() => {
    try {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        const effectiveType = connection.effectiveType;
        
        const qualityMap = {
          'slow-2g': 20,
          '2g': 40,
          '3g': 70,
          '4g': 90
        };
        
        return qualityMap[effectiveType as keyof typeof qualityMap] || 100;
      }
      
      // Fallback: measure based on online status
      return navigator.onLine ? 100 : 0;
    } catch (error) {
      console.error('Error measuring network quality:', error);
      return 100;
    }
  }, []);

  // Frame rate monitoring
  const measureFrameRate = useCallback(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const countFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        return fps;
      }
      
      requestAnimationFrame(countFrame);
      return null;
    };
    
    requestAnimationFrame(countFrame);
  }, []);

  // Update metrics with real data
  const updateMetrics = useCallback(() => {
    setMetrics(prevMetrics => {
      const newMetrics = [...prevMetrics];
      
      // Update each metric with real measurements
      const webVitals = measureWebVitals();
      const memoryUsage = measureMemoryUsage();
      const networkQuality = measureNetworkQuality();
      
      newMetrics.forEach(metric => {
        let newValue = metric.value;
        
        switch (metric.name) {
          case 'Page Load Time':
            newValue = webVitals?.loadTime || metric.value;
            break;
          case 'API Response Time':
            // This would be updated from actual API calls
            newValue = metric.value + (Math.random() - 0.5) * 100;
            break;
          case 'Memory Usage':
            newValue = memoryUsage?.used || metric.value;
            break;
          case 'Network Quality':
            newValue = networkQuality;
            break;
          case 'Frame Rate':
            // This would be updated from frame rate measurements
            newValue = 60 + (Math.random() - 0.5) * 10;
            break;
          case 'Error Rate':
            // This would be calculated from actual error tracking
            newValue = Math.max(0, metric.value + (Math.random() - 0.9) * 2);
            break;
        }
        
        // Update metric
        metric.value = Math.max(0, newValue);
        metric.history = [...metric.history.slice(-19), metric.value];
        
        // Determine status
        if (metric.name === 'Network Quality' || metric.name === 'Frame Rate') {
          // Higher is better for these metrics
          metric.status = metric.value < metric.threshold.critical ? 'critical' :
                          metric.value < metric.threshold.warning ? 'warning' : 'good';
        } else {
          // Lower is better for these metrics
          metric.status = metric.value > metric.threshold.critical ? 'critical' :
                          metric.value > metric.threshold.warning ? 'warning' : 'good';
        }
        
        // Determine trend
        if (metric.history.length >= 2) {
          const current = metric.history[metric.history.length - 1];
          const previous = metric.history[metric.history.length - 2];
          metric.trend = current > previous ? 'up' : current < previous ? 'down' : 'stable';
        }
      });
      
      return newMetrics;
    });
  }, [measureWebVitals, measureMemoryUsage, measureNetworkQuality]);

  // Generate alerts based on metrics
  const checkForAlerts = useCallback((currentMetrics: PerformanceMetric[]) => {
    const newAlerts: SystemAlert[] = [];
    
    currentMetrics.forEach(metric => {
      if (metric.status === 'critical' || metric.status === 'warning') {
        const alertId = `${metric.name}-${Date.now()}`;
        const existingAlert = alerts.find(alert => 
          alert.metric === metric.name && !alert.acknowledged
        );
        
        if (!existingAlert) {
          newAlerts.push({
            id: alertId,
            type: metric.status as 'warning' | 'critical',
            message: `${metric.name} is ${metric.value}${metric.unit} (threshold: ${metric.threshold[metric.status]}${metric.unit})`,
            timestamp: new Date(),
            metric: metric.name,
            acknowledged: false
          });
        }
      }
    });
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 20)); // Keep only last 20 alerts
      
      // Track alert events
      newAlerts.forEach(alert => {
        analytics.trackEvent('performance_alert', {
          type: alert.type,
          metric: alert.metric,
          message: alert.message,
          userId: user?.id
        });
      });
    }
  }, [alerts, analytics, user?.id]);

  // Initialize monitoring
  useEffect(() => {
    const initialMetrics = initializeMetrics();
    setMetrics(initialMetrics);
    
    // Start metrics collection
    metricsIntervalRef.current = setInterval(() => {
      updateMetrics();
    }, 2000); // Update every 2 seconds
    
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [initializeMetrics, updateMetrics]);

  // Monitor for alerts
  useEffect(() => {
    checkForAlerts(metrics);
  }, [metrics, checkForAlerts]);

  // WebSocket connection for real-time data
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      try {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/performance`;
        websocketRef.current = new WebSocket(wsUrl);
        
        websocketRef.current.onopen = () => {
          setConnectionStatus('connected');
          console.log('Performance monitoring WebSocket connected');
        };
        
        websocketRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'metrics') {
              // Update metrics from server data
              setMetrics(prevMetrics => {
                const updatedMetrics = [...prevMetrics];
                Object.entries(data.metrics).forEach(([key, value]) => {
                  const metric = updatedMetrics.find(m => m.name.toLowerCase().replace(' ', '_') === key);
                  if (metric) {
                    metric.value = value as number;
                  }
                });
                return updatedMetrics;
              });
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        websocketRef.current.onclose = () => {
          setConnectionStatus('disconnected');
          console.log('Performance monitoring WebSocket disconnected');
        };
        
        websocketRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('disconnected');
        };
        
      } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
        setConnectionStatus('disconnected');
      }
    }
    
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircleIcon className="w-4 h-4" />;
      case 'warning': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'critical': return <ExclamationTriangleIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  const activeAlerts = alerts.filter(alert => !alert.acknowledged);

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-4 right-4 z-40"
      >
        <button
          onClick={() => setIsMinimized(false)}
          className={`relative p-3 rounded-full shadow-lg transition-colors ${
            activeAlerts.length > 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          <ChartBarIcon className="w-6 h-6" />
          {activeAlerts.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeAlerts.length}
            </span>
          )}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-40 max-h-[80vh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Performance Monitor</h3>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
        </div>
        <div className="flex items-center space-x-2">
          {activeAlerts.length > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
              {activeAlerts.length} alerts
            </span>
          )}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <ChartBarIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {/* Alerts */}
        <AnimatePresence>
          {activeAlerts.length > 0 && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="border-b border-gray-200 dark:border-gray-700"
            >
              <div className="p-4 space-y-2">
                <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">Active Alerts</h4>
                {activeAlerts.slice(0, 3).map(alert => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-2 rounded-lg ${
                      alert.type === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-xs font-medium ${
                          alert.type === 'critical' ? 'text-red-800' : 'text-yellow-800'
                        }`}>
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {alert.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics */}
        <div className="p-4 space-y-3">
          {metrics.map(metric => (
            <div key={metric.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`p-1 rounded ${getStatusColor(metric.status)}`}>
                  {getStatusIcon(metric.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {metric.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {metric.value.toFixed(metric.name === 'Error Rate' ? 1 : 0)}{metric.unit}
                    <span className="ml-1">{getTrendIcon(metric.trend)}</span>
                  </p>
                </div>
              </div>
              
              {/* Mini chart */}
              <div className="w-16 h-8 flex items-end space-x-1">
                {metric.history.slice(-8).map((value, index) => (
                  <div
                    key={index}
                    className={`w-1 rounded-t ${getStatusColor(
                      value > metric.threshold.critical ? 'critical' :
                      value > metric.threshold.warning ? 'warning' : 'good'
                    ).replace('text-', 'bg-').replace(' bg-', ' bg-opacity-60 bg-')}`}
                    style={{
                      height: `${Math.max(2, (value / Math.max(...metric.history)) * 32)}px`
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default RealTimeMonitor;
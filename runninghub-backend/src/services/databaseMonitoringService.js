/**
 * Comprehensive Database Monitoring and Alerting Service
 * 
 * Monitors database health, performance, and alerts on critical issues:
 * - Connection pool monitoring
 * - Query performance tracking
 * - Deadlock detection and resolution
 * - Resource usage monitoring
 * - Automated health checks
 * - Alert escalation system
 */

import { databaseManager } from '../config/prisma.js';
import { transactionHandler } from '../utils/transactionHandler.js';

export class DatabaseMonitoringService {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.alertThresholds = {
      // Connection pool thresholds
      maxActiveConnections: 8,          // Alert if > 80% of pool used
      maxIdleConnections: 15,           // Alert if too many idle connections
      connectionUtilization: 80,        // Alert if > 80% utilization
      
      // Query performance thresholds  
      slowQueryThreshold: 2000,         // 2 seconds
      criticalQueryThreshold: 10000,    // 10 seconds
      queryErrorRate: 5,                // Alert if > 5% error rate
      
      // Resource thresholds
      maxMemoryUsageMB: 512,            // Alert if > 512MB heap usage
      maxDiskUsagePercent: 85,          // Alert if > 85% disk usage
      
      // Transaction thresholds
      maxTransactionTime: 30000,        // 30 seconds
      deadlockThreshold: 5,             // Alert if > 5 deadlocks/hour
      
      // Health check thresholds
      healthCheckLatency: 1000,         // 1 second
      healthCheckFailures: 3            // Consecutive failures before alert
    };

    this.metrics = {
      connectionPool: {},
      queryPerformance: {},
      systemResources: {},
      healthChecks: {},
      alerts: {
        active: [],
        resolved: [],
        totalCount: 0
      }
    };

    this.consecutiveHealthFailures = 0;
    this.lastHealthCheck = null;
    this.alertHistory = new Map();
  }

  /**
   * Start comprehensive database monitoring
   */
  async startMonitoring(intervalMs = 30000) { // Default: 30 seconds
    if (this.isMonitoring) {
      console.log('📊 Database monitoring already running');
      return;
    }

    console.log(`🚀 Starting database monitoring (interval: ${intervalMs}ms)`);
    this.isMonitoring = true;

    // Initial health check
    await this.performHealthCheck();

    // Set up monitoring interval
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCycle();
      } catch (error) {
        console.error('❌ Database monitoring cycle failed:', error);
        this.createAlert('MONITORING_FAILURE', 'critical', 
          `Database monitoring cycle failed: ${error.message}`);
      }
    }, intervalMs);

    // Set up cleanup interval (every 6 hours)
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 6 * 60 * 60 * 1000);

    console.log('✅ Database monitoring started successfully');
  }

  /**
   * Stop database monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping database monitoring');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('✅ Database monitoring stopped');
  }

  /**
   * Perform complete monitoring cycle
   */
  async performMonitoringCycle() {
    const cycleStart = Date.now();
    
    try {
      // Parallel monitoring tasks
      const [healthStatus, connectionMetrics, performanceMetrics, systemMetrics] = await Promise.allSettled([
        this.performHealthCheck(),
        this.monitorConnectionPool(),
        this.monitorQueryPerformance(),
        this.monitorSystemResources()
      ]);

      // Process results and check thresholds
      this.processMonitoringResults({
        health: healthStatus.status === 'fulfilled' ? healthStatus.value : null,
        connections: connectionMetrics.status === 'fulfilled' ? connectionMetrics.value : null,
        performance: performanceMetrics.status === 'fulfilled' ? performanceMetrics.value : null,
        system: systemMetrics.status === 'fulfilled' ? systemMetrics.value : null
      });

      // Update metrics
      this.updateMetrics();

      const cycleDuration = Date.now() - cycleStart;
      console.log(`📊 Monitoring cycle completed in ${cycleDuration}ms`);

    } catch (error) {
      console.error('❌ Monitoring cycle error:', error);
      this.createAlert('MONITORING_ERROR', 'high', error.message);
    }
  }

  /**
   * Perform database health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    
    try {
      const healthStatus = await databaseManager.getHealthStatus();
      const latency = Date.now() - startTime;

      this.lastHealthCheck = {
        timestamp: new Date(),
        status: healthStatus.status,
        latency,
        details: healthStatus
      };

      // Check latency threshold
      if (latency > this.alertThresholds.healthCheckLatency) {
        this.createAlert('HIGH_LATENCY', 'medium', 
          `Health check latency ${latency}ms exceeds threshold ${this.alertThresholds.healthCheckLatency}ms`);
      }

      // Reset consecutive failures on success
      if (healthStatus.status === 'healthy') {
        this.consecutiveHealthFailures = 0;
      } else {
        this.consecutiveHealthFailures++;
        
        // Alert on consecutive failures
        if (this.consecutiveHealthFailures >= this.alertThresholds.healthCheckFailures) {
          this.createAlert('HEALTH_CHECK_FAILURE', 'critical',
            `${this.consecutiveHealthFailures} consecutive health check failures`);
        }
      }

      return healthStatus;
    } catch (error) {
      this.consecutiveHealthFailures++;
      const latency = Date.now() - startTime;
      
      this.lastHealthCheck = {
        timestamp: new Date(),
        status: 'error',
        latency,
        error: error.message
      };

      if (this.consecutiveHealthFailures >= this.alertThresholds.healthCheckFailures) {
        this.createAlert('HEALTH_CHECK_ERROR', 'critical',
          `Health check failed: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Monitor database connection pool
   */
  async monitorConnectionPool() {
    try {
      const poolInfo = await databaseManager.getConnectionPoolInfo();
      const timestamp = new Date();

      this.metrics.connectionPool = {
        timestamp,
        ...poolInfo,
        utilization: this.calculateConnectionUtilization(poolInfo)
      };

      // Check connection thresholds
      this.checkConnectionThresholds(poolInfo);

      return poolInfo;
    } catch (error) {
      console.warn('⚠️  Connection pool monitoring failed:', error.message);
      throw error;
    }
  }

  /**
   * Monitor query performance metrics
   */
  async monitorQueryPerformance() {
    try {
      const performanceMetrics = await databaseManager.getPerformanceMetrics();
      const transactionMetrics = transactionHandler.getMetrics();
      const databaseMetrics = databaseManager.getMetrics();

      this.metrics.queryPerformance = {
        timestamp: new Date(),
        database: databaseMetrics,
        transactions: transactionMetrics,
        performance: performanceMetrics
      };

      // Check performance thresholds
      this.checkPerformanceThresholds(databaseMetrics, transactionMetrics);

      return { database: databaseMetrics, transactions: transactionMetrics, performance: performanceMetrics };
    } catch (error) {
      console.warn('⚠️  Query performance monitoring failed:', error.message);
      throw error;
    }
  }

  /**
   * Monitor system resources
   */
  async monitorSystemResources() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();

      const systemMetrics = {
        timestamp: new Date(),
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        process: {
          uptime,
          pid: process.pid
        }
      };

      this.metrics.systemResources = systemMetrics;

      // Check resource thresholds
      this.checkResourceThresholds(systemMetrics);

      return systemMetrics;
    } catch (error) {
      console.warn('⚠️  System resource monitoring failed:', error.message);
      throw error;
    }
  }

  /**
   * Calculate connection pool utilization percentage
   */
  calculateConnectionUtilization(poolInfo) {
    if (!poolInfo.connections) return 0;
    
    const { total_connections, active_connections } = poolInfo.connections;
    const maxConnections = parseInt(process.env.DB_CONNECTION_LIMIT) || 10;
    
    return {
      activePercent: total_connections ? (active_connections / total_connections * 100).toFixed(2) : 0,
      poolPercent: (total_connections / maxConnections * 100).toFixed(2)
    };
  }

  /**
   * Check connection pool against thresholds
   */
  checkConnectionThresholds(poolInfo) {
    if (!poolInfo.connections) return;

    const { total_connections, active_connections, idle_connections } = poolInfo.connections;
    const utilization = this.calculateConnectionUtilization(poolInfo);

    // Check active connection threshold
    if (active_connections > this.alertThresholds.maxActiveConnections) {
      this.createAlert('HIGH_ACTIVE_CONNECTIONS', 'medium',
        `Active connections (${active_connections}) exceed threshold (${this.alertThresholds.maxActiveConnections})`);
    }

    // Check pool utilization
    if (parseFloat(utilization.poolPercent) > this.alertThresholds.connectionUtilization) {
      this.createAlert('HIGH_CONNECTION_UTILIZATION', 'high',
        `Connection pool utilization (${utilization.poolPercent}%) exceeds threshold (${this.alertThresholds.connectionUtilization}%)`);
    }

    // Check for too many idle connections
    if (idle_connections > this.alertThresholds.maxIdleConnections) {
      this.createAlert('HIGH_IDLE_CONNECTIONS', 'low',
        `Idle connections (${idle_connections}) exceed threshold (${this.alertThresholds.maxIdleConnections})`);
    }
  }

  /**
   * Check query performance against thresholds
   */
  checkPerformanceThresholds(databaseMetrics, transactionMetrics) {
    // Check slow query percentage
    const slowQueryPercent = parseFloat(databaseMetrics.slowQueryPercentage || 0);
    if (slowQueryPercent > 10) { // > 10% slow queries
      this.createAlert('HIGH_SLOW_QUERY_RATE', 'medium',
        `Slow query rate (${slowQueryPercent}%) is elevated`);
    }

    // Check error rate
    const errorRate = parseFloat(databaseMetrics.errorRate || 0);
    if (errorRate > this.alertThresholds.queryErrorRate) {
      this.createAlert('HIGH_QUERY_ERROR_RATE', 'high',
        `Query error rate (${errorRate}%) exceeds threshold (${this.alertThresholds.queryErrorRate}%)`);
    }

    // Check transaction success rate
    const transactionSuccessRate = parseFloat(transactionMetrics.successRate || 100);
    if (transactionSuccessRate < 95) { // < 95% success rate
      this.createAlert('LOW_TRANSACTION_SUCCESS_RATE', 'high',
        `Transaction success rate (${transactionSuccessRate}%) is below acceptable level`);
    }

    // Check deadlock rate
    if (transactionMetrics.deadlocks > this.alertThresholds.deadlockThreshold) {
      this.createAlert('HIGH_DEADLOCK_RATE', 'medium',
        `Deadlock count (${transactionMetrics.deadlocks}) exceeds threshold`);
    }
  }

  /**
   * Check system resources against thresholds
   */
  checkResourceThresholds(systemMetrics) {
    // Check memory usage
    if (systemMetrics.memory.heapUsedMB > this.alertThresholds.maxMemoryUsageMB) {
      this.createAlert('HIGH_MEMORY_USAGE', 'medium',
        `Heap memory usage (${systemMetrics.memory.heapUsedMB}MB) exceeds threshold (${this.alertThresholds.maxMemoryUsageMB}MB)`);
    }

    // Check for memory leaks (heap usage growing consistently)
    this.checkMemoryLeaks(systemMetrics);
  }

  /**
   * Detect potential memory leaks
   */
  checkMemoryLeaks(currentMetrics) {
    const currentHeap = currentMetrics.memory.heapUsedMB;
    
    if (!this.previousHeapUsage) {
      this.previousHeapUsage = [];
    }
    
    this.previousHeapUsage.push({
      timestamp: new Date(),
      heapUsed: currentHeap
    });
    
    // Keep only last 10 readings
    if (this.previousHeapUsage.length > 10) {
      this.previousHeapUsage.shift();
    }
    
    // Check for consistent growth over last 10 readings
    if (this.previousHeapUsage.length >= 10) {
      const oldestHeap = this.previousHeapUsage[0].heapUsed;
      const growthRate = (currentHeap - oldestHeap) / oldestHeap * 100;
      
      if (growthRate > 50) { // > 50% growth
        this.createAlert('POTENTIAL_MEMORY_LEAK', 'high',
          `Memory usage has grown ${growthRate.toFixed(2)}% over recent monitoring cycles`);
      }
    }
  }

  /**
   * Create alert with deduplication
   */
  createAlert(type, severity, message, metadata = {}) {
    const alertKey = `${type}_${severity}`;
    const now = Date.now();
    
    // Deduplicate alerts (don't repeat same alert within 5 minutes)
    const lastAlert = this.alertHistory.get(alertKey);
    if (lastAlert && (now - lastAlert) < 5 * 60 * 1000) {
      return; // Skip duplicate alert
    }
    
    this.alertHistory.set(alertKey, now);
    
    const alert = {
      id: `alert_${now}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      metadata,
      timestamp: new Date(),
      resolved: false,
      acknowledgedAt: null,
      resolvedAt: null
    };

    this.metrics.alerts.active.push(alert);
    this.metrics.alerts.totalCount++;

    // Log alert
    const logLevel = severity === 'critical' ? 'error' : 
                   severity === 'high' ? 'error' :
                   severity === 'medium' ? 'warn' : 'info';
    
    console[logLevel](`🚨 DATABASE ALERT [${severity.toUpperCase()}] - ${type}: ${message}`, metadata);

    // Send to monitoring service if available
    if (global.monitoringService) {
      global.monitoringService[logLevel](`Database Alert: ${type}`, {
        severity,
        message,
        metadata,
        alert_id: alert.id
      });

      // Increment alert counter
      global.monitoringService.incrementCounter('database_alerts_total', {
        type,
        severity
      });
    }

    // Auto-resolve certain alerts after conditions improve
    setTimeout(() => {
      this.autoResolveAlert(alert);
    }, 60000); // Check for auto-resolution after 1 minute

    return alert;
  }

  /**
   * Attempt to auto-resolve alerts when conditions improve
   */
  async autoResolveAlert(alert) {
    if (alert.resolved) return;

    try {
      const shouldResolve = await this.checkAlertResolution(alert);
      if (shouldResolve) {
        this.resolveAlert(alert.id, 'Auto-resolved: conditions improved');
      }
    } catch (error) {
      console.warn(`⚠️  Auto-resolution check failed for alert ${alert.id}:`, error.message);
    }
  }

  /**
   * Check if alert conditions have been resolved
   */
  async checkAlertResolution(alert) {
    switch (alert.type) {
      case 'HIGH_LATENCY':
        const currentHealth = await this.performHealthCheck();
        return currentHealth.latency < this.alertThresholds.healthCheckLatency;

      case 'HIGH_MEMORY_USAGE':
        const currentMemory = process.memoryUsage();
        const currentHeapMB = Math.round(currentMemory.heapUsed / 1024 / 1024);
        return currentHeapMB < this.alertThresholds.maxMemoryUsageMB;

      default:
        return false; // Don't auto-resolve unknown alert types
    }
  }

  /**
   * Manually resolve an alert
   */
  resolveAlert(alertId, reason = 'Manually resolved') {
    const alertIndex = this.metrics.alerts.active.findIndex(alert => alert.id === alertId);
    
    if (alertIndex === -1) {
      console.warn(`⚠️  Alert ${alertId} not found in active alerts`);
      return false;
    }

    const alert = this.metrics.alerts.active[alertIndex];
    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolutionReason = reason;

    // Move to resolved alerts
    this.metrics.alerts.resolved.push(alert);
    this.metrics.alerts.active.splice(alertIndex, 1);

    console.log(`✅ Alert resolved: ${alert.type} - ${reason}`);
    return true;
  }

  /**
   * Get current monitoring status and metrics
   */
  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastHealthCheck: this.lastHealthCheck,
      consecutiveHealthFailures: this.consecutiveHealthFailures,
      alertThresholds: this.alertThresholds,
      metrics: this.metrics,
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.metrics.alerts.active.filter(alert => !alert.resolved);
  }

  /**
   * Get alert summary by severity
   */
  getAlertSummary() {
    const activeAlerts = this.getActiveAlerts();
    
    return {
      critical: activeAlerts.filter(a => a.severity === 'critical').length,
      high: activeAlerts.filter(a => a.severity === 'high').length,
      medium: activeAlerts.filter(a => a.severity === 'medium').length,
      low: activeAlerts.filter(a => a.severity === 'low').length,
      total: activeAlerts.length,
      totalResolved: this.metrics.alerts.resolved.length,
      totalAll: this.metrics.alerts.totalCount
    };
  }

  /**
   * Update consolidated metrics
   */
  updateMetrics() {
    this.metrics.healthChecks = {
      lastCheck: this.lastHealthCheck,
      consecutiveFailures: this.consecutiveHealthFailures,
      isHealthy: this.lastHealthCheck?.status === 'healthy'
    };
  }

  /**
   * Clean up old metrics to prevent memory growth
   */
  cleanupOldMetrics() {
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    
    // Clean up resolved alerts older than 6 hours
    this.metrics.alerts.resolved = this.metrics.alerts.resolved.filter(
      alert => new Date(alert.resolvedAt).getTime() > sixHoursAgo
    );

    // Clean up alert history
    for (const [key, timestamp] of this.alertHistory.entries()) {
      if (timestamp < sixHoursAgo) {
        this.alertHistory.delete(key);
      }
    }

    console.log('🧹 Old monitoring metrics cleaned up');
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      database: {
        isConnected: databaseManager.isConnected,
        metrics: databaseManager.getMetrics(),
        health: this.lastHealthCheck
      },
      transactions: transactionHandler.getMetrics(),
      system: this.metrics.systemResources,
      connectionPool: this.metrics.connectionPool,
      alerts: this.getAlertSummary(),
      monitoring: {
        isActive: this.isMonitoring,
        uptime: process.uptime()
      }
    };
  }
}

// Create singleton instance
export const databaseMonitor = new DatabaseMonitoringService();

// Export for global access
if (typeof global !== 'undefined') {
  global.databaseMonitor = databaseMonitor;
}

export default databaseMonitor;
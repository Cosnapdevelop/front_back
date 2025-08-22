import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import monitoringService from './monitoringService.js';

class ProductionAlertingService {
  constructor() {
    this.prisma = new PrismaClient();
    this.emailTransporter = null;
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 5000, // 5 seconds
      memoryUsage: 0.85, // 85% memory usage
      diskUsage: 0.90, // 90% disk usage
      consecutiveErrors: 5, // 5 consecutive errors
      criticalServiceDowntime: 60000 // 1 minute
    };
    this.alertCooldowns = new Map(); // Prevent alert spam
    this.errorBuffer = []; // Store recent errors for analysis
    this.maxErrorBuffer = 100;
    this.init();
  }

  async init() {
    try {
      // Initialize email transporter if SMTP is configured
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        this.emailTransporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        
        console.log('[Production Alerting] Email transporter initialized');
      } else {
        console.warn('[Production Alerting] SMTP not configured, alerts will be logged only');
      }
    } catch (error) {
      console.error('[Production Alerting] Initialization failed:', error);
    }
  }

  /**
   * Record an error and check if it triggers any alerts
   */
  async recordError(error, context = {}) {
    try {
      const errorRecord = {
        timestamp: new Date(),
        message: error.message,
        stack: error.stack,
        code: error.code,
        severity: this.determineSeverity(error, context),
        context: {
          userId: context.userId,
          endpoint: context.endpoint,
          userAgent: context.userAgent,
          ip: context.ip,
          ...context
        }
      };

      // Add to error buffer
      this.errorBuffer.push(errorRecord);
      if (this.errorBuffer.length > this.maxErrorBuffer) {
        this.errorBuffer.shift(); // Remove oldest error
      }

      // Store in database for long-term analysis
      await this.storeErrorInDatabase(errorRecord);

      // Check for alert conditions
      await this.checkAlertConditions();

      // Update metrics
      monitoringService.counter('production_errors_total', {
        severity: errorRecord.severity,
        endpoint: context.endpoint || 'unknown'
      }).inc();

      console.error(`[Production Error] ${errorRecord.severity.toUpperCase()}: ${errorRecord.message}`, {
        context: errorRecord.context,
        stack: errorRecord.stack?.split('\n')[0] // First line of stack trace
      });

    } catch (alertingError) {
      console.error('[Production Alerting] Failed to record error:', alertingError);
    }
  }

  /**
   * Record a performance issue
   */
  async recordPerformanceIssue(metric, value, context = {}) {
    try {
      if (metric === 'response_time' && value > this.alertThresholds.responseTime) {
        await this.sendAlert({
          type: 'performance',
          severity: 'warning',
          title: 'High Response Time Detected',
          message: `Response time of ${value}ms exceeds threshold of ${this.alertThresholds.responseTime}ms`,
          metric,
          value,
          context
        });
      }

      if (metric === 'memory_usage' && value > this.alertThresholds.memoryUsage) {
        await this.sendAlert({
          type: 'performance',
          severity: 'warning',
          title: 'High Memory Usage Detected',
          message: `Memory usage of ${(value * 100).toFixed(1)}% exceeds threshold of ${(this.alertThresholds.memoryUsage * 100)}%`,
          metric,
          value,
          context
        });
      }
    } catch (error) {
      console.error('[Production Alerting] Failed to record performance issue:', error);
    }
  }

  /**
   * Record service availability issue
   */
  async recordServiceIssue(serviceName, status, context = {}) {
    try {
      if (status === 'down' || status === 'unhealthy') {
        const alertKey = `service_${serviceName}_${status}`;
        
        if (this.shouldSendAlert(alertKey, 5 * 60 * 1000)) { // 5 minute cooldown
          await this.sendAlert({
            type: 'service',
            severity: status === 'down' ? 'critical' : 'warning',
            title: `Service ${serviceName} is ${status}`,
            message: `Critical service ${serviceName} reported status: ${status}`,
            service: serviceName,
            status,
            context
          });
        }
      }
    } catch (error) {
      console.error('[Production Alerting] Failed to record service issue:', error);
    }
  }

  /**
   * Get production health summary
   */
  async getHealthSummary() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now - 60 * 60 * 1000);
      
      // Get recent errors from buffer and database
      const recentErrors = this.errorBuffer.filter(e => e.timestamp > oneHourAgo);
      const errorsByType = recentErrors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {});

      // Get error rate
      const totalRequests = await this.getRequestCount(oneHourAgo, now);
      const errorRate = totalRequests > 0 ? recentErrors.length / totalRequests : 0;

      // Get system metrics
      const systemMetrics = this.getSystemMetrics();

      return {
        timestamp: now,
        errorRate: errorRate,
        totalErrors: recentErrors.length,
        errorsByType,
        systemMetrics,
        alerts: {
          errorRateAlert: errorRate > this.alertThresholds.errorRate,
          memoryAlert: systemMetrics.memoryUsagePercent > this.alertThresholds.memoryUsage,
          consecutiveErrorsAlert: this.hasConsecutiveErrors()
        }
      };
    } catch (error) {
      console.error('[Production Alerting] Failed to get health summary:', error);
      return { error: error.message };
    }
  }

  /**
   * Get production metrics for dashboard
   */
  async getProductionMetrics(timeRange = '1h') {
    try {
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      };

      const duration = timeRanges[timeRange] || timeRanges['1h'];
      const now = new Date();
      const startTime = new Date(now - duration);

      // Query error statistics from database
      const errorStats = await this.getErrorStatistics(startTime, now);
      
      // Get system performance metrics
      const performanceStats = this.getPerformanceStatistics(startTime, now);

      // Get alert history
      const alertHistory = await this.getAlertHistory(startTime, now);

      return {
        timeRange,
        startTime,
        endTime: now,
        errorStatistics: errorStats,
        performanceStatistics: performanceStats,
        alertHistory,
        systemHealth: this.getSystemMetrics()
      };
    } catch (error) {
      console.error('[Production Metrics] Failed to get production metrics:', error);
      return { error: error.message };
    }
  }

  // Private methods

  determineSeverity(error, context) {
    // Critical errors that require immediate attention
    if (error.code === 'ECONNREFUSED' || error.message.includes('database') || error.message.includes('payment')) {
      return 'critical';
    }

    // High severity errors
    if (error.code === 'ETIMEDOUT' || error.message.includes('API') || context.endpoint?.includes('/api/')) {
      return 'high';
    }

    // Medium severity errors
    if (error.statusCode >= 500 || error.message.includes('server')) {
      return 'medium';
    }

    // Low severity errors (client errors, validation errors)
    return 'low';
  }

  async storeErrorInDatabase(errorRecord) {
    try {
      await this.prisma.productionError.create({
        data: {
          timestamp: errorRecord.timestamp,
          message: errorRecord.message,
          stack: errorRecord.stack,
          code: errorRecord.code,
          severity: errorRecord.severity,
          context: errorRecord.context,
          endpoint: errorRecord.context.endpoint,
          userId: errorRecord.context.userId,
          ip: errorRecord.context.ip
        }
      });
    } catch (error) {
      // If database is down, don't fail the entire error recording process
      console.warn('[Production Alerting] Failed to store error in database:', error.message);
    }
  }

  async checkAlertConditions() {
    try {
      const recentErrors = this.errorBuffer.slice(-this.alertThresholds.consecutiveErrors);
      
      // Check for consecutive errors
      if (recentErrors.length === this.alertThresholds.consecutiveErrors) {
        const allRecent = recentErrors.every(e => 
          Date.now() - e.timestamp.getTime() < 60000 // Within last minute
        );
        
        if (allRecent && this.shouldSendAlert('consecutive_errors', 5 * 60 * 1000)) {
          await this.sendAlert({
            type: 'error_pattern',
            severity: 'high',
            title: 'Consecutive Errors Detected',
            message: `${this.alertThresholds.consecutiveErrors} consecutive errors detected in the last minute`,
            errors: recentErrors.map(e => ({
              message: e.message,
              timestamp: e.timestamp
            }))
          });
        }
      }

      // Check error rate
      const recentErrorCount = this.errorBuffer.filter(e => 
        Date.now() - e.timestamp.getTime() < 60000
      ).length;
      
      if (recentErrorCount > 10 && this.shouldSendAlert('high_error_rate', 10 * 60 * 1000)) {
        await this.sendAlert({
          type: 'error_rate',
          severity: 'high',
          title: 'High Error Rate Detected',
          message: `${recentErrorCount} errors in the last minute`,
          errorRate: recentErrorCount
        });
      }
    } catch (error) {
      console.error('[Production Alerting] Failed to check alert conditions:', error);
    }
  }

  shouldSendAlert(alertKey, cooldownMs) {
    const now = Date.now();
    const lastSent = this.alertCooldowns.get(alertKey);
    
    if (!lastSent || (now - lastSent) > cooldownMs) {
      this.alertCooldowns.set(alertKey, now);
      return true;
    }
    
    return false;
  }

  async sendAlert(alert) {
    try {
      console.error(`[PRODUCTION ALERT] ${alert.severity.toUpperCase()}: ${alert.title}`, alert);

      // Store alert in database
      await this.storeAlert(alert);

      // Send email if configured
      if (this.emailTransporter && process.env.ALERT_EMAIL) {
        await this.sendEmailAlert(alert);
      }

      // Update metrics
      monitoringService.counter('production_alerts_total', {
        type: alert.type,
        severity: alert.severity
      }).inc();

    } catch (error) {
      console.error('[Production Alerting] Failed to send alert:', error);
    }
  }

  async sendEmailAlert(alert) {
    try {
      const subject = `[Cosnap AI - ${alert.severity.toUpperCase()}] ${alert.title}`;
      const html = this.generateAlertEmailHTML(alert);

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL,
        subject,
        html
      });

      console.log(`[Production Alerting] Email alert sent for: ${alert.title}`);
    } catch (error) {
      console.error('[Production Alerting] Failed to send email alert:', error);
    }
  }

  generateAlertEmailHTML(alert) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${alert.severity === 'critical' ? '#dc3545' : alert.severity === 'high' ? '#fd7e14' : '#ffc107'}; color: white; padding: 20px;">
          <h1 style="margin: 0;">🚨 Production Alert</h1>
          <h2 style="margin: 10px 0 0 0;">${alert.title}</h2>
        </div>
        
        <div style="padding: 20px; background-color: #f8f9fa;">
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        </div>
        
        <div style="padding: 20px;">
          <h3>Details:</h3>
          <p>${alert.message}</p>
          
          ${alert.context ? `
            <h3>Context:</h3>
            <pre style="background-color: #f8f9fa; padding: 10px; overflow-x: auto;">${JSON.stringify(alert.context, null, 2)}</pre>
          ` : ''}
          
          ${alert.errors ? `
            <h3>Recent Errors:</h3>
            <ul>
              ${alert.errors.map(err => `<li>${err.timestamp}: ${err.message}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
        
        <div style="padding: 20px; background-color: #e9ecef; text-align: center;">
          <p><small>This is an automated alert from Cosnap AI Production Monitoring</small></p>
        </div>
      </div>
    `;
  }

  async storeAlert(alert) {
    try {
      await this.prisma.productionAlert.create({
        data: {
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          context: alert.context || {},
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.warn('[Production Alerting] Failed to store alert in database:', error.message);
    }
  }

  getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      uptime: uptime,
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
        external: memoryUsage.external
      },
      memoryUsagePercent: memoryUsage.heapUsed / memoryUsage.heapTotal,
      pid: process.pid,
      nodeVersion: process.version
    };
  }

  async getRequestCount(startTime, endTime) {
    try {
      // This would typically come from your analytics or metrics system
      // For now, we'll estimate based on error buffer
      return Math.max(this.errorBuffer.length * 20, 100); // Rough estimate
    } catch (error) {
      return 0;
    }
  }

  hasConsecutiveErrors() {
    const recent = this.errorBuffer.slice(-3);
    return recent.length === 3 && 
           recent.every(e => Date.now() - e.timestamp.getTime() < 60000);
  }

  async getErrorStatistics(startTime, endTime) {
    try {
      const errors = await this.prisma.productionError.findMany({
        where: {
          timestamp: {
            gte: startTime,
            lte: endTime
          }
        },
        select: {
          severity: true,
          endpoint: true,
          timestamp: true,
          code: true
        }
      });

      const stats = {
        total: errors.length,
        bySeverity: {},
        byEndpoint: {},
        byCode: {},
        timeline: this.generateErrorTimeline(errors, startTime, endTime)
      };

      errors.forEach(error => {
        stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
        stats.byEndpoint[error.endpoint] = (stats.byEndpoint[error.endpoint] || 0) + 1;
        stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1;
      });

      return stats;
    } catch (error) {
      return { total: 0, error: error.message };
    }
  }

  getPerformanceStatistics(startTime, endTime) {
    // This would typically come from your monitoring system
    // For now, return current system metrics
    return {
      averageResponseTime: 250, // Would come from metrics
      p95ResponseTime: 500,
      p99ResponseTime: 1000,
      throughput: 100, // requests per minute
      systemMetrics: this.getSystemMetrics()
    };
  }

  async getAlertHistory(startTime, endTime) {
    try {
      return await this.prisma.productionAlert.findMany({
        where: {
          timestamp: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 50
      });
    } catch (error) {
      return [];
    }
  }

  generateErrorTimeline(errors, startTime, endTime) {
    const buckets = 24; // 24 time buckets
    const bucketSize = (endTime - startTime) / buckets;
    const timeline = [];

    for (let i = 0; i < buckets; i++) {
      const bucketStart = new Date(startTime.getTime() + (i * bucketSize));
      const bucketEnd = new Date(startTime.getTime() + ((i + 1) * bucketSize));
      
      const bucketErrors = errors.filter(e => 
        e.timestamp >= bucketStart && e.timestamp < bucketEnd
      );

      timeline.push({
        timestamp: bucketStart,
        count: bucketErrors.length
      });
    }

    return timeline;
  }
}

export default new ProductionAlertingService();
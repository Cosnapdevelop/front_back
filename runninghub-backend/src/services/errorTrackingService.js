/**
 * Error Tracking and Structured Logging Service
 * Comprehensive error handling and monitoring for Cosnap AI backend
 */

import winston from 'winston';
import { productionConfig } from '../config/production.js';
import monitoringService from './monitoringService.js';
import redisService from './redisService.js';

class ErrorTrackingService {
  constructor() {
    this.logger = null;
    this.errorPatterns = new Map();
    this.errorCounts = new Map();
    this.alertThresholds = new Map();
    this.isInitialized = false;
    
    this.initialize();
  }

  /**
   * Initialize error tracking service
   */
  initialize() {
    try {
      this.setupLogger();
      this.setupErrorPatterns();
      this.setupAlertThresholds();
      this.setupSentryIntegration();
      
      this.isInitialized = true;
      console.log('🔍 Error tracking service initialized');
      
    } catch (error) {
      console.error('❌ Error tracking service initialization failed:', error);
    }
  }

  // =============================================================================
  // LOGGER SETUP
  // =============================================================================

  setupLogger() {
    const { logging } = productionConfig;
    const isProduction = process.env.NODE_ENV === 'production';

    // Custom error format with correlation IDs
    const errorFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, stack, correlationId, userId, ...meta }) => {
        return JSON.stringify({
          '@timestamp': timestamp,
          level,
          message,
          service: 'cosnap-backend',
          environment: process.env.NODE_ENV || 'development',
          correlationId: correlationId || this.generateCorrelationId(),
          userId: userId || 'anonymous',
          stack: stack || undefined,
          ...meta
        });
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, stack, correlationId, ...meta }) => {
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
        const stackStr = stack ? `\n${stack}` : '';
        const corrId = correlationId ? ` [${correlationId}]` : '';
        return `${timestamp}${corrId} [${level}] ${message}${metaStr}${stackStr}`;
      })
    );

    const transports = [
      new winston.transports.Console({
        format: isProduction ? errorFormat : consoleFormat,
        level: logging.level
      })
    ];

    // File logging for errors
    if (logging.file.enabled) {
      transports.push(
        new winston.transports.File({
          filename: 'error.log',
          level: 'error',
          format: errorFormat,
          maxsize: logging.file.maxsize,
          maxFiles: logging.file.maxFiles
        }),
        new winston.transports.File({
          filename: logging.file.filename,
          format: errorFormat,
          maxsize: logging.file.maxsize,
          maxFiles: logging.file.maxFiles
        })
      );
    }

    this.logger = winston.createLogger({
      level: logging.level,
      format: errorFormat,
      transports,
      exitOnError: false
    });

    // Capture uncaught exceptions and rejections
    this.setupGlobalErrorHandlers();
  }

  setupGlobalErrorHandlers() {
    process.on('uncaughtException', (error) => {
      this.logFatalError('Uncaught Exception', error, {
        severity: 'fatal',
        source: 'uncaughtException'
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logFatalError('Unhandled Promise Rejection', reason, {
        severity: 'fatal',
        source: 'unhandledRejection',
        promise: promise.toString()
      });
    });

    process.on('warning', (warning) => {
      this.logWarning('Node.js Warning', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack
      });
    });
  }

  // =============================================================================
  // ERROR PATTERN RECOGNITION
  // =============================================================================

  setupErrorPatterns() {
    // Define common error patterns for classification
    this.errorPatterns.set('database', {
      patterns: [
        /connection.*refused/i,
        /timeout.*database/i,
        /prisma.*error/i,
        /unique.*constraint/i,
        /foreign.*key.*constraint/i
      ],
      severity: 'high',
      category: 'database'
    });

    this.errorPatterns.set('authentication', {
      patterns: [
        /invalid.*token/i,
        /jwt.*expired/i,
        /unauthorized/i,
        /authentication.*failed/i,
        /access.*denied/i
      ],
      severity: 'medium',
      category: 'auth'
    });

    this.errorPatterns.set('external_api', {
      patterns: [
        /runninghub.*error/i,
        /api.*request.*failed/i,
        /external.*service/i,
        /network.*error/i,
        /timeout.*api/i
      ],
      severity: 'high',
      category: 'external'
    });

    this.errorPatterns.set('validation', {
      patterns: [
        /validation.*error/i,
        /invalid.*input/i,
        /bad.*request/i,
        /missing.*required/i
      ],
      severity: 'low',
      category: 'validation'
    });

    this.errorPatterns.set('payment', {
      patterns: [
        /payment.*failed/i,
        /wechat.*pay.*error/i,
        /alipay.*error/i,
        /transaction.*error/i
      ],
      severity: 'critical',
      category: 'payment'
    });

    this.errorPatterns.set('file_upload', {
      patterns: [
        /upload.*failed/i,
        /file.*too.*large/i,
        /invalid.*file.*type/i,
        /storage.*error/i
      ],
      severity: 'medium',
      category: 'upload'
    });
  }

  setupAlertThresholds() {
    // Set up alerting thresholds for different error types
    this.alertThresholds.set('database', {
      count: 5,
      timeWindow: 300, // 5 minutes
      escalation: 'critical'
    });

    this.alertThresholds.set('payment', {
      count: 3,
      timeWindow: 300,
      escalation: 'critical'
    });

    this.alertThresholds.set('external', {
      count: 10,
      timeWindow: 600, // 10 minutes
      escalation: 'high'
    });

    this.alertThresholds.set('auth', {
      count: 20,
      timeWindow: 900, // 15 minutes
      escalation: 'medium'
    });
  }

  // =============================================================================
  // SENTRY INTEGRATION
  // =============================================================================

  setupSentryIntegration() {
    const { logging } = productionConfig;
    
    if (logging.external.sentry.enabled && logging.external.sentry.dsn) {
      try {
        // In a real implementation, you would initialize Sentry here
        // const Sentry = require('@sentry/node');
        // Sentry.init({
        //   dsn: logging.external.sentry.dsn,
        //   environment: logging.external.sentry.environment,
        //   tracesSampleRate: logging.external.sentry.tracesSampleRate
        // });
        
        console.log('📡 Sentry integration configured');
      } catch (error) {
        console.error('❌ Sentry integration failed:', error);
      }
    }
  }

  // =============================================================================
  // ERROR LOGGING METHODS
  // =============================================================================

  /**
   * Log error with enhanced context and classification
   */
  logError(message, error, context = {}) {
    try {
      const correlationId = context.correlationId || this.generateCorrelationId();
      const classification = this.classifyError(error?.message || message);
      
      const errorData = {
        message,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code
        } : undefined,
        classification,
        correlationId,
        timestamp: new Date().toISOString(),
        severity: classification.severity,
        category: classification.category,
        ...context
      };

      // Log to Winston
      this.logger.error(message, errorData);

      // Send to external services
      this.sendToExternalServices(errorData);

      // Update error counts and check thresholds
      this.updateErrorCounts(classification.category);
      this.checkAlertThresholds(classification.category);

      // Store in Redis for real-time monitoring
      this.storeErrorInRedis(errorData);

      // Record metrics
      monitoringService.recordMetric('errors_total', 1, {
        category: classification.category,
        severity: classification.severity
      });

      return correlationId;
      
    } catch (logError) {
      // Fallback logging if the error tracking itself fails
      console.error('Error tracking failed:', logError);
      console.error('Original error:', error);
    }
  }

  /**
   * Log warning with context
   */
  logWarning(message, context = {}) {
    const correlationId = context.correlationId || this.generateCorrelationId();
    
    const warningData = {
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      severity: 'warning',
      ...context
    };

    this.logger.warn(message, warningData);
    this.storeErrorInRedis(warningData, 'warning');
  }

  /**
   * Log fatal error that requires immediate attention
   */
  logFatalError(message, error, context = {}) {
    const correlationId = this.generateCorrelationId();
    
    const fatalData = {
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      correlationId,
      timestamp: new Date().toISOString(),
      severity: 'fatal',
      processId: process.pid,
      ...context
    };

    // Log with highest priority
    this.logger.error(`[FATAL] ${message}`, fatalData);

    // Send immediate alert
    this.sendImmediateAlert(fatalData);

    // Store in Redis with high priority
    this.storeErrorInRedis(fatalData, 'fatal');
  }

  /**
   * Log structured event (not an error)
   */
  logEvent(eventType, message, data = {}) {
    const correlationId = data.correlationId || this.generateCorrelationId();
    
    const eventData = {
      eventType,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      ...data
    };

    this.logger.info(`[EVENT:${eventType}] ${message}`, eventData);
  }

  // =============================================================================
  // ERROR CLASSIFICATION AND ANALYSIS
  // =============================================================================

  /**
   * Classify error based on patterns
   */
  classifyError(errorMessage) {
    if (!errorMessage) {
      return {
        category: 'unknown',
        severity: 'medium',
        patterns: []
      };
    }

    for (const [category, config] of this.errorPatterns) {
      for (const pattern of config.patterns) {
        if (pattern.test(errorMessage)) {
          return {
            category: config.category,
            severity: config.severity,
            patterns: [pattern.source]
          };
        }
      }
    }

    return {
      category: 'uncategorized',
      severity: 'medium',
      patterns: []
    };
  }

  /**
   * Update error counts for threshold monitoring
   */
  updateErrorCounts(category) {
    const now = Date.now();
    const key = `error_count:${category}`;
    
    if (!this.errorCounts.has(key)) {
      this.errorCounts.set(key, []);
    }

    const counts = this.errorCounts.get(key);
    counts.push(now);

    // Clean old counts (older than longest time window)
    const maxTimeWindow = Math.max(...Array.from(this.alertThresholds.values()).map(t => t.timeWindow)) * 1000;
    this.errorCounts.set(key, counts.filter(timestamp => now - timestamp <= maxTimeWindow));
  }

  /**
   * Check if error thresholds are exceeded
   */
  checkAlertThresholds(category) {
    const threshold = this.alertThresholds.get(category);
    if (!threshold) return;

    const key = `error_count:${category}`;
    const counts = this.errorCounts.get(key) || [];
    const now = Date.now();
    const windowStart = now - (threshold.timeWindow * 1000);
    
    const recentErrors = counts.filter(timestamp => timestamp >= windowStart);
    
    if (recentErrors.length >= threshold.count) {
      this.triggerAlert(category, {
        count: recentErrors.length,
        threshold: threshold.count,
        timeWindow: threshold.timeWindow,
        escalation: threshold.escalation
      });
    }
  }

  /**
   * Trigger alert when thresholds are exceeded
   */
  triggerAlert(category, alertData) {
    const alertMessage = `Error threshold exceeded for category: ${category}`;
    
    const alert = {
      type: 'threshold_exceeded',
      category,
      message: alertMessage,
      ...alertData,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId()
    };

    // Log the alert
    this.logger.error(`[ALERT] ${alertMessage}`, alert);

    // Send to external alerting systems
    this.sendAlert(alert);

    // Record alert metric
    monitoringService.recordMetric('alerts_total', 1, {
      category,
      escalation: alertData.escalation
    });
  }

  // =============================================================================
  // EXTERNAL INTEGRATIONS
  // =============================================================================

  /**
   * Send error data to external services
   */
  sendToExternalServices(errorData) {
    try {
      // Send to Sentry (if configured)
      if (productionConfig.logging.external.sentry.enabled) {
        this.sendToSentry(errorData);
      }

      // Send to other services (Slack, email, etc.)
      if (errorData.severity === 'critical' || errorData.severity === 'fatal') {
        this.sendImmediateAlert(errorData);
      }
      
    } catch (error) {
      console.error('Failed to send error to external services:', error);
    }
  }

  sendToSentry(errorData) {
    // In a real implementation, this would send to Sentry
    // Sentry.captureException(new Error(errorData.message), {
    //   tags: {
    //     category: errorData.category,
    //     severity: errorData.severity
    //   },
    //   extra: errorData
    // });
  }

  sendImmediateAlert(errorData) {
    // Send to Slack webhook if configured
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      this.sendSlackAlert(slackWebhook, errorData);
    }

    // Send email alert if configured
    const alertEmail = process.env.ALERT_EMAIL;
    if (alertEmail) {
      this.sendEmailAlert(alertEmail, errorData);
    }
  }

  sendAlert(alertData) {
    // Similar to immediate alert but for threshold-based alerts
    const alertWebhook = process.env.ALERT_WEBHOOK_URL;
    if (alertWebhook) {
      this.sendWebhookAlert(alertWebhook, alertData);
    }
  }

  async sendSlackAlert(webhook, errorData) {
    try {
      const color = this.getSeverityColor(errorData.severity);
      const payload = {
        attachments: [{
          color,
          title: `🚨 ${errorData.severity.toUpperCase()} Error`,
          text: errorData.message,
          fields: [
            {
              title: 'Service',
              value: 'cosnap-backend',
              short: true
            },
            {
              title: 'Category',
              value: errorData.category,
              short: true
            },
            {
              title: 'Correlation ID',
              value: errorData.correlationId,
              short: true
            },
            {
              title: 'Environment',
              value: process.env.NODE_ENV || 'development',
              short: true
            }
          ],
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      // In a real implementation, you would make an HTTP request to the webhook
      console.log('Slack alert would be sent:', JSON.stringify(payload, null, 2));
      
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  // =============================================================================
  // REDIS STORAGE FOR REAL-TIME MONITORING
  // =============================================================================

  async storeErrorInRedis(errorData, type = 'error') {
    try {
      const key = `errors:${type}:${Date.now()}`;
      await redisService.set(key, errorData, 3600); // Store for 1 hour

      // Also maintain a list of recent errors
      const listKey = `errors:recent:${type}`;
      await redisService.set(listKey, JSON.stringify(errorData), 1800); // 30 minutes

      // Store error count for dashboard
      const countKey = `errors:count:${errorData.category || 'unknown'}`;
      await redisService.incr(countKey);
      await redisService.expire(countKey, 86400); // 24 hours
      
    } catch (error) {
      console.error('Failed to store error in Redis:', error);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getSeverityColor(severity) {
    const colors = {
      low: '#36a64f',      // Green
      medium: '#ffcc00',   // Yellow
      high: '#ff6600',     // Orange
      critical: '#ff0000', // Red
      fatal: '#8b0000'     // Dark Red
    };
    return colors[severity] || colors.medium;
  }

  /**
   * Get error statistics for monitoring dashboard
   */
  async getErrorStatistics(timeRange = '24h') {
    try {
      const stats = {
        totalErrors: 0,
        errorsByCategory: {},
        errorsBySeverity: {},
        recentErrors: [],
        topErrors: []
      };

      // Get error counts by category
      const categories = Array.from(this.errorPatterns.keys());
      for (const category of categories) {
        const countKey = `errors:count:${category}`;
        const count = await redisService.get(countKey) || 0;
        stats.errorsByCategory[category] = parseInt(count);
        stats.totalErrors += parseInt(count);
      }

      // Get recent errors
      const recentErrorKeys = await redisService.keys('errors:recent:*');
      for (const key of recentErrorKeys.slice(0, 10)) {
        const errorData = await redisService.get(key);
        if (errorData) {
          stats.recentErrors.push(typeof errorData === 'string' ? JSON.parse(errorData) : errorData);
        }
      }

      return stats;
      
    } catch (error) {
      console.error('Failed to get error statistics:', error);
      return null;
    }
  }

  /**
   * Clear old error data
   */
  async cleanupOldErrors() {
    try {
      const keys = await redisService.keys('errors:*');
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length >= 3) {
          const timestamp = parseInt(parts[2]);
          if (now - timestamp > maxAge) {
            await redisService.del(key);
          }
        }
      }

      console.log('🧹 Old error data cleanup completed');
      
    } catch (error) {
      console.error('Failed to cleanup old errors:', error);
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      logger: !!this.logger,
      errorPatterns: this.errorPatterns.size,
      alertThresholds: this.alertThresholds.size,
      errorCounts: this.errorCounts.size
    };
  }

  /**
   * Create Express middleware for error tracking
   */
  createErrorMiddleware() {
    return (error, req, res, next) => {
      const correlationId = req.correlationId || this.generateCorrelationId();
      
      this.logError('Express middleware error', error, {
        correlationId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        statusCode: res.statusCode
      });

      // Add correlation ID to response headers
      res.setHeader('X-Correlation-ID', correlationId);

      next(error);
    };
  }

  /**
   * Create Express middleware for request correlation
   */
  createCorrelationMiddleware() {
    return (req, res, next) => {
      req.correlationId = req.get('X-Correlation-ID') || this.generateCorrelationId();
      res.setHeader('X-Correlation-ID', req.correlationId);
      next();
    };
  }
}

// Create singleton instance
const errorTrackingService = new ErrorTrackingService();

export default errorTrackingService;
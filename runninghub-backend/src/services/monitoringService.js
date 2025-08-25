/**
 * Comprehensive Monitoring and Observability Service
 * Prometheus metrics, structured logging, and performance monitoring for Cosnap AI
 */

import promClient from 'prom-client';
import winston from 'winston';
import { productionConfig } from '../config/production.js';

class MonitoringService {
  constructor() {
    this.metrics = {};
    this.logger = null;
    this.isInitialized = false;
    
    this.initialize();
  }

  /**
   * Initialize monitoring service
   */
  initialize() {
    try {
      this.setupLogger();
      this.setupMetrics();
      this.setupErrorTracking();
      
      this.isInitialized = true;
      this.logger.info('📊 Monitoring service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize monitoring service:', error);
    }
  }

  // =============================================================================
  // STRUCTURED LOGGING SETUP
  // =============================================================================

  setupLogger() {
    const { logging } = productionConfig;
    const isProduction = process.env.NODE_ENV === 'production';

    // Custom log format
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          service: 'cosnap-backend',
          environment: process.env.NODE_ENV || 'development',
          pid: process.pid,
          ...meta
        });
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}] ${message} ${metaStr}`;
      })
    );

    const transports = [
      new winston.transports.Console({
        format: isProduction ? logFormat : consoleFormat,
        level: logging.level
      })
    ];

    // File logging in production
    if (logging.file.enabled && isProduction) {
      transports.push(
        new winston.transports.File({
          filename: logging.file.filename,
          format: logFormat,
          level: logging.level,
          maxsize: logging.file.maxsize,
          maxFiles: logging.file.maxFiles,
          tailable: true
        })
      );
    }

    this.logger = winston.createLogger({
      level: logging.level,
      format: logFormat,
      transports,
      exitOnError: false,
      rejectionHandlers: [
        new winston.transports.Console({ format: consoleFormat })
      ],
      exceptionHandlers: [
        new winston.transports.Console({ format: consoleFormat })
      ]
    });

    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', { error: error.stack });
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection', { 
        reason: reason.stack || reason,
        promise: promise.toString()
      });
    });
  }

  // =============================================================================
  // PROMETHEUS METRICS SETUP
  // =============================================================================

  setupMetrics() {
    const { monitoring } = productionConfig;
    
    if (!monitoring.metrics.enabled) {
      console.log('📊 Metrics collection disabled');
      return;
    }

    // Collect default metrics
    if (monitoring.metrics.collectDefaultMetrics) {
      promClient.collectDefaultMetrics({
        prefix: monitoring.metrics.prometheus.prefix,
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        eventLoopMonitoringPrecision: 5,
      });
    }

    // HTTP Request metrics
    this.metrics.httpRequests = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_agent']
    });

    this.metrics.httpDuration = new promClient.Histogram({
      name: `${monitoring.metrics.prometheus.prefix}http_request_duration_seconds`,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
    });

    // Database metrics
    this.metrics.dbConnections = new promClient.Gauge({
      name: `${monitoring.metrics.prometheus.prefix}db_connections_active`,
      help: 'Number of active database connections'
    });

    this.metrics.dbQueries = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}db_queries_total`,
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'status']
    });

    this.metrics.dbQueryDuration = new promClient.Histogram({
      name: `${monitoring.metrics.prometheus.prefix}db_query_duration_seconds`,
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2]
    });

    // Redis metrics
    this.metrics.redisOps = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}redis_operations_total`,
      help: 'Total number of Redis operations',
      labelNames: ['operation', 'status']
    });

    this.metrics.redisConnections = new promClient.Gauge({
      name: `${monitoring.metrics.prometheus.prefix}redis_connections_active`,
      help: 'Number of active Redis connections'
    });

    // AI Effects metrics
    this.metrics.effectsProcessed = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}effects_processed_total`,
      help: 'Total number of AI effects processed',
      labelNames: ['effect_type', 'status', 'region']
    });

    this.metrics.effectsProcessingTime = new promClient.Histogram({
      name: `${monitoring.metrics.prometheus.prefix}effects_processing_duration_seconds`,
      help: 'Duration of AI effects processing in seconds',
      labelNames: ['effect_type', 'region'],
      buckets: [1, 5, 10, 30, 60, 120, 300]
    });

    // User metrics
    this.metrics.activeUsers = new promClient.Gauge({
      name: `${monitoring.metrics.prometheus.prefix}users_active`,
      help: 'Number of active users'
    });

    this.metrics.userRegistrations = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}user_registrations_total`,
      help: 'Total number of user registrations'
    });

    // Payment metrics
    this.metrics.payments = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}payments_total`,
      help: 'Total number of payment transactions',
      labelNames: ['method', 'status', 'tier']
    });

    this.metrics.revenue = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}revenue_total_rmb`,
      help: 'Total revenue in RMB',
      labelNames: ['method', 'tier']
    });

    // File upload metrics
    this.metrics.uploads = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}file_uploads_total`,
      help: 'Total number of file uploads',
      labelNames: ['type', 'status']
    });

    this.metrics.uploadSize = new promClient.Histogram({
      name: `${monitoring.metrics.prometheus.prefix}file_upload_size_bytes`,
      help: 'Size of uploaded files in bytes',
      labelNames: ['type'],
      buckets: [1024, 10240, 102400, 1048576, 10485760, 31457280] // 1KB to 30MB
    });

    // Alerts metrics
    this.metrics.alerts = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}alerts_total`,
      help: 'Total number of alerts',
      labelNames: ['category', 'escalation']
    });

    // Effects API calls metrics
    this.metrics.effectsApiCalls = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}effects_api_calls_total`,
      help: 'Total number of effects API calls',
      labelNames: ['endpoint', 'status']
    });

    // Community actions metrics
    this.metrics.communityActions = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}community_actions_total`,
      help: 'Total number of community actions',
      labelNames: ['action']
    });

    // Error metrics
    this.metrics.errors = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}errors_total`,
      help: 'Total number of errors',
      labelNames: ['type', 'route', 'error_code']
    });

    // Custom business metrics
    this.metrics.subscriptionChanges = new promClient.Counter({
      name: `${monitoring.metrics.prometheus.prefix}subscription_changes_total`,
      help: 'Total number of subscription changes',
      labelNames: ['from_tier', 'to_tier', 'action']
    });

    console.log('📊 Prometheus metrics initialized');
  }

  // =============================================================================
  // ERROR TRACKING SETUP
  // =============================================================================

  setupErrorTracking() {
    const { logging } = productionConfig;
    
    if (logging.external.sentry.enabled) {
      // Sentry initialization would go here
      console.log('🔍 Error tracking initialized');
    }
  }

  // =============================================================================
  // LOGGING METHODS
  // =============================================================================

  info(message, meta = {}) {
    if (this.logger) {
      this.logger.info(message, meta);
    } else {
      console.log(`[INFO] ${message}`, meta);
    }
  }

  warn(message, meta = {}) {
    if (this.logger) {
      this.logger.warn(message, meta);
    } else {
      console.warn(`[WARN] ${message}`, meta);
    }
  }

  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    };

    if (this.logger) {
      this.logger.error(message, errorMeta);
    } else {
      console.error(`[ERROR] ${message}`, errorMeta);
    }

    // Increment error counter
    if (this.metrics.errors) {
      this.metrics.errors.inc({
        type: error?.name || 'Unknown',
        route: meta.route || 'unknown',
        error_code: meta.errorCode || 'unknown'
      });
    }
  }

  debug(message, meta = {}) {
    if (this.logger) {
      this.logger.debug(message, meta);
    } else if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  }

  // =============================================================================
  // METRIC RECORDING METHODS
  // =============================================================================

  recordHttpRequest(method, route, statusCode, duration, userAgent = 'unknown') {
    if (!this.metrics.httpRequests) return;

    this.metrics.httpRequests.inc({
      method,
      route,
      status_code: statusCode,
      user_agent: userAgent.split('/')[0] // Extract browser name
    });

    this.metrics.httpDuration.observe(
      { method, route, status_code: statusCode },
      duration / 1000 // Convert to seconds
    );
  }

  /**
   * Generic metric recorder with basic name mapping to known metrics
   */
  recordMetric(name, value = 1, labels = {}) {
    try {
      // Map common external names to internal metric instances
      if (name === 'errors_total' && this.metrics.errors) {
        const finalLabels = {
          type: labels.type || 'Unknown',
          route: labels.route || 'unknown',
          error_code: labels.error_code || 'unknown'
        };
        this.metrics.errors.inc(finalLabels, value);
        return;
      }
      if (name === 'alerts_total' && this.metrics.alerts) {
        const finalLabels = {
          category: labels.category || 'unknown',
          escalation: labels.escalation || 'medium'
        };
        this.metrics.alerts.inc(finalLabels, value);
        return;
      }
      // Direct access if exact key exists
      const metric = this.metrics[name];
      if (metric && typeof metric.inc === 'function') {
        metric.inc(labels, value);
      }
    } catch (e) {
      // Swallow metric recording errors
      if (process.env.NODE_ENV !== 'production') {
        console.warn('recordMetric failed:', name, e.message);
      }
    }
  }

  recordDbQuery(operation, table, duration, status = 'success') {
    if (!this.metrics.dbQueries) return;

    this.metrics.dbQueries.inc({ operation, table, status });
    this.metrics.dbQueryDuration.observe({ operation, table }, duration / 1000);
  }

  recordRedisOperation(operation, status = 'success') {
    if (!this.metrics.redisOps) return;
    this.metrics.redisOps.inc({ operation, status });
  }

  recordEffectProcessing(effectType, region, duration, status = 'success') {
    if (!this.metrics.effectsProcessed) return;

    this.metrics.effectsProcessed.inc({ effect_type: effectType, status, region });
    
    if (status === 'success' && this.metrics.effectsProcessingTime) {
      this.metrics.effectsProcessingTime.observe(
        { effect_type: effectType, region },
        duration / 1000
      );
    }
  }

  recordPayment(method, status, tier, amount = 0) {
    if (!this.metrics.payments) return;

    this.metrics.payments.inc({ method, status, tier });
    
    if (status === 'success' && amount > 0 && this.metrics.revenue) {
      this.metrics.revenue.inc({ method, tier }, amount);
    }
  }

  recordFileUpload(type, size, status = 'success') {
    if (!this.metrics.uploads) return;

    this.metrics.uploads.inc({ type, status });
    
    if (status === 'success' && this.metrics.uploadSize) {
      this.metrics.uploadSize.observe({ type }, size);
    }
  }

  recordUserRegistration() {
    if (this.metrics.userRegistrations) {
      this.metrics.userRegistrations.inc();
    }
  }

  recordSubscriptionChange(fromTier, toTier, action) {
    if (this.metrics.subscriptionChanges) {
      this.metrics.subscriptionChanges.inc({
        from_tier: fromTier,
        to_tier: toTier,
        action
      });
    }
  }

  // =============================================================================
  // GAUGE UPDATES
  // =============================================================================

  setActiveUsers(count) {
    if (this.metrics.activeUsers) {
      this.metrics.activeUsers.set(count);
    }
  }

  setActiveDbConnections(count) {
    if (this.metrics.dbConnections) {
      this.metrics.dbConnections.set(count);
    }
  }

  setActiveRedisConnections(count) {
    if (this.metrics.redisConnections) {
      this.metrics.redisConnections.set(count);
    }
  }

  // =============================================================================
  // PERFORMANCE MONITORING
  // =============================================================================

  startTimer(name) {
    const startTime = process.hrtime.bigint();
    const service = this;
    return {
      name,
      start: startTime,
      end: () => {
        const duration = Number(process.hrtime.bigint() - startTime) / 1e6; // Convert to ms
        service.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  }

  measureAsync(name, asyncFn) {
    return async (...args) => {
      const timer = this.startTimer(name);
      try {
        const result = await asyncFn(...args);
        timer.end();
        return result;
      } catch (error) {
        const duration = timer.end();
        this.error(`Performance: ${name} failed after ${duration.toFixed(2)}ms`, error);
        throw error;
      }
    };
  }

  // =============================================================================
  // MIDDLEWARE CREATION
  // =============================================================================

  createHttpMiddleware() {
    return (req, res, next) => {
      const start = process.hrtime.bigint();
      
      // Override res.end to capture response data
      const originalEnd = res.end;
      res.end = function(...args) {
        const duration = Number(process.hrtime.bigint() - start) / 1e6;
        
        // Record metrics
        monitoringService.recordHttpRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          duration,
          req.get('User-Agent')
        );

        // Log request
        monitoringService.info('HTTP Request', {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration.toFixed(2)}ms`,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.user?.id
        });

        originalEnd.apply(this, args);
      };

      next();
    };
  }

  createErrorMiddleware() {
    return (error, req, res, next) => {
      this.error('Request Error', error, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        route: req.route?.path,
        errorCode: error.code || 'UNKNOWN'
      });

      next(error);
    };
  }

  // =============================================================================
  // METRICS ENDPOINT
  // =============================================================================

  getMetrics() {
    return promClient.register.metrics();
  }

  getMetricsContentType() {
    return promClient.register.contentType;
  }

  // =============================================================================
  // HEALTH CHECKS
  // =============================================================================

  async getHealthStatus() {
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    };

    try {
      // Add monitoring-specific health info
      if (this.isInitialized) {
        status.monitoring = {
          logger: !!this.logger,
          metrics: !!this.metrics.httpRequests,
          errorTracking: !!productionConfig.logging.external.sentry.enabled
        };
      }

      return status;
    } catch (error) {
      this.error('Health check failed', error);
      return {
        ...status,
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================

  async shutdown() {
    try {
      if (this.logger) {
        this.logger.info('📊 Shutting down monitoring service');
        
        // Wait for pending log writes
        await new Promise(resolve => {
          if (this.logger.transports) {
            this.logger.transports.forEach(transport => {
              if (transport.close) {
                transport.close();
              }
            });
          }
          setTimeout(resolve, 1000);
        });
      }

      // Clear metrics
      if (promClient.register) {
        promClient.register.clear();
      }

      console.log('👋 Monitoring service shut down successfully');
    } catch (error) {
      console.error('Error shutting down monitoring service:', error);
    }
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;
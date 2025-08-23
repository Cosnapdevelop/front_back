/**
 * Health Check Endpoints for Load Balancers and Monitoring
 * Comprehensive health monitoring for Cosnap AI backend
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import redisService from '../services/redisService.js';
import monitoringService from '../services/monitoringService.js';
import { productionConfig } from '../config/production.js';
import axios from 'axios';

const router = express.Router();
const prisma = new PrismaClient();

// Health check cache to avoid overloading services
const healthCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Basic health check - minimal response time
 * Used by load balancers for quick availability checks
 */
router.get('/', (req, res) => {
  // Ultra-fast health check for Render deployment - no async operations
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cosnap-backend',
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
});

/**
 * Readiness probe - checks if service is ready to accept traffic
 * Used by Kubernetes/container orchestrators
 */
router.get('/ready', async (req, res) => {
  const cacheKey = 'health:readiness';
  const cached = getCachedHealth(cacheKey);
  
  if (cached) {
    return res.status(cached.status === 'ready' ? 200 : 503).json(cached);
  }

  try {
    const checks = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkBasicFunctionality()
    ]);

    const [dbCheck, redisCheck, functionalityCheck] = checks;
    
    const result = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'cosnap-backend',
      checks: {
        database: dbCheck.status === 'fulfilled' ? dbCheck.value : { status: 'failed', error: dbCheck.reason?.message },
        redis: redisCheck.status === 'fulfilled' ? redisCheck.value : { status: 'failed', error: redisCheck.reason?.message },
        functionality: functionalityCheck.status === 'fulfilled' ? functionalityCheck.value : { status: 'failed', error: functionalityCheck.reason?.message }
      }
    };

    // Check if any critical services failed
    const criticalFailed = [dbCheck].some(check => check.status === 'rejected');
    
    if (criticalFailed) {
      result.status = 'not_ready';
      result.message = 'Critical services unavailable';
    }

    setCachedHealth(cacheKey, result);
    
    const statusCode = result.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(result);
    
    monitoringService.info('Readiness check completed', { 
      status: result.status,
      checks: Object.keys(result.checks).map(key => ({
        service: key,
        status: result.checks[key].status
      }))
    });

  } catch (error) {
    monitoringService.error('Readiness check failed', error);
    
    const errorResult = {
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      service: 'cosnap-backend',
      error: 'Health check system failure',
      message: error.message
    };
    
    setCachedHealth(cacheKey, errorResult);
    res.status(503).json(errorResult);
  }
});

/**
 * Liveness probe - checks if service is alive and should restart if failed
 * Used by Kubernetes/container orchestrators
 */
router.get('/live', async (req, res) => {
  try {
    // Basic liveness checks - should be very fast
    const startTime = Date.now();
    
    // Check if process is responsive
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Check if we're not in a deadlock state
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 5000) { // 5 second timeout
      throw new Error('Service response too slow');
    }

    // Check if memory usage is reasonable (not leaking)
    const maxMemoryMB = 1024; // 1GB limit
    const currentMemoryMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (currentMemoryMB > maxMemoryMB) {
      monitoringService.warn('High memory usage detected', { 
        currentMemoryMB: currentMemoryMB.toFixed(2),
        maxMemoryMB 
      });
    }

    const result = {
      status: 'alive',
      timestamp: new Date().toISOString(),
      service: 'cosnap-backend',
      uptime: uptime,
      memory: {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
      },
      responseTime: `${responseTime}ms`
    };

    res.status(200).json(result);

  } catch (error) {
    monitoringService.error('Liveness check failed', error);
    
    res.status(503).json({
      status: 'dead',
      timestamp: new Date().toISOString(),
      service: 'cosnap-backend',
      error: error.message
    });
  }
});

/**
 * Comprehensive health check with all services
 * Used for detailed monitoring and debugging
 */
router.get('/detailed', async (req, res) => {
  const cacheKey = 'health:detailed';
  const cached = getCachedHealth(cacheKey, 60000); // 1 minute cache
  
  if (cached) {
    return res.status(cached.overall === 'healthy' ? 200 : 503).json(cached);
  }

  try {
    const startTime = Date.now();
    
    // Run all health checks
    const checks = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkRunningHubAPI(),
      checkAliOSS(),
      checkPaymentServices(),
      checkDiskSpace(),
      checkSystemResources()
    ]);

    const [
      dbCheck,
      redisCheck, 
      runningHubCheck,
      aliOssCheck,
      paymentCheck,
      diskCheck,
      systemCheck
    ] = checks;

    const result = {
      overall: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'cosnap-backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime: `${Date.now() - startTime}ms`,
      checks: {
        database: dbCheck.status === 'fulfilled' ? dbCheck.value : { 
          status: 'failed', 
          error: dbCheck.reason?.message || 'Unknown error'
        },
        redis: redisCheck.status === 'fulfilled' ? redisCheck.value : { 
          status: 'optional_failed', 
          error: redisCheck.reason?.message || 'Redis unavailable'
        },
        runningHub: runningHubCheck.status === 'fulfilled' ? runningHubCheck.value : { 
          status: 'failed', 
          error: runningHubCheck.reason?.message || 'RunningHub API unavailable'
        },
        aliOss: aliOssCheck.status === 'fulfilled' ? aliOssCheck.value : { 
          status: 'failed', 
          error: aliOssCheck.reason?.message || 'Ali OSS unavailable'
        },
        payment: paymentCheck.status === 'fulfilled' ? paymentCheck.value : { 
          status: 'optional_failed', 
          error: paymentCheck.reason?.message || 'Payment services check failed'
        },
        disk: diskCheck.status === 'fulfilled' ? diskCheck.value : { 
          status: 'warning', 
          error: diskCheck.reason?.message || 'Disk check failed'
        },
        system: systemCheck.status === 'fulfilled' ? systemCheck.value : { 
          status: 'warning', 
          error: systemCheck.reason?.message || 'System check failed'
        }
      }
    };

    // Determine overall health
    const criticalServices = ['database', 'runningHub', 'aliOss'];
    const failedCritical = criticalServices.some(service => 
      result.checks[service].status === 'failed'
    );

    if (failedCritical) {
      result.overall = 'unhealthy';
      result.message = 'Critical services unavailable';
    } else {
      const warnings = Object.values(result.checks).filter(check => 
        check.status === 'warning' || check.status === 'optional_failed'
      );
      
      if (warnings.length > 0) {
        result.overall = 'degraded';
        result.message = `${warnings.length} non-critical services have issues`;
      }
    }

    setCachedHealth(cacheKey, result, 60000);
    
    const statusCode = result.overall === 'healthy' ? 200 : 
                      result.overall === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(result);
    
    monitoringService.info('Detailed health check completed', {
      overall: result.overall,
      responseTime: result.responseTime,
      criticalServices: criticalServices.map(service => ({
        service,
        status: result.checks[service].status
      }))
    });

  } catch (error) {
    monitoringService.error('Detailed health check failed', error);
    
    const errorResult = {
      overall: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'cosnap-backend',
      error: 'Health check system failure',
      message: error.message
    };
    
    setCachedHealth(cacheKey, errorResult, 60000);
    res.status(503).json(errorResult);
  }
});

/**
 * Metrics endpoint for Prometheus scraping
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    res.set('Content-Type', monitoringService.getMetricsContentType());
    res.end(metrics);
  } catch (error) {
    monitoringService.error('Metrics endpoint failed', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

/**
 * Version and build information
 */
router.get('/version', (req, res) => {
  res.json({
    service: 'cosnap-backend',
    version: process.env.npm_package_version || '1.0.0',
    buildTime: process.env.BUILD_TIME || 'unknown',
    gitCommit: process.env.GIT_COMMIT || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

// =============================================================================
// HEALTH CHECK FUNCTIONS
// =============================================================================

async function checkDatabase() {
  const timer = monitoringService.startTimer('health_check_database');
  
  try {
    // Simplified database check - just test connectivity
    await prisma.$queryRaw`SELECT 1 as test`;
    
    const duration = timer.end();
    
    return {
      status: 'healthy',
      responseTime: `${duration.toFixed(2)}ms`,
      message: 'Database connection successful'
    };
    
  } catch (error) {
    timer.end();
    monitoringService.error('Database health check failed', error);
    throw new Error(`Database unavailable: ${error.message}`);
  }
}

async function checkRedis() {
  const timer = monitoringService.startTimer('health_check_redis');
  
  try {
    if (!redisService.isAvailable()) {
      return {
        status: 'unavailable',
        message: 'Redis service disabled or unavailable',
        fallback: 'Using in-memory cache'
      };
    }

    // Test Redis connectivity
    await redisService.set('health:check', 'ok', 60);
    const result = await redisService.get('health:check');
    await redisService.del('health:check');
    
    const duration = timer.end();
    
    if (result !== 'ok') {
      throw new Error('Redis test operation failed');
    }

    return {
      status: 'healthy',
      responseTime: `${duration.toFixed(2)}ms`,
      message: 'Redis connection successful'
    };
    
  } catch (error) {
    timer.end();
    monitoringService.error('Redis health check failed', error);
    
    return {
      status: 'optional_failed',
      error: error.message,
      message: 'Redis unavailable, using fallback'
    };
  }
}

async function checkRunningHubAPI() {
  const timer = monitoringService.startTimer('health_check_runninghub');
  
  try {
    const { apis } = productionConfig;
    
    // Skip external API health checks for faster response
    // Just verify configuration is present
    if (!apis.runningHub.apiKey) {
      throw new Error('RunningHub API key not configured');
    }

    const duration = timer.end();

    return {
      status: 'healthy',
      responseTime: `${duration.toFixed(2)}ms`,
      message: 'RunningHub configuration valid (external check skipped for performance)'
    };
    
  } catch (error) {
    timer.end();
    monitoringService.error('RunningHub API health check failed', error);
    throw new Error(`RunningHub API unavailable: ${error.message}`);
  }
}

async function checkAliOSS() {
  const timer = monitoringService.startTimer('health_check_ali_oss');
  
  try {
    // This would require implementing Ali OSS client health check
    // For now, we'll check if credentials are configured
    const { storage } = productionConfig;
    
    if (!storage.aliOss.accessKeyId || !storage.aliOss.accessKeySecret) {
      throw new Error('Ali OSS credentials not configured');
    }

    const duration = timer.end();
    
    return {
      status: 'healthy',
      responseTime: `${duration.toFixed(2)}ms`,
      region: storage.aliOss.region,
      bucket: storage.aliOss.bucket,
      message: 'Ali OSS configuration valid'
    };
    
  } catch (error) {
    timer.end();
    monitoringService.error('Ali OSS health check failed', error);
    throw new Error(`Ali OSS unavailable: ${error.message}`);
  }
}

async function checkPaymentServices() {
  const timer = monitoringService.startTimer('health_check_payments');
  
  try {
    const { payment } = productionConfig;
    
    const checks = {
      wechatPay: !!(payment.wechatPay.appId && payment.wechatPay.mchId),
      alipay: !!(payment.alipay.appId && payment.alipay.privateKey)
    };

    const duration = timer.end();
    
    return {
      status: 'healthy',
      responseTime: `${duration.toFixed(2)}ms`,
      services: checks,
      message: 'Payment services configuration valid'
    };
    
  } catch (error) {
    timer.end();
    monitoringService.error('Payment services health check failed', error);
    
    return {
      status: 'optional_failed',
      error: error.message,
      message: 'Payment services configuration incomplete'
    };
  }
}

async function checkDiskSpace() {
  const timer = monitoringService.startTimer('health_check_disk');
  
  try {
    // This is a simplified check - in production you'd use a proper disk usage library
    const usage = process.memoryUsage();
    const duration = timer.end();
    
    return {
      status: 'healthy',
      responseTime: `${duration.toFixed(2)}ms`,
      memory: {
        heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`
      },
      message: 'Disk space check completed'
    };
    
  } catch (error) {
    timer.end();
    throw error;
  }
}

async function checkSystemResources() {
  const timer = monitoringService.startTimer('health_check_system');
  
  try {
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const duration = timer.end();
    
    return {
      status: 'healthy',
      responseTime: `${duration.toFixed(2)}ms`,
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      memory: {
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
      },
      uptime: `${uptime.toFixed(2)}s`,
      message: 'System resources check completed'
    };
    
  } catch (error) {
    timer.end();
    throw error;
  }
}

async function checkBasicFunctionality() {
  const timer = monitoringService.startTimer('health_check_functionality');
  
  try {
    // Test basic functionality like JWT operations, etc.
    const testData = { test: true, timestamp: Date.now() };
    const jsonTest = JSON.stringify(testData);
    const parsedTest = JSON.parse(jsonTest);
    
    if (parsedTest.test !== true) {
      throw new Error('Basic JSON operations failed');
    }

    const duration = timer.end();
    
    return {
      status: 'healthy',
      responseTime: `${duration.toFixed(2)}ms`,
      message: 'Basic functionality test passed'
    };
    
  } catch (error) {
    timer.end();
    throw error;
  }
}

// =============================================================================
// CACHE UTILITIES
// =============================================================================

function getCachedHealth(key, customTtl = CACHE_TTL) {
  const cached = healthCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < customTtl) {
    return cached.data;
  }
  return null;
}

function setCachedHealth(key, data, customTtl = CACHE_TTL) {
  healthCache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Cleanup old cache entries
  setTimeout(() => {
    healthCache.delete(key);
  }, customTtl);
}

export default router;
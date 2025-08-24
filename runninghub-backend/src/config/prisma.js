/**
 * CRITICAL DATABASE FIX: Singleton Prisma Client Implementation
 * 
 * This file resolves the multiple PrismaClient instance issue that was causing:
 * - Connection pool exhaustion
 * - Memory leaks
 * - Inconsistent database connections
 * - Resource waste
 * 
 * BEFORE: 15+ separate PrismaClient instances across different files
 * AFTER: Single shared instance with proper connection management
 */

import { PrismaClient } from '@prisma/client';

/**
 * Enhanced Singleton Prisma Client Manager
 * Ensures only ONE PrismaClient instance exists across the entire application
 */
class PrismaManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.connectionRetryDelay = 1000; // 1 second
    this.slowQueryThreshold = 2000; // 2 seconds
    this.connectionMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      errors: 0,
      connectionTime: null
    };
  }

  /**
   * Get the singleton Prisma client instance
   * Creates client on first access with optimized configuration
   */
  getInstance() {
    if (!this.client) {
      this.client = this.createPrismaClient();
      this.setupEventHandlers();
      this.setupQueryMiddleware();
    }
    return this.client;
  }

  /**
   * Create Prisma client with production-optimized configuration
   */
  createPrismaClient() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Enhanced connection string for PostgreSQL with connection pooling
    const enhancedUrl = this.enhanceConnectionString(databaseUrl);

    const prismaConfig = {
      datasources: {
        db: {
          url: enhancedUrl
        }
      },
      log: this.getLogLevel(),
      errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'colorless',
      
      // Optimize for production performance
      ...(process.env.NODE_ENV === 'production' && {
        rejectOnNotFound: false,
        __internal: {
          engine: {
            enableEngineDebugMode: false
          }
        }
      })
    };

    console.log('🔧 Creating optimized Prisma client instance');
    return new PrismaClient(prismaConfig);
  }

  /**
   * Enhance database connection string with optimized pooling parameters
   */
  enhanceConnectionString(originalUrl) {
    const url = new URL(originalUrl);
    
    // Optimize connection pool parameters
    const poolParams = {
      'connection_limit': process.env.DB_CONNECTION_LIMIT || '10',
      'pool_timeout': process.env.DB_POOL_TIMEOUT || '60',
      'connect_timeout': '30',
      'pool_timeout': '60',
      'sslmode': 'require',
      'statement_cache_size': '0', // Disable prepared statement cache for better memory usage
      'schema_cache_size': '1000',
      'connection_cache_size': '100'
    };

    // Only add parameters that aren't already present
    Object.entries(poolParams).forEach(([key, value]) => {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  /**
   * Configure appropriate log levels based on environment
   */
  getLogLevel() {
    const env = process.env.NODE_ENV;
    
    if (env === 'production') {
      return ['error'];
    } else if (env === 'development') {
      return ['query', 'info', 'warn', 'error'];
    }
    return ['warn', 'error'];
  }

  /**
   * Setup event handlers for connection monitoring
   */
  setupEventHandlers() {
    if (!this.client) return;

    // Handle database connection events
    this.client.$on('beforeExit', async () => {
      console.log('🔌 Prisma client disconnecting...');
      await this.gracefulDisconnect();
    });

    // Monitor database errors
    this.client.$on('error', (error) => {
      console.error('🚨 Database error:', error);
      this.connectionMetrics.errors++;
      
      // Emit alert for critical database errors
      if (global.monitoringService) {
        global.monitoringService.error('Database connection error', error);
      }
    });

    // Monitor warnings
    this.client.$on('warn', (warning) => {
      console.warn('⚠️  Database warning:', warning.message);
    });

    console.log('📊 Database event handlers configured');
  }

  /**
   * Setup query performance monitoring middleware
   */
  setupQueryMiddleware() {
    if (!this.client) return;

    this.client.$use(async (params, next) => {
      const startTime = Date.now();
      this.connectionMetrics.totalQueries++;
      
      try {
        const result = await next(params);
        const duration = Date.now() - startTime;
        
        // Track slow queries
        if (duration > this.slowQueryThreshold) {
          this.connectionMetrics.slowQueries++;
          console.warn(`🐌 SLOW QUERY DETECTED: ${params.model}.${params.action} took ${duration}ms`, {
            model: params.model,
            action: params.action,
            duration: `${duration}ms`,
            args: this.sanitizeQueryArgs(params.args)
          });

          // Alert on critically slow queries
          if (duration > 5000 && global.monitoringService) {
            global.monitoringService.warn('Critically slow database query', {
              model: params.model,
              action: params.action,
              duration,
              threshold: this.slowQueryThreshold
            });
          }
        }
        
        // Record metrics if monitoring service available
        if (global.monitoringService) {
          global.monitoringService.recordHistogram('database_query_duration_seconds', {
            model: params.model || 'unknown',
            action: params.action || 'unknown'
          }, duration / 1000);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.connectionMetrics.errors++;
        
        console.error(`❌ DATABASE QUERY ERROR: ${params.model}.${params.action} failed after ${duration}ms`, {
          error: error.message,
          model: params.model,
          action: params.action,
          duration: `${duration}ms`
        });
        
        // Record error metrics
        if (global.monitoringService) {
          global.monitoringService.incrementCounter('database_errors_total', {
            model: params.model || 'unknown',
            action: params.action || 'unknown',
            error_code: error.code || 'unknown'
          });
        }
        
        throw error;
      }
    });

    console.log('🔍 Query performance monitoring enabled');
  }

  /**
   * Sanitize query arguments for logging (remove sensitive data)
   */
  sanitizeQueryArgs(args) {
    if (!args || typeof args !== 'object') return args;
    
    const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'idCardNumber'];
    const sanitized = { ...args };
    
    // Recursively sanitize sensitive fields
    const sanitizeObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const result = Array.isArray(obj) ? [] : {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Test database connectivity
   */
  async testConnection() {
    if (!this.client) {
      throw new Error('Prisma client not initialized');
    }

    const startTime = Date.now();
    
    try {
      await this.client.$queryRaw`SELECT 1 as connection_test`;
      const latency = Date.now() - startTime;
      
      this.isConnected = true;
      this.connectionMetrics.connectionTime = latency;
      
      console.log(`✅ Database connection test successful (${latency}ms)`);
      return { success: true, latency };
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Database connection test failed:', error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive database health status
   */
  async getHealthStatus() {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      await this.client.$queryRaw`SELECT 1`;
      const basicLatency = Date.now() - startTime;
      
      // Get connection pool information
      const poolInfo = await this.getConnectionPoolInfo();
      
      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics();
      
      return {
        status: 'healthy',
        latency: `${basicLatency}ms`,
        isConnected: this.isConnected,
        metrics: this.connectionMetrics,
        pool: poolInfo,
        performance: performanceMetrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        isConnected: false,
        metrics: this.connectionMetrics,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get connection pool information
   */
  async getConnectionPoolInfo() {
    try {
      const [connections, activity] = await Promise.all([
        this.client.$queryRaw`
          SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections,
            count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
            count(*) FILTER (WHERE state = 'idle in transaction (aborted)') as aborted_transactions
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `,
        this.client.$queryRaw`
          SELECT 
            datname,
            numbackends,
            xact_commit,
            xact_rollback,
            blks_read,
            blks_hit,
            temp_files,
            temp_bytes,
            deadlocks
          FROM pg_stat_database 
          WHERE datname = current_database()
        `
      ]);

      return {
        connections: connections[0] || {},
        activity: activity[0] || {}
      };
    } catch (error) {
      console.warn('Failed to get connection pool info:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const [indexUsage, tableStats, locks] = await Promise.all([
        this.client.$queryRaw`
          SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch
          FROM pg_stat_user_indexes 
          WHERE schemaname = 'public'
          ORDER BY idx_scan DESC
          LIMIT 10
        `,
        this.client.$queryRaw`
          SELECT 
            schemaname,
            tablename,
            seq_scan,
            seq_tup_read,
            idx_scan,
            idx_tup_fetch,
            n_tup_ins,
            n_tup_upd,
            n_tup_del
          FROM pg_stat_user_tables 
          WHERE schemaname = 'public'
          ORDER BY seq_scan DESC
          LIMIT 10
        `,
        this.client.$queryRaw`
          SELECT 
            mode,
            count(*) as lock_count
          FROM pg_locks 
          WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
          GROUP BY mode
          ORDER BY lock_count DESC
        `
      ]);

      return {
        topIndexes: indexUsage,
        tableActivity: tableStats,
        locks: locks
      };
    } catch (error) {
      console.warn('Failed to get performance metrics:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Execute transaction with enhanced error handling and retry logic
   */
  async executeTransaction(operations, options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      timeout = 30000,
      isolationLevel = 'ReadCommitted'
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.$transaction(operations, {
          maxWait: 5000,
          timeout,
          isolationLevel
        });
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.warn(`🔄 Transaction retry ${attempt}/${maxRetries}, waiting ${delay}ms... Error: ${error.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Check if database error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = [
      'P2034', // Transaction conflict
      '40001', // Serialization failure  
      '40P01', // Deadlock detected
      '57P01', // Admin shutdown
      '08003', // Connection does not exist
      '08006', // Connection failure
      '08001', // Unable to connect to server
      '53300', // Too many connections
    ];
    
    const retryableMessages = [
      'connection reset by peer',
      'connection refused',
      'timeout',
      'deadlock',
      'serialization failure',
      'connection terminated'
    ];
    
    return retryableCodes.includes(error.code) ||
           retryableMessages.some(msg => 
             error.message.toLowerCase().includes(msg)
           );
  }

  /**
   * Graceful disconnect with cleanup
   */
  async gracefulDisconnect() {
    if (!this.client) return;
    
    try {
      console.log('🔌 Starting graceful database disconnect...');
      
      // Close all connections
      await this.client.$disconnect();
      
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Error during database disconnect:', error.message);
      throw error;
    }
  }

  /**
   * Force disconnect (for emergencies)
   */
  async forceDisconnect() {
    try {
      if (this.client) {
        await this.client.$disconnect();
      }
      this.client = null;
      this.isConnected = false;
      console.log('🚨 Database force disconnected');
    } catch (error) {
      console.error('❌ Error during force disconnect:', error);
    }
  }

  /**
   * Get connection metrics for monitoring
   */
  getMetrics() {
    return {
      ...this.connectionMetrics,
      isConnected: this.isConnected,
      slowQueryThreshold: this.slowQueryThreshold,
      slowQueryPercentage: this.connectionMetrics.totalQueries > 0 
        ? (this.connectionMetrics.slowQueries / this.connectionMetrics.totalQueries * 100).toFixed(2)
        : 0,
      errorRate: this.connectionMetrics.totalQueries > 0
        ? (this.connectionMetrics.errors / this.connectionMetrics.totalQueries * 100).toFixed(2)
        : 0
    };
  }
}

// Create singleton instance
const prismaManager = new PrismaManager();

// Export singleton instance and manager
export const prismaClient = prismaManager.getInstance();
export const databaseManager = prismaManager;

// For backward compatibility, export as default
export default prismaClient;

// Global access for monitoring
if (typeof global !== 'undefined') {
  global.databaseManager = prismaManager;
}
/**
 * Performance Monitoring and Caching Service
 * Comprehensive performance optimization for Cosnap AI backend
 */

import redisService from './redisService.js';
import monitoringService from './monitoringService.js';
import { productionConfig } from '../config/production.js';

class PerformanceService {
  constructor() {
    this.cacheStrategies = new Map();
    this.performanceMetrics = new Map();
    this.initialized = false;
    
    this.initialize();
  }

  /**
   * Initialize performance service
   */
  initialize() {
    try {
      this.setupCacheStrategies();
      this.setupPerformanceMonitoring();
      
      this.initialized = true;
      console.log('🚀 Performance service initialized');
      
    } catch (error) {
      console.error('❌ Performance service initialization failed:', error);
    }
  }

  // =============================================================================
  // CACHING STRATEGIES
  // =============================================================================

  /**
   * Setup different caching strategies
   */
  setupCacheStrategies() {
    const { caching } = productionConfig;

    // API Response Caching Strategy
    this.cacheStrategies.set('api_response', {
      ttl: caching.apiCache.defaultTtl,
      maxSize: 1000,
      strategy: 'lru', // Least Recently Used
      enabled: caching.apiCache.enabled
    });

    // User Session Caching
    this.cacheStrategies.set('user_session', {
      ttl: caching.session.ttl,
      maxSize: 10000,
      strategy: 'ttl', // Time To Live
      enabled: caching.session.enabled
    });

    // Database Query Results Caching
    this.cacheStrategies.set('db_query', {
      ttl: 300, // 5 minutes
      maxSize: 5000,
      strategy: 'lru',
      enabled: true
    });

    // AI Effects Configuration Caching
    this.cacheStrategies.set('effects_config', {
      ttl: caching.apiCache.strategies.effects.ttl,
      maxSize: caching.apiCache.strategies.effects.maxSize,
      strategy: 'ttl',
      enabled: true
    });

    // Community Posts Caching
    this.cacheStrategies.set('community_posts', {
      ttl: caching.apiCache.strategies.community.ttl,
      maxSize: caching.apiCache.strategies.community.maxSize,
      strategy: 'lru',
      enabled: true
    });

    console.log('📦 Cache strategies configured');
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Track API response times
    this.performanceMetrics.set('api_response_times', {
      samples: [],
      maxSamples: 1000,
      thresholds: {
        warning: 1000, // 1 second
        critical: 3000 // 3 seconds
      }
    });

    // Track cache hit rates
    this.performanceMetrics.set('cache_hit_rates', {
      hits: 0,
      misses: 0,
      totalRequests: 0
    });

    // Track memory usage
    this.performanceMetrics.set('memory_usage', {
      samples: [],
      maxSamples: 100,
      thresholds: {
        warning: 0.8, // 80% of available memory
        critical: 0.9 // 90% of available memory
      }
    });

    console.log('📊 Performance monitoring configured');
  }

  // =============================================================================
  // INTELLIGENT CACHING
  // =============================================================================

  /**
   * Intelligent cache with automatic invalidation
   */
  async cache(key, valueFunction, options = {}) {
    const timer = monitoringService.startTimer(`cache_operation_${key}`);
    
    try {
      const strategy = this.cacheStrategies.get(options.strategy || 'api_response');
      
      if (!strategy || !strategy.enabled) {
        return await valueFunction();
      }

      const cacheKey = this.generateCacheKey(key, options);
      
      // Try to get from cache
      const cachedValue = await redisService.get(cacheKey);
      
      if (cachedValue !== null) {
        // Cache hit
        this.recordCacheHit();
        timer.end();
        
        monitoringService.debug('Cache hit', { key: cacheKey });
        return cachedValue;
      }

      // Cache miss - compute value
      this.recordCacheMiss();
      
      const computeTimer = monitoringService.startTimer(`compute_${key}`);
      const value = await valueFunction();
      const computeDuration = computeTimer.end();

      // Store in cache with appropriate TTL
      const ttl = options.ttl || strategy.ttl;
      await redisService.set(cacheKey, value, ttl);

      timer.end();

      monitoringService.debug('Cache miss - value computed and stored', {
        key: cacheKey,
        computeDuration: `${computeDuration.toFixed(2)}ms`,
        ttl: ttl
      });

      return value;
      
    } catch (error) {
      timer.end();
      monitoringService.error('Cache operation failed', error, { key });
      
      // Fallback to direct computation
      return await valueFunction();
    }
  }

  /**
   * Multi-level cache with fallback
   */
  async multiLevelCache(key, valueFunction, options = {}) {
    const timer = monitoringService.startTimer(`multi_cache_${key}`);
    
    try {
      // Level 1: Memory cache (fastest)
      if (options.useMemoryCache) {
        const memoryKey = `memory:${key}`;
        const memoryValue = this.getFromMemoryCache(memoryKey);
        
        if (memoryValue !== null) {
          timer.end();
          return memoryValue;
        }
      }

      // Level 2: Redis cache
      const redisValue = await this.cache(key, async () => {
        // Level 3: Database/API call
        return await valueFunction();
      }, options);

      // Store in memory cache for next time
      if (options.useMemoryCache && redisValue) {
        this.setMemoryCache(`memory:${key}`, redisValue, options.memoryTtl || 60);
      }

      timer.end();
      return redisValue;
      
    } catch (error) {
      timer.end();
      monitoringService.error('Multi-level cache failed', error, { key });
      return await valueFunction();
    }
  }

  /**
   * Cache warming for frequently accessed data
   */
  async warmCache(warmingStrategies = []) {
    console.log('🔥 Starting cache warming...');
    
    try {
      const warmingPromises = warmingStrategies.map(async (strategy) => {
        const timer = monitoringService.startTimer(`cache_warming_${strategy.name}`);
        
        try {
          await this.cache(strategy.key, strategy.valueFunction, {
            strategy: strategy.cacheStrategy,
            ttl: strategy.ttl
          });
          
          timer.end();
          console.log(`✅ Cache warmed: ${strategy.name}`);
          
        } catch (error) {
          timer.end();
          console.error(`❌ Cache warming failed for ${strategy.name}:`, error);
        }
      });

      await Promise.allSettled(warmingPromises);
      console.log('🔥 Cache warming completed');
      
    } catch (error) {
      console.error('❌ Cache warming process failed:', error);
    }
  }

  /**
   * Intelligent cache invalidation
   */
  async invalidateCache(pattern, options = {}) {
    const timer = monitoringService.startTimer('cache_invalidation');
    
    try {
      // Pattern-based invalidation
      const keys = await redisService.keys(pattern);
      
      if (keys.length > 0) {
        const deletePromises = keys.map(key => redisService.del(key));
        await Promise.all(deletePromises);
        
        monitoringService.info('Cache invalidated', {
          pattern,
          keysDeleted: keys.length
        });
      }

      // Tag-based invalidation (if using cache tags)
      if (options.tags) {
        await this.invalidateByTags(options.tags);
      }

      timer.end();
      
    } catch (error) {
      timer.end();
      monitoringService.error('Cache invalidation failed', error, { pattern });
    }
  }

  // =============================================================================
  // PERFORMANCE OPTIMIZATION
  // =============================================================================

  /**
   * API response compression and optimization
   */
  optimizeApiResponse(data, options = {}) {
    try {
      // Remove null/undefined values
      const cleaned = this.removeNullValues(data);
      
      // Apply field filtering if specified
      if (options.fields) {
        return this.filterFields(cleaned, options.fields);
      }

      // Apply pagination optimization
      if (options.paginate && Array.isArray(cleaned)) {
        return this.optimizePagination(cleaned, options.paginate);
      }

      return cleaned;
      
    } catch (error) {
      monitoringService.error('API response optimization failed', error);
      return data; // Return original data as fallback
    }
  }

  /**
   * Database query optimization with result caching
   */
  async optimizeDbQuery(queryFunction, cacheKey, options = {}) {
    const timer = monitoringService.startTimer('optimized_db_query');
    
    try {
      // Use caching for read queries
      if (options.useCache !== false) {
        return await this.cache(cacheKey, queryFunction, {
          strategy: 'db_query',
          ttl: options.cacheTtl
        });
      }

      // Direct query execution
      const result = await queryFunction();
      timer.end();
      
      return result;
      
    } catch (error) {
      timer.end();
      monitoringService.error('Optimized DB query failed', error, { cacheKey });
      throw error;
    }
  }

  /**
   * Batch processing optimization
   */
  async batchProcess(items, processor, options = {}) {
    const timer = monitoringService.startTimer('batch_processing');
    
    try {
      const batchSize = options.batchSize || 10;
      const concurrency = options.concurrency || 3;
      const results = [];

      // Process in batches with concurrency control
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (item, index) => {
          try {
            return await processor(item, i + index);
          } catch (error) {
            monitoringService.error('Batch item processing failed', error, { 
              itemIndex: i + index 
            });
            return null; // Continue processing other items
          }
        });

        // Wait for current batch with concurrency limit
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : null));

        // Optional delay between batches
        if (options.delayMs && i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, options.delayMs));
        }
      }

      timer.end();
      
      monitoringService.info('Batch processing completed', {
        totalItems: items.length,
        batchSize,
        successfulItems: results.filter(r => r !== null).length
      });

      return results;
      
    } catch (error) {
      timer.end();
      monitoringService.error('Batch processing failed', error);
      throw error;
    }
  }

  // =============================================================================
  // MEMORY MANAGEMENT
  // =============================================================================

  /**
   * Simple in-memory cache for ultra-fast access
   */
  memoryCache = new Map();
  memoryCacheTimers = new Map();

  setMemoryCache(key, value, ttlSeconds = 60) {
    // Clear existing timer
    if (this.memoryCacheTimers.has(key)) {
      clearTimeout(this.memoryCacheTimers.get(key));
    }

    // Set value
    this.memoryCache.set(key, value);

    // Set expiration timer
    const timer = setTimeout(() => {
      this.memoryCache.delete(key);
      this.memoryCacheTimers.delete(key);
    }, ttlSeconds * 1000);

    this.memoryCacheTimers.set(key, timer);
  }

  getFromMemoryCache(key) {
    return this.memoryCache.get(key) || null;
  }

  clearMemoryCache() {
    this.memoryCache.clear();
    this.memoryCacheTimers.forEach(timer => clearTimeout(timer));
    this.memoryCacheTimers.clear();
  }

  /**
   * Monitor memory usage and trigger cleanup if needed
   */
  monitorMemoryUsage() {
    const usage = process.memoryUsage();
    const metrics = this.performanceMetrics.get('memory_usage');
    
    const memoryUsagePercent = usage.heapUsed / usage.heapTotal;
    
    metrics.samples.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      usagePercent: memoryUsagePercent
    });

    // Keep only recent samples
    if (metrics.samples.length > metrics.maxSamples) {
      metrics.samples.shift();
    }

    // Check thresholds
    if (memoryUsagePercent > metrics.thresholds.critical) {
      monitoringService.error('Critical memory usage detected', null, {
        memoryUsagePercent: (memoryUsagePercent * 100).toFixed(2),
        heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`
      });
      
      // Trigger emergency cleanup
      this.emergencyCleanup();
      
    } else if (memoryUsagePercent > metrics.thresholds.warning) {
      monitoringService.warn('High memory usage detected', {
        memoryUsagePercent: (memoryUsagePercent * 100).toFixed(2),
        heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }

  /**
   * Emergency cleanup to free memory
   */
  emergencyCleanup() {
    try {
      console.log('🧹 Performing emergency memory cleanup...');
      
      // Clear in-memory caches
      this.clearMemoryCache();
      
      // Trigger garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      console.log('✅ Emergency cleanup completed');
      
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
    }
  }

  // =============================================================================
  // PERFORMANCE METRICS AND REPORTING
  // =============================================================================

  /**
   * Record API response time
   */
  recordApiResponseTime(endpoint, duration, statusCode) {
    const metrics = this.performanceMetrics.get('api_response_times');
    
    metrics.samples.push({
      endpoint,
      duration,
      statusCode,
      timestamp: Date.now()
    });

    // Keep only recent samples
    if (metrics.samples.length > metrics.maxSamples) {
      metrics.samples.shift();
    }

    // Check thresholds
    if (duration > metrics.thresholds.critical) {
      monitoringService.error('Critical API response time', null, {
        endpoint,
        duration: `${duration}ms`,
        statusCode
      });
    } else if (duration > metrics.thresholds.warning) {
      monitoringService.warn('Slow API response time', {
        endpoint,
        duration: `${duration}ms`,
        statusCode
      });
    }

    // Record in monitoring service
    monitoringService.recordHttpRequest(
      'GET', // This would be dynamic based on actual method
      endpoint,
      statusCode,
      duration
    );
  }

  /**
   * Record cache hit/miss
   */
  recordCacheHit() {
    const metrics = this.performanceMetrics.get('cache_hit_rates');
    metrics.hits++;
    metrics.totalRequests++;
  }

  recordCacheMiss() {
    const metrics = this.performanceMetrics.get('cache_hit_rates');
    metrics.misses++;
    metrics.totalRequests++;
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    try {
      const cacheMetrics = this.performanceMetrics.get('cache_hit_rates');
      const responseMetrics = this.performanceMetrics.get('api_response_times');
      const memoryMetrics = this.performanceMetrics.get('memory_usage');

      const hitRate = cacheMetrics.totalRequests > 0 
        ? (cacheMetrics.hits / cacheMetrics.totalRequests * 100).toFixed(2)
        : 0;

      const avgResponseTime = responseMetrics.samples.length > 0
        ? responseMetrics.samples.reduce((sum, sample) => sum + sample.duration, 0) / responseMetrics.samples.length
        : 0;

      const currentMemory = process.memoryUsage();

      return {
        cache: {
          hitRate: `${hitRate}%`,
          totalRequests: cacheMetrics.totalRequests,
          hits: cacheMetrics.hits,
          misses: cacheMetrics.misses
        },
        response: {
          averageTime: `${avgResponseTime.toFixed(2)}ms`,
          sampleCount: responseMetrics.samples.length,
          recentSamples: responseMetrics.samples.slice(-10)
        },
        memory: {
          current: {
            heapUsed: `${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(currentMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            external: `${(currentMemory.external / 1024 / 1024).toFixed(2)}MB`,
            rss: `${(currentMemory.rss / 1024 / 1024).toFixed(2)}MB`
          },
          usagePercent: `${(currentMemory.heapUsed / currentMemory.heapTotal * 100).toFixed(2)}%`
        },
        uptime: `${(process.uptime() / 60).toFixed(2)} minutes`
      };
      
    } catch (error) {
      monitoringService.error('Failed to generate performance report', error);
      return { error: 'Unable to generate performance report' };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  generateCacheKey(key, options = {}) {
    const prefix = options.prefix || 'cache';
    const hash = options.includeHash ? `:${this.hashString(JSON.stringify(options))}` : '';
    return `${prefix}:${key}${hash}`;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  removeNullValues(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeNullValues(item)).filter(item => item !== null);
    }
    
    if (obj && typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
          cleaned[key] = this.removeNullValues(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  filterFields(obj, fields) {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.filterFields(item, fields));
    }
    
    const filtered = {};
    fields.forEach(field => {
      if (obj.hasOwnProperty(field)) {
        filtered[field] = obj[field];
      }
    });
    
    return filtered;
  }

  optimizePagination(data, paginateOptions) {
    const { page = 1, limit = 20 } = paginateOptions;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      data: data.slice(start, end),
      pagination: {
        page,
        limit,
        total: data.length,
        pages: Math.ceil(data.length / limit),
        hasNext: end < data.length,
        hasPrev: page > 1
      }
    };
  }

  // =============================================================================
  // STARTUP AND MONITORING
  // =============================================================================

  /**
   * Start performance monitoring interval
   */
  startMonitoring() {
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      this.monitorMemoryUsage();
    }, 30000);

    // Log performance report every 5 minutes
    setInterval(() => {
      const report = this.getPerformanceReport();
      monitoringService.info('Performance report', report);
    }, 300000);

    console.log('📊 Performance monitoring started');
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      cacheStrategies: Array.from(this.cacheStrategies.keys()),
      memoryCache: {
        size: this.memoryCache.size,
        timers: this.memoryCacheTimers.size
      },
      performanceMetrics: {
        cacheHitRate: this.performanceMetrics.get('cache_hit_rates'),
        memorySamples: this.performanceMetrics.get('memory_usage').samples.length
      }
    };
  }
}

// Create singleton instance
const performanceService = new PerformanceService();

export default performanceService;
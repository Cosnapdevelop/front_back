import compression from 'compression';
import { cache } from './redisCache.js';

/**
 * Performance Optimization Middleware Collection
 */

/**
 * Response compression middleware
 */
export const compressionMiddleware = compression({
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Compress all compressible responses
    return compression.filter(req, res);
  }
});

/**
 * API response optimization middleware
 */
export const responseOptimization = (req, res, next) => {
  // Set response headers for optimization
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Disable ETags for API endpoints (use custom caching instead)
  res.removeHeader('ETag');
  
  // Override res.json to add performance headers
  const originalJson = res.json;
  res.json = function(data) {
    // Add response time header
    if (req.startTime) {
      const responseTime = Date.now() - req.startTime;
      res.setHeader('X-Response-Time', `${responseTime}ms`);
    }
    
    // Add data size header
    const dataSize = JSON.stringify(data).length;
    res.setHeader('X-Data-Size', `${dataSize} bytes`);
    
    // Set appropriate cache headers for different types of data
    if (req.path.includes('/effects') && req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes for effects
    } else if (req.path.includes('/user') && req.method === 'GET') {
      res.setHeader('Cache-Control', 'private, max-age=60'); // 1 minute for user data
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
    
    return originalJson.call(this, data);
  };
  
  // Record start time for response time calculation
  req.startTime = Date.now();
  
  next();
};

/**
 * Database query optimization middleware
 */
export const queryOptimization = (req, res, next) => {
  // Add query hints to request object
  req.queryHints = {
    // Enable query result caching
    useCache: true,
    // Cache TTL in seconds
    cacheTTL: req.method === 'GET' ? 300 : 0,
    // Maximum query timeout
    timeout: 30000,
    // Enable query batching for multiple operations
    enableBatching: true
  };
  
  // Track query performance
  req.queryPerformance = {
    queries: [],
    totalTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  
  next();
};

/**
 * Memory usage monitoring middleware
 */
export const memoryMonitoring = (req, res, next) => {
  const memBefore = process.memoryUsage();
  
  // Override res.end to calculate memory usage
  const originalEnd = res.end;
  res.end = function(...args) {
    const memAfter = process.memoryUsage();
    const memDiff = {
      rss: memAfter.rss - memBefore.rss,
      heapUsed: memAfter.heapUsed - memBefore.heapUsed,
      heapTotal: memAfter.heapTotal - memBefore.heapTotal,
      external: memAfter.external - memBefore.external
    };
    
    // Log significant memory increases
    if (memDiff.heapUsed > 10 * 1024 * 1024) { // > 10MB
      console.warn(`🧠 高内存使用: ${req.method} ${req.path} - ${Math.round(memDiff.heapUsed / 1024 / 1024)}MB`);
    }
    
    // Set memory usage headers in development
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-Memory-Used', `${Math.round(memDiff.heapUsed / 1024)}KB`);
    }
    
    return originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Image processing optimization
 */
export const imageOptimization = async (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }
  
  const files = req.files || [req.file];
  
  for (const file of files) {
    if (!file) continue;
    
    // Add optimization hints
    file.optimizationHints = {
      // Target quality for compression
      quality: 85,
      // Maximum dimensions
      maxWidth: 2048,
      maxHeight: 2048,
      // Output format preference
      preferredFormat: 'webp',
      // Enable progressive JPEG
      progressive: true,
      // Strip metadata to reduce file size
      stripMetadata: true
    };
    
    // Calculate compression ratio if needed
    if (file.size > 5 * 1024 * 1024) { // > 5MB
      file.optimizationHints.quality = 75; // Higher compression for large files
    }
  }
  
  next();
};

/**
 * API response batching middleware
 */
export const responseBatching = () => {
  const pendingRequests = new Map();
  
  return (req, res, next) => {
    // Only batch GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Create batch key based on path and query
    const batchKey = `${req.path}:${JSON.stringify(req.query)}`;
    
    // Check if similar request is already pending
    if (pendingRequests.has(batchKey)) {
      const existingRequest = pendingRequests.get(batchKey);
      
      // Add this response to the batch
      existingRequest.responses.push(res);
      
      // Don't proceed with request processing
      return;
    }
    
    // This is the first request for this batch key
    const batchInfo = {
      responses: [res],
      timer: setTimeout(() => {
        // Clean up if batch doesn't complete in time
        pendingRequests.delete(batchKey);
      }, 5000) // 5 second timeout
    };
    
    pendingRequests.set(batchKey, batchInfo);
    
    // Override res.json to handle batching
    const originalJson = res.json;
    res.json = function(data) {
      const batch = pendingRequests.get(batchKey);
      
      if (batch) {
        clearTimeout(batch.timer);
        pendingRequests.delete(batchKey);
        
        // Send response to all batched requests
        batch.responses.forEach(batchedRes => {
          if (batchedRes !== res) {
            batchedRes.setHeader('X-Batched-Response', 'true');
            originalJson.call(batchedRes, data);
          }
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Lazy loading middleware for heavy operations
 */
export const lazyLoading = (req, res, next) => {
  // Add lazy loading utilities to request
  req.lazy = {
    // Defer heavy operations until actually needed
    defer: (operation) => {
      return () => {
        if (!req._deferredOps) req._deferredOps = [];
        req._deferredOps.push(operation);
      };
    },
    
    // Execute all deferred operations
    execute: async () => {
      if (!req._deferredOps) return [];
      
      const results = await Promise.all(
        req._deferredOps.map(op => op().catch(err => ({ error: err.message })))
      );
      
      req._deferredOps = [];
      return results;
    }
  };
  
  next();
};

/**
 * Connection pooling optimization
 */
export const connectionPooling = (req, res, next) => {
  // Add connection pool monitoring
  req.connectionInfo = {
    timestamp: Date.now(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  };
  
  // Set connection timeout
  req.setTimeout(30000, () => {
    console.warn(`⏱️ 请求超时: ${req.method} ${req.path} - ${req.ip}`);
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: '请求超时'
      });
    }
  });
  
  next();
};

/**
 * Content optimization based on client capabilities
 */
export const clientOptimization = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';
  const accept = req.get('Accept') || '';
  
  // Detect client capabilities
  req.clientCapabilities = {
    // Compression support
    supportsGzip: acceptEncoding.includes('gzip'),
    supportsBrotli: acceptEncoding.includes('br'),
    
    // Image format support
    supportsWebP: accept.includes('image/webp'),
    supportsAvif: accept.includes('image/avif'),
    
    // Client type detection
    isMobile: /Mobile|Android|iPhone|iPad/i.test(userAgent),
    isBot: /bot|crawler|spider/i.test(userAgent),
    
    // Connection quality hint
    connectionQuality: req.get('Save-Data') === 'on' ? 'slow' : 'normal'
  };
  
  // Adjust response based on capabilities
  if (req.clientCapabilities.isMobile) {
    // Mobile-optimized responses
    req.optimizeForMobile = true;
  }
  
  if (req.clientCapabilities.connectionQuality === 'slow') {
    // Reduce data for slow connections
    req.reduceDataUsage = true;
  }
  
  next();
};

/**
 * Performance monitoring and alerting
 */
export const performanceMonitoring = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  // Override res.end to collect performance metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
    
    // Log performance metrics
    const metrics = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
      memoryUsed: Math.round(memoryUsed / 1024), // KB
      timestamp: new Date().toISOString()
    };
    
    // Alert on performance issues
    if (responseTime > 5000) { // > 5 seconds
      console.warn('🐌 慢响应检测:', metrics);
    }
    
    if (memoryUsed > 50 * 1024 * 1024) { // > 50MB
      console.warn('🧠 高内存使用检测:', metrics);
    }
    
    // Store metrics for monitoring dashboard
    if (global.metrics) {
      global.metrics.recordHistogram('http_request_duration_seconds', {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode.toString()
      }, responseTime / 1000);
      
      global.metrics.setGauge('memory_usage_bytes', {
        type: 'request_memory'
      }, memoryUsed);
    }
    
    return originalEnd.apply(this, args);
  };
  
  next();
};

export default {
  compressionMiddleware,
  responseOptimization,
  queryOptimization,
  memoryMonitoring,
  imageOptimization,
  responseBatching,
  lazyLoading,
  connectionPooling,
  clientOptimization,
  performanceMonitoring
};
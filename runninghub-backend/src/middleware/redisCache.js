import Redis from 'ioredis';

/**
 * Redis Cache Layer for Production Performance
 */
class RedisCache {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes default
    this.init();
  }

  async init() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4, // IPv4
        connectTimeout: 10000,
        commandTimeout: 5000
      };

      // Use Redis URL if provided
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });
      } else {
        this.redis = new Redis(redisConfig);
      }

      this.redis.on('connect', () => {
        console.log('✅ Redis 连接已建立');
        this.isConnected = true;
      });

      this.redis.on('ready', () => {
        console.log('✅ Redis 连接就绪');
      });

      this.redis.on('error', (err) => {
        console.error('❌ Redis 连接错误:', err.message);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.warn('⚠️ Redis 连接已关闭');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis 重新连接中...');
      });

      // Test connection
      await this.redis.ping();
      console.log('✅ Redis 初始化完成');
      
    } catch (error) {
      console.error('❌ Redis 初始化失败:', error.message);
      console.warn('⚠️ 应用将在无缓存模式下运行');
    }
  }

  // Basic cache operations
  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.redis.get(this.formatKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET 错误 [${key}]:`, error.message);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    if (!this.isConnected) return false;
    
    try {
      const serialized = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;
      
      await this.redis.setex(this.formatKey(key), expiration, serialized);
      return true;
    } catch (error) {
      console.error(`Redis SET 错误 [${key}]:`, error.message);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    
    try {
      await this.redis.del(this.formatKey(key));
      return true;
    } catch (error) {
      console.error(`Redis DEL 错误 [${key}]:`, error.message);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) return false;
    
    try {
      const result = await this.redis.exists(this.formatKey(key));
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS 错误 [${key}]:`, error.message);
      return false;
    }
  }

  // Advanced cache operations
  async mget(keys) {
    if (!this.isConnected) return {};
    
    try {
      const formattedKeys = keys.map(key => this.formatKey(key));
      const values = await this.redis.mget(...formattedKeys);
      
      const result = {};
      keys.forEach((key, index) => {
        result[key] = values[index] ? JSON.parse(values[index]) : null;
      });
      
      return result;
    } catch (error) {
      console.error('Redis MGET 错误:', error.message);
      return {};
    }
  }

  async mset(data, ttl = null) {
    if (!this.isConnected) return false;
    
    try {
      const pipeline = this.redis.pipeline();
      const expiration = ttl || this.defaultTTL;
      
      for (const [key, value] of Object.entries(data)) {
        const serialized = JSON.stringify(value);
        pipeline.setex(this.formatKey(key), expiration, serialized);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis MSET 错误:', error.message);
      return false;
    }
  }

  // Hash operations for complex data
  async hget(hash, field) {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.redis.hget(this.formatKey(hash), field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis HGET 错误 [${hash}.${field}]:`, error.message);
      return null;
    }
  }

  async hset(hash, field, value, ttl = null) {
    if (!this.isConnected) return false;
    
    try {
      const serialized = JSON.stringify(value);
      const pipeline = this.redis.pipeline();
      
      pipeline.hset(this.formatKey(hash), field, serialized);
      
      if (ttl) {
        pipeline.expire(this.formatKey(hash), ttl);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error(`Redis HSET 错误 [${hash}.${field}]:`, error.message);
      return false;
    }
  }

  async hgetall(hash) {
    if (!this.isConnected) return {};
    
    try {
      const data = await this.redis.hgetall(this.formatKey(hash));
      const result = {};
      
      for (const [field, value] of Object.entries(data)) {
        result[field] = JSON.parse(value);
      }
      
      return result;
    } catch (error) {
      console.error(`Redis HGETALL 错误 [${hash}]:`, error.message);
      return {};
    }
  }

  // List operations for queues
  async lpush(key, ...values) {
    if (!this.isConnected) return false;
    
    try {
      const serialized = values.map(v => JSON.stringify(v));
      await this.redis.lpush(this.formatKey(key), ...serialized);
      return true;
    } catch (error) {
      console.error(`Redis LPUSH 错误 [${key}]:`, error.message);
      return false;
    }
  }

  async rpop(key) {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.redis.rpop(this.formatKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis RPOP 错误 [${key}]:`, error.message);
      return null;
    }
  }

  async llen(key) {
    if (!this.isConnected) return 0;
    
    try {
      return await this.redis.llen(this.formatKey(key));
    } catch (error) {
      console.error(`Redis LLEN 错误 [${key}]:`, error.message);
      return 0;
    }
  }

  // Pattern-based operations
  async keys(pattern) {
    if (!this.isConnected) return [];
    
    try {
      return await this.redis.keys(this.formatKey(pattern));
    } catch (error) {
      console.error(`Redis KEYS 错误 [${pattern}]:`, error.message);
      return [];
    }
  }

  async deletePattern(pattern) {
    if (!this.isConnected) return false;
    
    try {
      const keys = await this.redis.keys(this.formatKey(pattern));
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error(`Redis 删除模式错误 [${pattern}]:`, error.message);
      return false;
    }
  }

  // Cache warming and invalidation
  async warmCache(data) {
    if (!this.isConnected) return false;
    
    try {
      const pipeline = this.redis.pipeline();
      
      for (const [key, { value, ttl }] of Object.entries(data)) {
        const serialized = JSON.stringify(value);
        pipeline.setex(this.formatKey(key), ttl || this.defaultTTL, serialized);
      }
      
      await pipeline.exec();
      console.log(`✅ 缓存预热完成: ${Object.keys(data).length} 项`);
      return true;
    } catch (error) {
      console.error('缓存预热错误:', error.message);
      return false;
    }
  }

  async invalidateUserCache(userId) {
    const patterns = [
      `user:${userId}:*`,
      `tasks:user:${userId}:*`,
      `effects:user:${userId}:*`,
      `payment:user:${userId}:*`
    ];
    
    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }
    
    console.log(`✅ 用户缓存已清理: ${userId}`);
  }

  // Statistics and monitoring
  async getStats() {
    if (!this.isConnected) return null;
    
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: this.parseInfo(info),
        keyspace: this.parseInfo(keyspace),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Redis 统计信息获取错误:', error.message);
      return null;
    }
  }

  // Health check
  async healthCheck() {
    if (!this.isConnected) return false;
    
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency: `${latency}ms`,
        connected: this.isConnected
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connected: false
      };
    }
  }

  // Utility methods
  formatKey(key) {
    const prefix = process.env.CACHE_PREFIX || 'cosnap:';
    return `${prefix}${key}`;
  }

  parseInfo(info) {
    const lines = info.split('\r\n');
    const result = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = isNaN(value) ? value : Number(value);
        }
      }
    });
    
    return result;
  }

  // Cleanup
  async disconnect() {
    if (this.redis) {
      await this.redis.disconnect();
      console.log('✅ Redis 连接已断开');
    }
  }
}

// Singleton instance
const cache = new RedisCache();

/**
 * Cache middleware for API responses
 */
export const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator 
      ? keyGenerator(req) 
      : `api:${req.path}:${JSON.stringify(req.query)}`;

    try {
      // Try to get from cache
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Cache miss - capture response
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);
      
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200 && data.success !== false) {
          cache.set(cacheKey, data, ttl).catch(err => {
            console.error('缓存设置错误:', err.message);
          });
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('缓存中间件错误:', error.message);
      next(); // Continue without caching
    }
  };
};

/**
 * Rate limiting using Redis
 */
export const redisRateLimit = (maxRequests = 100, windowMs = 900000) => {
  return async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `rate_limit:${ip}`;
    
    try {
      const current = await cache.get(key) || 0;
      
      if (current >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: '请求过于频繁',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      // Increment counter
      await cache.set(key, current + 1, Math.ceil(windowMs / 1000));
      
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current - 1));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
      
      next();
    } catch (error) {
      console.error('Redis 限流错误:', error.message);
      next(); // Continue without rate limiting
    }
  };
};

/**
 * Session storage using Redis
 */
export const redisSessionMiddleware = async (req, res, next) => {
  const sessionId = req.get('X-Session-ID') || req.query.sessionId;
  
  if (sessionId) {
    try {
      const sessionData = await cache.get(`session:${sessionId}`);
      if (sessionData) {
        req.session = sessionData;
        
        // Extend session expiry
        await cache.set(`session:${sessionId}`, sessionData, 3600); // 1 hour
      }
    } catch (error) {
      console.error('Redis 会话错误:', error.message);
    }
  }
  
  next();
};

export { cache };
export default cache;
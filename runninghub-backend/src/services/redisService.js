/**
 * Redis Service for Caching and Session Management
 * Comprehensive Redis implementation for Cosnap AI backend
 */

import Redis from 'ioredis';
import { productionConfig } from '../config/production.js';

class RedisService {
  constructor() {
    this.client = null;
    this.cluster = null;
    this.isConnected = false;
    this.isClusterMode = false;
    
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      const { redis } = productionConfig;
      
      if (!redis.enabled) {
        console.log('📦 Redis is disabled, using in-memory fallback');
        return;
      }

      // Cluster mode initialization
      if (redis.cluster.enabled && redis.cluster.nodes.length > 0) {
        this.cluster = new Redis.Cluster(redis.cluster.nodes, {
          redisOptions: {
            password: redis.password,
            connectTimeout: redis.connectTimeout,
            commandTimeout: redis.commandTimeout,
            maxRetriesPerRequest: redis.maxRetriesPerRequest,
            retryDelayOnFailover: redis.retryDelayOnFailover
          },
          enableOfflineQueue: false,
          scaleReads: 'slave'
        });

        this.client = this.cluster;
        this.isClusterMode = true;
        console.log('🔗 Redis cluster mode initialized');
      } 
      // Single instance mode
      else {
        const config = {
          host: redis.host,
          port: redis.port,
          password: redis.password,
          db: redis.db,
          connectTimeout: redis.connectTimeout,
          commandTimeout: redis.commandTimeout,
          maxRetriesPerRequest: redis.maxRetriesPerRequest,
          retryDelayOnFailover: redis.retryDelayOnFailover,
          enableOfflineQueue: false,
          lazyConnect: true,
          
          // Connection pool settings
          family: 4,
          keepAlive: true
        };

        // Use Redis URL if provided
        if (redis.url) {
          this.client = new Redis(redis.url, config);
        } else {
          this.client = new Redis(config);
        }

        console.log('🔗 Redis single instance mode initialized');
      }

      // Event handlers
      this.setupEventHandlers();
      
      // Connect and test
      await this.connect();
      
    } catch (error) {
      console.error('❌ Redis initialization failed:', error.message);
      this.handleConnectionError(error);
    }
  }

  /**
   * Setup Redis event handlers
   */
  setupEventHandlers() {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('🚀 Redis is ready to accept commands');
    });

    this.client.on('error', (error) => {
      // 减少Redis错误日志噪音，只在首次失败时记录
      if (this.isConnected) {
        console.error('❌ Redis connection error:', error.message);
      }
      this.isConnected = false;
      this.handleConnectionError(error);
    });

    this.client.on('close', () => {
      if (this.isConnected) {
        console.log('⚠️ Redis connection closed');
      }
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      // 减少重连日志，避免日志噪音
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Redis reconnecting...');
      }
    });

    this.client.on('end', () => {
      if (this.isConnected) {
        console.log('🔚 Redis connection ended');
      }
      this.isConnected = false;
    });
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      await this.client.ping();
      this.isConnected = true;
      console.log('🎯 Redis connection test successful');
      
      // Test basic operations
      await this.testOperations();
      
    } catch (error) {
      console.error('❌ Redis connection test failed:', error.message);
      throw error;
    }
  }

  /**
   * Test basic Redis operations
   */
  async testOperations() {
    try {
      await this.set('test:connection', 'ok', 60);
      const result = await this.get('test:connection');
      await this.del('test:connection');
      
      if (result === 'ok') {
        console.log('✅ Redis operations test passed');
      } else {
        throw new Error('Redis test operation failed');
      }
    } catch (error) {
      console.error('❌ Redis operations test failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle connection errors with fallback
   */
  handleConnectionError(error) {
    console.warn('⚠️ Redis error, falling back to in-memory cache');
    this.isConnected = false;
    
    // Log error details for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error('Redis error details:', error);
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable() {
    return this.client && this.isConnected;
  }

  // =============================================================================
  // BASIC CACHE OPERATIONS
  // =============================================================================

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = 3600) {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.set(key, value, ttl);
      }

      const serializedValue = this.serialize(value);
      
      if (ttl > 0) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error.message);
      return this.memoryCache.set(key, value, ttl);
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   */
  async get(key) {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.get(key);
      }

      const value = await this.client.get(key);
      return value ? this.deserialize(value) : null;
      
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error.message);
      return this.memoryCache.get(key);
    }
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.del(key);
      }

      const result = await this.client.del(key);
      return result > 0;
      
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error.message);
      return this.memoryCache.del(key);
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   */
  async exists(key) {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.exists(key);
      }

      const result = await this.client.exists(key);
      return result === 1;
      
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error.message);
      return this.memoryCache.exists(key);
    }
  }

  /**
   * Set expiration time for a key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   */
  async expire(key, ttl) {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.expire(key, ttl);
      }

      const result = await this.client.expire(key, ttl);
      return result === 1;
      
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error.message);
      return this.memoryCache.expire(key, ttl);
    }
  }

  // =============================================================================
  // ADVANCED CACHE OPERATIONS
  // =============================================================================

  /**
   * Get multiple keys at once
   * @param {string[]} keys - Array of cache keys
   */
  async mget(keys) {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.mget(keys);
      }

      const values = await this.client.mget(keys);
      return values.map(value => value ? this.deserialize(value) : null);
      
    } catch (error) {
      console.error('Redis MGET error:', error.message);
      return this.memoryCache.mget(keys);
    }
  }

  /**
   * Set multiple key-value pairs
   * @param {Object} keyValues - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds
   */
  async mset(keyValues, ttl = 3600) {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.mset(keyValues, ttl);
      }

      const pipeline = this.client.pipeline();
      
      for (const [key, value] of Object.entries(keyValues)) {
        const serializedValue = this.serialize(value);
        
        if (ttl > 0) {
          pipeline.setex(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      }
      
      await pipeline.exec();
      return true;
      
    } catch (error) {
      console.error('Redis MSET error:', error.message);
      return this.memoryCache.mset(keyValues, ttl);
    }
  }

  /**
   * Increment a numeric value
   * @param {string} key - Cache key
   * @param {number} increment - Increment value (default: 1)
   */
  async incr(key, increment = 1) {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.incr(key, increment);
      }

      if (increment === 1) {
        return await this.client.incr(key);
      } else {
        return await this.client.incrby(key, increment);
      }
      
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error.message);
      return this.memoryCache.incr(key, increment);
    }
  }

  /**
   * Get keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., "user:*")
   */
  async keys(pattern) {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.keys(pattern);
      }

      // Use SCAN instead of KEYS for better performance in production
      const keys = [];
      const stream = this.client.scanStream({
        match: pattern,
        count: 100
      });

      return new Promise((resolve, reject) => {
        stream.on('data', (resultKeys) => {
          keys.push(...resultKeys);
        });

        stream.on('end', () => {
          resolve(keys);
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
      
    } catch (error) {
      console.error(`Redis KEYS error for pattern ${pattern}:`, error.message);
      return this.memoryCache.keys(pattern);
    }
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  /**
   * Store user session
   * @param {string} sessionId - Session ID
   * @param {Object} sessionData - Session data
   * @param {number} ttl - Session TTL in seconds
   */
  async setSession(sessionId, sessionData, ttl = 86400) {
    const sessionKey = `session:${sessionId}`;
    return await this.set(sessionKey, sessionData, ttl);
  }

  /**
   * Get user session
   * @param {string} sessionId - Session ID
   */
  async getSession(sessionId) {
    const sessionKey = `session:${sessionId}`;
    return await this.get(sessionKey);
  }

  /**
   * Delete user session
   * @param {string} sessionId - Session ID
   */
  async destroySession(sessionId) {
    const sessionKey = `session:${sessionId}`;
    return await this.del(sessionKey);
  }

  /**
   * Extend session expiration
   * @param {string} sessionId - Session ID
   * @param {number} ttl - New TTL in seconds
   */
  async touchSession(sessionId, ttl = 86400) {
    const sessionKey = `session:${sessionId}`;
    return await this.expire(sessionKey, ttl);
  }

  // =============================================================================
  // RATE LIMITING
  // =============================================================================

  /**
   * Check and increment rate limit counter
   * @param {string} identifier - User/IP identifier
   * @param {number} limit - Rate limit
   * @param {number} window - Time window in seconds
   */
  async checkRateLimit(identifier, limit, window) {
    try {
      const key = `rate_limit:${identifier}`;
      
      if (!this.isAvailable()) {
        // Simple in-memory rate limiting fallback
        return this.memoryCache.checkRateLimit(identifier, limit, window);
      }

      const current = await this.incr(key);
      
      if (current === 1) {
        await this.expire(key, window);
      }
      
      return {
        count: current,
        limit: limit,
        remaining: Math.max(0, limit - current),
        resetTime: Date.now() + (window * 1000),
        blocked: current > limit
      };
      
    } catch (error) {
      console.error(`Rate limit check error for ${identifier}:`, error.message);
      // Allow request on error
      return {
        count: 0,
        limit: limit,
        remaining: limit,
        resetTime: Date.now() + (window * 1000),
        blocked: false
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Serialize value for storage
   * @param {any} value - Value to serialize
   */
  serialize(value) {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  /**
   * Deserialize value from storage
   * @param {string} value - Serialized value
   */
  deserialize(value) {
    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as string if not valid JSON
    }
  }

  /**
   * Flush all cache data
   */
  async flushAll() {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.flushAll();
      }

      await this.client.flushall();
      console.log('🗑️ Redis cache flushed');
      return true;
      
    } catch (error) {
      console.error('Redis FLUSHALL error:', error.message);
      return false;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo() {
    try {
      if (!this.isAvailable()) {
        return this.memoryCache.getInfo();
      }

      const info = await this.client.info();
      return this.parseRedisInfo(info);
      
    } catch (error) {
      console.error('Redis INFO error:', error.message);
      return null;
    }
  }

  /**
   * Parse Redis INFO output
   * @param {string} info - Redis INFO output
   */
  parseRedisInfo(info) {
    const sections = {};
    let currentSection = 'general';
    
    info.split('\r\n').forEach(line => {
      if (line.startsWith('# ')) {
        currentSection = line.substring(2).toLowerCase();
        sections[currentSection] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (!sections[currentSection]) {
          sections[currentSection] = {};
        }
        sections[currentSection][key] = value;
      }
    });
    
    return sections;
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        console.log('👋 Redis connection closed gracefully');
      }
    } catch (error) {
      console.error('Error closing Redis connection:', error.message);
    }
  }

  // =============================================================================
  // IN-MEMORY FALLBACK
  // =============================================================================

  memoryCache = {
    cache: new Map(),
    timers: new Map(),

    set(key, value, ttl) {
      this.cache.set(key, value);
      
      if (ttl > 0) {
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
        }
        
        const timer = setTimeout(() => {
          this.cache.delete(key);
          this.timers.delete(key);
        }, ttl * 1000);
        
        this.timers.set(key, timer);
      }
      
      return true;
    },

    get(key) {
      return this.cache.get(key) || null;
    },

    del(key) {
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      return this.cache.delete(key);
    },

    exists(key) {
      return this.cache.has(key);
    },

    expire(key, ttl) {
      if (!this.cache.has(key)) return false;
      
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }
      
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl * 1000);
      
      this.timers.set(key, timer);
      return true;
    },

    mget(keys) {
      return keys.map(key => this.cache.get(key) || null);
    },

    mset(keyValues, ttl) {
      for (const [key, value] of Object.entries(keyValues)) {
        this.set(key, value, ttl);
      }
      return true;
    },

    incr(key, increment = 1) {
      const current = this.cache.get(key) || 0;
      const newValue = current + increment;
      this.cache.set(key, newValue);
      return newValue;
    },

    keys(pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return Array.from(this.cache.keys()).filter(key => regex.test(key));
    },

    checkRateLimit(identifier, limit, window) {
      const key = `rate_limit:${identifier}`;
      const current = this.incr(key);
      
      if (current === 1) {
        this.expire(key, window);
      }
      
      return {
        count: current,
        limit: limit,
        remaining: Math.max(0, limit - current),
        resetTime: Date.now() + (window * 1000),
        blocked: current > limit
      };
    },

    flushAll() {
      this.cache.clear();
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers.clear();
      return true;
    },

    getInfo() {
      return {
        memory: {
          size: this.cache.size,
          timers: this.timers.size
        }
      };
    }
  };
}

// Create singleton instance
const redisService = new RedisService();

export default redisService;
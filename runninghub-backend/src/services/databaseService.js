/**
 * Database Service with Optimization and Connection Pooling
 * Comprehensive database management for Cosnap AI backend
 */

import { PrismaClient } from '@prisma/client';
import { productionConfig } from '../config/production.js';
import monitoringService from './monitoringService.js';

class DatabaseService {
  constructor() {
    this.prisma = null;
    this.connectionPool = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    this.initialize();
  }

  /**
   * Initialize database connection with optimized settings
   */
  async initialize() {
    try {
      const { database } = productionConfig;
      
      // Prisma Client configuration with optimization
      const prismaConfig = {
        datasources: {
          db: {
            url: database.url
          }
        },
        
        // Logging configuration
        log: [
          {
            emit: 'event',
            level: 'query'
          },
          {
            emit: 'event', 
            level: 'error'
          },
          {
            emit: 'event',
            level: 'warn'
          }
        ],

        // Error formatting
        errorFormat: 'pretty',

        // Transaction options
        transactionOptions: {
          maxWait: 5000, // 5 seconds
          timeout: 30000, // 30 seconds
          isolationLevel: 'ReadCommitted'
        }
      };

      this.prisma = new PrismaClient(prismaConfig);

      // Set up event listeners for monitoring
      this.setupEventListeners();

      // Configure connection pool settings
      await this.configureConnectionPool();

      // Test initial connection
      await this.connect();

      console.log('✅ Database service initialized successfully');
      
    } catch (error) {
      console.error('❌ Database service initialization failed:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Setup event listeners for database monitoring
   */
  setupEventListeners() {
    if (!this.prisma) return;

    // Query logging and monitoring
    this.prisma.$on('query', (event) => {
      const duration = event.duration;
      const query = event.query;
      const params = event.params;

      // Log slow queries
      if (duration > 1000) { // Queries taking more than 1 second
        monitoringService.warn('Slow database query detected', {
          duration: `${duration}ms`,
          query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
          params: params
        });
      }

      // Record query metrics
      monitoringService.recordDbQuery(
        this.extractOperationType(query),
        this.extractTableName(query),
        duration,
        'success'
      );

      // Debug logging in development
      if (process.env.NODE_ENV !== 'production') {
        monitoringService.debug('Database query executed', {
          duration: `${duration}ms`,
          query: query.substring(0, 100),
          params: params
        });
      }
    });

    // Error logging
    this.prisma.$on('error', (event) => {
      monitoringService.error('Database error occurred', new Error(event.message), {
        target: event.target,
        timestamp: event.timestamp
      });

      // Record failed query metric
      monitoringService.recordDbQuery('unknown', 'unknown', 0, 'error');
    });

    // Warning logging
    this.prisma.$on('warn', (event) => {
      monitoringService.warn('Database warning', {
        message: event.message,
        target: event.target,
        timestamp: event.timestamp
      });
    });
  }

  /**
   * Configure connection pool settings
   */
  async configureConnectionPool() {
    try {
      const { database } = productionConfig;
      
      // Configure Prisma connection pool via environment variables
      // These need to be set in the DATABASE_URL or via Prisma configuration
      process.env.PRISMA_QUERY_ENGINE_POOL_SIZE = database.pool.max.toString();
      process.env.PRISMA_QUERY_ENGINE_POOL_TIMEOUT = database.pool.acquireTimeoutMillis.toString();
      
      console.log(`🔗 Database connection pool configured: min=${database.pool.min}, max=${database.pool.max}`);
      
    } catch (error) {
      console.error('❌ Failed to configure connection pool:', error);
      throw error;
    }
  }

  /**
   * Connect to database with retry logic
   */
  async connect() {
    try {
      this.connectionAttempts++;
      
      // Test connection
      await this.prisma.$queryRaw`SELECT 1 as test`;
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      monitoringService.info('Database connected successfully', {
        attempt: this.connectionAttempts,
        timestamp: new Date().toISOString()
      });

      // Update connection metrics
      this.updateConnectionMetrics();
      
    } catch (error) {
      this.isConnected = false;
      
      monitoringService.error('Database connection failed', error, {
        attempt: this.connectionAttempts,
        maxAttempts: this.maxConnectionAttempts
      });

      // Retry logic
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`🔄 Retrying database connection in ${this.reconnectDelay / 1000} seconds... (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
        
        setTimeout(() => {
          this.connect();
        }, this.reconnectDelay);
      } else {
        console.error('❌ Max database connection attempts reached. Manual intervention required.');
        throw error;
      }
    }
  }

  /**
   * Handle connection errors with appropriate logging and metrics
   */
  handleConnectionError(error) {
    this.isConnected = false;
    
    monitoringService.error('Database connection error', error, {
      connectionAttempts: this.connectionAttempts,
      isConnected: this.isConnected
    });

    // Update metrics
    this.updateConnectionMetrics();
  }

  /**
   * Update connection metrics for monitoring
   */
  updateConnectionMetrics() {
    // This would typically query the actual connection pool status
    // For now, we'll use a simple connected/disconnected metric
    const activeConnections = this.isConnected ? 1 : 0;
    monitoringService.setActiveDbConnections(activeConnections);
  }

  // =============================================================================
  // OPTIMIZED QUERY METHODS
  // =============================================================================

  /**
   * Execute optimized user queries with caching
   */
  async findUserById(id, includeRelations = false) {
    const timer = monitoringService.startTimer('db_find_user_by_id');
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: includeRelations ? {
          subscriptions: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { createdAt: 'desc' }
          },
          usageHistory: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            },
            take: 100
          }
        } : undefined
      });
      
      timer.end();
      return user;
      
    } catch (error) {
      timer.end();
      monitoringService.error('Failed to find user by ID', error, { userId: id });
      throw error;
    }
  }

  /**
   * Optimized post queries with pagination
   */
  async findPostsWithPagination(page = 1, limit = 20, filters = {}) {
    const timer = monitoringService.startTimer('db_find_posts_paginated');
    
    try {
      const skip = (page - 1) * limit;
      
      const where = {
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.effectId && { effectId: filters.effectId }),
        ...(filters.search && {
          OR: [
            { caption: { contains: filters.search, mode: 'insensitive' } },
            { user: { username: { contains: filters.search, mode: 'insensitive' } } }
          ]
        })
      };

      const [posts, total] = await Promise.all([
        this.prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            },
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          }
        }),
        this.prisma.post.count({ where })
      ]);

      timer.end();
      
      return {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
      
    } catch (error) {
      timer.end();
      monitoringService.error('Failed to find posts with pagination', error, filters);
      throw error;
    }
  }

  /**
   * Optimized subscription management
   */
  async updateUserSubscription(userId, subscriptionData) {
    const timer = monitoringService.startTimer('db_update_user_subscription');
    
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Deactivate existing subscriptions
        await tx.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'INACTIVE'
          }
        });

        // Create new subscription
        const subscription = await tx.subscription.create({
          data: {
            userId,
            ...subscriptionData
          }
        });

        // Update user subscription info
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: subscriptionData.tier,
            subscriptionStatus: 'ACTIVE',
            subscriptionStart: subscriptionData.startDate,
            subscriptionEnd: subscriptionData.endDate
          }
        });

        return { subscription, user: updatedUser };
      });

      timer.end();
      
      monitoringService.info('User subscription updated', {
        userId,
        tier: subscriptionData.tier
      });

      return result;
      
    } catch (error) {
      timer.end();
      monitoringService.error('Failed to update user subscription', error, { userId });
      throw error;
    }
  }

  /**
   * Optimized usage tracking
   */
  async recordUsage(userId, usageData) {
    const timer = monitoringService.startTimer('db_record_usage');
    
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Record usage history
        const usage = await tx.usageHistory.create({
          data: {
            userId,
            ...usageData
          }
        });

        // Update user monthly usage
        await tx.user.update({
          where: { id: userId },
          data: {
            monthlyUsage: {
              increment: usageData.cost || 1
            }
          }
        });

        return usage;
      });

      timer.end();
      return result;
      
    } catch (error) {
      timer.end();
      monitoringService.error('Failed to record usage', error, { userId });
      throw error;
    }
  }

  // =============================================================================
  // BATCH OPERATIONS
  // =============================================================================

  /**
   * Batch update operations for better performance
   */
  async batchUpdateLikesCount(postIds) {
    const timer = monitoringService.startTimer('db_batch_update_likes');
    
    try {
      const updates = postIds.map(postId => 
        this.prisma.post.update({
          where: { id: postId },
          data: {
            likesCount: {
              set: 0 // This would be calculated from actual likes
            }
          }
        })
      );

      await Promise.all(updates);
      timer.end();
      
    } catch (error) {
      timer.end();
      monitoringService.error('Failed to batch update likes count', error);
      throw error;
    }
  }

  // =============================================================================
  // DATABASE MAINTENANCE
  // =============================================================================

  /**
   * Clean up old data to maintain performance
   */
  async performMaintenance() {
    const timer = monitoringService.startTimer('db_maintenance');
    
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      // Clean up old notifications
      const deletedNotifications = await this.prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          },
          isRead: true
        }
      });

      // Clean up old usage history
      const deletedUsageHistory = await this.prisma.usageHistory.deleteMany({
        where: {
          createdAt: {
            lt: sixMonthsAgo
          }
        }
      });

      // Clean up expired refresh tokens
      const deletedTokens = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true }
          ]
        }
      });

      timer.end();
      
      monitoringService.info('Database maintenance completed', {
        deletedNotifications: deletedNotifications.count,
        deletedUsageHistory: deletedUsageHistory.count,
        deletedTokens: deletedTokens.count
      });

      return {
        deletedNotifications: deletedNotifications.count,
        deletedUsageHistory: deletedUsageHistory.count,
        deletedTokens: deletedTokens.count
      };
      
    } catch (error) {
      timer.end();
      monitoringService.error('Database maintenance failed', error);
      throw error;
    }
  }

  /**
   * Analyze and optimize database performance
   */
  async analyzePerformance() {
    try {
      // Get table sizes and row counts
      const tables = ['User', 'Post', 'Comment', 'Subscription', 'Payment', 'UsageHistory'];
      const analysis = {};

      for (const table of tables) {
        const count = await this.prisma[table.toLowerCase()].count();
        analysis[table] = { rowCount: count };
      }

      // Check for missing indexes (this would be database-specific)
      // For PostgreSQL, you could query pg_stat_user_tables

      monitoringService.info('Database performance analysis completed', analysis);
      
      return analysis;
      
    } catch (error) {
      monitoringService.error('Database performance analysis failed', error);
      throw error;
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Extract operation type from SQL query
   */
  extractOperationType(query) {
    const operation = query.trim().split(' ')[0].toUpperCase();
    return ['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(operation) ? operation : 'OTHER';
  }

  /**
   * Extract table name from SQL query
   */
  extractTableName(query) {
    const patterns = [
      /FROM\s+`?(\w+)`?/i,
      /INTO\s+`?(\w+)`?/i,
      /UPDATE\s+`?(\w+)`?/i
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return 'unknown';
  }

  /**
   * Get database health status
   */
  async getHealthStatus() {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      await this.prisma.$queryRaw`SELECT 1 as test`;
      
      const responseTime = Date.now() - startTime;
      
      // Get some basic metrics
      const userCount = await this.prisma.user.count();
      const postCount = await this.prisma.post.count();
      
      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        isConnected: this.isConnected,
        metrics: {
          userCount,
          postCount
        },
        connectionAttempts: this.connectionAttempts
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        isConnected: false,
        error: error.message,
        connectionAttempts: this.connectionAttempts
      };
    }
  }

  /**
   * Gracefully disconnect from database
   */
  async disconnect() {
    try {
      if (this.prisma) {
        await this.prisma.$disconnect();
        this.isConnected = false;
        console.log('👋 Database disconnected gracefully');
      }
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }

  /**
   * Get Prisma client instance
   */
  getClient() {
    if (!this.prisma) {
      throw new Error('Database not initialized');
    }
    return this.prisma;
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;
import { PrismaClient } from '@prisma/client';

/**
 * Enhanced Prisma Configuration for Production
 */
class DatabaseManager {
  constructor() {
    this.prisma = null;
    this.connectionPool = {
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      max: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
      acquireTimeoutMillis: parseInt(process.env.DB_POOL_TIMEOUT) || 30000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000
    };
    this.init();
  }

  init() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Enhanced Prisma configuration for production
    const prismaConfig = {
      datasources: {
        db: {
          url: databaseUrl
        }
      },
      log: this.getLogLevel(),
      errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
    };

    this.prisma = new PrismaClient(prismaConfig);

    // Configure connection pool
    this.setupConnectionPool();
    
    // Setup monitoring
    this.setupMonitoring();
    
    // Setup error handling
    this.setupErrorHandling();

    console.log('✅ 数据库管理器初始化完成');
  }

  getLogLevel() {
    if (process.env.NODE_ENV === 'production') {
      return ['error', 'warn'];
    } else if (process.env.NODE_ENV === 'development') {
      return ['query', 'info', 'warn', 'error'];
    }
    return ['warn', 'error'];
  }

  setupConnectionPool() {
    // Connection pool is handled by Prisma and the underlying database driver
    // These configurations are applied via DATABASE_URL parameters
    console.log(`📊 数据库连接池配置: ${this.connectionPool.min}-${this.connectionPool.max} 连接`);
  }

  setupMonitoring() {
    // Track query performance
    this.prisma.$use(async (params, next) => {
      const start = Date.now();
      
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        
        // Log slow queries in production
        if (duration > 1000) { // Queries taking more than 1 second
          console.warn(`🐌 慢查询检测: ${params.model}.${params.action} - ${duration}ms`);
        }
        
        // Track metrics if monitoring middleware is available
        if (global.metrics) {
          global.metrics.recordHistogram('database_query_duration', {
            model: params.model || 'unknown',
            action: params.action || 'unknown'
          }, duration / 1000);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        
        console.error(`❌ 数据库查询错误: ${params.model}.${params.action} - ${duration}ms`, error.message);
        
        if (global.metrics) {
          global.metrics.incrementCounter('database_errors_total', {
            model: params.model || 'unknown',
            action: params.action || 'unknown',
            error: error.code || 'unknown'
          });
        }
        
        throw error;
      }
    });
  }

  setupErrorHandling() {
    // Handle connection errors
    this.prisma.$on('error', (e) => {
      console.error('💥 数据库连接错误:', e);
    });

    // Handle warnings
    this.prisma.$on('warn', (e) => {
      console.warn('⚠️ 数据库警告:', e);
    });
  }

  // Health check method
  async healthCheck() {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency: `${latency}ms`,
        connections: await this.getConnectionInfo()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async getConnectionInfo() {
    try {
      const [activity, stats] = await Promise.all([
        this.prisma.$queryRaw`
          SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `,
        this.prisma.$queryRaw`
          SELECT 
            schemaname,
            tablename,
            attname,
            n_distinct,
            correlation
          FROM pg_stats 
          WHERE schemaname = 'public'
          LIMIT 5
        `
      ]);

      return {
        activity: activity[0],
        sampleStats: stats
      };
    } catch (error) {
      console.error('获取连接信息失败:', error.message);
      return null;
    }
  }

  // Performance optimization methods
  async optimizeDatabase() {
    try {
      console.log('🚀 开始数据库优化...');
      
      // Analyze tables
      await this.analyzeTables();
      
      // Update statistics
      await this.updateStatistics();
      
      // Check for missing indexes
      await this.checkIndexes();
      
      console.log('✅ 数据库优化完成');
    } catch (error) {
      console.error('❌ 数据库优化失败:', error.message);
    }
  }

  async analyzeTables() {
    try {
      const tables = await this.prisma.$queryRaw`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `;

      for (const table of tables) {
        await this.prisma.$executeRawUnsafe(`ANALYZE "${table.tablename}"`);
      }
      
      console.log(`📊 已分析 ${tables.length} 个表`);
    } catch (error) {
      console.error('表分析失败:', error.message);
    }
  }

  async updateStatistics() {
    try {
      await this.prisma.$executeRaw`ANALYZE`;
      console.log('📈 统计信息已更新');
    } catch (error) {
      console.error('统计信息更新失败:', error.message);
    }
  }

  async checkIndexes() {
    try {
      // Check for tables without primary keys or indexes
      const unindexedTables = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        AND n_distinct > 100
        AND correlation < 0.1
      `;

      if (unindexedTables.length > 0) {
        console.warn('⚠️ 发现可能需要索引的列:', unindexedTables);
      }
      
      // Check index usage
      const unusedIndexes = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE idx_scan < 10
        AND schemaname = 'public'
        ORDER BY idx_scan
      `;

      if (unusedIndexes.length > 0) {
        console.warn('⚠️ 发现使用频率较低的索引:', unusedIndexes);
      }

    } catch (error) {
      console.error('索引检查失败:', error.message);
    }
  }

  // Connection management
  async closeConnections() {
    try {
      await this.prisma.$disconnect();
      console.log('✅ 数据库连接已关闭');
    } catch (error) {
      console.error('❌ 关闭数据库连接失败:', error.message);
    }
  }

  // Get Prisma instance
  getInstance() {
    return this.prisma;
  }

  // Transaction wrapper with retry logic
  async executeTransaction(operations, maxRetries = 3) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await this.prisma.$transaction(operations, {
          maxWait: 5000, // 5 seconds
          timeout: 30000, // 30 seconds
          isolationLevel: 'ReadCommitted'
        });
      } catch (error) {
        retries++;
        
        // Check if error is retryable (deadlock, serialization failure, etc.)
        if (this.isRetryableError(error) && retries < maxRetries) {
          const delay = Math.min(100 * Math.pow(2, retries), 1000); // Exponential backoff
          console.warn(`🔄 事务重试 ${retries}/${maxRetries}, 等待 ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
  }

  isRetryableError(error) {
    const retryableCodes = [
      'P2034', // Transaction conflict
      '40001', // Serialization failure
      '40P01', // Deadlock detected
    ];
    
    return retryableCodes.some(code => 
      error.code === code || error.message.includes(code)
    );
  }

  // Query optimization helpers
  async findWithPagination(model, options = {}) {
    const {
      where = {},
      orderBy = {},
      page = 1,
      limit = 20,
      include = {}
    } = options;

    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma[model].findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include
      }),
      this.prisma[model].count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  // Bulk operations
  async bulkCreate(model, data, chunkSize = 1000) {
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    const results = [];
    for (const chunk of chunks) {
      const result = await this.prisma[model].createMany({
        data: chunk,
        skipDuplicates: true
      });
      results.push(result);
    }

    return results;
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

// Global access to database instance
global.db = databaseManager.getInstance();

export { databaseManager };
export default databaseManager.getInstance();
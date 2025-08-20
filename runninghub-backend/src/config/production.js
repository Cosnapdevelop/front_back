/**
 * Production Environment Configuration
 * Comprehensive production settings for Cosnap AI backend
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';

export const productionConfig = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // SSL/TLS Configuration
    ssl: {
      enabled: process.env.SSL_ENABLED === 'true',
      keyPath: process.env.SSL_KEY_PATH,
      certPath: process.env.SSL_CERT_PATH,
      caPath: process.env.SSL_CA_PATH
    },
    
    // Request Configuration
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
    maxFileSize: process.env.MAX_FILE_SIZE || '30mb'
  },

  // Database Configuration with Connection Pooling
  database: {
    url: process.env.DATABASE_URL,
    
    // Connection Pool Settings
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
      createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 30000,
      destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000,
      createRetryIntervalMillis: parseInt(process.env.DB_RETRY_INTERVAL) || 200
    },
    
    // Query Configuration
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 10000,
    logLevel: isProduction ? 'warn' : 'info',
    
    // SSL Configuration for Production DB
    ssl: {
      enabled: process.env.DB_SSL_ENABLED === 'true',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    }
  },

  // Redis Configuration
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    
    // Connection Pool
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY) || 100,
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT) || 5000,
    
    // Cluster Configuration
    cluster: {
      enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
      nodes: process.env.REDIS_CLUSTER_NODES ? 
        process.env.REDIS_CLUSTER_NODES.split(',') : []
    }
  },

  // CORS Configuration
  cors: {
    origins: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : [
        'https://cosnap.vercel.app',
        'https://*.vercel.app',
        ...(isProduction ? [] : ['http://localhost:5173', 'http://localhost:3000'])
      ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization', 
      'X-Requested-With',
      'X-Forwarded-For',
      'X-Real-IP'
    ],
    maxAge: 86400 // 24 hours
  },

  // Security Configuration
  security: {
    // JWT Configuration
    jwt: {
      accessTokenSecret: process.env.JWT_ACCESS_SECRET,
      refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
      accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
      issuer: process.env.JWT_ISSUER || 'cosnap-ai',
      audience: process.env.JWT_AUDIENCE || 'cosnap-users'
    },

    // Rate Limiting
    rateLimiting: {
      // General API rate limiting
      general: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 min
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        skipSuccessfulRequests: false
      },
      
      // Authentication endpoints
      auth: {
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW) || 900000, // 15 min
        max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
        skipSuccessfulRequests: true
      },
      
      // File upload endpoints
      upload: {
        windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW) || 3600000, // 1 hour
        max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX) || 20
      },
      
      // AI effects processing
      effects: {
        windowMs: parseInt(process.env.EFFECTS_RATE_LIMIT_WINDOW) || 3600000, // 1 hour
        max: parseInt(process.env.EFFECTS_RATE_LIMIT_MAX) || 50
      }
    },

    // Security Headers
    headers: {
      contentSecurityPolicy: {
        enabled: process.env.CSP_ENABLED !== 'false',
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https:", "wss:"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      
      hsts: {
        enabled: isProduction,
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }
    },

    // Input Validation
    validation: {
      maxFieldSize: parseInt(process.env.MAX_FIELD_SIZE) || 1024,
      maxFields: parseInt(process.env.MAX_FIELDS) || 100,
      maxFileFields: parseInt(process.env.MAX_FILE_FIELDS) || 10
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info'),
    format: process.env.LOG_FORMAT || 'json',
    
    // File Logging
    file: {
      enabled: process.env.FILE_LOGGING_ENABLED === 'true',
      filename: process.env.LOG_FILE || 'cosnap-backend.log',
      maxsize: parseInt(process.env.LOG_MAX_SIZE) || 10485760, // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
    },
    
    // External Logging Services
    external: {
      // LogRocket, Sentry, etc.
      sentry: {
        enabled: process.env.SENTRY_ENABLED === 'true',
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
        environment: process.env.NODE_ENV
      }
    }
  },

  // Monitoring Configuration
  monitoring: {
    // Health Check Configuration
    healthCheck: {
      enabled: true,
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
      
      // Custom health checks
      checks: {
        database: true,
        redis: process.env.REDIS_ENABLED === 'true',
        runningHubApi: true,
        aliOss: true
      }
    },

    // Metrics Collection
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      endpoint: '/metrics',
      collectDefaultMetrics: true,
      
      // Prometheus Configuration
      prometheus: {
        enabled: process.env.PROMETHEUS_ENABLED === 'true',
        prefix: 'cosnap_backend_'
      }
    },

    // Performance Monitoring
    performance: {
      enabled: process.env.PERFORMANCE_MONITORING_ENABLED === 'true',
      sampleRate: parseFloat(process.env.PERFORMANCE_SAMPLE_RATE) || 0.1
    }
  },

  // Caching Configuration
  caching: {
    // API Response Caching
    apiCache: {
      enabled: process.env.API_CACHE_ENABLED === 'true',
      defaultTtl: parseInt(process.env.API_CACHE_TTL) || 300, // 5 minutes
      
      // Cache strategies by endpoint
      strategies: {
        effects: {
          ttl: parseInt(process.env.EFFECTS_CACHE_TTL) || 3600, // 1 hour
          maxSize: parseInt(process.env.EFFECTS_CACHE_SIZE) || 100
        },
        community: {
          ttl: parseInt(process.env.COMMUNITY_CACHE_TTL) || 300, // 5 minutes
          maxSize: parseInt(process.env.COMMUNITY_CACHE_SIZE) || 50
        }
      }
    },

    // Session Caching
    session: {
      enabled: process.env.SESSION_CACHE_ENABLED === 'true',
      ttl: parseInt(process.env.SESSION_CACHE_TTL) || 86400, // 24 hours
      checkPeriod: parseInt(process.env.SESSION_CACHE_CHECK_PERIOD) || 600 // 10 minutes
    }
  },

  // File Storage Configuration
  storage: {
    // Ali OSS Configuration
    aliOss: {
      region: process.env.ALI_OSS_REGION,
      accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET,
      bucket: process.env.ALI_OSS_BUCKET,
      endpoint: process.env.ALI_OSS_ENDPOINT,
      
      // Upload Configuration
      maxFileSize: parseInt(process.env.ALI_OSS_MAX_FILE_SIZE) || 31457280, // 30MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp'
      ],
      
      // CDN Configuration
      cdn: {
        enabled: process.env.ALI_OSS_CDN_ENABLED === 'true',
        domain: process.env.ALI_OSS_CDN_DOMAIN
      }
    }
  },

  // External API Configuration
  apis: {
    // RunningHub API Configuration
    runningHub: {
      baseUrl: {
        china: process.env.RUNNINGHUB_API_URL_CHINA || 'https://api.runninghub.cn',
        hongkong: process.env.RUNNINGHUB_API_URL_HK || 'https://api.runninghub.hk'
      },
      apiKey: process.env.RUNNINGHUB_API_KEY,
      timeout: parseInt(process.env.RUNNINGHUB_TIMEOUT) || 60000,
      retries: parseInt(process.env.RUNNINGHUB_RETRIES) || 3,
      
      // Connection Pool for HTTP requests
      pool: {
        maxSockets: parseInt(process.env.RUNNINGHUB_MAX_SOCKETS) || 10,
        maxFreeSockets: parseInt(process.env.RUNNINGHUB_MAX_FREE_SOCKETS) || 5,
        timeout: parseInt(process.env.RUNNINGHUB_POOL_TIMEOUT) || 60000
      }
    }
  },

  // Payment Configuration
  payment: {
    // WeChat Pay
    wechatPay: {
      appId: process.env.WECHAT_APP_ID,
      mchId: process.env.WECHAT_MCH_ID,
      key: process.env.WECHAT_PAY_KEY,
      certPath: process.env.WECHAT_CERT_PATH,
      keyPath: process.env.WECHAT_KEY_PATH,
      notifyUrl: process.env.WECHAT_NOTIFY_URL
    },

    // Alipay
    alipay: {
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      publicKey: process.env.ALIPAY_PUBLIC_KEY,
      gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
      notifyUrl: process.env.ALIPAY_NOTIFY_URL
    }
  }
};

// Environment Validation
export function validateProductionConfig() {
  const required = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'RUNNINGHUB_API_KEY',
    'ALI_OSS_ACCESS_KEY_ID',
    'ALI_OSS_ACCESS_KEY_SECRET',
    'ALI_OSS_BUCKET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Production-specific validations
  if (isProduction) {
    const productionRequired = [
      'ALLOWED_ORIGINS',
      'SENTRY_DSN'
    ];

    const productionMissing = productionRequired.filter(key => !process.env[key]);
    
    if (productionMissing.length > 0) {
      console.warn(`⚠️ Missing recommended production environment variables: ${productionMissing.join(', ')}`);
    }
  }

  console.log('✅ Production configuration validated successfully');
}

export default productionConfig;
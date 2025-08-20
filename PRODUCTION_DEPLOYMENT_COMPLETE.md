# 🚀 Cosnap AI Production Deployment Guide - Complete Setup

This comprehensive guide covers the complete production deployment setup for Cosnap AI, including monitoring, CI/CD pipeline, security hardening, and performance optimization.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Security Implementation](#security-implementation)
5. [Monitoring and Observability](#monitoring-and-observability)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Performance Optimization](#performance-optimization)
8. [Database Configuration](#database-configuration)
9. [Caching Strategy](#caching-strategy)
10. [Error Tracking](#error-tracking)
11. [Deployment Process](#deployment-process)
12. [Monitoring and Maintenance](#monitoring-and-maintenance)
13. [Troubleshooting](#troubleshooting)

## 🎯 Overview

The production setup includes:

- **Frontend**: React TypeScript app deployed on Vercel
- **Backend**: Express.js API deployed on Railway
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for session management and API caching
- **Monitoring**: Prometheus metrics, Winston logging, Sentry error tracking
- **Security**: Comprehensive middleware, rate limiting, input validation
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Performance**: Multi-level caching, connection pooling, optimization

## 🏗️ Infrastructure Setup

### Production Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Users/CDN     │────│   Load Balancer │────│   Web Servers   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Redis Cache   │    │   Backend API   │
                       └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   File Storage  │    │   PostgreSQL    │
                       │   (Ali OSS)     │    │   Database      │
                       └─────────────────┘    └─────────────────┘
```

### Deployment Targets

- **Frontend**: Vercel (https://cosnap.vercel.app)
- **Backend**: Railway (https://cosnap-backend.railway.app)
- **Database**: Railway PostgreSQL
- **Cache**: Redis (Railway or external provider)
- **File Storage**: Ali OSS Cloud Storage
- **Monitoring**: Self-hosted or SaaS solutions

## ⚙️ Environment Configuration

### Required Environment Variables

#### Backend (.env)
```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_QUERY_TIMEOUT=10000
DB_SSL_ENABLED=true

# Redis Cache
REDIS_ENABLED=true
REDIS_URL=redis://username:password@host:port/0
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000

# JWT Secrets
JWT_ACCESS_SECRET=your-very-secure-access-token-secret-at-least-32-characters
JWT_REFRESH_SECRET=your-very-secure-refresh-token-secret-at-least-32-characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS Configuration
ALLOWED_ORIGINS=https://cosnap.vercel.app,https://your-custom-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
UPLOAD_RATE_LIMIT_MAX=20
EFFECTS_RATE_LIMIT_MAX=50

# Security
CSP_ENABLED=true
SSL_ENABLED=true
MAX_REQUEST_SIZE=10mb
MAX_FILE_SIZE=30mb

# Monitoring
SENTRY_ENABLED=true
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.1
METRICS_ENABLED=true
PROMETHEUS_ENABLED=true

# Ali OSS Storage
ALI_OSS_REGION=oss-cn-hangzhou
ALI_OSS_ACCESS_KEY_ID=your-ali-oss-access-key-id
ALI_OSS_ACCESS_KEY_SECRET=your-ali-oss-access-key-secret
ALI_OSS_BUCKET=your-bucket-name
ALI_OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
ALI_OSS_CDN_ENABLED=true
ALI_OSS_CDN_DOMAIN=https://your-cdn-domain.com

# RunningHub API
RUNNINGHUB_API_KEY=your-runninghub-api-key
RUNNINGHUB_API_URL_CHINA=https://api.runninghub.cn
RUNNINGHUB_API_URL_HK=https://api.runninghub.hk
RUNNINGHUB_TIMEOUT=60000
RUNNINGHUB_RETRIES=3

# Chinese Payments
WECHAT_APP_ID=your-wechat-app-id
WECHAT_MCH_ID=your-wechat-merchant-id
WECHAT_PAY_KEY=your-wechat-pay-key
WECHAT_NOTIFY_URL=https://your-backend-domain.com/api/payments/wechat/notify
ALIPAY_APP_ID=your-alipay-app-id
ALIPAY_PRIVATE_KEY=your-alipay-private-key
ALIPAY_PUBLIC_KEY=your-alipay-public-key
ALIPAY_NOTIFY_URL=https://your-backend-domain.com/api/payments/alipay/notify
```

#### Frontend (.env.production)
```bash
# Application Configuration
VITE_APP_VERSION=1.0.0
VITE_BUILD_TIME=2024-01-01T00:00:00.000Z

# API Configuration
VITE_API_BASE_URL=https://cosnap-backend.railway.app
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_SERVICE_WORKER=true

# Monitoring
VITE_SENTRY_DSN=https://your-frontend-sentry-dsn@sentry.io/project-id
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_GA_ID=G-XXXXXXXXXX
VITE_BAIDU_ANALYTICS_ID=your-baidu-analytics-id
```

## 🔒 Security Implementation

### Security Features Implemented

1. **HTTP Security Headers**
   - Content Security Policy (CSP)
   - HTTP Strict Transport Security (HSTS)
   - X-Frame-Options, X-XSS-Protection
   - Referrer Policy, Permissions Policy

2. **Advanced Rate Limiting**
   - General API rate limiting
   - Authentication endpoint protection
   - File upload rate limiting
   - AI effects processing limits
   - Redis-backed rate limiting with fallback

3. **Input Validation & Sanitization**
   - Express-validator for request validation
   - MongoDB injection prevention
   - XSS and SQL injection protection
   - Custom sanitization middleware

4. **Suspicious Activity Detection**
   - Pattern-based threat detection
   - Bot detection and blocking
   - Rapid request monitoring
   - Security event logging

### Security Configuration Files

- `runninghub-backend/src/middleware/productionSecurity.js`
- `runninghub-backend/src/config/production.js`

## 📊 Monitoring and Observability

### Monitoring Stack

1. **Prometheus Metrics**
   - HTTP request metrics
   - Database query performance
   - Redis operations
   - AI effects processing
   - Payment transactions
   - File uploads
   - Error rates

2. **Structured Logging**
   - Winston-based logging
   - JSON format for production
   - Correlation IDs for request tracing
   - Log levels and rotation

3. **Health Checks**
   - Basic availability (`/health`)
   - Readiness probe (`/health/ready`)
   - Liveness probe (`/health/live`)
   - Detailed health check (`/health/detailed`)
   - Metrics endpoint (`/health/metrics`)

4. **Error Tracking**
   - Sentry integration
   - Error classification and alerting
   - Threshold-based notifications
   - Real-time error monitoring

### Monitoring Configuration Files

- `runninghub-backend/src/services/monitoringService.js`
- `runninghub-backend/src/services/errorTrackingService.js`
- `runninghub-backend/src/routes/health.js`

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

1. **Main CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
   - Code quality checks (ESLint, TypeScript)
   - Security scanning (CodeQL, Semgrep)
   - Unit and integration tests
   - E2E testing with Playwright
   - Docker image building
   - Deployment to staging and production

2. **Security Scanning** (`.github/workflows/security-scan.yml`)
   - Dependency vulnerability scanning
   - Docker image security analysis
   - Secret detection
   - SAST (Static Application Security Testing)
   - License compliance checking

3. **Performance Monitoring** (`.github/workflows/performance-monitoring.yml`)
   - Lighthouse performance audits
   - Load testing with K6
   - Bundle size analysis
   - Performance regression detection

### Deployment Process

1. **Automated Testing**
   ```bash
   # Backend tests
   npm run test:unit
   npm run test:integration
   npm run test:coverage
   
   # Frontend tests
   npm run test:run
   npm run test:e2e
   ```

2. **Security Scans**
   ```bash
   # Dependency scanning
   npm audit --audit-level=high
   
   # Code scanning
   semgrep --config=p/security-audit
   
   # Secret scanning
   trufflehog git file://.
   ```

3. **Build and Deploy**
   ```bash
   # Backend deployment to Railway
   railway deploy --service backend
   
   # Frontend deployment to Vercel
   vercel deploy --prod
   ```

## ⚡ Performance Optimization

### Performance Features

1. **Multi-Level Caching**
   - Memory cache for ultra-fast access
   - Redis cache for session and API data
   - Database query result caching
   - CDN for static assets

2. **Database Optimization**
   - Connection pooling with Prisma
   - Query optimization and monitoring
   - Slow query detection
   - Automated maintenance tasks

3. **API Response Optimization**
   - Response compression
   - Field filtering
   - Pagination optimization
   - Batch processing

4. **Performance Monitoring**
   - Real-time performance metrics
   - Memory usage monitoring
   - API response time tracking
   - Cache hit rate analysis

### Performance Configuration Files

- `runninghub-backend/src/services/performanceService.js`
- `runninghub-backend/src/services/databaseService.js`

## 🗄️ Database Configuration

### Prisma Configuration

```javascript
// Optimized Prisma configuration
const prismaConfig = {
  datasources: {
    db: {
      url: DATABASE_URL
    }
  },
  log: ['query', 'error', 'warn'],
  errorFormat: 'pretty',
  transactionOptions: {
    maxWait: 5000,
    timeout: 30000,
    isolationLevel: 'ReadCommitted'
  }
};
```

### Database Optimization

1. **Connection Pooling**
   - Min connections: 2
   - Max connections: 10
   - Connection timeout: 60 seconds

2. **Query Optimization**
   - Slow query monitoring
   - Index optimization
   - Batch operations

3. **Maintenance Tasks**
   - Automated cleanup of old data
   - Performance analysis
   - Index maintenance

## 🚀 Caching Strategy

### Cache Levels

1. **Memory Cache** (Fastest)
   - Ultra-fast in-memory storage
   - TTL-based expiration
   - Limited size with LRU eviction

2. **Redis Cache** (Fast)
   - Distributed caching
   - Session storage
   - API response caching
   - Rate limiting data

3. **Database Cache** (Persistent)
   - Query result caching
   - Computed values
   - Aggregated data

### Cache Configuration

```javascript
// Cache strategies
const cacheStrategies = {
  api_response: { ttl: 300, strategy: 'lru' },
  user_session: { ttl: 86400, strategy: 'ttl' },
  db_query: { ttl: 300, strategy: 'lru' },
  effects_config: { ttl: 3600, strategy: 'ttl' }
};
```

## 🔍 Error Tracking

### Error Classification

1. **Database Errors** (High Priority)
   - Connection failures
   - Query timeouts
   - Constraint violations

2. **Authentication Errors** (Medium Priority)
   - Invalid tokens
   - Access denied
   - Authentication failures

3. **External API Errors** (High Priority)
   - RunningHub API failures
   - Network timeouts
   - Service unavailable

4. **Payment Errors** (Critical Priority)
   - Payment processing failures
   - Transaction errors
   - Gateway issues

### Alert Thresholds

- **Database**: 5 errors in 5 minutes → Critical alert
- **Payment**: 3 errors in 5 minutes → Critical alert
- **External API**: 10 errors in 10 minutes → High alert
- **Authentication**: 20 errors in 15 minutes → Medium alert

## 🚀 Deployment Process

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] CDN and DNS configured
- [ ] Monitoring services configured
- [ ] Backup systems in place

### Deployment Steps

1. **Prepare Environment**
   ```bash
   # Copy environment variables
   cp .env.production.example .env.production
   # Edit with actual values
   ```

2. **Database Setup**
   ```bash
   # Apply migrations
   npx prisma migrate deploy
   # Generate client
   npx prisma generate
   ```

3. **Deploy Backend**
   ```bash
   # Deploy to Railway
   railway deploy
   ```

4. **Deploy Frontend**
   ```bash
   # Deploy to Vercel
   vercel deploy --prod
   ```

5. **Verify Deployment**
   ```bash
   # Check health endpoints
   curl https://cosnap-backend.railway.app/health
   curl https://cosnap.vercel.app
   ```

### Post-Deployment Verification

1. **Health Checks**
   - Backend health: `/health/ready`
   - Database connectivity: `/health/detailed`
   - Redis connectivity: Check cache functionality
   - External APIs: RunningHub API connectivity

2. **Functional Testing**
   - User registration and login
   - Image upload functionality
   - AI effects processing
   - Payment processing (test mode)

3. **Performance Testing**
   - Load testing with expected traffic
   - Response time verification
   - Cache hit rate monitoring

## 📈 Monitoring and Maintenance

### Daily Monitoring

1. **Key Metrics**
   - API response times
   - Error rates
   - Cache hit rates
   - Database performance
   - User activity

2. **Health Checks**
   - Service availability
   - External API status
   - Database connectivity
   - Redis performance

### Weekly Maintenance

1. **Database Maintenance**
   ```bash
   # Run cleanup tasks
   node scripts/database-cleanup.js
   # Analyze performance
   node scripts/performance-analysis.js
   ```

2. **Log Analysis**
   - Review error patterns
   - Identify performance bottlenecks
   - Check security alerts

3. **Performance Review**
   - Analyze response time trends
   - Review cache effectiveness
   - Monitor resource usage

### Monthly Tasks

1. **Security Updates**
   - Dependency updates
   - Security patches
   - Certificate renewals

2. **Performance Optimization**
   - Database index optimization
   - Cache strategy review
   - CDN configuration updates

3. **Backup Verification**
   - Test backup restoration
   - Verify backup integrity
   - Update backup procedures

## 🔧 Troubleshooting

### Common Issues

1. **High Response Times**
   - Check database connection pool
   - Verify cache hit rates
   - Review slow query logs
   - Monitor external API performance

2. **Memory Issues**
   - Monitor memory usage trends
   - Check for memory leaks
   - Review cache sizes
   - Optimize query results

3. **Database Connection Issues**
   - Verify connection pool settings
   - Check database server status
   - Review connection timeout logs
   - Monitor concurrent connections

4. **Cache Issues**
   - Check Redis connectivity
   - Verify cache configuration
   - Monitor cache hit/miss rates
   - Review cache invalidation patterns

### Debugging Tools

1. **Logs Analysis**
   ```bash
   # View recent errors
   tail -f error.log | grep ERROR
   
   # Check specific correlation ID
   grep "correlation-id" application.log
   ```

2. **Performance Analysis**
   ```bash
   # Check slow queries
   grep "Slow database query" application.log
   
   # Monitor memory usage
   node scripts/memory-analysis.js
   ```

3. **Health Check Debugging**
   ```bash
   # Detailed health check
   curl https://cosnap-backend.railway.app/health/detailed
   
   # Check specific services
   curl https://cosnap-backend.railway.app/health/ready
   ```

## 📞 Support and Escalation

### Alert Levels

1. **Level 1 - Info**
   - Log to monitoring system
   - No immediate action required

2. **Level 2 - Warning**
   - Log to monitoring system
   - Review during business hours

3. **Level 3 - Error**
   - Immediate notification
   - Investigate within 1 hour

4. **Level 4 - Critical**
   - Immediate escalation
   - All hands on deck
   - Customer notification if needed

### Contact Information

- **Development Team**: dev-team@cosnap.ai
- **DevOps Team**: devops@cosnap.ai
- **Emergency Hotline**: +86-xxx-xxxx-xxxx

---

## 📁 File Structure

```
E:\desktop\Cosnap企划\code\ui\
├── .github/workflows/          # CI/CD pipelines
│   ├── ci-cd.yml              # Main CI/CD pipeline
│   ├── security-scan.yml      # Security scanning
│   └── performance-monitoring.yml # Performance tests
├── runninghub-backend/        # Backend application
│   ├── src/
│   │   ├── config/
│   │   │   └── production.js  # Production configuration
│   │   ├── middleware/
│   │   │   └── productionSecurity.js # Security middleware
│   │   ├── services/
│   │   │   ├── monitoringService.js   # Monitoring
│   │   │   ├── errorTrackingService.js # Error tracking
│   │   │   ├── performanceService.js  # Performance optimization
│   │   │   ├── redisService.js        # Redis caching
│   │   │   └── databaseService.js     # Database optimization
│   │   └── routes/
│   │       └── health.js      # Health check endpoints
│   └── package.json
├── project/                   # Frontend application
│   ├── src/config/
│   │   └── production.ts      # Frontend production config
│   └── package.json
└── .env.production.example    # Environment variables template
```

## 🎯 Success Metrics

### Performance Targets

- **API Response Time**: < 500ms (95th percentile)
- **Database Query Time**: < 100ms (average)
- **Cache Hit Rate**: > 80%
- **Uptime**: > 99.9%
- **Error Rate**: < 0.1%

### Monitoring Dashboards

- **Grafana**: Performance metrics and alerts
- **Sentry**: Error tracking and performance monitoring
- **Prometheus**: Infrastructure and application metrics
- **Custom Dashboard**: Business metrics and KPIs

This comprehensive production deployment setup ensures that Cosnap AI is ready for scale with robust monitoring, security, performance optimization, and automated deployment processes.

For questions or support, please contact the development team or refer to the troubleshooting section above.
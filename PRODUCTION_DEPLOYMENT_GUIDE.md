# Cosnap AI Production Deployment Guide

This comprehensive guide covers the complete production deployment process for Cosnap AI, including infrastructure setup, monitoring, security, and maintenance procedures.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Infrastructure Deployment](#infrastructure-deployment)
5. [Application Deployment](#application-deployment)
6. [Monitoring & Observability](#monitoring--observability)
7. [Security Configuration](#security-configuration)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling & Performance](#scaling--performance)
10. [Maintenance Procedures](#maintenance-procedures)
11. [Troubleshooting](#troubleshooting)

## Architecture Overview

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   CDN/Proxy     │    │   Monitoring    │
│   (Traefik)     │    │   (Cloudflare)  │    │   (Grafana)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Production Environment                      │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   Frontend      │   Backend API   │   Database      │   Cache   │
│   (Vercel)      │   (Railway)     │   (PostgreSQL)  │  (Redis)  │
│   - React App   │   - Express.js  │   - Primary DB  │  - Session│
│   - Static CDN  │   - JWT Auth    │   - Replica DB  │  - Cache  │
│   - nginx       │   - File Upload │   - Backups     │  - Queue  │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js + Prisma ORM
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for sessions and API caching
- **File Storage**: Alibaba Cloud OSS
- **Monitoring**: Prometheus + Grafana + Loki
- **CI/CD**: GitHub Actions
- **Infrastructure**: Docker + Railway + Vercel

## Prerequisites

### Required Accounts & Services

1. **GitHub Account** - Source code and CI/CD
2. **Railway Account** - Backend hosting
3. **Vercel Account** - Frontend hosting
4. **Alibaba Cloud Account** - File storage (OSS)
5. **Domain Registration** - Custom domain
6. **Monitoring Services** (Optional)
   - Sentry for error tracking
   - DataDog/New Relic for APM

### Required Tools

```bash
# Node.js and npm
node --version  # v18.x or higher
npm --version   # v9.x or higher

# Docker (for local development and testing)
docker --version
docker-compose --version

# Git
git --version

# CLI Tools
gh --version      # GitHub CLI (optional)
vercel --version  # Vercel CLI (optional)
```

## Environment Setup

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone https://github.com/your-username/cosnap-ai.git
cd cosnap-ai

# Install dependencies
cd project && npm install
cd ../runninghub-backend && npm install
```

### 2. Environment Configuration

Copy the environment template files and configure them:

```bash
# Backend environment
cp runninghub-backend/.env.production.template runninghub-backend/.env.production
cp runninghub-backend/.env.staging.template runninghub-backend/.env.staging

# Configure the environment files with your actual values
```

#### Critical Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret (256-bit) | `your-super-secret-jwt-key` |
| `REDIS_URL` | Redis connection string | `redis://user:pass@host:6379` |
| `ALI_OSS_*` | Alibaba Cloud OSS credentials | See OSS documentation |
| `RUNNINGHUB_API_KEY_*` | RunningHub API keys | Your API keys |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://cosnap.ai,https://www.cosnap.ai` |

### 3. Database Setup

```bash
# Generate Prisma client
cd runninghub-backend
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed initial data (optional)
npm run seed
```

## Infrastructure Deployment

### 1. Railway Deployment (Backend)

#### Setup Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway new cosnap-backend

# Link to existing service
railway link [service-id]
```

#### Configure Railway Environment

```bash
# Set environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL="your-database-url"
railway variables set JWT_SECRET="your-jwt-secret"
# ... add all other variables
```

#### Deploy to Railway

```bash
# Deploy using CLI
railway up

# Or connect to GitHub for automatic deployments
# 1. Go to Railway dashboard
# 2. Connect GitHub repository
# 3. Configure build settings
```

### 2. Vercel Deployment (Frontend)

#### Setup Vercel Project

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd project
vercel --prod
```

#### Configure Vercel Environment

Add environment variables in Vercel dashboard:

```bash
VITE_API_BASE_URL=https://your-backend-url.railway.app
VITE_APP_ENV=production
```

### 3. Database Setup (PostgreSQL)

#### Railway PostgreSQL

```bash
# Add PostgreSQL service in Railway
railway add postgresql

# Get connection string
railway variables get DATABASE_URL
```

#### External Database (Recommended for Production)

Consider using managed PostgreSQL services:
- **AWS RDS PostgreSQL**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **DigitalOcean Managed Databases**

### 4. Redis Setup

#### Railway Redis

```bash
# Add Redis service in Railway
railway add redis

# Get connection string
railway variables get REDIS_URL
```

#### External Redis (Recommended for Production)

Consider using managed Redis services:
- **AWS ElastiCache**
- **Redis Cloud**
- **Google Cloud Memorystore**

## Application Deployment

### 1. CI/CD Pipeline Setup

The repository includes comprehensive GitHub Actions workflows:

#### Required GitHub Secrets

```bash
# Railway Deployment
RAILWAY_TOKEN=your-railway-token
RAILWAY_PRODUCTION_SERVICE_ID=service-id
RAILWAY_STAGING_SERVICE_ID=service-id

# Vercel Deployment
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id

# URLs for testing
PRODUCTION_FRONTEND_URL=https://cosnap.ai
PRODUCTION_BACKEND_URL=https://api.cosnap.ai
STAGING_FRONTEND_URL=https://staging.cosnap.ai
STAGING_BACKEND_URL=https://api-staging.cosnap.ai

# Notifications
SLACK_WEBHOOK_URL=your-slack-webhook
SECURITY_SLACK_WEBHOOK_URL=your-security-webhook
```

#### Deployment Process

1. **Push to main branch** triggers the CI/CD pipeline
2. **Security scans** run automatically
3. **Tests** execute (unit, integration, E2E)
4. **Docker images** are built and pushed
5. **Staging deployment** occurs automatically
6. **Production deployment** requires manual approval
7. **Post-deployment tests** verify functionality

### 2. Manual Deployment

If needed, you can deploy manually:

#### Backend Deployment

```bash
cd runninghub-backend

# Build and test
npm run test
npm run build  # if you have a build step

# Deploy to Railway
railway up --detach

# Verify deployment
curl https://your-backend-url.railway.app/health
```

#### Frontend Deployment

```bash
cd project

# Build and test
npm run build
npm run test:e2e

# Deploy to Vercel
vercel --prod

# Verify deployment
curl https://your-frontend-url.vercel.app
```

### 3. Database Migrations

```bash
# Run migrations on production database
cd runninghub-backend
NODE_ENV=production npx prisma migrate deploy

# Verify migration
NODE_ENV=production npx prisma db pull
```

## Monitoring & Observability

### 1. Application Monitoring

#### Health Check Endpoints

- **Backend Health**: `GET /health`
- **Database Health**: `GET /health/db`
- **Metrics**: `GET /metrics` (Prometheus format)

#### Custom Monitoring

The application includes built-in monitoring middleware:

```javascript
// Example usage in routes
app.get('/api/effects', (req, res) => {
  // Metrics are automatically recorded
  req.metrics.incrementCounter('effects_requests_total');
  // ... route logic
});
```

### 2. Setup Monitoring Stack

#### Using Docker Compose

```bash
# Start monitoring stack
docker-compose -f docker-compose.yml up -d prometheus grafana loki

# Access dashboards
# Grafana: http://localhost:3000
# Prometheus: http://localhost:9090
```

#### Manual Setup

1. **Prometheus**: Configure to scrape metrics from your applications
2. **Grafana**: Import the provided dashboards
3. **Loki**: Configure log aggregation
4. **Alertmanager**: Setup alerts for critical issues

### 3. External Monitoring Services

#### Sentry (Error Tracking)

```bash
# Install Sentry SDK
npm install @sentry/node @sentry/integrations

# Configure in your application
// In your main application file
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

#### DataDog/New Relic (APM)

Follow the respective service documentation for setup.

## Security Configuration

### 1. Environment Security

#### Production Environment Variables

Ensure these are set in production:

```bash
NODE_ENV=production
FORCE_HTTPS=true
SECURE_COOKIES=true
HIDE_ERROR_DETAILS=true
EMERGENCY_LOCKDOWN=false
```

#### SSL/TLS Configuration

1. **Use HTTPS everywhere**
2. **Configure HSTS headers**
3. **Set up proper certificate management**

### 2. Database Security

```sql
-- Create read-only user for monitoring
CREATE USER cosnap_readonly WITH ENCRYPTED PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE cosnap TO cosnap_readonly;
GRANT USAGE ON SCHEMA public TO cosnap_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cosnap_readonly;

-- Enable SSL
ALTER SYSTEM SET ssl = on;
SELECT pg_reload_conf();
```

### 3. Network Security

#### Firewall Configuration

```bash
# Allow only necessary ports
# 80 (HTTP) - redirect to HTTPS
# 443 (HTTPS)
# 22 (SSH) - from specific IPs only
# 5432 (PostgreSQL) - from application servers only
# 6379 (Redis) - from application servers only
```

#### Rate Limiting

The application includes multiple layers of rate limiting:
- Global rate limiting
- Per-endpoint rate limiting
- IP-based blocking for suspicious activity

## Backup & Recovery

### 1. Database Backup

#### Automated Backups

```bash
# Setup automated backup (via cron)
# Edit crontab
crontab -e

# Add backup job (daily at 2 AM)
0 2 * * * /path/to/scripts/backup-database.sh

# Setup backup retention and cloud storage
export BACKUP_RETENTION_DAYS=30
export BACKUP_S3_BUCKET=cosnap-backups
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
```

#### Manual Backup

```bash
# Create backup
./scripts/backup-database.sh

# Backup to specific location
BACKUP_DIR=/custom/path ./scripts/backup-database.sh
```

### 2. Database Recovery

#### Restore from Backup

```bash
# Restore latest backup
./scripts/restore-database.sh

# Restore specific backup
./scripts/restore-database.sh cosnap_backup_20231201_120000.sql.gz

# Restore from S3
./scripts/restore-database.sh s3://bucket/path/to/backup.sql.gz
```

#### Point-in-Time Recovery

For critical production systems, consider setting up WAL archiving:

```sql
-- Configure WAL archiving
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'aws s3 cp %p s3://your-wal-bucket/%f';
SELECT pg_reload_conf();
```

### 3. File Storage Backup

#### Alibaba Cloud OSS

Configure versioning and cross-region replication in your OSS bucket.

### 4. Application Code Backup

- Code is stored in GitHub (primary)
- Docker images are stored in container registry
- Configuration is version controlled

## Scaling & Performance

### 1. Horizontal Scaling

#### Backend Scaling

```bash
# Railway: Scale instances via dashboard or CLI
railway scale --replicas 3

# Or via Railway dashboard: Project > Settings > Deploy
```

#### Database Scaling

1. **Read Replicas**: For read-heavy workloads
2. **Connection Pooling**: Using PgBouncer or Prisma
3. **Vertical Scaling**: Increase CPU/RAM as needed

#### Cache Scaling

1. **Redis Cluster**: For high availability
2. **Multiple Redis Instances**: For different use cases

### 2. Performance Optimization

#### Backend Optimizations

```javascript
// Enable compression
app.use(compression());

// Configure caching
app.use(cache.middleware(300)); // 5 minute cache

// Database query optimization
await prisma.user.findMany({
  include: { posts: true },
  where: { active: true },
  take: 20,
  skip: (page - 1) * 20
});
```

#### Frontend Optimizations

```javascript
// Code splitting
const LazyComponent = lazy(() => import('./LazyComponent'));

// Memoization
const MemoizedComponent = memo(Component);

// Service worker for caching
// Already configured in public/sw.js
```

### 3. CDN Configuration

#### Cloudflare Setup

1. **Add your domain to Cloudflare**
2. **Configure DNS records**
3. **Enable caching rules**
4. **Configure security settings**

## Maintenance Procedures

### 1. Regular Maintenance Tasks

#### Daily

- Monitor application health and performance
- Check error logs and alerts
- Verify backup completion

#### Weekly

- Review security logs
- Update dependencies (non-breaking)
- Performance analysis

#### Monthly

- Security audit
- Database optimization
- Cost analysis and optimization
- Disaster recovery testing

### 2. Update Procedures

#### Application Updates

```bash
# 1. Create feature branch
git checkout -b feature/update

# 2. Update dependencies
npm update

# 3. Run tests
npm test

# 4. Deploy to staging
git push origin feature/update

# 5. Test staging environment

# 6. Merge to main for production deployment
git checkout main
git merge feature/update
git push origin main
```

#### Security Updates

```bash
# Check for security vulnerabilities
npm audit

# Fix automatically if possible
npm audit fix

# Manual fixes for breaking changes
npm audit fix --force

# Review and test thoroughly
```

### 3. Database Maintenance

#### Regular Tasks

```sql
-- Analyze tables for query optimization
ANALYZE;

-- Vacuum to reclaim space
VACUUM;

-- Reindex if needed
REINDEX DATABASE cosnap;

-- Update statistics
ANALYZE VERBOSE;
```

#### Performance Monitoring

```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

## Troubleshooting

### 1. Common Issues

#### Application Won't Start

```bash
# Check logs
railway logs --tail

# Verify environment variables
railway variables

# Check database connection
railway connect
psql $DATABASE_URL -c "SELECT 1;"
```

#### High Response Times

1. **Check database performance**
2. **Monitor memory usage**
3. **Review slow queries**
4. **Check external API response times**

#### Memory Issues

```bash
# Monitor memory usage
railway metrics

# Check for memory leaks in code
# Review database connection pools
# Monitor cache usage
```

### 2. Debugging Production Issues

#### Log Analysis

```bash
# Backend logs
railway logs --service cosnap-backend

# Frontend logs (Vercel)
vercel logs

# Database logs
# Check your PostgreSQL provider's logging
```

#### Performance Debugging

```bash
# Check metrics endpoint
curl https://your-api.railway.app/metrics

# Monitor database
# Use your database provider's monitoring tools

# Application performance
# Use built-in monitoring dashboard
```

### 3. Incident Response

#### Steps

1. **Identify the issue**
2. **Assess impact**
3. **Implement immediate fix or rollback**
4. **Communicate with stakeholders**
5. **Post-incident analysis**

#### Rollback Procedures

```bash
# Railway rollback
railway rollback [deployment-id]

# Vercel rollback
vercel rollback [deployment-url]

# Database rollback (if needed)
./scripts/restore-database.sh [backup-file]
```

## Security Checklist

- [ ] All environment variables are secure and not exposed
- [ ] HTTPS is enforced everywhere
- [ ] Database connections are encrypted
- [ ] File uploads are validated and secured
- [ ] Rate limiting is configured
- [ ] Error messages don't expose sensitive information
- [ ] Dependencies are regularly updated
- [ ] Security headers are configured
- [ ] Backup and recovery procedures are tested
- [ ] Monitoring and alerting are configured

## Performance Checklist

- [ ] Database queries are optimized
- [ ] Caching is implemented
- [ ] Images are optimized
- [ ] CDN is configured
- [ ] Compression is enabled
- [ ] Bundle sizes are optimized
- [ ] Database connections are pooled
- [ ] Monitoring is in place

## Support and Maintenance

For ongoing support and maintenance:

1. **Monitor the application** using the provided dashboards
2. **Review logs regularly** for issues
3. **Keep dependencies updated** for security
4. **Test backup and recovery** procedures regularly
5. **Document any changes** to the deployment process

---

**Last Updated**: December 2023  
**Version**: 1.0  
**Maintained by**: Cosnap AI Development Team
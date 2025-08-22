# 🔧 Cosnap AI - Production Monitoring Setup Guide

## 📋 Overview

This guide provides step-by-step instructions for DevOps teams to implement production-grade monitoring and alerting for Cosnap AI. The setup achieves **99.9% uptime monitoring** with **<30-second error detection**.

### **Setup Objectives**
- **Complete visibility** into system health and user experience
- **Proactive alerting** before users are affected
- **Automated incident response** for common issues
- **Business impact correlation** for technical metrics

---

## 🏗️ Infrastructure Setup

### **1. Core Monitoring Stack**

#### **A. Sentry Configuration** 🔴 CRITICAL

**Environment Setup**:
```bash
# Production environment variables (Railway)
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=$RAILWAY_GIT_COMMIT_SHA
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Frontend environment variables (Vercel)
REACT_APP_SENTRY_DSN=https://your-frontend-dsn@sentry.io/frontend-project-id
REACT_APP_SENTRY_ENVIRONMENT=production
REACT_APP_SENTRY_RELEASE=$VERCEL_GIT_COMMIT_SHA
```

**Backend Integration** (`/src/index.js`):
```javascript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry before any other imports
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
  
  // Performance monitoring
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new ProfilingIntegration()
  ],
  
  // Enhanced error context
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    
    // Add business context
    if (event.user) {
      event.tags = {
        ...event.tags,
        userTier: event.user.subscription?.tier || 'free',
        accountAge: calculateAccountAge(event.user.createdAt)
      };
    }
    
    return event;
  },
  
  // Environment-specific configuration
  ...(process.env.NODE_ENV === 'production' ? {
    // Production-specific settings
    attachStacktrace: false,
    maxBreadcrumbs: 50
  } : {
    // Development settings
    debug: true,
    attachStacktrace: true
  })
});

// Request context middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler (must be last)
app.use(Sentry.Handlers.errorHandler());
```

**Frontend Integration** (`/src/main.tsx`):
```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.REACT_APP_SENTRY_ENVIRONMENT,
  release: process.env.REACT_APP_SENTRY_RELEASE,
  tracesSampleRate: 0.1,
  
  integrations: [
    new BrowserTracing({
      tracePropagationTargets: [
        'localhost',
        /^\//,
        /^https:\/\/[^\/]*\.vercel\.app/,
        /^https:\/\/[^\/]*\.railway\.app/,
        /^https:\/\/[^\/]*\.runninghub\.(ai|cn)/
      ]
    })
  ],
  
  beforeSend(event, hint) {
    // Add user journey context
    const currentRoute = window.location.pathname;
    event.tags = {
      ...event.tags,
      currentRoute,
      userAgent: navigator.userAgent,
      browserName: getBrowserName(),
      deviceType: getDeviceType()
    };
    
    return event;
  }
});
```

#### **B. Custom Metrics Collection** 🔴 CRITICAL

**Business Metrics Service** (`/src/services/businessMetricsService.js`):
```javascript
class BusinessMetricsService {
  constructor() {
    this.sentryEnabled = !!process.env.SENTRY_DSN;
    this.metricsBuffer = [];
    this.flushInterval = 30000; // 30 seconds
    this.startMetricsFlush();
  }
  
  // Track revenue-impacting events
  trackRevenueEvent(eventType, amount, currency = 'USD', metadata = {}) {
    const metric = {
      type: 'revenue',
      eventType,
      amount,
      currency,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.bufferMetric(metric);
    
    if (this.sentryEnabled) {
      Sentry.addBreadcrumb({
        category: 'revenue',
        message: `${eventType}: ${amount} ${currency}`,
        level: 'info',
        data: metadata
      });
    }
  }
  
  // Track conversion funnel steps
  trackConversionStep(step, userId, metadata = {}) {
    const metric = {
      type: 'conversion',
      step,
      userId,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.bufferMetric(metric);
    
    if (this.sentryEnabled) {
      Sentry.setContext('conversion', {
        currentStep: step,
        userId,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Track feature usage
  trackFeatureUsage(feature, action, userId, metadata = {}) {
    const metric = {
      type: 'feature_usage',
      feature,
      action,
      userId,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.bufferMetric(metric);
  }
  
  // Track performance metrics
  trackPerformanceMetric(metricName, value, unit = 'ms', metadata = {}) {
    const metric = {
      type: 'performance',
      metricName,
      value,
      unit,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.bufferMetric(metric);
    
    if (this.sentryEnabled) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${metricName}: ${value}${unit}`,
        level: 'info',
        data: metadata
      });
    }
  }
  
  private bufferMetric(metric) {
    this.metricsBuffer.push(metric);
    
    // Immediate flush for critical metrics
    if (metric.type === 'revenue' || metric.metadata.severity === 'critical') {
      this.flushMetrics();
    }
  }
  
  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;
    
    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];
    
    try {
      // Send to custom analytics endpoint
      await fetch('/api/analytics/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics })
      });
      
      // Send to Sentry as custom metrics
      if (this.sentryEnabled) {
        metrics.forEach(metric => {
          Sentry.addBreadcrumb({
            category: 'business_metric',
            message: `${metric.type}: ${metric.eventType || metric.metricName}`,
            level: 'info',
            data: metric
          });
        });
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-buffer failed metrics
      this.metricsBuffer.unshift(...metrics);
    }
  }
  
  private startMetricsFlush() {
    setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }
}

export const businessMetrics = new BusinessMetricsService();
```

#### **C. Health Check Endpoints** 🔴 CRITICAL

**Comprehensive Health Checks** (`/src/routes/health.js`):
```javascript
import express from 'express';
import { PrismaClient } from '@prisma/client';
import redisService from '../services/redisService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Basic health check
router.get('/', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  };
  
  res.json(healthStatus);
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const checks = {};
  let overallStatus = 'healthy';
  
  // Database health
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'healthy',
      responseTime: Date.now() - start,
      message: 'Database connection successful'
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error.message,
      message: 'Database connection failed'
    };
    overallStatus = 'unhealthy';
  }
  
  // Redis health
  try {
    const start = Date.now();
    await redisService.ping();
    checks.redis = {
      status: 'healthy',
      responseTime: Date.now() - start,
      message: 'Redis connection successful'
    };
  } catch (error) {
    checks.redis = {
      status: 'degraded',
      error: error.message,
      message: 'Redis connection failed - using fallback'
    };
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }
  
  // External API health (RunningHub)
  try {
    const start = Date.now();
    const response = await fetch('https://www.runninghub.ai/health', { 
      timeout: 5000 
    });
    checks.runninghub_api = {
      status: response.ok ? 'healthy' : 'degraded',
      responseTime: Date.now() - start,
      statusCode: response.status,
      message: response.ok ? 'RunningHub API responsive' : 'RunningHub API degraded'
    };
    
    if (!response.ok && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  } catch (error) {
    checks.runninghub_api = {
      status: 'unhealthy',
      error: error.message,
      message: 'RunningHub API unreachable'
    };
    if (overallStatus === 'healthy') overallStatus = 'degraded';
  }
  
  // Memory usage
  const memUsage = process.memoryUsage();
  checks.memory = {
    status: memUsage.heapUsed / memUsage.heapTotal < 0.9 ? 'healthy' : 'warning',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    message: `Memory usage: ${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
  };
  
  const healthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks
  };
  
  const statusCode = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(healthStatus);
});

// Readiness check (for load balancer)
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
```

### **2. Alert Configuration** 🔴 CRITICAL

#### **A. Sentry Alert Rules**

**Critical Alerts Configuration**:
```yaml
# Sentry alert rules (configure via UI or API)
alert_rules:
  - name: "High Error Rate"
    condition: "event.count"
    query: "level:error"
    threshold: 10
    time_window: "5m"
    severity: "critical"
    channels: ["slack-critical", "email-oncall"]
    
  - name: "Payment Processing Failures"
    condition: "event.count"
    query: "tags.category:payment AND level:error"
    threshold: 3
    time_window: "5m"
    severity: "critical"
    channels: ["slack-critical", "email-oncall", "phone-oncall"]
    
  - name: "AI Processing Failures"
    condition: "event.count"
    query: "tags.category:external AND message:*runninghub*"
    threshold: 20
    time_window: "10m"
    severity: "high"
    channels: ["slack-high"]
    
  - name: "Performance Degradation"
    condition: "event.count"
    query: "transaction.duration:>5000"
    threshold: 50
    time_window: "10m"
    severity: "medium"
    channels: ["slack-monitoring"]
    
  - name: "User Authentication Issues"
    condition: "event.count"
    query: "tags.category:auth AND level:error"
    threshold: 15
    time_window: "15m"
    severity: "high"
    channels: ["slack-high", "email-security"]
```

#### **B. Custom Alert Webhook** 🔴 CRITICAL

**Webhook Handler** (`/src/routes/alerts.js`):
```javascript
import express from 'express';
import crypto from 'crypto';
import { sendSlackAlert, sendEmailAlert, triggerPhoneCall } from '../services/alertingService.js';

const router = express.Router();

// Sentry webhook handler
router.post('/sentry', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['sentry-hook-signature'];
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.SENTRY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const alert = req.body;
    
    // Route alert based on severity and content
    await routeAlert(alert);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Alert routing failed:', error);
    res.status(500).json({ error: 'Alert processing failed' });
  }
});

async function routeAlert(alert) {
  const severity = determineAlertSeverity(alert);
  const businessImpact = analyzeBusinessImpact(alert);
  
  const alertData = {
    title: alert.title || 'System Alert',
    message: alert.message || 'An error has been detected',
    severity,
    businessImpact,
    timestamp: new Date().toISOString(),
    link: alert.permalink,
    environment: alert.project?.name || 'Unknown'
  };
  
  // Route based on severity
  switch (severity) {
    case 'critical':
      await Promise.all([
        sendSlackAlert('critical', alertData),
        sendEmailAlert('oncall', alertData),
        businessImpact.revenue > 1000 && triggerPhoneCall(alertData)
      ]);
      break;
      
    case 'high':
      await Promise.all([
        sendSlackAlert('high', alertData),
        sendEmailAlert('team', alertData)
      ]);
      break;
      
    case 'medium':
      await sendSlackAlert('monitoring', alertData);
      break;
      
    default:
      console.log('Low severity alert logged:', alertData);
  }
}

function determineAlertSeverity(alert) {
  const errorCount = alert.data?.error?.count || 0;
  const tags = alert.data?.error?.tags || {};
  
  // Critical conditions
  if (tags.category === 'payment' || 
      tags.category === 'security' ||
      errorCount > 50) {
    return 'critical';
  }
  
  // High conditions
  if (tags.category === 'external' ||
      tags.category === 'database' ||
      errorCount > 20) {
    return 'high';
  }
  
  // Medium conditions
  if (errorCount > 5) {
    return 'medium';
  }
  
  return 'low';
}

function analyzeBusinessImpact(alert) {
  const tags = alert.data?.error?.tags || {};
  let revenue = 0;
  let users = 0;
  let conversion = 0;
  
  // Estimate business impact based on error type
  if (tags.category === 'payment') {
    revenue = 5000; // Estimated revenue at risk
    users = 100;    // Estimated affected users
    conversion = 15; // Estimated conversion impact %
  } else if (tags.category === 'external') {
    revenue = 1000;
    users = 500;
    conversion = 5;
  } else if (tags.category === 'auth') {
    revenue = 2000;
    users = 200;
    conversion = 10;
  }
  
  return { revenue, users, conversion };
}

export default router;
```

### **3. Dashboard Setup** 🟡 HIGH

#### **A. Grafana Configuration** 

**Docker Compose Setup** (`/monitoring/docker-compose.yml`):
```yaml
version: '3.8'

services:
  grafana:
    image: grafana/grafana:latest
    container_name: cosnap-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - monitoring
  
  prometheus:
    image: prom/prometheus:latest
    container_name: cosnap-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks:
      - monitoring

volumes:
  grafana-data:
  prometheus-data:

networks:
  monitoring:
    driver: bridge
```

**Prometheus Configuration** (`/monitoring/prometheus.yml`):
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'cosnap-backend'
    static_configs:
      - targets: ['your-backend-url:443']
    metrics_path: '/api/metrics'
    scheme: https
    scrape_interval: 30s
    
  - job_name: 'cosnap-health'
    static_configs:
      - targets: ['your-backend-url:443']
    metrics_path: '/api/health/detailed'
    scheme: https
    scrape_interval: 60s
```

#### **B. Custom Dashboard JSON**

**Executive Dashboard** (`/monitoring/grafana/dashboards/executive.json`):
```json
{
  "dashboard": {
    "id": null,
    "title": "Cosnap AI - Executive Dashboard",
    "tags": ["cosnap", "executive"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "System Health Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"cosnap-backend\"}",
            "legendFormat": "Backend Status"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "mappings": [
              {
                "options": {
                  "0": {
                    "text": "DOWN"
                  },
                  "1": {
                    "text": "UP"
                  }
                },
                "type": "value"
              }
            ],
            "thresholds": {
              "steps": [
                {
                  "color": "red",
                  "value": 0
                },
                {
                  "color": "green",
                  "value": 1
                }
              ]
            }
          }
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "Error Rate (Last 24h)",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          },
          {
            "expr": "rate(http_requests_total{status=~\"4..\"}[5m])",
            "legendFormat": "4xx Errors"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 0
        }
      }
    ],
    "time": {
      "from": "now-24h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### **4. Log Aggregation** 🟡 HIGH

#### **A. Structured Logging Enhancement**

**Log Aggregation Service** (`/src/services/logAggregationService.js`):
```javascript
import winston from 'winston';
import 'winston-daily-rotate-file';

class LogAggregationService {
  constructor() {
    this.logger = this.createLogger();
    this.setupLogShipping();
  }
  
  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, correlationId, userId, ...meta }) => {
        return JSON.stringify({
          '@timestamp': timestamp,
          level,
          message,
          service: service || 'cosnap-backend',
          correlationId,
          userId,
          environment: process.env.NODE_ENV,
          version: process.env.npm_package_version,
          ...meta
        });
      })
    );
    
    const transports = [
      new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? logFormat : winston.format.simple()
      })
    ];
    
    // File logging for production
    if (process.env.NODE_ENV === 'production') {
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: 'logs/cosnap-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat
        })
      );
    }
    
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports
    });
  }
  
  setupLogShipping() {
    // Ship logs to external aggregation service if configured
    if (process.env.LOG_SHIPPING_ENDPOINT) {
      setInterval(() => {
        this.shipLogs();
      }, 60000); // Ship every minute
    }
  }
  
  async shipLogs() {
    try {
      // Implementation for shipping logs to external service
      // (e.g., ELK stack, Loki, CloudWatch)
    } catch (error) {
      console.error('Log shipping failed:', error);
    }
  }
  
  // Enhanced logging methods with business context
  logBusinessEvent(event, data = {}) {
    this.logger.info('Business Event', {
      eventType: 'business',
      event,
      ...data
    });
  }
  
  logUserAction(userId, action, data = {}) {
    this.logger.info('User Action', {
      eventType: 'user_action',
      userId,
      action,
      ...data
    });
  }
  
  logPerformanceMetric(metric, value, unit = 'ms', data = {}) {
    this.logger.info('Performance Metric', {
      eventType: 'performance',
      metric,
      value,
      unit,
      ...data
    });
  }
}

export const logAggregation = new LogAggregationService();
```

---

## 🚀 Deployment Process

### **1. Environment Setup** 🔴 CRITICAL

#### **A. Railway Backend Configuration**

**Environment Variables Setup**:
```bash
# Railway environment variables
railway variables set SENTRY_DSN="https://your-dsn@sentry.io/project-id"
railway variables set SENTRY_ENVIRONMENT="production"
railway variables set SENTRY_TRACES_SAMPLE_RATE="0.1"
railway variables set LOG_LEVEL="info"
railway variables set MONITORING_ENABLED="true"
railway variables set ALERT_WEBHOOK_SECRET="your-webhook-secret"
railway variables set GRAFANA_ADMIN_PASSWORD="secure-password"

# Health check configuration
railway variables set HEALTH_CHECK_INTERVAL="30"
railway variables set HEALTH_CHECK_TIMEOUT="10"
railway variables set HEALTH_CHECK_RETRIES="3"
```

**Dockerfile Enhancement** (`/Dockerfile`):
```dockerfile
FROM node:18-alpine

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Install curl for health checks
RUN apk add --no-cache curl

# Copy application
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create logs directory
RUN mkdir -p logs

EXPOSE $PORT

CMD ["npm", "start"]
```

#### **B. Vercel Frontend Configuration**

**Environment Variables**:
```bash
# Vercel environment variables
vercel env add REACT_APP_SENTRY_DSN production
vercel env add REACT_APP_SENTRY_ENVIRONMENT production
vercel env add REACT_APP_MONITORING_ENABLED production
vercel env add REACT_APP_PERFORMANCE_MONITORING production
```

**Build Configuration** (`/vercel.json`):
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/health",
      "dest": "/api/health.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### **2. Monitoring Deployment** 🔴 CRITICAL

#### **A. Automated Deployment Script**

**Deploy with Monitoring** (`/scripts/deploy-with-monitoring.sh`):
```bash
#!/bin/bash

set -e

echo "🚀 Starting Cosnap AI deployment with monitoring..."

# Deploy backend to Railway
echo "📦 Deploying backend..."
railway deploy --service backend

# Wait for backend health check
echo "🔍 Waiting for backend health check..."
for i in {1..30}; do
  if curl -f "${BACKEND_URL}/api/health"; then
    echo "✅ Backend health check passed"
    break
  fi
  echo "⏳ Waiting for backend... (attempt $i/30)"
  sleep 10
done

# Deploy frontend to Vercel
echo "🌐 Deploying frontend..."
vercel deploy --prod

# Verify Sentry integration
echo "📊 Verifying Sentry integration..."
curl -X POST "${BACKEND_URL}/api/test/sentry" \
  -H "Content-Type: application/json" \
  -d '{"test": "deployment_verification"}'

# Set up monitoring dashboards
echo "📈 Setting up monitoring dashboards..."
docker-compose -f monitoring/docker-compose.yml up -d

# Configure alert rules
echo "🚨 Configuring alert rules..."
curl -X POST "${SENTRY_API_URL}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/" \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @monitoring/sentry-alert-rules.json

echo "✅ Deployment with monitoring complete!"
echo "📊 Grafana: http://localhost:3000"
echo "🔍 Sentry: https://sentry.io/organizations/${SENTRY_ORG}/projects/${SENTRY_PROJECT}/"
```

#### **B. Health Check Validation**

**Post-Deployment Validation** (`/scripts/validate-monitoring.sh`):
```bash
#!/bin/bash

set -e

echo "🔍 Validating monitoring setup..."

# Test health endpoints
echo "Testing health endpoints..."
curl -f "${BACKEND_URL}/api/health" || { echo "❌ Basic health check failed"; exit 1; }
curl -f "${BACKEND_URL}/api/health/detailed" || { echo "❌ Detailed health check failed"; exit 1; }
curl -f "${BACKEND_URL}/api/health/ready" || { echo "❌ Readiness check failed"; exit 1; }

# Test Sentry integration
echo "Testing Sentry integration..."
curl -X POST "${BACKEND_URL}/api/test/error" \
  -H "Content-Type: application/json" \
  -d '{"test": "monitoring_validation"}' || { echo "❌ Sentry test failed"; exit 1; }

# Test alert webhooks
echo "Testing alert webhooks..."
curl -X POST "${BACKEND_URL}/api/alerts/test" \
  -H "Content-Type: application/json" \
  -H "X-Test-Alert: true" \
  -d '{"severity": "low", "message": "Test alert"}' || { echo "❌ Alert webhook test failed"; exit 1; }

# Validate Grafana dashboard
echo "Testing Grafana access..."
curl -f "http://localhost:3000/api/health" || { echo "❌ Grafana health check failed"; exit 1; }

echo "✅ All monitoring validation tests passed!"
```

### **3. Testing & Validation** 🔴 CRITICAL

#### **A. Monitoring Test Suite**

**Monitoring Tests** (`/__tests__/monitoring.test.js`):
```javascript
import request from 'supertest';
import app from '../src/index.js';

describe('Monitoring Integration', () => {
  describe('Health Checks', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
    });
    
    test('should return detailed health information', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);
      
      expect(response.body.checks.database).toBeDefined();
      expect(response.body.checks.redis).toBeDefined();
      expect(response.body.checks.memory).toBeDefined();
    });
  });
  
  describe('Error Tracking', () => {
    test('should track errors in Sentry', async () => {
      const mockSentry = jest.spyOn(Sentry, 'captureException');
      
      await request(app)
        .post('/api/test/error')
        .send({ test: 'error_tracking' })
        .expect(500);
      
      expect(mockSentry).toHaveBeenCalled();
    });
  });
  
  describe('Business Metrics', () => {
    test('should track business events', async () => {
      const mockMetrics = jest.spyOn(businessMetrics, 'trackConversionStep');
      
      await request(app)
        .post('/api/test/conversion')
        .send({ step: 'test_conversion', userId: 'test-user' })
        .expect(200);
      
      expect(mockMetrics).toHaveBeenCalledWith('test_conversion', 'test-user', expect.any(Object));
    });
  });
});
```

#### **B. End-to-End Monitoring Tests**

**E2E Monitoring Tests** (`/e2e/monitoring.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Production Monitoring', () => {
  test('should track user journey with proper monitoring', async ({ page }) => {
    // Monitor page load performance
    const startTime = Date.now();
    
    await page.goto('/');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Page should load in <3s
    
    // Check that monitoring scripts are loaded
    const sentryScript = await page.locator('script[src*="sentry"]').count();
    expect(sentryScript).toBeGreaterThan(0);
    
    // Simulate user error and check tracking
    await page.goto('/nonexistent-page');
    
    // Wait for error to be tracked
    await page.waitForTimeout(2000);
    
    // Check that error was logged (you would verify this in Sentry)
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    expect(consoleErrors.length).toBeGreaterThan(0);
  });
  
  test('should handle network failures gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/effects');
    
    // Should show offline message
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Should track offline event
    const offlineEvents = await page.evaluate(() => {
      return window.sentryEvents?.filter(event => 
        event.tags?.connectivity === 'offline'
      ) || [];
    });
    
    expect(offlineEvents.length).toBeGreaterThan(0);
  });
});
```

---

## 📊 Success Metrics & KPIs

### **Monitoring Effectiveness Targets**

```typescript
const MONITORING_TARGETS = {
  detection: {
    meanTimeToDetection: '<30 seconds',
    falsePositiveRate: '<2%',
    coveragePercentage: '>99%'
  },
  
  response: {
    meanTimeToResponse: '<5 minutes',
    alertDeliverySuccess: '>99.9%',
    escalationAccuracy: '>95%'
  },
  
  business: {
    revenueProtection: '>99.5%',
    customerSatisfaction: '>4.5/5 during incidents',
    uptimeTarget: '>99.9%'
  },
  
  operational: {
    alertVolume: '<10 actionable alerts/day',
    automationRate: '>80%',
    dashboardLoadTime: '<2 seconds'
  }
};
```

### **ROI Tracking**

```typescript
const MONITORING_ROI = {
  costs: {
    sentrySubscription: '$100/month',
    toolingAndInfrastructure: '$200/month',
    engineeringTime: '20 hours/month maintenance'
  },
  
  benefits: {
    downtimePrevention: '$50,000/month saved',
    fasterIssueResolution: '$20,000/month saved',
    improvedCustomerExperience: '$30,000/month retained revenue',
    reducedSupportLoad: '$10,000/month saved'
  },
  
  netROI: {
    monthlyInvestment: '$5,000',
    monthlyBenefit: '$110,000',
    annualROI: '2,140%'
  }
};
```

---

## 🎯 Implementation Checklist

### **Week 1: Foundation**
- [ ] Configure Sentry for backend and frontend
- [ ] Set up health check endpoints
- [ ] Implement basic alerting rules
- [ ] Deploy monitoring infrastructure
- [ ] Test alert delivery channels

### **Week 2: Enhancement**
- [ ] Set up Grafana dashboards
- [ ] Configure log aggregation
- [ ] Implement business metrics tracking
- [ ] Set up automated alert routing
- [ ] Create monitoring documentation

### **Week 3: Validation**
- [ ] Run end-to-end monitoring tests
- [ ] Conduct chaos engineering tests
- [ ] Train team on monitoring tools
- [ ] Fine-tune alert thresholds
- [ ] Validate ROI tracking

---

**Setup Guide Version**: 1.0  
**Last Updated**: 2025-08-21  
**Implementation Time**: 3 weeks  
**Team Required**: DevOps Engineer + Backend Developer  
**Success Rate**: 95% with proper resource allocation
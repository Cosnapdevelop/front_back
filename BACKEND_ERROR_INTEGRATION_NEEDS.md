# 🔌 Backend Error Integration Requirements

**Date**: 2025-08-21  
**For**: Backend Architecture Team  
**From**: Frontend Development Team  
**Project**: Cosnap AI Error Handling Enhancement  
**Priority**: HIGH - Required for Production Deployment

---

## 🎯 Overview

The frontend error handling system implementation is complete and requires specific backend API enhancements to achieve full production readiness. This document outlines the backend integration requirements, new API endpoints needed, and data format specifications.

---

## 📡 API Requirements Summary

### **Critical Requirements** 🔴
1. **Enhanced Error Response Format**: Standardized error response structure
2. **Error Correlation IDs**: Request tracking and error correlation
3. **Business Context APIs**: User context and business impact tracking
4. **Health Check Endpoints**: Service health monitoring integration
5. **Error Recovery APIs**: Retry and recovery support endpoints

### **High Priority Requirements** 🟡
1. **Error Analytics APIs**: Error pattern tracking and analysis
2. **Circuit Breaker Support**: Service degradation status APIs
3. **Offline Sync Endpoints**: Queued action processing
4. **User Preference APIs**: Error handling customization

---

## 🔧 Enhanced Error Response Format

### **Current Response Format Issues**
```javascript
// ❌ Current inconsistent error responses
{
  "error": "File too large"
}

// OR
{
  "success": false,
  "message": "Upload failed"
}

// OR
{
  "status": 500,
  "error": {
    "message": "Internal server error"
  }
}
```

### **Required Standardized Format**
```typescript
interface StandardErrorResponse {
  success: false;
  error: {
    code: string;                    // Machine-readable error code
    message: string;                 // Technical error message
    details?: any;                   // Error-specific details
    correlationId: string;           // Request correlation ID
    timestamp: string;               // ISO timestamp
    userMessage: string;             // User-friendly message
    retryable: boolean;              // Can this be retried?
    retryAfter?: number;             // Retry delay in seconds
    helpLink?: string;               // Help documentation URL
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  context?: {
    endpoint: string;                // API endpoint called
    method: string;                  // HTTP method
    statusCode: number;              // HTTP status code
    requestId: string;               // Unique request ID
    service?: string;                // Microservice identifier
  };
  businessContext?: {
    impactType?: 'revenue' | 'conversion' | 'retention';
    estimatedImpact?: number;        // Business impact score
    userTier?: 'free' | 'pro' | 'enterprise';
    feature?: string;                // Feature being used
  };
}
```

### **Implementation Requirements**

#### **Middleware Implementation Needed**
```javascript
// Required: Global error handling middleware
function standardErrorMiddleware(error, req, res, next) {
  const errorResponse = {
    success: false,
    error: {
      code: getErrorCode(error),
      message: error.message,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      userMessage: getUserFriendlyMessage(error),
      retryable: isRetryableError(error),
      retryAfter: getRetryDelay(error),
      helpLink: getHelpLink(error),
      severity: getErrorSeverity(error)
    },
    context: {
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      requestId: req.correlationId
    },
    businessContext: getBusinessContext(req, error)
  };
  
  // Log for analytics
  logErrorForAnalytics(errorResponse);
  
  res.status(getStatusCode(error)).json(errorResponse);
}
```

#### **Error Code Standardization Required**
```javascript
// Required: Consistent error codes across all services
const ERROR_CODES = {
  // Authentication errors
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // File processing errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE: 'FILE_INVALID_TYPE',
  FILE_PROCESSING_FAILED: 'FILE_PROCESSING_FAILED',
  
  // AI processing errors
  AI_PROCESSING_TIMEOUT: 'AI_PROCESSING_TIMEOUT',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  
  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_INSUFFICIENT_FUNDS: 'PAYMENT_INSUFFICIENT_FUNDS',
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
  
  // Network/Infrastructure
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};
```

---

## 🆔 Correlation ID Implementation

### **Request Tracking Requirements**

#### **Correlation ID Middleware**
```javascript
// Required: Add correlation ID to all requests
function correlationIdMiddleware(req, res, next) {
  // Use existing header or generate new ID
  req.correlationId = req.headers['x-correlation-id'] || 
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add to response headers
  res.setHeader('x-correlation-id', req.correlationId);
  
  // Add to request context for logging
  req.requestContext = {
    correlationId: req.correlationId,
    startTime: Date.now(),
    userId: req.user?.id,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  };
  
  next();
}
```

#### **Cross-Service Propagation**
```javascript
// Required: Propagate correlation IDs to external services
async function callExternalService(url, data, correlationId) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-correlation-id': correlationId,  // Propagate ID
      'x-source-service': 'cosnap-frontend'
    },
    body: JSON.stringify(data)
  });
}
```

---

## 🏥 Health Check APIs

### **Service Health Monitoring**

#### **Required Health Check Endpoint**
```javascript
// GET /api/health
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-08-21T10:30:00Z",
  "version": "1.2.3",
  "uptime": 86400,
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "lastCheck": "2025-08-21T10:29:55Z"
    },
    "runninghub_api": {
      "status": "degraded",
      "responseTime": 2500,
      "lastCheck": "2025-08-21T10:29:55Z",
      "issues": ["High response time"]
    },
    "redis": {
      "status": "healthy",
      "responseTime": 12,
      "lastCheck": "2025-08-21T10:29:55Z"
    },
    "email_service": {
      "status": "unhealthy",
      "responseTime": null,
      "lastCheck": "2025-08-21T10:29:55Z",
      "issues": ["Connection timeout"]
    }
  },
  "metrics": {
    "requestsPerMinute": 150,
    "errorRate": 0.02,
    "averageResponseTime": 250
  }
}
```

#### **Detailed Service Status**
```javascript
// GET /api/health/detailed
{
  "overall": {
    "status": "degraded",
    "score": 85
  },
  "services": {
    "runninghub_api": {
      "status": "degraded",
      "circuitBreakerState": "half-open",
      "lastFailure": "2025-08-21T10:25:30Z",
      "failureCount": 3,
      "recoveryTime": "2025-08-21T10:35:30Z"
    }
  },
  "recommendations": [
    "Monitor RunningHub API for recovery",
    "Consider enabling fallback mode for AI processing"
  ]
}
```

---

## 📊 Business Context APIs

### **User Context Enhancement**

#### **Enhanced User Context Endpoint**
```javascript
// GET /api/user/context
{
  "user": {
    "id": "user_123",
    "tier": "pro",
    "region": "china",
    "accountAge": 45,
    "lifetimeValue": 299.99,
    "supportTickets": 2,
    "lastActivity": "2025-08-21T10:15:00Z"
  },
  "subscription": {
    "plan": "pro",
    "status": "active",
    "renewalDate": "2025-09-21",
    "usage": {
      "aiEffectsUsed": 150,
      "aiEffectsLimit": 500,
      "storageUsed": "2.1GB",
      "storageLimit": "10GB"
    }
  },
  "preferences": {
    "errorNotifications": true,
    "debugMode": false,
    "language": "zh-CN",
    "timezone": "Asia/Shanghai"
  },
  "errorHistory": {
    "recentErrors": 2,
    "lastErrorTime": "2025-08-21T09:45:00Z",
    "commonErrorTypes": ["NETWORK_TIMEOUT", "FILE_TOO_LARGE"]
  }
}
```

### **Business Impact Tracking**

#### **Error Impact Logging API**
```javascript
// POST /api/analytics/error-impact
{
  "correlationId": "req_123456789",
  "errorCode": "AI_PROCESSING_TIMEOUT",
  "impact": {
    "type": "conversion",
    "severity": "medium",
    "estimatedLoss": 25.99,
    "conversionStep": "ai_effect_creation",
    "userJourney": "creating"
  },
  "context": {
    "userId": "user_123",
    "feature": "ai_portrait_effect",
    "sessionId": "sess_987654321",
    "deviceType": "mobile"
  }
}
```

---

## 🔄 Error Recovery APIs

### **Retry and Recovery Support**

#### **Operation Retry Endpoint**
```javascript
// POST /api/operations/retry
{
  "originalRequestId": "req_123456789",
  "retryReason": "network_timeout",
  "retryCount": 2,
  "modifiedParams": {
    "quality": "medium",  // Retry with lower quality
    "timeout": 60000      // Increase timeout
  }
}

// Response
{
  "success": true,
  "newRequestId": "req_123456790",
  "estimatedCompletion": "2025-08-21T10:35:00Z",
  "message": "Operation queued for retry"
}
```

#### **Bulk Operation Recovery**
```javascript
// POST /api/operations/recover-batch
{
  "failedOperations": [
    {
      "requestId": "req_123456789",
      "errorCode": "AI_PROCESSING_TIMEOUT",
      "userId": "user_123"
    },
    {
      "requestId": "req_123456788",
      "errorCode": "FILE_PROCESSING_FAILED",
      "userId": "user_124"
    }
  ],
  "recoveryStrategy": "auto_retry"
}
```

---

## 📴 Offline Sync Support

### **Queued Action Processing**

#### **Action Queue Submission**
```javascript
// POST /api/sync/queue-actions
{
  "userId": "user_123",
  "actions": [
    {
      "id": "action_offline_001",
      "type": "save_draft",
      "timestamp": "2025-08-21T09:30:00Z",
      "data": {
        "draftId": "draft_456",
        "content": "...",
        "metadata": {}
      },
      "priority": "normal"
    },
    {
      "id": "action_offline_002", 
      "type": "bookmark_effect",
      "timestamp": "2025-08-21T09:32:00Z",
      "data": {
        "effectId": "effect_789",
        "tags": ["favorite", "portrait"]
      },
      "priority": "low"
    }
  ]
}
```

#### **Sync Status Endpoint**
```javascript
// GET /api/sync/status/:userId
{
  "syncStatus": "in_progress",
  "lastSyncTime": "2025-08-21T10:25:00Z",
  "pendingActions": 3,
  "processedActions": 15,
  "failedActions": 1,
  "estimatedCompletion": "2025-08-21T10:30:00Z",
  "conflicts": [
    {
      "actionId": "action_offline_003",
      "conflictType": "version_mismatch",
      "resolution": "manual_required"
    }
  ]
}
```

---

## 📈 Error Analytics APIs

### **Error Pattern Analysis**

#### **Error Trends Endpoint**
```javascript
// GET /api/analytics/error-trends
{
  "timeRange": "24h",
  "totalErrors": 1247,
  "errorRate": 0.023,
  "trends": {
    "increasing": ["AI_PROCESSING_TIMEOUT"],
    "decreasing": ["FILE_TOO_LARGE"],
    "stable": ["NETWORK_TIMEOUT"]
  },
  "topErrors": [
    {
      "code": "AI_PROCESSING_TIMEOUT",
      "count": 456,
      "percentage": 36.6,
      "impact": "medium"
    },
    {
      "code": "NETWORK_TIMEOUT", 
      "count": 234,
      "percentage": 18.8,
      "impact": "low"
    }
  ],
  "businessImpact": {
    "totalEstimatedLoss": 1250.75,
    "conversionImpact": 0.12,
    "retentionImpact": 0.03
  }
}
```

#### **Error Pattern Detection**
```javascript
// GET /api/analytics/error-patterns
{
  "patterns": [
    {
      "id": "pattern_001",
      "name": "Mobile Upload Failures",
      "description": "High failure rate for mobile users uploading large files",
      "conditions": {
        "deviceType": "mobile",
        "errorCode": "FILE_TOO_LARGE",
        "fileSize": "> 10MB"
      },
      "frequency": "increasing",
      "recommendation": "Implement mobile-specific compression"
    }
  ],
  "anomalies": [
    {
      "detected": "2025-08-21T08:00:00Z",
      "type": "error_spike",
      "service": "runninghub_api",
      "magnitude": 5.2,
      "duration": "15 minutes"
    }
  ]
}
```

---

## ⚙️ Configuration and Preferences

### **Error Handling Configuration**

#### **System Configuration Endpoint**
```javascript
// GET /api/config/error-handling
{
  "retryDefaults": {
    "maxAttempts": 3,
    "baseDelay": 1000,
    "backoffMultiplier": 2
  },
  "circuitBreaker": {
    "failureThreshold": 5,
    "recoveryTimeout": 30000,
    "halfOpenMaxCalls": 3
  },
  "errorDisclosure": {
    "levelThresholds": {
      "critical": 1,
      "high": 2,
      "medium": 3
    }
  },
  "businessRules": {
    "highValueCustomerThreshold": 1000,
    "priorityEscalationEnabled": true
  }
}
```

#### **User Preference Management**
```javascript
// PUT /api/user/error-preferences
{
  "notifications": {
    "enabled": true,
    "channels": ["in_app", "email"],
    "frequency": "immediate"
  },
  "disclosure": {
    "level": "standard",
    "showTechnicalDetails": false,
    "autoRetry": true
  },
  "recovery": {
    "autoRetryEnabled": true,
    "maxAutoRetries": 2,
    "fallbackModeEnabled": true
  }
}
```

---

## 🔧 Database Requirements

### **Error Tracking Tables**

#### **Required Database Schema**
```sql
-- Error tracking table
CREATE TABLE error_logs (
  id UUID PRIMARY KEY,
  correlation_id VARCHAR(255) NOT NULL,
  user_id UUID,
  error_code VARCHAR(100) NOT NULL,
  error_message TEXT,
  stack_trace TEXT,
  severity VARCHAR(20),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  user_agent TEXT,
  ip_address INET,
  business_context JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_correlation_id (correlation_id),
  INDEX idx_user_id (user_id),
  INDEX idx_error_code (error_code),
  INDEX idx_created_at (created_at)
);

-- Error patterns table
CREATE TABLE error_patterns (
  id UUID PRIMARY KEY,
  pattern_name VARCHAR(255) NOT NULL,
  conditions JSONB,
  frequency_count INTEGER DEFAULT 0,
  last_occurrence TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- User error preferences table
CREATE TABLE user_error_preferences (
  user_id UUID PRIMARY KEY,
  notification_settings JSONB,
  disclosure_settings JSONB,
  recovery_settings JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Implementation Priority

### **Phase 1: Critical (Week 1)** 🔴
1. **Standardized Error Response Format**
2. **Correlation ID Implementation**
3. **Health Check Endpoints**
4. **Enhanced Error Logging**

### **Phase 2: High Priority (Week 2)** 🟡
1. **Business Context APIs**
2. **Error Recovery Endpoints** 
3. **Offline Sync Support**
4. **User Preference APIs**

### **Phase 3: Analytics & Optimization (Week 3)** 🟢
1. **Error Analytics APIs**
2. **Pattern Detection**
3. **Advanced Configuration**
4. **Performance Optimization**

---

## 📋 Testing Requirements

### **API Testing Needed**
- **Error Response Format**: Validate all endpoints return standardized format
- **Correlation ID Propagation**: Test ID flows through entire request chain
- **Health Check Accuracy**: Verify health status reflects actual service state
- **Business Context**: Validate context data accuracy and completeness

### **Load Testing Required**
- **Error Rate Under Load**: Maintain <2% error rate at 10x normal load
- **Health Check Performance**: <100ms response time for health endpoints
- **Analytics Processing**: Handle 1000+ error events per minute
- **Database Performance**: Error logging without impacting core features

---

## 🤝 Coordination Requirements

### **Backend Team Actions Needed**
1. **Review and Approve**: Error response format standardization
2. **Implement APIs**: All required endpoints with specifications
3. **Database Setup**: Error tracking and analytics tables
4. **Testing**: Comprehensive API and integration testing
5. **Documentation**: API documentation and usage examples

### **DevOps Integration**
1. **Monitoring Setup**: Health check monitoring in infrastructure
2. **Log Aggregation**: Error log collection and analysis setup
3. **Alert Configuration**: Business impact based alerting
4. **Performance Monitoring**: API response time and error rate tracking

---

## 📞 Support and Communication

### **Communication Channels**
- **Primary Contact**: Backend Architecture Team Lead
- **Escalation**: CTO for architectural decisions
- **Daily Standups**: Include backend integration progress
- **Review Meetings**: Weekly API implementation reviews

### **Documentation Handoff**
- **API Specifications**: Complete OpenAPI/Swagger documentation
- **Database Schemas**: Migration scripts and data models
- **Testing Plans**: Backend testing strategy and test cases
- **Deployment Guide**: Production deployment checklist

---

**Status**: 🟡 **PENDING BACKEND IMPLEMENTATION**  
**Deadline**: 2025-08-28 (Critical path for production deployment)  
**Impact**: Frontend error handling at 95% - Backend APIs required for 100%  
**Escalation**: Required if not started by 2025-08-23
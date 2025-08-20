import crypto from 'crypto';
import { promisify } from 'util';

// Advanced security middleware for production deployment

/**
 * IP-based security tracking
 */
class SecurityTracker {
  constructor() {
    this.failedAttempts = new Map(); // IP -> { count, lastAttempt, blocked }
    this.bannedIPs = new Set();
    this.suspiciousActivities = new Map(); // IP -> activities array
    this.maxFailedAttempts = 5;
    this.blockDuration = 15 * 60 * 1000; // 15 minutes
    this.cleanupInterval = 30 * 60 * 1000; // 30 minutes
    
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  recordFailedAttempt(ip) {
    const now = Date.now();
    const attempts = this.failedAttempts.get(ip) || { count: 0, lastAttempt: 0, blocked: false };
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    if (attempts.count >= this.maxFailedAttempts) {
      attempts.blocked = true;
      console.warn(`[安全] IP ${ip} 已被临时封禁 (${attempts.count} 次失败尝试)`);
    }
    
    this.failedAttempts.set(ip, attempts);
  }

  isBlocked(ip) {
    if (this.bannedIPs.has(ip)) return true;
    
    const attempts = this.failedAttempts.get(ip);
    if (!attempts || !attempts.blocked) return false;
    
    const now = Date.now();
    if (now - attempts.lastAttempt > this.blockDuration) {
      // Unblock expired blocks
      attempts.blocked = false;
      attempts.count = 0;
      this.failedAttempts.set(ip, attempts);
      return false;
    }
    
    return true;
  }

  recordSuspiciousActivity(ip, activity) {
    const activities = this.suspiciousActivities.get(ip) || [];
    activities.push({
      activity,
      timestamp: Date.now()
    });
    
    // Keep only last 50 activities per IP
    if (activities.length > 50) {
      activities.splice(0, activities.length - 50);
    }
    
    this.suspiciousActivities.set(ip, activities);
    
    // Check for patterns
    this.analyzePatterns(ip, activities);
  }

  analyzePatterns(ip, activities) {
    const recentActivities = activities.filter(a => Date.now() - a.timestamp < 300000); // Last 5 minutes
    
    if (recentActivities.length > 20) {
      console.warn(`[安全] IP ${ip} 高频活动检测: ${recentActivities.length} 次活动 (5分钟内)`);
    }
    
    // Check for bot-like behavior
    const pathCounts = {};
    recentActivities.forEach(a => {
      if (a.activity.path) {
        pathCounts[a.activity.path] = (pathCounts[a.activity.path] || 0) + 1;
      }
    });
    
    const maxPathCount = Math.max(...Object.values(pathCounts));
    if (maxPathCount > 10) {
      console.warn(`[安全] IP ${ip} 疑似机器人行为: 单个路径访问 ${maxPathCount} 次`);
    }
  }

  cleanup() {
    const now = Date.now();
    const expiredThreshold = 60 * 60 * 1000; // 1 hour
    
    // Clean up old failed attempts
    for (const [ip, attempts] of this.failedAttempts.entries()) {
      if (now - attempts.lastAttempt > expiredThreshold) {
        this.failedAttempts.delete(ip);
      }
    }
    
    // Clean up old suspicious activities
    for (const [ip, activities] of this.suspiciousActivities.entries()) {
      const recentActivities = activities.filter(a => now - a.timestamp < expiredThreshold);
      if (recentActivities.length === 0) {
        this.suspiciousActivities.delete(ip);
      } else {
        this.suspiciousActivities.set(ip, recentActivities);
      }
    }
  }

  getSecurityStats() {
    return {
      totalTrackedIPs: this.failedAttempts.size,
      blockedIPs: Array.from(this.failedAttempts.entries())
        .filter(([ip, data]) => data.blocked).length,
      permanentlyBannedIPs: this.bannedIPs.size,
      suspiciousActivities: this.suspiciousActivities.size
    };
  }
}

const securityTracker = new SecurityTracker();

/**
 * Advanced authentication security middleware
 */
export const advancedAuthSecurity = (req, res, next) => {
  const ip = getClientIP(req);
  
  // Check if IP is blocked
  if (securityTracker.isBlocked(ip)) {
    securityTracker.recordSuspiciousActivity(ip, {
      type: 'blocked_access_attempt',
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(429).json({
      success: false,
      error: '访问频率过高，请稍后再试',
      retryAfter: 900 // 15 minutes
    });
  }
  
  // Record activity
  securityTracker.recordSuspiciousActivity(ip, {
    type: 'request',
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent')
  });
  
  // Check for authentication endpoints
  if (req.path.includes('/auth/') || req.path.includes('/login')) {
    req.securityContext = { ip, requiresExtraValidation: true };
  }
  
  next();
};

/**
 * Login attempt security middleware
 */
export const loginSecurityMiddleware = (req, res, next) => {
  const ip = getClientIP(req);
  
  // Capture original json method to intercept responses
  const originalJson = res.json;
  res.json = function(data) {
    // Check if login failed
    if (data.success === false && req.path.includes('login')) {
      securityTracker.recordFailedAttempt(ip);
      securityTracker.recordSuspiciousActivity(ip, {
        type: 'failed_login',
        email: req.body?.email,
        timestamp: Date.now()
      });
    }
    
    // Check for other authentication failures
    if (res.statusCode === 401 || res.statusCode === 403) {
      securityTracker.recordSuspiciousActivity(ip, {
        type: 'auth_failure',
        path: req.path,
        status: res.statusCode
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * SQL injection detection middleware
 */
export const sqlInjectionProtection = (req, res, next) => {
  const sqlPatterns = [
    /(\s|^)(select|insert|update|delete|drop|create|alter|exec|execute|union|declare|cast|convert)\s+/gi,
    /('|\")(\s|;|$)/g,
    /(\s|^)(or|and)\s+[\w\d]+\s*=\s*[\w\d]+/gi,
    /(\s|^)(or|and)\s+['"][\w\d]*['"](\s*=\s*['"][\w\d]*['"])?/gi,
    /(--|\/\*|\*\/|;)/g,
    /\b(sysobjects|syscolumns|information_schema)\b/gi
  ];

  const checkValue = (value, path = '') => {
    if (typeof value === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          const ip = getClientIP(req);
          console.warn(`[SQL注入检测] IP: ${ip}, 路径: ${path}, 值: ${value.substring(0, 100)}`);
          securityTracker.recordSuspiciousActivity(ip, {
            type: 'sql_injection_attempt',
            path,
            value: value.substring(0, 100),
            pattern: pattern.source
          });
          return true;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, val] of Object.entries(value)) {
        if (checkValue(val, `${path}.${key}`)) {
          return true;
        }
      }
    }
    return false;
  };

  // Check request body, query, and params
  if (req.body && checkValue(req.body, 'body')) {
    return res.status(400).json({
      success: false,
      error: '请求包含非法内容'
    });
  }

  if (req.query && checkValue(req.query, 'query')) {
    return res.status(400).json({
      success: false,
      error: '查询参数包含非法内容'
    });
  }

  if (req.params && checkValue(req.params, 'params')) {
    return res.status(400).json({
      success: false,
      error: '路径参数包含非法内容'
    });
  }

  next();
};

/**
 * XSS protection middleware
 */
export const xssProtection = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi
  ];

  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          const ip = getClientIP(req);
          console.warn(`[XSS检测] IP: ${ip}, 值: ${value.substring(0, 100)}`);
          securityTracker.recordSuspiciousActivity(ip, {
            type: 'xss_attempt',
            value: value.substring(0, 100)
          });
          
          // Remove dangerous content
          value = value.replace(pattern, '');
        }
      }
      return value;
    } else if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  };

  // Sanitize request data
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};

/**
 * File upload security middleware
 */
export const fileUploadSecurity = (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }

  const files = req.files || [req.file];
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const maxFileSize = 30 * 1024 * 1024; // 30MB

  for (const file of files) {
    if (!file) continue;

    // Check file size
    if (file.size > maxFileSize) {
      return res.status(413).json({
        success: false,
        error: `文件大小超出限制 (最大 ${maxFileSize / 1024 / 1024}MB)`
      });
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      const ip = getClientIP(req);
      console.warn(`[文件上传安全] 非法文件类型: ${file.mimetype}, IP: ${ip}`);
      securityTracker.recordSuspiciousActivity(ip, {
        type: 'illegal_file_upload',
        mimetype: file.mimetype,
        filename: file.originalname
      });
      
      return res.status(400).json({
        success: false,
        error: '不支持的文件类型'
      });
    }

    // Check file extension
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: '不支持的文件扩展名'
      });
    }

    // Check for potential malicious file names
    const dangerousPatterns = [
      /\.\./g,
      /[<>:"|?*]/g,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/gi
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(file.originalname)) {
        const ip = getClientIP(req);
        console.warn(`[文件上传安全] 危险文件名: ${file.originalname}, IP: ${ip}`);
        return res.status(400).json({
          success: false,
          error: '文件名包含非法字符'
        });
      }
    }
  }

  next();
};

/**
 * API rate limiting per endpoint
 */
export const createEndpointRateLimit = (requests, windowMs, message) => {
  const requests_map = new Map();

  return (req, res, next) => {
    const key = `${getClientIP(req)}:${req.path}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    const current = requests_map.get(key) || [];
    const validRequests = current.filter(timestamp => timestamp > windowStart);

    if (validRequests.length >= requests) {
      securityTracker.recordSuspiciousActivity(getClientIP(req), {
        type: 'rate_limit_exceeded',
        endpoint: req.path,
        requestCount: validRequests.length
      });

      return res.status(429).json({
        success: false,
        error: message || '请求频率过高',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    validRequests.push(now);
    requests_map.set(key, validRequests);

    next();
  };
};

/**
 * Content Security Policy for API responses
 */
export const apiContentSecurity = (req, res, next) => {
  // Set security headers for API responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server identification
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
};

/**
 * Request signature validation for critical operations
 */
export const requestSignatureValidation = (secret) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      return next(); // Skip for GET requests
    }

    const signature = req.get('X-Request-Signature');
    const timestamp = req.get('X-Request-Timestamp');
    
    if (!signature || !timestamp) {
      return res.status(401).json({
        success: false,
        error: '缺少请求签名'
      });
    }

    // Check timestamp (prevent replay attacks)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 300000) { // 5 minutes
      return res.status(401).json({
        success: false,
        error: '请求时间戳无效'
      });
    }

    // Validate signature
    const payload = JSON.stringify(req.body) + timestamp;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      const ip = getClientIP(req);
      console.warn(`[签名验证失败] IP: ${ip}, 路径: ${req.path}`);
      securityTracker.recordSuspiciousActivity(ip, {
        type: 'signature_validation_failed',
        path: req.path
      });

      return res.status(401).json({
        success: false,
        error: '请求签名验证失败'
      });
    }

    next();
  };
};

/**
 * Security monitoring endpoint
 */
export const securityMonitoringEndpoint = (req, res) => {
  if (req.path === '/security/status') {
    const stats = securityTracker.getSecurityStats();
    return res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
  }
  
  if (req.path === '/security/blocked-ips') {
    const blockedIPs = Array.from(securityTracker.failedAttempts.entries())
      .filter(([ip, data]) => data.blocked)
      .map(([ip, data]) => ({
        ip: ip.substring(0, 10) + '***', // Partially hide IP for privacy
        failedAttempts: data.count,
        lastAttempt: new Date(data.lastAttempt).toISOString()
      }));
    
    return res.json({
      success: true,
      data: blockedIPs
    });
  }
};

/**
 * Emergency lockdown middleware
 */
export const emergencyLockdown = (req, res, next) => {
  if (process.env.EMERGENCY_LOCKDOWN === 'true') {
    // Allow only health checks and admin access
    if (req.path === '/health' || req.path.startsWith('/admin/')) {
      return next();
    }
    
    return res.status(503).json({
      success: false,
      error: '系统维护中，请稍后再试',
      maintenanceMode: true
    });
  }
  
  next();
};

/**
 * Utility function to get client IP
 */
function getClientIP(req) {
  return req.get('CF-Connecting-IP') || // Cloudflare
         req.get('X-Real-IP') || // Nginx
         req.get('X-Forwarded-For')?.split(',')[0]?.trim() || // Standard proxy header
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

export {
  securityTracker,
  getClientIP
};

export default {
  advancedAuthSecurity,
  loginSecurityMiddleware,
  sqlInjectionProtection,
  xssProtection,
  fileUploadSecurity,
  createEndpointRateLimit,
  apiContentSecurity,
  requestSignatureValidation,
  securityMonitoringEndpoint,
  emergencyLockdown,
  securityTracker,
  getClientIP
};
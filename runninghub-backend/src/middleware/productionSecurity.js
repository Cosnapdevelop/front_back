/**
 * Production Security Hardening Middleware
 * Comprehensive security measures for production deployment
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { body, query, param, validationResult } from 'express-validator';
import redisService from '../services/redisService.js';
import monitoringService from '../services/monitoringService.js';
import { productionConfig } from '../config/production.js';

// =============================================================================
// SECURITY HEADERS CONFIGURATION
// =============================================================================

export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some admin tools
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for dynamic styles
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "*.alicdn.com",
        "*.aliyuncs.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.runninghub.cn",
        "https://api.runninghub.hk",
        "https://sentry.io",
        "https://www.google-analytics.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "https:"],
      frameSrc: ["'none'"]
    }
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // Prevent MIME type sniffing
  noSniff: true,

  // Enable XSS protection
  xssFilter: true,

  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // DNS prefetch control
  dnsPrefetchControl: {
    allow: false
  },

  // IE No Open
  ieNoOpen: true,

  // Referrer Policy
  referrerPolicy: {
    policy: ['same-origin']
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disable if causing issues

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: {
    policy: 'same-origin'
  },

  // Cross-Origin Resource Policy
  // TODO(human): Temporarily disable to fix cross-origin image loading issue
  crossOriginResourcePolicy: false,
  
  // Original config causing issues:
  // crossOriginResourcePolicy: {
  //   policy: 'cross-origin'
  // },

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permissions Policy (formerly Feature Policy)
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
      usb: ["'none'"],
      magnetometer: ["'none'"],
      gyroscope: ["'none'"],
      accelerometer: ["'none'"]
    }
  }
});

// =============================================================================
// ADVANCED RATE LIMITING
// =============================================================================

// Store for rate limiting
const rateLimitStore = {
  async get(key) {
    try {
      const data = await redisService.get(`rate_limit:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      monitoringService.error('Rate limit store get error', error);
      return null;
    }
  },

  async set(key, value, ttl) {
    try {
      await redisService.set(`rate_limit:${key}`, JSON.stringify(value), ttl);
    } catch (error) {
      monitoringService.error('Rate limit store set error', error);
    }
  },

  async increment(key, ttl) {
    try {
      const current = await redisService.incr(`rate_limit:${key}`);
      if (current === 1) {
        await redisService.expire(`rate_limit:${key}`, ttl);
      }
      return current;
    } catch (error) {
      monitoringService.error('Rate limit store increment error', error);
      return 1;
    }
  }
};

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: productionConfig.security.rateLimiting.general.windowMs,
  max: productionConfig.security.rateLimiting.general.max,
  
  // Custom key generator to include user info
  keyGenerator: (req) => {
    const identifier = req.user?.id || req.ip || 'anonymous';
    return `general:${identifier}`;
  },

  // Enhanced rate limit store
  store: rateLimitStore,

  // Custom handler for rate limit exceeded
  handler: (req, res, next) => {
    monitoringService.warn('Rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP/user. Please try again later.',
      retryAfter: Math.ceil(productionConfig.security.rateLimiting.general.windowMs / 1000)
    });
  },

  // Standard headers
  standardHeaders: true,
  legacyHeaders: false,

  // Skip successful requests
  skipSuccessfulRequests: productionConfig.security.rateLimiting.general.skipSuccessfulRequests
});

// Authentication endpoint rate limiting (stricter)
export const authRateLimit = rateLimit({
  windowMs: productionConfig.security.rateLimiting.auth.windowMs,
  max: productionConfig.security.rateLimiting.auth.max,
  
  keyGenerator: (req) => {
    // Combine IP and email for auth attempts
    const email = req.body?.email || 'unknown';
    return `auth:${req.ip}:${email}`;
  },

  store: rateLimitStore,

  handler: (req, res, next) => {
    monitoringService.error('Auth rate limit exceeded', null, {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      error: 'Authentication rate limit exceeded',
      message: 'Too many authentication attempts. Account may be temporarily locked.',
      retryAfter: Math.ceil(productionConfig.security.rateLimiting.auth.windowMs / 1000)
    });
  },

  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: productionConfig.security.rateLimiting.auth.skipSuccessfulRequests
});

// File upload rate limiting
export const uploadRateLimit = rateLimit({
  windowMs: productionConfig.security.rateLimiting.upload.windowMs,
  max: productionConfig.security.rateLimiting.upload.max,
  
  keyGenerator: (req) => {
    const identifier = req.user?.id || req.ip;
    return `upload:${identifier}`;
  },

  store: rateLimitStore,

  handler: (req, res, next) => {
    monitoringService.warn('Upload rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      error: 'Upload rate limit exceeded',
      message: 'Too many file uploads. Please wait before uploading again.',
      retryAfter: Math.ceil(productionConfig.security.rateLimiting.upload.windowMs / 1000)
    });
  }
});

// AI effects processing rate limiting
export const effectsRateLimit = rateLimit({
  windowMs: productionConfig.security.rateLimiting.effects.windowMs,
  max: productionConfig.security.rateLimiting.effects.max,
  
  keyGenerator: (req) => {
    const identifier = req.user?.id || req.ip;
    return `effects:${identifier}`;
  },

  store: rateLimitStore,

  handler: (req, res, next) => {
    monitoringService.warn('Effects processing rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      effectType: req.body?.effectType || req.params?.effectId,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      error: 'Effects processing rate limit exceeded',
      message: 'Too many AI effect requests. Please wait before processing more effects.',
      retryAfter: Math.ceil(productionConfig.security.rateLimiting.effects.windowMs / 1000)
    });
  }
});

// =============================================================================
// INPUT VALIDATION AND SANITIZATION
// =============================================================================

// Sanitize all inputs to prevent injection attacks
export const sanitizeInputs = [
  // Remove any potential NoSQL injection attempts
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      monitoringService.warn('Input sanitization triggered', {
        ip: req.ip,
        userId: req.user?.id,
        sanitizedKey: key,
        userAgent: req.get('User-Agent')
      });
    }
  }),

  // Custom sanitization middleware
  (req, res, next) => {
    try {
      // Sanitize common injection patterns
      const sanitizeValue = (value) => {
        if (typeof value === 'string') {
          // Remove potential script tags and SQL injection patterns
          return value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b|\bCREATE\b)/gi, '')
            .replace(/['"`;]/g, '')
            .trim();
        }
        return value;
      };

      // Recursively sanitize objects
      const sanitizeObject = (obj) => {
        if (obj && typeof obj === 'object') {
          for (const key in obj) {
            if (Array.isArray(obj[key])) {
              obj[key] = obj[key].map(item => 
                typeof item === 'object' ? sanitizeObject(item) : sanitizeValue(item)
              );
            } else if (typeof obj[key] === 'object') {
              obj[key] = sanitizeObject(obj[key]);
            } else {
              obj[key] = sanitizeValue(obj[key]);
            }
          }
        }
        return obj;
      };

      // Sanitize request body, query, and params
      if (req.body) {
        req.body = sanitizeObject(req.body);
      }
      if (req.query) {
        req.query = sanitizeObject(req.query);
      }
      if (req.params) {
        req.params = sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      monitoringService.error('Input sanitization error', error);
      next();
    }
  }
];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// User authentication validation
export const validateAuth = {
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be 8-128 characters'),
    handleValidationErrors
  ],

  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Valid email is required'),
    body('username')
      .isAlphanumeric()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 alphanumeric characters'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    handleValidationErrors
  ]
};

// File upload validation
export const validateUpload = [
  body('fileType')
    .isIn(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    .withMessage('Invalid file type'),
  handleValidationErrors
];

// AI effects validation
export const validateEffect = [
  body('effectType')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Effect type is required'),
  body('parameters')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object'),
  handleValidationErrors
];

// Payment validation
export const validatePayment = [
  body('amount')
    .isFloat({ min: 0.01, max: 99999.99 })
    .withMessage('Amount must be between 0.01 and 99999.99'),
  body('paymentMethod')
    .isIn(['WECHAT_PAY', 'ALIPAY'])
    .withMessage('Invalid payment method'),
  body('tier')
    .isIn(['PRO', 'VIP'])
    .withMessage('Invalid subscription tier'),
  handleValidationErrors
];

// Comment validation
export const validateComment = [
  body('content')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .trim()
    .escape()
    .withMessage('Comment must be 1-1000 characters'),
  handleValidationErrors
];

// General ID validation
export const validateId = [
  param('id')
    .isString()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// =============================================================================
// VALIDATION ERROR HANDLER
// =============================================================================

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    monitoringService.warn('Validation errors', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
      errors: errorDetails,
      userAgent: req.get('User-Agent')
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: errorDetails
    });
  }

  next();
}

// =============================================================================
// SECURITY MONITORING
// =============================================================================

// Suspicious activity detection
export const detectSuspiciousActivity = (req, res, next) => {
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)/i,
    // XSS patterns
    /<script|javascript:|on\w+\s*=/i,
    // Path traversal
    /\.\.\//,
    // Command injection
    /;\s*(ls|cat|wget|curl|nc|netcat|chmod|rm)\s/i
  ];

  const userAgent = req.get('User-Agent') || '';
  const suspiciousBots = [
    'sqlmap',
    'nikto',
    'nessus',
    'openvas',
    'nuclei',
    'masscan'
  ];

  let suspiciousActivity = false;
  const reasons = [];

  // Check request content
  const requestContent = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    url: req.originalUrl
  });

  suspiciousPatterns.forEach((pattern, index) => {
    if (pattern.test(requestContent)) {
      suspiciousActivity = true;
      reasons.push(`Suspicious pattern ${index + 1} detected`);
    }
  });

  // Check user agent
  if (suspiciousBots.some(bot => userAgent.toLowerCase().includes(bot))) {
    suspiciousActivity = true;
    reasons.push('Suspicious user agent detected');
  }

  // Check for unusual request size
  const requestSize = JSON.stringify(req.body || {}).length;
  if (requestSize > 100000) { // 100KB
    suspiciousActivity = true;
    reasons.push('Unusually large request detected');
  }

  // Check for rapid requests from same IP
  const clientIP = req.ip;
  const rapidRequestKey = `rapid_requests:${clientIP}`;
  
  redisService.incr(rapidRequestKey).then(count => {
    if (count === 1) {
      redisService.expire(rapidRequestKey, 60); // 1 minute window
    }
    
    if (count > 100) { // More than 100 requests per minute
      suspiciousActivity = true;
      reasons.push('Rapid requests detected');
    }
  }).catch(() => {
    // Ignore Redis errors for this check
  });

  if (suspiciousActivity) {
    monitoringService.error('Suspicious activity detected', null, {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: userAgent,
      endpoint: req.originalUrl,
      method: req.method,
      reasons: reasons,
      requestSize: requestSize,
      timestamp: new Date().toISOString()
    });

    // For now, just log and continue
    // In production, you might want to block or require additional verification
  }

  next();
};

// =============================================================================
// REQUEST SIZE LIMITS
// =============================================================================

export const requestSizeLimit = (req, res, next) => {
  const { security } = productionConfig;
  
  // Check if content-length header exists and is within limits
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = parseInt(security.validation.maxFieldSize) * security.validation.maxFields;
  
  if (contentLength > maxSize) {
    monitoringService.warn('Request size limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      contentLength: contentLength,
      maxSize: maxSize,
      userAgent: req.get('User-Agent')
    });

    return res.status(413).json({
      error: 'Request too large',
      message: 'Request size exceeds maximum allowed limit'
    });
  }

  next();
};

// =============================================================================
// SECURITY RESPONSE HEADERS
// =============================================================================

export const addSecurityHeaders = (req, res, next) => {
  // Additional custom security headers
  res.setHeader('X-Request-ID', req.id || 'unknown');
  res.setHeader('X-Response-Time', Date.now() - req.startTime);
  
  // Security headers for API responses
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};

// =============================================================================
// EXPORT ALL SECURITY MIDDLEWARE
// =============================================================================

export default {
  securityHeaders,
  generalRateLimit,
  authRateLimit,
  uploadRateLimit,
  effectsRateLimit,
  sanitizeInputs,
  validateAuth,
  validateUpload,
  validateEffect,
  validatePayment,
  validateComment,
  validateId,
  validatePagination,
  detectSuspiciousActivity,
  requestSizeLimit,
  addSecurityHeaders
};
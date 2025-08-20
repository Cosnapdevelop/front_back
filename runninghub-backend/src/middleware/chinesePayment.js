import { validationResult, body, param, query } from 'express-validator';
import SubscriptionService from '../services/subscriptionService.js';
import rawBody from 'raw-body';

const subscriptionService = new SubscriptionService();

/**
 * Chinese Payment Middleware
 * 中国支付系统中间件
 * 
 * 提供支付验证、订阅检查、使用限制等中间件功能
 */

/**
 * 验证支付创建请求
 */
export const validatePaymentCreation = [
  body('subscriptionTier')
    .isIn(['PRO', 'VIP'])
    .withMessage('订阅等级必须是 PRO 或 VIP'),
  
  body('billingCycle')
    .isIn(['monthly', 'quarterly', 'yearly'])
    .withMessage('计费周期必须是 monthly、quarterly 或 yearly'),
  
  body('paymentMethod')
    .isIn(['WECHAT_PAY', 'ALIPAY'])
    .withMessage('支付方式必须是 WECHAT_PAY 或 ALIPAY'),
  
  body('tradeType')
    .optional()
    .isIn(['JSAPI', 'NATIVE', 'APP', 'H5', 'web', 'wap', 'qr'])
    .withMessage('交易类型无效'),
  
  body('openId')
    .if(body('paymentMethod').equals('WECHAT_PAY'))
    .if(body('tradeType').equals('JSAPI'))
    .notEmpty()
    .withMessage('微信JSAPI支付需要提供openId'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    next();
  }
];

/**
 * 验证支付查询请求
 */
export const validatePaymentQuery = [
  param('paymentId')
    .isString()
    .notEmpty()
    .withMessage('支付ID不能为空'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '支付ID格式错误',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * 验证退款请求
 */
export const validateRefundRequest = [
  body('paymentId')
    .isString()
    .notEmpty()
    .withMessage('支付ID不能为空'),
  
  body('refundReason')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('退款原因长度必须在1-200字符之间'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '退款请求参数验证失败',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * 检查用户订阅状态
 */
export const checkSubscriptionStatus = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未登录',
        code: 'UNAUTHORIZED'
      });
    }

    const subscription = await subscriptionService.getUserSubscription(userId);
    req.userSubscription = subscription;
    
    next();
  } catch (error) {
    console.error('Check subscription status error:', error);
    return res.status(500).json({
      success: false,
      message: '检查订阅状态失败',
      error: error.message
    });
  }
};

/**
 * 检查功能使用权限
 */
export const checkFeatureAccess = (usageType, effectId = null) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未登录',
          code: 'UNAUTHORIZED'
        });
      }

      // 动态获取effectId（如果从请求参数中获取）
      const dynamicEffectId = effectId || req.body?.effectId || req.params?.effectId;
      
      const accessCheck = await subscriptionService.canUseFeature(userId, usageType, dynamicEffectId);
      
      if (!accessCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: accessCheck.reason,
          code: accessCheck.code,
          ...(accessCheck.currentUsage !== undefined && {
            currentUsage: accessCheck.currentUsage,
            limit: accessCheck.limit
          })
        });
      }

      // 将访问检查结果附加到请求对象
      req.featureAccess = accessCheck;
      next();
    } catch (error) {
      console.error('Check feature access error:', error);
      return res.status(500).json({
        success: false,
        message: '检查功能权限失败',
        error: error.message
      });
    }
  };
};

/**
 * 记录功能使用
 */
export const recordFeatureUsage = (usageType, getDescription) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return next();
      }

      // 生成使用描述
      const description = typeof getDescription === 'function' 
        ? getDescription(req) 
        : getDescription || `使用${usageType}功能`;
      
      const effectId = req.body?.effectId || req.params?.effectId || null;
      const taskId = req.body?.taskId || req.params?.taskId || null;

      // 记录使用
      await subscriptionService.recordUsage(userId, usageType, description, effectId, taskId);
      
      // 在响应中间件中记录成功使用
      const originalSend = res.send;
      res.send = function(data) {
        // 只在成功响应时记录
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Feature usage recorded: ${userId} - ${usageType}`);
        }
        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Record feature usage error:', error);
      // 不阻止请求继续，但记录错误
      next();
    }
  };
};

/**
 * 解析微信支付回调原始数据
 */
export const parseWeChatPayWebhook = async (req, res, next) => {
  try {
    if (req.get('content-type')?.includes('application/xml') || 
        req.get('content-type')?.includes('text/xml')) {
      
      const rawData = await rawBody(req, {
        length: req.get('content-length'),
        limit: '1mb',
        encoding: 'utf8'
      });
      
      req.rawBody = rawData;
      req.webhookData = rawData;
    }
    next();
  } catch (error) {
    console.error('Parse WeChat Pay webhook error:', error);
    return res.status(400).json({
      success: false,
      message: '解析微信支付回调数据失败'
    });
  }
};

/**
 * 解析支付宝回调数据
 */
export const parseAlipayWebhook = (req, res, next) => {
  try {
    // 支付宝使用 form-urlencoded 格式
    if (req.body && typeof req.body === 'object') {
      req.webhookData = req.body;
    } else {
      throw new Error('Invalid Alipay webhook data format');
    }
    next();
  } catch (error) {
    console.error('Parse Alipay webhook error:', error);
    return res.status(400).json({
      success: false,
      message: '解析支付宝回调数据失败'
    });
  }
};

/**
 * 限制支付请求频率
 */
export const rateLimitPayment = (req, res, next) => {
  const userId = req.user?.id;
  const key = `payment_rate_limit:${userId}`;
  
  // 这里可以集成Redis或内存存储来实现真正的限流
  // 暂时使用简单的内存存储示例
  
  if (!global.paymentRateLimit) {
    global.paymentRateLimit = new Map();
  }
  
  const now = Date.now();
  const userRequests = global.paymentRateLimit.get(userId) || [];
  
  // 清理5分钟前的请求
  const validRequests = userRequests.filter(time => now - time < 5 * 60 * 1000);
  
  if (validRequests.length >= 10) { // 5分钟内最多10次支付请求
    return res.status(429).json({
      success: false,
      message: '支付请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  validRequests.push(now);
  global.paymentRateLimit.set(userId, validRequests);
  
  next();
};

/**
 * 验证客户端IP
 */
export const validateClientIP = (req, res, next) => {
  const clientIP = req.ip || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   req.headers['x-forwarded-for']?.split(',')[0];
  
  if (!clientIP) {
    return res.status(400).json({
      success: false,
      message: '无法获取客户端IP地址',
      code: 'INVALID_CLIENT_IP'
    });
  }
  
  req.clientIP = clientIP;
  next();
};

/**
 * 验证用户代理
 */
export const validateUserAgent = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent) {
    return res.status(400).json({
      success: false,
      message: '缺少User-Agent头',
      code: 'MISSING_USER_AGENT'
    });
  }
  
  req.userAgent = userAgent;
  next();
};

/**
 * 检查支付环境安全性
 */
export const checkPaymentSecurity = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  // 基本的安全检查
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /curl/i,
    /wget/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent)) {
      console.warn(`Suspicious payment request from: ${userAgent}`);
      return res.status(403).json({
        success: false,
        message: '支付环境检测异常',
        code: 'SUSPICIOUS_ENVIRONMENT'
      });
    }
  }
  
  next();
};

/**
 * 格式化错误响应
 */
export const formatErrorResponse = (error, req, res, next) => {
  console.error('Payment API error:', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  const statusCode = error.statusCode || 500;
  const message = error.message || '支付服务异常';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  });
};

/**
 * 记录支付操作日志
 */
export const logPaymentOperation = (operation) => {
  return (req, res, next) => {
    const startTime = Date.now();
    const userId = req.user?.id || 'anonymous';
    const ip = req.clientIP || req.ip;
    
    console.log(`Payment ${operation} started: user=${userId}, ip=${ip}`);
    
    // 记录响应
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 300;
      
      console.log(`Payment ${operation} completed: user=${userId}, status=${res.statusCode}, duration=${duration}ms, success=${success}`);
      
      originalSend.call(this, data);
    };
    
    next();
  };
};
import rateLimit from 'express-rate-limit';

/**
 * 自定义日志记录函数
 */
const logRateLimitHit = (req, options) => {
  console.warn(`[限流触发] IP: ${req.ip}, 端点: ${req.method} ${req.path}, User-Agent: ${req.get('User-Agent')}`);
};

/**
 * 自定义错误响应
 */
const rateLimitErrorResponse = (req, res) => {
  const retryAfter = Math.round(req.rateLimit.resetTime - Date.now()) / 1000;
  res.status(429).json({
    success: false,
    error: '请求过于频繁，请稍后再试',
    retryAfter: Math.max(retryAfter, 1)
  });
};

/**
 * 通用限流配置
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP 15分钟内最多1000个请求
  message: rateLimitErrorResponse,
  standardHeaders: true, // 返回限流信息在 `RateLimit-*` 头部
  legacyHeaders: false, // 禁用 `X-RateLimit-*` 头部
  onLimitReached: logRateLimitHit,
  skip: (req) => {
    // 跳过健康检查端点
    return req.path === '/health' || req.path === '/health/db';
  }
});

/**
 * 严格的认证端点限流
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 20, // 每个IP 15分钟内最多20次认证请求
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: logRateLimitHit,
  skipSuccessfulRequests: true, // 成功的请求不计入限制
});

/**
 * 更严格的登录限流 - 防止暴力破解
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每个IP 15分钟内最多10次登录尝试
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: logRateLimitHit,
  skipSuccessfulRequests: true, // 成功登录不计入限制
});

/**
 * 注册限流 - 防止批量注册
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 每个IP 1小时内最多5次注册
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: logRateLimitHit,
});

/**
 * 文件上传限流
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 每个IP 15分钟内最多50次上传
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: logRateLimitHit,
});

/**
 * AI任务提交限流
 */
export const aiTaskLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 20, // 每个IP 5分钟内最多20个AI任务
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: logRateLimitHit,
});

/**
 * 社区功能限流
 */
export const communityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP 15分钟内最多100个社区请求
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: logRateLimitHit,
});

/**
 * 创建内容限流 - 防止垃圾内容
 */
export const createContentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每个IP 15分钟内最多10次创建内容
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: logRateLimitHit,
});

/**
 * 密码重置限流
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 每个IP 1小时内最多3次密码重置请求
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: logRateLimitHit,
});

/**
 * API密钥验证限流
 */
export const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 100, // 每个IP每分钟最多100次API调用
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: logRateLimitHit,
});

/**
 * 敏感操作限流（账户修改等）
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 每个IP 1小时内最多10次敏感操作
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  onLimitReached: logRateLimitHit,
});

/**
 * 基于用户的限流（需要认证后使用）
 */
export const createUserBasedLimiter = (windowMs, max, skipSuccessful = false) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      // 如果用户已认证，使用用户ID，否则使用IP
      return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
    },
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: (req) => {
      const identifier = req.user?.id ? `用户ID: ${req.user.id}` : `IP: ${req.ip}`;
      console.warn(`[用户限流触发] ${identifier}, 端点: ${req.method} ${req.path}`);
    },
    skipSuccessfulRequests: skipSuccessful,
  });
};

/**
 * 动态限流 - 根据系统负载调整限制
 */
export const createDynamicLimiter = (baseMax, windowMs = 15 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: (req) => {
      // 可以根据系统负载、时间等因素动态调整限制
      const hour = new Date().getHours();
      
      // 高峰时段（9-18点）更严格的限制
      if (hour >= 9 && hour <= 18) {
        return Math.floor(baseMax * 0.8);
      }
      
      // 夜间时段相对宽松
      if (hour >= 22 || hour <= 6) {
        return Math.floor(baseMax * 1.2);
      }
      
      return baseMax;
    },
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false,
    onLimitReached: logRateLimitHit,
  });
};

/**
 * 渐进式限流 - 第一次违规轻微限制，重复违规加重限制
 */
export const createProgressiveLimiter = () => {
  const violations = new Map();
  
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      const key = req.ip;
      const violationCount = violations.get(key) || 0;
      
      // 根据违规次数调整限制
      const baseMax = 100;
      const penalty = Math.min(violationCount * 10, 80); // 最多减少80%
      
      return Math.max(baseMax - penalty, 10); // 最少保留10个请求
    },
    onLimitReached: (req) => {
      const key = req.ip;
      const currentViolations = violations.get(key) || 0;
      violations.set(key, currentViolations + 1);
      
      // 清理旧的违规记录（24小时后）
      setTimeout(() => {
        const updatedViolations = violations.get(key) || 0;
        if (updatedViolations > 0) {
          violations.set(key, updatedViolations - 1);
        }
      }, 24 * 60 * 60 * 1000);
      
      logRateLimitHit(req);
    },
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false,
  });
};
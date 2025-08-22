import helmet from 'helmet';

/**
 * 环境变量验证
 */
export const validateEnvironment = () => {
  const requiredEnvVars = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'RUNNINGHUB_API_KEY'
    // RUNNINGHUB_API_URL 已移除，因为实际使用区域特定的URL变量
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ 缺少必要的环境变量:', missingVars.join(', '));
    process.exit(1);
  }

  // 验证JWT密钥强度
  const minKeyLength = 32;
  if (process.env.JWT_ACCESS_SECRET.length < minKeyLength) {
    console.error(`❌ JWT_ACCESS_SECRET 长度过短，至少需要 ${minKeyLength} 个字符`);
    process.exit(1);
  }
  
  if (process.env.JWT_REFRESH_SECRET.length < minKeyLength) {
    console.error(`❌ JWT_REFRESH_SECRET 长度过短，至少需要 ${minKeyLength} 个字符`);
    process.exit(1);
  }

  // 验证数据库URL格式
  if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.error('❌ DATABASE_URL 必须是有效的 PostgreSQL 连接字符串');
    process.exit(1);
  }

  console.log('✅ 环境变量验证通过');
};

/**
 * 安全头部配置
 */
export const securityHeaders = helmet({
  // 内容安全策略
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.runninghub.cn", "https://hk-api.runninghub.cn"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // 跨源嵌入器策略
  crossOriginEmbedderPolicy: false,
  
  // DNS预取控制
  dnsPrefetchControl: {
    allow: false
  },
  
  // 帧选项
  frameguard: {
    action: 'deny'
  },
  
  // 隐藏服务器信息
  hidePoweredBy: true,
  
  // HSTS (仅在HTTPS下启用)
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true
  } : false,
  
  // IE的X-Download-Options
  ieNoOpen: true,
  
  // 禁用客户端缓存
  noSniff: true,
  
  // 来源策略
  originAgentCluster: true,
  
  // 权限策略
  permittedCrossDomainPolicies: false,
  
  // 推荐人策略
  referrerPolicy: {
    policy: ['no-referrer']
  },
  
  // XSS过滤器
  xssFilter: true,
});

/**
 * 请求日志中间件
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  // 记录请求开始
  const requestId = Math.random().toString(36).substring(2, 15);
  req.requestId = requestId;
  
  // 获取真实IP（考虑代理）
  const getRealIP = (req) => {
    return req.get('CF-Connecting-IP') || // Cloudflare
           req.get('X-Real-IP') || // Nginx
           req.get('X-Forwarded-For')?.split(',')[0]?.trim() || // 标准代理头
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip;
  };
  
  const realIP = getRealIP(req);
  
  // 重写response.send方法以记录响应
  res.send = function(data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // 记录请求日志
    console.log(`[${requestId}] ${req.method} ${req.path} - ${statusCode} - ${duration}ms - ${realIP} - ${req.get('User-Agent') || 'Unknown'}`);
    
    // 记录错误响应的详细信息
    if (statusCode >= 400) {
      console.warn(`[${requestId}] 错误响应:`, {
        method: req.method,
        path: req.path,
        status: statusCode,
        ip: realIP,
        userAgent: req.get('User-Agent'),
        body: req.body ? JSON.stringify(req.body).substring(0, 200) : null,
        query: Object.keys(req.query).length > 0 ? req.query : null
      });
    }
    
    // 调用原始send方法
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * 安全检查中间件
 */
export const securityCheck = (req, res, next) => {
  const suspiciousPatterns = [
    // SQL注入尝试
    /(\b(union|select|insert|delete|update|drop|create|alter|exec|execute)\b)/gi,
    // XSS尝试
    /(<script|javascript:|vbscript:|onload|onerror|onclick)/gi,
    // 路径遍历尝试
    /(\.\.\/|\.\.\\)/g,
    // 命令注入尝试
    /(\||;|&|`|\$\()/g
  ];
  
  const checkForSuspiciousContent = (obj, path = '') => {
    if (typeof obj === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(obj)) {
          console.warn(`[安全检查] 检测到可疑内容 - IP: ${req.ip}, 路径: ${path}, 内容: ${obj.substring(0, 100)}`);
          return true;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (checkForSuspiciousContent(value, `${path}.${key}`)) {
          return true;
        }
      }
    }
    return false;
  };
  
  // 检查请求体
  if (req.body && checkForSuspiciousContent(req.body, 'body')) {
    return res.status(400).json({ 
      success: false, 
      error: '请求包含非法内容' 
    });
  }
  
  // 检查查询参数
  if (req.query && checkForSuspiciousContent(req.query, 'query')) {
    return res.status(400).json({ 
      success: false, 
      error: '请求参数包含非法内容' 
    });
  }
  
  // 检查路径参数
  if (req.params && checkForSuspiciousContent(req.params, 'params')) {
    return res.status(400).json({ 
      success: false, 
      error: '请求路径包含非法内容' 
    });
  }
  
  next();
};

/**
 * 错误处理中间件
 */
export const errorHandler = async (err, req, res, next) => {
  // 记录错误日志
  console.error(`[${req.requestId || 'unknown'}] 服务器错误:`, {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body ? JSON.stringify(req.body).substring(0, 200) : null
  });

  // Record production error for monitoring and alerting
  try {
    const { default: productionAlertingService } = await import('../services/productionAlertingService.js');
    await productionAlertingService.recordError(err, {
      userId: req.user?.id,
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      body: req.body ? JSON.stringify(req.body).substring(0, 200) : null
    });
  } catch (alertingError) {
    console.warn('[Production Alerting] Failed to record error:', alertingError.message);
  }
  
  // 防止错误信息泄露
  if (process.env.NODE_ENV === 'production') {
    // 生产环境下不暴露具体错误信息
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        error: '输入数据验证失败' 
      });
    }
    
    if (err.name === 'UnauthorizedError' || err.message.includes('jwt')) {
      return res.status(401).json({ 
        success: false, 
        error: '认证失败' 
      });
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        success: false, 
        error: '上传文件过大' 
      });
    }
    
    // 默认错误响应
    return res.status(500).json({ 
      success: false, 
      error: '服务器内部错误' 
    });
  } else {
    // 开发环境下返回详细错误信息
    return res.status(500).json({ 
      success: false, 
      error: err.message,
      stack: err.stack
    });
  }
};

/**
 * 404处理中间件
 */
export const notFoundHandler = (req, res) => {
  console.warn(`[404] 未找到资源 - IP: ${req.ip}, 路径: ${req.method} ${req.path}`);
  res.status(404).json({ 
    success: false, 
    error: '请求的资源不存在' 
  });
};

/**
 * CORS预检请求优化
 */
export const corsPreflightHandler = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    // 预检请求：必须返回完整的CORS响应头，否则浏览器会判定为失败
    const origin = req.get('Origin');

    // 与 index.js 中保持一致的允许来源列表（支持通配符）
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://cosnap.vercel.app',
      'https://cosnap-*.vercel.app'
    ];

    const isAllowed = !origin || allowedOrigins.some((allowed) => {
      if (allowed.includes('*')) {
        const pattern = allowed
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowed === origin;
    });

    if (!isAllowed) {
      return res.status(403).send('CORS Not Allowed');
    }

    // 设置必要的CORS响应头
    res.header('Access-Control-Allow-Origin', origin || '*');
    if (origin) {
      res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      req.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Requested-With'
    );
    res.header('Access-Control-Max-Age', '86400'); // 24小时缓存
    return res.status(204).send();
  } else {
    next();
  }
};

/**
 * 请求大小限制中间件
 */
export const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 52428800; // 50MB
  
  if (contentLength > maxSize) {
    console.warn(`[请求过大] IP: ${req.ip}, 大小: ${contentLength} bytes, 路径: ${req.path}`);
    return res.status(413).json({ 
      success: false, 
      error: '请求内容过大' 
    });
  }
  
  next();
};

/**
 * 健康检查中间件（跳过所有安全检查）
 */
export const healthCheckBypass = (req, res, next) => {
  if (req.path === '/health' || req.path === '/health/db') {
    // 健康检查端点跳过安全检查
    req.skipSecurityCheck = true;
  }
  next();
};

/**
 * 生产环境安全配置验证
 */
export const validateProductionSecurity = () => {
  if (process.env.NODE_ENV === 'production') {
    const securityChecks = [
      {
        name: 'HTTPS强制',
        check: () => process.env.FORCE_HTTPS === 'true',
        required: true
      },
      {
        name: 'Cookie安全设置',
        check: () => process.env.SECURE_COOKIES === 'true',
        required: true
      },
      {
        name: '调试模式关闭',
        check: () => process.env.DEBUG !== 'true',
        required: true
      },
      {
        name: '错误详情隐藏',
        check: () => process.env.HIDE_ERROR_DETAILS === 'true',
        required: true
      }
    ];
    
    const failedChecks = securityChecks
      .filter(check => check.required && !check.check())
      .map(check => check.name);
    
    if (failedChecks.length > 0) {
      console.error('❌ 生产环境安全检查失败:', failedChecks.join(', '));
      console.error('请在环境变量中设置相应的安全配置');
      process.exit(1);
    }
    
    console.log('✅ 生产环境安全配置验证通过');
  }
};
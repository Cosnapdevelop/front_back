import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 增强的JWT认证中间件
 */
export function auth(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    
    if (!token) {
      console.warn(`[认证失败] 缺少令牌 - IP: ${req.ip}, 路径: ${req.method} ${req.path}, UA: ${req.get('User-Agent')}`);
      return res.status(401).json({ 
        success: false, 
        error: '未授权：缺少认证令牌' 
      });
    }
    
    // 验证JWT密钥存在
    if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
      console.error('[安全错误] JWT密钥未配置或强度不足');
      return res.status(500).json({ 
        success: false, 
        error: '服务器配置错误' 
      });
    }
    
    // 验证JWT令牌
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISSUER || 'cosnap-api',
      audience: process.env.JWT_AUDIENCE || 'cosnap-app',
      clockTolerance: 30
    });
    
    // 验证令牌结构
    if (!payload.sub || !payload.email) {
      console.warn(`[认证失败] 令牌格式无效 - IP: ${req.ip}, payload: ${JSON.stringify(payload)}`);
      return res.status(401).json({ 
        success: false, 
        error: '无效的认证令牌格式' 
      });
    }
    
    // 设置用户信息
    req.user = { 
      id: payload.sub, 
      email: payload.email, 
      username: payload.username 
    };
    
    // 记录成功的认证（仅在调试模式下）
    if (process.env.DEBUG_AUTH === 'true') {
      console.log(`[认证成功] 用户: ${payload.username} (${payload.sub}) - IP: ${req.ip}, 路径: ${req.method} ${req.path}`);
    }
    
    next();
  } catch (error) {
    // 详细的错误日志
    const errorInfo = {
      name: error.name,
      message: error.message,
      ip: req.ip,
      path: `${req.method} ${req.path}`,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    console.warn(`[认证失败] JWT验证错误:`, errorInfo);
    
    // 根据错误类型返回不同的响应
    let errorMessage = '认证失败';
    
    if (error.name === 'TokenExpiredError') {
      errorMessage = '认证令牌已过期';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = '无效的认证令牌';
    } else if (error.name === 'NotBeforeError') {
      errorMessage = '认证令牌尚未生效';
    }
    
    return res.status(401).json({ 
      success: false, 
      error: errorMessage 
    });
  }
}

/**
 * 可选认证中间件 - 如果有令牌则验证，没有则跳过
 */
export function optionalAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  if (!token) {
    // 没有令牌，继续处理（匿名用户）
    req.user = null;
    return next();
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { 
      id: payload.sub, 
      email: payload.email, 
      username: payload.username 
    };
    next();
  } catch (error) {
    // 令牌无效，但不阻止请求（作为匿名用户处理）
    console.warn(`[可选认证] 令牌无效但继续处理 - IP: ${req.ip}, 错误: ${error.message}`);
    req.user = null;
    next();
  }
}

/**
 * 用户状态验证中间件 - 确保用户账户仍然有效
 */
export async function validateUserStatus(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ 
        success: false, 
        error: '认证信息无效' 
      });
    }
    
    // 从数据库验证用户状态
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true, 
        email: true, 
        username: true,
        isActive: true,
        isBanned: true 
      }
    });
    
    if (!user) {
      console.warn(`[用户状态] 用户不存在 - ID: ${req.user.id}, IP: ${req.ip}`);
      return res.status(401).json({ 
        success: false, 
        error: '用户账户不存在' 
      });
    }
    
    if (user.isBanned) {
      console.warn(`[用户状态] 用户被封禁 - ID: ${req.user.id}, IP: ${req.ip}`);
      return res.status(403).json({ 
        success: false, 
        error: '账户已被封禁' 
      });
    }
    
    if (!user.isActive) {
      console.warn(`[用户状态] 用户账户未激活 - ID: ${req.user.id}, IP: ${req.ip}`);
      return res.status(403).json({ 
        success: false, 
        error: '账户未激活' 
      });
    }
    
    // 更新用户信息（可能数据库中的信息更新了）
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username
    };
    
    next();
  } catch (error) {
    console.error(`[用户状态验证] 数据库错误:`, error);
    return res.status(500).json({ 
      success: false, 
      error: '用户状态验证失败' 
    });
  }
}

/**
 * 管理员权限验证中间件
 */
export async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ 
        success: false, 
        error: '需要认证' 
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isAdmin: true }
    });
    
    if (!user?.isAdmin) {
      console.warn(`[权限检查] 非管理员尝试访问管理功能 - 用户: ${req.user.id}, IP: ${req.ip}, 路径: ${req.path}`);
      return res.status(403).json({ 
        success: false, 
        error: '需要管理员权限' 
      });
    }
    
    next();
  } catch (error) {
    console.error(`[管理员权限验证] 错误:`, error);
    return res.status(500).json({ 
      success: false, 
      error: '权限验证失败' 
    });
  }
}

/**
 * API密钥认证中间件 - 用于外部API调用
 */
export function apiKeyAuth(req, res, next) {
  const apiKey = req.get('X-API-Key') || req.query.apiKey;
  
  if (!apiKey) {
    console.warn(`[API密钥] 缺少API密钥 - IP: ${req.ip}, 路径: ${req.method} ${req.path}`);
    return res.status(401).json({ 
      success: false, 
      error: '缺少API密钥' 
    });
  }
  
  // 验证API密钥格式（这里应该根据实际需求验证）
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    console.warn(`[API密钥] 无效的API密钥 - IP: ${req.ip}, Key: ${apiKey.substring(0, 10)}...`);
    return res.status(401).json({ 
      success: false, 
      error: '无效的API密钥' 
    });
  }
  
  next();
}

/**
 * 令牌刷新检查中间件
 */
export function checkTokenExpiry(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    
    if (token) {
      const payload = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;
      
      // 如果令牌在5分钟内过期，添加刷新提示头
      if (expiresIn > 0 && expiresIn < 300) {
        res.set('X-Token-Refresh-Needed', 'true');
        res.set('X-Token-Expires-In', expiresIn.toString());
      }
    }
    
    next();
  } catch (error) {
    // 解析失败不影响正常流程
    next();
  }
}



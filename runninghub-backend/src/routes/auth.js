import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult, query } from 'express-validator';
import crypto from 'crypto';
import { 
  authLimiter, 
  loginLimiter, 
  registerLimiter, 
  sensitiveOperationLimiter,
  passwordResetLimiter 
} from '../middleware/rateLimiting.js';
import { 
  authValidation,
  sanitizeInput 
} from '../middleware/validation.js';
import { auth, checkTokenExpiry } from '../middleware/auth.js';
import { isEmailEnabled, sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import prismaClient from '../config/prisma.js';

const router = express.Router();
const prisma = prismaClient;

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_DAYS = 30; // days

// ========== 验证码系统配置和错误类型 ==========
const VERIFICATION_CODE_EXPIRY_SECONDS = 300; // 5分钟有效期
const VERIFICATION_CODE_SEND_COOLDOWN = 60; // 发送间隔60秒

// 验证码错误类型枚举
const VerificationCodeError = {
  INVALID_CODE: 'INVALID_CODE',
  EXPIRED_CODE: 'EXPIRED_CODE', 
  ALREADY_USED: 'ALREADY_USED',
  CODE_NOT_FOUND: 'CODE_NOT_FOUND'
};

// 验证码错误消息映射
const VerificationCodeMessages = {
  [VerificationCodeError.INVALID_CODE]: '输入的验证码不正确',
  [VerificationCodeError.EXPIRED_CODE]: '验证码已过期，请重新获取',
  [VerificationCodeError.ALREADY_USED]: '验证码已使用过，请重新获取',
  [VerificationCodeError.CODE_NOT_FOUND]: '验证码不存在，请重新获取'
};

/**
 * 验证验证码的辅助函数
 * @param {string} email - 邮箱地址
 * @param {string} scene - 场景类型
 * @param {string} code - 验证码
 * @returns {Promise<{isValid: boolean, error?: string, errorCode?: string, verificationRecord?: Object}>}
 */
async function validateVerificationCode(email, scene, code) {
  const now = new Date();
  
  // 查找验证码记录
  const verificationRecord = await prisma.verificationCode.findFirst({
    where: {
      email,
      scene,
      code
    },
    orderBy: { createdAt: 'desc' }
  });

  // 验证码不存在
  if (!verificationRecord) {
    return {
      isValid: false,
      error: VerificationCodeMessages[VerificationCodeError.CODE_NOT_FOUND],
      errorCode: VerificationCodeError.CODE_NOT_FOUND
    };
  }

  // 验证码已被使用
  if (verificationRecord.usedAt) {
    return {
      isValid: false,
      error: VerificationCodeMessages[VerificationCodeError.ALREADY_USED],
      errorCode: VerificationCodeError.ALREADY_USED
    };
  }

  // 验证码已过期
  if (verificationRecord.expiresAt <= now) {
    return {
      isValid: false,
      error: VerificationCodeMessages[VerificationCodeError.EXPIRED_CODE],
      errorCode: VerificationCodeError.EXPIRED_CODE
    };
  }

  // 验证码有效
  return {
    isValid: true,
    verificationRecord
  };
}

/**
 * 标记验证码为已使用
 * @param {number} verificationId - 验证码记录ID
 */
async function markVerificationCodeAsUsed(verificationId) {
  await prisma.verificationCode.update({
    where: { id: verificationId },
    data: { usedAt: new Date() }
  });
}

/**
 * 使旧验证码失效（发送新验证码时调用）
 * @param {string} email - 邮箱地址
 * @param {string} scene - 场景类型
 */
async function invalidateOldVerificationCodes(email, scene) {
  const now = new Date();
  await prisma.verificationCode.updateMany({
    where: {
      email,
      scene,
      usedAt: null,
      expiresAt: { gt: now } // 只处理未过期且未使用的验证码
    },
    data: {
      usedAt: now // 标记为已使用，实现失效
    }
  });
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    process.env.JWT_ACCESS_SECRET,
    { 
      expiresIn: ACCESS_EXPIRES,
      issuer: process.env.JWT_ISSUER || 'cosnap-api',
      audience: process.env.JWT_AUDIENCE || 'cosnap-app'
    }
  );
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

router.post(
  '/register',
  registerLimiter,
  sanitizeInput,
  ...authValidation.register,
  async (req, res) => {
    try {
      let { email, username, password, code, scene } = req.body;
      // 标准化：用户名不区分大小写 -> 统一小写；邮箱保留大小写，仅去空格
      email = (email || '').trim();
      username = (username || '').trim().toLowerCase();
      scene = scene || 'register';
      
      // 检查用户是否已存在（分别检查邮箱与用户名），用于更明确的冲突提示
      const [emailExists, usernameExists] = await Promise.all([
        prisma.user.findUnique({ where: { email } }),
        prisma.user.findUnique({ where: { username } })
      ]);
      if (emailExists || usernameExists) {
        const details = { emailExists: !!emailExists, usernameExists: !!usernameExists };
        const errorMsg = emailExists ? '邮箱已存在' : '用户名已存在';
        console.warn(`[注册失败] 冲突 - Email: ${email}(${details.emailExists}), Username: ${username}(${details.usernameExists}), IP: ${req.ip}`);
        return res.status(409).json({ success: false, error: errorMsg, details });
      }

      // 若提供验证码，则校验
      if (code) {
        const validation = await validateVerificationCode(email, scene, code);
        if (!validation.isValid) {
          console.warn(`[注册验证码校验失败] Email: ${email}, Scene: ${scene}, 错误: ${validation.errorCode}, IP: ${req.ip}`);
          return res.status(400).json({ 
            success: false, 
            error: validation.error,
            errorCode: validation.errorCode
          });
        }
        // 标记验证码为已使用
        await markVerificationCodeAsUsed(validation.verificationRecord.id);
      }

      // 密码强度验证（已在validation.js中处理）
      const passwordHash = await bcrypt.hash(password, 12); // 增加到12轮
      
      const user = await prisma.user.create({ 
        data: { 
          email, 
          username, 
          passwordHash,
          // createdAt 由数据库默认值生成
        } 
      });
      
      const accessToken = signAccessToken(user);
      const refreshToken = jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: `${REFRESH_EXPIRES_DAYS}d`,
      });
      
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: addDays(new Date(), REFRESH_EXPIRES_DAYS),
        },
      });

      console.log(`[注册成功] 新用户注册 - ID: ${user.id}, Username: ${username}, Email: ${email}, IP: ${req.ip}`);
      
      return res.status(201).json({ 
        success: true, 
        accessToken, 
        refreshToken, 
        user: { 
          id: user.id, 
          email, 
          username 
        } 
      });
    } catch (error) {
      console.error(`[注册错误] IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({ 
        success: false, 
        error: '注册失败，请稍后重试' 
      });
    }
  }
);

// 可用性检查：GET /auth/check-availability?email=...&username=...
router.get(
  '/check-availability',
  [
    query('email').optional().isEmail().withMessage('email格式不正确'),
    query('username').optional().isLength({ min: 3, max: 50 }).custom((value) => {
      // Allow alphanumeric, underscore, hyphen, period, and @ symbol for email-as-username
      if (!/^[a-zA-Z0-9_.-@]+$/.test(value)) {
        throw new Error('用户名只能包含字母、数字、下划线、连字符、句点和@符号');
      }
      return true;
    }),
    (req, res, next) => {
      const result = validationResult(req);
      if (!result.isEmpty()) {
        return res.status(400).json({ success: false, error: '参数无效', details: result.array() });
      }
      next();
    }
  ],
  async (req, res) => {
    try {
      const emailRaw = req.query.email ? String(req.query.email) : undefined;
      const usernameRaw = req.query.username ? String(req.query.username) : undefined;
      const email = emailRaw?.trim();
      const username = usernameRaw?.trim().toLowerCase();

      const [emailUser, usernameUser] = await Promise.all([
        email ? prisma.user.findUnique({ where: { email } }) : Promise.resolve(null),
        username ? prisma.user.findUnique({ where: { username } }) : Promise.resolve(null)
      ]);

      return res.json({
        success: true,
        emailAvailable: email ? !emailUser : undefined,
        usernameAvailable: username ? !usernameUser : undefined
      });
    } catch (error) {
      console.error(`[可用性检查错误] IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({ success: false, error: '服务器错误' });
    }
  }
);

// 发送邮箱验证码
router.post(
  '/send-code',
  authLimiter,
  sanitizeInput,
  ...authValidation.sendCode,
  async (req, res) => {
    try {
      const emailRaw = String(req.body.email || '');
      const scene = (req.body.scene || 'register').trim();
      const email = emailRaw.trim().toLowerCase();

      // 对于邮箱更改场景，需要额外的权限验证
      if (scene === 'change_email') {
        // 获取并验证认证令牌（可选的认证检查，因为这是发送验证码）
        const authHeader = req.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ 
            success: false, 
            error: '邮箱更改需要先登录' 
          });
        }

        try {
          const token = authHeader.substring(7);
          const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
          req.user = payload; // 临时设置用户信息用于后续检查
        } catch (error) {
          return res.status(401).json({ 
            success: false, 
            error: '登录状态已过期，请重新登录' 
          });
        }

        // 检查新邮箱是否已被其他用户使用
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser && existingUser.id !== req.user.sub) {
          return res.status(409).json({
            success: false,
            error: '该邮箱已被其他用户使用'
          });
        }

        // 简化邮箱更改流程：仅验证新邮箱（符合业界最佳实践）
        // 防止用户将邮箱改为相同邮箱
        if (email === req.user.email) {
          return res.status(400).json({
            success: false,
            error: '新邮箱不能与当前邮箱相同'
          });
        }
      }

      // 检查是否在冷却时间内已发送过验证码（防止频繁发送）
      const now = new Date();
      const recentCode = await prisma.verificationCode.findFirst({
        where: {
          email,
          scene,
          createdAt: { gt: new Date(now.getTime() - VERIFICATION_CODE_SEND_COOLDOWN * 1000) }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (recentCode) {
        const remainingTime = Math.ceil((recentCode.createdAt.getTime() + VERIFICATION_CODE_SEND_COOLDOWN * 1000 - now.getTime()) / 1000);
        return res.status(429).json({
          success: false,
          error: `请等待 ${remainingTime} 秒后再次发送验证码`,
          remainingTime
        });
      }

      // 使之前的验证码失效
      await invalidateOldVerificationCodes(email, scene);

      // 生成6位数字验证码
      const code = ('' + Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_SECONDS * 1000); // 5分钟有效期

      await prisma.verificationCode.create({
        data: { email, code, scene, expiresAt }
      });

      if (await isEmailEnabled()) {
        try {
          await sendVerificationEmail(email, code, scene);
          console.log(`[Email] 验证码邮件发送成功 - email=${email}, scene=${scene}`);
        } catch (e) {
          console.error('[Email] 发送失败，降级为日志输出:', {
            error: e?.message,
            code: e?.code,
            command: e?.command,
            response: e?.response,
            email: email,
            scene: scene
          });
          
          // Provide specific error guidance in logs
          if (e?.message?.includes('534-5.7.9')) {
            console.error('[Email] Gmail认证错误 - 可能使用了常规密码而非App密码。请检查GMAIL_SMTP_SETUP.md文件获取解决方案。');
          } else if (e?.message?.includes('535-5.7.8')) {
            console.error('[Email] SMTP用户名或密码错误 - 请检查SMTP_USER和SMTP_PASS环境变量');
          } else if (e?.message?.includes('ENOTFOUND') || e?.message?.includes('ECONNREFUSED')) {
            console.error('[Email] 网络连接错误 - 请检查网络连接和防火墙设置');
          }
          
          console.log(`[验证码] 邮件发送失败，仅日志记录 - email=${email}, scene=${scene}, code=${code}, expiresAt=${expiresAt.toISOString()}`);
        }
      } else {
        // 未配置SMTP，降级日志输出
        console.log(`[验证码] SMTP未配置，仅日志记录 - email=${email}, scene=${scene}, code=${code}, expiresAt=${expiresAt.toISOString()}`);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error(`[发送验证码失败] IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({ success: false, error: '发送验证码失败' });
    }
  }
);

router.post(
  '/login',
  loginLimiter,
  sanitizeInput,
  ...authValidation.login,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // 查找用户（支持邮箱或用户名登录）
      const identifier = String(email || '').trim();
      const isEmail = identifier.includes('@');
      const user = await prisma.user.findFirst({
        where: isEmail
          ? { email: identifier }
          : { username: identifier.toLowerCase() }
      });
      
      if (!user) {
        console.warn(`[登录失败] 用户不存在 - 输入: ${email}, IP: ${req.ip}, UA: ${req.get('User-Agent')}`);
        return res.status(401).json({ 
          success: false, 
          error: '账号或密码错误' 
        });
      }
      
      // 检查账户状态
      if (user.isBanned) {
        console.warn(`[登录失败] 账户被封禁 - 用户: ${user.username} (${user.id}), IP: ${req.ip}`);
        return res.status(403).json({ 
          success: false, 
          error: '账户已被封禁' 
        });
      }
      
      if (!user.isActive) {
        console.warn(`[登录失败] 账户未激活 - 用户: ${user.username} (${user.id}), IP: ${req.ip}`);
        return res.status(403).json({ 
          success: false, 
          error: '账户未激活' 
        });
      }
      
      // 验证密码
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        console.warn(`[登录失败] 密码错误 - 用户: ${user.username} (${user.id}), IP: ${req.ip}`);
        return res.status(401).json({ 
          success: false, 
          error: '账号或密码错误' 
        });
      }

      // 特殊处理：自动升级测试账号
      if (user.email === 'terrylzr123@gmail.com' && user.subscriptionTier !== 'VIP') {
        console.log(`🎯 自动升级测试账号 ${user.email} 为VIP`);
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            lastLoginAt: new Date(),
            subscriptionTier: 'VIP',
            subscriptionStatus: 'ACTIVE',
            subscriptionStart: new Date(),
            subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            monthlyUsage: 0,
            usageResetDate: new Date(),
            isTestAccount: true
          }
        });
        console.log(`✅ ${user.email} 已升级为VIP测试账号！`);
      } else {
        // Update last login time
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });
      }

      const accessToken = signAccessToken(user);
      const refreshToken = jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: `${REFRESH_EXPIRES_DAYS}d`,
      });
      
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: addDays(new Date(), REFRESH_EXPIRES_DAYS),
        },
      });

      console.log(`[登录成功] 用户: ${user.username} (${user.id}), IP: ${req.ip}`);
      
      return res.json({ 
        success: true, 
        accessToken, 
        refreshToken, 
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username 
        } 
      });
    } catch (error) {
      console.error(`[登录错误] IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({ 
        success: false, 
        error: '登录失败，请稍后重试' 
      });
    }
  }
);

router.post(
  '/refresh',
  authLimiter,
  sanitizeInput,
  ...authValidation.refresh,
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      // 查找存储的刷新令牌
      const stored = await prisma.refreshToken.findUnique({ 
        where: { token: refreshToken },
        include: { user: true }
      });
      
      if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
        console.warn(`[刷新令牌] 令牌无效或已过期 - IP: ${req.ip}, Token: ${refreshToken.substring(0, 20)}...`);
        return res.status(401).json({ 
          success: false, 
          error: '刷新令牌无效或已过期' 
        });
      }
      
      // 验证JWT签名
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      if (!stored.user) {
        console.warn(`[刷新令牌] 关联用户不存在 - Token: ${refreshToken.substring(0, 20)}..., UserID: ${payload.sub}`);
        return res.status(401).json({ 
          success: false, 
          error: '用户不存在' 
        });
      }
      
      // 检查用户状态
      if (stored.user.isBanned) {
        console.warn(`[刷新令牌] 用户被封禁 - ID: ${stored.user.id}, IP: ${req.ip}`);
        // 撤销令牌
        await prisma.refreshToken.update({
          where: { token: refreshToken },
          data: { isRevoked: true }
        });
        return res.status(403).json({ 
          success: false, 
          error: '账户已被封禁' 
        });
      }
      
      if (!stored.user.isActive) {
        console.warn(`[刷新令牌] 账户未激活 - ID: ${stored.user.id}, IP: ${req.ip}`);
        return res.status(403).json({ 
          success: false, 
          error: '账户未激活' 
        });
      }
      
      const accessToken = signAccessToken(stored.user);
      
      console.log(`[刷新令牌] 成功刷新 - 用户: ${stored.user.username} (${stored.user.id}), IP: ${req.ip}`);
      
      return res.json({ 
        success: true, 
        accessToken,
        user: {
          id: stored.user.id,
          email: stored.user.email,
          username: stored.user.username
        }
      });
    } catch (error) {
      console.warn(`[刷新令牌] JWT验证失败 - IP: ${req.ip}, 错误: ${error.message}`);
      return res.status(401).json({ 
        success: false, 
        error: '刷新令牌校验失败' 
      });
    }
  }
);

router.post(
  '/logout',
  authLimiter,
  sanitizeInput,
  ...authValidation.refresh, // 复用refresh token验证
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      // 撤销刷新令牌
      await prisma.refreshToken.update({ 
        where: { token: refreshToken }, 
        data: { 
          isRevoked: true,
          revokedAt: new Date() 
        } 
      }).catch((error) => {
        // 令牌可能不存在，记录但不阻止登出
        console.warn(`[登出] 撤销令牌失败 - IP: ${req.ip}, 错误: ${error.message}`);
      });
      
      console.log(`[登出成功] IP: ${req.ip}, Token: ${refreshToken.substring(0, 20)}...`);
      
      return res.json({ 
        success: true,
        message: '已成功登出' 
      });
    } catch (error) {
      console.error(`[登出错误] IP: ${req.ip}, 错误:`, error);
      // 即使出错也返回成功，避免客户端状态不一致
      return res.json({ 
        success: true,
        message: '登出完成' 
      });
    }
  }
);

// 获取当前用户信息
router.get(
  '/me',
  authLimiter,
  auth,
  checkTokenExpiry,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ 
        where: { id: req.user.id }, 
        select: { 
          id: true, 
          email: true, 
          username: true, 
          avatar: true, 
          bio: true,
          isActive: true,
          isBanned: true,
          createdAt: true,
          lastLoginAt: true
        } 
      });
      
      if (!user) {
        console.warn(`[用户信息] 用户不存在 - ID: ${req.user.id}, IP: ${req.ip}`);
        return res.status(404).json({ 
          success: false, 
          error: '用户不存在' 
        });
      }
      
      return res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          bio: user.bio,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      });
    } catch (error) {
      console.error(`[用户信息] 获取失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({ 
        success: false, 
        error: '获取用户信息失败' 
      });
    }
  }
);

// 更换头像
router.put(
  '/me/avatar',
  sensitiveOperationLimiter,
  sanitizeInput,
  auth,
  body('avatar')
    .isURL()
    .withMessage('头像必须是有效的URL地址')
    .isLength({ max: 500 })
    .withMessage('头像URL过长'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }
      
      const { avatar } = req.body;
      
      const user = await prisma.user.update({ 
        where: { id: req.user.id }, 
        data: { avatar },
        select: { 
          id: true, 
          email: true, 
          username: true, 
          avatar: true, 
          bio: true 
        } 
      });
      
      console.log(`[头像更新] 用户: ${req.user.username} (${req.user.id}), IP: ${req.ip}`);
      
      return res.json({ 
        success: true, 
        user,
        message: '头像更新成功'
      });
    } catch (error) {
      console.error(`[头像更新] 失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({ 
        success: false, 
        error: '头像更新失败' 
      });
    }
  }
);
// 更新用户信息
router.put(
  '/me',
  sensitiveOperationLimiter,
  sanitizeInput,
  auth,
  ...authValidation.updateProfile,
  async (req, res) => {
    try {
      const current = await prisma.user.findUnique({ 
        where: { id: req.user.id } 
      });
      
      if (!current) {
        return res.status(404).json({ 
          success: false, 
          error: '用户不存在' 
        });
      }

      const { username, email, bio, avatar } = req.body || {};
      const data = {};
      const changes = [];

      // 唯一性校验（仅当实际修改时）
      if (typeof username === 'string' && username !== current.username) {
        const exists = await prisma.user.findFirst({ where: { username } });
        if (exists) {
          console.warn(`[用户更新] 用户名冲突 - 尝试: ${username}, 用户: ${req.user.id}, IP: ${req.ip}`);
          return res.status(409).json({ 
            success: false, 
            error: '用户名已被占用' 
          });
        }
        data.username = username;
        changes.push(`用户名: ${current.username} -> ${username}`);
      }
      
      if (typeof email === 'string' && email !== current.email) {
        const exists = await prisma.user.findFirst({ where: { email } });
        if (exists) {
          console.warn(`[用户更新] 邮箱冲突 - 尝试: ${email}, 用户: ${req.user.id}, IP: ${req.ip}`);
          return res.status(409).json({ 
            success: false, 
            error: '邮箱已被使用' 
          });
        }
        data.email = email;
        changes.push(`邮箱: ${current.email} -> ${email}`);
      }
      
      if (typeof bio === 'string' && bio !== current.bio) {
        data.bio = bio;
        changes.push(`个人简介已更新`);
      }
      
      if (typeof avatar === 'string' && avatar !== current.avatar) {
        data.avatar = avatar;
        changes.push(`头像已更新`);
      }

      // 如果没有任何变更，直接返回当前信息
      if (Object.keys(data).length === 0) {
        return res.json({ 
          success: true, 
          user: { 
            id: current.id, 
            email: current.email, 
            username: current.username, 
            avatar: current.avatar, 
            bio: current.bio 
          },
          message: '没有需要更新的内容'
        });
      }

      const user = await prisma.user.update({ 
        where: { id: req.user.id }, 
        data, 
        select: { 
          id: true, 
          email: true, 
          username: true, 
          avatar: true, 
          bio: true 
        } 
      });
      
      console.log(`[用户更新] 成功 - 用户: ${req.user.username} (${req.user.id}), IP: ${req.ip}, 变更: [${changes.join(', ')}]`);
      
      return res.json({ 
        success: true, 
        user,
        message: '用户信息更新成功'
      });
    } catch (error) {
      console.error(`[用户更新] 失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({ 
        success: false, 
        error: '用户信息更新失败' 
      });
    }
  }
);

// Account deletion endpoint
router.delete(
  '/me/account',
  sensitiveOperationLimiter,
  sanitizeInput,
  auth,
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 6 })
    .withMessage('密码至少6位'),
  body('confirmationText')
    .equals('DELETE MY ACCOUNT')
    .withMessage('确认文本必须为 "DELETE MY ACCOUNT"'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确'),
  body('code')
    .optional()
    .isLength({ min: 6, max: 6 })
    .withMessage('验证码必须为6位'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          error: '输入验证失败',
          details: errors.array()
        });
      }

      const { password, confirmationText, email, code } = req.body;
      
      // Get current user
      const user = await prisma.user.findUnique({ 
        where: { id: req.user.id } 
      });
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: '用户不存在' 
        });
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        console.warn(`[账户删除] 密码错误 - 用户: ${user.username} (${user.id}), IP: ${req.ip}`);
        return res.status(401).json({ 
          success: false, 
          error: '密码错误' 
        });
      }

      // If email and code provided, verify the code
      if (email || code) {
        if (!email || !code) {
          return res.status(400).json({
            success: false,
            error: '邮箱和验证码都必须提供'
          });
        }

        // Verify email matches user's email
        if (email !== user.email) {
          return res.status(400).json({
            success: false,
            error: '邮箱与账户邮箱不匹配'
          });
        }

        // 验证邮箱验证码
        const validation = await validateVerificationCode(email, 'delete_account', code);
        if (!validation.isValid) {
          console.warn(`[账户删除验证码校验失败] Email: ${email}, 错误: ${validation.errorCode}, IP: ${req.ip}`);
          return res.status(400).json({ 
            success: false, 
            error: validation.error,
            errorCode: validation.errorCode
          });
        }

        // 标记验证码为已使用
        await markVerificationCodeAsUsed(validation.verificationRecord.id);
      }

      // Start comprehensive transaction for account deletion
      await prisma.$transaction(async (tx) => {
        // 1. Delete user's authentication data
        await tx.refreshToken.deleteMany({
          where: { userId: user.id }
        });

        await tx.verificationCode.deleteMany({
          where: { email: user.email }
        });

        // 2. Delete user's social interactions
        await tx.postLike.deleteMany({
          where: { userId: user.id }
        });

        await tx.commentLike.deleteMany({
          where: { userId: user.id }
        });

        // 3. Delete notifications where user is receiver or actor
        await tx.notification.deleteMany({
          where: { 
            OR: [
              { userId: user.id },
              { actorId: user.id }
            ]
          }
        });

        // 4. Handle user's comments (anonymize to preserve thread integrity)
        await tx.comment.updateMany({
          where: { userId: user.id },
          data: { 
            content: '[已删除的评论]',
            // Keep userId for referential integrity, will be anonymized with user
          }
        });

        // 5. Handle user's posts (anonymize to preserve community content)
        await tx.post.updateMany({
          where: { userId: user.id },
          data: { 
            caption: '[已删除的帖子]',
            images: [], // Remove images for privacy
            // Keep userId for referential integrity, will be anonymized with user
          }
        });

        // 6. Cancel active subscriptions and mark as user-cancelled
        await tx.subscription.updateMany({
          where: { 
            userId: user.id,
            status: 'ACTIVE'
          },
          data: { 
            status: 'CANCELLED',
            autoRenew: false,
            updatedAt: new Date()
          }
        });

        // 7. Anonymize payment records (keep for legal compliance but remove PII)
        await tx.payment.updateMany({
          where: { userId: user.id },
          data: {
            // Remove personally identifiable payment info
            openId: null,
            buyerId: null,
            // Keep transaction records for financial compliance
          }
        });

        // 8. Preserve usage history for analytics but anonymize user reference
        // (UsageHistory will reference anonymized user - no direct cleanup needed)

        // 9. Anonymize user record (preserve for referential integrity)
        await tx.user.update({
          where: { id: user.id },
          data: {
            email: `deleted_${user.id}_${Date.now()}@deleted.local`,
            username: `deleted_user_${user.id}_${Date.now()}`,
            passwordHash: 'DELETED_ACCOUNT',
            bio: null,
            avatar: null,
            // Remove all personal/billing information for GDPR compliance
            realName: null,
            phoneNumber: null,
            idCardNumber: null,
            billingAddress: null,
            // Reset subscription data
            subscriptionTier: 'FREE',
            subscriptionId: null,
            subscriptionStatus: 'INACTIVE',
            subscriptionStart: null,
            subscriptionEnd: null,
            monthlyUsage: 0,
            preferredPayment: null,
            // Mark as inactive and deleted
            isActive: false,
            isBanned: false
          }
        });
      }, {
        // Set transaction timeout to 30 seconds for large datasets
        timeout: 30000
      });

      console.log(`[账户删除] 成功删除账户 - 原用户: ${user.username} (${user.id}), IP: ${req.ip}`);
      
      return res.json({ 
        success: true,
        message: '账户已成功删除'
      });
    } catch (error) {
      console.error(`[账户删除] 失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      
      // Handle specific database constraint errors
      if (error.code === 'P2003') {
        console.error(`[账户删除] 外键约束错误 - 用户: ${req.user?.id}`, error.meta);
        return res.status(500).json({ 
          success: false, 
          error: '数据库关联约束错误，请联系技术支持' 
        });
      }
      
      // Handle transaction timeout
      if (error.message?.includes('timeout') || error.code === 'P2024') {
        console.error(`[账户删除] 事务超时 - 用户: ${req.user?.id}`);
        return res.status(500).json({ 
          success: false, 
          error: '账户删除操作超时，请稍后重试' 
        });
      }
      
      // Handle unique constraint violations (shouldn't happen but safety check)
      if (error.code === 'P2002') {
        console.error(`[账户删除] 唯一约束冲突 - 用户: ${req.user?.id}`, error.meta);
        // Retry with different timestamp
        try {
          const timestamp = Date.now() + Math.floor(Math.random() * 1000);
          await prisma.user.update({
            where: { id: req.user.id },
            data: {
              email: `deleted_${req.user.id}_${timestamp}@deleted.local`,
              username: `deleted_user_${req.user.id}_${timestamp}`,
            }
          });
          console.log(`[账户删除] 重试成功 - 用户: ${req.user.id}`);
          return res.json({ 
            success: true,
            message: '账户已成功删除'
          });
        } catch (retryError) {
          console.error(`[账户删除] 重试失败 - 用户: ${req.user?.id}`, retryError);
        }
      }
      
      return res.status(500).json({ 
        success: false, 
        error: '账户删除失败，请稍后重试' 
      });
    }
  }
);

// 邮箱更改端点 - 需要双重验证（当前邮箱+新邮箱）
router.post(
  '/change-email',
  sensitiveOperationLimiter,
  sanitizeInput,
  auth,
  ...authValidation.changeEmail,
  async (req, res) => {
    try {
      const { newEmail, newEmailCode, password } = req.body;
      const userId = req.user.sub;

      // 获取当前用户信息
      const currentUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          error: '用户不存在'
        });
      }

      // 1. 验证用户密码
      const passwordValid = await bcrypt.compare(password, currentUser.passwordHash);
      if (!passwordValid) {
        console.warn(`[邮箱更改] 密码错误 - 用户: ${currentUser.username} (${currentUser.id}), IP: ${req.ip}`);
        return res.status(401).json({
          success: false,
          error: '密码错误'
        });
      }

      // 2. 检查新邮箱是否已被其他用户使用
      const emailExists = await prisma.user.findUnique({ where: { email: newEmail } });
      if (emailExists && emailExists.id !== userId) {
        return res.status(409).json({
          success: false,
          error: '该邮箱已被其他用户使用'
        });
      }

      // 3. 防止设置相同邮箱
      if (newEmail === currentUser.email) {
        return res.status(400).json({
          success: false,
          error: '新邮箱不能与当前邮箱相同'
        });
      }

      const now = new Date();

      // 4. 验证新邮箱的验证码（简化流程：仅验证新邮箱）  
      const newEmailValidation = await validateVerificationCode(newEmail, 'change_email', newEmailCode);
      if (!newEmailValidation.isValid) {
        console.warn(`[邮箱更改-新邮箱验证码校验失败] Email: ${newEmail}, 错误: ${newEmailValidation.errorCode}, IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          error: `新邮箱${newEmailValidation.error}`,
          errorCode: newEmailValidation.errorCode
        });
      }

      // 5. 在事务中执行邮箱更改操作
      await prisma.$transaction(async (tx) => {
        // 标记新邮箱验证码为已使用
        await tx.verificationCode.update({
          where: { id: newEmailValidation.verificationRecord.id },
          data: { usedAt: new Date() }
        });

        // 更新用户邮箱
        await tx.user.update({
          where: { id: userId },
          data: { 
            email: newEmail,
            // 更新时间戳以便追踪变更历史
            // createdAt 保持不变，这是注册时间
          }
        });

        // 撤销所有现有的刷新令牌，强制用户重新登录
        // 这是一个安全措施，确保邮箱更改后需要重新认证
        await tx.refreshToken.updateMany({
          where: { userId: userId, isRevoked: false },
          data: { 
            isRevoked: true,
            revokedAt: new Date()
          }
        });
      });

      // 7. 记录安全日志
      console.log(`[邮箱更改] 成功 - 用户: ${currentUser.username} (${currentUser.id}), IP: ${req.ip}, 旧邮箱: ${currentUser.email}, 新邮箱: ${newEmail}`);

      // 8. 返回成功响应
      return res.json({
        success: true,
        message: '邮箱更改成功，请重新登录',
        user: {
          id: currentUser.id,
          username: currentUser.username,
          email: newEmail
        }
      });

    } catch (error) {
      console.error(`[邮箱更改] 失败 - 用户: ${req.user?.sub}, IP: ${req.ip}, 错误:`, error);

      // 处理特定的数据库约束错误
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return res.status(409).json({
          success: false,
          error: '邮箱已被其他用户使用'
        });
      }

      return res.status(500).json({
        success: false,
        error: '邮箱更改失败，请稍后重试'
      });
    }
  }
);

// ========== 密码重置功能 ==========

/**
 * 辅助函数：生成安全的重置令牌
 */
function generateResetToken(userId, email) {
  const payload = {
    userId: userId,
    email: email,
    type: 'password_reset',
    iat: Math.floor(Date.now() / 1000)
  };
  
  const token = jwt.sign(payload, process.env.JWT_RESET_SECRET, {
    expiresIn: '1h',
    issuer: process.env.JWT_ISSUER || 'cosnap-api',
    audience: process.env.JWT_AUDIENCE || 'cosnap-reset'
  });
  
  return token;
}

/**
 * 辅助函数：验证重置令牌
 */
function verifyResetToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_RESET_SECRET, {
      issuer: process.env.JWT_ISSUER || 'cosnap-api',
      audience: process.env.JWT_AUDIENCE || 'cosnap-reset'
    });
    
    if (payload.type !== 'password_reset') {
      throw new Error('Invalid token type');
    }
    
    return payload;
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

/**
 * 辅助函数：安全日志记录
 */
function logPasswordResetAttempt(type, details) {
  console.log(`[密码重置] ${type.toUpperCase()} - IP: ${details.ip}, 成功: ${details.success || false}, 邮箱: ${details.email || 'N/A'}`);
  
  if (!details.success && details.errorCode) {
    console.warn(`[密码重置] 错误详情 - 类型: ${details.errorCode}, IP: ${details.ip}`);
  }
}

// 1. 发起密码重置请求
router.post(
  '/forgot-password',
  passwordResetLimiter,
  sanitizeInput,
  ...authValidation.forgotPassword,
  async (req, res) => {
    const startTime = Date.now();
    const { email: rawEmail } = req.body;
    const email = rawEmail?.trim().toLowerCase(); // 标准化邮箱：去空格+转小写
    const clientIp = req.ip;
    const userAgent = req.get('User-Agent');

    try {
      // 查找用户（安全考虑：无论用户是否存在都返回相同响应）
      // 先尝试精确匹配，如果失败则使用不区分大小写的查找
      let user = await prisma.user.findUnique({ 
        where: { email },
        select: { 
          id: true, 
          email: true, 
          username: true,
          isActive: true,
          isBanned: true 
        }
      });

      // 如果精确匹配失败，尝试不区分大小写的查找
      if (!user) {
        user = await prisma.user.findFirst({
          where: { 
            email: {
              mode: 'insensitive',
              equals: email
            }
          },
          select: { 
            id: true, 
            email: true, 
            username: true,
            isActive: true,
            isBanned: true 
          }
        });
      }

      // 开发环境调试日志
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] 密码重置 - 邮箱查找: "${email}" (原始: "${rawEmail}"), 找到用户: ${!!user}`);
        if (user) {
          console.log(`[DEBUG] 用户状态: isActive=${user.isActive}, isBanned=${user.isBanned}`);
        }
      }

      // 安全策略：始终返回成功响应，不泄露用户是否存在
      const successResponse = {
        success: true,
        message: '如果该邮箱已注册，您将收到重置链接'
      };

      if (!user) {
        logPasswordResetAttempt('request', {
          ip: clientIp,
          email: email,
          success: false,
          errorCode: 'USER_NOT_FOUND'
        });
        // Debug logging for development (remove in production)
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[DEBUG] User lookup failed for email: "${email}" (original: "${rawEmail}")`);
        }
        return res.json(successResponse);
      }

      // 检查用户状态
      if (user.isBanned) {
        logPasswordResetAttempt('request', {
          ip: clientIp,
          email: email,
          success: false,
          errorCode: 'USER_BANNED'
        });
        return res.json(successResponse);
      }

      if (!user.isActive) {
        logPasswordResetAttempt('request', {
          ip: clientIp,
          email: email,
          success: false,
          errorCode: 'USER_INACTIVE'
        });
        return res.json(successResponse);
      }

      // 检查是否存在未过期的重置令牌（防止重复请求）
      const existingToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          usedAt: null
        },
        orderBy: { createdAt: 'desc' }
      });

      let token;
      if (existingToken) {
        // 使用现有未过期的令牌
        token = existingToken.token;
        console.log(`[密码重置] 重复使用现有令牌 - 用户: ${user.username} (${user.id}), IP: ${clientIp}`);
      } else {
        // 生成新的重置令牌
        token = generateResetToken(user.id, user.email);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期

        // 在数据库中存储令牌
        await prisma.passwordResetToken.create({
          data: {
            email: user.email,
            token: token,
            userId: user.id,
            expiresAt: expiresAt,
            ipAddress: clientIp,
            userAgent: userAgent
          }
        });

        console.log(`[密码重置] 新令牌已创建 - 用户: ${user.username} (${user.id}), IP: ${clientIp}`);
      }

      // 发送密码重置邮件
      if (await isEmailEnabled()) {
        try {
          const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
          await sendPasswordResetEmail(user.email, resetLink, user.username);
          
          logPasswordResetAttempt('request', {
            ip: clientIp,
            email: email,
            success: true
          });
        } catch (emailError) {
          console.error('[密码重置] 邮件发送失败:', emailError.message);
          // 不向客户端暴露邮件发送失败，但在日志中记录
          logPasswordResetAttempt('request', {
            ip: clientIp,
            email: email,
            success: false,
            errorCode: 'EMAIL_SEND_FAILED'
          });
        }
      } else {
        console.log(`[密码重置] 邮件未配置，令牌: ${token}`);
      }

      return res.json(successResponse);

    } catch (error) {
      console.error(`[密码重置] 请求处理失败 - IP: ${clientIp}, 错误:`, error);
      logPasswordResetAttempt('request', {
        ip: clientIp,
        email: email,
        success: false,
        errorCode: 'INTERNAL_ERROR'
      });

      return res.status(500).json({
        success: false,
        error: '服务器错误，请稍后重试'
      });
    }
  }
);

// 2. 验证重置令牌
router.get(
  '/reset-password/:token',
  authLimiter,
  ...authValidation.verifyResetToken,
  async (req, res) => {
    const { token } = req.params;
    const clientIp = req.ip;

    try {
      // 验证JWT令牌
      const payload = verifyResetToken(token);
      
      // 检查数据库中的令牌记录
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { 
          user: { 
            select: { 
              id: true, 
              email: true, 
              username: true, 
              isActive: true, 
              isBanned: true 
            } 
          } 
        }
      });

      if (!tokenRecord || tokenRecord.usedAt) {
        logPasswordResetAttempt('verify', {
          ip: clientIp,
          success: false,
          errorCode: tokenRecord ? 'TOKEN_USED' : 'TOKEN_NOT_FOUND'
        });
        return res.status(400).json({
          success: false,
          error: '重置链接无效或已使用'
        });
      }

      if (tokenRecord.expiresAt < new Date()) {
        logPasswordResetAttempt('verify', {
          ip: clientIp,
          success: false,
          errorCode: 'TOKEN_EXPIRED'
        });
        return res.status(400).json({
          success: false,
          error: '重置链接已过期'
        });
      }

      if (!tokenRecord.user || tokenRecord.user.isBanned || !tokenRecord.user.isActive) {
        logPasswordResetAttempt('verify', {
          ip: clientIp,
          email: tokenRecord.email,
          success: false,
          errorCode: 'USER_INVALID'
        });
        return res.status(400).json({
          success: false,
          error: '用户账户状态异常'
        });
      }

      logPasswordResetAttempt('verify', {
        ip: clientIp,
        email: tokenRecord.email,
        success: true
      });

      return res.json({
        success: true,
        email: tokenRecord.email
      });

    } catch (error) {
      console.error(`[密码重置] 令牌验证失败 - IP: ${clientIp}, 错误:`, error.message);
      logPasswordResetAttempt('verify', {
        ip: clientIp,
        success: false,
        errorCode: 'VERIFICATION_FAILED'
      });

      return res.status(400).json({
        success: false,
        error: '重置链接无效或已过期'
      });
    }
  }
);

// 3. 执行密码重置
router.post(
  '/reset-password',
  passwordResetLimiter,
  sanitizeInput,
  ...authValidation.resetPassword,
  async (req, res) => {
    const { token, password } = req.body;
    const clientIp = req.ip;
    const userAgent = req.get('User-Agent');

    try {
      // 验证JWT令牌
      const payload = verifyResetToken(token);
      
      // 获取数据库中的令牌记录
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { 
          user: { 
            select: { 
              id: true, 
              email: true, 
              username: true, 
              isActive: true, 
              isBanned: true,
              passwordHash: true 
            } 
          } 
        }
      });

      if (!tokenRecord || tokenRecord.usedAt) {
        logPasswordResetAttempt('reset', {
          ip: clientIp,
          success: false,
          errorCode: tokenRecord ? 'TOKEN_USED' : 'TOKEN_NOT_FOUND'
        });
        return res.status(400).json({
          success: false,
          error: '重置链接无效或已使用'
        });
      }

      if (tokenRecord.expiresAt < new Date()) {
        logPasswordResetAttempt('reset', {
          ip: clientIp,
          email: tokenRecord.email,
          success: false,
          errorCode: 'TOKEN_EXPIRED'
        });
        return res.status(400).json({
          success: false,
          error: '重置链接已过期'
        });
      }

      if (!tokenRecord.user || tokenRecord.user.isBanned || !tokenRecord.user.isActive) {
        logPasswordResetAttempt('reset', {
          ip: clientIp,
          email: tokenRecord.email,
          success: false,
          errorCode: 'USER_INVALID'
        });
        return res.status(400).json({
          success: false,
          error: '用户账户状态异常'
        });
      }

      // 检查新密码是否与当前密码相同
      const isSamePassword = await bcrypt.compare(password, tokenRecord.user.passwordHash);
      if (isSamePassword) {
        logPasswordResetAttempt('reset', {
          ip: clientIp,
          email: tokenRecord.email,
          success: false,
          errorCode: 'SAME_PASSWORD'
        });
        return res.status(400).json({
          success: false,
          error: '新密码不能与当前密码相同'
        });
      }

      // 在事务中执行密码重置
      await prisma.$transaction(async (tx) => {
        // 1. 更新用户密码
        const passwordHash = await bcrypt.hash(password, 12);
        await tx.user.update({
          where: { id: tokenRecord.userId },
          data: { passwordHash }
        });

        // 2. 标记令牌为已使用
        await tx.passwordResetToken.update({
          where: { token },
          data: { usedAt: new Date() }
        });

        // 3. 撤销所有现有的刷新令牌（强制重新登录）
        await tx.refreshToken.updateMany({
          where: { 
            userId: tokenRecord.userId, 
            isRevoked: false 
          },
          data: { 
            isRevoked: true,
            revokedAt: new Date() 
          }
        });

        // 4. 删除该用户的其他未使用的密码重置令牌
        await tx.passwordResetToken.deleteMany({
          where: {
            userId: tokenRecord.userId,
            usedAt: null,
            id: { not: tokenRecord.id }
          }
        });
      });

      logPasswordResetAttempt('reset', {
        ip: clientIp,
        email: tokenRecord.email,
        success: true
      });

      console.log(`[密码重置] 成功 - 用户: ${tokenRecord.user.username} (${tokenRecord.userId}), IP: ${clientIp}`);

      return res.json({
        success: true,
        message: '密码重置成功，请使用新密码登录'
      });

    } catch (error) {
      console.error(`[密码重置] 执行失败 - IP: ${clientIp}, 错误:`, error);
      logPasswordResetAttempt('reset', {
        ip: clientIp,
        success: false,
        errorCode: 'EXECUTION_FAILED'
      });

      // 处理特定的数据库错误
      if (error.code === 'P2025') {
        return res.status(400).json({
          success: false,
          error: '重置链接无效'
        });
      }

      return res.status(500).json({
        success: false,
        error: '密码重置失败，请稍后重试'
      });
    }
  }
);

export default router;



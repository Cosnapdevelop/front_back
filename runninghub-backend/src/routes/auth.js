import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult, query } from 'express-validator';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { 
  authLimiter, 
  loginLimiter, 
  registerLimiter, 
  sensitiveOperationLimiter 
} from '../middleware/rateLimiting.js';
import { 
  authValidation,
  sanitizeInput 
} from '../middleware/validation.js';
import { auth, checkTokenExpiry } from '../middleware/auth.js';
import { isEmailEnabled, sendVerificationEmail } from '../services/emailService.js';

const router = express.Router();
const prisma = new PrismaClient();

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_DAYS = 30; // days

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
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
        const now = new Date();
        const found = await prisma.verificationCode.findFirst({
          where: {
            email,
            scene,
            code,
            expiresAt: { gt: now },
            usedAt: null
          },
          orderBy: { createdAt: 'desc' }
        });
        if (!found) {
          return res.status(400).json({ success: false, error: '验证码无效或已过期' });
        }
        await prisma.verificationCode.update({
          where: { id: found.id },
          data: { usedAt: new Date() }
        });
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
    query('username').optional().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_-]+$/),
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
  body('email').isEmail().withMessage('请提供有效邮箱'),
  async (req, res) => {
    try {
      const emailRaw = String(req.body.email || '');
      const scene = (req.body.scene || 'register').trim();
      const email = emailRaw.trim().toLowerCase();

      // 生成6位数字验证码
      const code = ('' + Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟

      await prisma.verificationCode.create({
        data: { email, code, scene, expiresAt }
      });

      if (await isEmailEnabled()) {
        try {
          await sendVerificationEmail(email, code);
        } catch (e) {
          console.warn('[Email] 发送失败，降级为日志输出:', e?.message);
          console.log(`[验证码] email=${email}, scene=${scene}, code=${code}, expiresAt=${expiresAt.toISOString()}`);
        }
      } else {
        // 未配置SMTP，降级日志输出
        console.log(`[验证码] email=${email}, scene=${scene}, code=${code}, expiresAt=${expiresAt.toISOString()}`);
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
      // 账户状态字段（isBanned/isActive）暂未在Schema中定义，移除相关校验
      
      // 验证密码
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        console.warn(`[登录失败] 密码错误 - 用户: ${user.username} (${user.id}), IP: ${req.ip}`);
        return res.status(401).json({ 
          success: false, 
          error: '账号或密码错误' 
        });
      }

      // lastLoginAt 字段暂未在Schema中定义，移除更新时间

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

export default router;



import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
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
      const { email, username, password } = req.body;
      
      // 检查用户是否已存在
      const exists = await prisma.user.findFirst({ 
        where: { 
          OR: [{ email }, { username }] 
        } 
      });
      
      if (exists) {
        console.warn(`[注册失败] 用户已存在 - Email: ${email}, Username: ${username}, IP: ${req.ip}`);
        return res.status(409).json({ 
          success: false, 
          error: '邮箱或用户名已存在' 
        });
      }

      // 密码强度验证（已在validation.js中处理）
      const passwordHash = await bcrypt.hash(password, 12); // 增加到12轮
      
      const user = await prisma.user.create({ 
        data: { 
          email, 
          username, 
          passwordHash,
          isActive: true, // 默认激活，可根据需要修改
          createdAt: new Date(),
          lastLoginAt: new Date()
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

router.post(
  '/login',
  loginLimiter,
  sanitizeInput,
  ...authValidation.login,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // 查找用户（支持邮箱或用户名登录）
      const user = await prisma.user.findFirst({ 
        where: { 
          OR: [{ email }, { username: email }] 
        } 
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
        console.warn(`[登录失败] 用户被封禁 - ID: ${user.id}, IP: ${req.ip}`);
        return res.status(403).json({ 
          success: false, 
          error: '账户已被封禁' 
        });
      }
      
      if (!user.isActive) {
        console.warn(`[登录失败] 账户未激活 - ID: ${user.id}, IP: ${req.ip}`);
        return res.status(403).json({ 
          success: false, 
          error: '账户未激活，请检查邮箱激活链接' 
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

      // 更新最后登录时间
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
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



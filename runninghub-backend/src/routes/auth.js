import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

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
  body('email').isEmail(),
  body('username').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, username, password } = req.body;
    const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (exists) return res.status(409).json({ success: false, error: '邮箱或用户名已存在' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, username, passwordHash } });
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

    return res.json({ success: true, accessToken, refreshToken, user: { id: user.id, email, username } });
  }
);

router.post(
  '/login',
  body('email').isString(),
  body('password').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({ where: { OR: [{ email }, { username: email }] } });
    if (!user) return res.status(401).json({ success: false, error: '账号或密码错误' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, error: '账号或密码错误' });

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

    return res.json({ success: true, accessToken, refreshToken, user: { id: user.id, email: user.email, username: user.username } });
  }
);

router.post('/refresh', body('refreshToken').isString(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { refreshToken } = req.body;
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    return res.status(401).json({ success: false, error: '刷新令牌无效' });
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ success: false, error: '用户不存在' });
    const accessToken = signAccessToken(user);
    return res.json({ success: true, accessToken });
  } catch {
    return res.status(401).json({ success: false, error: '刷新令牌校验失败' });
  }
});

router.post('/logout', body('refreshToken').isString(), async (req, res) => {
  const { refreshToken } = req.body;
  await prisma.refreshToken.update({ where: { token: refreshToken }, data: { isRevoked: true } }).catch(() => {});
  return res.json({ success: true });
});

// 健康检查与用户信息
router.get('/me', async (req, res) => {
  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: '未授权' });
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, username: true, avatar: true, bio: true } });
    if (!user) return res.status(404).json({ success: false, error: '用户不存在' });
    return res.json({ success: true, user });
  } catch {
    return res.status(401).json({ success: false, error: '未授权' });
  }
});

// 更新用户信息
router.put('/me', async (req, res) => {
  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: '未授权' });
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const { username, email, bio, avatar } = req.body;
    const user = await prisma.user.update({ where: { id: payload.sub }, data: { username, email, bio, avatar }, select: { id: true, email: true, username: true, avatar: true, bio: true } });
    return res.json({ success: true, user });
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message });
  }
});

export default router;



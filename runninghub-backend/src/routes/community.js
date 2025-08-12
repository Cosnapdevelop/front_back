import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// 列表（未登录可访问）
router.get('/posts', async (req, res) => {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      comments: { select: { id: true, content: true, createdAt: true, user: { select: { id: true, username: true, avatar: true } } }, take: 3, orderBy: { createdAt: 'desc' } },
    }
  });
  res.json({ success: true, posts });
});

// 详情（未登录可访问）
router.get('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      comments: { orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, username: true, avatar: true } } } },
    }
  });
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
  res.json({ success: true, post });
});

// 发帖（需登录）
router.post('/posts', auth, async (req, res) => {
  const { images = [], caption = '', effectId } = req.body;
  const newPost = await prisma.post.create({
    data: {
      userId: req.user.id,
      effectId: effectId || null,
      images,
      caption,
    },
  });
  res.json({ success: true, post: newPost });
});

// 点赞（需登录）
router.post('/posts/:id/like', auth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.postLike.create({ data: { postId: id, userId: req.user.id } });
    await prisma.post.update({ where: { id }, data: { likesCount: { increment: 1 } } });
    res.json({ success: true });
  } catch (e) {
    // 已点过赞则忽略
    res.json({ success: true });
  }
});

// 取消点赞（需登录）
router.post('/posts/:id/unlike', auth, async (req, res) => {
  const { id } = req.params;
  await prisma.postLike.deleteMany({ where: { postId: id, userId: req.user.id } });
  await prisma.post.update({ where: { id }, data: { likesCount: { decrement: 1 } } }).catch(() => {});
  res.json({ success: true });
});

// 评论（需登录）
router.post('/posts/:id/comments', auth, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const comment = await prisma.comment.create({
    data: { postId: id, userId: req.user.id, content },
    include: { user: { select: { id: true, username: true, avatar: true } } }
  });
  res.json({ success: true, comment });
});

export default router;



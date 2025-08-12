import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// 列表（未登录可访问） with pagination & sorting
router.get('/posts', async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const sort = (req.query.sort || 'createdAt:desc').toString();
  const [sortField, sortDir] = sort.split(':');
  const orderBy = [{ [sortField || 'createdAt']: (sortDir === 'asc' ? 'asc' : 'desc') }];

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        comments: { select: { id: true, content: true, createdAt: true, user: { select: { id: true, username: true, avatar: true } } }, take: 3, orderBy: { createdAt: 'desc' } },
      }
    }),
    prisma.post.count()
  ]);
  res.json({ success: true, posts, meta: { page, limit, total, hasNext: page * limit < total } });
});

// 详情（未登录可访问） with comments pagination
router.get('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          replies: { orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, username: true, avatar: true } } } }
        }
      },
    }
  });
  if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
  const total = await prisma.comment.count({ where: { postId: id, parentId: null } });
  res.json({ success: true, post, meta: { page, limit, total, hasNext: page * limit < total } });
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

// 评论（需登录），支持 parentId（回复）
router.post('/posts/:id/comments', auth, async (req, res) => {
  const { id } = req.params;
  const { content, parentId } = req.body;
  const comment = await prisma.comment.create({
    data: { postId: id, userId: req.user.id, content, parentId: parentId || null },
    include: { user: { select: { id: true, username: true, avatar: true } } }
  });
  res.json({ success: true, comment });
});

export default router;



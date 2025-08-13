import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// 列表（未登录可访问） with pagination & sorting
router.get('/posts', async (req, res) => {
  try {
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
  } catch (e) {
    console.error('[community] 列表接口错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 详情（未登录可访问） with comments pagination
router.get('/posts/:id', async (req, res) => {
  try {
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
  // 兜底：likesCount/commentsCount 若为空
  const safePost = {
    ...post,
    likesCount: post.likesCount ?? 0,
    commentsCount: post.comments?.length ?? 0
  };
  res.json({ success: true, post: safePost, meta: { page, limit, total, hasNext: page * limit < total } });
  } catch (e) {
    console.error('[community] 详情接口错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
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
    // 通知帖子作者
    const post = await prisma.post.findUnique({ where: { id }, select: { userId: true } });
    if (post && post.userId !== req.user.id) {
      await prisma.notification.create({
        data: { userId: post.userId, actorId: req.user.id, type: 'like', postId: id }
      });
    }
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
  // 通知帖子作者或被回复者
  const post = await prisma.post.findUnique({ where: { id }, select: { userId: true } });
  const parentComment = parentId ? await prisma.comment.findUnique({ where: { id: parentId }, select: { userId: true } }) : null;
  const notifyUserId = parentComment?.userId || post?.userId;
  if (notifyUserId && notifyUserId !== req.user.id) {
    await prisma.notification.create({
      data: { userId: notifyUserId, actorId: req.user.id, type: parentId ? 'reply' : 'comment', postId: id, commentId: comment.id }
    });
  }
  res.json({ success: true, comment });
});

// 获取通知（需登录）
router.get('/notifications', auth, async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { id: true, username: true, avatar: true } } }
    }),
    prisma.notification.count({ where: { userId: req.user.id } })
  ]);
  res.json({ success: true, items, meta: { page, limit, total, hasNext: page * limit < total } });
});

// 标记已读（需登录）
router.post('/notifications/:id/read', auth, async (req, res) => {
  const { id } = req.params;
  await prisma.notification.updateMany({ where: { id, userId: req.user.id }, data: { isRead: true } });
  res.json({ success: true });
});

export default router;



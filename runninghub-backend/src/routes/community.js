import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth, checkTokenExpiry, optionalAuth } from '../middleware/auth.js';
import { 
  communityLimiter, 
  createContentLimiter, 
  generalLimiter 
} from '../middleware/rateLimiting.js';
import { 
  communityValidation,
  sanitizeInput,
  handleValidationErrors,
  paginationValidation
} from '../middleware/validation.js';
import { body, param, query } from 'express-validator';

const prisma = new PrismaClient();
const router = express.Router();

// 获取帖子列表（未登录可访问）
router.get(
  '/posts',
  generalLimiter,
  sanitizeInput,
  ...paginationValidation,
  query('sort')
    .optional()
    .matches(/^(createdAt|likesCount|commentsCount):(asc|desc)$/)
    .withMessage('排序格式不正确，应为 field:direction'),
  handleValidationErrors,
  async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const sort = (req.query.sort || 'createdAt:desc').toString();
    const [sortField, sortDir] = sort.split(':');
    const orderBy = [{ [sortField || 'createdAt']: (sortDir === 'asc' ? 'asc' : 'desc') }];

    console.log(`[社区] 获取帖子列表 - 页码: ${page}, 限制: ${limit}, 排序: ${sort}, IP: ${req.ip}`);

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { 
            select: { 
              id: true, 
              username: true, 
              avatar: true 
            } 
          },
          comments: { 
            select: { 
              id: true, 
              content: true, 
              createdAt: true, 
              likesCount: true, 
              user: { 
                select: { 
                  id: true, 
                  username: true, 
                  avatar: true 
                } 
              } 
            }, 
            take: 3, 
            orderBy: { createdAt: 'desc' } 
          },
        }
      }),
      prisma.post.count()
    ]);

    console.log(`[社区] 帖子列表查询成功 - 返回: ${posts.length}条, 总计: ${total}条`);
    
    res.json({ 
      success: true, 
      posts, 
      meta: { 
        page, 
        limit, 
        total, 
        hasNext: page * limit < total 
      } 
    });
  } catch (error) {
    console.error(`[社区] 获取帖子列表失败 - IP: ${req.ip}, 错误:`, error);
    res.status(500).json({ 
      success: false, 
      error: '获取帖子列表失败' 
    });
  }
});

// 详情（未登录可访问） with comments pagination (top-level only, lazy-load replies)
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
          include: { user: { select: { id: true, username: true, avatar: true } } }
        },
      }
    });
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    const total = await prisma.comment.count({ where: { postId: id, parentId: null } });
    // 附加每个顶级评论的回复数量（用于前端懒加载）
    const commentsWithCounts = await Promise.all(
      post.comments.map(async (c) => {
        const repliesCount = await prisma.comment.count({ where: { parentId: c.id } });
        return { ...c, replies: [], repliesCount };
      })
    );
    const safePost = { ...post, comments: commentsWithCounts, likesCount: post.likesCount ?? 0, commentsCount: total };
    res.json({ success: true, post: safePost, meta: { page, limit, total, hasNext: page * limit < total } });
  } catch (e) {
    console.error('[community] 详情接口错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 获取某个层级的评论（parentId = null 为顶级），用于任意层级的懒加载
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const parentId = req.query.parentId ? String(req.query.parentId) : null;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId: id, parentId },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, username: true, avatar: true } } }
      }),
      prisma.comment.count({ where: { postId: id, parentId } })
    ]);
    const withCounts = await Promise.all(items.map(async c => {
      const repliesCount = await prisma.comment.count({ where: { parentId: c.id } });
      return { ...c, repliesCount };
    }));
    res.json({ success: true, comments: withCounts, meta: { page, limit, total, hasNext: page * limit < total } });
  } catch (e) {
    console.error('[community] comments lazy load error:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 发帖（需登录）
router.post(
  '/posts',
  createContentLimiter,
  sanitizeInput,
  auth,
  checkTokenExpiry,
  body('images')
    .optional()
    .isArray({ max: 10 })
    .withMessage('图片数量不能超过10张')
    .custom((images) => {
      if (images && images.some(img => typeof img !== 'string' || img.length > 500)) {
        throw new Error('图片URL必须是字符串且不超过500个字符');
      }
      return true;
    }),
  body('caption')
    .optional()
    .isString()
    .withMessage('说明文字必须是字符串')
    .isLength({ max: 2000 })
    .withMessage('说明文字不能超过2000个字符')
    .trim()
    .escape(),
  body('effectId')
    .optional()
    .isString()
    .withMessage('效果ID必须是字符串')
    .isLength({ max: 100 })
    .withMessage('效果ID长度不能超过100个字符'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { images = [], caption = '', effectId } = req.body;
      
      console.log(`[社区] 用户发帖 - 用户: ${req.user.username} (${req.user.id}), 图片数: ${images.length}, IP: ${req.ip}`);
      
      const newPost = await prisma.post.create({
        data: {
          userId: req.user.id,
          effectId: effectId || null,
          images,
          caption,
          createdAt: new Date(),
          likesCount: 0,
          commentsCount: 0
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          }
        }
      });
      
      console.log(`[社区] 发帖成功 - 帖子ID: ${newPost.id}, 用户: ${req.user.username}`);
      
      res.status(201).json({ 
        success: true, 
        post: newPost,
        message: '发帖成功'
      });
    } catch (error) {
      console.error(`[社区] 发帖失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      res.status(500).json({ 
        success: false, 
        error: '发帖失败，请稍后重试' 
      });
    }
  }
);

// 点赞（需登录）
router.post(
  '/posts/:id/like',
  communityLimiter,
  sanitizeInput,
  auth,
  param('id')
    .isString()
    .withMessage('帖子ID必须是字符串')
    .isLength({ min: 1, max: 100 })
    .withMessage('帖子ID长度必须在1-100个字符之间'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // 检查帖子是否存在
      const post = await prisma.post.findUnique({ 
        where: { id }, 
        select: { userId: true } 
      });
      
      if (!post) {
        return res.status(404).json({ 
          success: false, 
          error: '帖子不存在' 
        });
      }
      
      // 尝试点赞（如果已点赞会失败，但不影响结果）
      try {
        await prisma.postLike.create({ 
          data: { 
            postId: id, 
            userId: req.user.id 
          } 
        });
        
        await prisma.post.update({ 
          where: { id }, 
          data: { likesCount: { increment: 1 } } 
        });
        
        // 通知帖子作者（如果不是自己）
        if (post.userId !== req.user.id) {
          await prisma.notification.create({
            data: { 
              userId: post.userId, 
              actorId: req.user.id, 
              type: 'like', 
              postId: id 
            }
          });
        }
        
        console.log(`[社区] 点赞成功 - 帖子: ${id}, 用户: ${req.user.username} (${req.user.id})`);
      } catch (error) {
        // 已经点过赞，忽略错误
        console.log(`[社区] 重复点赞 - 帖子: ${id}, 用户: ${req.user.username} (${req.user.id})`);
      }
      
      res.json({ 
        success: true,
        message: '点赞成功' 
      });
    } catch (error) {
      console.error(`[社区] 点赞失败 - 帖子: ${req.params.id}, 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      res.status(500).json({ 
        success: false, 
        error: '点赞失败，请稍后重试' 
      });
    }
  }
);

// 取消点赞（需登录）
router.post(
  '/posts/:id/unlike',
  communityLimiter,
  sanitizeInput,
  auth,
  param('id')
    .isString()
    .withMessage('帖子ID必须是字符串')
    .isLength({ min: 1, max: 100 })
    .withMessage('帖子ID长度必须在1-100个字符之间'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // 检查帖子是否存在
      const post = await prisma.post.findUnique({ 
        where: { id }, 
        select: { id: true } 
      });
      
      if (!post) {
        return res.status(404).json({ 
          success: false, 
          error: '帖子不存在' 
        });
      }
      
      // 删除点赞记录
      const deleted = await prisma.postLike.deleteMany({ 
        where: { 
          postId: id, 
          userId: req.user.id 
        } 
      });
      
      // 如果确实删除了点赞记录，则更新计数
      if (deleted.count > 0) {
        await prisma.post.update({ 
          where: { id }, 
          data: { likesCount: { decrement: 1 } } 
        }).catch(() => {});
        
        console.log(`[社区] 取消点赞成功 - 帖子: ${id}, 用户: ${req.user.username} (${req.user.id})`);
      }
      
      res.json({ 
        success: true,
        message: '取消点赞成功' 
      });
    } catch (error) {
      console.error(`[社区] 取消点赞失败 - 帖子: ${req.params.id}, 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      res.status(500).json({ 
        success: false, 
        error: '取消点赞失败，请稍后重试' 
      });
    }
  }
);

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

// 懒加载某条评论的直接子回复
router.get('/comments/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const [replies, total] = await Promise.all([
      prisma.comment.findMany({
        where: { parentId: id },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, username: true, avatar: true } } }
      }),
      prisma.comment.count({ where: { parentId: id } })
    ]);
    // 为每个回复附加其子回复数量
    const withCounts = await Promise.all(replies.map(async (r) => {
      const repliesCount = await prisma.comment.count({ where: { parentId: r.id } });
      return { ...r, repliesCount };
    }));
    res.json({ success: true, replies: withCounts, meta: { page, limit, total, hasNext: page * limit < total } });
  } catch (e) {
    console.error('[community] replies接口错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});
// 评论点赞/取消
router.post('/comments/:id/like', auth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.commentLike.create({ data: { commentId: id, userId: req.user.id } });
    await prisma.comment.update({ where: { id }, data: { likesCount: { increment: 1 } } });
  } catch {}
  res.json({ success: true });
});
router.post('/comments/:id/unlike', auth, async (req, res) => {
  const { id } = req.params;
  await prisma.commentLike.deleteMany({ where: { commentId: id, userId: req.user.id } });
  await prisma.comment.update({ where: { id }, data: { likesCount: { decrement: 1 } } }).catch(()=>{});
  res.json({ success: true });
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



// ========== My Posts management ==========
// 获取当前用户的帖子
router.get('/my-posts', auth, async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, username: true, avatar: true } } }
    }),
    prisma.post.count({ where: { userId: req.user.id } })
  ]);
  res.json({ success: true, posts, meta: { page, limit, total, hasNext: page * limit < total } });
});

// 更新帖子（仅作者）
router.put('/posts/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { images, caption } = req.body;
  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.userId !== req.user.id) return res.status(403).json({ success: false, error: '无权限' });
    const updated = await prisma.post.update({ where: { id }, data: { images: images || post.images, caption: caption ?? post.caption } });
    res.json({ success: true, post: updated });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// 删除帖子（仅作者）
router.delete('/posts/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.userId !== req.user.id) return res.status(403).json({ success: false, error: '无权限' });
    await prisma.post.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

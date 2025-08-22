import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { 
  authLimiter, 
  sensitiveOperationLimiter 
} from '../middleware/rateLimiting.js';
import { sanitizeInput } from '../middleware/validation.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Beta invitation code validation endpoint
router.post(
  '/validate-invite',
  authLimiter,
  sanitizeInput,
  body('inviteCode')
    .notEmpty()
    .withMessage('邀请码不能为空')
    .isLength({ min: 6, max: 50 })
    .withMessage('邀请码长度必须在6-50个字符之间'),
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

      const { inviteCode } = req.body;
      const now = new Date();

      // Find the invitation code
      const invite = await prisma.betaInviteCode.findUnique({
        where: { code: inviteCode },
        select: {
          id: true,
          code: true,
          accessLevel: true,
          maxUses: true,
          currentUses: true,
          description: true,
          isActive: true,
          expiresAt: true,
          createdAt: true
        }
      });

      if (!invite) {
        console.warn(`[Beta邀请] 无效邀请码 - Code: ${inviteCode}, IP: ${req.ip}`);
        return res.status(404).json({
          success: false,
          error: '邀请码不存在'
        });
      }

      // Check if code is active
      if (!invite.isActive) {
        console.warn(`[Beta邀请] 已禁用邀请码 - Code: ${inviteCode}, IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          error: '邀请码已被禁用'
        });
      }

      // Check if code is expired
      if (invite.expiresAt && invite.expiresAt < now) {
        console.warn(`[Beta邀请] 已过期邀请码 - Code: ${inviteCode}, Expired: ${invite.expiresAt}, IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          error: '邀请码已过期'
        });
      }

      // Check if code has reached max uses
      if (invite.currentUses >= invite.maxUses) {
        console.warn(`[Beta邀请] 邀请码已达使用上限 - Code: ${inviteCode}, Uses: ${invite.currentUses}/${invite.maxUses}, IP: ${req.ip}`);
        return res.status(400).json({
          success: false,
          error: '邀请码已达使用上限'
        });
      }

      console.log(`[Beta邀请] 有效邀请码验证 - Code: ${inviteCode}, Level: ${invite.accessLevel}, IP: ${req.ip}`);

      return res.json({
        success: true,
        data: {
          code: invite.code,
          accessLevel: invite.accessLevel,
          description: invite.description,
          remainingUses: invite.maxUses - invite.currentUses,
          expiresAt: invite.expiresAt
        }
      });
    } catch (error) {
      console.error(`[Beta邀请] 验证失败 - IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '验证邀请码失败'
      });
    }
  }
);

// Join beta program using invitation code
router.post(
  '/join',
  sensitiveOperationLimiter,
  sanitizeInput,
  auth,
  body('inviteCode')
    .notEmpty()
    .withMessage('邀请码不能为空'),
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

      const { inviteCode } = req.body;
      const userId = req.user.id;
      const now = new Date();

      // Check if user is already in beta program
      const existingAccess = await prisma.betaUserAccess.findUnique({
        where: { userId }
      });

      if (existingAccess && existingAccess.isActive) {
        return res.status(400).json({
          success: false,
          error: '您已经是Beta用户',
          currentAccessLevel: existingAccess.accessLevel
        });
      }

      // Validate invitation code
      const invite = await prisma.betaInviteCode.findUnique({
        where: { code: inviteCode }
      });

      if (!invite || !invite.isActive || 
          (invite.expiresAt && invite.expiresAt < now) ||
          invite.currentUses >= invite.maxUses) {
        return res.status(400).json({
          success: false,
          error: '邀请码无效、已过期或已达使用上限'
        });
      }

      // Create or update beta access
      const result = await prisma.$transaction(async (tx) => {
        // Increment invitation code usage
        await tx.betaInviteCode.update({
          where: { id: invite.id },
          data: { currentUses: { increment: 1 } }
        });

        // Create or update beta user access
        const betaAccess = await tx.betaUserAccess.upsert({
          where: { userId },
          update: {
            accessLevel: invite.accessLevel,
            inviteCodeId: invite.id,
            isActive: true,
            joinedAt: now
          },
          create: {
            userId,
            accessLevel: invite.accessLevel,
            inviteCodeId: invite.id,
            isActive: true,
            joinedAt: now
          }
        });

        // Update user's beta fields
        await tx.user.update({
          where: { id: userId },
          data: {
            betaAccessLevel: invite.accessLevel,
            betaInviteCode: inviteCode,
            betaJoinedAt: now
          }
        });

        return betaAccess;
      });

      // Log beta analytics event
      await prisma.betaAnalytics.create({
        data: {
          userId,
          sessionId: req.sessionId || `session_${Date.now()}`,
          eventType: 'beta_joined',
          feature: 'invitation_system',
          eventData: {
            inviteCode,
            accessLevel: invite.accessLevel
          },
          userContext: {
            userAgent: req.get('User-Agent'),
            ip: req.ip
          },
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      }).catch(error => {
        console.warn('[Beta Analytics] 记录失败:', error.message);
      });

      console.log(`[Beta加入] 用户加入Beta - 用户: ${req.user.username} (${userId}), Level: ${invite.accessLevel}, Code: ${inviteCode}, IP: ${req.ip}`);

      return res.json({
        success: true,
        message: '成功加入Beta程序',
        data: {
          accessLevel: result.accessLevel,
          joinedAt: result.joinedAt,
          features: result.features
        }
      });
    } catch (error) {
      console.error(`[Beta加入] 失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '加入Beta程序失败'
      });
    }
  }
);

// Get user's beta access information
router.get(
  '/user-access',
  authLimiter,
  auth,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const betaAccess = await prisma.betaUserAccess.findUnique({
        where: { userId },
        include: {
          inviteCode: {
            select: {
              code: true,
              description: true
            }
          }
        }
      });

      if (!betaAccess || !betaAccess.isActive) {
        return res.json({
          success: true,
          data: {
            hasBetaAccess: false,
            accessLevel: 'NONE',
            features: {}
          }
        });
      }

      // Define feature flags based on access level
      const featureFlags = getFeatureFlags(betaAccess.accessLevel);

      return res.json({
        success: true,
        data: {
          hasBetaAccess: true,
          accessLevel: betaAccess.accessLevel,
          joinedAt: betaAccess.joinedAt,
          inviteCode: betaAccess.inviteCode?.code,
          inviteDescription: betaAccess.inviteCode?.description,
          features: { ...featureFlags, ...betaAccess.features },
          notes: betaAccess.notes
        }
      });
    } catch (error) {
      console.error(`[Beta用户访问] 获取失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '获取Beta访问信息失败'
      });
    }
  }
);

// Update user's beta features (admin only)
router.put(
  '/user-access/:userId',
  sensitiveOperationLimiter,
  sanitizeInput,
  auth,
  body('accessLevel')
    .optional()
    .isIn(['NONE', 'BASIC', 'PREMIUM', 'ADVANCED', 'DEVELOPER'])
    .withMessage('无效的访问级别'),
  body('features')
    .optional()
    .isObject()
    .withMessage('功能配置必须是对象'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('激活状态必须是布尔值'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('备注不能超过500个字符'),
  async (req, res) => {
    try {
      // Check if current user is admin or developer
      const currentUserBeta = await prisma.betaUserAccess.findUnique({
        where: { userId: req.user.id }
      });

      if (!currentUserBeta || !['DEVELOPER'].includes(currentUserBeta.accessLevel)) {
        return res.status(403).json({
          success: false,
          error: '权限不足，仅开发者可执行此操作'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '输入验证失败',
          details: errors.array()
        });
      }

      const { userId } = req.params;
      const { accessLevel, features, isActive, notes } = req.body;

      const updateData = {};
      if (accessLevel !== undefined) updateData.accessLevel = accessLevel;
      if (features !== undefined) updateData.features = features;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (notes !== undefined) updateData.notes = notes;

      const updatedAccess = await prisma.betaUserAccess.update({
        where: { userId },
        data: updateData
      });

      // Also update the user table
      if (accessLevel !== undefined) {
        await prisma.user.update({
          where: { id: userId },
          data: { betaAccessLevel: accessLevel }
        });
      }

      console.log(`[Beta管理] 更新用户访问权限 - 管理员: ${req.user.username} (${req.user.id}), 目标用户: ${userId}, 变更: ${JSON.stringify(updateData)}, IP: ${req.ip}`);

      return res.json({
        success: true,
        message: '用户Beta访问权限更新成功',
        data: updatedAccess
      });
    } catch (error) {
      console.error(`[Beta管理] 更新失败 - 管理员: ${req.user?.id}, 目标用户: ${req.params.userId}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '更新Beta访问权限失败'
      });
    }
  }
);

// Beta analytics tracking endpoint
router.post(
  '/analytics',
  authLimiter,
  sanitizeInput,
  body('eventType')
    .notEmpty()
    .withMessage('事件类型不能为空'),
  body('feature')
    .notEmpty()
    .withMessage('功能名称不能为空'),
  body('eventData')
    .optional()
    .isObject()
    .withMessage('事件数据必须是对象'),
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

      const { eventType, feature, eventData, sessionId } = req.body;
      const userId = req.user?.id;

      await prisma.betaAnalytics.create({
        data: {
          userId,
          sessionId: sessionId || `session_${Date.now()}`,
          eventType,
          feature,
          eventData: eventData || {},
          userContext: {
            userAgent: req.get('User-Agent'),
            referrer: req.get('Referrer')
          },
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      return res.json({
        success: true,
        message: 'Analytics事件记录成功'
      });
    } catch (error) {
      console.error(`[Beta Analytics] 记录失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: 'Analytics事件记录失败'
      });
    }
  }
);

// Get beta analytics (admin only)
router.get(
  '/analytics',
  authLimiter,
  auth,
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式不正确'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式不正确'),
  query('eventType')
    .optional()
    .notEmpty()
    .withMessage('事件类型不能为空'),
  query('feature')
    .optional()
    .notEmpty()
    .withMessage('功能名称不能为空'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('限制数量必须在1-1000之间'),
  async (req, res) => {
    try {
      // Check if current user is admin or developer
      const currentUserBeta = await prisma.betaUserAccess.findUnique({
        where: { userId: req.user.id }
      });

      if (!currentUserBeta || !['DEVELOPER'].includes(currentUserBeta.accessLevel)) {
        return res.status(403).json({
          success: false,
          error: '权限不足，仅开发者可查看Analytics数据'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '输入验证失败',
          details: errors.array()
        });
      }

      const { startDate, endDate, eventType, feature, limit = 100 } = req.query;

      const where = {};
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }
      if (eventType) where.eventType = eventType;
      if (feature) where.feature = feature;

      const analytics = await prisma.betaAnalytics.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
        select: {
          id: true,
          userId: true,
          sessionId: true,
          eventType: true,
          feature: true,
          eventData: true,
          userContext: true,
          timestamp: true,
          ip: true
        }
      });

      return res.json({
        success: true,
        data: analytics,
        count: analytics.length
      });
    } catch (error) {
      console.error(`[Beta Analytics] 查询失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '获取Analytics数据失败'
      });
    }
  }
);

// Get beta program statistics
router.get(
  '/stats',
  authLimiter,
  async (req, res) => {
    try {
      // Get basic stats (available to all beta users)
      const totalBetaUsers = await prisma.betaUserAccess.count({
        where: { isActive: true }
      });

      const activeThisWeek = await prisma.betaAnalytics.groupBy({
        by: ['userId'],
        where: {
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          userId: { not: null }
        }
      }).then(result => result.length);

      const feedbackSubmitted = await prisma.userFeedback?.count() || 0;

      // Calculate average session length from analytics
      const sessionStats = await prisma.betaAnalytics.groupBy({
        by: ['sessionId'],
        _min: { timestamp: true },
        _max: { timestamp: true },
        where: {
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }).catch(() => []);

      const averageSessionLength = sessionStats.length > 0 
        ? sessionStats.reduce((acc, session) => {
            const duration = new Date(session._max.timestamp).getTime() - new Date(session._min.timestamp).getTime();
            return acc + (duration / 1000 / 60); // Convert to minutes
          }, 0) / sessionStats.length
        : 0;

      // Get top used features
      const topUsedFeatures = await prisma.betaAnalytics.groupBy({
        by: ['feature'],
        _count: { feature: true },
        orderBy: { _count: { feature: 'desc' } },
        take: 5,
        where: {
          timestamp: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }).then(results => 
        results.map(r => r.feature)
      ).catch(() => []);

      return res.json({
        success: true,
        data: {
          totalBetaUsers,
          activeThisWeek,
          feedbackSubmitted,
          averageSessionLength: Math.round(averageSessionLength),
          topUsedFeatures
        }
      });
    } catch (error) {
      console.error(`[Beta Stats] 获取失败 - IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '获取Beta统计信息失败',
        data: {
          totalBetaUsers: 0,
          activeThisWeek: 0,
          feedbackSubmitted: 0,
          averageSessionLength: 0,
          topUsedFeatures: []
        }
      });
    }
  }
);

// Submit beta feedback
router.post(
  '/feedback',
  authLimiter,
  sanitizeInput,
  auth,
  body('feedback').notEmpty().withMessage('反馈内容不能为空'),
  body('category').notEmpty().withMessage('分类不能为空'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('评分必须在1-5之间'),
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

      const { feedback, category, rating } = req.body;
      const userId = req.user.id;

      // Save feedback to UserFeedback table
      await prisma.$executeRaw`
        INSERT INTO "UserFeedback" (
          "userId", 
          "sessionId", 
          "type", 
          "category", 
          "rating", 
          "message", 
          "metadata"
        ) VALUES (
          ${userId},
          ${`session_${Date.now()}`},
          ${'rating'},
          ${category},
          ${rating},
          ${feedback},
          ${JSON.stringify({ 
            source: 'beta_feedback',
            timestamp: new Date().toISOString(),
            userAgent: req.get('User-Agent'),
            ip: req.ip
          })}
        )
      `.catch(error => {
        console.warn('[Beta Feedback] 数据库写入失败:', error.message);
      });

      // Track analytics event
      await prisma.betaAnalytics.create({
        data: {
          userId,
          sessionId: `session_${Date.now()}`,
          eventType: 'beta_feedback_submitted',
          feature: 'feedback_system',
          eventData: {
            category,
            rating,
            feedbackLength: feedback.length
          },
          userContext: {
            userAgent: req.get('User-Agent'),
            ip: req.ip
          },
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      }).catch(error => {
        console.warn('[Beta Analytics] 记录失败:', error.message);
      });

      console.log(`[Beta Feedback] 反馈提交 - 用户: ${req.user.username} (${userId}), 评分: ${rating}, 分类: ${category}, IP: ${req.ip}`);

      return res.json({
        success: true,
        message: '反馈提交成功'
      });
    } catch (error) {
      console.error(`[Beta Feedback] 提交失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '反馈提交失败'
      });
    }
  }
);

// Helper function to get feature flags based on access level
function getFeatureFlags(accessLevel) {
  const baseFeatures = {
    betaIndicator: true,
    feedbackButton: true
  };

  switch (accessLevel) {
    case 'BASIC':
      return {
        ...baseFeatures,
        earlyAccess: true,
        betaEffects: false,
        mobileOptimization: true
      };
    case 'PREMIUM':
      return {
        ...baseFeatures,
        earlyAccess: true,
        betaEffects: true,
        mobileOptimization: true,
        priorityProcessing: true
      };
    case 'ADVANCED':
      return {
        ...baseFeatures,
        earlyAccess: true,
        betaEffects: true,
        mobileOptimization: true,
        priorityProcessing: true,
        experimentalFeatures: true,
        advancedAnalytics: true
      };
    case 'DEVELOPER':
      return {
        ...baseFeatures,
        earlyAccess: true,
        betaEffects: true,
        mobileOptimization: true,
        priorityProcessing: true,
        experimentalFeatures: true,
        advancedAnalytics: true,
        debugMode: true,
        adminPanel: true
      };
    default:
      return {};
  }
}

export default router;
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import SubscriptionService from '../services/subscriptionService.js';

const router = express.Router();
const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService();

// CORS middleware for admin routes
const adminCors = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
  const expectedKey = process.env.ADMIN_RESET_KEY;
  
  if (!expectedKey) {
    return res.status(500).json({ 
      success: false, 
      error: 'Admin reset key not configured' 
    });
  }
  
  if (!adminKey || adminKey !== expectedKey) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid admin key' 
    });
  }
  
  next();
};

// Rate limiting for admin operations (very restrictive)
const adminResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 reset attempts per hour
  message: {
    success: false,
    error: 'Too many reset attempts. Please wait 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply CORS to all admin routes
router.use(adminCors);

// Production-safe database reset endpoint
router.post('/reset-database', adminResetLimiter, adminAuth, async (req, res) => {
  try {
    // Additional safety check
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PRODUCTION_RESET) {
      return res.status(403).json({
        success: false,
        error: 'Production reset not enabled. Set ALLOW_PRODUCTION_RESET=true to enable.'
      });
    }

    const { confirmationCode } = req.body;
    
    // Require confirmation code
    if (!confirmationCode || confirmationCode !== 'RESET_ALL_DATA_CONFIRMED') {
      return res.status(400).json({
        success: false,
        error: 'Invalid confirmation code. Required: RESET_ALL_DATA_CONFIRMED'
      });
    }

    console.log('🚨 ADMIN DATABASE RESET INITIATED');
    
    // Get counts before deletion for logging
    const counts = {
      users: await prisma.user.count(),
      posts: await prisma.post.count(),
      comments: await prisma.comment.count(),
      payments: await prisma.payment.count(),
    };

    // Delete data in proper order (respecting foreign key constraints)
    
    // 1. Analytics and performance data
    await prisma.apiResponseTime.deleteMany();
    await prisma.userEvent.deleteMany();
    await prisma.conversionFunnel.deleteMany();
    await prisma.performanceAlert.deleteMany();
    await prisma.performanceMetric.deleteMany();
    
    // 2. Payment and subscription data
    await prisma.paymentWebhook.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.usageHistory.deleteMany();
    
    // 3. Community interactions
    await prisma.notification.deleteMany();
    await prisma.commentLike.deleteMany();
    await prisma.postLike.deleteMany();
    
    // 4. Content
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    
    // 5. Authentication
    await prisma.verificationCode.deleteMany();
    await prisma.refreshToken.deleteMany();
    
    // 6. Users (must be last)
    await prisma.user.deleteMany();

    console.log('✅ Database reset completed successfully');
    console.log('📊 Deleted data:', counts);

    res.json({
      success: true,
      message: 'Database reset completed successfully',
      deletedCounts: counts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database reset failed',
      details: error.message
    });
  }
});

// Get database stats (for verification)
router.get('/database-stats', adminAuth, async (req, res) => {
  try {
    const stats = {
      users: await prisma.user.count(),
      posts: await prisma.post.count(),
      comments: await prisma.comment.count(),
      postLikes: await prisma.postLike.count(),
      commentLikes: await prisma.commentLike.count(),
      notifications: await prisma.notification.count(),
      payments: await prisma.payment.count(),
      subscriptions: await prisma.subscription.count(),
      refreshTokens: await prisma.refreshToken.count(),
      verificationCodes: await prisma.verificationCode.count(),
      performanceMetrics: await prisma.performanceMetric.count(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get database stats',
      details: error.message
    });
  }
});

// Generate admin key (for initial setup only)
router.post('/generate-admin-key', async (req, res) => {
  // Only allow if no admin key exists
  if (process.env.ADMIN_RESET_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Admin key already exists'
    });
  }

  const adminKey = crypto.randomBytes(32).toString('hex');
  
  res.json({
    success: true,
    adminKey,
    message: 'Add this key to your Render environment variables as ADMIN_RESET_KEY',
    instructions: [
      '1. Go to Render Dashboard → Your Service → Environment',
      '2. Add: ADMIN_RESET_KEY = ' + adminKey,
      '3. Optionally add: ALLOW_PRODUCTION_RESET = true',
      '4. Redeploy your service'
    ]
  });
});

// ===============================
// 测试账号管理功能
// ===============================

/**
 * 创建或更新测试账号
 * POST /api/admin/test-user
 */
router.post('/test-user', adminAuth, async (req, res) => {
  try {
    const { email, tier = 'VIP', username } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    // 检查用户是否已存在
    let user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      // 创建新测试用户
      user = await prisma.user.create({
        data: {
          email,
          username: username || email.split('@')[0],
          subscriptionTier: tier,
          subscriptionStatus: 'ACTIVE',
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年后过期
          monthlyUsage: 0,
          usageResetDate: new Date(),
          isTestAccount: true // 标记为测试账号
        }
      });
      
      console.log(`✅ Created test user: ${email} with ${tier} tier`);
    } else {
      // 更新现有用户为测试账号
      user = await prisma.user.update({
        where: { email },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: 'ACTIVE',
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          monthlyUsage: 0,
          usageResetDate: new Date(),
          isTestAccount: true
        }
      });
      
      console.log(`✅ Updated existing user to test account: ${email} with ${tier} tier`);
    }
    
    res.json({
      success: true,
      message: `Test user ${tier} account created/updated successfully`,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        tier: user.subscriptionTier,
        status: user.subscriptionStatus,
        subscriptionEnd: user.subscriptionEnd,
        isTestAccount: user.isTestAccount
      }
    });
    
  } catch (error) {
    console.error('Create test user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 重置用户使用量
 * POST /api/admin/reset-usage
 */
router.post('/reset-usage', adminAuth, async (req, res) => {
  try {
    const { email, userId } = req.body;
    
    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        error: 'Email or userId is required'
      });
    }
    
    const whereClause = email ? { email } : { id: userId };
    
    const user = await prisma.user.update({
      where: whereClause,
      data: {
        monthlyUsage: 0,
        usageResetDate: new Date()
      }
    });
    
    console.log(`✅ Reset usage for user: ${user.email}`);
    
    res.json({
      success: true,
      message: 'User usage reset successfully',
      user: {
        id: user.id,
        email: user.email,
        monthlyUsage: user.monthlyUsage,
        usageResetDate: user.usageResetDate
      }
    });
    
  } catch (error) {
    console.error('Reset usage error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 升级用户订阅
 * POST /api/admin/upgrade-user
 */
router.post('/upgrade-user', adminAuth, async (req, res) => {
  try {
    const { email, userId, tier = 'VIP', duration = 365 } = req.body;
    
    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        error: 'Email or userId is required'
      });
    }
    
    if (!['FREE', 'PRO', 'VIP'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier. Must be FREE, PRO, or VIP'
      });
    }
    
    const whereClause = email ? { email } : { id: userId };
    
    const user = await prisma.user.update({
      where: whereClause,
      data: {
        subscriptionTier: tier,
        subscriptionStatus: 'ACTIVE',
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        monthlyUsage: 0,
        usageResetDate: new Date()
      }
    });
    
    console.log(`✅ Upgraded user ${user.email} to ${tier} for ${duration} days`);
    
    res.json({
      success: true,
      message: `User upgraded to ${tier} for ${duration} days`,
      user: {
        id: user.id,
        email: user.email,
        tier: user.subscriptionTier,
        status: user.subscriptionStatus,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd
      }
    });
    
  } catch (error) {
    console.error('Upgrade user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取用户详细信息
 * GET /api/admin/user-info
 */
router.get('/user-info', adminAuth, async (req, res) => {
  try {
    const { email, userId } = req.query;
    
    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        error: 'Email or userId is required'
      });
    }
    
    const whereClause = email ? { email } : { id: userId };
    
    const user = await prisma.user.findUnique({
      where: whereClause,
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        usageHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const subscription = await subscriptionService.getUserSubscription(user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        monthlyUsage: user.monthlyUsage,
        usageResetDate: user.usageResetDate,
        isTestAccount: user.isTestAccount,
        createdAt: user.createdAt,
        remainingUsage: subscription.remainingUsage,
        limits: subscription.limits,
        recentSubscriptions: user.subscriptions,
        recentUsage: user.usageHistory
      }
    });
    
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 列出所有测试账号
 * GET /api/admin/test-users
 */
router.get('/test-users', adminAuth, async (req, res) => {
  try {
    const testUsers = await prisma.user.findMany({
      where: { isTestAccount: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        monthlyUsage: true,
        subscriptionEnd: true,
        usageResetDate: true,
        createdAt: true
      }
    });
    
    // 获取每个测试用户的剩余使用量
    const testUsersWithDetails = await Promise.all(
      testUsers.map(async (user) => {
        try {
          const subscription = await subscriptionService.getUserSubscription(user.id);
          return {
            ...user,
            remainingUsage: subscription.remainingUsage,
            limits: subscription.limits
          };
        } catch (error) {
          console.error(`Error getting subscription for user ${user.id}:`, error);
          return {
            ...user,
            remainingUsage: 'Error',
            limits: null
          };
        }
      })
    );
    
    res.json({
      success: true,
      testUsers: testUsersWithDetails,
      count: testUsers.length
    });
    
  } catch (error) {
    console.error('List test users error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量创建测试账号
 * POST /api/admin/batch-test-users
 */
router.post('/batch-test-users', adminAuth, async (req, res) => {
  try {
    const { count = 5, tier = 'VIP', emailPrefix = 'test' } = req.body;
    
    if (count > 50) {
      return res.status(400).json({
        success: false,
        error: 'Cannot create more than 50 test accounts at once'
      });
    }
    
    const createdUsers = [];
    
    for (let i = 1; i <= count; i++) {
      const email = `${emailPrefix}${i}@cosnap-test.com`;
      
      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        console.log(`⚠️  Test user already exists: ${email}`);
        continue;
      }
      
      const user = await prisma.user.create({
        data: {
          email,
          username: `${emailPrefix}${i}`,
          subscriptionTier: tier,
          subscriptionStatus: 'ACTIVE',
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          monthlyUsage: 0,
          usageResetDate: new Date(),
          isTestAccount: true
        }
      });
      
      createdUsers.push({
        id: user.id,
        email: user.email,
        username: user.username,
        tier: user.subscriptionTier
      });
    }
    
    console.log(`✅ Created ${createdUsers.length} test users with ${tier} tier`);
    
    res.json({
      success: true,
      message: `Created ${createdUsers.length} test users with ${tier} tier`,
      createdUsers,
      count: createdUsers.length
    });
    
  } catch (error) {
    console.error('Batch create test users error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
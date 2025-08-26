import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

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

export default router;
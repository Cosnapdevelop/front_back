const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting for feedback submissions
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 feedback submissions per windowMs
  message: 'Too many feedback submissions. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for screenshot uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/feedback');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `feedback-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

// Feedback validation rules
const feedbackValidation = [
  body('feedback').isJSON().withMessage('Feedback data must be valid JSON'),
  body('feedback').custom((value) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed.type || !['bug', 'suggestion', 'praise', 'rating'].includes(parsed.type)) {
        throw new Error('Invalid feedback type');
      }
      if (parsed.type === 'rating' && (!parsed.rating || parsed.rating < 1 || parsed.rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
      }
      if (parsed.type !== 'rating' && !parsed.message?.trim()) {
        throw new Error('Message is required for non-rating feedback');
      }
      return true;
    } catch (error) {
      throw new Error('Invalid feedback format');
    }
  })
];

// Create feedback tables if they don't exist
async function initializeFeedbackTables() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "UserFeedback" (
        "id" SERIAL PRIMARY KEY,
        "userId" TEXT,
        "sessionId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "category" TEXT,
        "rating" INTEGER,
        "message" TEXT,
        "screenshotPath" TEXT,
        "metadata" JSONB,
        "status" TEXT DEFAULT 'pending',
        "adminResponse" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "UserFeedback_userId_idx" ON "UserFeedback"("userId");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "UserFeedback_type_idx" ON "UserFeedback"("type");
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "UserFeedback_status_idx" ON "UserFeedback"("status");
    `;

    console.log('Feedback tables initialized successfully');
  } catch (error) {
    console.error('Error initializing feedback tables:', error);
  }
}

// Initialize tables on startup
initializeFeedbackTables();

/**
 * @route POST /api/feedback/submit
 * @desc Submit user feedback with optional screenshot
 * @access Public (but rate limited)
 */
router.post('/submit', 
  feedbackLimiter,
  upload.single('screenshot'),
  feedbackValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const feedbackData = JSON.parse(req.body.feedback);
      const screenshot = req.file;

      // Extract user ID from auth header if available
      let userId = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.userId;
        } catch (error) {
          // Continue without user ID for anonymous feedback
        }
      }

      // Save feedback to database
      const feedback = await prisma.$executeRaw`
        INSERT INTO "UserFeedback" (
          "userId", 
          "sessionId", 
          "type", 
          "category", 
          "rating", 
          "message", 
          "screenshotPath", 
          "metadata"
        ) VALUES (
          ${userId},
          ${feedbackData.metadata.sessionId},
          ${feedbackData.type},
          ${feedbackData.category},
          ${feedbackData.rating || null},
          ${feedbackData.message || null},
          ${screenshot ? screenshot.path : null},
          ${JSON.stringify(feedbackData.metadata)}
        )
      `;

      // Send email notification for urgent feedback
      if (feedbackData.type === 'bug' || (feedbackData.type === 'rating' && feedbackData.rating <= 2)) {
        await sendFeedbackNotification(feedbackData, userId, screenshot);
      }

      // Track analytics
      console.log(`Feedback received: ${feedbackData.type} from ${userId || 'anonymous'}`);

      res.status(201).json({
        message: 'Feedback submitted successfully',
        id: feedback.insertId || 'created',
        status: 'received'
      });

    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      // Clean up uploaded file if error occurs
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up uploaded file:', unlinkError);
        }
      }

      res.status(500).json({
        error: 'Failed to submit feedback',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * @route GET /api/feedback/list
 * @desc Get user's feedback history
 * @access Private
 */
router.get('/list', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = `"userId" = $1`;
    const params = [req.user.userId];
    let paramIndex = 2;

    if (type) {
      whereClause += ` AND "type" = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND "status" = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const feedback = await prisma.$queryRaw`
      SELECT 
        id,
        type,
        category,
        rating,
        message,
        status,
        "adminResponse",
        "createdAt",
        "updatedAt"
      FROM "UserFeedback"
      WHERE ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "UserFeedback"
      WHERE ${whereClause}
    `;

    res.json({
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount[0].count),
        pages: Math.ceil(totalCount[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      error: 'Failed to fetch feedback',
      message: error.message
    });
  }
});

/**
 * @route GET /api/feedback/analytics
 * @desc Get feedback analytics for admin dashboard
 * @access Admin only
 */
router.get('/analytics', auth, async (req, res) => {
  try {
    // Verify admin access
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { period = '7d' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case '24h':
        dateFilter = `AND "createdAt" >= NOW() - INTERVAL '24 hours'`;
        break;
      case '7d':
        dateFilter = `AND "createdAt" >= NOW() - INTERVAL '7 days'`;
        break;
      case '30d':
        dateFilter = `AND "createdAt" >= NOW() - INTERVAL '30 days'`;
        break;
      default:
        dateFilter = `AND "createdAt" >= NOW() - INTERVAL '7 days'`;
    }

    // Get feedback statistics
    const typeStats = await prisma.$queryRaw`
      SELECT 
        type,
        COUNT(*) as count,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating
      FROM "UserFeedback"
      WHERE 1=1 ${dateFilter}
      GROUP BY type
      ORDER BY count DESC
    `;

    const statusStats = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count
      FROM "UserFeedback"
      WHERE 1=1 ${dateFilter}
      GROUP BY status
    `;

    const categoryStats = await prisma.$queryRaw`
      SELECT 
        category,
        type,
        COUNT(*) as count
      FROM "UserFeedback"
      WHERE category IS NOT NULL ${dateFilter}
      GROUP BY category, type
      ORDER BY count DESC
      LIMIT 10
    `;

    const dailyTrends = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as count,
        AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating
      FROM "UserFeedback"
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `;

    const recentFeedback = await prisma.$queryRaw`
      SELECT 
        id,
        type,
        category,
        rating,
        message,
        "createdAt",
        CASE WHEN "userId" IS NOT NULL THEN 'registered' ELSE 'anonymous' END as user_type
      FROM "UserFeedback"
      WHERE 1=1 ${dateFilter}
      ORDER BY "createdAt" DESC
      LIMIT 20
    `;

    res.json({
      period,
      statistics: {
        byType: typeStats,
        byStatus: statusStats,
        byCategory: categoryStats,
        dailyTrends,
        recentFeedback
      },
      summary: {
        totalFeedback: typeStats.reduce((sum, item) => sum + parseInt(item.count), 0),
        averageRating: typeStats.find(item => item.type === 'rating')?.avg_rating || null,
        responseRate: statusStats.find(item => item.status === 'resolved')?.count || 0
      }
    });

  } catch (error) {
    console.error('Error fetching feedback analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

/**
 * @route PUT /api/feedback/:id/respond
 * @desc Admin response to feedback
 * @access Admin only
 */
router.put('/:id/respond', auth, async (req, res) => {
  try {
    // Verify admin access
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { response, status = 'resolved' } = req.body;

    if (!response?.trim()) {
      return res.status(400).json({ error: 'Response is required' });
    }

    await prisma.$executeRaw`
      UPDATE "UserFeedback"
      SET 
        "adminResponse" = ${response},
        "status" = ${status},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(id)}
    `;

    res.json({
      message: 'Response added successfully',
      status: 'updated'
    });

  } catch (error) {
    console.error('Error responding to feedback:', error);
    res.status(500).json({
      error: 'Failed to add response',
      message: error.message
    });
  }
});

// Email notification function
async function sendFeedbackNotification(feedbackData, userId, screenshot) {
  try {
    const emailService = require('../services/emailService');
    
    const subject = `Urgent Feedback: ${feedbackData.type.toUpperCase()} - ${feedbackData.category}`;
    const text = `
New ${feedbackData.type} feedback received:

Type: ${feedbackData.type}
Category: ${feedbackData.category}
Rating: ${feedbackData.rating || 'N/A'}
User: ${userId || 'Anonymous'}
Page: ${feedbackData.metadata.page}

Message:
${feedbackData.message || 'No message provided'}

Screenshot: ${screenshot ? 'Attached' : 'Not provided'}

Please review and respond promptly.
    `;

    await emailService.sendEmail({
      to: process.env.FEEDBACK_EMAIL || 'support@cosnap.ai',
      subject,
      text
    });

  } catch (error) {
    console.error('Error sending feedback notification:', error);
  }
}

module.exports = router;
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import monitoringService from '../services/monitoringService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many analytics requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize analytics tables
async function initializeAnalyticsTables() {
  try {
    // Create analytics tables if they don't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "UserAnalytics" (
        "id" SERIAL PRIMARY KEY,
        "userId" TEXT,
        "sessionId" TEXT NOT NULL,
        "event" TEXT NOT NULL,
        "eventData" JSONB,
        "userAgent" TEXT,
        "ipAddress" TEXT,
        "referrer" TEXT,
        "page" TEXT,
        "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deviceType" TEXT,
        "browser" TEXT,
        "os" TEXT,
        "country" TEXT,
        "city" TEXT
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PageViews" (
        "id" SERIAL PRIMARY KEY,
        "userId" TEXT,
        "sessionId" TEXT NOT NULL,
        "page" TEXT NOT NULL,
        "title" TEXT,
        "timeOnPage" INTEGER,
        "exitPage" BOOLEAN DEFAULT FALSE,
        "bounced" BOOLEAN DEFAULT FALSE,
        "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "userAgent" TEXT,
        "deviceType" TEXT
      );
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "UserSessions" (
        "id" SERIAL PRIMARY KEY,
        "sessionId" TEXT UNIQUE NOT NULL,
        "userId" TEXT,
        "startTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "endTime" TIMESTAMP,
        "duration" INTEGER,
        "pageViews" INTEGER DEFAULT 0,
        "actions" INTEGER DEFAULT 0,
        "converted" BOOLEAN DEFAULT FALSE,
        "conversionEvent" TEXT,
        "deviceType" TEXT,
        "browser" TEXT,
        "os" TEXT,
        "country" TEXT,
        "referrer" TEXT
      );
    `;

    // Create indexes for better performance
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "UserAnalytics_userId_idx" ON "UserAnalytics"("userId");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "UserAnalytics_event_idx" ON "UserAnalytics"("event");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "UserAnalytics_timestamp_idx" ON "UserAnalytics"("timestamp");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "PageViews_page_idx" ON "PageViews"("page");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "UserSessions_userId_idx" ON "UserSessions"("userId");
    `;

    console.log('Analytics tables initialized successfully');
  } catch (error) {
    console.error('Error initializing analytics tables:', error);
  }
}

// Initialize tables on startup
initializeAnalyticsTables();

// Helper function to get user agent info
function parseUserAgent(userAgent) {
  const deviceType = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 
                    /Tablet|iPad/.test(userAgent) ? 'tablet' : 'desktop';
  
  const browser = userAgent.includes('Chrome') ? 'Chrome' :
                 userAgent.includes('Firefox') ? 'Firefox' :
                 userAgent.includes('Safari') ? 'Safari' :
                 userAgent.includes('Edge') ? 'Edge' : 'Other';
  
  const os = userAgent.includes('Windows') ? 'Windows' :
            userAgent.includes('Mac') ? 'macOS' :
            userAgent.includes('Linux') ? 'Linux' :
            userAgent.includes('Android') ? 'Android' :
            userAgent.includes('iOS') ? 'iOS' : 'Other';
  
  return { deviceType, browser, os };
}

/**
 * @route POST /api/analytics/track
 * @desc Track user events and actions
 * @access Public (with rate limiting)
 */
router.post('/track', analyticsLimiter, async (req, res) => {
  try {
    const {
      event,
      eventData = {},
      sessionId,
      page,
      userId = null
    } = req.body;

    if (!event || !sessionId) {
      return res.status(400).json({
        error: 'Event and sessionId are required'
      });
    }

    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip || req.connection.remoteAddress;
    const referrer = req.get('Referrer') || '';
    
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Track the event
    await prisma.$executeRaw`
      INSERT INTO "UserAnalytics" (
        "userId", 
        "sessionId", 
        "event", 
        "eventData", 
        "userAgent", 
        "ipAddress", 
        "referrer", 
        "page",
        "deviceType",
        "browser",
        "os"
      ) VALUES (
        ${userId},
        ${sessionId},
        ${event},
        ${JSON.stringify(eventData)},
        ${userAgent},
        ${ipAddress},
        ${referrer},
        ${page},
        ${deviceType},
        ${browser},
        ${os}
      )
    `;

    // Update session data
    await prisma.$executeRaw`
      INSERT INTO "UserSessions" ("sessionId", "userId", "deviceType", "browser", "os", "referrer", "actions")
      VALUES (${sessionId}, ${userId}, ${deviceType}, ${browser}, ${os}, ${referrer}, 1)
      ON CONFLICT ("sessionId") 
      DO UPDATE SET 
        "actions" = "UserSessions"."actions" + 1,
        "endTime" = CURRENT_TIMESTAMP,
        "duration" = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - "UserSessions"."startTime"))::INTEGER
    `;

    // Track conversion events
    if (eventData.conversion) {
      await prisma.$executeRaw`
        UPDATE "UserSessions"
        SET "converted" = TRUE, "conversionEvent" = ${event}
        WHERE "sessionId" = ${sessionId}
      `;
    }

    res.json({
      message: 'Event tracked successfully',
      status: 'tracked'
    });

  } catch (error) {
    console.error('Error tracking analytics event:', error);
    monitoringService.error('Analytics tracking failed', error, {
      route: '/api/analytics/track'
    });
    
    res.status(500).json({
      error: 'Failed to track event',
      message: 'Please try again later'
    });
  }
});

/**
 * @route GET /api/analytics/dashboard
 * @desc Get analytics dashboard data
 * @access Private (requires advanced access)
 */
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Check access level
    const userAccess = await prisma.$queryRaw`
      SELECT "accessLevel" FROM "BetaUserAccess" WHERE "userId" = ${req.user.userId}
    `;

    const hasAccess = userAccess[0]?.accessLevel === 'DEVELOPER' || 
                     userAccess[0]?.accessLevel === 'ADVANCED' ||
                     req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Advanced or Developer access required'
      });
    }

    const { period = '7d' } = req.query;
    
    let dateFilter = '';
    switch (period) {
      case '1d':
        dateFilter = `AND timestamp >= NOW() - INTERVAL '24 hours'`;
        break;
      case '7d':
        dateFilter = `AND timestamp >= NOW() - INTERVAL '7 days'`;
        break;
      case '30d':
        dateFilter = `AND timestamp >= NOW() - INTERVAL '30 days'`;
        break;
      case '90d':
        dateFilter = `AND timestamp >= NOW() - INTERVAL '90 days'`;
        break;
      default:
        dateFilter = `AND timestamp >= NOW() - INTERVAL '7 days'`;
    }

    // Get user metrics
    const userMetrics = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT "userId") FILTER (WHERE "userId" IS NOT NULL) as total_users,
        COUNT(DISTINCT "sessionId") as total_sessions,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "timestamp" >= NOW() - INTERVAL '24 hours') as active_sessions,
        AVG("duration") FILTER (WHERE "duration" > 0) as avg_session_duration,
        COUNT(*) FILTER (WHERE "pageViews" = 1) * 100.0 / COUNT(*) as bounce_rate
      FROM "UserSessions"
      WHERE "startTime" >= NOW() - INTERVAL '${period === '1d' ? '24 hours' : period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}'
    `;

    // Get engagement metrics
    const engagementMetrics = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as page_views,
        COUNT(DISTINCT "sessionId") as unique_sessions,
        AVG("timeOnPage") FILTER (WHERE "timeOnPage" > 0) as avg_time_on_page,
        COUNT(*) FILTER (WHERE "userId" IS NOT NULL) * 100.0 / COUNT(*) as user_engagement_rate
      FROM "PageViews"
      WHERE "timestamp" >= NOW() - INTERVAL '${period === '1d' ? '24 hours' : period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}'
    `;

    // Get device metrics
    const deviceMetrics = await prisma.$queryRaw`
      SELECT 
        "deviceType",
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
      FROM "UserAnalytics"
      WHERE "timestamp" >= NOW() - INTERVAL '${period === '1d' ? '24 hours' : period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}'
      GROUP BY "deviceType"
    `;

    // Get browser metrics
    const browserMetrics = await prisma.$queryRaw`
      SELECT 
        "browser",
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
      FROM "UserAnalytics"
      WHERE "timestamp" >= NOW() - INTERVAL '${period === '1d' ? '24 hours' : period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}'
      GROUP BY "browser"
      ORDER BY count DESC
      LIMIT 5
    `;

    // Get top events
    const topEvents = await prisma.$queryRaw`
      SELECT 
        "event",
        COUNT(*) as count
      FROM "UserAnalytics"
      WHERE "timestamp" >= NOW() - INTERVAL '${period === '1d' ? '24 hours' : period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}'
      GROUP BY "event"
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get top pages
    const topPages = await prisma.$queryRaw`
      SELECT 
        "page",
        COUNT(*) as views
      FROM "PageViews"
      WHERE "timestamp" >= NOW() - INTERVAL '${period === '1d' ? '24 hours' : period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}'
      GROUP BY "page"
      ORDER BY views DESC
      LIMIT 10
    `;

    // Get real-time data
    const realTimeData = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT "sessionId") FILTER (WHERE "timestamp" >= NOW() - INTERVAL '5 minutes') as active_now,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "timestamp" >= NOW() - INTERVAL '30 minutes') as recent_sessions
      FROM "UserAnalytics"
    `;

    // Recent actions
    const recentActions = await prisma.$queryRaw`
      SELECT 
        "event" as action,
        "timestamp",
        "userId",
        "eventData" as metadata
      FROM "UserAnalytics"
      WHERE "timestamp" >= NOW() - INTERVAL '1 hour'
      ORDER BY "timestamp" DESC
      LIMIT 20
    `;

    const response = {
      userMetrics: {
        totalUsers: parseInt(userMetrics[0]?.total_users || 0),
        activeUsers: parseInt(userMetrics[0]?.active_sessions || 0),
        newUsers: Math.floor(parseInt(userMetrics[0]?.total_users || 0) * 0.3), // Estimate
        returningUsers: Math.floor(parseInt(userMetrics[0]?.total_users || 0) * 0.7), // Estimate
        avgSessionDuration: parseFloat(userMetrics[0]?.avg_session_duration || 0),
        bounceRate: parseFloat(userMetrics[0]?.bounce_rate || 0) / 100
      },
      
      engagementMetrics: {
        pageViews: parseInt(engagementMetrics[0]?.page_views || 0),
        uniquePageViews: parseInt(engagementMetrics[0]?.unique_sessions || 0),
        avgTimeOnPage: parseFloat(engagementMetrics[0]?.avg_time_on_page || 0),
        conversionRate: 0.12, // Would be calculated from actual conversion events
        clickThroughRate: 0.08, // Would be calculated from click events
        featureAdoption: topEvents.reduce((acc, event) => {
          acc[event.event] = parseInt(event.count) / parseInt(userMetrics[0]?.total_sessions || 1);
          return acc;
        }, {})
      },
      
      deviceMetrics: {
        ...deviceMetrics.reduce((acc, device) => {
          acc[device.deviceType] = parseFloat(device.percentage) / 100;
          return acc;
        }, {}),
        browsers: browserMetrics.reduce((acc, browser) => {
          acc[browser.browser] = parseFloat(browser.percentage) / 100;
          return acc;
        }, {})
      },
      
      realTimeData: {
        activeNow: parseInt(realTimeData[0]?.active_now || 0),
        currentSessions: parseInt(realTimeData[0]?.recent_sessions || 0),
        topPages: topPages.map(page => ({
          page: page.page,
          views: parseInt(page.views)
        })),
        recentActions: recentActions.map(action => ({
          action: action.action,
          timestamp: action.timestamp,
          userId: action.userId,
          metadata: action.metadata
        }))
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    monitoringService.error('Analytics dashboard fetch failed', error, {
      route: '/api/analytics/dashboard'
    });
    
    res.status(500).json({
      error: 'Failed to fetch analytics data',
      message: error.message
    });
  }
});

/**
 * @route POST /api/analytics/pageview
 * @desc Track page views
 * @access Public (with rate limiting)
 */
router.post('/pageview', analyticsLimiter, async (req, res) => {
  try {
    const {
      page,
      title,
      sessionId,
      userId = null,
      timeOnPage = null
    } = req.body;

    if (!page || !sessionId) {
      return res.status(400).json({
        error: 'Page and sessionId are required'
      });
    }

    const userAgent = req.get('User-Agent') || '';
    const { deviceType } = parseUserAgent(userAgent);

    // Track page view
    await prisma.$executeRaw`
      INSERT INTO "PageViews" (
        "userId", 
        "sessionId", 
        "page", 
        "title", 
        "timeOnPage", 
        "userAgent",
        "deviceType"
      ) VALUES (
        ${userId},
        ${sessionId},
        ${page},
        ${title},
        ${timeOnPage},
        ${userAgent},
        ${deviceType}
      )
    `;

    // Update session page views
    await prisma.$executeRaw`
      UPDATE "UserSessions"
      SET 
        "pageViews" = "pageViews" + 1,
        "endTime" = CURRENT_TIMESTAMP,
        "duration" = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - "startTime"))::INTEGER
      WHERE "sessionId" = ${sessionId}
    `;

    res.json({
      message: 'Page view tracked successfully',
      status: 'tracked'
    });

  } catch (error) {
    console.error('Error tracking page view:', error);
    monitoringService.error('Page view tracking failed', error, {
      route: '/api/analytics/pageview'
    });
    
    res.status(500).json({
      error: 'Failed to track page view',
      message: 'Please try again later'
    });
  }
});

/**
 * @route GET /api/analytics/realtime
 * @desc Get real-time analytics data
 * @access Private (requires advanced access)
 */
router.get('/realtime', auth, async (req, res) => {
  try {
    // Check access level (same as dashboard)
    const userAccess = await prisma.$queryRaw`
      SELECT "accessLevel" FROM "BetaUserAccess" WHERE "userId" = ${req.user.userId}
    `;

    const hasAccess = userAccess[0]?.accessLevel === 'DEVELOPER' || 
                     userAccess[0]?.accessLevel === 'ADVANCED' ||
                     req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Advanced or Developer access required'
      });
    }

    // Get real-time metrics
    const realTimeMetrics = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT "sessionId") FILTER (WHERE "timestamp" >= NOW() - INTERVAL '1 minute') as active_1min,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "timestamp" >= NOW() - INTERVAL '5 minutes') as active_5min,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "timestamp" >= NOW() - INTERVAL '15 minutes') as active_15min,
        COUNT(*) FILTER (WHERE "timestamp" >= NOW() - INTERVAL '1 minute') as events_1min
      FROM "UserAnalytics"
    `;

    // Current page views
    const currentPages = await prisma.$queryRaw`
      SELECT 
        "page",
        COUNT(*) as views
      FROM "PageViews"
      WHERE "timestamp" >= NOW() - INTERVAL '5 minutes'
      GROUP BY "page"
      ORDER BY views DESC
      LIMIT 5
    `;

    // Recent events
    const recentEvents = await prisma.$queryRaw`
      SELECT 
        "event",
        "timestamp",
        "page",
        "deviceType"
      FROM "UserAnalytics"
      WHERE "timestamp" >= NOW() - INTERVAL '10 minutes'
      ORDER BY "timestamp" DESC
      LIMIT 15
    `;

    res.json({
      activeUsers: {
        now: parseInt(realTimeMetrics[0]?.active_1min || 0),
        last5min: parseInt(realTimeMetrics[0]?.active_5min || 0),
        last15min: parseInt(realTimeMetrics[0]?.active_15min || 0)
      },
      eventsPerMinute: parseInt(realTimeMetrics[0]?.events_1min || 0),
      currentPages: currentPages.map(page => ({
        page: page.page,
        views: parseInt(page.views)
      })),
      recentEvents: recentEvents.map(event => ({
        event: event.event,
        timestamp: event.timestamp,
        page: event.page,
        deviceType: event.deviceType
      }))
    });

  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    monitoringService.error('Real-time analytics fetch failed', error, {
      route: '/api/analytics/realtime'
    });
    
    res.status(500).json({
      error: 'Failed to fetch real-time data',
      message: error.message
    });
  }
});



export default router;
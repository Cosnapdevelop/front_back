import express from 'express';
import { query, body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { 
  authLimiter, 
  sensitiveOperationLimiter 
} from '../middleware/rateLimiting.js';
import { sanitizeInput } from '../middleware/validation.js';
import { auth } from '../middleware/auth.js';
import productionAlertingService from '../services/productionAlertingService.js';
import monitoringService from '../services/monitoringService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Production health summary (admin only)
router.get(
  '/health-summary',
  authLimiter,
  auth,
  async (req, res) => {
    try {
      // Check if current user is admin or developer
      const currentUserBeta = await prisma.betaUserAccess.findUnique({
        where: { userId: req.user.id }
      });

      if (!currentUserBeta || !['DEVELOPER'].includes(currentUserBeta.accessLevel)) {
        return res.status(403).json({
          success: false,
          error: '权限不足，仅开发者可查看生产监控数据'
        });
      }

      const healthSummary = await productionAlertingService.getHealthSummary();

      return res.json({
        success: true,
        data: healthSummary
      });
    } catch (error) {
      console.error(`[监控] 获取健康摘要失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '获取健康摘要失败'
      });
    }
  }
);

// Production metrics dashboard (admin only)
router.get(
  '/metrics',
  authLimiter,
  auth,
  query('timeRange')
    .optional()
    .isIn(['1h', '24h', '7d'])
    .withMessage('时间范围必须是1h, 24h, 或7d'),
  async (req, res) => {
    try {
      // Check if current user is admin or developer
      const currentUserBeta = await prisma.betaUserAccess.findUnique({
        where: { userId: req.user.id }
      });

      if (!currentUserBeta || !['DEVELOPER'].includes(currentUserBeta.accessLevel)) {
        return res.status(403).json({
          success: false,
          error: '权限不足，仅开发者可查看生产指标'
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

      const { timeRange = '24h' } = req.query;
      const metrics = await productionAlertingService.getProductionMetrics(timeRange);

      return res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error(`[监控] 获取生产指标失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '获取生产指标失败'
      });
    }
  }
);

// Record production error (internal API)
router.post(
  '/error',
  sensitiveOperationLimiter,
  sanitizeInput,
  body('message')
    .notEmpty()
    .withMessage('错误消息不能为空'),
  body('stack')
    .optional()
    .isString()
    .withMessage('错误堆栈必须是字符串'),
  body('code')
    .optional()
    .isString()
    .withMessage('错误代码必须是字符串'),
  body('context')
    .optional()
    .isObject()
    .withMessage('上下文必须是对象'),
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

      const { message, stack, code, context } = req.body;
      const error = new Error(message);
      if (stack) error.stack = stack;
      if (code) error.code = code;

      const errorContext = {
        ...context,
        userId: req.user?.id,
        endpoint: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      };

      await productionAlertingService.recordError(error, errorContext);

      return res.json({
        success: true,
        message: '错误记录成功'
      });
    } catch (error) {
      console.error(`[监控] 记录生产错误失败 - IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '记录生产错误失败'
      });
    }
  }
);

// Record performance metric (internal API)
router.post(
  '/performance',
  authLimiter,
  sanitizeInput,
  body('metric')
    .notEmpty()
    .withMessage('指标名称不能为空'),
  body('value')
    .isNumeric()
    .withMessage('指标值必须是数字'),
  body('context')
    .optional()
    .isObject()
    .withMessage('上下文必须是对象'),
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

      const { metric, value, context } = req.body;
      const performanceContext = {
        ...context,
        userId: req.user?.id,
        endpoint: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      };

      await productionAlertingService.recordPerformanceIssue(metric, value, performanceContext);

      return res.json({
        success: true,
        message: '性能指标记录成功'
      });
    } catch (error) {
      console.error(`[监控] 记录性能指标失败 - IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '记录性能指标失败'
      });
    }
  }
);

// Get recent alerts (admin only)
router.get(
  '/alerts',
  authLimiter,
  auth,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('限制数量必须在1-100之间'),
  query('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('严重程度必须是low, medium, high, 或critical'),
  query('acknowledged')
    .optional()
    .isBoolean()
    .withMessage('确认状态必须是布尔值'),
  async (req, res) => {
    try {
      // Check if current user is admin or developer
      const currentUserBeta = await prisma.betaUserAccess.findUnique({
        where: { userId: req.user.id }
      });

      if (!currentUserBeta || !['DEVELOPER'].includes(currentUserBeta.accessLevel)) {
        return res.status(403).json({
          success: false,
          error: '权限不足，仅开发者可查看警报'
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

      const { limit = 50, severity, acknowledged } = req.query;

      const where = {};
      if (severity) where.severity = severity;
      if (acknowledged !== undefined) where.acknowledged = acknowledged === 'true';

      const alerts = await prisma.productionAlert.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit)
      });

      return res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      console.error(`[监控] 获取警报失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '获取警报失败'
      });
    }
  }
);

// Acknowledge alert (admin only)
router.put(
  '/alerts/:alertId/acknowledge',
  sensitiveOperationLimiter,
  sanitizeInput,
  auth,
  async (req, res) => {
    try {
      // Check if current user is admin or developer
      const currentUserBeta = await prisma.betaUserAccess.findUnique({
        where: { userId: req.user.id }
      });

      if (!currentUserBeta || !['DEVELOPER'].includes(currentUserBeta.accessLevel)) {
        return res.status(403).json({
          success: false,
          error: '权限不足，仅开发者可确认警报'
        });
      }

      const { alertId } = req.params;

      const alert = await prisma.productionAlert.update({
        where: { id: alertId },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: req.user.id
        }
      });

      console.log(`[监控] 警报已确认 - 警报ID: ${alertId}, 确认者: ${req.user.username} (${req.user.id}), IP: ${req.ip}`);

      return res.json({
        success: true,
        message: '警报确认成功',
        data: alert
      });
    } catch (error) {
      console.error(`[监控] 确认警报失败 - 用户: ${req.user?.id}, 警报ID: ${req.params.alertId}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '确认警报失败'
      });
    }
  }
);

// Resolve alert (admin only)
router.put(
  '/alerts/:alertId/resolve',
  sensitiveOperationLimiter,
  sanitizeInput,
  auth,
  async (req, res) => {
    try {
      // Check if current user is admin or developer
      const currentUserBeta = await prisma.betaUserAccess.findUnique({
        where: { userId: req.user.id }
      });

      if (!currentUserBeta || !['DEVELOPER'].includes(currentUserBeta.accessLevel)) {
        return res.status(403).json({
          success: false,
          error: '权限不足，仅开发者可解决警报'
        });
      }

      const { alertId } = req.params;

      const alert = await prisma.productionAlert.update({
        where: { id: alertId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          acknowledged: true, // Auto-acknowledge when resolving
          acknowledgedAt: new Date(),
          acknowledgedBy: req.user.id
        }
      });

      console.log(`[监控] 警报已解决 - 警报ID: ${alertId}, 解决者: ${req.user.username} (${req.user.id}), IP: ${req.ip}`);

      return res.json({
        success: true,
        message: '警报解决成功',
        data: alert
      });
    } catch (error) {
      console.error(`[监控] 解决警报失败 - 用户: ${req.user?.id}, 警报ID: ${req.params.alertId}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '解决警报失败'
      });
    }
  }
);

// Get recent production errors (admin only)
router.get(
  '/errors',
  authLimiter,
  auth,
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('限制数量必须在1-100之间'),
  query('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('严重程度必须是low, medium, high, 或critical'),
  query('resolved')
    .optional()
    .isBoolean()
    .withMessage('解决状态必须是布尔值'),
  async (req, res) => {
    try {
      // Check if current user is admin or developer
      const currentUserBeta = await prisma.betaUserAccess.findUnique({
        where: { userId: req.user.id }
      });

      if (!currentUserBeta || !['DEVELOPER'].includes(currentUserBeta.accessLevel)) {
        return res.status(403).json({
          success: false,
          error: '权限不足，仅开发者可查看生产错误'
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

      const { limit = 50, severity, resolved } = req.query;

      const where = {};
      if (severity) where.severity = severity;
      if (resolved !== undefined) where.resolved = resolved === 'true';

      const productionErrors = await prisma.productionError.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
        select: {
          id: true,
          timestamp: true,
          message: true,
          code: true,
          severity: true,
          endpoint: true,
          userId: true,
          ip: true,
          resolved: true,
          resolvedAt: true,
          resolvedBy: true
        }
      });

      return res.json({
        success: true,
        data: productionErrors,
        count: productionErrors.length
      });
    } catch (error) {
      console.error(`[监控] 获取生产错误失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '获取生产错误失败'
      });
    }
  }
);

// Resolve production error (admin only)
router.put(
  '/errors/:errorId/resolve',
  sensitiveOperationLimiter,
  sanitizeInput,
  auth,
  async (req, res) => {
    try {
      // Check if current user is admin or developer
      const currentUserBeta = await prisma.betaUserAccess.findUnique({
        where: { userId: req.user.id }
      });

      if (!currentUserBeta || !['DEVELOPER'].includes(currentUserBeta.accessLevel)) {
        return res.status(403).json({
          success: false,
          error: '权限不足，仅开发者可解决错误'
        });
      }

      const { errorId } = req.params;

      const productionError = await prisma.productionError.update({
        where: { id: errorId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: req.user.id
        }
      });

      console.log(`[监控] 生产错误已解决 - 错误ID: ${errorId}, 解决者: ${req.user.username} (${req.user.id}), IP: ${req.ip}`);

      return res.json({
        success: true,
        message: '生产错误解决成功',
        data: productionError
      });
    } catch (error) {
      console.error(`[监控] 解决生产错误失败 - 用户: ${req.user?.id}, 错误ID: ${req.params.errorId}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '解决生产错误失败'
      });
    }
  }
);

// System resource monitoring
router.get(
  '/system',
  authLimiter,
  async (req, res) => {
    try {
      const systemInfo = {
        timestamp: new Date(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        environment: process.env.NODE_ENV || 'development'
      };

      // Add formatted memory usage
      const memUsage = systemInfo.memory;
      systemInfo.memoryFormatted = {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
        heapUsagePercent: `${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)}%`
      };

      // Add uptime formatted
      const uptime = systemInfo.uptime;
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      systemInfo.uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;

      return res.json({
        success: true,
        data: systemInfo
      });
    } catch (error) {
      console.error(`[监控] 获取系统信息失败 - IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '获取系统信息失败'
      });
    }
  }
);

// Prometheus metrics endpoint (for external monitoring)
router.get(
  '/prometheus',
  async (req, res) => {
    try {
      const metrics = monitoringService.getMetrics();
      res.set('Content-Type', monitoringService.getMetricsContentType());
      res.end(metrics);
    } catch (error) {
      console.error(`[监控] 获取Prometheus指标失败 - IP: ${req.ip}, 错误:`, error);
      res.status(500).json({
        success: false,
        error: '获取监控指标失败'
      });
    }
  }
);

export default router;
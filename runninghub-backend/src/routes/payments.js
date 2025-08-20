import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  validatePaymentCreation,
  validatePaymentQuery,
  validateRefundRequest,
  checkSubscriptionStatus,
  checkFeatureAccess,
  recordFeatureUsage,
  parseWeChatPayWebhook,
  parseAlipayWebhook,
  rateLimitPayment,
  validateClientIP,
  validateUserAgent,
  checkPaymentSecurity,
  formatErrorResponse,
  logPaymentOperation
} from '../middleware/chinesePayment.js';
import PaymentGateway from '../services/paymentGateway.js';
import SubscriptionService from '../services/subscriptionService.js';
import WeChatPayService from '../services/wechatPayService.js';
import AlipayService from '../services/alipayService.js';

const router = express.Router();
const paymentGateway = new PaymentGateway();
const subscriptionService = new SubscriptionService();
const wechatPay = new WeChatPayService();
const alipay = new AlipayService();

/**
 * Chinese Payment Routes for Cosnap AI
 * 中国支付系统API路由
 */

// ==================== 订阅和价格信息 ====================

/**
 * 获取订阅价格表
 * GET /api/payments/pricing
 */
router.get('/pricing', (req, res) => {
  try {
    const pricing = paymentGateway.getSubscriptionPrices();
    const tiers = subscriptionService.getSubscriptionTiers();
    const paymentMethods = paymentGateway.getAvailablePaymentMethods();
    
    res.json({
      success: true,
      data: {
        pricing,
        tiers,
        paymentMethods
      }
    });
  } catch (error) {
    formatErrorResponse(error, req, res);
  }
});

/**
 * 获取用户订阅状态
 * GET /api/payments/subscription
 */
router.get('/subscription', 
  authenticateToken,
  checkSubscriptionStatus,
  logPaymentOperation('get_subscription'),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: req.userSubscription
      });
    } catch (error) {
      formatErrorResponse(error, req, res);
    }
  }
);

/**
 * 获取用户使用统计
 * GET /api/payments/usage-stats
 */
router.get('/usage-stats',
  authenticateToken,
  logPaymentOperation('get_usage_stats'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const stats = await subscriptionService.getUserUsageStats(
        req.user.id,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      formatErrorResponse(error, req, res);
    }
  }
);

// ==================== 支付订单管理 ====================

/**
 * 创建支付订单
 * POST /api/payments/create-order
 */
router.post('/create-order',
  authenticateToken,
  validateClientIP,
  validateUserAgent,
  checkPaymentSecurity,
  rateLimitPayment,
  validatePaymentCreation,
  logPaymentOperation('create_order'),
  async (req, res) => {
    try {
      const {
        subscriptionTier,
        billingCycle,
        paymentMethod,
        tradeType = 'JSAPI',
        openId
      } = req.body;

      const orderData = {
        userId: req.user.id,
        subscriptionTier,
        billingCycle,
        paymentMethod,
        tradeType,
        clientIp: req.clientIP,
        userAgent: req.userAgent,
        openId
      };

      const result = await paymentGateway.createPaymentOrder(orderData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      formatErrorResponse(error, req, res);
    }
  }
);

/**
 * 查询支付状态
 * GET /api/payments/:paymentId/status
 */
router.get('/:paymentId/status',
  authenticateToken,
  validatePaymentQuery,
  logPaymentOperation('query_payment'),
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const result = await paymentGateway.queryPaymentStatus(paymentId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      formatErrorResponse(error, req, res);
    }
  }
);

/**
 * 申请退款
 * POST /api/payments/refund
 */
router.post('/refund',
  authenticateToken,
  validateRefundRequest,
  logPaymentOperation('refund'),
  async (req, res) => {
    try {
      const { paymentId, refundReason } = req.body;
      const result = await paymentGateway.refund(paymentId, refundReason);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      formatErrorResponse(error, req, res);
    }
  }
);

// ==================== 订阅管理 ====================

/**
 * 取消订阅
 * POST /api/payments/cancel-subscription
 */
router.post('/cancel-subscription',
  authenticateToken,
  logPaymentOperation('cancel_subscription'),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const result = await subscriptionService.cancelSubscription(req.user.id, reason);
      
      res.json(result);
    } catch (error) {
      formatErrorResponse(error, req, res);
    }
  }
);

// ==================== 微信支付回调 ====================

/**
 * 微信支付异步通知回调
 * POST /api/payments/webhooks/wechat
 */
router.post('/webhooks/wechat',
  parseWeChatPayWebhook,
  logPaymentOperation('wechat_webhook'),
  async (req, res) => {
    try {
      const result = await paymentGateway.handlePaymentNotification('WECHAT_PAY', req.webhookData);
      
      if (result.success) {
        // 返回微信要求的成功响应格式
        res.set('Content-Type', 'application/xml');
        res.send(wechatPay.generateSuccessResponse());
      } else {
        res.set('Content-Type', 'application/xml');
        res.send(wechatPay.generateFailResponse(result.error));
      }
    } catch (error) {
      console.error('WeChat Pay webhook error:', error);
      res.set('Content-Type', 'application/xml');
      res.send(wechatPay.generateFailResponse('处理失败'));
    }
  }
);

/**
 * 微信支付同步返回回调
 * GET /api/payments/return/wechat
 */
router.get('/return/wechat',
  logPaymentOperation('wechat_return'),
  async (req, res) => {
    try {
      // 微信支付成功后的页面跳转处理
      const { out_trade_no, result_code } = req.query;
      
      if (result_code === 'SUCCESS') {
        res.redirect(`${process.env.FRONTEND_URL}/payment/success?order=${out_trade_no}`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/payment/failed?order=${out_trade_no}`);
      }
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
  }
);

// ==================== 支付宝回调 ====================

/**
 * 支付宝异步通知回调
 * POST /api/payments/webhooks/alipay
 */
router.post('/webhooks/alipay',
  parseAlipayWebhook,
  logPaymentOperation('alipay_webhook'),
  async (req, res) => {
    try {
      const result = await paymentGateway.handlePaymentNotification('ALIPAY', req.webhookData);
      
      if (result.success) {
        res.send(alipay.generateSuccessResponse());
      } else {
        res.send(alipay.generateFailResponse());
      }
    } catch (error) {
      console.error('Alipay webhook error:', error);
      res.send(alipay.generateFailResponse());
    }
  }
);

/**
 * 支付宝同步返回回调
 * GET /api/payments/return/alipay
 */
router.get('/return/alipay',
  logPaymentOperation('alipay_return'),
  async (req, res) => {
    try {
      const isValid = alipay.validateReturnUrl(req.query);
      
      if (isValid && req.query.trade_status === 'TRADE_SUCCESS') {
        res.redirect(`${process.env.FRONTEND_URL}/payment/success?order=${req.query.out_trade_no}`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/payment/failed?order=${req.query.out_trade_no}`);
      }
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
  }
);

// ==================== 管理员功能 ====================

/**
 * 获取支付统计（管理员）
 * GET /api/payments/admin/stats
 */
router.get('/admin/stats',
  authenticateToken,
  // 这里应该添加管理员权限检查中间件
  logPaymentOperation('admin_stats'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // 这里可以实现管理员统计功能
      // 暂时返回基础信息
      res.json({
        success: true,
        message: '管理员统计功能待实现',
        data: {
          totalPayments: 0,
          totalRevenue: 0,
          activeSubscriptions: 0
        }
      });
    } catch (error) {
      formatErrorResponse(error, req, res);
    }
  }
);

/**
 * 手动处理支付回调（管理员）
 * POST /api/payments/admin/manual-webhook
 */
router.post('/admin/manual-webhook',
  authenticateToken,
  // 这里应该添加管理员权限检查中间件
  logPaymentOperation('manual_webhook'),
  async (req, res) => {
    try {
      const { paymentMethod, webhookData } = req.body;
      
      const result = await paymentGateway.handlePaymentNotification(paymentMethod, webhookData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      formatErrorResponse(error, req, res);
    }
  }
);

// ==================== 测试接口 ====================

/**
 * 测试支付环境
 * GET /api/payments/test
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Chinese Payment System is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    features: {
      wechatPay: !!process.env.WECHAT_APP_ID,
      alipay: !!process.env.ALIPAY_APP_ID,
      database: true
    }
  });
});

// ==================== 健康检查 ====================

/**
 * 支付系统健康检查
 * GET /api/payments/health
 */
router.get('/health', async (req, res) => {
  try {
    const checks = {
      database: false,
      wechatPay: false,
      alipay: false
    };

    // 检查数据库连接
    try {
      await subscriptionService.getSubscriptionTiers();
      checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // 检查微信支付配置
    if (process.env.WECHAT_APP_ID && process.env.WECHAT_MCH_ID && process.env.WECHAT_API_KEY) {
      checks.wechatPay = true;
    }

    // 检查支付宝配置
    if (process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY) {
      checks.alipay = true;
    }

    const allHealthy = Object.values(checks).every(status => status);

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 错误处理中间件
router.use(formatErrorResponse);

export default router;
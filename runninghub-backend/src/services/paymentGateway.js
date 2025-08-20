import WeChatPayService from './wechatPayService.js';
import AlipayService from './alipayService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Payment Gateway Abstraction Layer
 * 中国支付网关统一接口层
 * 
 * 提供统一的支付接口，支持微信支付和支付宝支付
 */
class PaymentGateway {
  constructor() {
    this.wechatPay = new WeChatPayService();
    this.alipay = new AlipayService();
    
    // 支付方式映射
    this.paymentMethods = {
      WECHAT_PAY: 'wechat',
      ALIPAY: 'alipay'
    };

    // 订阅价格配置（人民币）
    this.subscriptionPrices = {
      PRO: {
        monthly: 29.9,
        quarterly: 79.9,   // 3个月
        yearly: 299.9      // 12个月
      },
      VIP: {
        monthly: 59.9,
        quarterly: 159.9,  // 3个月
        yearly: 599.9      // 12个月
      }
    };
  }

  /**
   * 生成统一订单号
   */
  generateOrderNumber(prefix = 'COSNAP') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 创建支付订单
   * @param {Object} orderData - 订单数据
   * @param {string} orderData.userId - 用户ID
   * @param {string} orderData.paymentMethod - 支付方式
   * @param {string} orderData.subscriptionTier - 订阅等级
   * @param {string} orderData.billingCycle - 计费周期
   * @param {string} orderData.clientIp - 客户端IP
   * @param {string} orderData.userAgent - 用户代理
   * @param {string} orderData.openId - 微信OpenID（微信支付必填）
   */
  async createPaymentOrder(orderData) {
    try {
      const {
        userId,
        paymentMethod,
        subscriptionTier,
        billingCycle = 'monthly',
        clientIp,
        userAgent,
        openId,
        tradeType = 'JSAPI'
      } = orderData;

      // 验证订阅等级和价格
      if (!this.subscriptionPrices[subscriptionTier]) {
        throw new Error(`不支持的订阅等级: ${subscriptionTier}`);
      }

      const price = this.subscriptionPrices[subscriptionTier][billingCycle];
      if (!price) {
        throw new Error(`不支持的计费周期: ${billingCycle}`);
      }

      // 生成订单号
      const outTradeNo = this.generateOrderNumber();
      
      // 构建订单描述
      const tierNames = { PRO: '专业版', VIP: '会员版' };
      const cycleNames = { monthly: '月度', quarterly: '季度', yearly: '年度' };
      const description = `Cosnap AI ${tierNames[subscriptionTier]} ${cycleNames[billingCycle]}订阅`;

      // 创建数据库支付记录
      const payment = await prisma.payment.create({
        data: {
          userId,
          paymentMethod,
          status: 'PENDING',
          amountRMB: price,
          currency: 'CNY',
          description,
          ...(paymentMethod === 'WECHAT_PAY' && { wechatOrderId: outTradeNo }),
          ...(paymentMethod === 'ALIPAY' && { alipayOutTradeNo: outTradeNo }),
          ...(openId && { openId })
        }
      });

      // 根据支付方式创建支付订单
      let paymentResult;
      
      if (paymentMethod === 'WECHAT_PAY') {
        paymentResult = await this.createWeChatPayOrder({
          outTradeNo,
          body: description,
          totalFee: Math.round(price * 100), // 转换为分
          spbillCreateIp: clientIp,
          openid: openId,
          tradeType
        });
      } else if (paymentMethod === 'ALIPAY') {
        paymentResult = await this.createAlipayOrder({
          outTradeNo,
          subject: description,
          totalAmount: price,
          body: description,
          tradeType: tradeType === 'JSAPI' ? 'wap' : 'web'
        });
      } else {
        throw new Error(`不支持的支付方式: ${paymentMethod}`);
      }

      // 更新支付记录
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          ...(paymentMethod === 'WECHAT_PAY' && { 
            wechatOrderId: paymentResult.data?.prepay_id 
          }),
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        paymentId: payment.id,
        outTradeNo,
        paymentData: paymentResult,
        amount: price,
        currency: 'CNY'
      };

    } catch (error) {
      console.error('Payment order creation error:', error);
      throw new Error(`创建支付订单失败: ${error.message}`);
    }
  }

  /**
   * 创建微信支付订单
   */
  async createWeChatPayOrder(orderData) {
    try {
      return await this.wechatPay.createUnifiedOrder(orderData);
    } catch (error) {
      console.error('WeChat Pay order creation error:', error);
      throw error;
    }
  }

  /**
   * 创建支付宝订单
   */
  async createAlipayOrder(orderData) {
    try {
      if (orderData.tradeType === 'wap') {
        return await this.alipay.createWapPayment(orderData);
      } else if (orderData.tradeType === 'qr') {
        return await this.alipay.createQRPayment(orderData);
      } else {
        return await this.alipay.createWebPayment(orderData);
      }
    } catch (error) {
      console.error('Alipay order creation error:', error);
      throw error;
    }
  }

  /**
   * 查询支付状态
   */
  async queryPaymentStatus(paymentId) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: true }
      });

      if (!payment) {
        throw new Error('支付记录不存在');
      }

      let queryResult;
      
      if (payment.paymentMethod === 'WECHAT_PAY') {
        queryResult = await this.wechatPay.queryOrder(
          payment.wechatOrderId,
          payment.wechatTransactionId
        );
      } else if (payment.paymentMethod === 'ALIPAY') {
        queryResult = await this.alipay.queryOrder(
          payment.alipayOutTradeNo,
          payment.alipayTradeNo
        );
      } else {
        throw new Error(`不支持的支付方式: ${payment.paymentMethod}`);
      }

      // 如果支付成功，更新支付状态
      if (queryResult.isPaid && payment.status === 'PENDING') {
        await this.handlePaymentSuccess(payment, queryResult.data);
      }

      return {
        success: true,
        payment,
        queryResult,
        isPaid: queryResult.isPaid
      };

    } catch (error) {
      console.error('Payment status query error:', error);
      throw new Error(`查询支付状态失败: ${error.message}`);
    }
  }

  /**
   * 处理支付成功回调
   */
  async handlePaymentNotification(paymentMethod, notificationData) {
    try {
      let result;
      
      if (paymentMethod === 'WECHAT_PAY') {
        result = await this.wechatPay.handleNotification(notificationData);
      } else if (paymentMethod === 'ALIPAY') {
        result = await this.alipay.handleNotification(notificationData);
      } else {
        throw new Error(`不支持的支付方式: ${paymentMethod}`);
      }

      if (result.success) {
        // 查找对应的支付记录
        const whereClause = paymentMethod === 'WECHAT_PAY' 
          ? { wechatOrderId: result.data.outTradeNo }
          : { alipayOutTradeNo: result.data.outTradeNo };

        const payment = await prisma.payment.findFirst({
          where: whereClause,
          include: { user: true }
        });

        if (payment && payment.status === 'PENDING') {
          await this.handlePaymentSuccess(payment, result.data);
          
          return {
            success: true,
            processed: true,
            payment
          };
        }
      }

      return {
        success: result.success,
        processed: false,
        error: result.error
      };

    } catch (error) {
      console.error('Payment notification handling error:', error);
      throw new Error(`处理支付回调失败: ${error.message}`);
    }
  }

  /**
   * 处理支付成功逻辑
   */
  async handlePaymentSuccess(payment, paymentData) {
    try {
      await prisma.$transaction(async (tx) => {
        // 更新支付状态
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            webhookReceived: true,
            webhookVerified: true,
            ...(payment.paymentMethod === 'WECHAT_PAY' && {
              wechatTransactionId: paymentData.transactionId,
              openId: paymentData.openid
            }),
            ...(payment.paymentMethod === 'ALIPAY' && {
              alipayTradeNo: paymentData.tradeNo,
              buyerId: paymentData.buyerId
            })
          }
        });

        // 解析订阅信息
        const subscriptionInfo = this.parseSubscriptionFromDescription(payment.description);
        
        if (subscriptionInfo) {
          // 计算订阅结束时间
          const startDate = new Date();
          const endDate = this.calculateSubscriptionEndDate(startDate, subscriptionInfo.cycle);

          // 创建或更新订阅
          const existingSubscription = await tx.subscription.findFirst({
            where: { 
              userId: payment.userId,
              status: 'ACTIVE'
            }
          });

          if (existingSubscription) {
            // 延长现有订阅
            await tx.subscription.update({
              where: { id: existingSubscription.id },
              data: {
                endDate: this.calculateSubscriptionEndDate(existingSubscription.endDate, subscriptionInfo.cycle),
                updatedAt: new Date()
              }
            });
          } else {
            // 创建新订阅
            await tx.subscription.create({
              data: {
                userId: payment.userId,
                tier: subscriptionInfo.tier,
                status: 'ACTIVE',
                startDate,
                endDate,
                priceRMB: payment.amountRMB,
                paymentMethod: payment.paymentMethod
              }
            });
          }

          // 更新用户订阅状态
          await tx.user.update({
            where: { id: payment.userId },
            data: {
              subscriptionTier: subscriptionInfo.tier,
              subscriptionStatus: 'ACTIVE',
              subscriptionStart: startDate,
              subscriptionEnd: endDate,
              monthlyUsage: 0, // 重置使用量
              usageResetDate: startDate
            }
          });
        }
      });

      console.log(`Payment success processed for payment ID: ${payment.id}`);
      
    } catch (error) {
      console.error('Payment success handling error:', error);
      throw error;
    }
  }

  /**
   * 解析订阅信息从描述中
   */
  parseSubscriptionFromDescription(description) {
    try {
      // 从描述中解析订阅等级和周期
      // 例如: "Cosnap AI 专业版 月度订阅"
      const tierMap = { '专业版': 'PRO', '会员版': 'VIP' };
      const cycleMap = { '月度': 'monthly', '季度': 'quarterly', '年度': 'yearly' };
      
      let tier = null;
      let cycle = null;
      
      for (const [key, value] of Object.entries(tierMap)) {
        if (description.includes(key)) {
          tier = value;
          break;
        }
      }
      
      for (const [key, value] of Object.entries(cycleMap)) {
        if (description.includes(key)) {
          cycle = value;
          break;
        }
      }
      
      return tier && cycle ? { tier, cycle } : null;
    } catch (error) {
      console.error('Subscription parsing error:', error);
      return null;
    }
  }

  /**
   * 计算订阅结束时间
   */
  calculateSubscriptionEndDate(startDate, cycle) {
    const date = new Date(startDate);
    
    switch (cycle) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    
    return date;
  }

  /**
   * 申请退款
   */
  async refund(paymentId, refundReason = '用户申请退款') {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: true }
      });

      if (!payment) {
        throw new Error('支付记录不存在');
      }

      if (payment.status !== 'PAID') {
        throw new Error('只有已支付的订单才能申请退款');
      }

      let refundResult;
      
      if (payment.paymentMethod === 'WECHAT_PAY') {
        refundResult = await this.wechatPay.refund({
          outTradeNo: payment.wechatOrderId,
          outRefundNo: this.generateOrderNumber('REFUND'),
          totalFee: Math.round(parseFloat(payment.amountRMB) * 100),
          refundFee: Math.round(parseFloat(payment.amountRMB) * 100),
          refundDesc: refundReason
        });
      } else if (payment.paymentMethod === 'ALIPAY') {
        refundResult = await this.alipay.refund({
          outTradeNo: payment.alipayOutTradeNo,
          tradeNo: payment.alipayTradeNo,
          refundAmount: parseFloat(payment.amountRMB),
          refundReason,
          outRequestNo: this.generateOrderNumber('REFUND')
        });
      } else {
        throw new Error(`不支持的支付方式: ${payment.paymentMethod}`);
      }

      if (refundResult.success) {
        // 更新支付状态
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
            refundedAt: new Date()
          }
        });

        // 取消用户订阅
        await prisma.user.update({
          where: { id: payment.userId },
          data: {
            subscriptionStatus: 'CANCELLED'
          }
        });
      }

      return refundResult;

    } catch (error) {
      console.error('Refund error:', error);
      throw new Error(`退款申请失败: ${error.message}`);
    }
  }

  /**
   * 获取支付方式列表
   */
  getAvailablePaymentMethods() {
    return [
      {
        code: 'WECHAT_PAY',
        name: '微信支付',
        icon: 'wechat',
        description: '使用微信客户端支付'
      },
      {
        code: 'ALIPAY',
        name: '支付宝',
        icon: 'alipay',
        description: '使用支付宝客户端支付'
      }
    ];
  }

  /**
   * 获取订阅价格表
   */
  getSubscriptionPrices() {
    return this.subscriptionPrices;
  }
}

export default PaymentGateway;
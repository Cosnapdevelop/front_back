import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Subscription Service for Cosnap AI
 * 中国市场订阅服务管理
 * 
 * 管理用户订阅状态、使用限制和升级/降级逻辑
 */
class SubscriptionService {
  constructor() {
    // 订阅等级配置
    this.subscriptionLimits = {
      FREE: {
        monthlyLimit: 5,           // 每月5次AI特效处理
        hasWatermark: true,        // 带水印
        priorityProcessing: false, // 无优先处理
        exclusiveEffects: false,   // 无独家特效
        supportLevel: 'community'  // 社区支持
      },
      PRO: {
        monthlyLimit: -1,          // 无限特效处理
        hasWatermark: false,       // 无水印
        priorityProcessing: true,  // 优先处理
        exclusiveEffects: false,   // 无独家特效
        supportLevel: 'email'      // 邮件支持
      },
      VIP: {
        monthlyLimit: -1,          // 无限特效处理
        hasWatermark: false,       // 无水印
        priorityProcessing: true,  // 优先处理
        exclusiveEffects: true,    // 独家特效
        supportLevel: 'priority'   // 优先技术支持
      }
    };

    // 使用类型权重
    this.usageCosts = {
      AI_EFFECT: 1,              // 基础AI特效
      IMAGE_UPLOAD: 0,           // 图片上传不计费
      PRIORITY_PROCESSING: 0,    // 优先处理不额外计费
      EXCLUSIVE_EFFECT: 1        // 独家特效按基础计费
    };
  }

  /**
   * 检查用户订阅状态
   */
  async getUserSubscription(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查订阅是否过期
      const now = new Date();
      if (user.subscriptionEnd && user.subscriptionEnd < now) {
        await this.expireSubscription(userId);
        user.subscriptionTier = 'FREE';
        user.subscriptionStatus = 'EXPIRED';
      }

      const limits = this.subscriptionLimits[user.subscriptionTier];
      
      return {
        userId: user.id,
        tier: user.subscriptionTier,
        status: user.subscriptionStatus,
        limits,
        monthlyUsage: user.monthlyUsage,
        usageResetDate: user.usageResetDate,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        remainingUsage: limits.monthlyLimit === -1 ? -1 : Math.max(0, limits.monthlyLimit - user.monthlyUsage),
        activeSubscription: user.subscriptions[0] || null
      };
    } catch (error) {
      console.error('Get user subscription error:', error);
      throw new Error(`获取用户订阅状态失败: ${error.message}`);
    }
  }

  /**
   * 检查用户是否可以使用指定功能
   */
  async canUseFeature(userId, usageType, effectId = null) {
    try {
      const subscription = await this.getUserSubscription(userId);
      const limits = subscription.limits;

      // 检查订阅状态
      if (subscription.status !== 'ACTIVE' && subscription.tier !== 'FREE') {
        return {
          allowed: false,
          reason: '订阅已过期，请续费后继续使用',
          code: 'SUBSCRIPTION_EXPIRED'
        };
      }

      // 检查独家特效权限
      if (usageType === 'EXCLUSIVE_EFFECT' && !limits.exclusiveEffects) {
        return {
          allowed: false,
          reason: '此为独家特效，请升级到会员版后使用',
          code: 'EXCLUSIVE_FEATURE_REQUIRED'
        };
      }

      // 检查月度使用限制
      if (limits.monthlyLimit !== -1) {
        const cost = this.usageCosts[usageType] || 1;
        
        if (subscription.monthlyUsage + cost > limits.monthlyLimit) {
          return {
            allowed: false,
            reason: `本月使用次数已达上限（${limits.monthlyLimit}次），请升级订阅或等待下月重置`,
            code: 'MONTHLY_LIMIT_EXCEEDED',
            currentUsage: subscription.monthlyUsage,
            limit: limits.monthlyLimit
          };
        }
      }

      return {
        allowed: true,
        subscription,
        hasWatermark: limits.hasWatermark,
        priorityProcessing: limits.priorityProcessing
      };
    } catch (error) {
      console.error('Feature usage check error:', error);
      throw new Error(`检查功能使用权限失败: ${error.message}`);
    }
  }

  /**
   * 记录用户使用
   */
  async recordUsage(userId, usageType, description, effectId = null, taskId = null) {
    try {
      const cost = this.usageCosts[usageType] || 1;
      
      await prisma.$transaction(async (tx) => {
        // 记录使用历史
        await tx.usageHistory.create({
          data: {
            userId,
            usageType,
            description,
            cost,
            effectId,
            taskId
          }
        });

        // 更新用户月度使用量
        await tx.user.update({
          where: { id: userId },
          data: {
            monthlyUsage: {
              increment: cost
            }
          }
        });
      });

      console.log(`Recorded usage for user ${userId}: ${usageType} (cost: ${cost})`);
      
      return {
        success: true,
        cost,
        usageType
      };
    } catch (error) {
      console.error('Record usage error:', error);
      throw new Error(`记录使用失败: ${error.message}`);
    }
  }

  /**
   * 重置月度使用量
   */
  async resetMonthlyUsage(userId = null) {
    try {
      const now = new Date();
      const whereClause = userId ? { id: userId } : {
        usageResetDate: {
          lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30天前
        }
      };

      const result = await prisma.user.updateMany({
        where: whereClause,
        data: {
          monthlyUsage: 0,
          usageResetDate: now
        }
      });

      console.log(`Reset monthly usage for ${result.count} users`);
      return result;
    } catch (error) {
      console.error('Reset monthly usage error:', error);
      throw new Error(`重置月度使用量失败: ${error.message}`);
    }
  }

  /**
   * 过期订阅处理
   */
  async expireSubscription(userId) {
    try {
      await prisma.$transaction(async (tx) => {
        // 更新用户订阅状态
        await tx.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: 'FREE',
            subscriptionStatus: 'EXPIRED',
            subscriptionEnd: null
          }
        });

        // 更新活跃订阅状态
        await tx.subscription.updateMany({
          where: {
            userId,
            status: 'ACTIVE'
          },
          data: {
            status: 'EXPIRED'
          }
        });
      });

      console.log(`Expired subscription for user: ${userId}`);
    } catch (error) {
      console.error('Expire subscription error:', error);
      throw new Error(`处理订阅过期失败: ${error.message}`);
    }
  }

  /**
   * 检查并处理所有过期订阅
   */
  async checkExpiredSubscriptions() {
    try {
      const now = new Date();
      
      const expiredUsers = await prisma.user.findMany({
        where: {
          subscriptionEnd: {
            lt: now
          },
          subscriptionStatus: 'ACTIVE'
        },
        select: { id: true }
      });

      for (const user of expiredUsers) {
        await this.expireSubscription(user.id);
      }

      console.log(`Processed ${expiredUsers.length} expired subscriptions`);
      return expiredUsers.length;
    } catch (error) {
      console.error('Check expired subscriptions error:', error);
      throw new Error(`检查过期订阅失败: ${error.message}`);
    }
  }

  /**
   * 获取用户使用统计
   */
  async getUserUsageStats(userId, startDate = null, endDate = null) {
    try {
      const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate || new Date();

      const usageHistory = await prisma.usageHistory.findMany({
        where: {
          userId,
          createdAt: {
            gte: start,
            lte: end
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // 按使用类型分组统计
      const stats = {
        totalUsage: usageHistory.reduce((sum, item) => sum + item.cost, 0),
        byType: {},
        dailyUsage: {},
        recentUsage: usageHistory.slice(0, 10)
      };

      // 按类型统计
      for (const item of usageHistory) {
        if (!stats.byType[item.usageType]) {
          stats.byType[item.usageType] = { count: 0, cost: 0 };
        }
        stats.byType[item.usageType].count++;
        stats.byType[item.usageType].cost += item.cost;
      }

      // 按日期统计
      for (const item of usageHistory) {
        const date = item.createdAt.toISOString().split('T')[0];
        if (!stats.dailyUsage[date]) {
          stats.dailyUsage[date] = 0;
        }
        stats.dailyUsage[date] += item.cost;
      }

      return stats;
    } catch (error) {
      console.error('Get usage stats error:', error);
      throw new Error(`获取使用统计失败: ${error.message}`);
    }
  }

  /**
   * 升级用户订阅
   */
  async upgradeSubscription(userId, newTier, paymentId) {
    try {
      const currentSubscription = await this.getUserSubscription(userId);
      
      if (currentSubscription.tier === newTier) {
        throw new Error('用户已经是该订阅等级');
      }

      const tierOrder = { FREE: 0, PRO: 1, VIP: 2 };
      if (tierOrder[newTier] <= tierOrder[currentSubscription.tier]) {
        throw new Error('只能升级到更高等级');
      }

      // 这里的升级逻辑将在支付成功后自动处理
      console.log(`Subscription upgrade requested: ${userId} -> ${newTier}`);
      
      return {
        success: true,
        message: '订阅升级将在支付成功后自动生效'
      };
    } catch (error) {
      console.error('Upgrade subscription error:', error);
      throw new Error(`订阅升级失败: ${error.message}`);
    }
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(userId, reason = '用户主动取消') {
    try {
      await prisma.$transaction(async (tx) => {
        // 更新用户状态
        await tx.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: 'CANCELLED'
          }
        });

        // 更新活跃订阅
        await tx.subscription.updateMany({
          where: {
            userId,
            status: 'ACTIVE'
          },
          data: {
            status: 'CANCELLED',
            autoRenew: false
          }
        });
      });

      console.log(`Cancelled subscription for user: ${userId}, reason: ${reason}`);
      
      return {
        success: true,
        message: '订阅已取消，将在当前周期结束后停止服务'
      };
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw new Error(`取消订阅失败: ${error.message}`);
    }
  }

  /**
   * 获取订阅等级信息
   */
  getSubscriptionTiers() {
    return Object.keys(this.subscriptionLimits).map(tier => ({
      tier,
      name: this.getTierDisplayName(tier),
      limits: this.subscriptionLimits[tier],
      features: this.getTierFeatures(tier)
    }));
  }

  /**
   * 获取等级显示名称
   */
  getTierDisplayName(tier) {
    const names = {
      FREE: '免费版',
      PRO: '专业版',
      VIP: '会员版'
    };
    return names[tier] || tier;
  }

  /**
   * 获取等级功能列表
   */
  getTierFeatures(tier) {
    const features = {
      FREE: [
        '每月5次AI特效处理',
        '基础特效库',
        '带水印输出',
        '社区支持'
      ],
      PRO: [
        '无限AI特效处理',
        '完整特效库',
        '无水印输出',
        '优先处理队列',
        '邮件技术支持'
      ],
      VIP: [
        '无限AI特效处理',
        '完整特效库 + 独家特效',
        '无水印输出',
        '最高优先级处理',
        '专属技术支持',
        '新功能抢先体验'
      ]
    };
    return features[tier] || [];
  }

  /**
   * 定时任务：处理订阅相关事务
   */
  async runScheduledTasks() {
    try {
      console.log('Running subscription scheduled tasks...');
      
      // 1. 检查过期订阅
      const expiredCount = await this.checkExpiredSubscriptions();
      
      // 2. 重置月度使用量（对于使用重置日期超过30天的用户）
      const resetResult = await this.resetMonthlyUsage();
      
      console.log(`Scheduled tasks completed: ${expiredCount} expired, ${resetResult.count} usage reset`);
      
      return {
        expiredSubscriptions: expiredCount,
        usageReset: resetResult.count
      };
    } catch (error) {
      console.error('Scheduled tasks error:', error);
      throw error;
    }
  }
}

export default SubscriptionService;
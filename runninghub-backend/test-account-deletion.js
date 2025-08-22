#!/usr/bin/env node

/**
 * Account Deletion Testing Script
 * 
 * This script tests the comprehensive account deletion functionality
 * to ensure all database operations work correctly.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Test configuration
const TEST_USER_EMAIL = 'test-delete@example.com';
const TEST_USER_USERNAME = 'test-delete-user';
const TEST_PASSWORD = 'testpassword123';

async function createTestUserWithData() {
  console.log('📝 Creating test user with comprehensive data...');
  
  try {
    // Create test user
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        email: TEST_USER_EMAIL,
        username: TEST_USER_USERNAME,
        passwordHash: hashedPassword,
        bio: 'Test user for deletion testing',
        realName: '测试用户',
        phoneNumber: '13800138000',
        billingAddress: '北京市朝阳区测试地址123号',
        subscriptionTier: 'PRO',
        subscriptionStatus: 'ACTIVE'
      }
    });
    
    console.log(`✅ Created test user: ${user.id}`);

    // Create refresh tokens
    await prisma.refreshToken.create({
      data: {
        token: 'test-refresh-token-123',
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Create verification codes
    await prisma.verificationCode.create({
      data: {
        email: user.email,
        code: '123456',
        scene: 'test',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    // Create posts
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        effectId: 'test-effect-123',
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        caption: '这是一个测试帖子'
      }
    });

    // Create comments
    const comment = await prisma.comment.create({
      data: {
        postId: post.id,
        userId: user.id,
        content: '这是一个测试评论'
      }
    });

    // Create likes
    await prisma.postLike.create({
      data: {
        postId: post.id,
        userId: user.id
      }
    });

    await prisma.commentLike.create({
      data: {
        commentId: comment.id,
        userId: user.id
      }
    });

    // Create notifications
    await prisma.notification.create({
      data: {
        userId: user.id,
        actorId: user.id,
        type: 'like',
        postId: post.id
      }
    });

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        tier: 'PRO',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priceRMB: 99.00,
        paymentMethod: 'WECHAT_PAY'
      }
    });

    // Create payment
    await prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        paymentMethod: 'WECHAT_PAY',
        status: 'PAID',
        amountRMB: 99.00,
        description: '专业版订阅',
        openId: 'test-openid-123',
        buyerId: 'test-buyer-123',
        paidAt: new Date()
      }
    });

    // Create usage history
    await prisma.usageHistory.create({
      data: {
        userId: user.id,
        usageType: 'AI_EFFECT',
        description: '使用AI特效处理',
        effectId: 'test-effect-123'
      }
    });

    console.log('✅ Test data created successfully');
    return user.id;
    
  } catch (error) {
    console.error('❌ Failed to create test user and data:', error);
    throw error;
  }
}

async function checkDataBeforeDeletion(userId) {
  console.log('\n🔍 Checking data before deletion...');
  
  const checks = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.refreshToken.count({ where: { userId } }),
    prisma.verificationCode.count({ where: { email: TEST_USER_EMAIL } }),
    prisma.post.count({ where: { userId } }),
    prisma.comment.count({ where: { userId } }),
    prisma.postLike.count({ where: { userId } }),
    prisma.commentLike.count({ where: { userId } }),
    prisma.notification.count({ where: { OR: [{ userId }, { actorId: userId }] } }),
    prisma.subscription.count({ where: { userId } }),
    prisma.payment.count({ where: { userId } }),
    prisma.usageHistory.count({ where: { userId } })
  ]);

  const [user, refreshTokens, verificationCodes, posts, comments, 
         postLikes, commentLikes, notifications, subscriptions, payments, usageHistory] = checks;

  console.log(`User: ${user ? '✅' : '❌'}`);
  console.log(`RefreshTokens: ${refreshTokens} records`);
  console.log(`VerificationCodes: ${verificationCodes} records`);
  console.log(`Posts: ${posts} records`);
  console.log(`Comments: ${comments} records`);
  console.log(`PostLikes: ${postLikes} records`);
  console.log(`CommentLikes: ${commentLikes} records`);
  console.log(`Notifications: ${notifications} records`);
  console.log(`Subscriptions: ${subscriptions} records`);
  console.log(`Payments: ${payments} records`);
  console.log(`UsageHistory: ${usageHistory} records`);

  return {
    user, refreshTokens, verificationCodes, posts, comments,
    postLikes, commentLikes, notifications, subscriptions, payments, usageHistory
  };
}

async function simulateAccountDeletion(userId) {
  console.log('\n🗑️  Simulating account deletion...');
  
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete user's authentication data
      await tx.refreshToken.deleteMany({
        where: { userId }
      });

      await tx.verificationCode.deleteMany({
        where: { email: TEST_USER_EMAIL }
      });

      // 2. Delete user's social interactions
      await tx.postLike.deleteMany({
        where: { userId }
      });

      await tx.commentLike.deleteMany({
        where: { userId }
      });

      // 3. Delete notifications where user is receiver or actor
      await tx.notification.deleteMany({
        where: { 
          OR: [
            { userId },
            { actorId: userId }
          ]
        }
      });

      // 4. Handle user's comments (anonymize to preserve thread integrity)
      await tx.comment.updateMany({
        where: { userId },
        data: { 
          content: '[已删除的评论]',
        }
      });

      // 5. Handle user's posts (anonymize to preserve community content)
      await tx.post.updateMany({
        where: { userId },
        data: { 
          caption: '[已删除的帖子]',
          images: [], // Remove images for privacy
        }
      });

      // 6. Cancel active subscriptions
      await tx.subscription.updateMany({
        where: { 
          userId,
          status: 'ACTIVE'
        },
        data: { 
          status: 'CANCELLED',
          autoRenew: false,
          updatedAt: new Date()
        }
      });

      // 7. Anonymize payment records
      await tx.payment.updateMany({
        where: { userId },
        data: {
          openId: null,
          buyerId: null,
        }
      });

      // 8. Anonymize user record
      const timestamp = Date.now();
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}_${timestamp}@deleted.local`,
          username: `deleted_user_${userId}_${timestamp}`,
          passwordHash: 'DELETED_ACCOUNT',
          bio: null,
          avatar: null,
          realName: null,
          phoneNumber: null,
          idCardNumber: null,
          billingAddress: null,
          subscriptionTier: 'FREE',
          subscriptionId: null,
          subscriptionStatus: 'INACTIVE',
          subscriptionStart: null,
          subscriptionEnd: null,
          monthlyUsage: 0,
          preferredPayment: null,
          isActive: false
        }
      });
    }, {
      timeout: 30000
    });
    
    console.log('✅ Account deletion simulation completed successfully');
    
  } catch (error) {
    console.error('❌ Account deletion simulation failed:', error);
    throw error;
  }
}

async function checkDataAfterDeletion(userId) {
  console.log('\n🔍 Checking data after deletion...');
  
  const checks = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.refreshToken.count({ where: { userId } }),
    prisma.verificationCode.count({ where: { email: TEST_USER_EMAIL } }),
    prisma.post.count({ where: { userId } }),
    prisma.comment.count({ where: { userId } }),
    prisma.postLike.count({ where: { userId } }),
    prisma.commentLike.count({ where: { userId } }),
    prisma.notification.count({ where: { OR: [{ userId }, { actorId: userId }] } }),
    prisma.subscription.count({ where: { userId, status: 'ACTIVE' } }),
    prisma.payment.count({ where: { userId } }),
    prisma.usageHistory.count({ where: { userId } })
  ]);

  const [user, refreshTokens, verificationCodes, posts, comments, 
         postLikes, commentLikes, notifications, activeSubscriptions, payments, usageHistory] = checks;

  console.log(`User exists: ${user ? '✅' : '❌'}`);
  console.log(`User isActive: ${user?.isActive ? '❌' : '✅'}`);
  console.log(`RefreshTokens: ${refreshTokens} records (should be 0)`);
  console.log(`VerificationCodes: ${verificationCodes} records (should be 0)`);
  console.log(`Posts: ${posts} records (preserved)`);
  console.log(`Comments: ${comments} records (preserved)`);
  console.log(`PostLikes: ${postLikes} records (should be 0)`);
  console.log(`CommentLikes: ${commentLikes} records (should be 0)`);
  console.log(`Notifications: ${notifications} records (should be 0)`);
  console.log(`Active Subscriptions: ${activeSubscriptions} records (should be 0)`);
  console.log(`Payments: ${payments} records (preserved)`);
  console.log(`UsageHistory: ${usageHistory} records (preserved)`);

  // Check if data was properly anonymized
  if (user) {
    const isProperlyAnonymized = 
      user.email.startsWith('deleted_') &&
      user.username.startsWith('deleted_user_') &&
      user.passwordHash === 'DELETED_ACCOUNT' &&
      !user.realName &&
      !user.phoneNumber &&
      !user.billingAddress &&
      !user.isActive;
    
    console.log(`User properly anonymized: ${isProperlyAnonymized ? '✅' : '❌'}`);
  }

  // Check if posts and comments were anonymized
  const anonymizedPost = await prisma.post.findFirst({ where: { userId } });
  const anonymizedComment = await prisma.comment.findFirst({ where: { userId } });
  
  console.log(`Posts anonymized: ${anonymizedPost?.caption === '[已删除的帖子]' ? '✅' : '❌'}`);
  console.log(`Comments anonymized: ${anonymizedComment?.content === '[已删除的评论]' ? '✅' : '❌'}`);

  return {
    user, refreshTokens, verificationCodes, posts, comments,
    postLikes, commentLikes, notifications, activeSubscriptions, payments, usageHistory
  };
}

async function cleanupTestData(userId) {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Clean up all test data
    await prisma.$transaction(async (tx) => {
      await tx.usageHistory.deleteMany({ where: { userId } });
      await tx.payment.deleteMany({ where: { userId } });
      await tx.subscription.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { OR: [{ userId }, { actorId: userId }] } });
      await tx.commentLike.deleteMany({ where: { userId } });
      await tx.postLike.deleteMany({ where: { userId } });
      await tx.comment.deleteMany({ where: { userId } });
      await tx.post.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.verificationCode.deleteMany({ where: { email: TEST_USER_EMAIL } });
      await tx.user.delete({ where: { id: userId } });
    });
    
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error);
  }
}

async function runAccountDeletionTest() {
  console.log('🚀 Starting Account Deletion Test\n');
  
  let userId;
  
  try {
    // Step 1: Create test user with comprehensive data
    userId = await createTestUserWithData();
    
    // Step 2: Check data before deletion
    await checkDataBeforeDeletion(userId);
    
    // Step 3: Simulate account deletion
    await simulateAccountDeletion(userId);
    
    // Step 4: Check data after deletion
    await checkDataAfterDeletion(userId);
    
    console.log('\n🎉 Account deletion test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Account deletion test failed:', error);
  } finally {
    // Step 5: Cleanup
    if (userId) {
      await cleanupTestData(userId);
    }
    
    await prisma.$disconnect();
  }
}

// Run the test
runAccountDeletionTest();
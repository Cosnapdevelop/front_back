#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestAccount() {
  try {
    console.log('🎯 开始创建VIP测试账号...');
    
    const testEmail = 'test@cosnap.dev';
    const testUsername = 'testusercosnap';
    
    // 检查用户是否已存在
    let user = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    if (!user) {
      // 创建新测试用户
      user = await prisma.user.create({
        data: {
          email: testEmail,
          username: testUsername,
          subscriptionTier: 'VIP',
          subscriptionStatus: 'ACTIVE',
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年后过期
          monthlyUsage: 0,
          usageResetDate: new Date(),
          isTestAccount: true // 标记为测试账号
        }
      });
      
      console.log(`✅ 创建新测试用户成功:`);
    } else {
      // 更新现有用户为测试账号
      user = await prisma.user.update({
        where: { email: testEmail },
        data: {
          subscriptionTier: 'VIP',
          subscriptionStatus: 'ACTIVE',
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          monthlyUsage: 0,
          usageResetDate: new Date(),
          isTestAccount: true
        }
      });
      
      console.log(`✅ 更新现有用户为测试账号成功:`);
    }
    
    console.log(`\n📧 邮箱: ${user.email}`);
    console.log(`👑 等级: ${user.subscriptionTier}`);
    console.log(`📊 状态: ${user.subscriptionStatus}`);
    console.log(`⏰ 过期时间: ${user.subscriptionEnd.toLocaleDateString()}`);
    console.log(`🧪 测试账号: ${user.isTestAccount ? '是' : '否'}`);
    
    console.log(`\n🎉 下一步:`);
    console.log(`1. 访问 https://cosnap.vercel.app/`);
    console.log(`2. 使用邮箱 ${user.email} 登录`);
    console.log(`3. 系统会提示你设置密码或直接登录`);
    console.log(`4. 现在可以无限制使用AI特效了！`);
    
    return {
      success: true,
      user: {
        email: user.email,
        username: user.username,
        tier: user.subscriptionTier,
        status: user.subscriptionStatus,
        subscriptionEnd: user.subscriptionEnd,
        isTestAccount: user.isTestAccount
      }
    };
    
  } catch (error) {
    console.error('❌ 创建测试账号失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
}

// 直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestAccount()
    .then((result) => {
      if (result.success) {
        console.log('\n✨ 测试账号创建完成！');
        process.exit(0);
      } else {
        console.log('\n❌ 测试账号创建失败！');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

export default createTestAccount;
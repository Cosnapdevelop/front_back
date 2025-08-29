import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugUserLookup() {
  console.log('🔍 开始调试用户查找问题...\n');
  
  const testEmail = 'terrylzr123@gmail.com';
  
  try {
    // 1. 直接邮箱查找
    console.log('1. 精确邮箱查找:');
    const exactUser = await prisma.user.findUnique({
      where: { email: testEmail },
      select: { 
        id: true, 
        email: true, 
        username: true,
        isActive: true,
        isBanned: true,
        createdAt: true
      }
    });
    console.log('结果:', exactUser || '未找到');
    
    // 2. 忽略大小写查找
    console.log('\n2. 忽略大小写查找:');
    const caseInsensitiveUser = await prisma.user.findFirst({
      where: { 
        email: {
          mode: 'insensitive',
          equals: testEmail
        }
      },
      select: { 
        id: true, 
        email: true, 
        username: true,
        isActive: true,
        isBanned: true,
        createdAt: true
      }
    });
    console.log('结果:', caseInsensitiveUser || '未找到');
    
    // 3. 模糊查找类似邮箱
    console.log('\n3. 模糊查找类似邮箱:');
    const similarEmails = await prisma.user.findMany({
      where: {
        email: {
          contains: 'terrylzr123',
          mode: 'insensitive'
        }
      },
      select: { 
        id: true, 
        email: true, 
        username: true,
        isActive: true,
        isBanned: true,
        createdAt: true
      },
      take: 10
    });
    console.log('类似邮箱结果:', similarEmails);
    
    // 4. 查找所有Gmail用户（检查数据格式）
    console.log('\n4. 所有Gmail用户（前10个）:');
    const gmailUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'gmail.com',
          mode: 'insensitive'
        }
      },
      select: { 
        id: true, 
        email: true, 
        username: true,
        isActive: true,
        isBanned: true,
        createdAt: true
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    console.log('Gmail用户:', gmailUsers);
    
    // 5. 统计总用户数
    console.log('\n5. 用户统计:');
    const userStats = await prisma.user.aggregate({
      _count: {
        id: true
      }
    });
    console.log('总用户数:', userStats._count.id);
    
    // 6. 检查数据库连接
    console.log('\n6. 数据库连接测试:');
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('数据库连接:', dbTest ? '✅ 正常' : '❌ 失败');
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 直接运行脚本
debugUserLookup().then(() => {
  console.log('\n🔍 调试完成');
  process.exit(0);
}).catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

export { debugUserLookup };
/**
 * Database Optimization Test
 * 验证Prisma单例模式和数据库连接优化
 */

import { databaseManager } from './src/config/prisma.js';

console.log('🔧 数据库优化测试开始...\n');

// 测试单例模式
console.log('📊 测试1: Prisma单例模式验证');
const client1 = databaseManager.getInstance();
const client2 = databaseManager.getInstance();

console.log('✅ 创建了两个PrismaManager实例');
console.log('🔍 检查单例模式:', client1 === client2 ? '✅ 相同实例 (单例生效)' : '❌ 不同实例 (单例失败)');

// 测试数据库连接
console.log('\n📊 测试2: 数据库连接测试');
try {
  const result = await client1.$queryRaw`SELECT 'Database optimization working' as status`;
  console.log('✅ 数据库查询成功:', result);
} catch (error) {
  console.error('❌ 数据库查询失败:', error.message);
}

// 测试并发连接性能
console.log('\n📊 测试3: 并发连接性能测试');
const startTime = Date.now();

const concurrentRequests = Array.from({ length: 10 }, async (_, i) => {
  try {
    const client = databaseManager.getInstance();
    await client.$queryRaw`SELECT ${i} as request_id, 'success' as status`;
    return { id: i, status: 'success' };
  } catch (error) {
    return { id: i, status: 'failed', error: error.message };
  }
});

const results = await Promise.all(concurrentRequests);
const endTime = Date.now();

const successful = results.filter(r => r.status === 'success').length;
const failed = results.filter(r => r.status === 'failed').length;

console.log(`⏱️  并发请求完成时间: ${endTime - startTime}ms`);
console.log(`✅ 成功请求: ${successful}/10`);
console.log(`❌ 失败请求: ${failed}/10`);

if (successful >= 8) {
  console.log('✅ 数据库连接池优化工作正常');
} else {
  console.log('⚠️  数据库连接可能存在问题');
}

// 测试健康检查
console.log('\n📊 测试4: 数据库健康检查');
try {
  const healthMetrics = databaseManager.getHealthMetrics();
  console.log('✅ 数据库健康指标:', healthMetrics);
} catch (error) {
  console.log('ℹ️  数据库健康监控未配置或不可用');
}

console.log('\n🎉 数据库优化测试完成！');

// 清理连接
await client1.$disconnect();
console.log('🔌 数据库连接已关闭');
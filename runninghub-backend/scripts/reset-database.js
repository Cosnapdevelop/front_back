#!/usr/bin/env node

/**
 * Database Reset Script for Development/Testing
 * WARNING: This will DELETE ALL DATA in the database
 * Only use in development environment!
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function confirmReset() {
  return new Promise((resolve) => {
    rl.question('⚠️  WARNING: This will DELETE ALL USER DATA! Are you sure? (type "YES" to confirm): ', (answer) => {
      resolve(answer.trim() === 'YES');
    });
  });
}

async function resetDatabase() {
  try {
    console.log('🚀 Starting database reset...');
    
    // Check if we're in production
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Cannot run database reset in production environment!');
      process.exit(1);
    }

    // Delete data in proper order (due to foreign key constraints)
    console.log('🗑️  Deleting data in proper order...');
    
    // 1. Delete analytics and performance data (no dependencies)
    await prisma.apiResponseTime.deleteMany();
    await prisma.userEvent.deleteMany();
    await prisma.conversionFunnel.deleteMany();
    await prisma.performanceAlert.deleteMany();
    await prisma.performanceMetric.deleteMany();
    console.log('✅ Analytics data cleared');

    // 2. Delete payment and subscription related data
    await prisma.paymentWebhook.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.usageHistory.deleteMany();
    console.log('✅ Payment and subscription data cleared');

    // 3. Delete community interaction data
    await prisma.notification.deleteMany();
    await prisma.commentLike.deleteMany();
    await prisma.postLike.deleteMany();
    console.log('✅ Community interaction data cleared');

    // 4. Delete comments (must be before posts due to foreign keys)
    await prisma.comment.deleteMany();
    console.log('✅ Comments cleared');

    // 5. Delete posts
    await prisma.post.deleteMany();
    console.log('✅ Posts cleared');

    // 6. Delete verification codes
    await prisma.verificationCode.deleteMany();
    console.log('✅ Verification codes cleared');

    // 7. Delete refresh tokens
    await prisma.refreshToken.deleteMany();
    console.log('✅ Refresh tokens cleared');

    // 8. Finally, delete users (this should be last due to all foreign key relationships)
    const userCount = await prisma.user.count();
    await prisma.user.deleteMany();
    console.log(`✅ ${userCount} users cleared`);

    // 9. Delete configuration data (optional - uncomment if needed)
    // await prisma.chineseConfig.deleteMany();
    // console.log('✅ Configuration data cleared');

    console.log('🎉 Database reset completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${userCount} users deleted`);
    console.log('   - All posts, comments, and interactions deleted');
    console.log('   - All payment and subscription data deleted');
    console.log('   - All analytics and performance data deleted');
    console.log('   - All authentication tokens deleted');

  } catch (error) {
    console.error('❌ Error during database reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

async function main() {
  console.log('🔄 Cosnap AI - Database Reset Tool');
  console.log('=====================================');
  
  const confirmed = await confirmReset();
  
  if (!confirmed) {
    console.log('❌ Database reset cancelled.');
    rl.close();
    return;
  }

  await resetDatabase();
}

main()
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
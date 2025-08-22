#!/usr/bin/env node

/**
 * Test Deletion Compatibility Script
 * 
 * Quick test to ensure the existing account deletion test script
 * is compatible with the new database schema changes
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testSchemaCompatibility() {
  console.log('🔍 Testing account deletion compatibility with new schema...');
  
  try {
    // Test that we can create a user with all the new fields
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const testUser = await prisma.user.create({
      data: {
        email: 'schema-test@example.com',
        username: 'schema-test-user',
        passwordHash: hashedPassword,
        isActive: true,
        isBanned: false,
        bio: 'Test user for schema compatibility',
        realName: '测试用户',
        phoneNumber: '13800138000',
        billingAddress: '北京市朝阳区测试地址123号',
        subscriptionTier: 'PRO',
        subscriptionStatus: 'ACTIVE'
      }
    });
    
    console.log('✅ User creation with new fields works');
    
    // Test lastLoginAt update
    await prisma.user.update({
      where: { id: testUser.id },
      data: { lastLoginAt: new Date() }
    });
    
    console.log('✅ LastLoginAt update works');
    
    // Test refresh token with revokedAt
    const refreshToken = await prisma.refreshToken.create({
      data: {
        token: 'test-token-123',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null
      }
    });
    
    console.log('✅ Refresh token with revokedAt field works');
    
    // Test account deletion process (same as in existing script)
    await prisma.$transaction(async (tx) => {
      // Delete refresh tokens
      await tx.refreshToken.deleteMany({
        where: { userId: testUser.id }
      });
      
      // Anonymize user with new fields
      await tx.user.update({
        where: { id: testUser.id },
        data: {
          email: `deleted_${testUser.id}_${Date.now()}@deleted.local`,
          username: `deleted_user_${testUser.id}_${Date.now()}`,
          passwordHash: 'DELETED_ACCOUNT',
          bio: null,
          avatar: null,
          realName: null,
          phoneNumber: null,
          billingAddress: null,
          subscriptionTier: 'FREE',
          subscriptionStatus: 'INACTIVE',
          isActive: false,
          isBanned: false
        }
      });
    });
    
    console.log('✅ Complete account deletion flow works');
    
    // Verify deletion
    const deletedUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });
    
    if (!deletedUser.isActive && deletedUser.email.includes('deleted')) {
      console.log('✅ Account deletion verification successful');
    } else {
      throw new Error('Account deletion verification failed');
    }
    
    // Clean up
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    
    console.log('✅ Test cleanup completed');
    console.log('\n🎉 Existing account deletion test script is fully compatible!');
    
  } catch (error) {
    console.error('❌ Schema compatibility test failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await testSchemaCompatibility();
    console.log('\n✅ All tests passed - account deletion flow is ready');
  } catch (error) {
    console.error('\n💥 Compatibility test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
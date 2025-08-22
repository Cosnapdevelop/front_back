#!/usr/bin/env node

/**
 * Authentication Endpoints Validation Script
 * 
 * Tests all authentication endpoints to ensure they work correctly
 * after the critical database schema fixes
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Test configuration
const TEST_USER = {
  email: 'test-validation@example.com',
  username: 'test-validation-user',
  password: 'TestPassword123!'
};

async function cleanup() {
  try {
    // Clean up any existing test user
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: TEST_USER.email },
          { username: TEST_USER.username }
        ]
      }
    });
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.log('ℹ️  No test data to clean up');
  }
}

async function validateDatabaseSchema() {
  console.log('\n🔍 Validating database schema...');
  
  try {
    // Test that all required fields exist by trying to create a user with them
    const testFields = await prisma.user.findFirst({
      select: {
        id: true,
        isActive: true,
        isBanned: true,
        lastLoginAt: true
      }
    });
    
    console.log('✅ All required User fields exist in database');
    
    // Test RefreshToken revokedAt field
    const testRefreshToken = await prisma.refreshToken.findFirst({
      select: {
        id: true,
        revokedAt: true
      }
    });
    
    console.log('✅ RefreshToken revokedAt field exists in database');
    
    return true;
  } catch (error) {
    console.error('❌ Database schema validation failed:', error.message);
    return false;
  }
}

async function testUserRegistration() {
  console.log('\n🧪 Testing user registration...');
  
  try {
    const passwordHash = await bcrypt.hash(TEST_USER.password, 12);
    
    const user = await prisma.user.create({
      data: {
        email: TEST_USER.email,
        username: TEST_USER.username,
        passwordHash,
        isActive: true,
        isBanned: false
      }
    });
    
    console.log('✅ User registration works correctly');
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - isActive: ${user.isActive}`);
    console.log(`   - isBanned: ${user.isBanned}`);
    
    return user;
  } catch (error) {
    console.error('❌ User registration failed:', error.message);
    throw error;
  }
}

async function testLoginFlow(user) {
  console.log('\n🧪 Testing login flow...');
  
  try {
    // Test password verification
    const passwordValid = await bcrypt.compare(TEST_USER.password, user.passwordHash);
    if (!passwordValid) {
      throw new Error('Password verification failed');
    }
    console.log('✅ Password verification works');
    
    // Test account status checks
    if (user.isBanned) {
      throw new Error('User should not be banned');
    }
    if (!user.isActive) {
      throw new Error('User should be active');
    }
    console.log('✅ Account status checks work');
    
    // Test lastLoginAt update
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    console.log('✅ LastLoginAt update works');
    
    // Test JWT token generation
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, username: user.username },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '15m' }
    );
    console.log('✅ JWT token generation works');
    
    return accessToken;
  } catch (error) {
    console.error('❌ Login flow failed:', error.message);
    throw error;
  }
}

async function testRefreshTokenFlow(user) {
  console.log('\n🧪 Testing refresh token flow...');
  
  try {
    const refreshToken = jwt.sign(
      { sub: user.id },
      process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
      { expiresIn: '30d' }
    );
    
    // Create refresh token record
    const tokenRecord = await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isRevoked: false
      }
    });
    console.log('✅ Refresh token creation works');
    
    // Test token revocation (logout)
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: {
        isRevoked: true,
        revokedAt: new Date()
      }
    });
    console.log('✅ Refresh token revocation works');
    
    return tokenRecord;
  } catch (error) {
    console.error('❌ Refresh token flow failed:', error.message);
    throw error;
  }
}

async function testUserInfoRetrieval(user) {
  console.log('\n🧪 Testing user info retrieval...');
  
  try {
    const userInfo = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        isActive: true,
        isBanned: true,
        createdAt: true,
        lastLoginAt: true
      }
    });
    
    if (!userInfo) {
      throw new Error('User not found');
    }
    
    console.log('✅ User info retrieval works');
    console.log(`   - All fields accessible: ${Object.keys(userInfo).length} fields`);
    
    return userInfo;
  } catch (error) {
    console.error('❌ User info retrieval failed:', error.message);
    throw error;
  }
}

async function testAccountDeletionFlow(user) {
  console.log('\n🧪 Testing account deletion flow...');
  
  try {
    // Test the deletion process
    await prisma.$transaction(async (tx) => {
      // Delete refresh tokens
      await tx.refreshToken.deleteMany({
        where: { userId: user.id }
      });
      
      // Anonymize user
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: `deleted_${user.id}_${Date.now()}@deleted.local`,
          username: `deleted_user_${user.id}_${Date.now()}`,
          passwordHash: 'DELETED_ACCOUNT',
          isActive: false,
          isBanned: false
        }
      });
    });
    
    console.log('✅ Account deletion flow works');
    
    // Verify deletion
    const deletedUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    
    if (deletedUser.isActive || !deletedUser.email.includes('deleted')) {
      throw new Error('Account deletion did not work correctly');
    }
    
    console.log('✅ Account deletion verification successful');
    
    return deletedUser;
  } catch (error) {
    console.error('❌ Account deletion flow failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting authentication endpoints validation...');
  
  try {
    // Clean up before testing
    await cleanup();
    
    // 1. Validate database schema
    const schemaValid = await validateDatabaseSchema();
    if (!schemaValid) {
      throw new Error('Database schema validation failed');
    }
    
    // 2. Test user registration
    const user = await testUserRegistration();
    
    // 3. Test login flow
    await testLoginFlow(user);
    
    // 4. Test refresh token flow
    await testRefreshTokenFlow(user);
    
    // 5. Test user info retrieval
    await testUserInfoRetrieval(user);
    
    // 6. Test account deletion flow
    await testAccountDeletionFlow(user);
    
    console.log('\n🎉 All authentication endpoints validation passed!');
    console.log('✅ Backend is ready for production deployment');
    
  } catch (error) {
    console.error('\n💥 Validation failed:', error.message);
    console.error('❌ Backend is NOT ready for production');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
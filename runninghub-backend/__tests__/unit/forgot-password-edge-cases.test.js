import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { mockPrismaClient } from '../setup.js';

// Mock dependencies
jest.mock('../../src/config/prisma.js', () => mockPrismaClient);

const mockSendPasswordResetEmail = jest.fn();
jest.mock('../../src/services/emailService.js', () => ({
  isEmailEnabled: jest.fn(() => Promise.resolve(true)),
  sendPasswordResetEmail: mockSendPasswordResetEmail
}));

// Import after mocks
import authRouter from '../../src/routes/auth.js';

describe('Forgot Password Edge Cases and Error Handling', () => {
  let app;
  let mockUser;

  beforeEach(() => {
    // Setup Express app
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

    // Setup environment
    process.env.JWT_RESET_SECRET = 'test-reset-secret';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_RESET_SECRET;
    delete process.env.FRONTEND_URL;
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long email addresses', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: longEmail });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle email with special characters', async () => {
      const specialEmails = [
        'user+tag@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user123@example-domain.com',
        'user@subdomain.example.com'
      ];

      for (const email of specialEmails) {
        mockPrismaClient.user.findUnique.mockResolvedValueOnce({
          ...mockUser,
          email
        });

        const response = await request(app)
          .post('/auth/forgot-password')
          .send({ email });

        expect(response.status).toBe(200);
      }
    });

    it('should handle unicode characters in email', async () => {
      const unicodeEmails = [
        'tëst@example.com',
        'user@tëst.com',
        '用户@example.com'
      ];

      for (const email of unicodeEmails) {
        const response = await request(app)
          .post('/auth/forgot-password')
          .send({ email });

        // Should either accept or reject consistently
        expect([200, 400]).toContain(response.status);
      }
    });

    it('should handle malformed JSON payloads', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send('email=test@example.com');

      expect(response.status).toBe(400);
    });

    it('should handle extremely long passwords on reset', async () => {
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, type: 'password_reset' },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
      );

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const longPassword = 'A1' + 'a'.repeat(10000);

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token,
          password: longPassword,
          confirmPassword: longPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Database Error Scenarios', () => {
    it('should handle database connection timeouts', async () => {
      mockPrismaClient.user.findUnique.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 1000);
        });
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle database lock errors', async () => {
      mockPrismaClient.user.findUnique.mockRejectedValue(
        new Error('database is locked')
      );

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
    });

    it('should handle concurrent database operations', async () => {
      let callCount = 0;
      mockPrismaClient.user.findUnique.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Concurrent modification');
        }
        return mockUser;
      });

      const requests = Array(2).fill().map(() =>
        request(app)
          .post('/auth/forgot-password')
          .send({ email: 'test@example.com' })
      );

      const responses = await Promise.allSettled(requests);
      
      // At least one should handle the error gracefully
      const statuses = responses.map(r => 
        r.status === 'fulfilled' ? r.value.status : 500
      );
      expect(statuses.some(status => [200, 500].includes(status))).toBe(true);
    });

    it('should handle database constraint violations', async () => {
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, type: 'password_reset' },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
      );

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.user.update.mockRejectedValue(
        new Error('Unique constraint failed')
      );

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token,
          password: 'ValidPassword123!',
          confirmPassword: 'ValidPassword123!'
        });

      expect(response.status).toBe(500);
    });
  });

  describe('Token Edge Cases', () => {
    it('should handle tokens with special characters', async () => {
      const specialTokens = [
        'token.with.dots',
        'token-with-dashes',
        'token_with_underscores',
        'token+with+plus',
        'token%20with%20encoding'
      ];

      for (const token of specialTokens) {
        const response = await request(app)
          .get(`/auth/reset-password/${token}`);

        expect(response.status).toBe(404); // Should be invalid
        expect(response.body.success).toBe(false);
      }
    });

    it('should handle extremely long tokens', async () => {
      const longToken = 'a'.repeat(10000);

      const response = await request(app)
        .get(`/auth/reset-password/${longToken}`);

      expect(response.status).toBe(404);
    });

    it('should handle tokens with null bytes', async () => {
      const nullByteToken = 'token\x00injection';

      const response = await request(app)
        .get(`/auth/reset-password/${nullByteToken}`);

      expect(response.status).toBe(404);
    });

    it('should handle tokens that are valid JWT but wrong type', async () => {
      const wrongTypeToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, type: 'access_token' },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
      );

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/auth/reset-password/${wrongTypeToken}`);

      expect(response.status).toBe(404);
      expect(response.body.valid).toBe(false);
    });

    it('should handle tokens signed with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, type: 'password_reset' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/auth/reset-password/${wrongSecretToken}`);

      expect(response.status).toBe(404);
    });

    it('should handle tokens for deleted users', async () => {
      const token = jwt.sign(
        { userId: 999, email: 'deleted@example.com', type: 'password_reset' },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
      );

      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get(`/auth/reset-password/${token}`);

      expect(response.status).toBe(404);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('Email Service Edge Cases', () => {
    it('should handle email service being temporarily unavailable', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockSendPasswordResetEmail.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: mockUser.email });

      // Should still return success to not reveal internal errors
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle email service returning invalid responses', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockSendPasswordResetEmail.mockResolvedValue(false); // Email failed to send

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: mockUser.email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle email service timeout', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockSendPasswordResetEmail.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 1000);
        });
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: mockUser.email });

      expect(response.status).toBe(200);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle high concurrent request loads', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const concurrentRequests = Array(100).fill().map((_, index) =>
        request(app)
          .post('/auth/forgot-password')
          .send({ email: `test${index}@example.com` })
      );

      const responses = await Promise.allSettled(concurrentRequests);
      
      // Most should complete successfully or be rate limited
      const completedResponses = responses.filter(r => r.status === 'fulfilled');
      expect(completedResponses.length).toBeGreaterThan(0);
      
      // Check for proper status codes
      completedResponses.forEach(response => {
        expect([200, 429, 500]).toContain(response.value.status);
      });
    });

    it('should handle memory pressure during password hashing', async () => {
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, type: 'password_reset' },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
      );

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      
      // Mock bcrypt to simulate memory pressure
      const originalHash = bcrypt.hash;
      bcrypt.hash = jest.fn().mockRejectedValue(new Error('Out of memory'));

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token,
          password: 'ValidPassword123!',
          confirmPassword: 'ValidPassword123!'
        });

      expect(response.status).toBe(500);
      
      // Restore bcrypt
      bcrypt.hash = originalHash;
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "admin@example.com'; UPDATE users SET email='hacker@evil.com' WHERE id=1; --",
        "test@example.com' UNION SELECT * FROM passwords --"
      ];

      for (const payload of sqlInjectionPayloads) {
        // Mock to ensure we're not actually executing SQL
        mockPrismaClient.user.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .post('/auth/forgot-password')
          .send({ email: payload });

        expect(response.status).toBe(200); // Should be sanitized and treated as regular input
      }
    });

    it('should handle NoSQL injection attempts', async () => {
      const nosqlPayloads = [
        { $ne: null },
        { $regex: '.*' },
        { $where: 'function() { return true; }' }
      ];

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .post('/auth/forgot-password')
          .send({ email: payload });

        expect(response.status).toBe(400); // Should reject non-string emails
      }
    });

    it('should handle XSS attempts in email field', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>@example.com',
        'javascript:alert(1)@example.com',
        'onload=alert(1)@example.com'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/auth/forgot-password')
          .send({ email: payload });

        // Should either reject as invalid email or sanitize
        expect([200, 400]).toContain(response.status);
      }
    });

    it('should handle JWT confusion attacks', async () => {
      // Try to use HS256 token when expecting RS256 (if applicable)
      const maliciousToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, type: 'password_reset' },
        'public_key_as_hmac_secret',
        { algorithm: 'HS256' }
      );

      const response = await request(app)
        .get(`/auth/reset-password/${maliciousToken}`);

      expect(response.status).toBe(404);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('Race Condition Edge Cases', () => {
    it('should handle concurrent password resets for same user', async () => {
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, type: 'password_reset' },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
      );

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      let updateCallCount = 0;
      mockPrismaClient.user.update.mockImplementation(async () => {
        updateCallCount++;
        // Simulate race condition delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return { ...mockUser, passwordHash: `updated-${updateCallCount}` };
      });

      const concurrentResets = [
        request(app)
          .post('/auth/reset-password')
          .send({
            token,
            password: 'Password1!',
            confirmPassword: 'Password1!'
          }),
        request(app)
          .post('/auth/reset-password')
          .send({
            token,
            password: 'Password2!',
            confirmPassword: 'Password2!'
          })
      ];

      const responses = await Promise.all(concurrentResets);

      // Both might succeed (depending on implementation), but database should be consistent
      const successfulResets = responses.filter(r => r.status === 200);
      expect(successfulResets.length).toBeGreaterThanOrEqual(1);
      
      // Database should have been called
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
    });

    it('should handle user deletion during password reset process', async () => {
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, type: 'password_reset' },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
      );

      // First call returns user, second call (during update) returns null
      mockPrismaClient.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      mockPrismaClient.user.update.mockRejectedValue(
        new Error('Record to update not found')
      );

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token,
          password: 'ValidPassword123!',
          confirmPassword: 'ValidPassword123!'
        });

      expect(response.status).toBe(500); // Should handle gracefully
    });
  });

  describe('Environment and Configuration Edge Cases', () => {
    it('should handle missing JWT secret', async () => {
      delete process.env.JWT_RESET_SECRET;

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
    });

    it('should handle missing frontend URL', async () => {
      delete process.env.FRONTEND_URL;
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: mockUser.email });

      // Should use default URL or handle gracefully
      expect([200, 500]).toContain(response.status);
    });

    it('should handle invalid JWT secret format', async () => {
      process.env.JWT_RESET_SECRET = '';

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(500);
    });
  });

  describe('Timing Attack Mitigation', () => {
    it('should have consistent response times for valid and invalid emails', async () => {
      mockPrismaClient.user.findUnique
        .mockResolvedValueOnce(mockUser) // Valid email
        .mockResolvedValueOnce(null);    // Invalid email

      const validEmailStart = Date.now();
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: mockUser.email });
      const validEmailTime = Date.now() - validEmailStart;

      const invalidEmailStart = Date.now();
      await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'invalid@example.com' });
      const invalidEmailTime = Date.now() - invalidEmailStart;

      // Times should be reasonably similar (within 50ms)
      const timeDifference = Math.abs(validEmailTime - invalidEmailTime);
      expect(timeDifference).toBeLessThan(50);
    });
  });
});
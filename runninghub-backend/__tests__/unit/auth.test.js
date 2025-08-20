/**
 * Unit tests for authentication functionality
 * 
 * Tests the auth routes including:
 * - User registration
 * - User login
 * - Token refresh
 * - User logout
 * - Protected route access
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authRouter from '../../src/routes/auth.js';
import { testDb } from '../setup.js';

// Create test app instance
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Authentication Routes', () => {
  describe('POST /auth/register', () => {
    test('should register new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        email: userData.email,
        username: userData.username
      });
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    test('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should reject registration with short password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: '123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject registration with existing email', async () => {
      // Create existing user
      await testDb.createTestUser({
        email: 'existing@example.com',
        username: 'existing'
      });

      const userData = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('已存在');
    });
  });

  describe('POST /auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user with hashed password
      const hashedPassword = await bcrypt.hash('password123', 10);
      testUser = await testDb.createTestUser({
        email: 'login@example.com',
        username: 'loginuser',
        passwordHash: hashedPassword
      });
    });

    test('should login with valid credentials (email)', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        email: 'login@example.com',
        username: 'loginuser'
      });
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    test('should login with valid credentials (username)', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'loginuser', // Using username in email field
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('账号或密码错误');
    });

    test('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    let testUser;
    let validRefreshToken;

    beforeEach(async () => {
      testUser = await testDb.createTestUser({
        email: 'refresh@example.com',
        username: 'refreshuser'
      });

      // Create valid refresh token
      validRefreshToken = jwt.sign(
        { sub: testUser.id }, 
        process.env.JWT_REFRESH_SECRET, 
        { expiresIn: '30d' }
      );

      await testDb.createTestRefreshToken(testUser.id, {
        token: validRefreshToken
      });
    });

    test('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      
      // Verify new access token is valid
      const decoded = jwt.verify(response.body.accessToken, process.env.JWT_ACCESS_SECRET);
      expect(decoded.sub).toBe(testUser.id);
    });

    test('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject refresh with revoked token', async () => {
      // Create revoked token
      const revokedToken = jwt.sign(
        { sub: testUser.id }, 
        process.env.JWT_REFRESH_SECRET, 
        { expiresIn: '30d' }
      );

      await testDb.createTestRefreshToken(testUser.id, {
        token: revokedToken,
        isRevoked: true
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: revokedToken
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      testUser = await testDb.createTestUser();
      refreshToken = jwt.sign(
        { sub: testUser.id }, 
        process.env.JWT_REFRESH_SECRET, 
        { expiresIn: '30d' }
      );
      
      await testDb.createTestRefreshToken(testUser.id, {
        token: refreshToken
      });
    });

    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({
          refreshToken: refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify token is revoked in database
      const storedToken = await testDb.prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });
      expect(storedToken.isRevoked).toBe(true);
    });
  });

  describe('GET /auth/me', () => {
    let testUser;
    let accessToken;

    beforeEach(async () => {
      testUser = await testDb.createTestUser({
        email: 'me@example.com',
        username: 'meuser'
      });

      accessToken = jwt.sign(
        { sub: testUser.id, email: testUser.email, username: testUser.username },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
    });

    test('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username
      });
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /auth/me', () => {
    let testUser;
    let accessToken;

    beforeEach(async () => {
      testUser = await testDb.createTestUser({
        email: 'update@example.com',
        username: 'updateuser',
        bio: 'Original bio'
      });

      accessToken = jwt.sign(
        { sub: testUser.id, email: testUser.email, username: testUser.username },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
    });

    test('should update user profile successfully', async () => {
      const updateData = {
        username: 'newusername',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .put('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('newusername');
      expect(response.body.user.bio).toBe('Updated bio');
    });

    test('should reject update with existing username', async () => {
      // Create another user with target username
      await testDb.createTestUser({
        email: 'other@example.com',
        username: 'existingname'
      });

      const response = await request(app)
        .put('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: 'existingname'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('已被占用');
    });
  });
});
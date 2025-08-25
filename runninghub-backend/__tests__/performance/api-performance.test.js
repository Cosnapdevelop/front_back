/**
 * Performance benchmark tests for Cosnap AI API
 * 
 * Tests performance characteristics including:
 * - Response time benchmarks
 * - Throughput under concurrent load
 * - Memory usage patterns
 * - Database query performance
 * - File upload performance
 * - Rate limiting effectiveness
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { performance } from 'perf_hooks';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import jwt from 'jsonwebtoken';

// Import routes
import authRouter from '../../src/routes/auth.js';
import effectsRouter from '../../src/routes/effects.js';

// Mock external services for consistent performance testing
jest.mock('../../src/services/uploadImageService.js');
jest.mock('../../src/services/comfyUITaskService.js');
jest.mock('../../src/services/webappTaskService.js');
jest.mock('../../src/services/emailService.js');

import { uploadImageService } from '../../src/services/uploadImageService.js';
import { startComfyUITaskService, getComfyUITaskStatus, getComfyUITaskResult } from '../../src/services/comfyUITaskService.js';
import { isEmailEnabled } from '../../src/services/emailService.js';
import { mockFileUpload } from '../setup.js';

// Create test app
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/auth', authRouter);
app.use('/api/effects', effectsRouter);

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  auth: {
    register: 1000, // 1 second
    login: 500,     // 0.5 seconds
    refresh: 200,   // 0.2 seconds
    me: 100         // 0.1 seconds
  },
  effects: {
    apply: 2000,    // 2 seconds (excluding actual processing)
    status: 300,    // 0.3 seconds
    results: 500,   // 0.5 seconds
    cancel: 400     // 0.4 seconds
  },
  concurrent: {
    minThroughput: 50,  // requests per second
    maxLatency: 2000    // max response time under load
  }
};

describe('API Performance Benchmarks', () => {
  let prisma;
  let testUsers = [];
  let accessTokens = [];

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // Mock services with fast responses
    isEmailEnabled.mockResolvedValue(false);
    uploadImageService.mockImplementation(() => 
      Promise.resolve(`perf-test-image-${Date.now()}.jpg`)
    );
    startComfyUITaskService.mockImplementation(() => 
      Promise.resolve({ taskId: `perf-test-task-${Date.now()}` })
    );
    getComfyUITaskStatus.mockResolvedValue('SUCCESS');
    getComfyUITaskResult.mockResolvedValue(['https://example.com/result.jpg']);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUsers.length > 0) {
      await prisma.refreshToken.deleteMany({
        where: { userId: { in: testUsers.map(u => u.id) } }
      });
      await prisma.user.deleteMany({
        where: { id: { in: testUsers.map(u => u.id) } }
      });
    }
    
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up previous test data
    await prisma.refreshToken.deleteMany();
    await prisma.verificationCode.deleteMany();
    await prisma.user.deleteMany();
    testUsers = [];
    accessTokens = [];
  });

  /**
   * Helper function to measure execution time
   */
  const measureTime = async (fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      duration: end - start
    };
  };

  /**
   * Helper function to create test users for performance testing
   */
  const createTestUsers = async (count = 10) => {
    const users = [];
    const tokens = [];

    for (let i = 0; i < count; i++) {
      const userData = {
        email: `perftest${i}@example.com`,
        username: `perfuser${i}`,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      if (response.status === 201) {
        users.push(response.body.user);
        tokens.push(response.body.accessToken);
      }
    }

    testUsers = users;
    accessTokens = tokens;
    return { users, tokens };
  };

  describe('Authentication Performance', () => {
    test('registration should complete within threshold', async () => {
      const measurement = await measureTime(async () => {
        return await request(app)
          .post('/api/auth/register')
          .send({
            email: 'perf-register@example.com',
            username: 'perfregister',
            password: 'TestPassword123!'
          });
      });

      expect(measurement.result.status).toBe(201);
      expect(measurement.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.auth.register);
      
      console.log(`Registration took ${measurement.duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.auth.register}ms)`);
    });

    test('login should complete within threshold', async () => {
      // Create user first
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'perf-login@example.com',
          username: 'perflogin',
          password: 'TestPassword123!'
        });

      const measurement = await measureTime(async () => {
        return await request(app)
          .post('/api/auth/login')
          .send({
            email: 'perf-login@example.com',
            password: 'TestPassword123!'
          });
      });

      expect(measurement.result.status).toBe(200);
      expect(measurement.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.auth.login);
      
      console.log(`Login took ${measurement.duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.auth.login}ms)`);
    });

    test('token refresh should complete within threshold', async () => {
      // Create user and get refresh token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'perf-refresh@example.com',
          username: 'perfrefresh',
          password: 'TestPassword123!'
        });

      const refreshToken = registerResponse.body.refreshToken;

      const measurement = await measureTime(async () => {
        return await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken });
      });

      expect(measurement.result.status).toBe(200);
      expect(measurement.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.auth.refresh);
      
      console.log(`Token refresh took ${measurement.duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.auth.refresh}ms)`);
    });

    test('user info retrieval should complete within threshold', async () => {
      // Create user and get access token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'perf-me@example.com',
          username: 'perfme',
          password: 'TestPassword123!'
        });

      const accessToken = registerResponse.body.accessToken;

      const measurement = await measureTime(async () => {
        return await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);
      });

      expect(measurement.result.status).toBe(200);
      expect(measurement.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.auth.me);
      
      console.log(`User info retrieval took ${measurement.duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.auth.me}ms)`);
    });
  });

  describe('Effects API Performance', () => {
    let testToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'effects-perf@example.com',
          username: 'effectsperf',
          password: 'TestPassword123!'
        });
      testToken = response.body.accessToken;
    });

    test('effects apply should complete within threshold', async () => {
      const mockFile = mockFileUpload.createMockFile('perf-test.jpg', 'image/jpeg');
      const nodeInfoList = JSON.stringify([
        { nodeId: "39", fieldName: "image" }
      ]);

      const measurement = await measureTime(async () => {
        return await request(app)
          .post('/api/effects/comfyui/apply')
          .set('Authorization', `Bearer ${testToken}`)
          .field('workflowId', '1937084629516193794')
          .field('nodeInfoList', nodeInfoList)
          .attach('images', mockFile.buffer, mockFile.originalname);
      });

      expect(measurement.result.status).toBe(200);
      expect(measurement.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.effects.apply);
      
      console.log(`Effects apply took ${measurement.duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.effects.apply}ms)`);
    });

    test('task status check should complete within threshold', async () => {
      const measurement = await measureTime(async () => {
        return await request(app)
          .post('/api/effects/comfyui/status')
          .set('Authorization', `Bearer ${testToken}`)
          .send({ taskId: 'perf-test-task-123' });
      });

      expect(measurement.result.status).toBe(200);
      expect(measurement.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.effects.status);
      
      console.log(`Task status check took ${measurement.duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.effects.status}ms)`);
    });

    test('task results retrieval should complete within threshold', async () => {
      const measurement = await measureTime(async () => {
        return await request(app)
          .post('/api/effects/comfyui/results')
          .set('Authorization', `Bearer ${testToken}`)
          .send({ taskId: 'perf-test-task-123' });
      });

      expect(measurement.result.status).toBe(200);
      expect(measurement.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.effects.results);
      
      console.log(`Task results retrieval took ${measurement.duration.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.effects.results}ms)`);
    });
  });

  describe('Concurrent Load Performance', () => {
    test('should handle concurrent authentication requests', async () => {
      const concurrentRequests = 50;
      const promises = [];

      const startTime = performance.now();

      // Create concurrent registration requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/auth/register')
            .send({
              email: `concurrent${i}@example.com`,
              username: `concurrent${i}`,
              password: 'TestPassword123!'
            })
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const throughput = (concurrentRequests / totalTime) * 1000; // requests per second

      // Check that most requests succeeded
      const successCount = responses.filter(r => r.status === 201).length;
      expect(successCount).toBeGreaterThan(concurrentRequests * 0.8); // At least 80% success

      // Check throughput
      expect(throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.concurrent.minThroughput);

      // Check latency
      const maxLatency = Math.max(...responses.map((_, i) => 
        performance.now() - startTime
      ));
      expect(maxLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrent.maxLatency);

      console.log(`Concurrent auth: ${successCount}/${concurrentRequests} succeeded, ${throughput.toFixed(2)} req/s, max latency: ${maxLatency.toFixed(2)}ms`);
    });

    test('should handle concurrent effects requests', async () => {
      // Create test users first
      const { tokens } = await createTestUsers(20);
      expect(tokens.length).toBeGreaterThan(15); // Ensure we have enough users

      const concurrentRequests = Math.min(tokens.length, 30);
      const promises = [];
      const mockFile = mockFileUpload.createMockFile('concurrent-test.jpg', 'image/jpeg');
      const nodeInfoList = JSON.stringify([{ nodeId: "39", fieldName: "image" }]);

      const startTime = performance.now();

      // Create concurrent effects requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/api/effects/comfyui/apply')
            .set('Authorization', `Bearer ${tokens[i % tokens.length]}`)
            .field('workflowId', '1937084629516193794')
            .field('nodeInfoList', nodeInfoList)
            .attach('images', mockFile.buffer, mockFile.originalname)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const throughput = (concurrentRequests / totalTime) * 1000;

      // Check success rate
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(concurrentRequests * 0.7); // At least 70% success

      // Check throughput (lower threshold for effects due to complexity)
      expect(throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.concurrent.minThroughput * 0.5);

      console.log(`Concurrent effects: ${successCount}/${concurrentRequests} succeeded, ${throughput.toFixed(2)} req/s`);
    });

    test('should maintain performance under mixed load', async () => {
      // Create test users
      const { tokens } = await createTestUsers(10);

      const totalRequests = 60;
      const promises = [];
      const mockFile = mockFileUpload.createMockFile('mixed-load.jpg', 'image/jpeg');

      const startTime = performance.now();

      // Mix different types of requests
      for (let i = 0; i < totalRequests; i++) {
        const token = tokens[i % tokens.length];
        
        if (i % 4 === 0) {
          // User info requests (25%)
          promises.push(
            request(app)
              .get('/api/auth/me')
              .set('Authorization', `Bearer ${token}`)
          );
        } else if (i % 4 === 1) {
          // Task status requests (25%)
          promises.push(
            request(app)
              .post('/api/effects/comfyui/status')
              .set('Authorization', `Bearer ${token}`)
              .send({ taskId: `mixed-load-task-${i}` })
          );
        } else if (i % 4 === 2) {
          // Task results requests (25%)
          promises.push(
            request(app)
              .post('/api/effects/comfyui/results')
              .set('Authorization', `Bearer ${token}`)
              .send({ taskId: `mixed-load-task-${i}` })
          );
        } else {
          // Effects apply requests (25%)
          promises.push(
            request(app)
              .post('/api/effects/comfyui/apply')
              .set('Authorization', `Bearer ${token}`)
              .field('workflowId', '1937084629516193794')
              .field('nodeInfoList', '[{"nodeId":"39","fieldName":"image"}]')
              .attach('images', mockFile.buffer, mockFile.originalname)
          );
        }
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const throughput = (totalRequests / totalTime) * 1000;

      // Analyze response patterns
      const responsesByType = {
        userInfo: responses.filter((_, i) => i % 4 === 0),
        taskStatus: responses.filter((_, i) => i % 4 === 1),
        taskResults: responses.filter((_, i) => i % 4 === 2),
        effectsApply: responses.filter((_, i) => i % 4 === 3)
      };

      // Check overall success rate
      const totalSuccess = responses.filter(r => [200, 201].includes(r.status)).length;
      expect(totalSuccess).toBeGreaterThan(totalRequests * 0.75);

      // Check that fast endpoints are still fast
      const userInfoSuccess = responsesByType.userInfo.filter(r => r.status === 200).length;
      expect(userInfoSuccess).toBeGreaterThan(responsesByType.userInfo.length * 0.9);

      console.log(`Mixed load: ${totalSuccess}/${totalRequests} succeeded, ${throughput.toFixed(2)} req/s`);
      console.log(`  - User info: ${userInfoSuccess}/${responsesByType.userInfo.length}`);
      console.log(`  - Task status: ${responsesByType.taskStatus.filter(r => r.status === 200).length}/${responsesByType.taskStatus.length}`);
      console.log(`  - Task results: ${responsesByType.taskResults.filter(r => r.status === 200).length}/${responsesByType.taskResults.length}`);
      console.log(`  - Effects apply: ${responsesByType.effectsApply.filter(r => r.status === 200).length}/${responsesByType.effectsApply.length}`);
    });
  });

  describe('Database Performance', () => {
    test('should handle user lookups efficiently', async () => {
      // Create multiple users
      const userCount = 100;
      const users = [];

      // Batch create users
      for (let i = 0; i < userCount; i += 10) {
        const batch = [];
        for (let j = 0; j < 10 && (i + j) < userCount; j++) {
          batch.push(
            request(app)
              .post('/api/auth/register')
              .send({
                email: `dbperf${i + j}@example.com`,
                username: `dbperf${i + j}`,
                password: 'TestPassword123!'
              })
          );
        }
        const responses = await Promise.all(batch);
        users.push(...responses.filter(r => r.status === 201).map(r => r.body.user));
      }

      expect(users.length).toBeGreaterThan(userCount * 0.8);

      // Test lookup performance
      const lookupPromises = users.slice(0, 50).map(user => {
        const token = jwt.sign(
          { sub: user.id, email: user.email, username: user.username },
          process.env.JWT_ACCESS_SECRET,
          { expiresIn: '15m' }
        );

        return measureTime(async () => {
          return await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);
        });
      });

      const lookupResults = await Promise.all(lookupPromises);
      const avgLookupTime = lookupResults.reduce((sum, r) => sum + r.duration, 0) / lookupResults.length;

      expect(avgLookupTime).toBeLessThan(PERFORMANCE_THRESHOLDS.auth.me);
      
      console.log(`Average user lookup time: ${avgLookupTime.toFixed(2)}ms with ${users.length} users in database`);
    });

    test('should handle token operations efficiently', async () => {
      // Create user and multiple refresh tokens
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'tokenperf@example.com',
          username: 'tokenperf',
          password: 'TestPassword123!'
        });

      const refreshToken = registerResponse.body.refreshToken;

      // Test multiple refresh operations
      const refreshPromises = Array.from({ length: 20 }, (_, i) =>
        measureTime(async () => {
          return await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken });
        })
      );

      const refreshResults = await Promise.all(refreshPromises);
      const successfulRefreshes = refreshResults.filter(r => r.result.status === 200);
      const avgRefreshTime = successfulRefreshes.reduce((sum, r) => sum + r.duration, 0) / successfulRefreshes.length;

      expect(avgRefreshTime).toBeLessThan(PERFORMANCE_THRESHOLDS.auth.refresh);
      expect(successfulRefreshes.length).toBe(1); // Only first should succeed, others should be fast failures

      console.log(`Average token refresh time: ${avgRefreshTime.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({
            email: `memory${i}@example.com`,
            username: `memory${i}`,
            password: 'TestPassword123!'
          });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      // Memory increase should be reasonable (less than 50MB for 100 operations)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });
});
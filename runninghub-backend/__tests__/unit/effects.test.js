/**
 * Unit tests for Effects API functionality
 * 
 * Tests the effects routes including:
 * - ComfyUI task creation
 * - Webapp task creation  
 * - Task status queries
 * - Task result retrieval
 * - Image upload handling
 * - File validation and security
 * - RunningHub API integration
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import effectsRouter from '../../src/routes/effects.js';
import { testDb, mockRunningHubAPI, mockFileUpload } from '../setup.js';

// Mock external dependencies
jest.mock('axios');
jest.mock('../../src/services/uploadImageService.js');
jest.mock('../../src/services/comfyUITaskService.js');
jest.mock('../../src/services/webappTaskService.js');

import axios from 'axios';
import { uploadImageService } from '../../src/services/uploadImageService.js';
import { 
  startComfyUITaskService, 
  getComfyUITaskStatus, 
  getComfyUITaskResult,
  cancelComfyUITask 
} from '../../src/services/comfyUITaskService.js';
import {
  startWebappTaskService,
  getWebappTaskStatus, 
  getWebappTaskResult,
  cancelWebappTask
} from '../../src/services/webappTaskService.js';

// Create test app instance
const app = express();
app.use(express.json());
app.use('/api/effects', effectsRouter);

describe('Effects API Routes', () => {
  let testUser;
  let accessToken;

  beforeEach(async () => {
    // Create test user and auth token
    testUser = await testDb.createTestUser({
      email: 'effects@example.com',
      username: 'effectsuser'
    });

    accessToken = jwt.sign(
      { sub: testUser.id, email: testUser.email, username: testUser.username },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/effects/test', () => {
    test('should return test response', async () => {
      const response = await request(app)
        .get('/api/effects/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Effects路由工作正常');
    });
  });

  describe('POST /api/effects/comfyui/apply', () => {
    beforeEach(() => {
      // Mock successful services
      uploadImageService.mockResolvedValue('uploaded-image-123.jpg');
      startComfyUITaskService.mockResolvedValue({ taskId: 'comfyui-task-123' });
    });

    test('should create ComfyUI task successfully', async () => {
      const mockFile = mockFileUpload.createMockFile('test.jpg', 'image/jpeg');
      const nodeInfoList = JSON.stringify([
        {
          nodeId: "39",
          fieldName: "image",
          paramKey: null
        },
        {
          nodeId: "52", 
          fieldName: "text",
          paramKey: "prompt"
        }
      ]);

      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('workflowId', '1937084629516193794')
        .field('nodeInfoList', nodeInfoList)
        .field('regionId', 'hongkong')
        .field('prompt', 'beautiful landscape')
        .attach('images', mockFile.buffer, mockFile.originalname);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.taskId).toBe('comfyui-task-123');
      expect(response.body.taskType).toBe('ComfyUI');
      expect(response.body.message).toContain('任务已启动');

      // Verify services were called correctly
      expect(uploadImageService).toHaveBeenCalledTimes(1);
      expect(startComfyUITaskService).toHaveBeenCalledWith(
        '1937084629516193794',
        expect.arrayContaining([
          expect.objectContaining({
            nodeId: "39",
            fieldName: "image",
            fieldValue: 'uploaded-image-123.jpg'
          }),
          expect.objectContaining({
            nodeId: "52",
            fieldName: "text", 
            fieldValue: 'beautiful landscape'
          })
        ]),
        'hongkong',
        undefined
      );
    });

    test('should create Webapp task successfully', async () => {
      const mockFile = mockFileUpload.createMockFile('test.jpg', 'image/jpeg');
      const nodeInfoList = JSON.stringify([
        {
          nodeId: "39",
          fieldName: "image"
        }
      ]);

      startWebappTaskService.mockResolvedValue({ taskId: 'webapp-task-123' });

      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('webappId', '1937084629516193794')
        .field('nodeInfoList', nodeInfoList)
        .field('regionId', 'hongkong')
        .attach('images', mockFile.buffer, mockFile.originalname);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.taskId).toBe('webapp-task-123');
      expect(response.body.taskType).toBe('Webapp');

      expect(startWebappTaskService).toHaveBeenCalledTimes(1);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .field('workflowId', '123')
        .field('nodeInfoList', '[]');

      expect(response.status).toBe(401);
    });

    test('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('缺少workflowId或webappId参数');
    });

    test('should validate nodeInfoList format', async () => {
      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('workflowId', '123')
        .field('nodeInfoList', 'invalid-json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('nodeInfoList格式错误');
    });

    test('should require image files', async () => {
      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('workflowId', '123')
        .field('nodeInfoList', '[]');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('没有上传图片文件');
    });

    test('should handle file upload errors', async () => {
      const mockFile = mockFileUpload.createMockFile('test.jpg', 'image/jpeg');
      uploadImageService.mockRejectedValue(new Error('Upload failed'));

      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('workflowId', '123')
        .field('nodeInfoList', '[{"nodeId":"39","fieldName":"image"}]')
        .attach('images', mockFile.buffer, mockFile.originalname);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('图片上传失败');
    });

    test('should handle service errors', async () => {
      const mockFile = mockFileUpload.createMockFile('test.jpg', 'image/jpeg');
      uploadImageService.mockResolvedValue('uploaded-image.jpg');
      startComfyUITaskService.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('workflowId', '123')
        .field('nodeInfoList', '[{"nodeId":"39","fieldName":"image"}]')
        .attach('images', mockFile.buffer, mockFile.originalname);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('ComfyUI任务启动失败');
    });

    test('should validate file types', async () => {
      const mockFile = mockFileUpload.createMockFile('test.txt', 'text/plain');

      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('workflowId', '123')
        .field('nodeInfoList', '[{"nodeId":"39","fieldName":"image"}]')
        .attach('images', mockFile.buffer, mockFile.originalname);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('不支持的文件类型');
    });

    test('should validate webappId as string (critical fix)', async () => {
      const mockFile = mockFileUpload.createMockFile('test.jpg', 'image/jpeg');
      
      startWebappTaskService.mockImplementation((webappId, nodeInfoList, regionId) => {
        // Verify webappId is passed as string, not integer
        expect(typeof webappId).toBe('string');
        expect(webappId).toBe('1937084629516193794');
        return Promise.resolve({ taskId: 'webapp-task-123' });
      });

      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('webappId', '1937084629516193794') // String webappId
        .field('nodeInfoList', '[{"nodeId":"39","fieldName":"image"}]')
        .attach('images', mockFile.buffer, mockFile.originalname);

      expect(response.status).toBe(200);
      expect(startWebappTaskService).toHaveBeenCalledWith(
        '1937084629516193794', // Should be string, not integer
        expect.any(Array),
        'hongkong'
      );
    });

    test('should validate fieldValue as string (critical fix)', async () => {
      const mockFile = mockFileUpload.createMockFile('test.jpg', 'image/jpeg');
      
      startComfyUITaskService.mockImplementation((workflowId, nodeInfoList, regionId) => {
        // Verify all fieldValue are strings
        nodeInfoList.forEach(node => {
          if (node.fieldValue !== undefined) {
            expect(typeof node.fieldValue).toBe('string');
          }
        });
        return Promise.resolve({ taskId: 'comfyui-task-123' });
      });

      const nodeInfoList = JSON.stringify([
        {
          nodeId: "39",
          fieldName: "image"
        },
        {
          nodeId: "40", 
          fieldName: "scale",
          paramKey: "scale"
        }
      ]);

      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('workflowId', '123')
        .field('nodeInfoList', nodeInfoList)
        .field('scale', 1.5) // Numeric value
        .attach('images', mockFile.buffer, mockFile.originalname);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/effects/comfyui/status', () => {
    test('should get task status successfully', async () => {
      getComfyUITaskStatus.mockResolvedValue('SUCCESS');

      const response = await request(app)
        .post('/api/effects/comfyui/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123',
          regionId: 'hongkong'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('SUCCESS');
      expect(response.body.taskId).toBe('test-task-123');

      expect(getComfyUITaskStatus).toHaveBeenCalledWith('test-task-123', 'hongkong');
    });

    test('should fallback to webapp service when ComfyUI fails', async () => {
      getComfyUITaskStatus.mockRejectedValue(new Error('ComfyUI failed'));
      getWebappTaskStatus.mockResolvedValue('PROCESSING');

      const response = await request(app)
        .post('/api/effects/comfyui/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('PROCESSING');

      expect(getComfyUITaskStatus).toHaveBeenCalledTimes(1);
      expect(getWebappTaskStatus).toHaveBeenCalledTimes(1);
    });

    test('should handle when both services fail', async () => {
      getComfyUITaskStatus.mockRejectedValue(new Error('ComfyUI failed'));
      getWebappTaskStatus.mockRejectedValue(new Error('Webapp failed'));

      const response = await request(app)
        .post('/api/effects/comfyui/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('任务不存在或服务暂不可用');
    });

    test('should validate taskId parameter', async () => {
      const response = await request(app)
        .post('/api/effects/comfyui/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          regionId: 'hongkong'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate regionId parameter', async () => {
      const response = await request(app)
        .post('/api/effects/comfyui/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123',
          regionId: 'invalid-region'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/effects/comfyui/results', () => {
    test('should get task results successfully', async () => {
      const mockResults = [
        'https://example.com/result1.jpg',
        'https://example.com/result2.jpg'
      ];
      getComfyUITaskResult.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/effects/comfyui/results')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123',
          regionId: 'hongkong'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toEqual(mockResults);

      expect(getComfyUITaskResult).toHaveBeenCalledWith('test-task-123', 'hongkong');
    });

    test('should fallback to webapp service when ComfyUI fails', async () => {
      const mockResults = ['https://example.com/webapp-result.jpg'];
      getComfyUITaskResult.mockRejectedValue(new Error('ComfyUI failed'));
      getWebappTaskResult.mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/effects/comfyui/results')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toEqual(mockResults);

      expect(getComfyUITaskResult).toHaveBeenCalledTimes(1);
      expect(getWebappTaskResult).toHaveBeenCalledTimes(1);
    });

    test('should handle when both services fail', async () => {
      getComfyUITaskResult.mockRejectedValue(new Error('ComfyUI failed'));
      getWebappTaskResult.mockRejectedValue(new Error('Webapp failed'));

      const response = await request(app)
        .post('/api/effects/comfyui/results')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('无法获取任务结果');
    });

    test('should require taskId parameter', async () => {
      const response = await request(app)
        .post('/api/effects/comfyui/results')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/effects/comfyui/cancel', () => {
    test('should cancel task successfully', async () => {
      cancelComfyUITask.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/effects/comfyui/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123',
          regionId: 'hongkong'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('任务取消成功');

      expect(cancelComfyUITask).toHaveBeenCalledWith('test-task-123', 'hongkong');
    });

    test('should handle cancel errors', async () => {
      cancelComfyUITask.mockRejectedValue(new Error('Cancel failed'));

      const response = await request(app)
        .post('/api/effects/comfyui/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cancel failed');
    });

    test('should require taskId parameter', async () => {
      const response = await request(app)
        .post('/api/effects/comfyui/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('缺少taskId参数');
    });
  });

  describe('POST /api/effects/cancel (unified cancel)', () => {
    test('should cancel ComfyUI task when taskType specified', async () => {
      cancelComfyUITask.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/effects/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123',
          taskType: 'ComfyUI',
          regionId: 'hongkong'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('ComfyUI任务取消成功');

      expect(cancelComfyUITask).toHaveBeenCalledWith('test-task-123', 'hongkong');
    });

    test('should cancel Webapp task when taskType specified', async () => {
      cancelWebappTask.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/effects/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123',
          taskType: 'Webapp',
          regionId: 'hongkong'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Webapp任务取消成功');

      expect(cancelWebappTask).toHaveBeenCalledWith('test-task-123', 'hongkong');
    });

    test('should try both services when taskType not specified', async () => {
      cancelComfyUITask.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/effects/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('任务取消成功 (ComfyUI)');
    });

    test('should fallback to webapp when ComfyUI fails', async () => {
      cancelComfyUITask.mockRejectedValue(new Error('ComfyUI failed'));
      cancelWebappTask.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/effects/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('任务取消成功 (Webapp)');

      expect(cancelComfyUITask).toHaveBeenCalledTimes(1);
      expect(cancelWebappTask).toHaveBeenCalledTimes(1);
    });

    test('should handle when both cancel services fail', async () => {
      cancelComfyUITask.mockRejectedValue(new Error('ComfyUI failed'));
      cancelWebappTask.mockRejectedValue(new Error('Webapp failed'));

      const response = await request(app)
        .post('/api/effects/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          taskId: 'test-task-123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('取消任务失败');
    });
  });

  describe('POST /api/effects/upload/presign', () => {
    test('should generate presigned URL for Aliyun OSS', async () => {
      // Set environment for Aliyun OSS
      process.env.CLOUD_STORAGE_PROVIDER = 'aliyun-oss';
      process.env.ALIYUN_OSS_BUCKET = 'test-bucket';
      process.env.ALIYUN_OSS_REGION = 'oss-cn-hangzhou';
      process.env.ALIYUN_OSS_ACCESS_KEY_ID = 'test-access-key';
      process.env.ALIYUN_OSS_ACCESS_KEY_SECRET = 'test-secret-key';

      const response = await request(app)
        .post('/api/effects/upload/presign')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ext: 'jpg',
          dir: 'cosnap/uploads'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.provider).toBe('aliyun-oss');
      expect(response.body.uploadUrl).toContain('test-bucket');
      expect(response.body.form).toBeDefined();
      expect(response.body.objectKey).toBeDefined();
      expect(response.body.publicUrl).toBeDefined();

      // Clean up environment
      delete process.env.CLOUD_STORAGE_PROVIDER;
      delete process.env.ALIYUN_OSS_BUCKET;
      delete process.env.ALIYUN_OSS_REGION;
      delete process.env.ALIYUN_OSS_ACCESS_KEY_ID;
      delete process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
    });

    test('should return mock response when provider not configured', async () => {
      const response = await request(app)
        .post('/api/effects/upload/presign')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ext: 'jpg'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.provider).toBe('mock');
      expect(response.body.publicUrl).toContain('mock-cdn.example.com');
    });

    test('should validate extension parameter', async () => {
      const response = await request(app)
        .post('/api/effects/upload/presign')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ext: 'invalid-ext!@#',
          dir: 'cosnap/uploads'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('File validation security tests', () => {
    test('should reject dangerous file names', async () => {
      const dangerousFiles = [
        '../../../etc/passwd',
        'test.php.jpg',
        'script.exe.png',
        '<script>alert(1)</script>.jpg',
        '.htaccess',
        'test\x00.jpg'
      ];

      for (const filename of dangerousFiles) {
        const mockFile = mockFileUpload.createMockFile(filename, 'image/jpeg');

        const response = await request(app)
          .post('/api/effects/comfyui/apply')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('workflowId', '123')
          .field('nodeInfoList', '[{"nodeId":"39","fieldName":"image"}]')
          .attach('images', mockFile.buffer, filename);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('不安全');
      }
    });

    test('should enforce file size limits', async () => {
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      const mockFile = {
        ...mockFileUpload.createMockFile('large.jpg', 'image/jpeg'),
        buffer: largeBuffer,
        size: largeBuffer.length
      };

      const response = await request(app)
        .post('/api/effects/comfyui/apply')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('workflowId', '123')
        .field('nodeInfoList', '[{"nodeId":"39","fieldName":"image"}]')
        .attach('images', mockFile.buffer, mockFile.originalname);

      // Should be rejected by multer file size limit
      expect(response.status).toBe(400);
    });

    test('should reject non-image MIME types', async () => {
      const dangerousMimeTypes = [
        'application/javascript',
        'text/html',
        'application/php',
        'text/x-php',
        'application/x-executable'
      ];

      for (const mimetype of dangerousMimeTypes) {
        const mockFile = mockFileUpload.createMockFile('test.jpg', mimetype);

        const response = await request(app)
          .post('/api/effects/comfyui/apply')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('workflowId', '123')
          .field('nodeInfoList', '[{"nodeId":"39","fieldName":"image"}]')
          .attach('images', mockFile.buffer, mockFile.originalname);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('不支持的文件类型');
      }
    });
  });

  describe('Rate limiting and auth tests', () => {
    test('should require authentication for all protected routes', async () => {
      const protectedRoutes = [
        { method: 'post', path: '/api/effects/comfyui/apply' },
        { method: 'post', path: '/api/effects/comfyui/status' },
        { method: 'post', path: '/api/effects/comfyui/results' },
        { method: 'post', path: '/api/effects/comfyui/cancel' },
        { method: 'post', path: '/api/effects/cancel' },
        { method: 'post', path: '/api/effects/upload/presign' }
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)[route.method](route.path)
          .send({});

        expect(response.status).toBe(401);
      }
    });

    test('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { sub: testUser.id, email: testUser.email, username: testUser.username },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/effects/comfyui/status')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ taskId: 'test-123' });

      expect(response.status).toBe(401);
    });
  });
});
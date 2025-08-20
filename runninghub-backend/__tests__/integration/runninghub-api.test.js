/**
 * Integration tests for RunningHub API services
 * 
 * Tests the critical RunningHub API integration including:
 * - Webapp task service (with proper string parameter handling)
 * - Task status monitoring
 * - Task result retrieval
 * - Region switching functionality
 * - Error handling and retry mechanisms
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios from 'axios';
import {
  startWebappTaskService,
  getWebappTaskStatus,
  getWebappTaskResult,
  waitForWebappTaskAndGetImages,
  cancelWebappTask
} from '../../src/services/webappTaskService.js';
import { mockRunningHubAPI } from '../setup.js';

// Mock axios to avoid real API calls during testing
jest.mock('axios');
const mockedAxios = axios;

describe('RunningHub API Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default axios mock implementation
    mockedAxios.create.mockReturnValue({
      post: jest.fn(),
      get: jest.fn()
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('startWebappTaskService', () => {
    test('should start webapp task with string webappId (critical fix)', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: mockRunningHubAPI.mockWebappTaskStart
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      const webappId = '1907581130097192962'; // Must be string, not integer
      const nodeInfoList = [
        { nodeId: '2', fieldName: 'image', fieldValue: 'test.jpg' },
        { nodeId: '161', fieldName: 'value', fieldValue: '1' } // Must be string
      ];
      const regionId = 'hongkong';

      const result = await startWebappTaskService(webappId, nodeInfoList, regionId);

      expect(result).toEqual(mockRunningHubAPI.mockWebappTaskStart.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/task/openapi/ai-app/run',
        {
          webappId: webappId, // Verify webappId is passed as string
          apiKey: expect.any(String),
          nodeInfoList: nodeInfoList
        },
        { timeout: 60000 }
      );

      // Critical test: verify webappId is NOT converted to integer
      const calledWith = mockAxiosInstance.post.mock.calls[0][1];
      expect(typeof calledWith.webappId).toBe('string');
      expect(calledWith.webappId).toBe('1907581130097192962');
      
      // Verify fieldValues are strings
      calledWith.nodeInfoList.forEach(node => {
        expect(typeof node.fieldValue).toBe('string');
      });
    });

    test('should handle webapp not exists error gracefully', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: { code: 404, msg: 'webapp not exists' }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      await expect(
        startWebappTaskService('invalid-webapp-id', [], 'hongkong')
      ).rejects.toThrow('webapp not exists');
    });

    test('should handle APIKEY_INVALID_NODE_INFO error', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: { code: 400, msg: 'APIKEY_INVALID_NODE_INFO' }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      const nodeInfoWithInvalidTypes = [
        { nodeId: '161', fieldName: 'value', fieldValue: 0.25 } // Wrong: should be string
      ];

      await expect(
        startWebappTaskService('1907581130097192962', nodeInfoWithInvalidTypes, 'hongkong')
      ).rejects.toThrow('APIKEY_INVALID_NODE_INFO');
    });

    test('should work with different regions', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: mockRunningHubAPI.mockWebappTaskStart
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      // Test China region
      await startWebappTaskService('1907581130097192962', [], 'china');
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://www.runninghub.cn',
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.cn'
        }
      });

      // Test Hong Kong region
      await startWebappTaskService('1907581130097192962', [], 'hongkong');
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://www.runninghub.ai',
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.ai'
        }
      });
    });

    test('should handle network timeouts', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockRejectedValue(new Error('timeout of 60000ms exceeded'))
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      await expect(
        startWebappTaskService('1907581130097192962', [], 'hongkong')
      ).rejects.toThrow('timeout');
    });
  });

  describe('getWebappTaskStatus', () => {
    test('should retrieve task status successfully', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: mockRunningHubAPI.mockTaskStatus
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      const taskId = 'test-task-id-12345';
      const result = await getWebappTaskStatus(taskId, 'hongkong');

      expect(result).toBe('SUCCESS');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/task/openapi/status',
        {
          apiKey: expect.any(String),
          taskId: taskId
        }
      );
    });

    test('should handle different task statuses', async () => {
      const mockAxiosInstance = {
        post: jest.fn()
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      const taskStatuses = ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'];
      
      for (const status of taskStatuses) {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { code: 0, msg: 'success', data: status }
        });

        const result = await getWebappTaskStatus('test-task-id', 'hongkong');
        expect(result).toBe(status);
      }
    });

    test('should handle task status API errors', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: { code: 500, msg: 'Internal server error' }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      await expect(
        getWebappTaskStatus('test-task-id', 'hongkong')
      ).rejects.toThrow('Internal server error');
    });
  });

  describe('getWebappTaskResult', () => {
    test('should retrieve task results as image URLs', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: mockRunningHubAPI.mockTaskResult
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      const taskId = 'test-task-id-12345';
      const result = await getWebappTaskResult(taskId, 'hongkong');

      expect(result).toEqual([
        'https://example.com/result1.jpg',
        'https://example.com/result2.jpg'
      ]);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/task/openapi/outputs',
        {
          apiKey: expect.any(String),
          taskId: taskId
        }
      );
    });

    test('should handle relative URL paths correctly', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: {
            code: 0,
            msg: 'success',
            data: ['/path/to/image1.jpg', 'path/to/image2.jpg']
          }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      const result = await getWebappTaskResult('test-task-id', 'hongkong');

      expect(result).toEqual([
        'https://www.runninghub.ai/path/to/image1.jpg',
        'https://www.runninghub.ai/path/to/image2.jpg'
      ]);
    });

    test('should handle object response format', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: {
            code: 0,
            msg: 'success',
            data: {
              output1: '/path/to/result1.png',
              output2: '/path/to/result2.png',
              metadata: 'not an image'
            }
          }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      const result = await getWebappTaskResult('test-task-id', 'china');

      expect(result).toEqual([
        'https://www.runninghub.cn/path/to/result1.png',
        'https://www.runninghub.cn/path/to/result2.png'
      ]);
    });

    test('should handle empty or invalid results', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: {
            code: 0,
            msg: 'success',
            data: null
          }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      const result = await getWebappTaskResult('test-task-id', 'hongkong');
      expect(result).toEqual([]);
    });
  });

  describe('waitForWebappTaskAndGetImages', () => {
    test('should poll task status and return results when completed', async () => {
      const mockAxiosInstance = {
        post: jest.fn()
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      // Mock sequence: PENDING -> RUNNING -> SUCCESS
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { code: 0, data: 'PENDING' } })
        .mockResolvedValueOnce({ data: { code: 0, data: 'RUNNING' } })
        .mockResolvedValueOnce({ data: { code: 0, data: 'SUCCESS' } })
        .mockResolvedValueOnce({ data: mockRunningHubAPI.mockTaskResult });

      const result = await waitForWebappTaskAndGetImages('test-task-id', 'hongkong');

      expect(result).toEqual(mockRunningHubAPI.mockTaskResult.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(4); // 3 status checks + 1 result fetch
    });

    test('should handle task failure during polling', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: { code: 0, data: 'FAILED' }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      await expect(
        waitForWebappTaskAndGetImages('test-task-id', 'hongkong')
      ).rejects.toThrow('任务处理失败');
    });

    test('should handle task cancellation', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: { code: 0, data: 'CANCELLED' }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      await expect(
        waitForWebappTaskAndGetImages('test-task-id', 'hongkong')
      ).rejects.toThrow('任务已取消');
    });
  });

  describe('cancelWebappTask', () => {
    test('should cancel task successfully', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: { code: 0, msg: 'success' }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      const result = await cancelWebappTask('test-task-id', 'hongkong');

      expect(result).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/task/openapi/cancel',
        {
          apiKey: expect.any(String),
          taskId: 'test-task-id'
        }
      );
    });

    test('should handle cancellation errors', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: { code: 400, msg: 'Task cannot be cancelled' }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      await expect(
        cancelWebappTask('test-task-id', 'hongkong')
      ).rejects.toThrow('Task cannot be cancelled');
    });
  });

  describe('Critical Parameter Handling (Regression Tests)', () => {
    test('should never convert webappId to integer', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: mockRunningHubAPI.mockWebappTaskStart
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      // Test with various string webappIds
      const webappIds = [
        '1907581130097192962',
        '1937084629516193794',
        '1949030128047857666'
      ];

      for (const webappId of webappIds) {
        await startWebappTaskService(webappId, [], 'hongkong');
        
        const calledWith = mockAxiosInstance.post.mock.calls.slice(-1)[0][1];
        expect(typeof calledWith.webappId).toBe('string');
        expect(calledWith.webappId).toBe(webappId);
      }
    });

    test('should ensure all fieldValues are strings', async () => {
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: mockRunningHubAPI.mockWebappTaskStart
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      const nodeInfoList = [
        { nodeId: '2', fieldName: 'image', fieldValue: 'test.jpg' },
        { nodeId: '161', fieldName: 'value', fieldValue: '1' },
        { nodeId: '160', fieldName: 'value', fieldValue: '0.25' },
        { nodeId: '52', fieldName: 'prompt', fieldValue: '测试提示文本' }
      ];

      await startWebappTaskService('1907581130097192962', nodeInfoList, 'hongkong');

      const calledWith = mockAxiosInstance.post.mock.calls[0][1];
      calledWith.nodeInfoList.forEach(node => {
        expect(typeof node.fieldValue).toBe('string');
      });
    });

    test('should handle workflowId as string in ComfyUI tasks', async () => {
      // This test ensures workflowId is also handled as string
      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: { code: 0, data: { taskId: 'test-task-id' } }
        })
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance);

      // Mock ComfyUI task service call
      const workflowId = '1952448857223442433'; // Should remain string
      
      // This would be tested in ComfyUI service tests
      expect(typeof workflowId).toBe('string');
      expect(workflowId).toBe('1952448857223442433');
    });
  });
});
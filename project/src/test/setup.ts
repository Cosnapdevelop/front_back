/**
 * Test setup configuration for Cosnap AI frontend testing
 * 
 * This file configures the test environment with:
 * - Testing Library Jest DOM matchers
 * - Mock Service Worker for API mocking
 * - Global test utilities and mocks
 */

import { expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers);

// Mock API server for testing
export const server = setupServer(
  // Mock authentication endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser'
      }
    });
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      success: true,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser'
      }
    });
  }),

  http.get('/api/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      success: true,
      user: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        avatar: null,
        bio: null
      }
    });
  }),

  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({
      success: true,
      accessToken: 'new-mock-access-token'
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  // Mock effects/AI processing endpoints
  http.get('/api/effects', () => {
    return HttpResponse.json({
      success: true,
      effects: [
        {
          id: '1',
          name: 'Test Effect',
          description: 'A test AI effect',
          webappId: '1907581130097192962',
          thumbnail: 'https://example.com/thumb.jpg',
          category: 'portrait',
          nodeInfoList: [
            { nodeId: '2', fieldName: 'image', fieldValue: '' }
          ]
        }
      ]
    });
  }),

  http.post('/api/effects/webapp/apply', () => {
    return HttpResponse.json({
      success: true,
      taskId: 'mock-task-id-123',
      status: 'PENDING'
    });
  }),

  http.get('/api/tasks/:taskId/status', ({ params }) => {
    return HttpResponse.json({
      success: true,
      status: 'SUCCESS',
      taskId: params.taskId
    });
  }),

  http.get('/api/tasks/:taskId/results', ({ params }) => {
    return HttpResponse.json({
      success: true,
      results: [
        'https://example.com/result1.jpg',
        'https://example.com/result2.jpg'
      ],
      taskId: params.taskId
    });
  }),

  // Mock file upload
  http.post('/api/upload/image', () => {
    return HttpResponse.json({
      success: true,
      fileUrl: 'https://example.com/uploaded-image.jpg',
      fileSize: 1024
    });
  }),

  // Mock community endpoints
  http.get('/api/community/posts', () => {
    return HttpResponse.json({
      success: true,
      posts: [
        {
          id: '1',
          title: 'Test Post',
          content: 'Test content',
          imageUrl: 'https://example.com/test.jpg',
          author: {
            id: '1',
            username: 'testuser',
            avatar: null
          },
          createdAt: '2024-01-01T00:00:00Z',
          likes: 0,
          comments: 0
        }
      ],
      totalPages: 1,
      currentPage: 1
    });
  })
);

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Clean up after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock console methods to reduce noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Export test utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';